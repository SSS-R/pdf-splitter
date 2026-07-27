import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pdftools-theme';

/** Read the stored choice, if the user has made one. */
const storedTheme = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null; // private mode / storage disabled — fall back to the OS.
  }
};

const systemTheme = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

/**
 * Theme state with three-way resolution: an explicit choice wins, otherwise the
 * OS decides and keeps deciding (the site follows if the OS flips at sunset).
 */
export function useTheme() {
  const [theme, setTheme] = useState(() =>
    typeof window === 'undefined' ? 'light' : storedTheme() || systemTheme(),
  );
  const [isExplicit, setIsExplicit] = useState(() =>
    typeof window === 'undefined' ? false : storedTheme() !== null,
  );

  // Reflect onto <html> so the CSS custom properties switch.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Follow the OS until the user overrides it.
  useEffect(() => {
    if (isExplicit) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [isExplicit]);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* storage unavailable — the choice just won't survive a reload */
      }
      return next;
    });
    setIsExplicit(true);
  }, []);

  return { theme, toggle };
}
