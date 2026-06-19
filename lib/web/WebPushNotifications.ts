export class WebPushManager {
  private static instance: WebPushManager | null = null;
  private subscription: PushSubscription | null = null;
  private isSupported: boolean = false;

  private constructor() {
    // Don't check support automatically to avoid browser warnings
    // Support will be checked when needed
  }

  static getInstance(): WebPushManager {
    if (!WebPushManager.instance) {
      WebPushManager.instance = new WebPushManager();
    }
    return WebPushManager.instance;
  }

  private ensureSupportChecked() {
    if (!this.isSupported) {
      this.checkSupport();
    }
  }

  private checkSupport() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      this.isSupported = true;
      console.log('[WebPush] Push notifications are supported');
    } else {
      console.log('[WebPush] Push notifications are not supported');
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('[WebPush] Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('[WebPush] Error requesting permission:', error);
      return 'denied';
    }
  }

  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.isSupported) {
      console.log('[WebPush] Push not supported');
      return null;
    }

    try {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.log('[WebPush] Permission not granted');
        return null;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.getApplicationServerKey(),
      });

      this.subscription = subscription;
      console.log('[WebPush] Subscribed successfully');

      // Send subscription to your server
      await this.sendSubscriptionToServer(subscription);

      return subscription;
    } catch (error) {
      console.error('[WebPush] Subscription failed:', error);
      return null;
    }
  }

  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.subscription) {
      return false;
    }

    try {
      await this.subscription.unsubscribe();
      this.subscription = null;
      console.log('[WebPush] Unsubscribed successfully');

      // Remove subscription from server
      await this.removeSubscriptionFromServer();

      return true;
    } catch (error) {
      console.error('[WebPush] Unsubscribe failed:', error);
      return false;
    }
  }

  private getApplicationServerKey(): Uint8Array {
    // In production, you would get this from your server
    // This is a placeholder - you need to generate proper VAPID keys
    const publicKey = 'BC épqk9LcY8B0r0c8x0r0c8x0r0c8x0r0c8x0r0c8x0r0c8x0r0c8x0r0c8x0r0';

    // Convert base64 to Uint8Array
    const padding = '='.repeat((4 - publicKey.length % 4) % 4);
    const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (response.ok) {
        console.log('[WebPush] Subscription sent to server');
      } else {
        console.error('[WebPush] Failed to send subscription to server');
      }
    } catch (error) {
      console.error('[WebPush] Error sending subscription:', error);
    }
  }

  private async removeSubscriptionFromServer(): Promise<void> {
    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription: this.subscription }),
      });

      if (response.ok) {
        console.log('[WebPush] Subscription removed from server');
      }
    } catch (error) {
      console.error('[WebPush] Error removing subscription:', error);
    }
  }

  getSubscription(): PushSubscription | null {
    return this.subscription;
  }

  isPushSupported(): boolean {
    this.ensureSupportChecked();
    return this.isSupported;
  }

  // Send local notification (for testing or fallback)
  showLocalNotification(title: string, body: string, options: NotificationOptions = {}) {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo/mytroskigo_apk.png',
        badge: '/logo/mytroskigo_favicon.png',
        ...options,
      });
    }
  }
}

// Export singleton instance
export const webPushManager = WebPushManager.getInstance();