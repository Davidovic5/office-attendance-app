import { api } from '../api';

function urlBase64ToUint8Array(base64String) {
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
}

/**
 * Registers device for Web Push notifications
 * Works even when app or phone is closed (via Android FCM / Apple APNs background wakeup)
 */
export async function registerPushNotifications(employeeId) {
  if (typeof window === 'undefined') return { success: false, reason: 'no-window' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { success: false, reason: 'unsupported' };
  }

  try {
    // If not asked yet or already granted
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return { success: false, reason: 'permission_not_granted' };
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const res = await api.getVapidPublicKey();
      if (!res.success || !res.publicKey) {
        throw new Error('تعذر جلب مفتاح الإشعارات العام');
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
    console.warn('Push notification subscription error:', err);
    return { success: false, error: err.message };
  }

  return { success: false };
}
