import { getServiceSupabase } from '@/lib/database/supabase';
import { sendEmail } from '@/lib/email/sendEmail';

interface NotificationOptions {
  companyId: string;
  notificationType: 'new_member_domain' | 'domain_verified' | 'domain_verification_failed' | 'security_alert' | 'sso_event';
  subject: string;
  content: string;
  data?: Record<string, any>; // Optional additional data for templating
}

/**
 * Sends a notification to all recipients subscribed to the given notification type for a company
 * @param options Notification options including company ID, type, subject, and content
 * @returns Object with success/error information
 */
export async function sendCompanyNotification(options: NotificationOptions) {
  // Company notifications are only available on server side
  if (typeof window !== 'undefined') {
    console.warn('Company notification attempted on client side - skipping');
    return { success: false, error: 'Company notifications not available on client side' };
  }
  
  const { companyId, notificationType, subject, content } = options;
  const supabase = getServiceSupabase();
  
  try {
    // 1. Check if notification type exists and is enabled for this company
    const { data: preferences, error: prefError } = await supabase
      .from('company_notification_preferences')
      .select('*')
      .eq('company_id', companyId)
      .eq('notification_type', notificationType)
      .eq('enabled', true)
      .maybeSingle();
    
    if (prefError) {
      console.error(`Error checking notification preferences: ${prefError.message}`);
      return { success: false, error: 'Failed to check notification preferences' };
    }
    
    // If preference doesn't exist or is disabled, create a log but don't send
    if (!preferences) {
      console.log(`Notification type "${notificationType}" is not enabled for company ${companyId}`);
      await supabase.from('company_notification_logs').insert({
        notification_type: notificationType,
        channel: 'both', // Using default value
        content: JSON.stringify({ subject, content }),
        status: 'skipped',
      });
      return { success: true, skipped: true, reason: 'notification_disabled' };
    }
    
    // 2. Get recipients for this notification type
    const { data: recipients, error: recipError } = await supabase
      .from('company_notification_recipients')
      .select('*')
      .eq('preference_id', preferences.id);
    
    if (recipError) {
      console.error(`Error fetching notification recipients: ${recipError.message}`);
      return { success: false, error: 'Failed to fetch notification recipients' };
    }
    
    if (!recipients || recipients.length === 0) {
      console.log(`No recipients found for notification type "${notificationType}" for company ${companyId}`);
      await supabase.from('company_notification_logs').insert({
        preference_id: preferences.id,
        notification_type: notificationType,
        channel: 'both', // Using default channel
        content: JSON.stringify({ subject, content }),
        status: 'skipped',
      });
      return { success: true, skipped: true, reason: 'no_recipients' };
    }
    
    // 3. Determine channels to send to based on preference
    const channels = preferences.channel === 'both' 
      ? ['email', 'in_app'] 
      : [preferences.channel];
    
    // 4. Create notification records for all recipients/channels
    const notificationRecords = [];
    
    for (const recipient of recipients) {
      for (const channel of channels) {
        notificationRecords.push({
          preference_id: preferences.id,
          recipient_id: recipient.id,
          notification_type: notificationType,
          channel: channel,
          content: JSON.stringify({ subject, content }),
          status: 'pending',
        });
      }
    }
    
    const { data: notifications, error: insertError } = await supabase
      .from('company_notification_logs')
      .insert(notificationRecords)
      .select();
    
    if (insertError) {
      console.error(`Error creating notification logs: ${insertError.message}`);
      return { success: false, error: 'Failed to create notification logs' };
    }
    
    // 5. Send notifications asynchronously
    // Note: In a production environment, this would be handled by a queue/worker system
    // For now, we'll update the status directly
    
    // Process email notifications
    const emailNotifications = (notifications as any[]).filter((n: any) => n.channel === 'email');
    if (emailNotifications.length > 0) {
      const recipientsMap = new Map((recipients as any[]).map((r: any) => [r.id, r]));
      for (const notif of emailNotifications as any[]) {
        const recipient = recipientsMap.get(notif.recipient_id);
        if (!recipient) {
          continue;
        }

        let emailAddress = recipient.email as string | undefined;

        if (!emailAddress && recipient.user_id) {
          const { data: { user }, error } = await supabase.auth.admin.getUserById(recipient.user_id);
          if (error) {
            console.error('Failed to fetch user email for notification', error);
          }
          emailAddress = user?.email || undefined;
        }

        if (!emailAddress) {
          await supabase
            .from('company_notification_logs')
            .update({
              status: 'failed',
              error_message: 'No recipient email available',
            })
            .eq('id', notif.id);
          continue;
        }

        try {
          await sendEmail({
            to: emailAddress,
            subject,
            html: content,
          });

          await supabase
            .from('company_notification_logs')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', notif.id);
        } catch (err) {
          await supabase
            .from('company_notification_logs')
            .update({
              status: 'failed',
              error_message: err instanceof Error ? err.message : 'Email send failed',
            })
            .eq('id', notif.id);
        }
      }
    }
    
    // Process in-app notifications
    const inAppNotifications = (notifications as any[]).filter((n: any) => n.channel === 'in_app');
    if (inAppNotifications.length > 0) {
      // In-app notifications are already stored in the database
      // They would be displayed to users when they log in
      console.log(`Created ${inAppNotifications.length} in-app notifications for type "${notificationType}"`);
      
      // Update status to "delivered" for all in-app notifications
      const now = new Date().toISOString();
      const inAppIds = inAppNotifications.map((n: any) => n.id);
      
      await supabase
        .from('company_notification_logs')
        .update({
          status: 'delivered',
          sent_at: now,
        })
        .in('id', inAppIds);
    }
    
    return { 
      success: true, 
      sent: notifications.length,
      emailsSent: emailNotifications.length,
      inAppNotificationsSent: inAppNotifications.length 
    };
    
  } catch (error) {
    console.error('Unexpected error in sendCompanyNotification:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
} 