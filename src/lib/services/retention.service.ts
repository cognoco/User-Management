import { getServiceSupabase } from '../database/supabase';
import { RetentionStatus, RetentionType } from '../database/schemas/retention';
import { sendEmail } from '../email/sendEmail';
import { addMonths, addDays, format, differenceInDays } from 'date-fns';
import { getServerConfig } from '@/lib/config.server';

// Define inactivity thresholds (in months)
const config = getServerConfig();
const RETENTION_PERIODS = {
  [RetentionType.PERSONAL]: config.env.retentionPersonalMonths,
  [RetentionType.BUSINESS]: config.env.retentionBusinessMonths,
};

// Define notification thresholds (in days before inactivity)
const NOTIFICATION_THRESHOLDS = {
  WARNING: 30, // 30 days before becoming inactive
  APPROACHING_INACTIVE: 15, // 15 days before becoming inactive
  INACTIVE: 0, // When account becomes inactive
  GRACE_PERIOD: 15, // 15 days into grace period
};

// Helper to format dates in a human-readable format
const formatDate = (date: Date) => format(date, 'MMMM d, yyyy');

/**
 * Data Retention Service
 * Implements the data retention policy for user accounts
 */
export class RetentionService {
  private supabase = getServiceSupabase();

  /**
   * Run the scheduled job to identify inactive accounts
   * This should be called by a cron job
   */
  async identifyInactiveAccounts() {
    try {
      console.log('[RetentionService] Starting identification of inactive accounts...');
      const startTime = Date.now();
      
      // Get all active users that have a last login date
      const { data: users, error } = await this.supabase
        .from('users')
        .select('id, email, last_sign_in_at, created_at, user_metadata')
        .not('last_sign_in_at', 'is', null);
      
      if (error) {
        throw new Error(`Error fetching users: ${error.message}`);
      }
      
      console.log(`[RetentionService] Processing ${users.length} accounts...`);
      
      // Process each user
      const now = new Date();
      const stats = {
        checked: 0,
        warned: 0,
        markedInactive: 0,
        markedForAnonymization: 0,
        errors: 0,
      };
      
      for (const user of users) {
        try {
          stats.checked++;
          
          // Determine user type
          const userType = user.user_metadata?.company 
            ? RetentionType.BUSINESS 
            : RetentionType.PERSONAL;
          
          // Get the retention period in months
          const retentionPeriodMonths = RETENTION_PERIODS[userType];
          
          // Calculate dates
          const lastLoginDate = new Date(user.last_sign_in_at);
          const inactiveDate = addMonths(lastLoginDate, retentionPeriodMonths);
          const anonymizeDate = addDays(inactiveDate, 30); // 30-day grace period
          
          // Check if user has an existing retention record
          const { data: retention } = await this.supabase
            .from('retention_records')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          
          // If no retention record exists, create one
          if (!retention) {
            await this.supabase.from('retention_records').insert({
              user_id: user.id,
              status: RetentionStatus.ACTIVE,
              retention_type: userType,
              last_login_at: user.last_sign_in_at,
              last_activity_at: user.last_sign_in_at,
              become_inactive_at: inactiveDate.toISOString(),
              anonymize_at: anonymizeDate.toISOString(),
              notified_at: {},
            });
            continue; // Process next user after creating initial record
          }
          
          // Update existing record with latest login date if needed
          if (new Date(retention.last_login_at) < lastLoginDate) {
            // User has logged in more recently, update record and reset status
            await this.supabase
              .from('retention_records')
              .update({
                status: RetentionStatus.ACTIVE,
                last_login_at: user.last_sign_in_at,
                last_activity_at: user.last_sign_in_at,
                become_inactive_at: inactiveDate.toISOString(),
                anonymize_at: anonymizeDate.toISOString(),
              })
              .eq('id', retention.id);
            continue; // Process next user
          }
          
          // Check for warning threshold
          const daysUntilInactive = differenceInDays(
            new Date(retention.become_inactive_at),
            now
          );
          
          // Handle various retention statuses
          if (retention.status === RetentionStatus.ACTIVE) {
            if (daysUntilInactive <= NOTIFICATION_THRESHOLDS.WARNING) {
              // Send warning notification and update status
              await this.sendInactivityWarning(user.email, {
                daysUntilInactive,
                inactiveDate: new Date(retention.become_inactive_at),
              });
              
              await this.supabase
                .from('retention_records')
                .update({
                  status: RetentionStatus.WARNING,
                  notified_at: {
                    ...(retention.notified_at || {}),
                    warning: new Date().toISOString(),
                  },
                })
                .eq('id', retention.id);
                
              stats.warned++;
            }
          } else if (retention.status === RetentionStatus.WARNING) {
            if (daysUntilInactive <= NOTIFICATION_THRESHOLDS.APPROACHING_INACTIVE) {
              // Send approaching inactive notification
              await this.sendApproachingInactiveNotification(user.email, {
                daysUntilInactive,
                inactiveDate: new Date(retention.become_inactive_at),
              });
              
              await this.supabase
                .from('retention_records')
                .update({
                  notified_at: {
                    ...(retention.notified_at || {}),
                    approaching_inactive: new Date().toISOString(),
                  },
                })
                .eq('id', retention.id);
            }
          }
          
          // Handle account becoming inactive
          if (daysUntilInactive <= 0 && retention.status !== RetentionStatus.INACTIVE && 
              retention.status !== RetentionStatus.GRACE_PERIOD && 
              retention.status !== RetentionStatus.ANONYMIZING && 
              retention.status !== RetentionStatus.ANONYMIZED) {
            // Mark account as inactive and send notification
            await this.sendInactiveAccountNotification(user.email, {
              gracePeriodDate: new Date(retention.anonymize_at),
            });
            
            await this.supabase
              .from('retention_records')
              .update({
                status: RetentionStatus.INACTIVE,
                notified_at: {
                  ...(retention.notified_at || {}),
                  inactive: new Date().toISOString(),
                },
              })
              .eq('id', retention.id);
              
            stats.markedInactive++;
          }
          
          // Handle anonymization threshold
          if (now >= new Date(retention.anonymize_at) && 
              retention.status !== RetentionStatus.ANONYMIZING && 
              retention.status !== RetentionStatus.ANONYMIZED) {
            // Mark account for anonymization
            await this.supabase
              .from('retention_records')
              .update({
                status: RetentionStatus.ANONYMIZING,
              })
              .eq('id', retention.id);
              
            stats.markedForAnonymization++;
          }
        } catch (err) {
          console.error(`[RetentionService] Error processing user ${user.id}:`, err);
          stats.errors++;
        }
      }
      
      // Update metrics
      const executionTimeMs = Date.now() - startTime;
      await this.updateRetentionMetrics(executionTimeMs);
      
      console.log(`[RetentionService] Completed with stats:`, stats);
      return stats;
    } catch (error) {
      console.error('[RetentionService] Failed to identify inactive accounts:', error);
      throw error;
    }
  }
  
