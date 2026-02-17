export type ErrorMetricDimensions = {
  errorCode: string;
  serviceName: string;
  environment: string;
  severity: string;
};

interface TimingData {
  firstSeen: number;
  lastSeen: number;
  resolutionTimes: number[];
  impactDurations: number[];
}

function matches(dim: ErrorMetricDimensions, partial: Partial<ErrorMetricDimensions>): boolean {
  return Object.entries(partial).every(([k, v]) => (dim as any)[k] === v);
}

class ErrorRateCalculator {
  private events: { time: number; dim: ErrorMetricDimensions }[] = [];

  recordError(dim: ErrorMetricDimensions) {
    this.events.push({ time: Date.now(), dim });
  }

  getEventCount(dim: Partial<ErrorMetricDimensions>, windowMs: number, offsetMs = 0): number {
    const now = Date.now() - offsetMs;
    const start = now - windowMs;
    return this.events.filter(e => e.time >= start && e.time <= now && matches(e.dim, dim)).length;
  }

  getErrorRate(dim: Partial<ErrorMetricDimensions>, windowMs: number): number {
    const count = this.getEventCount(dim, windowMs);
    return count / (windowMs / 1000);
  }
}

export class ErrorMetrics {
  private counters: Map<string, number> = new Map();
  private timings: Map<string, TimingData> = new Map();
  private rateCalculator: ErrorRateCalculator;

  constructor() {
    this.rateCalculator = new ErrorRateCalculator();
  }

  incrementErrorCount(dim: ErrorMetricDimensions): void {
    const key = this.getDimensionKey(dim);
    const count = this.counters.get(key) || 0;
    this.counters.set(key, count + 1);

    const now = Date.now();
    let t = this.timings.get(key);
    if (!t) {
      t = { firstSeen: now, lastSeen: now, resolutionTimes: [], impactDurations: [] };
      this.timings.set(key, t);
    } else {
      t.lastSeen = now;
    }
    this.rateCalculator.recordError(dim);
  }

  resolveError(dim: ErrorMetricDimensions): void {
    const key = this.getDimensionKey(dim);
    const t = this.timings.get(key);
    if (!t) return;
    const now = Date.now();
    t.resolutionTimes.push(now - t.lastSeen);
    t.impactDurations.push(now - t.firstSeen);
  }

  getErrorCount(dim: Partial<ErrorMetricDimensions>): number {
    let total = 0;
    for (const [k, c] of this.counters) {
      if (matches(this.parseKey(k), dim)) total += c;
    }
    return total;
  }

  getErrorRate(dim: Partial<ErrorMetricDimensions>, timeWindowMs: number): number {
    return this.rateCalculator.getErrorRate(dim, timeWindowMs);
  }

  getTimeToResolution(dim: ErrorMetricDimensions): number | undefined {
    const t = this.timings.get(this.getDimensionKey(dim));
    if (!t || t.resolutionTimes.length === 0) return undefined;
    return t.resolutionTimes.reduce((a, b) => a + b, 0) / t.resolutionTimes.length;
  }

  getImpactDuration(dim: ErrorMetricDimensions): number | undefined {
    const t = this.timings.get(this.getDimensionKey(dim));
    if (!t || t.impactDurations.length === 0) return undefined;
    return t.impactDurations.reduce((a, b) => a + b, 0) / t.impactDurations.length;
  }

  getDiscoveryTime(dim: ErrorMetricDimensions): number | undefined {
    return this.timings.get(this.getDimensionKey(dim))?.firstSeen;
  }

  getImpactScore(
    dim: ErrorMetricDimensions,
    weights: { countWeight?: number; durationWeight?: number; severityWeight?: Record<string, number> } = {},
  ): number {
    const count = this.getErrorCount(dim);
    const duration = this.getImpactDuration(dim) || 0;
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const sw = weights.severityWeight?.[dim.severity] ?? severityScores[dim.severity as keyof typeof severityScores] ?? 1;
    const cw = weights.countWeight ?? 1;
    const dw = weights.durationWeight ?? 0.001;
    return (count * cw + duration * dw) * sw;
  }

  aggregateBy(dim: Partial<ErrorMetricDimensions>, groupBy: keyof ErrorMetricDimensions): Map<string, number> {
    const map = new Map<string, number>();
    for (const [k, c] of this.counters) {
      const parsed = this.parseKey(k);
      if (!matches(parsed, dim)) continue;
      const keyVal = parsed[groupBy];
      map.set(keyVal, (map.get(keyVal) || 0) + c);
    }
    return map;
  }

  getFrequency(dim: Partial<ErrorMetricDimensions>, bucketMs: number, totalWindowMs: number): number[] {
    const buckets = Math.ceil(totalWindowMs / bucketMs);
    const arr = Array(buckets).fill(0);
    const now = Date.now();
    for (const e of (this as any).rateCalculator.events as { time: number; dim: ErrorMetricDimensions }[]) {
      if (!matches(e.dim, dim)) continue;
      const diff = now - e.time;
      if (diff < 0 || diff >= totalWindowMs) continue;
      const index = Math.floor(diff / bucketMs);
      const idx = buckets - index - 1;
      arr[idx]++;
    }
    return arr;
  }

  detectSpike(dim: Partial<ErrorMetricDimensions>, timeWindowMs: number, multiplier = 2): boolean {
    const current = this.rateCalculator.getEventCount(dim, timeWindowMs);
    const previous = this.rateCalculator.getEventCount(dim, timeWindowMs, timeWindowMs);
    if (previous === 0) return current > 0;
    return current > previous * multiplier;
  }

  private getDimensionKey(dim: ErrorMetricDimensions): string {
    return `${dim.environment}:${dim.serviceName}:${dim.errorCode}:${dim.severity}`;
  }

  private parseKey(key: string): ErrorMetricDimensions {
    const [environment, serviceName, errorCode, severity] = key.split(':');
    return { environment, serviceName, errorCode, severity };
  }
}
