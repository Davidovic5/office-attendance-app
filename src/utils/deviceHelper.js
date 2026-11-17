export function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return 'unknown_device';
  let deviceId = '';
  try {
    deviceId = localStorage.getItem('wd_device_id') || '';
  } catch (e) {}

  if (!deviceId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = 'dev_' + crypto.randomUUID();
    } else {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    }
    try {
      localStorage.setItem('wd_device_id', deviceId);
    } catch (e) {}
  }
  return deviceId;
}

export function getDeviceSummary() {
  if (typeof window === 'undefined') return 'هاتف ذكي';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) {
    const match = ua.match(/Android\s([0-9\.]+)/);
    return `أندرويد ${match ? match[1] : ''}`.trim();
  }
  if (/iphone|ipad|ipod/i.test(ua)) {
    const match = ua.match(/OS\s([0-9_]+)/);
    return `آيفون iOS ${match ? match[1].replace(/_/g, '.') : ''}`.trim();
  }
  if (/macintosh|mac os x/i.test(ua)) return 'Mac OS';
  if (/windows/i.test(ua)) return 'Windows PC';
  return 'هاتف معتمد';
}
