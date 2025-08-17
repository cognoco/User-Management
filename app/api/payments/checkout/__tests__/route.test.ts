import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { createCheckoutSession, getCustomerByUserId, createOrUpdateCustomer, getStripe } from '@/lib/payments/stripe-enhanced';
import { getServerSession } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/payments/stripe-enhanced');
jest.mock('@/lib/auth');

describe('/api/payments/checkout', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (getCustomerByUserId as jest.Mock).mockResolvedValue(mockCustomer);
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  describe('POST /api/payments/checkout', () => {
    it('should create a checkout session successfully', async () => {
      const mockCheckoutSession = {
        id: 'cs_test',
        url: 'https://checkout.stripe.com/pay/cs_test',
      };

      (createCheckoutSession as jest.Mock).mockResolvedValue(mockCheckoutSession);

      const request = new NextRequest('http://localhost/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_test',
          trialDays: 14,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        sessionId: 'cs_test',
        url: 'https://checkout.stripe.com/pay/cs_test',
      });

      expect(createCheckoutSession).toHaveBeenCalledWith({
        customerId: 'cus_test',
        priceId: 'price_test',
        successUrl: 'http://localhost:3000/settings/subscription?success=true',
        cancelUrl: 'http://localhost:3000/settings/subscription?canceled=true',
        trialDays: 14,
        metadata: {
          userId: 'user_123',
        },
      });
    });

    it('should create customer if not exists', async () => {
      (getCustomerByUserId as jest.Mock).mockResolvedValue(null);
      (createOrUpdateCustomer as jest.Mock).mockResolvedValue(mockCustomer);

      const mockCheckoutSession = {
        id: 'cs_test',
        url: 'https://checkout.stripe.com/pay/cs_test',
      };

      (createCheckoutSession as jest.Mock).mockResolvedValue(mockCheckoutSession);

      const request = new NextRequest('http://localhost/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_test',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(createOrUpdateCustomer).toHaveBeenCalledWith({
        email: 'test@example.com',
        userId: 'user_123',
        name: 'Test User',
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if priceId is missing', async () => {
      const request = new NextRequest('http://localhost/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Price ID is required');
    });

    it('should use custom success and cancel URLs', async () => {
      const mockCheckoutSession = {
        id: 'cs_test',
        url: 'https://checkout.stripe.com/pay/cs_test',
      };

      (createCheckoutSession as jest.Mock).mockResolvedValue(mockCheckoutSession);

      const request = new NextRequest('http://localhost/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_test',
          successUrl: 'http://localhost:3000/custom-success',
          cancelUrl: 'http://localhost:3000/custom-cancel',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          successUrl: 'http://localhost:3000/custom-success',
          cancelUrl: 'http://localhost:3000/custom-cancel',
        })
      );
    });

    it('should handle errors gracefully', async () => {
      (createCheckoutSession as jest.Mock).mockRejectedValue(new Error('Stripe error'));

      const request = new NextRequest('http://localhost/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create checkout session');
    });
  });

  describe('GET /api/payments/checkout', () => {
    it('should retrieve checkout session status', async () => {
      const mockStripe = {
        checkout: {
          sessions: {
            retrieve: jest.fn().mockResolvedValue({
              id: 'cs_test',
              status: 'complete',
              payment_status: 'paid',
              subscription: 'sub_test',
              customer: 'cus_test',
              customer_email: 'test@example.com',
              amount_total: 1999,
              currency: 'usd',
            }),
          },
        },
      };

      (getStripe as jest.Mock).mockReturnValue(mockStripe);

      const request = new NextRequest('http://localhost/api/payments/checkout?sessionId=cs_test');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: 'complete',
        payment_status: 'paid',
        subscription: 'sub_test',
        customer_email: 'test@example.com',
        amount_total: 1999,
        currency: 'usd',
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/payments/checkout?sessionId=cs_test');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if sessionId is missing', async () => {
      const request = new NextRequest('http://localhost/api/payments/checkout');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Session ID is required');
    });

    it('should return 404 if session does not belong to user', async () => {
      const mockStripe = {
        checkout: {
          sessions: {
            retrieve: jest.fn().mockResolvedValue({
              customer: 'cus_different',
            }),
          },
        },
      };

      (getStripe as jest.Mock).mockReturnValue(mockStripe);

      const request = new NextRequest('http://localhost/api/payments/checkout?sessionId=cs_test');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Session not found');
    });

    it('should handle errors gracefully', async () => {
      const mockStripe = {
        checkout: {
          sessions: {
            retrieve: jest.fn().mockRejectedValue(new Error('Stripe error')),
          },
        },
      };

      (getStripe as jest.Mock).mockReturnValue(mockStripe);

      const request = new NextRequest('http://localhost/api/payments/checkout?sessionId=cs_test');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to retrieve checkout session');
    });
  });
});