import { describe, it, expect, beforeEach } from 'vitest';
import {
  offlineQueue,
  processQueue,
  clearQueue,
} from '../offline-queue.service';

describe('OfflineQueueService', () => {
  beforeEach(() => {
    clearQueue();
  });

  it('enqueues and processes requests in priority order', async () => {
    const results: number[] = [];
    offlineQueue.enqueue(async () => { results.push(1); }, 0);
    offlineQueue.enqueue(async () => { results.push(2); }, 2);
    offlineQueue.enqueue(async () => { results.push(3); }, 1);

    await processQueue();

    expect(results).toEqual([2, 3, 1]);
  });

  it('allows selective cancellation', async () => {
    const results: number[] = [];
    const id = offlineQueue.enqueue(async () => { results.push(1); });
    offlineQueue.cancel(id);
    await processQueue();
    expect(results).toEqual([]);
    expect(offlineQueue.getItems().length).toBe(0);
  });
});
