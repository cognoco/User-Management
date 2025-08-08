// Client-only CSRF initialization utilities without importing axios

let csrfToken: string | null = null;
let csrfInitializationPromise: Promise<void> | null = null;
let csrfFetchStatus: 'idle' | 'pending' | 'success' | 'error' = 'idle';

async function fetchAndStoreCsrfToken(): Promise<void> {
  if (typeof window === 'undefined') return;
  csrfFetchStatus = 'pending';
  const response = await fetch('/api/csrf');
  if (!response.ok) throw new Error(`Failed to fetch CSRF token: ${response.status}`);
  const data = await response.json();
  csrfToken = data.csrfToken ?? null;
  csrfFetchStatus = csrfToken ? 'success' : 'error';
  if (!csrfToken) throw new Error('CSRF token missing');
}

export function initializeCsrf(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (csrfFetchStatus === 'idle') {
    csrfInitializationPromise = fetchAndStoreCsrfToken().catch(() => {});
    return csrfInitializationPromise;
  }
  if (csrfFetchStatus === 'pending' && csrfInitializationPromise) return csrfInitializationPromise;
  return Promise.resolve();
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

