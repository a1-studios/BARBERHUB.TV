import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformState } from '@/hooks/usePlatformState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
}

const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
    },
  },
  layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark' }],
};

const RADIUS_MILES = 15;

/** Build a GeoJSON circle polygon from a center point and radius in miles */
function createCircleGeoJSON(center: [number, number], radiusMiles: number, steps = 64): GeoJSON.Feature<GeoJSON.Polygon> {
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

/** Get tier-based CSS for pin glow */
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
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [zipInput, setZipInput] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [barbers, setBarbers] = useState<NearbyBarber[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const { value: enforceTiersVal } = usePlatformState('enforce_tiers');
  const enforceTiers = enforceTiersVal === 'true';

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: DARK_STYLE,
      center: [-98.5795, 39.8283],
      zoom: 3,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /** Draw/update the 15-mile radius circle on the map */
  const drawRadiusCircle = useCallback((lng: number, lat: number) => {
    const map = mapRef.current;
    if (!map) return;

    const circleData = createCircleGeoJSON([lng, lat], RADIUS_MILES);

    if (map.getSource('radius-circle')) {
      (map.getSource('radius-circle') as maplibregl.GeoJSONSource).setData(circleData);
    } else {
      // Wait for style to load if needed
      const addLayers = () => {
        if (map.getSource('radius-circle')) return;
        map.addSource('radius-circle', { type: 'geojson', data: circleData });
        map.addLayer({
          id: 'radius-circle-fill',
          type: 'fill',
          source: 'radius-circle',
          paint: {
            'fill-color': 'hsl(25, 95%, 53%)',
            'fill-opacity': 0.08,
          },
        });
        map.addLayer({
          id: 'radius-circle-stroke',
          type: 'line',
          source: 'radius-circle',
          paint: {
            'line-color': 'hsl(25, 95%, 53%)',
            'line-opacity': 0.4,
            'line-width': 1.5,
            'line-dasharray': [4, 3],
          },
        });
      };

      if (map.isStyleLoaded()) addLayers();
      else map.once('styledata', addLayers);
    }
  }, []);

  /** Place the blue user-location dot */
  const placeUserMarker = useCallback((lng: number, lat: number) => {
    if (!mapRef.current) return;
    userMarkerRef.current?.remove();

    const el = document.createElement('div');
    el.className = 'user-location-pin';
    el.style.cssText = `
      width: 16px; height: 16px; border-radius: 50%;
      background: hsl(210, 100%, 60%);
      border: 3px solid hsl(210, 100%, 80%);
      box-shadow: 0 0 12px hsla(210,100%,60%,0.6);
      animation: pulse-pin 2s ease-in-out infinite;
    `;

    userMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);
  }, []);

  // Place markers when barbers change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing barber markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    barbers.forEach((barber) => {
      const el = document.createElement('div');
      const tierStyle = getTierStyle(barber.active_subscription_tier);
      el.className = 'barber-map-pin';
      el.style.cssText = `
        width: 32px; height: 32px; border-radius: 50%;
        background: hsl(25, 95%, 53%);
        border: 2.5px solid;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; line-height: 1;
        animation: pulse-pin 2.5s ease-in-out infinite;
        transition: transform 0.2s;
        ${tierStyle}
      `;
      el.innerHTML = '✂';
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

      const tierBadge = barber.active_subscription_tier
        ? `<span style="background:hsla(25,95%,53%,0.2);color:hsl(25,95%,53%);padding:2px 6px;border-radius:4px;font-size:10px;text-transform:uppercase;">${barber.active_subscription_tier}</span>`
        : '';

      const popup = new maplibregl.Popup({ offset: 20, closeButton: false })
        .setHTML(`
          <div style="background:#12121a;color:white;padding:12px;border-radius:8px;min-width:180px;font-family:system-ui;">
            <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${barber.name}</div>
            ${barber.specialty ? `<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:4px;">${barber.specialty}</div>` : ''}
            ${barber.location ? `<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:6px;">📍 ${barber.location}</div>` : ''}
            <div style="display:flex;align-items:center;justify-content:space-between;">
              ${tierBadge}
              <span style="font-size:11px;color:hsl(187,80%,60%);">${barber.distance_miles.toFixed(1)} mi</span>
            </div>
            <a href="/barber/${barber.user_id}" style="display:block;margin-top:8px;text-align:center;background:hsl(25,95%,53%);color:white;padding:6px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">View Profile</a>
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([barber.longitude, barber.latitude])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds if we have barbers
    if (barbers.length > 0 && mapRef.current) {
      const bounds = new maplibregl.LngLatBounds();
      barbers.forEach(b => bounds.extend([b.longitude, b.latitude]));
      if (userCoords) bounds.extend([userCoords.lng, userCoords.lat]);
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 13 });
    }
  }, [barbers, userCoords]);

  // Draw radius circle & user dot whenever userCoords changes
  useEffect(() => {
    if (!userCoords) return;
    drawRadiusCircle(userCoords.lng, userCoords.lat);
    placeUserMarker(userCoords.lng, userCoords.lat);
  }, [userCoords, drawRadiusCircle, placeUserMarker]);

  const searchNearby = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('find_barbers_nearby', {
        p_lat: lat,
        p_lng: lng,
        p_radius_miles: RADIUS_MILES,
        p_enforce_tiers: enforceTiers,
      });
      if (error) throw error;
      setBarbers((data as NearbyBarber[]) || []);
      if (!data?.length) toast.info('No barbers found within 15 miles');
    } catch (err: any) {
      toast.error(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 10 });
        searchNearby(coords.lat, coords.lng);
        setGeoLoading(false);
      },
      () => {
        toast.error('Location access denied. Please enter a zip code instead.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleZipSearch = async () => {
    if (!zipInput.trim()) return;
    setLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        toast.error('Google Maps API key is not configured');
        setLoading(false);
        return;
      }
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zipInput)}&key=${apiKey}`
      );
      const data = await res.json();
      if (data.status === 'OK' && data.results?.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        const coords = { lat, lng };
        setUserCoords(coords);
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 12 });
        await searchNearby(lat, lng);
      } else {
        toast.error('Could not find that location');
        setLoading(false);
      }
    } catch {
      toast.error('Geocoding failed');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Enter zip code or city..."
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleZipSearch()}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleZipSearch}
          disabled={loading || !zipInput.trim()}
          className="shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Search
        </Button>
        <Button
          variant="outline"
          onClick={handleUseMyLocation}
          disabled={geoLoading}
          className="shrink-0"
        >
          {geoLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Navigation className="h-4 w-4 mr-2" />}
          Use My Location
        </Button>
      </div>

      {/* Tier enforcement badge */}
      {enforceTiersVal === 'false' && (
        <div className="text-[10px] text-orange-500 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-md inline-block">
          TESTING MODE — All tiers visible
        </div>
      )}

      {/* Map wrapper */}
      <div className="relative">
        {/* Barber count badge */}
        {barbers.length > 0 && (
          <div className="absolute top-3 left-3 z-10 bg-card/90 backdrop-blur border border-primary/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-foreground">
              {barbers.length} barber{barbers.length !== 1 ? 's' : ''} nearby
            </span>
          </div>
        )}

        {/* Map */}
        <div
          ref={mapContainer}
          className="w-full rounded-xl border border-border overflow-hidden"
          style={{ height: '500px' }}
        />
      </div>
    </div>
  );
}
