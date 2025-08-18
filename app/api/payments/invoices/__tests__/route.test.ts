import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before imports
vi.mock('@/lib/payments/stripe-enhanced', () => ({
  getCustomerInvoices: vi.fn(),
  getInvoice: vi.fn(),
  getInvoicePdfUrl: vi.fn(),
  getCustomerByUserId: vi.fn(),
  sendInvoice: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
}));

// Import after mocks
import { GET, POST } from '../route';
import { 
  getCustomerInvoices, 
  getInvoice, 
  getInvoicePdfUrl, 
  getCustomerByUserId,
  sendInvoice 
} from '@/lib/payments/stripe-enhanced';
import { getServerSession } from '@/lib/auth';

describe('/api/payments/invoices', () => {
  const mockSession = {
    user: {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  const mockCustomer = {
    id: 'cus_test',
    email: 'test@example.com',
  };

  const mockInvoice = {
    id: 'inv_test',
    number: 'INV-001',
    status: 'paid',
    amount_due: 1999,
    amount_paid: 1999,
    currency: 'usd',
    created: 1234567890,
    due_date: 1234567890,
    status_transitions: {
      paid_at: 1234567890,
    },
    hosted_invoice_url: 'https://invoice.stripe.com/inv_test',
    customer: 'cus_test',
    lines: {
      data: [
        {
          description: 'Premium Plan',
          amount: 1999,
          quantity: 1,
          price: {
            id: 'price_test',
            nickname: 'Premium',
          },
        },
      ],
    },
    subscription: 'sub_test',
    period_start: 1234567890,
    period_end: 1234567890,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getCustomerByUserId).mockResolvedValue(mockCustomer);
  });

  describe('GET /api/payments/invoices', () => {
    it('should list invoices with pagination', async () => {
      const mockInvoices = {
        data: [mockInvoice],
        has_more: true,
      };

      vi.mocked(getCustomerInvoices).mockResolvedValue(mockInvoices);

      const request = new NextRequest('http://localhost/api/payments/invoices?limit=10');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoices).toHaveLength(1);
      expect(data.has_more).toBe(true);
      expect(data.invoices[0]).toMatchObject({
        id: 'inv_test',
        number: 'INV-001',
        status: 'paid',
        amount_due: 1999,
      });

      expect(getCustomerInvoices).toHaveBeenCalledWith('cus_test', {
        limit: 10,
      });
    });

    it('should retrieve single invoice by ID', async () => {
      vi.mocked(getInvoice).mockResolvedValue(mockInvoice);

      const request = new NextRequest('http://localhost/api/payments/invoices?invoiceId=inv_test');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: 'inv_test',
        number: 'INV-001',
        status: 'paid',
      });

      expect(getInvoice).toHaveBeenCalledWith('inv_test');
    });

    it('should get invoice PDF URL', async () => {
      vi.mocked(getInvoicePdfUrl).mockResolvedValue('https://invoice.stripe.com/pdf/inv_test');

      const request = new NextRequest('http://localhost/api/payments/invoices?invoiceId=inv_test&pdf=true');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pdf_url).toBe('https://invoice.stripe.com/pdf/inv_test');
    });

    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/payments/invoices');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return empty array if no customer exists', async () => {
      vi.mocked(getCustomerByUserId).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/payments/invoices');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoices).toEqual([]);
      expect(data.has_more).toBe(false);
    });

    it('should handle pagination with startingAfter', async () => {
      const mockInvoices = {
        data: [mockInvoice],
        has_more: false,
      };

      vi.mocked(getCustomerInvoices).mockResolvedValue(mockInvoices);

      const request = new NextRequest('http://localhost/api/payments/invoices?startingAfter=inv_prev');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(getCustomerInvoices).toHaveBeenCalledWith('cus_test', {
        limit: 10,
        starting_after: 'inv_prev',
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(getCustomerInvoices).mockRejectedValue(new Error('Stripe error'));

      const request = new NextRequest('http://localhost/api/payments/invoices');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch invoices');
    });
  });

  describe('POST /api/payments/invoices/send', () => {
    it('should send invoice successfully', async () => {
      const sentInvoice = { ...mockInvoice, status: 'sent' };
      vi.mocked(sendInvoice).mockResolvedValue(sentInvoice);

      const request = new NextRequest('http://localhost/api/payments/invoices/send', {
        method: 'POST',
        body: JSON.stringify({ invoiceId: 'inv_test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.invoice).toMatchObject({
        id: 'inv_test',
        status: 'sent',
      });

      expect(sendInvoice).toHaveBeenCalledWith('inv_test');
    });

    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/payments/invoices/send', {
        method: 'POST',
        body: JSON.stringify({ invoiceId: 'inv_test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if invoiceId is missing', async () => {
      const request = new NextRequest('http://localhost/api/payments/invoices/send', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invoice ID is required');
    });

    it('should validate invoice ownership', async () => {
      vi.mocked(getInvoice).mockResolvedValue({
        ...mockInvoice,
        customer: 'cus_different',
      });

      const request = new NextRequest('http://localhost/api/payments/invoices/send', {
        method: 'POST',
        body: JSON.stringify({ invoiceId: 'inv_test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Invoice does not belong to this user');
    });

    it('should handle send errors gracefully', async () => {
      vi.mocked(getInvoice).mockResolvedValue(mockInvoice);
      vi.mocked(sendInvoice).mockRejectedValue(new Error('Failed to send'));

      const request = new NextRequest('http://localhost/api/payments/invoices/send', {
        method: 'POST',
        body: JSON.stringify({ invoiceId: 'inv_test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send invoice');
    });
  });
});