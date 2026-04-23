import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fbqTrackPageView } from '@/lib/metaPixel';

/**
 * Fires a Meta Pixel `PageView` event on every SPA route change.
 * The pixel base script in index.html only fires on hard load —
 * this hook covers client-side React Router navigation.
 */
export function useMetaPixelPageView() {
  const location = useLocation();

  useEffect(() => {
    fbqTrackPageView();
  }, [location.pathname, location.search]);
}
