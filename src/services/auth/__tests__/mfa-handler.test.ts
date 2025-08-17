import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DefaultMFAHandler } from '../mfa-handler';
import { hotp } from 'otplib';

function generateTOTPToken(secret: string, time: number = Date.now()) {
  const counter = Math.floor(time / 30000);
  return hotp.generate(secret, counter);
}

describe('DefaultMFAHandler', () => {
  let provider: any;
  let handler: DefaultMFAHandler;

  beforeEach(() => {
    provider = {
      setupMFA: vi.fn(),
      verifyMFA: vi.fn(),
      disableMFA: vi.fn(),
      startWebAuthnRegistration: vi.fn(),
      verifyWebAuthnRegistration: vi.fn(),
    };
    handler = new DefaultMFAHandler(provider);
  });

  describe('delegation to provider', () => {
    it('delegates setup', async () => {
      provider.setupMFA.mockResolvedValue({ success: true });
      const res = await handler.setupMFA();
      expect(provider.setupMFA).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });

    it('delegates verify', async () => {
      provider.verifyMFA.mockResolvedValue({ success: true });
      const res = await handler.verifyMFA('123');
      expect(provider.verifyMFA).toHaveBeenCalledWith('123');
      expect(res.success).toBe(true);
    });

    it('delegates disable', async () => {
      provider.disableMFA.mockResolvedValue({ success: true });
      const res = await handler.disableMFA('456');
      expect(provider.disableMFA).toHaveBeenCalledWith('456');
      expect(res.success).toBe(true);
    });

    it('delegates WebAuthn registration start', async () => {
      provider.startWebAuthnRegistration.mockResolvedValue({ success: true });
      const res = await handler.startWebAuthnRegistration();
      expect(provider.startWebAuthnRegistration).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });

    it('delegates WebAuthn registration verification', async () => {
      provider.verifyWebAuthnRegistration.mockResolvedValue({ success: true });
      const res = await handler.verifyWebAuthnRegistration('data');
      expect(provider.verifyWebAuthnRegistration).toHaveBeenCalledWith('data');
      expect(res.success).toBe(true);
    });
  });

  describe('TOTP Generation', () => {
    it('generates a valid TOTP secret', async () => {
      const secret = await handler.generateTOTPSecret();
      expect(secret).toMatch(/^[A-Z2-7]{16}$/);
    });

    it('verifies a valid TOTP token', async () => {
      const secret = await handler.generateTOTPSecret();
      const token = generateTOTPToken(secret);
      const isValid = await handler.verifyTOTP(secret, token);
      expect(isValid).toBe(true);
    });

    it('rejects an invalid TOTP token', async () => {
      const secret = await handler.generateTOTPSecret();
      const isValid = await handler.verifyTOTP(secret, '000000');
      expect(isValid).toBe(false);
    });
  });

  describe('Security Edge Cases', () => {
    it('handles replay attacks', async () => {
      const secret = await handler.generateTOTPSecret();
      const token = generateTOTPToken(secret);
      expect(await handler.verifyTOTP(secret, token)).toBe(true);
      expect(await handler.verifyTOTP(secret, token)).toBe(false);
    });

    it('handles time window attacks', async () => {
      const secret = await handler.generateTOTPSecret();
      const futureToken = generateTOTPToken(secret, Date.now() + 35000);
      const isValid = await handler.verifyTOTP(secret, futureToken);
      expect(isValid).toBe(false);
    });
  });
});
