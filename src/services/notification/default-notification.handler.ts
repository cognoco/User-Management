/**
 * Default Notification Handler Implementation
 * 
 * This file implements the NotificationHandler interface defined in the core layer.
 * It provides the default implementation for notification handling operations.
 */

import { 
  NotificationHandler
} from '@/core/notification/interfaces';
import { 
  NotificationPayload
} from '@/core/notification/models';
import { logger } from '@/lib/utils/logger';

/**
 * Default implementation of the NotificationHandler interface
 * 
 * This handler provides a basic implementation that can be replaced by host applications
 * with their own notification handling logic (e.g., Firebase, OneSignal, etc.)
 */
export class DefaultNotificationHandler implements NotificationHandler {
  /**
   * Initialize the notification system
   * Host app should implement this to set up their notification infrastructure
   */
  async initialize(): Promise<void> {
    // Check if the browser supports notifications
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return;
    }
    
    // Check if permission is already granted
    if (Notification.permission === 'granted') {
      logger.debug('Notification permission already granted');
    }
  }
  
  /**
   * Request permission to send notifications
   * Returns true if permission is granted, false otherwise
   */
  async requestPermission(): Promise<boolean> {
    // Check if the browser supports notifications
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return false;
    }
    
    // Request permission if not already granted
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return Notification.permission === 'granted';
  }
  
  /**
   * Check if notifications are enabled for this user
   */
  areNotificationsEnabled(): boolean {
    return ('Notification' in window) && Notification.permission === 'granted';
  }
  
  /**
   * Display a notification to the user
   * @param payload The notification content
   */
  async showNotification(payload: NotificationPayload): Promise<boolean> {
    // Check if notifications are enabled
    if (!this.areNotificationsEnabled()) {
      console.warn('Notifications are not enabled');
      return false;
    }
    
    try {
      // Create notification options
      const options: NotificationOptions = {
        body: payload.message,
        icon: '/logo.png', // Default icon
        badge: '/badge.png', // Default badge
        data: payload.data || {},
      };
      
      // Add action button if provided
      if (payload.actionLabel) {
        options.actions = [
          {
            action: 'action',
            title: payload.actionLabel
          }
        ];
      }
      
      // Add mobile-specific options if provided
      if (payload.mobile) {
        if (payload.mobile.badge !== undefined) {
          options.badge = String(payload.mobile.badge);
        }
        
        if (payload.mobile.sound) {
          options.silent = false;
          // Note: Web Notifications API doesn't support custom sounds directly
        } else {
          options.silent = true;
        }
        
        if (payload.mobile.imageUrl) {
          options.image = payload.mobile.imageUrl;
        }
      }
      
      // Create and show the notification
      const notification = new Notification(payload.title, options);
      
      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        
        // Open the action URL if provided
        if (payload.actionUrl) {
          window.open(payload.actionUrl, '_blank');
        }
        
        // Close the notification
        notification.close();
      };
      
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }
  
  /**
   * Associate the current device/browser with a user ID for targeted notifications
   * @param userId The user to associate with this device
   */
  async registerDevice(userId: string): Promise<boolean> {
    try {
      // In a real implementation, this would register the device with a push notification service
      // For this default implementation, we'll just store the user ID in local storage
      localStorage.setItem('notification_user_id', userId);
      
      // In a real implementation, we would also register with a service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        // Check if push manager is available
        if ('pushManager' in registration) {
          // Request push subscription
          try {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              // In a real implementation, this would be the application server key
              applicationServerKey: this.urlBase64ToUint8Array(
                'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
              )
            });
            
            // In a real implementation, this would send the subscription to the server
            logger.debug('Push subscription created', { subscription });
            
            return true;
          } catch (error) {
            console.error('Error subscribing to push notifications:', error);
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error registering device:', error);
      return false;
    }
  }
  
  /**
   * Remove association between user ID and current device/browser
   * @param userId The user to unregister from this device
   */
  async unregisterDevice(userId: string): Promise<boolean> {
    try {
      // In a real implementation, this would unregister the device from a push notification service
      // For this default implementation, we'll just remove the user ID from local storage
      const storedUserId = localStorage.getItem('notification_user_id');
      
      if (storedUserId === userId) {
        localStorage.removeItem('notification_user_id');
      }
      
      // In a real implementation, we would also unregister from the service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        // Check if push manager is available
        if ('pushManager' in registration) {
          const subscription = await registration.pushManager.getSubscription();
          
          if (subscription) {
            // Unsubscribe from push notifications
            await subscription.unsubscribe();
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error unregistering device:', error);
      return false;
    }
  }
  
  /**
   * Helper function to convert a base64 string to a Uint8Array
   * This is needed for the applicationServerKey in push subscriptions
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
}
