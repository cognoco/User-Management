'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// NO external imports - pure React and Next.js only

export default function LoginUltraFastPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get CSRF token
      const csrfRes = await fetch('/api/csrf');
      const { token } = await csrfRes.json();

      // Login
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        body: JSON.stringify({ email, password, rememberMe: false }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error?.message || 'Login failed');
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Inline styles - no CSS imports
  const styles = {
    container: {
      maxWidth: '400px',
      margin: '100px auto',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '20px'
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '15px'
    },
    input: {
      padding: '10px',
      fontSize: '16px',
      border: '1px solid #ccc',
      borderRadius: '4px'
    },
    button: {
      padding: '12px',
      fontSize: '16px',
      backgroundColor: loading ? '#ccc' : '#0070f3',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: loading ? 'not-allowed' : 'pointer'
    },
    error: {
      color: 'red',
      fontSize: '14px'
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Login - Ultra Fast</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          style={styles.input}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Loading...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}