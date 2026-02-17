import { notificationService } from './notification.service';
import { usePreferencesStore } from '@/lib/stores/preferences.store';

/**
 * Service for managing notification preferences.
 * This service handles synchronizing user preferences with the notification service.
 */
class NotificationPreferencesService {
  /**
   * Initializes notification preferences from the store and applies them to the notification service.
   * Call this during application initialization or when a user logs in.
   */
  async initializeFromStore(): Promise<void> {
    try {
      const preferences = usePreferencesStore.getState().preferences;
      if (!preferences) {
        // If no preferences in store, try to fetch them
        await usePreferencesStore.getState().fetchPreferences();
        const updatedPreferences = usePreferencesStore.getState().preferences;
        
        if (updatedPreferences) {
          // Apply preferences to notification service
          this.applyPreferencesToService(updatedPreferences.notifications);
        }
      } else {
        // Apply existing preferences to notification service
        this.applyPreferencesToService(preferences.notifications);
      }
    } catch (error) {
      console.error('Failed to initialize notification preferences:', error);
    }
  }

  /**
   * Updates notification preferences.
   * 
   * @param preferences The notification preferences to update
   * @returns True if successful, false otherwise
   */
  async updatePreferences(preferences: {
    email?: boolean;
    push?: boolean;
    marketing?: boolean;
  }): Promise<boolean> {
    try {
      // Update in store
      const result = await usePreferencesStore.getState().updatePreferences({
        notifications: {
          email: preferences.email ?? false,
          push: preferences.push ?? false,
          marketing: preferences.marketing ?? false,
        }
      });

      // Apply to notification service
      if (result) {
        this.applyPreferencesToService(preferences);
      }

      return result;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      return false;
    }
  }

  /**
   * Applies notification preferences to the notification service.
   * 
   * @param preferences The notification preferences to apply
   */
  private applyPreferencesToService(preferences: {
    email?: boolean;
    push?: boolean;
    marketing?: boolean;
  } = {}): void {
    notificationService.setUserPreferences({
      notifications: {
        email: preferences.email ?? true, // Default to true if undefined
        push: preferences.push ?? true,    // Default to true if undefined
        marketing: preferences.marketing ?? false // Default to false if undefined
      }
    });
  }
}

export const notificationPreferencesService = new NotificationPreferencesService(); 