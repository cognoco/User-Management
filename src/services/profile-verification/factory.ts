import type { ProfileVerificationService } from '@/core/profile-verification/interfaces';
import { DefaultProfileVerificationService } from './default-profile-verification.service';
// Service container import removed - using new pure factory pattern

export interface ApiProfileVerificationServiceOptions {
  reset?: boolean;
}

let instance: ProfileVerificationService | null = null;

export function getApiProfileVerificationService(
  options: ApiProfileVerificationServiceOptions = {},
): ProfileVerificationService {
  if (options.reset) {
    instance = null;
  }

  if (!instance) {
    instance = new DefaultProfileVerificationService();
  }

  return instance;
}
