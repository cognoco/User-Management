/**
 * Default GDPR Service Implementation
 */
import { GdprService } from '@/core/gdpr/interfaces';
import { UserDataExport, AccountDeletionResult, DeletionRequest } from '@/core/gdpr/models';
import type { IGdprDataProvider as GdprDataProvider } from '@/core/gdpr/IGdprDataProvider';

export class DefaultGdprService implements GdprService {
  constructor(private provider: GdprDataProvider) {}

  generateUserExport(userId: string): Promise<UserDataExport | null> {
    return this.provider.generateUserExport(userId);
  }

  deleteUserData(userId: string): Promise<AccountDeletionResult> {
    return this.provider.deleteUserData(userId);
  }

  requestAccountDeletion(
    userId: string,
    scheduledDeletionAt: string,
  ): Promise<{ success: boolean; request?: DeletionRequest; error?: string }> {
    return this.provider.requestAccountDeletion(userId, scheduledDeletionAt);
  }
}
