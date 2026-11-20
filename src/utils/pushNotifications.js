import { api } from '../api';

function urlBase64ToUint8Array(base64String) {
  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (e) {
    return new Uint8Array(0);
  }
}

/**
 * Registers device for Web Push notifications
 * Works even when app or phone is closed (via Android FCM / Apple APNs background wakeup)
 */
export async function registerPushNotifications(employeeId) {
  try {
    if (typeof window === 'undefined') return { success: false, reason: 'no-window' };
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return { success: false, reason: 'unsupported' };
    }

    let permission = 'default';
    try {
      permission = Notification.permission;
    } catch (e) {
      return { success: false, reason: 'permission_access_error' };
    }

    // On iOS Safari, calling requestPermission outside user gesture can throw or be ignored
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch (permErr) {
        // User gesture required or permission denied
        return { success: false, reason: 'user_gesture_required' };
      }
    }

    if (permission !== 'granted') {
      return { success: false, reason: 'permission_not_granted' };
    }

    const registration = await navigator.serviceWorker.ready;
    if (!registration || !registration.pushManager) {
      return { success: false, reason: 'no-pushmanager' };
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const res = await api.getVapidPublicKey();
      if (!res.success || !res.publicKey) {
        return { success: false, reason: 'vapid_key_unavailable' };
      }
      const applicationServerKey = urlBase64ToUint8Array(res.publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    if (subscription) {
      await api.subscribePush(employeeId, subscription.toJSON());
      return { success: true };
    }
  } catch (err) {
    console.warn('Push notification subscription warning:', err);
    return { success: false, error: err?.message || 'unknown' };
  }

  return { success: false };
}
