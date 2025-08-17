import React from 'react';
import { useState } from 'react';
import { supabase } from '@/lib/database/supabase';

/**
 * @returns {React.ReactElement}
 */
export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  /**
   * @returns {boolean}
   */
  const validateInput = () => {
    // Email validation using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Password validation (minimum 6 characters)
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!validateInput()) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      setMessage('Signed in successfully!');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!validateInput()) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      setMessage('Check your email for the confirmation link!');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Authentication</h2>
      
      <form>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="button-group">
          <button 
            onClick={handleSignIn}
            disabled={loading}
            className="button primary"
          >
            {loading ? 'Loading...' : 'Sign In'}
          </button>
          
          <button 
            onClick={handleSignUp}
            disabled={loading}
            className="button secondary"
          >
            {loading ? 'Loading...' : 'Sign Up'}
          </button>
        </div>
      </form>
      
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}
      
      <style jsx>{`
        .auth-container {
          max-width: 400px;
          margin: 0 auto;
          padding: 2rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        
        input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        
        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        
        .button {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .primary {
          background-color: #3b82f6;
          color: white;
        }
        
        .secondary {
          background-color: #e5e7eb;
          color: #1f2937;
        }
        
        .error-message {
          margin-top: 1rem;
          padding: 0.75rem;
          background-color: #fee2e2;
          color: #b91c1c;
          border-radius: 4px;
        }
        
        .success-message {
          margin-top: 1rem;
          padding: 0.75rem;
          background-color: #d1fae5;
          color: #065f46;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
} 