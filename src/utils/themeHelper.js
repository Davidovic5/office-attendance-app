/**
 * Theme Helper for Wadi Degla Attendance App
 * Manages Dark Mode and Light Mode switching with FOUC prevention and local persistence.
 */

export function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem('office_theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch (e) {}
  return 'dark';
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  try {
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      root.classList.add('light');
      root.classList.remove('dark');
      try { localStorage.setItem('office_theme', 'light'); } catch (e) {}

      const metaScheme = document.querySelector('meta[name="color-scheme"]');
      if (metaScheme) metaScheme.content = 'light';

      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.content = '#f8fafc';
    } else {
      root.setAttribute('data-theme', 'dark');
      root.classList.remove('light');
      root.classList.add('dark');
      try { localStorage.setItem('office_theme', 'dark'); } catch (e) {}

      const metaScheme = document.querySelector('meta[name="color-scheme"]');
      if (metaScheme) metaScheme.content = 'dark';

      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.content = '#09090b';
    }
  } catch (e) {}
}
