import { useState, useEffect } from 'react';

/**
 * Hook to manage CSRF token for form submissions
 * Fetches the token from the API and provides it for use in forms
 */
export function useCsrfToken() {
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchToken = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/csrf', {
          method: 'GET',
          credentials: 'include', // Important: include cookies
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch CSRF token: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (mounted && data.csrfToken) {
          setToken(data.csrfToken);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch CSRF token');
          console.error('CSRF token fetch error:', err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchToken();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Refresh the CSRF token
   * Useful after a long period of inactivity
   */
  const refreshToken = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh CSRF token: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.csrfToken) {
        setToken(data.csrfToken);
      }
      
      return data.csrfToken;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh CSRF token');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get headers with CSRF token included
   * Useful for fetch requests
   */
  const getHeaders = (): HeadersInit => {
    return {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
    };
  };

  /**
   * Helper to make a fetch request with CSRF token
   */
  const fetchWithCSRF = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...getHeaders(),
      ...(options.headers || {}),
    };

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Always include cookies
    });
  };

  return {
    token,
    isLoading,
    error,
    refreshToken,
    getHeaders,
    fetchWithCSRF,
  };
}

/**
 * Higher-level hook for form submissions with CSRF protection
 */
export function useCSRFForm<T = any>() {
  const { token, getHeaders, fetchWithCSRF } = useCsrfToken();

  /**
   * Submit form data with CSRF protection
   */
  const submitForm = async (url: string, data: T, method: string = 'POST') => {
    return fetchWithCSRF(url, {
      method,
      body: JSON.stringify(data),
    });
  };

  return {
    csrfToken: token,
    submitForm,
    getHeaders,
  };
}