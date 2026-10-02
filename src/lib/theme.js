// Appearance: 'light' | 'dark' | 'system'. Stored on the device (like most
// apps), applied as <html data-theme>, and kept in sync across tabs and the
// design system's phone preview.

const KEY = 'alle-theme';
const mq = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : null;

export function getThemePref() {
  try { return localStorage.getItem(KEY) || 'light'; } catch { return 'light'; }
}

export function applyTheme(pref = getThemePref()) {
  const dark = pref === 'dark' || (pref === 'system' && mq?.matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  // Browser chrome (status bar on phones) follows the page colour.
  const page = getComputedStyle(root).getPropertyValue('--page-bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', page);
}

export function setThemePref(pref) {
  try { localStorage.setItem(KEY, pref); } catch { /* private mode */ }
  applyTheme(pref);
  window.dispatchEvent(new CustomEvent('alle-theme', { detail: pref }));
  import('./analytics.js').then((m) => m.track('theme_set', { pref })).catch(() => {});
}

/** Call once at startup. */
export function initTheme() {
  applyTheme();
  mq?.addEventListener('change', () => getThemePref() === 'system' && applyTheme());
  // Another tab (or the preview phone on /design) changed it.
  window.addEventListener('storage', (e) => e.key === KEY && applyTheme());
}
