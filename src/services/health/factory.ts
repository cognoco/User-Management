import type { HealthMonitoringService } from '@/core/health/interfaces';
import { DefaultHealthMonitoringService } from './default-health.service';
import { AdapterRegistry } from '../../adapters/registry';

export function createHealthService(): HealthMonitoringService {
  // Adapter kept for future extension; not used by default implementation
  AdapterRegistry.getInstance();
  return new DefaultHealthMonitoringService();
}

export function getHealthService(): HealthMonitoringService {
  return createHealthService();
}
