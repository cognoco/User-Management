// Monitoring system integration for error aggregation and alerting
import { telemetry } from './error-system';
import { AlertManager, AlertRule } from '@/lib/telemetry/alert-manager';
import { ApplicationError } from '@/core/common/errors';

let initialized = false;
let alertManager: AlertManager | null = null;

function getAlertManager(): AlertManager {
  if (!alertManager) {
    alertManager = new AlertManager();
  }
  return alertManager;
}

export interface MonitoringConfig {
  alertRules?: AlertRule[];
}

export function initializeMonitoringSystem(config: MonitoringConfig = {}): void {
  if (initialized) return;
  
  // Only initialize monitoring system on server side
  if (typeof window !== 'undefined') {
    return;
  }
  
  initialized = true;

  const manager = getAlertManager();
  
  if (config.alertRules) {
    for (const rule of config.alertRules) {
      manager.addRule(rule);
    }
  }

  telemetry.addAlertNotifier(alert => {
    const error = new ApplicationError(
      alert.errorType as any,
      alert.message,
      alert.severity === 'critical' ? 500 : 400,
    );
    manager.registerError(error);
  });
}

export { getAlertManager as alertManager };

/**
 * Test utility to reset initialization state
 * @internal
 */
export function __resetInitialization() {
  initialized = false;
  alertManager = null;
}
