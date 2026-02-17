import { GdprService } from '@/core/gdpr/interfaces';
import { DefaultGdprService } from './default-gdpr.service';
import type { IGdprDataProvider as GdprDataProvider } from '@/core/gdpr/IGdprDataProvider';

export interface GdprServiceConfig {
  gdprDataProvider: GdprDataProvider;
}

export function createGdprService(config: GdprServiceConfig): GdprService {
  return new DefaultGdprService(config.gdprDataProvider);
}

export default {
  createGdprService
};
