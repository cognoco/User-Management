import { AdminService } from '@/core/admin/interfaces';
import type { SearchUsersParams } from '@/core/admin/interfaces';
import type { IAdminDataProvider } from '@/core/admin/IAdminDataProvider';
import { objectsToCSV } from '@/utils/export/csvExport';
import { formatJSONForExport } from '@/utils/export/jsonExport';
import { SearchCache } from '@/utils/cache/searchCache';
import type { PaginationMeta } from '@/lib/api/common/response-formatter';

interface SearchResult {
  users: any[];
  pagination: PaginationMeta;
}

export class DefaultAdminService implements AdminService {
  private searchCache: SearchCache<SearchResult>;

  constructor(private provider: IAdminDataProvider) {
    this.searchCache = new SearchCache<SearchResult>(60000);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listUsers(_params: any): Promise<{ users: any[]; pagination: any }> {
    throw new Error('Not implemented');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUserById(_id: string): Promise<any | null> {
    throw new Error('Not implemented');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateUser(_id: string, _data: Record<string, any>): Promise<any> {
    throw new Error('Not implemented');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteUser(_id: string): Promise<void> {
    throw new Error('Not implemented');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAuditLogs(_params: any): Promise<{ logs: any[]; pagination: any }> {
    throw new Error('Not implemented');
  }

  async searchUsers(params: SearchUsersParams): Promise<SearchResult> {
    const cacheKey = this.searchCache.generateKey(params);
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.provider.searchUsers(params);

    this.searchCache.set(cacheKey, result as SearchResult);
    return result as SearchResult;
  }

  async exportUsers(params: SearchUsersParams, format: 'csv' | 'json'): Promise<{ data: string; filename: string }> {
    const { users } = await this.searchUsers({ ...params, page: 1, limit: 10000 });
    const timestamp = new Date().toISOString().split('T')[0];
    if (format === 'csv') {
      const csv = objectsToCSV(users, [
        { key: 'id', header: 'ID' },
        { key: 'firstName', header: 'First Name' },
        { key: 'lastName', header: 'Last Name' },
        { key: 'email', header: 'Email' },
        { key: 'status', header: 'Status' },
        { key: 'role', header: 'Role' },
        { key: 'createdAt', header: 'Created At', format: (v) => (v ? new Date(v).toLocaleString() : '') },
        { key: 'lastLoginAt', header: 'Last Login', format: (v) => (v ? new Date(v).toLocaleString() : 'Never') },
      ]);
      return { data: csv, filename: `user-export-${timestamp}.csv` };
    }

    const json = formatJSONForExport(users, {
      pretty: true,
      transform: (u) => ({
        ...u,
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
      }),
    });
    return { data: json, filename: `user-export-${timestamp}.json` };
  }

  invalidateUserSearchCache(): void {
    this.searchCache.invalidateAll();
  }

  invalidateUserCache(_userId: string): void {
    this.searchCache.invalidateAll();
  }
}
