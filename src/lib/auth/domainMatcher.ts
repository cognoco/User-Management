import { getServiceSupabase } from '@/lib/database/supabase';

/**
 * Checks if an email domain matches any verified company domains
 * @param email User email to check
 * @returns Object containing match information if found
 */
export async function checkDomainMatch(email: string): Promise<{
  matched: boolean;
  companyId?: string;
  companyName?: string;
  domainId?: string;
}> {
  if (!email || !email.includes('@')) {
    return { matched: false };
  }

  try {
    const emailDomain = email.split('@')[1].toLowerCase();
    const supabase = getServiceSupabase();

    // Look for verified domains that match the email domain
    const { data, error } = await supabase
      .from('company_domains')
      .select(`
        id,
        domain,
        is_verified,
        is_primary,
        company_id,
        company:company_profiles(id, name)
      `)
      .eq('is_verified', true)
      .eq('domain', emailDomain);

    if (error || !data || data.length === 0) {
      if (error) console.error('Error checking domain match:', error);
      return { matched: false };
    }

    // Find primary domain if there are multiple matches (unlikely)
    const primaryDomain = data.find((d: any) => d.is_primary) || data[0];
    
    // Extract company info from the first record
    const companyData = primaryDomain.company;
    
    if (!companyData || companyData.length === 0) {
      return { matched: false };
    }
    
    const company = companyData[0];
    
    return {
      matched: true,
      companyId: company.id,
      companyName: company.name,
      domainId: primaryDomain.id
    };
  } catch (error) {
    console.error('Unexpected error in checkDomainMatch:', error);
    return { matched: false };
  }
}

/**
 * Associates a user with a company based on email domain match
 * @param userId User ID to associate
 * @param email User email to check for domain match
 * @returns Success status and information about the match
 */
export async function associateUserWithCompanyByDomain(userId: string, email: string): Promise<{
  success: boolean;
  matched: boolean;
  companyId?: string;
  companyName?: string;
  error?: string;
}> {
  if (!userId || !email) {
    return { success: false, matched: false, error: 'User ID and email are required' };
  }

  try {
    // First check if there's a domain match
    const matchResult = await checkDomainMatch(email);
    
    if (!matchResult.matched) {
      return { success: true, matched: false };
    }

    const supabase = getServiceSupabase();
    const { companyId, companyName } = matchResult;
    
    // Ensure companyId exists before proceeding
    if (!companyId) {
      return { success: false, matched: true, error: 'Company ID not found' };
    }

    // Check if user is already associated with this company
    const { data: existingAssociation } = await supabase
      .from('company_member_access')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (existingAssociation) {
      // User is already associated, nothing to do
      return { 
        success: true, 
        matched: true,
        companyId,
        companyName
      };
    }

    // Add user to company with default role "member"
    const { error: accessError } = await supabase
      .from('company_member_access')
      .insert({
        company_id: companyId,
        user_id: userId,
        role: 'member',
        joined_via: 'domain_match',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (accessError) {
      console.error('Error associating user with company:', accessError);
      return { 
        success: false, 
        matched: true,
        companyId,
        companyName,
        error: 'Failed to associate user with company'
      };
    }

    // Send notification to company admins (server-only lazy import to avoid bundling nodemailer/fs)
    if (typeof window === 'undefined') {
      const { sendCompanyNotification } = await import('@/lib/notifications/sendCompanyNotification');
      await sendCompanyNotification({
        companyId,
        notificationType: 'new_member_domain',
        subject: 'New Team Member Joined',
        content: `A new user (${email}) has joined your company via verified domain.`,
      });
    }

    return {
      success: true,
      matched: true,
      companyId,
      companyName
    };
  } catch (error) {
    console.error('Unexpected error in associateUserWithCompanyByDomain:', error);
    return { 
      success: false, 
      matched: false,
      error: 'An unexpected error occurred'
    };
  }
} 