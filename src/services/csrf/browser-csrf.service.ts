import { CsrfService } from '@/core/csrf/interfaces';
import type { CsrfDataProvider } from '@/core/csrf/ICsrfDataProvider';

export class BrowserCsrfService implements CsrfService {
  constructor(private provider: CsrfDataProvider) {}

  async createToken(): Promise<{ success: boolean; token?: any; error?: string }> {
    const token = await this.provider.generateToken();
    return { success: true, token: { token } };
  }

  async validateToken(token: string): Promise<{ valid: boolean; error?: string }> {
    try {
      return await this.provider.validateToken(token);
    } catch (e: any) {
      return { valid: false, error: e?.message ?? 'Validation failed' };
    }
  }

  async revokeToken(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.provider.revokeToken(token);
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'Revoke failed' };
    }
  }
}
