export function checkIsInstalledApp() {
  if (typeof window === 'undefined') return false;

  // 1. Check URL parameters (e.g. ?installed=1 or ?app=true)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (
      urlParams.get('installed') === '1' ||
      urlParams.get('app') === 'true' ||
      urlParams.get('mode') === 'app' ||
      urlParams.get('source') === 'standalone'
    ) {
      localStorage.setItem('wd_is_installed_app', 'true');
      return true;
    }
  } catch (e) {}

  // 2. Check localStorage (persisted from previous launch of installed app)
  try {
    if (localStorage.getItem('wd_is_installed_app') === 'true') {
      return true;
    }
  } catch (e) {}

  // 3. iOS standalone mode (WebClip or PWA added to iOS home screen)
  if (window.navigator && window.navigator.standalone === true) {
    try {
      localStorage.setItem('wd_is_installed_app', 'true');
    } catch (e) {}
    return true;
  }

  // 4. CSS display-mode: standalone or fullscreen (Android Chrome / PWA / Edge)
  if (
    window.matchMedia &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches)
  ) {
    try {
      localStorage.setItem('wd_is_installed_app', 'true');
    } catch (e) {}
    return true;
  }

  // 5. Custom User Agent for Android Native APK
  if (
    navigator.userAgent &&
    (navigator.userAgent.includes('WadiDeglaApp') ||
      navigator.userAgent.includes('WadiDeglaNativeApp'))
  ) {
    try {
      localStorage.setItem('wd_is_installed_app', 'true');
    } catch (e) {}
    return true;
  }

  // 6. Check Android app referrer
  if (document.referrer && document.referrer.startsWith('android-app://')) {
    try {
      localStorage.setItem('wd_is_installed_app', 'true');
    } catch (e) {}
    return true;
  }

  return false;
}
