import { api } from './axios';
import { detectNetworkStatus } from '../offline/network-detector';
import { queueRequest, processQueue, setRequestExecutor } from '../offline/request-queue';

export interface RequestOptions extends Omit<RequestInit, 'body' | 'priority'> {
  body?: any;
  /** queue request when offline */
  queueIfOffline?: boolean;
  /** priority for queued request (0=low, 1=normal, 2=high) */
  priority?: number;
  /** dependent request ids */
  dependencies?: string[];
}

export class OfflineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineError';
  }
}

function isNetworkError(error: any): boolean {
  return (
    error &&
    !error.response &&
    (error.code === 'NETWORK_ERROR' || /network/i.test(error.message))
  );
}

function enhanceApiError(error: any, meta: { endpoint: string; options: RequestOptions }) {
  if (error && typeof error === 'object') {
    (error as any).endpoint = meta.endpoint;
    (error as any).options = meta.options;
  }
  return error;
}

async function performRequest<T>(endpoint: string, options: RequestOptions): Promise<T> {
  const axiosOptions = {
    url: endpoint,
    method: options.method ?? 'GET',
    data: options.body,
    headers: options.headers,
    params: (options as any).params,
  } as any;

  const response = await api.request<T>(axiosOptions);
  return response.data;
}

setRequestExecutor(performRequest);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processQueue().catch(() => {});
  });
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions): Promise<T> {
  const isOnline = await detectNetworkStatus();

  if (!isOnline) {
    if (options.queueIfOffline) {
      await queueRequest(endpoint, options);
      throw new OfflineError('Request queued for when connectivity returns');
    }
    throw new OfflineError('Cannot complete request while offline');
  }

  try {
    return await performRequest<T>(endpoint, options);
  } catch (error: any) {
    if (isNetworkError(error) && options.queueIfOffline) {
      await queueRequest(endpoint, options);
      throw new OfflineError('Request failed due to network issue, queued for retry');
    }

    throw enhanceApiError(error, { endpoint, options });
  }
}
