import { useCsrfService } from '@/ui/headless/csrf/CsrfProvider';
import { useState, useEffect } from 'react';

export function useCsrf() {
  const csrfService = useCsrfService();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await csrfService.createToken();
      setToken(result.token?.token ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch CSRF token';
      setError(message);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const validateToken = (t: string) => token === t;

  useEffect(() => {
    fetchToken();
  }, []);

  return {
    token,
    loading,
    error,
    fetchToken,
    validateToken
  };
}
