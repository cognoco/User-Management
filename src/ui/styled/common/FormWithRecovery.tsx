'use client';

import React, { useState, useId } from 'react';
import { ErrorBoundary, DefaultErrorFallback } from './ErrorBoundary';

/**
 * FormWithRecovery Component - Enhanced for React 19
 * A form component that gracefully handles submission errors with automatic recovery
 */
interface FormWithRecoveryProps {
  onSubmit: (data: { name: string }) => Promise<void>;
  children?: React.ReactNode;
  title?: string;
}

export const FormWithRecovery: React.FC<FormWithRecoveryProps> = ({ onSubmit, children, title = 'Form With Error Recovery' }): JSX.Element => {
  const [formData, setFormData] = useState({ name: '' });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Use useId for stable identifiers - new in React
  const nameInputId = useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Handle success (e.g., clear form, show message)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ErrorBoundary fallback={DefaultErrorFallback}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            Error: {error} <button type="submit" className="underline">Retry</button>
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor={nameInputId} className="block text-sm font-medium">
            Name:
          </label>
          <input
            type="text"
            id={nameInputId}
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded-md"
          />
        </div>
        {children}
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </ErrorBoundary>
  );
};

export default FormWithRecovery; 