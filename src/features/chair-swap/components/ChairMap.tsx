import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { ChairListing } from '../types';
import { esc } from '../lib/esc';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface Props {
  center: { lat: number; lng: number } | null;
  listings: ChairListing[];
  onSelect: (listing: ChairListing) => void;
}

export function ChairMap({ center, listings, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!import.meta.env.VITE_MAPBOX_TOKEN) {
      console.warn('VITE_MAPBOX_TOKEN is not set');
      return;
    }
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: center ? [center.lng, center.lat] : [-98.5, 39.8],
      zoom: center ? 10 : 3,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  // Update center
  useEffect(() => {
    if (!mapRef.current || !center) return;
    mapRef.current.flyTo({ center: [center.lng, center.lat], zoom: 11, essential: true });
  }, [center?.lat, center?.lng]);

  // Markers
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    listings.forEach((listing) => {
      if (listing.latitude == null || listing.longitude == null) return;
      const el = document.createElement('div');
      el.style.cssText =
        'width:34px;height:34px;border-radius:50%;background:hsl(25,95%,53%);border:3px solid hsl(25,95%,70%);cursor:pointer;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;line-height:1;animation:pulse-pin 2.5s ease-in-out infinite;transition:transform 0.2s;box-shadow:0 0 12px hsl(25,95%,53%,0.55);';
      el.innerHTML = '🪑';
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
      el.addEventListener('click', () => onSelect(listing));

      const safeChair = esc(listing.chair_name);
      const safeShop = esc(listing.shop_name);
      const safeAddr = esc(listing.address);
      const popup = new mapboxgl.Popup({ offset: 22, closeButton: false }).setHTML(`
        <div style="background:#0a0a0f;color:#fff;padding:10px 12px;border-radius:10px;min-width:180px;font-family:system-ui;border:1px solid hsl(25,95%,53%,0.35);">
          <div style="font-weight:700;font-size:13px;color:hsl(25,95%,60%);">${safeChair}</div>
          ${safeShop ? `<div style="font-size:11px;opacity:0.8;margin-top:2px;">${safeShop}</div>` : ''}
          ${safeAddr ? `<div style="font-size:10px;opacity:0.55;margin-top:4px;">📍 ${safeAddr}</div>` : ''}
          <div style="margin-top:6px;font-size:11px;color:hsl(187,80%,55%);font-weight:600;">${listing.daily_rate_bb} BB / day</div>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([listing.longitude, listing.latitude])
        .setPopup(popup)
        .addTo(mapRef.current!);
      markersRef.current.push(marker);
    });
  }, [listings, onSelect]);

  return <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" />;
}
