import { clientConfig } from '@/core/config/client-config';
import { initializeCsrf, getCsrfToken } from './csrf';

const { env } = clientConfig;

// In the browser, avoid importing axios (brings Node FormData/asynckit). Use fetch wrapper.
function createBrowserApi() {
  const baseURL = env.apiBaseUrl;
  const withBase = (url: string) => (url.startsWith('http') ? url : `${baseURL}${url}`);
  const commonHeaders = { 'Content-Type': 'application/json' } as Record<string, string>;
  const attachCsrf = (init: RequestInit, method?: string) => {
    if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const token = getCsrfToken();
      if (token) {
        (init.headers as any) = { ...(init.headers || {}), 'X-CSRF-Token': token };
      }
    }
  };
  const wrap = async (res: Response) => ({
    status: res.status,
    ok: res.ok,
    headers: res.headers,
    data: await res.clone().json().catch(async () => await res.text()),
    config: {},
  });
  const api = {
    async get(url: string, init?: RequestInit) {
      const res = await fetch(withBase(url), { ...(init || {}), method: 'GET', headers: { ...commonHeaders, ...(init?.headers || {}) } });
      return wrap(res) as any;
    },
    async post(url: string, data?: any, init?: RequestInit) {
      const req: RequestInit = { ...(init || {}), method: 'POST', headers: { ...commonHeaders, ...(init?.headers || {}) }, body: data != null ? JSON.stringify(data) : undefined };
      attachCsrf(req, 'POST');
      const res = await fetch(withBase(url), req);
      return wrap(res) as any;
    },
    async put(url: string, data?: any, init?: RequestInit) {
      const req: RequestInit = { ...(init || {}), method: 'PUT', headers: { ...commonHeaders, ...(init?.headers || {}) }, body: data != null ? JSON.stringify(data) : undefined };
      attachCsrf(req, 'PUT');
      const res = await fetch(withBase(url), req);
      return wrap(res) as any;
    },
    async delete(url: string, init?: RequestInit) {
      const req: RequestInit = { ...(init || {}), method: 'DELETE', headers: { ...commonHeaders, ...(init?.headers || {}) } };
      attachCsrf(req, 'DELETE');
      const res = await fetch(withBase(url), req);
      return wrap(res) as any;
    },
    defaults: { baseURL },
    interceptors: {},
  } as any;
  // prime CSRF in background
  if (typeof window !== 'undefined') initializeCsrf().catch(() => {});
  return api;
}

async function createServerApi() {
  const axios = (await import('axios')).default;
  const instance = axios.create({
    baseURL: env.apiBaseUrl,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
    timeout: env.apiTimeout,
  });
  return instance as any;
}

export const api: any = typeof window === 'undefined' ? (awaitProxyServerApi()) : createBrowserApi();

function awaitProxyServerApi() {
  // Lazy proxy to avoid top-level await
  let cached: any;
  const handler: ProxyHandler<any> = {
    get(_, prop) {
      return async (...args: any[]) => {
        if (!cached) cached = await createServerApi();
        return (cached as any)[prop](...args);
      };
    },
  };
  return new Proxy({}, handler);
}

export default api;
