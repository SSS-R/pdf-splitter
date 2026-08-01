import { useCallback, useSyncExternalStore } from 'react';

/**
 * Pro entitlement state.
 *
 * Deliberately a tiny external store rather than context: the nav badge and the
 * pricing panel both read it and must agree instantly.
 *
 * ONE ENTITLEMENT, TWO TIERS. Students get the same feature set as paying
 * customers, so there is deliberately no separate "student mode" to gate
 * against -- `isPro` is the single question every feature asks, and `tier` only
 * says how the access was obtained (for the badge and for support). Building a
 * parallel student entitlement would mean every future paid feature has to
 * remember to check two flags, and one day one of them will not.
 *
 * This also matches how the edu tier is specified to work in Phase 2: verifying
 * a student issues a normal licence key at 100% off, so a verified student is
 * a licence holder like any other. The client never learns anything about a
 * university, and no student data reaches this code.
 *
 * PHASE 1 NOTE — today this is a local demo switch (`DEMO-1234` for Pro,
 * `EDU-1234` for the student tier). The real implementation replaces
 * `activate()` with a POST to /api/license that calls the merchant-of-record's
 * *activate* endpoint, stores the returned instance id, and caches
 * {valid, cacheUntil} here with a 30-day TTL and a 7-day offline grace. Later
 * revalidation calls *validate* against that instance id, which does not
 * consume a device slot.
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
const DEMO_KEYS = { 'DEMO-1234': 'pro', 'EDU-1234': 'edu' };

const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

/** Returns 'pro' | 'edu' | null. '1' is the pre-tier value, read as Pro. */
const read = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === '1' || value === 'pro') return 'pro';
    if (value === 'edu') return 'edu';
    return null;
  } catch {
    return null;
  }
};

const write = (tier) => {
  try {
    if (tier) localStorage.setItem(STORAGE_KEY, tier);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — the licence just won't persist across reloads */
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
  const tier = useSyncExternalStore(subscribe, read, () => null);

  const activate = useCallback((key) => {
    const matched = DEMO_KEYS[String(key).trim().toUpperCase()];
    if (matched) {
      write(matched);
      return true;
    }
    return false;
  }, []);

  const deactivate = useCallback(() => write(null), []);

  // Every paid feature asks this one question; `tier` is presentation only.
  return { isPro: tier !== null, tier, activate, deactivate };
}
