import { useState, useEffect } from 'react';
import { webPushManager } from '../lib/web/WebPushNotifications';

export const useWebPushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    setIsSupported(webPushManager.isPushSupported());
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }

    const subscription = webPushManager.getSubscription();
    setIsSubscribed(!!subscription);
  }, []);

  const subscribe = async () => {
    const subscription = await webPushManager.subscribeToPush();
    if (subscription) {
      setIsSubscribed(true);
      setPermission('granted');
      return true;
    }
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
    return false;
  };

  const unsubscribe = async () => {
    const success = await webPushManager.unsubscribeFromPush();
    if (success) {
      setIsSubscribed(false);
    }
    return success;
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe
  };
};
