import { useCallback, useSyncExternalStore } from 'react';

/**
 * Pro entitlement state.
 *
 * Deliberately a tiny external store rather than context: the nav badge and the
 * pricing panel both read it and must agree instantly.
 *
 * PHASE 1 NOTE — today this is a local demo switch (key `DEMO-1234`). The real
 * implementation replaces `activate()` with a POST to /api/license that calls
 * the merchant-of-record's *validate* endpoint, then caches {valid, cacheUntil}
 * here with a 30-day TTL and a 7-day offline grace. No activation limits: they
 * cannot stop copying on an honour-system paywall, and they lock out paying
 * customers who clear storage. See ROADMAP.md, Phase 1.3.
 */

const STORAGE_KEY = 'pdftools-pro';
const DEMO_KEY = 'DEMO-1234';

const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

const read = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const write = (on) => {
  try {
    if (on) localStorage.setItem(STORAGE_KEY, '1');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — Pro just won't persist across reloads */
  }
  emit();
};

const subscribe = (listener) => {
  listeners.add(listener);
  window.addEventListener('storage', listener); // keep other tabs in step
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

export function usePro() {
  const isPro = useSyncExternalStore(subscribe, read, () => false);

  const activate = useCallback((key) => {
    if (String(key).trim().toUpperCase() === DEMO_KEY) {
      write(true);
      return true;
    }
    return false;
  }, []);

  const deactivate = useCallback(() => write(false), []);

  return { isPro, activate, deactivate };
}
