import { supabase } from '@/lib/database/supabase';
import { OrganizationSecurityPolicy, DEFAULT_SECURITY_POLICY } from '@/types/organizations';
import { validatePasswordWithPolicy, validatePassword } from './password-validation';

/**
 * Fetches the security policy for an organization
 */
export async function getOrganizationPolicy(
  orgId: string
): Promise<OrganizationSecurityPolicy | null> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('security_settings')
      .eq('id', orgId)
      .single();
    
    if (error) {
      console.error('Error fetching organization policy:', error);
      return null;
    }
    
    if (!data?.security_settings) {
      return DEFAULT_SECURITY_POLICY;
    }
    
    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_SECURITY_POLICY,
      ...data.security_settings
    };
  } catch (err) {
    console.error('Unexpected error fetching organization policy:', err);
    return null;
  }
}

/**
 * Checks if MFA is required for a user based on their organization's policy
 */
export async function isMfaRequiredForUser(
  userId: string,
  orgId: string
): Promise<boolean> {
  const policy = await getOrganizationPolicy(orgId);
  if (!policy) return false;
  
  return policy.require_mfa;
}

/**
 * Gets the allowed MFA methods for an organization
 */
export async function getAllowedMfaMethods(
  orgId: string
): Promise<string[]> {
  const policy = await getOrganizationPolicy(orgId);
  if (!policy) return ["totp", "sms", "email"]; // Default
  
  return policy.allowed_mfa_methods;
}

/**
 * Gets session timeout value for an organization
 */
export async function getSessionTimeout(
  orgId: string
): Promise<number> {
  const policy = await getOrganizationPolicy(orgId);
  if (!policy) return DEFAULT_SECURITY_POLICY.session_timeout_mins;
  
  return policy.session_timeout_mins;
}

/**
 * Gets maximum allowed sessions per user
 */
export async function getMaxSessionsPerUser(
  orgId: string
): Promise<number> {
  const policy = await getOrganizationPolicy(orgId);
  if (!policy) return DEFAULT_SECURITY_POLICY.max_sessions_per_user;
  
  return policy.max_sessions_per_user;
}

/**
 * Validates a password against an organization's policy
 */
export async function validatePasswordAgainstOrgPolicy(
  password: string,
  orgId: string
): Promise<{ isValid: boolean; errors: string[] }> {
  const policy = await getOrganizationPolicy(orgId);
  if (!policy) {
    return validatePassword(password);
  }
  
  return validatePasswordWithPolicy(password, policy);
}

/**
 * Checks if a user's password has expired based on org policy
 */
export async function hasPasswordExpired(
  userId: string,
  orgId: string
): Promise<boolean> {
  const policy = await getOrganizationPolicy(orgId);
  if (!policy || policy.password_expiry_days === 0) return false;
  
  // Get the user's last password change date
  const { data, error } = await supabase
    .from('user_profiles')
    .select('last_password_change')
    .eq('user_id', userId)
    .single();
  
  if (error || !data?.last_password_change) return false;
  
  const lastPasswordChange = new Date((data as any).last_password_change);
  const now = new Date();
  
  // Calculate expiry date
  const expiryDate = new Date(lastPasswordChange);
  expiryDate.setDate(expiryDate.getDate() + policy.password_expiry_days);
  
  return now > expiryDate;
}

/**
 * Checks if an IP address is allowed based on organization policy
 */
export async function isIpAllowed(
  ipAddress: string,
  orgId: string
): Promise<boolean> {
  const policy = await getOrganizationPolicy(orgId);
  if (!policy) return true; // Allow if no policy
  
  // If allowlist is not enabled, all IPs are allowed
  if (!policy.ip_allowlist_enabled) return true;
  
  // Check if IP is in the denylist
  if (policy.ip_denylist.includes(ipAddress)) return false;
  
  // If allowlist is empty but enabled, deny all
  if (policy.ip_allowlist.length === 0) return false;
  
  // Check if IP is in the allowlist
  return policy.ip_allowlist.includes(ipAddress);
}

/**
 * Checks if a sensitive action requires reauthentication
 */
export async function requiresReauthForAction(
  action: string,
  orgId: string
): Promise<boolean> {
  const policy = await getOrganizationPolicy(orgId);
  if (!policy) return false;
  
  // If reauth is not required for sensitive actions, return false
  if (!policy.require_reauth_for_sensitive) return false;
  
  // Check if the action is in the list of sensitive actions
  return policy.sensitive_actions.includes(action);
} 