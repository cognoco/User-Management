/**
 * Supabase MFA Adapter
 * 
 * This adapter implements the MFA data provider interface for Supabase.
 * It handles TOTP secrets, backup codes, and MFA state management.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { MfaDataProvider } from '@/services/auth/mfa-service';

export class SupabaseMfaAdapter implements MfaDataProvider {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getUser(userId: string): Promise<any> {
    const { data: { user }, error } = await this.supabase.auth.admin.getUserById(userId);
    
    if (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
    
    return user;
  }

  async updateUser(userId: string, data: any): Promise<void> {
    const { error } = await this.supabase.auth.admin.updateUserById(userId, {
      user_metadata: data
    });
    
    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async getTempTotpSecret(userId: string): Promise<string | null> {
    const user = await this.getUser(userId);
    return user?.user_metadata?.tempTotpSecret || null;
  }

  async setTempTotpSecret(userId: string, secret: string): Promise<void> {
    await this.updateUser(userId, { tempTotpSecret: secret });
  }

  async getTotpSecret(userId: string): Promise<string | null> {
    const user = await this.getUser(userId);
    return user?.user_metadata?.totpSecret || null;
  }

  async setTotpSecret(userId: string, secret: string): Promise<void> {
    await this.updateUser(userId, { totpSecret: secret });
  }

  async enableMfa(userId: string, enabled: boolean): Promise<void> {
    await this.updateUser(userId, { 
      mfaEnabled: enabled,
      totpEnabled: enabled,
      totpVerified: enabled
    });
  }

  async getBackupCodes(userId: string): Promise<string[]> {
    const user = await this.getUser(userId);
    return user?.user_metadata?.backupCodes || [];
  }

  async setBackupCodes(userId: string, codes: string[]): Promise<void> {
    await this.updateUser(userId, { 
      backupCodes: codes,
      backupCodesGeneratedAt: new Date().toISOString()
    });
  }

  async consumeBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.getUser(userId);
    const backupCodes = user?.user_metadata?.backupCodes || [];
    
    // Find the exact code (case-insensitive)
    const codeIndex = backupCodes.findIndex((c: string) => 
      c.toUpperCase() === code.toUpperCase()
    );
    
    if (codeIndex === -1) {
      return false; // Code not found or already used
    }
    
    // Remove the used code
    const updatedCodes = [...backupCodes];
    updatedCodes.splice(codeIndex, 1);
    
    // Update the user's backup codes
    await this.setBackupCodes(userId, updatedCodes);
    
    return true;
  }
}

export default SupabaseMfaAdapter;