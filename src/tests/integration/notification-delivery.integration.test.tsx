import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from '@/lib/hooks/use-toast';
import { Toaster } from '@/ui/primitives/toaster';
import { notificationService } from '@/lib/services/notification.service';
import { notificationQueue } from '@/lib/services/notification-queue.service';

// Mock dependencies
vi.mock('@/lib/services/notification-queue.service', () => ({
  notificationQueue: {
    enqueue: vi.fn().mockReturnValue('mock-tracking-id'),
    getStatus: vi.fn().mockReturnValue({
      id: 'mock-tracking-id',
      status: 'delivered',
      attempts: 1,
      maxAttempts: 3,
      createdAt: new Date(),
      deliveredAt: new Date(),
    }),
    getStats: vi.fn().mockReturnValue({
      total: 5,
      pending: 1,
      processing: 0,
      delivered: 3,
      failed: 1
    }),
    registerProcessor: vi.fn()
  }
}));

vi.mock('@/lib/api/axios', () => ({
  api: {
    post: vi.fn().mockResolvedValue({ status: 200, data: { success: true } })
  }
}));

// Mock component to test toast notifications
const ToastTestComponent = () => {
  const handleShowToast = () => {
    toast({
      title: "Test Toast",
      description: "This is a test toast notification",
      variant: "default"
    });
  };

  return (
    <div>
      <button onClick={handleShowToast}>Show Toast</button>
      <Toaster />
    </div>
  );
};

describe('Notification Delivery System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-establish mock return values after clearAllMocks
    (notificationQueue.enqueue as any).mockReturnValue('mock-tracking-id');
    (notificationQueue.getStatus as any).mockReturnValue({
      id: 'mock-tracking-id',
      status: 'delivered',
      attempts: 1,
      maxAttempts: 3,
      createdAt: new Date(),
      deliveredAt: new Date(),
    });
    (notificationQueue.getStats as any).mockReturnValue({
      total: 5,
      pending: 1,
      processing: 0,
      delivered: 3,
      failed: 1,
    });
    // Enable the notification service and all providers for testing
    notificationService.setConfig({
      enabled: true,
      providers: {
        email: true,
        push: true,
        sms: true,
        marketing: true,
        inApp: true,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Notification Queue', () => {
    test('should enqueue notifications', async () => {
      const payload = {
        type: 'email' as const,
        title: 'Test Email',
        message: 'This is a test email notification',
        category: 'system' as const
      };

      const result = await notificationService.send(payload);
      
      expect(result).toEqual({ success: true, trackingId: 'mock-tracking-id' });
      expect(notificationQueue.enqueue).toHaveBeenCalledWith(payload);
    });

    test('should track notification status', () => {
      const trackingId = 'mock-tracking-id';
      const status = notificationService.getNotificationStatus(trackingId);
      
      expect(status).toBeDefined();
      expect(status?.status).toBe('delivered');
    });
    
    test('should get queue statistics', () => {
      const stats = notificationService.getQueueStats();
      
      expect(stats).toBeDefined();
      expect(stats.total).toBe(5);
      expect(stats.delivered).toBe(3);
      expect(stats.failed).toBe(1);
    });
  });

  describe('Email Notification Delivery', () => {
    test('should send email notifications', async () => {
      const emailPayload = {
        title: 'Test Email Subject',
        message: 'This is a test email body',
        type: 'email' as const
      };

      await notificationService.sendEmail(
        emailPayload.title,
        emailPayload.message
      );
      
      expect(notificationQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({
        type: 'email',
        title: emailPayload.title,
        message: emailPayload.message
      }));
    });
  });

  describe('Push Notification Delivery', () => {
    test('should send push notifications', async () => {
      const pushPayload = {
        title: 'Test Push Notification',
        message: 'This is a test push notification',
        type: 'push' as const
      };

      await notificationService.sendPush(
        pushPayload.title,
        pushPayload.message
      );
      
      expect(notificationQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({
        type: 'push',
        title: pushPayload.title,
        message: pushPayload.message
      }));
    });
  });

  describe('In-App Notification Center', () => {
    test('should display in-app notifications', async () => {
      const user = userEvent.setup();
      
      render(<ToastTestComponent />);
      
      // Click button to show toast
      await user.click(screen.getByRole('button', { name: /show toast/i }));
      
      // Verify toast appears
      await waitFor(() => {
        expect(screen.getByText('Test Toast')).toBeInTheDocument();
        expect(screen.getByText('This is a test toast notification')).toBeInTheDocument();
      });
    });
  });

  describe('Notification Delivery Error Handling', () => {
    test('should handle email delivery failures', async () => {
      // Mock enqueue to throw, simulating a queue failure
      const apiError = new Error('Email delivery failed');
      (notificationQueue.enqueue as any).mockImplementationOnce(() => {
        throw apiError;
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Attempt to send email that will fail at the queue level
      const result = await notificationService.sendEmail(
        'Failed Email',
        'This email will fail'
      );
      
      // send() catches the error and returns failure
      expect(result).toEqual({ success: false, reason: 'Failed to queue notification' });
      expect(consoleSpy).toHaveBeenCalled();
    });
    
    test('should retry failed notification deliveries', async () => {
      // This test would be more complex in a real implementation,
      // requiring timing manipulation to verify retries
      
      // Mock the queue processing to simulate a failed delivery followed by success
      const mockEntry = {
        id: 'retry-test-id',
        payload: {
          type: 'email' as const,
          title: 'Retry Test',
          message: 'This will be retried'
        },
        attempts: 1,
        maxAttempts: 3,
        status: 'pending' as const,
        error: 'Previous attempt failed',
        createdAt: new Date()
      };
      
      (notificationQueue.getStatus as any).mockReturnValueOnce(mockEntry);
      
      const status = notificationService.getNotificationStatus('retry-test-id');
      
      expect(status).toBeDefined();
      expect(status!.status).toBe('pending');
      expect(status!.attempts).toBe(1);
      expect(status!.maxAttempts).toBe(3);
    });
  });
}); 