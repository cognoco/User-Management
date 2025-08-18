'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { InvoiceHistory, Invoice } from '@/components/billing/InvoiceHistory';
import { api } from '@/lib/api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { CreditCard, Loader2, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Button } from '@/ui/primitives/button';
import { Badge } from '@/ui/primitives/badge';

interface BillingData {
  customerId: string;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: Date;
    plan: {
      name: string;
      amount: number;
      currency: string;
      interval: string;
    };
  };
  paymentMethod?: {
    type: string;
    last4: string;
    brand: string;
  };
  upcomingInvoice?: {
    amount: number;
    currency: string;
    dueDate: Date;
  };
}

export default function OrganizationBillingPage(): React.ReactElement {
  const params = useParams();
  const organizationId = params.orgId as string;
  
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, [organizationId]);

  const fetchBillingData = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await api.get(`/api/organizations/${organizationId}/billing`);
      setBillingData(response.data);
    } catch (err) {
      setError('Failed to load billing information');
      console.error('Error fetching billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchInvoices = async (params: {
    limit: number;
    starting_after?: string;
    ending_before?: string;
    status?: string;
  }): Promise<{ data: Invoice[]; has_more: boolean }> => {
    try {
      const response = await api.get('/api/payments/invoices', {
        params: {
          ...params,
          organizationId
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      throw new Error('Failed to fetch invoices');
    }
  };

  const handleDownloadInvoice = async (invoiceId: string): Promise<void> => {
    try {
      const response = await api.get(`/api/payments/invoices/${invoiceId}/download`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download invoice:', error);
      throw new Error('Failed to download invoice');
    }
  };

  const handleSendInvoice = async (invoiceId: string, email: string): Promise<void> => {
    try {
      await api.post(`/api/payments/invoices/${invoiceId}/send`, { email });
    } catch (error) {
      console.error('Failed to send invoice:', error);
      throw new Error('Failed to send invoice');
    }
  };

  const handleManageBilling = async (): Promise<void> => {
    try {
      const response = await api.post('/api/payments/portal', {
        organizationId,
        returnUrl: window.location.href
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Failed to create portal session:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      trialing: 'secondary',
      past_due: 'destructive',
      canceled: 'outline',
      incomplete: 'destructive',
    };
    
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing & Invoices
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading billing information...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-6xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Billing & Invoices</h1>
            <p className="text-muted-foreground">Manage your subscription and view billing history</p>
          </div>
          <Button onClick={handleManageBilling}>
            <CreditCard className="h-4 w-4 mr-2" />
            Manage Billing
          </Button>
        </div>

        {/* Subscription Overview */}
        {billingData?.subscription && (
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-medium text-lg">{billingData.subscription.plan.name}</p>
                    {getStatusBadge(billingData.subscription.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(billingData.subscription.plan.amount, billingData.subscription.plan.currency)}
                    /{billingData.subscription.plan.interval}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Next Billing Date</p>
                  <p className="font-medium text-lg mt-1">
                    {new Date(billingData.subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>

                {billingData.paymentMethod && (
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <p className="font-medium text-lg mt-1">
                      {billingData.paymentMethod.brand.toUpperCase()} •••• {billingData.paymentMethod.last4}
                    </p>
                  </div>
                )}
              </div>

              {billingData.upcomingInvoice && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Upcoming Invoice</p>
                      <p className="text-sm text-muted-foreground">
                        Due {new Date(billingData.upcomingInvoice.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatCurrency(billingData.upcomingInvoice.amount, billingData.upcomingInvoice.currency)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Invoice History */}
        <InvoiceHistory
          customerId={billingData?.customerId}
          onFetchInvoices={handleFetchInvoices}
          onDownloadInvoice={handleDownloadInvoice}
          onSendInvoice={handleSendInvoice}
          onRefresh={fetchBillingData}
        />
      </div>
    </div>
  );
}