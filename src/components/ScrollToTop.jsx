import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Client-side navigation keeps the old scroll position; tools should start at the top. */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
