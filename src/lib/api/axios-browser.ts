// Minimal axios-like wrapper for browser to avoid Node form-data dependency
export const api = {
  async get(url: string, init?: RequestInit) {
    const res = await fetch(url, { ...init, method: 'GET', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
    return wrap(res);
  },
  async post(url: string, body?: any, init?: RequestInit) {
    const res = await fetch(url, { ...init, method: 'POST', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, body: JSON.stringify(body) });
    return wrap(res);
  },
  async put(url: string, body?: any, init?: RequestInit) {
    const res = await fetch(url, { ...init, method: 'PUT', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, body: JSON.stringify(body) });
    return wrap(res);
  },
  async delete(url: string, init?: RequestInit) {
    const res = await fetch(url, { ...init, method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
    return wrap(res);
  },
};

function wrap(res: Response) {
  return {
    status: res.status,
    async json() { return res.json(); },
    async text() { return res.text(); },
    get ok() { return res.ok; },
    get headers() { return res.headers; },
    config: {},
  } as any;
}

export default api;

