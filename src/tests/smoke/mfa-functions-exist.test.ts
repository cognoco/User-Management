/**
 * Smoke Test - Verify MFA Functions Exist
 * 
 * Quick test to verify that all the required MFA functions are properly exposed
 */

import { describe, it, expect } from 'vitest';
import { DefaultAuthService } from '@/services/auth/default-auth.service';
import { DefaultMfaService } from '@/services/auth/mfa-service';
import { SupabaseMfaAdapter } from '@/adapters/supabase/mfa-adapter';

describe('MFA Functions Exist - Smoke Test', () => {
  it('should have all required MFA methods in DefaultAuthService', () => {
    const prototype = DefaultAuthService.prototype;
    
    expect(prototype.setupTwoFactor).toBeDefined();
    expect(typeof prototype.setupTwoFactor).toBe('function');
    
    expect(prototype.verifyTwoFactor).toBeDefined();
    expect(typeof prototype.verifyTwoFactor).toBe('function');
    
    expect(prototype.disableTwoFactor).toBeDefined();
    expect(typeof prototype.disableTwoFactor).toBe('function');
    
    expect(prototype.generateBackupCodes).toBeDefined();
    expect(typeof prototype.generateBackupCodes).toBe('function');
    
    expect(prototype.verifyBackupCode).toBeDefined();
    expect(typeof prototype.verifyBackupCode).toBe('function');
  });

  it('should have all required MFA methods in DefaultMfaService', () => {
    const prototype = DefaultMfaService.prototype;
    
    expect(prototype.setupTwoFactor).toBeDefined();
    expect(typeof prototype.setupTwoFactor).toBe('function');
    
    expect(prototype.verifyTwoFactor).toBeDefined();
    expect(typeof prototype.verifyTwoFactor).toBe('function');
    
    expect(prototype.disableTwoFactor).toBeDefined();
    expect(typeof prototype.disableTwoFactor).toBe('function');
    
    expect(prototype.generateBackupCodes).toBeDefined();
    expect(typeof prototype.generateBackupCodes).toBe('function');
    
    expect(prototype.verifyBackupCode).toBeDefined();
    expect(typeof prototype.verifyBackupCode).toBe('function');
  });

  it('should have all required MFA methods in SupabaseMfaAdapter', () => {
    const prototype = SupabaseMfaAdapter.prototype;
    
    expect(prototype.getUser).toBeDefined();
    expect(typeof prototype.getUser).toBe('function');
    
    expect(prototype.updateUser).toBeDefined();
    expect(typeof prototype.updateUser).toBe('function');
    
    expect(prototype.getTempTotpSecret).toBeDefined();
    expect(typeof prototype.getTempTotpSecret).toBe('function');
    
    expect(prototype.setTempTotpSecret).toBeDefined();
    expect(typeof prototype.setTempTotpSecret).toBe('function');
    
    expect(prototype.consumeBackupCode).toBeDefined();
    expect(typeof prototype.consumeBackupCode).toBe('function');
  });

  it('should export required interfaces and types', async () => {
    // These imports should not throw
    const authInterfaces = await import('@/core/auth/interfaces');
    
    // Verify the types exist (they are used as type guards)
    expect(authInterfaces).toHaveProperty('TwoFactorSetupResult');
    expect(authInterfaces).toHaveProperty('TwoFactorVerifyResult');
    expect(authInterfaces).toHaveProperty('TwoFactorDisableResult');
    expect(authInterfaces).toHaveProperty('BackupCodeResult');
    expect(authInterfaces).toHaveProperty('BackupCodeVerifyResult');
  });
});