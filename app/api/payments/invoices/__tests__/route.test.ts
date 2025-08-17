import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { 
  getCustomerInvoices, 
  getInvoice, 
  getInvoicePdfUrl, 
  getCustomerByUserId,
  sendInvoice 
} from '@/lib/payments/stripe-enhanced';
import { getServerSession } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/payments/stripe-enhanced');
jest.mock('@/lib/auth');

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
          },
        },
      ],
    },
    description: 'Monthly subscription',
    period_start: 1234567890,
    period_end: 1234567890,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (getCustomerByUserId as jest.Mock).mockResolvedValue(mockCustomer);
  });

  describe('GET /api/payments/invoices', () => {
    it('should return list of invoices', async () => {
      const mockInvoices = {
        data: [mockInvoice],
        has_more: false,
      };

      (getCustomerInvoices as jest.Mock).mockResolvedValue(mockInvoices);
      (getInvoicePdfUrl as jest.Mock).mockResolvedValue('https://pdf.stripe.com/inv_test.pdf');

      const request = new NextRequest('http://localhost/api/payments/invoices');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoices).toHaveLength(1);
      expect(data.invoices[0]).toMatchObject({
        id: 'inv_test',
        number: 'INV-001',
        status: 'paid',
        amount_due: 1999,
        pdf_url: 'https://pdf.stripe.com/inv_test.pdf',
      });
      expect(data.has_more).toBe(false);
    });

    it('should return specific invoice when invoiceId is provided', async () => {
      (getInvoice as jest.Mock).mockResolvedValue(mockInvoice);
      (getInvoicePdfUrl as jest.Mock).mockResolvedValue('https://pdf.stripe.com/inv_test.pdf');

      const request = new NextRequest('http://localhost/api/payments/invoices?invoiceId=inv_test');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoice).toMatchObject({
        id: 'inv_test',
        number: 'INV-001',
        status: 'paid',
        pdf_url: 'https://pdf.stripe.com/inv_test.pdf',
      });
    });

    it('should handle pagination parameters', async () => {
      const mockInvoices = {
        data: [mockInvoice],
        has_more: true,
      };

      (getCustomerInvoices as jest.Mock).mockResolvedValue(mockInvoices);
      (getInvoicePdfUrl as jest.Mock).mockResolvedValue('https://pdf.stripe.com/inv_test.pdf');

      const request = new NextRequest('http://localhost/api/payments/invoices?limit=5&startingAfter=inv_prev');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(getCustomerInvoices).toHaveBeenCalledWith({
        customerId: 'cus_test',
        limit: 5,
        startingAfter: 'inv_prev',
      });
      expect(data.has_more).toBe(true);
      expect(data.next_cursor).toBe('inv_test');
    });

    it('should return empty list if customer does not exist', async () => {
      (getCustomerByUserId as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/payments/invoices');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoices).toEqual([]);
      expect(data.has_more).toBe(false);
    });

    it('should return 401 if user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/payments/invoices');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if invoice does not belong to user', async () => {
      const wrongCustomerInvoice = { ...mockInvoice, customer: 'cus_different' };
      (getInvoice as jest.Mock).mockResolvedValue(wrongCustomerInvoice);

      const request = new NextRequest('http://localhost/api/payments/invoices?invoiceId=inv_test');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Invoice not found');
    });

    it('should handle errors gracefully', async () => {
      (getCustomerInvoices as jest.Mock).mockRejectedValue(new Error('Stripe error'));

      const request = new NextRequest('http://localhost/api/payments/invoices');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch invoices');
    });
  });

  describe('POST /api/payments/invoices/send', () => {
    beforeEach(() => {
      // Mock dynamic import
      jest.doMock('@/lib/payments/stripe-enhanced', () => ({
        ...jest.requireActual('@/lib/payments/stripe-enhanced'),
        sendInvoice: jest.fn().mockResolvedValue({ id: 'inv_test' }),
      }));
    });

    it('should send invoice successfully', async () => {
      (getInvoice as jest.Mock).mockResolvedValue(mockInvoice);

      const request = new NextRequest('http://localhost/api/payments/invoices/send', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: 'inv_test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: 'Invoice sent successfully',
        invoice_id: 'inv_test',
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/payments/invoices/send', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: 'inv_test',
        }),
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

    it('should return 404 if invoice does not belong to user', async () => {
      const wrongCustomerInvoice = { ...mockInvoice, customer: 'cus_different' };
      (getInvoice as jest.Mock).mockResolvedValue(wrongCustomerInvoice);

      const request = new NextRequest('http://localhost/api/payments/invoices/send', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: 'inv_test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Invoice not found');
    });

    it('should handle errors gracefully', async () => {
      (getInvoice as jest.Mock).mockResolvedValue(mockInvoice);
      
      // Mock the dynamic import to throw an error
      jest.doMock('@/lib/payments/stripe-enhanced', () => ({
        ...jest.requireActual('@/lib/payments/stripe-enhanced'),
        sendInvoice: jest.fn().mockRejectedValue(new Error('Stripe error')),
      }));

      const request = new NextRequest('http://localhost/api/payments/invoices/send', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: 'inv_test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send invoice');
    });
  });
});