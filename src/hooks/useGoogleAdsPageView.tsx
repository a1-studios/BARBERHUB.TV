import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { gtagTrackPageView } from '@/lib/googleAds';

/**
 * Fires a Google Ads / GA4 `page_view` on every SPA route change.
 * No-ops gracefully when VITE_GOOGLE_ADS_ID is unset.
 */
export function useGoogleAdsPageView() {
  const location = useLocation();
  useEffect(() => {
    gtagTrackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);
}
