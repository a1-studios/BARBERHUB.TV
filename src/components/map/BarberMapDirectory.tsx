import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Feature, Polygon } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformState } from '@/hooks/usePlatformState';
import { useMapVisibilityWeights } from '@/hooks/useMapVisibilityWeights';
import { calculateVisibilityScore, scoreToScale } from '@/lib/visibilityScore';
import { toast } from 'sonner';
import { BarberLocationSearch } from './BarberLocationSearch';
import { NearbyBarberCard } from './NearbyBarberCard';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface NearbyBarber {
  barber_id: string;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  specialty: string | null;
  active_subscription_tier: string | null;
  location: string | null;
  avatar_url: string | null;
  distance_miles: number;
  bb_purchased: number;
  battles_participated: number;
  contribution_score: number;
}

interface ScoredBarber extends NearbyBarber {
  _score: number;
  _scale: number;
}

const RADIUS_MILES = 15;

function createCircleGeoJSON(center: [number, number], radiusMiles: number, steps = 64): Feature<Polygon> {
  const km = radiusMiles * 1.60934;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dx = km * Math.cos(angle);
    const dy = km * Math.sin(angle);
    const lat = center[1] + (dy / 111.32);
    const lng = center[0] + (dx / (111.32 * Math.cos((center[1] * Math.PI) / 180)));
    coords.push([lng, lat]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

function getTierStyle(tier: string | null): string {
  switch (tier) {
    case 'diamond':
      return 'box-shadow: 0 0 10px hsla(200,80%,75%,0.7); border-color: hsl(200,80%,75%);';
    case 'gold':
      return 'box-shadow: 0 0 10px hsla(45,100%,55%,0.7); border-color: hsl(45,100%,55%);';
    case 'silver':
      return 'box-shadow: 0 0 10px hsla(210,20%,80%,0.6); border-color: hsl(210,20%,80%);';
    default:
      return 'box-shadow: 0 0 8px hsla(25,95%,53%,0.5); border-color: hsl(25,95%,70%);';
  }
}

export function BarberMapDirectory() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [barbers, setBarbers] = useState<NearbyBarber[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const { value: enforceTiersVal } = usePlatformState('enforce_tiers');
  const enforceTiers = enforceTiersVal === 'true';
  const { weights } = useMapVisibilityWeights();

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    if (!mapboxgl.accessToken) {
      console.warn('VITE_MAPBOX_TOKEN is not set');
    }
    // Detect WebGL availability before instantiating (avoids hard crash on devices/browsers without GPU)
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) throw new Error('WebGL is not available in this browser');
    } catch (e) {
      console.warn('[BarberMapDirectory] WebGL unavailable:', e);
      setMapError('Map view requires WebGL, which is unavailable in this browser. Please switch to the List view.');
      return;
    }
    try {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-98.5795, 39.8283],
        zoom: 3,
        attributionControl: false,
      });
      map.on('error', (ev) => {
        // Don't kill the page on tile/style errors
        console.warn('[Mapbox]', ev?.error?.message || ev);
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new mapboxgl.AttributionControl({ compact: true }));
      mapRef.current = map;
      return () => { map.remove(); mapRef.current = null; };
    } catch (e: any) {
      console.error('[BarberMapDirectory] Failed to initialize map:', e);
      setMapError(e?.message || 'Failed to initialize map.');
    }
  }, []);

  const drawRadiusCircle = useCallback((lng: number, lat: number) => {
    const map = mapRef.current;
    if (!map) return;
    const circleData = createCircleGeoJSON([lng, lat], RADIUS_MILES);
    const apply = () => {
      if (map.getSource('radius-circle')) {
        (map.getSource('radius-circle') as mapboxgl.GeoJSONSource).setData(circleData);
      } else {
        map.addSource('radius-circle', { type: 'geojson', data: circleData });
        map.addLayer({ id: 'radius-circle-fill', type: 'fill', source: 'radius-circle', paint: { 'fill-color': 'hsl(25, 95%, 53%)', 'fill-opacity': 0.08 } });
        map.addLayer({ id: 'radius-circle-stroke', type: 'line', source: 'radius-circle', paint: { 'line-color': 'hsl(25, 95%, 53%)', 'line-opacity': 0.4, 'line-width': 1.5, 'line-dasharray': [4, 3] } });
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once('style.load', apply);
  }, []);

  const placeUserMarker = useCallback((lng: number, lat: number) => {
    if (!mapRef.current) return;
    userMarkerRef.current?.remove();
    const el = document.createElement('div');
    el.style.cssText = `width:16px;height:16px;border-radius:50%;background:hsl(210,100%,60%);border:3px solid hsl(210,100%,80%);box-shadow:0 0 12px hsla(210,100%,60%,0.6);animation:pulse-pin 2s ease-in-out infinite;`;
    userMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(mapRef.current);
  }, []);

  // Apply visibility scoring + sort (high score rendered LAST so it stays on top)
  const scoredBarbers = useMemo<ScoredBarber[]>(() => {
    const scored = barbers.map(b => {
      const score = calculateVisibilityScore(b, weights);
      return { ...b, _score: score, _scale: scoreToScale(score) };
    });
    // Ascending sort: low scores added first, high scores added last → higher z-index
    scored.sort((a, b) => a._score - b._score);
    return scored;
  }, [barbers, weights]);

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    scoredBarbers.forEach((barber) => {
      const size = Math.round(32 * barber._scale);
      const el = document.createElement('div');
      el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:hsl(25,95%,53%);border:2.5px solid;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:${Math.round(14 * barber._scale)}px;line-height:1;animation:pulse-pin 2.5s ease-in-out infinite;transition:transform 0.2s;${getTierStyle(barber.active_subscription_tier)}`;
      el.innerHTML = '✂';
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
      const tierBadge = barber.active_subscription_tier
        ? `<span style="background:hsla(25,95%,53%,0.2);color:hsl(25,95%,53%);padding:2px 6px;border-radius:4px;font-size:10px;text-transform:uppercase;">${barber.active_subscription_tier}</span>`
        : '';
      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(`
        <div style="background:#12121a;color:white;padding:12px;border-radius:8px;min-width:180px;font-family:system-ui;">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${barber.name}</div>
          ${barber.specialty ? `<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:4px;">${barber.specialty}</div>` : ''}
          ${barber.location ? `<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:6px;">📍 ${barber.location}</div>` : ''}
          <div style="display:flex;align-items:center;justify-content:space-between;">${tierBadge}<span style="font-size:11px;color:hsl(187,80%,60%);">${barber.distance_miles.toFixed(1)} mi</span></div>
          <a href="/barber/${barber.user_id}" style="display:block;margin-top:8px;text-align:center;background:hsl(25,95%,53%);color:white;padding:6px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">View Profile</a>
        </div>
      `);
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([barber.longitude, barber.latitude]).setPopup(popup).addTo(mapRef.current!);
      markersRef.current.push(marker);
    });
    if (scoredBarbers.length > 0 && mapRef.current) {
      const bounds = new mapboxgl.LngLatBounds();
      scoredBarbers.forEach(b => bounds.extend([b.longitude, b.latitude]));
      if (userCoords) bounds.extend([userCoords.lng, userCoords.lat]);
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 13 });
    }
  }, [scoredBarbers, userCoords]);

  useEffect(() => {
    if (!userCoords) return;
    drawRadiusCircle(userCoords.lng, userCoords.lat);
    placeUserMarker(userCoords.lng, userCoords.lat);
  }, [userCoords, drawRadiusCircle, placeUserMarker]);

  const searchNearby = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('find_barbers_nearby_scored', {
        p_lat: lat, p_lng: lng, p_radius_miles: RADIUS_MILES, p_enforce_tiers: enforceTiers,
      });
      if (error) throw error;
      setBarbers((data as NearbyBarber[]) || []);
      // Empty state is rendered inline below — no toast.
    } catch (err: any) {
      toast.error(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationFound = (lat: number, lng: number, _label: string) => {
    const coords = { lat, lng };
    setUserCoords(coords);
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 12 });
    searchNearby(lat, lng);
  };

  return (
    <div className="space-y-4">
      <BarberLocationSearch onLocationFound={handleLocationFound} loading={loading} />

      {enforceTiersVal === 'false' && (
        <div className="text-[10px] text-orange-500 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-md inline-block">
          TESTING MODE — All tiers visible
        </div>
      )}

      <div className="relative">
        {scoredBarbers.length > 0 && (
          <div className="absolute top-3 left-3 z-10 bg-card/90 backdrop-blur border border-primary/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-foreground">
              {scoredBarbers.length} barber{scoredBarbers.length !== 1 ? 's' : ''} nearby
            </span>
          </div>
        )}
        <div ref={mapContainer} className="w-full rounded-xl border border-border overflow-hidden" style={{ height: '500px' }} />
      </div>

      {/* Branded result rail */}
      {scoredBarbers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
              Top Matches Near You
            </h3>
            <span className="text-[10px] text-muted-foreground">
              Ranked by visibility score
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory">
            {[...scoredBarbers].reverse().map((b) => (
              <div key={b.barber_id} className="snap-start">
                <NearbyBarberCard
                  user_id={b.user_id}
                  name={b.name}
                  avatar_url={b.avatar_url}
                  specialty={b.specialty}
                  location={b.location}
                  distance_miles={b.distance_miles}
                  active_subscription_tier={b.active_subscription_tier}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state — only after a search has been performed */}
      {userCoords && !loading && scoredBarbers.length === 0 && (
        <div
          className="rounded-2xl p-5 text-center"
          style={{
            background: 'linear-gradient(155deg, hsl(240 10% 6% / 0.95) 0%, hsl(240 12% 9% / 0.9) 100%)',
            border: '1px solid hsla(25,95%,53%,0.3)',
            boxShadow: '0 4px 20px hsla(25,95%,53%,0.15)',
          }}
        >
          <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-3"
            style={{ background: 'radial-gradient(circle, hsla(25,95%,53%,0.25) 0%, transparent 70%)' }}>
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <h4 className="text-sm font-bold text-white">No barbers within 15 miles</h4>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
            Barbers near you may have GPS sharing turned off. If you're a barber, enable it from your profile.
          </p>
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-semibold text-primary hover:text-primary/80"
          >
            <MapPin className="h-3 w-3" />
            Turn on my location
          </Link>
        </div>
      )}
    </div>
  );
}