  /**
   * Process accounts marked for anonymization
   * This should be called by a separate cron job
   */
  async processAnonymization() {
    try {
      console.log('[RetentionService] Starting anonymization process...');
      
      // Get accounts marked for anonymization
      const { data: accounts, error } = await this.supabase
        .from('retention_records')
        .select('id, user_id')
        .eq('status', RetentionStatus.ANONYMIZING);
      
      if (error) {
        throw new Error(`Error fetching accounts for anonymization: ${error.message}`);
      }
      
      console.log(`[RetentionService] Processing ${accounts?.length || 0} accounts for anonymization...`);
      
      let processed = 0;
      let failed = 0;
      
      // Process each account
      for (const account of (accounts || [])) {
        try {
          // Call the anonymize function for this user
          const { error } = await this.supabase.rpc('anonymize_user_data', {
            user_uuid: account.user_id,
          });
          
          if (error) {
            throw new Error(`Error anonymizing user ${account.user_id}: ${error.message}`);
          }
          
          // Update status to anonymized
          await this.supabase
            .from('retention_records')
            .update({
              status: RetentionStatus.ANONYMIZED,
            })
            .eq('id', account.id);
            
          processed++;
        } catch (err) {
          console.error(`[RetentionService] Error anonymizing user ${account.user_id}:`, err);
          failed++;
        }
      }
      
      console.log(`[RetentionService] Anonymization complete. Processed: ${processed}, Failed: ${failed}`);
      return { processed, failed };
    } catch (error) {
      console.error('[RetentionService] Failed to process anonymization:', error);
      throw error;
    }
  }
  
