import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  number?: string;
  status: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  created: number;
  due_date?: number;
  paid_at?: number;
  pdf_url?: string;
  hosted_invoice_url?: string;
  description?: string;
  period_start?: number;
  period_end?: number;
}

interface InvoiceHistoryProps {
  className?: string;
}

export const InvoiceHistory: React.FC<InvoiceHistoryProps> = ({ className }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchInvoices = async (cursor?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '10',
        ...(cursor && { startingAfter: cursor }),
      });
      
      const response = await fetch(`/api/payments/invoices?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      
      const data = await response.json();
      
      if (cursor) {
        setInvoices(prev => [...prev, ...data.invoices]);
      } else {
        setInvoices(data.invoices);
      }
      
      setHasMore(data.has_more);
      setNextCursor(data.next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDownloadPDF = async (invoiceId: string, pdfUrl?: string) => {
    if (!pdfUrl) {
      alert('PDF not available for this invoice');
      return;
    }
    
    // Open PDF in new tab
    window.open(pdfUrl, '_blank');
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch('/api/payments/invoices/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send invoice');
      }
      
      alert('Invoice sent successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send invoice');
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      paid: 'bg-green-100 text-green-800',
      open: 'bg-blue-100 text-blue-800',
      draft: 'bg-gray-100 text-gray-800',
      void: 'bg-red-100 text-red-800',
      uncollectible: 'bg-yellow-100 text-yellow-800',
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading && invoices.length === 0) {
    return (
      <div className={`${className || ''} p-6`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className || ''} p-6`}>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading invoices: {error}
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className={`${className || ''} p-6`}>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
          <p className="mt-1 text-sm text-gray-500">You don't have any invoices yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className || ''}`}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold text-gray-900">Invoice History</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all your invoices including their status and amounts.
            </p>
          </div>
        </div>
        
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Invoice
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Amount
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{invoice.number || invoice.id}</div>
                            {invoice.description && (
                              <div className="text-gray-500">{invoice.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div>
                            <div>{format(invoice.created * 1000, 'MMM d, yyyy')}</div>
                            {invoice.period_start && invoice.period_end && (
                              <div className="text-xs text-gray-400">
                                {format(invoice.period_start * 1000, 'MMM d')} - {format(invoice.period_end * 1000, 'MMM d, yyyy')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {formatAmount(invoice.amount_due, invoice.currency)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex justify-end gap-2">
                            {invoice.hosted_invoice_url && (
                              <a
                                href={invoice.hosted_invoice_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                View
                              </a>
                            )}
                            {invoice.pdf_url && (
                              <button
                                onClick={() => handleDownloadPDF(invoice.id, invoice.pdf_url)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                PDF
                              </button>
                            )}
                            {invoice.status === 'open' && (
                              <button
                                onClick={() => handleSendInvoice(invoice.id)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Send
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {hasMore && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => fetchInvoices(nextCursor!)}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};