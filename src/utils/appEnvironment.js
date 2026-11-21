export function checkIsInstalledApp() {
  if (typeof window === 'undefined') return false;

  // 1. Check URL parameters (e.g. ?installed=1 or ?app=true or PWA start_url)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (
      urlParams.get('installed') === '1' ||
      urlParams.get('app') === 'true' ||
      urlParams.get('mode') === 'app' ||
      urlParams.get('source') === 'standalone'
    ) {
      return true;
    }
  } catch (e) {}

  // 2. iOS standalone mode (WebClip or PWA added to iOS home screen)
  if (window.navigator && window.navigator.standalone === true) {
    return true;
  }

  // 3. CSS display-mode: standalone or fullscreen (Android Chrome / PWA / Edge)
  if (
    window.matchMedia &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches)
  ) {
    return true;
  }

  // 4. Custom User Agent for Android Native APK
  if (
    navigator.userAgent &&
    (navigator.userAgent.includes('WadiDeglaApp') ||
      navigator.userAgent.includes('WadiDeglaNativeApp'))
  ) {
    return true;
  }

  // 5. Check Android app referrer
  if (document.referrer && document.referrer.startsWith('android-app://')) {
    return true;
  }

  return false;
}
