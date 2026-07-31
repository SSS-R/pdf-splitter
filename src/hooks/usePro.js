import { useCallback, useSyncExternalStore } from 'react';

/**
 * Pro entitlement state.
 *
 * Deliberately a tiny external store rather than context: the nav badge and the
 * pricing panel both read it and must agree instantly.
 *
 * PHASE 1 NOTE — today this is a local demo switch (key `DEMO-1234`). The real
 * implementation replaces `activate()` with a POST to /api/license that calls
 * the merchant-of-record's *activate* endpoint, stores the returned instance
 * id, and caches {valid, cacheUntil} here with a 30-day TTL and a 7-day offline
 * grace. Later revalidation calls *validate* against that instance id, which
 * does not consume a device slot.
 *
 * Activations are capped (10 devices) on purpose: an unlimited key posted to
 * social media grants everyone free access at zero effort, which is the attack
 * that actually happens. A cap makes sharing self-limiting and self-punishing
 * without locking out real buyers, who get a self-serve device reset. It is not
 * DRM — forking the MIT repo still bypasses everything, and that is fine.
 *
 * The response's `meta.customer_email` is what binds a key to a person; the UI
 * shows it masked ("Licensed to r••••@gmail.com"). No second input field is
 * needed — the email travels with the key. See ROADMAP.md, Phase 1.
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
