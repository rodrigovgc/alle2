import { useEffect, useState } from 'react';

/* global __APP_VERSION__ */
const CURRENT = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const EVERY = 5 * 60 * 1000; // check every 5 minutes, and when the tab comes back

/** True once a newer build of the app has been deployed than the one running. */
export function useNewVersion() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (CURRENT === 'dev' || import.meta.env.DEV) return undefined;
    let stopped = false;
    async function check() {
      if (stopped || document.hidden) return;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = await res.json();
        if (version && version !== CURRENT) { setAvailable(true); stopped = true; }
      } catch { /* offline: try again later */ }
    }
    const timer = setInterval(check, EVERY);
    const onBack = () => { if (!document.hidden) check(); };
    document.addEventListener('visibilitychange', onBack);
    window.addEventListener('focus', onBack);
    check();
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onBack);
      window.removeEventListener('focus', onBack);
    };
  }, []);
  return available;
}
