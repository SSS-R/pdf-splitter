import { useSyncExternalStore } from 'react';

/**
 * How much you've used each tool — counted on your own machine.
 *
 * This is deliberately NOT sent anywhere. A profile that reports "you split 47
 * PDFs" is normally built by phoning home on every action, which would mean
 * this site watching what you do with your documents — the exact thing it
 * promises never to do, on a page that invites you to check in devtools.
 *
 * Counting locally gives the same answer with none of that. The honest costs
 * are that the numbers don't follow you to another device and clearing browser
 * storage resets them; the account page says both out loud.
 *
 * Same external-store shape as usePro so the account page updates the instant a
 * tool records something, without prop drilling or a context provider.
 */

const STORAGE_KEY = 'pdftools-usage';

const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

const EMPTY = Object.freeze({});
let cache = null;
let cacheRaw = null;

/**
 * useSyncExternalStore compares snapshots by identity, so parsing fresh JSON on
 * every call would return a new object each time and loop forever. Cache by the
 * raw string and only re-parse when it actually changes.
 */
const read = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cacheRaw) return cache ?? EMPTY;
    cacheRaw = raw;
    cache = raw ? JSON.parse(raw) : EMPTY;
    return cache;
  } catch {
    return EMPTY;
  }
};

const subscribe = (listener) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

/** Bump a tool's counter. Safe to call from anywhere, including SSR (no-op). */
export const recordUse = (tool) => {
  try {
    const current = read();
    const next = { ...current, [tool]: (current[tool] || 0) + 1 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emit();
  } catch {
    /* storage unavailable — the count just doesn't persist */
  }
};

export const clearUsage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    emit();
  } catch {
    /* nothing to clear */
  }
};

export function useUsageStats() {
  const stats = useSyncExternalStore(subscribe, read, () => EMPTY);
  const total = Object.values(stats).reduce((sum, n) => sum + n, 0);
  // recordUse and clearUsage are module-level and already stable -- wrapping
  // them in useCallback would add ceremony without changing identity.
  return { stats, total, record: recordUse, clear: clearUsage };
}
