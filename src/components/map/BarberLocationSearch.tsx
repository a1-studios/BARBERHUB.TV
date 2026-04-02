import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface BarberLocationSearchProps {
  onLocationFound: (lat: number, lng: number, label: string) => void;
  onClear?: () => void;
  activeLabel?: string | null;
  loading?: boolean;
  compact?: boolean;
}

export function BarberLocationSearch({
  onLocationFound,
  onClear,
  activeLabel,
  loading = false,
  compact = false,
}: BarberLocationSearchProps) {
  const [zipInput, setZipInput] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleZipSearch = async () => {
    if (!zipInput.trim()) return;
    setSearching(true);
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        toast.error('Google Maps API key is not configured');
        setSearching(false);
        return;
      }
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zipInput)}&key=${apiKey}`
      );
      const data = await res.json();
      if (data.status === 'OK' && data.results?.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        const label = data.results[0].formatted_address || zipInput;
        onLocationFound(lat, lng, label);
      } else {
        toast.error('Could not find that location');
      }
    } catch {
      toast.error('Geocoding failed');
    } finally {
      setSearching(false);
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
        onLocationFound(pos.coords.latitude, pos.coords.longitude, 'My Location');
        setGeoLoading(false);
      },
      () => {
        toast.error('Location access denied. Please enter a zip code instead.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const isLoading = loading || searching || geoLoading;

  if (activeLabel && onClear) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary rounded-full px-3 py-1.5 text-xs font-medium">
          <MapPin className="h-3 w-3" />
          Showing barbers near {activeLabel}
          <button onClick={onClear} className="hover:text-primary/70 transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${compact ? 'flex-col' : 'flex-col sm:flex-row'} gap-2`}>
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
        disabled={isLoading || !zipInput.trim()}
        className="shrink-0"
      >
        {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Search
      </Button>
      <Button
        variant="outline"
        onClick={handleUseMyLocation}
        disabled={isLoading}
        className="shrink-0"
      >
        {geoLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Navigation className="h-4 w-4 mr-2" />
        )}
        Use My Location
      </Button>
    </div>
  );
}
