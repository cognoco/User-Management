import { TypedEventEmitter } from '@/lib/utils/typed-event-emitter';

export interface TelemetryErrorEvent {
  type: string;
  message: string;
  userId?: string;
  userSegment?: string;
  action?: string;
  critical?: boolean;
}

export interface TelemetryAlert {
  errorType: string;
  severity: 'critical' | 'non-critical';
  count: number;
  message: string;
}

export interface AlertNotifier {
  notify(alert: TelemetryAlert): void | Promise<void>;
}

interface TelemetryConfig {
  alertThresholds?: Record<string, number>;
  alertCooldownMs?: number;
}

interface ErrorMetrics {
  count: number;
  criticalCount: number;
  nonCriticalCount: number;
  firstSeen: number;
  lastSeen: number;
  resolutionTimes: number[];
  affectedUsers: Set<string>;
  segmentImpact: Map<string, number>;
  actionCounts: Map<string, number>;
  events: number[];
  feedbackHelpful: number;
  feedbackTotal: number;
}

export type TelemetryEvent = { type: 'alert'; alert: TelemetryAlert };

export class Telemetry extends TypedEventEmitter<TelemetryEvent> {
  private metrics = new Map<string, ErrorMetrics>();
  private alertThresholds: Record<string, number>;
  private alertCooldownMs: number;
  private lastAlertTime: Record<string, number> = {};
  private notifiers: AlertNotifier[] = [];

  constructor(config: TelemetryConfig = {}) {
    super();
    this.alertThresholds = config.alertThresholds || {};
    this.alertCooldownMs = config.alertCooldownMs ?? 60_000;
  }

  addAlertNotifier(notifier: AlertNotifier) {
    this.notifiers.push(notifier);
  }

  setAlertThreshold(type: string, threshold: number) {
    this.alertThresholds[type] = threshold;
  }

  recordError(event: TelemetryErrorEvent) {
    const now = Date.now();
    let m = this.metrics.get(event.type);
    if (!m) {
      m = {
        count: 0,
        criticalCount: 0,
        nonCriticalCount: 0,
        firstSeen: now,
        lastSeen: now,
        resolutionTimes: [],
        affectedUsers: new Set(),
        segmentImpact: new Map(),
        actionCounts: new Map(),
        events: [],
        feedbackHelpful: 0,
        feedbackTotal: 0,
      };
      this.metrics.set(event.type, m);
    }
    m.count++;
    m.lastSeen = now;
    m.events.push(now);
    if (event.critical) m.criticalCount++; else m.nonCriticalCount++;
    if (event.userId) m.affectedUsers.add(event.userId);
    if (event.userSegment)
      m.segmentImpact.set(
        event.userSegment,
        (m.segmentImpact.get(event.userSegment) || 0) + 1,
      );
    if (event.action)
      m.actionCounts.set(event.action, (m.actionCounts.get(event.action) || 0) + 1);

    this.checkAlert(event.type, event.critical ? 'critical' : 'non-critical', m);
  }

  resolveError(type: string) {
    const m = this.metrics.get(type);
    if (!m) return;
    const now = Date.now();
    m.resolutionTimes.push(now - m.lastSeen);
  }

  getMetrics(type: string): ErrorMetrics | undefined;
  getMetrics(): Record<string, ErrorMetrics>;
  getMetrics(type?: string): ErrorMetrics | Record<string, ErrorMetrics> | undefined {
    if (type) return this.metrics.get(type);
    const obj: Record<string, ErrorMetrics> = {};
    this.metrics.forEach((v, k) => (obj[k] = v));
    return obj;
  }

  getErrorRate(type: string, windowMs = 60_000): number {
    const m = this.metrics.get(type);
    if (!m) return 0;
    const now = Date.now();
    m.events = m.events.filter(t => now - t <= windowMs);
    return m.events.length / (windowMs / 1000);
  }

  recordFeedback(type: string, wasHelpful: boolean) {
    let m = this.metrics.get(type);
    if (!m) {
      m = {
        count: 0,
        criticalCount: 0,
        nonCriticalCount: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        resolutionTimes: [],
        affectedUsers: new Set(),
        segmentImpact: new Map(),
        actionCounts: new Map(),
        events: [],
        feedbackHelpful: 0,
        feedbackTotal: 0,
      };
      this.metrics.set(type, m);
    }
    m.feedbackTotal++;
    if (wasHelpful) m.feedbackHelpful++;
  }

  getHighestImpactErrors(): string[] {
    return Array.from(this.metrics.entries())
      .sort((a, b) => b[1].affectedUsers.size - a[1].affectedUsers.size)
      .map(e => e[0]);
  }

  private checkAlert(type: string, severity: 'critical' | 'non-critical', m: ErrorMetrics) {
    const threshold = this.alertThresholds[type];
    if (!threshold || m.count < threshold) return;
    const now = Date.now();
    if (now - (this.lastAlertTime[type] || 0) < this.alertCooldownMs) return;
    this.lastAlertTime[type] = now;
    const alert: TelemetryAlert = {
      errorType: type,
      severity,
      count: m.count,
      message: `Error ${type} occurred ${m.count} times`,
    };
    for (const n of this.notifiers) n.notify(alert);
    this.emit({ type: 'alert', alert });
  }
}