  /**
   * Reactivate an inactive account
   * @param userId The user ID to reactivate
   */
  async reactivateAccount(userId: string) {
    try {
      // Get the user record
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('last_sign_in_at')
        .eq('id', userId)
        .single();
      
      if (userError) {
        throw new Error(`Error fetching user: ${userError.message}`);
      }
      
      // Get retention record
      const { data: retention, error: retentionError } = await this.supabase
        .from('retention_records')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (retentionError) {
        throw new Error(`Error fetching retention record: ${retentionError.message}`);
      }
      
      // Can only reactivate if not already anonymized
      if (retention.status === RetentionStatus.ANONYMIZED) {
        throw new Error('Cannot reactivate an anonymized account');
      }
      
      // Calculate new dates
      const lastLoginDate = new Date(user.last_sign_in_at);
      const userType = retention.retention_type as RetentionType;
      const retentionPeriodMonths = RETENTION_PERIODS[userType];
      const inactiveDate = addMonths(lastLoginDate, retentionPeriodMonths);
      const anonymizeDate = addDays(inactiveDate, 30);
      
      // Update retention record
      const { error } = await this.supabase
        .from('retention_records')
        .update({
          status: RetentionStatus.ACTIVE,
          become_inactive_at: inactiveDate.toISOString(),
          anonymize_at: anonymizeDate.toISOString(),
        })
        .eq('user_id', userId);
      
      if (error) {
        throw new Error(`Error updating retention record: ${error.message}`);
      }
      
      return true;
    } catch (error) {
      console.error(`[RetentionService] Failed to reactivate account ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get the retention status for a user
   * @param userId The user ID to check
   */
  async getUserRetentionStatus(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('retention_records')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        throw new Error(`Error fetching retention status: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error(`[RetentionService] Failed to get retention status for ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get retention metrics for reporting
   * @param days The number of days to include in the report
   */
  async getRetentionMetrics(days = 30) {
    try {
      const { data, error } = await this.supabase
        .from('retention_metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(days);
      
      if (error) {
        throw new Error(`Error fetching retention metrics: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('[RetentionService] Failed to get retention metrics:', error);
      throw error;
    }
  }
  
  /**
   * Update retention metrics with current counts
   */
  private async updateRetentionMetrics(executionTimeMs: number) {
    try {
      // Get counts for different statuses
      const counts = await Promise.all([
        this.getStatusCount(RetentionStatus.ACTIVE),
        this.getStatusCount(RetentionStatus.WARNING),
        this.getStatusCount(RetentionStatus.INACTIVE),
        this.getStatusCount(RetentionStatus.GRACE_PERIOD),
        this.getStatusCount(RetentionStatus.ANONYMIZING),
        this.getStatusCount(RetentionStatus.ANONYMIZED),
        this.getTypeCount(RetentionType.PERSONAL),
        this.getTypeCount(RetentionType.BUSINESS),
      ]);
      
      const today = new Date();
      const dateStr = format(today, 'yyyy-MM-dd');
      
      // Check if we already have an entry for today
      const { data: existing } = await this.supabase
        .from('retention_metrics')
        .select('id')
        .eq('date', dateStr)
        .maybeSingle();
      
      const metricsData = {
        date: dateStr,
        active_users: counts[0],
        warning_users: counts[1],
        inactive_users: counts[2],
        grace_period_users: counts[3],
        anonymizing_users: counts[4],
        anonymized_users: counts[5],
        personal_users: counts[6],
        business_users: counts[7],
        execution_time_ms: executionTimeMs,
      };
      
      if (existing) {
        // Update existing record
        await this.supabase
          .from('retention_metrics')
          .update(metricsData)
          .eq('id', existing.id);
      } else {
        // Insert new record
        await this.supabase
          .from('retention_metrics')
          .insert(metricsData);
      }
    } catch (error) {
      console.error('[RetentionService] Failed to update retention metrics:', error);
    }
  }
  
  /**
   * Get count of users with a specific status
   */
  private async getStatusCount(status: RetentionStatus): Promise<number> {
    const { count, error } = await this.supabase
      .from('retention_records')
      .select('id', { count: 'exact', head: true })
      .eq('status', status);
    
    if (error) {
      console.error(`Error getting count for status ${status}:`, error);
      return 0;
    }
    
    return count || 0;
  }
  
  /**
   * Get count of users with a specific type
   */
  private async getTypeCount(type: RetentionType): Promise<number> {
    const { count, error } = await this.supabase
      .from('retention_records')
      .select('id', { count: 'exact', head: true })
      .eq('retention_type', type);
    
    if (error) {
      console.error(`Error getting count for type ${type}:`, error);
      return 0;
    }
    
    return count || 0;
  }
  
  /**
   * Send inactivity warning notification
   */
  private async sendInactivityWarning(
    email: string,
    data: { daysUntilInactive: number; inactiveDate: Date }
  ) {
    const subject = 'Your account is approaching inactivity status';
    const html = `
      <p>Hello,</p>
      <p>
        Your account has been inactive for an extended period. If you do not log in within
        the next ${data.daysUntilInactive} days (by ${formatDate(data.inactiveDate)}),
        your account will be marked as inactive.
      </p>
      <p>
        To keep your account active, please <a href="${process.env.NEXT_PUBLIC_APP_URL}/login">log in</a>
        to your account before this date.
      </p>
      <p>
        If you no longer wish to use your account, no action is needed. After your account
        becomes inactive, you'll have a 30-day grace period to reactivate it before your
        personal data is anonymized according to our data retention policy.
      </p>
      <p>Thank you!</p>
    `;
    
    try {
      await sendEmail({ to: email, subject, html });
      
      // Record notification in database
      await this.supabase.from('retention_notifications').insert({
        user_id: (await this.getUserIdByEmail(email)) || 'unknown',
        type: 'warning',
        delivery_status: 'sent',
      });
      
      return true;
    } catch (error) {
      console.error(`[RetentionService] Failed to send inactivity warning to ${email}:`, error);
      return false;
    }
  }
  
  /**
   * Send approaching inactive notification
   */
  private async sendApproachingInactiveNotification(
    email: string,
    data: { daysUntilInactive: number; inactiveDate: Date }
  ) {
    const subject = 'Final notice: Your account will soon be inactive';
    const html = `
      <p>Hello,</p>
      <p>
        This is a final reminder that your account will be marked as inactive in 
        ${data.daysUntilInactive} days (on ${formatDate(data.inactiveDate)})
        due to extended inactivity.
      </p>
      <p>
        To keep your account active, please <a href="${process.env.NEXT_PUBLIC_APP_URL}/login">log in</a>
        to your account as soon as possible.
      </p>
      <p>
        Once your account becomes inactive, you'll have a 30-day grace period to reactivate it
        before your personal data is anonymized according to our data retention policy.
      </p>
      <p>Thank you!</p>
    `;
    
    try {
      await sendEmail({ to: email, subject, html });
      
      // Record notification in database
      await this.supabase.from('retention_notifications').insert({
        user_id: (await this.getUserIdByEmail(email)) || 'unknown',
        type: 'approaching_inactive',
        delivery_status: 'sent',
      });
      
      return true;
    } catch (error) {
      console.error(`[RetentionService] Failed to send approaching inactive notification to ${email}:`, error);
      return false;
    }
  }
  
  /**
   * Send inactive account notification
   */
  private async sendInactiveAccountNotification(
    email: string,
    data: { gracePeriodDate: Date }
  ) {
    const subject = 'Your account is now inactive';
    const html = `
      <p>Hello,</p>
      <p>
        Due to extended inactivity, your account has been marked as inactive.
      </p>
      <p>
        You now have a 30-day grace period (until ${formatDate(data.gracePeriodDate)})
        to reactivate your account by simply <a href="${process.env.NEXT_PUBLIC_APP_URL}/login">logging in</a>.
      </p>
      <p>
        If no action is taken by this date, your personal data will be anonymized
        in accordance with our data retention policy.
      </p>
      <p>Thank you!</p>
    `;
    
    try {
      await sendEmail({ to: email, subject, html });
      
      // Record notification in database
      await this.supabase.from('retention_notifications').insert({
        user_id: (await this.getUserIdByEmail(email)) || 'unknown',
        type: 'inactive',
        delivery_status: 'sent',
      });
      
      return true;
    } catch (error) {
      console.error(`[RetentionService] Failed to send inactive account notification to ${email}:`, error);
      return false;
    }
  }
  
  /**
   * Helper to get user ID from email
   */
  private async getUserIdByEmail(email: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      
      if (error || !data) {
        return null;
      }
      
      return data.id;
    } catch (error) {
      console.error(`[RetentionService] Failed to get user ID for email ${email}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const retentionService = new RetentionService(); 