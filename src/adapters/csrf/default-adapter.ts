import { randomBytes } from 'crypto';
import type { ICsrfDataProvider } from '@/core/csrf/ICsrfDataProvider';
import type { CsrfTokenQuery } from '@/core/csrf/models';
import type { CsrfToken } from '@/core/csrf/models';
import type { PaginationMeta } from '@/lib/api/common/response-formatter';

export class DefaultCsrfProvider implements ICsrfDataProvider {
  private tokens = new Set<string>();

  async generateToken(): Promise<string> {
    const token = randomBytes(32).toString('hex');
    this.tokens.add(token);
    return token;
  }

  async createToken(): Promise<{ success: boolean; token?: CsrfToken; error?: string }> {
    const token = randomBytes(32).toString('hex');
    this.tokens.add(token);
    return { success: true, token: { token } };
  }

  async validateToken(token: string): Promise<{ valid: boolean; error?: string }> {
    return { valid: this.tokens.has(token) };
  }

  async revokeToken(token: string): Promise<{ success: boolean; error?: string }> {
    const existed = this.tokens.delete(token);
    return { success: existed };
  }

  async getToken(token: string): Promise<CsrfToken | null> {
    return this.tokens.has(token) ? { token } : null;
  }

  async listTokens(query: CsrfTokenQuery): Promise<{ tokens: CsrfToken[]; pagination: PaginationMeta }> {
    const all = Array.from(this.tokens).map(t => ({ token: t }));
    return { tokens: all, pagination: { page: 1, pageSize: all.length, totalItems: all.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false } };
  }

  async updateToken(token: string, data: Partial<CsrfToken>): Promise<{ success: boolean; token?: CsrfToken; error?: string }> {
    if (!this.tokens.has(token)) return { success: false, error: 'Token not found' };
    return { success: true, token: { token, ...data } };
  }

  async purgeExpiredTokens(): Promise<{ success: boolean; count: number; error?: string }> {
    return { success: true, count: 0 };
  }
}
