'use client';

import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CompanyDomain } from '@/types/company';
import { api } from '@/lib/api/axios';

const domainSchema = z.object({
  domain: z.string().min(1).regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/),
});

type FormValues = z.infer<typeof domainSchema>;

export interface DomainManagementProps {
  companyId: string;
  onVerificationChange?: () => void;
  render: (props: {
    domains: CompanyDomain[];
    form: ReturnType<typeof useForm<FormValues>>;
    isLoading: boolean;
    error: string | null;
    success: string | null;
    handleAddDomain: () => Promise<void>;
    handleDeleteDomain: (id: string) => Promise<void>;
    handleSetPrimary: (id: string) => Promise<void>;
    handleVerifyDomain: (domain: CompanyDomain) => void;
  }) => React.ReactNode;
}

export function DomainManagement({ companyId, onVerificationChange, render }: DomainManagementProps): React.ReactElement => {
  const [domains, setDomains] = useState<CompanyDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: { domain: '' },
  });

  const fetchDomains = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/company/domains');
      setDomains(response.data.domains || []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDomains(); }, []);

  const handleAddDomain = async (): Promise<void> => {
    const values = form.getValues();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.post('/api/company/domains', { domain: values.domain, companyId });
      form.reset();
      setDomains([...domains, response.data]);
      setSuccess('Domain added');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDomain = async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await api.delete(`/api/company/domains/${id}`);
      setDomains(domains.filter(d => d.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPrimary = async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await api.patch(`/api/company/domains/${id}`, { is_primary: true });
      setDomains(domains.map(d => ({ ...d, is_primary: d.id === id })));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyDomain = (): void => {
    onVerificationChange?.();
  };

  return (
    <>{render({ domains, form, isLoading, error, success, handleAddDomain, handleDeleteDomain, handleSetPrimary, handleVerifyDomain })}</>
  );
}
