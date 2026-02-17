'use client';

import { useEffect, useState, useRef } from 'react';
import { usePreferencesStore } from '@/lib/stores/preferences.store';

export interface ConsentManagementProps {
  render: (props: {
    marketing: boolean;
    setMarketing: (val: boolean) => void;
    isLoading: boolean;
    error: string | null;
    submitted: boolean;
    handleSave: () => Promise<void>;
  }) => React.ReactNode;
}

export function ConsentManagement({ render }: ConsentManagementProps) {
  const { preferences, fetchPreferences, updatePreferences, isLoading, error } = usePreferencesStore();
  const [marketing, setMarketingState] = useState(false);
  const marketingRef = useRef(marketing);
  const setMarketing = (val: boolean) => {
    marketingRef.current = val;
    setMarketingState(val);
  };
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!preferences) fetchPreferences();
  }, [preferences, fetchPreferences]);


  useEffect(() => {
    if (preferences) {
      setMarketing(!!preferences.notifications?.marketing);
    }
  }, [preferences]);

  const handleSave = async () => {
    setSubmitted(false);
    await updatePreferences({
      notifications: {
        email: (preferences?.notifications as any)?.email ?? true,
        push: (preferences?.notifications as any)?.push ?? true,
        marketing: marketingRef.current,
      },
    } as any);
    setSubmitted(true);
  };

  return (
    <>{render({ marketing, setMarketing, isLoading, error, submitted, handleSave })}</>
  );
}
