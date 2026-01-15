// Web Push Notification Service
// Handles browser notification permissions and displaying notifications

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
}

class WebPushService {
  private permission: NotificationPermission = 'default';
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = 'Notification' in window;
    if (this.isSupported) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Check if browser notifications are supported
   */
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      console.warn('Notifications are not supported in this browser');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Show a browser notification
   */
  async showNotification(options: PushNotificationOptions): Promise<Notification | null> {
    if (!this.isSupported) {
      console.warn('Notifications are not supported in this browser');
      return null;
    }

    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction || false,
      });

      // Auto-close after 10 seconds if not requiring interaction
      if (!options.requireInteraction) {
        setTimeout(() => notification.close(), 10000);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Show a check-in notification for a tracked user
   */
  async showCheckInNotification(
    userName: string,
    location: string,
    checkInTime: string
  ): Promise<Notification | null> {
    const formattedTime = new Date(checkInTime).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return this.showNotification({
      title: `${userName} has checked in`,
      body: `📍 ${location}\n🕐 ${formattedTime}`,
      tag: `checkin-${userName}-${Date.now()}`,
      icon: '/favicon.ico',
      requireInteraction: false,
    });
  }
}

// Singleton instance
export const webPushService = new WebPushService();

// Hook for React components
import { useState, useEffect, useCallback } from 'react';

export function useWebPush() {
  const [permission, setPermission] = useState<NotificationPermission>(
    webPushService.getPermissionStatus()
  );
  const [isSupported] = useState(webPushService.isNotificationSupported());

  const requestPermission = useCallback(async () => {
    const newPermission = await webPushService.requestPermission();
    setPermission(newPermission);
    return newPermission;
  }, []);

  const showNotification = useCallback(
    async (options: PushNotificationOptions) => {
      return webPushService.showNotification(options);
    },
    []
  );

  const showCheckInNotification = useCallback(
    async (userName: string, location: string, checkInTime: string) => {
      return webPushService.showCheckInNotification(userName, location, checkInTime);
    },
    []
  );

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    showCheckInNotification,
  };
}
