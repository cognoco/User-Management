import type { HealthMonitoringService } from '../../core/health/interfaces';
import { DefaultHealthMonitoringService } from './default-health.service';
import { AdapterRegistry } from '../../adapters/registry';

export function createHealthService(): HealthMonitoringService {
  const adapter = AdapterRegistry.getInstance().getAdapter('health');
  return new DefaultHealthMonitoringService(adapter as any);
}

export function getHealthService(): HealthMonitoringService {
  return createHealthService();
}
