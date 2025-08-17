import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Button } from '@/ui/primitives/button';
import FeedbackFormHeadless from '@/ui/headless/common/FeedbackForm';
import { feedbackCategoryEnum } from '@/types/feedback';

interface FeedbackFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const CATEGORY_OPTIONS = feedbackCategoryEnum.options;

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSuccess, onError }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <FeedbackFormHeadless
      onSuccess={onSuccess}
      onError={onError}
      render={({
        category,
        setCategory,
        message,
        setMessage,
        setScreenshot,
        screenshotPreview,
        handleSubmit,
        loading,
        error,
        success
      }) => (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 bg-white dark:bg-gray-900 rounded shadow" aria-label={t('submit feedback')}>
          <h2 className="text-xl font-bold mb-4">{t('submit feedback')}</h2>
          {error && <div role="alert" className="text-red-600 mb-2">{error}</div>}
          {success && <div role="status" className="text-green-600 mb-2">{t('thank you for your feedback')}</div>}
          <div className="mb-4">
            <label htmlFor="feedback-type" className="block mb-1">{t('feedback type')}</label>
            <select
              id="feedback-type"
              name="category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border rounded px-2 py-1"
              aria-required="true"
            >
              <option value="">{t('select type')}</option>
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{t(opt)}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="feedback-message" className="block mb-1">{t('message')}</label>
            <textarea
              id="feedback-message"
              name="message"
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full border rounded px-2 py-1"
              aria-required="true"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="feedback-screenshot" className="block mb-1">{t('attach screenshot (optional)')}</label>
            <input
              id="feedback-screenshot"
              name="screenshot"
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={e => setScreenshot(e.target.files?.[0] || null)}
              className="w-full"
            />
            {screenshotPreview && (
              <Image src={screenshotPreview} alt={t('screenshot preview')} width={160} height={160} className="mt-2 max-h-40 rounded border" />
            )}
          </div>
          <Button type="submit" disabled={loading} aria-busy={loading} className="bg-blue-600 text-white px-4 py-1 rounded">
            {loading ? t('submitting...') : t('submit feedback')}
          </Button>
        </form>
      )}
    />
  );
};

export default FeedbackForm;
