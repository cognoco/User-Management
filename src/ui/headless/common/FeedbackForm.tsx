import { useState } from 'react';
import { feedbackCategoryEnum } from '@/types/feedback';

/**
 * Headless Feedback Form
 *
 * Handles feedback submission logic without rendering any UI.
 */
export interface FeedbackFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  render: (props: {
    category: string;
    setCategory: (val: string) => void;
    message: string;
    setMessage: (val: string) => void;
    screenshot: File | null;
    setScreenshot: (file: File | null) => void;
    screenshotPreview: string | null;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    loading: boolean;
    error: string;
    success: boolean;
  }) => React.ReactNode;
}


export function FeedbackForm({ onSuccess, onError, render }: FeedbackFormProps) {
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!category || !message.trim()) {
      setError('invalid');
      return;
    }
    setLoading(true);
    let screenshotUrl: string | null = null;
    try {
      if (screenshot) {
        // upload screenshot via storage endpoint
        const form = new FormData();
        form.append('file', screenshot);
        const uploadResp = await fetch('/api/storage/upload', { method: 'POST', body: form });
        const uploadJson = await uploadResp.json();
        if (!uploadResp.ok) throw new Error(uploadJson.error || 'Upload failed');
        screenshotUrl = uploadJson.url;
      }
      const resp = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message, screenshotUrl }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Submit failed');
      setSuccess(true);
      setCategory('');
      setMessage('');
      setScreenshot(null);
      setScreenshotPreview(null);
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.message || 'error submitting feedback';
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>{render({
      category,
      setCategory,
      message,
      setMessage,
      screenshot,
      setScreenshot: (file) => {
        setScreenshot(file);
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => setScreenshotPreview(ev.target?.result as string);
          reader.readAsDataURL(file);
        } else {
          setScreenshotPreview(null);
        }
      },
      screenshotPreview,
      handleSubmit,
      loading,
      error,
      success
    })}</>
  );
}

export default FeedbackForm;
