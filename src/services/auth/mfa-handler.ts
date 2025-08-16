import type { AuthDataProvider } from '@/adapters/auth/interfaces';
import type { MFASetupResponse, MFAVerifyResponse } from '@/core/auth/models';
import type { AuthResult } from '@/core/common/user-types';
import { authenticator, hotp } from 'otplib';

export interface MFAHandler {
  setupMFA(): Promise<MFASetupResponse>;
  verifyMFA(code: string): Promise<MFAVerifyResponse>;
  disableMFA(code: string): Promise<AuthResult>;
  startWebAuthnRegistration(): Promise<MFASetupResponse>;
  verifyWebAuthnRegistration(data: unknown): Promise<MFAVerifyResponse>;
  generateTOTPSecret(): Promise<string>;
  verifyTOTP(secret: string, token: string): Promise<boolean>;
}

export class DefaultMFAHandler implements MFAHandler {
  private usedTokens = new Map<string, Set<string>>();

  constructor(private provider: AuthDataProvider) {}

  setupMFA(): Promise<MFASetupResponse> {
    return this.provider.setupMFA();
  }

  verifyMFA(code: string): Promise<MFAVerifyResponse> {
    return this.provider.verifyMFA(code);
  }

  disableMFA(code: string): Promise<AuthResult> {
    return this.provider.disableMFA(code);
  }

  startWebAuthnRegistration(): Promise<MFASetupResponse> {
    return this.provider.startWebAuthnRegistration();
  }

  verifyWebAuthnRegistration(data: unknown): Promise<MFAVerifyResponse> {
    return this.provider.verifyWebAuthnRegistration(data);
  }

  async generateTOTPSecret(): Promise<string> {
    return authenticator.generateSecret();
  }

  async verifyTOTP(secret: string, token: string): Promise<boolean> {
    const set = this.usedTokens.get(secret) ?? new Set<string>();
    if (set.has(token)) return false;
    const counter = Math.floor(Date.now() / 30000);
    const validCurrent = hotp.generate(secret, counter) === token;
    const validPrev = hotp.generate(secret, counter - 1) === token;
    const valid = validCurrent || validPrev;
    if (valid) {
      set.add(token);
      this.usedTokens.set(secret, set);
    }
    return valid;
  }
}
