import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const addAlertNotifier = vi.fn();
vi.mock('../error-system', () => ({ telemetry: { addAlertNotifier } }));

const registerError = vi.fn();
vi.mock('@/lib/telemetry/alert-manager', () => ({
  AlertManager: vi.fn().mockImplementation(() => ({
    addRule: vi.fn(),
    registerError,
  })),
}));

vi.mock('@/core/common/errors', async () => {
  const actual = await vi.importActual('@/core/common/errors');
  return { ...actual, ApplicationError: actual.ApplicationError };
});

// Mock window to simulate server environment
const originalWindow = global.window;

const { initializeMonitoringSystem, __resetInitialization } = await import('../monitoring-system');

describe('monitoring-system', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Simulate server environment by removing window
    delete (global as any).window;
    // Reset initialization state
    __resetInitialization();
  });
  
  afterEach(() => {
    // Restore window
    global.window = originalWindow;
  });

  it('registers alert notifier', () => {
    initializeMonitoringSystem();
    expect(addAlertNotifier).toHaveBeenCalledTimes(1);
  });

  it('forwards alerts to alert manager', () => {
    initializeMonitoringSystem();
    expect(addAlertNotifier).toHaveBeenCalledTimes(1);
    
    // Get the callback that was passed to addAlertNotifier
    const cb = addAlertNotifier.mock.calls[0][0];
    expect(cb).toBeDefined();
    
    // Call the callback with an alert
    cb({ errorType: 'ERR', message: 'boom', severity: 'critical', count: 1 });
    expect(registerError).toHaveBeenCalled();
  });
});
