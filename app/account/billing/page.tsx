'use client';
import { SubscriptionManager } from '@/ui/styled/subscription/SubscriptionManager';
import { PlanSelector } from '@/ui/styled/subscription/PlanSelector';
import { BillingForm } from '@/ui/styled/subscription/BillingForm';
import { InvoiceHistory, Invoice } from '@/components/billing/InvoiceHistory';
import { api } from '@/lib/api/axios';

export default function BillingPage(): JSX.Element {
  const handleFetchInvoices = async (params: {
    limit: number;
    starting_after?: string;
    ending_before?: string;
    status?: string;
  }): Promise<{ data: Invoice[]; has_more: boolean }> => {
    try {
      const response = await api.get('/api/payments/invoices', { params });
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

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-6xl">
      <h1 className="text-2xl font-bold">Subscription Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <div className="bg-card rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Current Subscription</h2>
            <SubscriptionManager />
          </div>

          <div className="bg-card rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
            <PlanSelector />
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-card rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Billing Information</h2>
            <BillingForm />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <InvoiceHistory
          onFetchInvoices={handleFetchInvoices}
          onDownloadInvoice={handleDownloadInvoice}
          onSendInvoice={handleSendInvoice}
        />
      </div>
    </div>
  );
}
