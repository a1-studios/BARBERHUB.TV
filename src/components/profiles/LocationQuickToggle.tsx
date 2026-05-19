import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Quick toggle that lives on the barber's own profile.
 * Tap once → grants GPS → barber is live on the /barbers map.
 * Includes a zip-code fallback for iframe / denied permission contexts.
 */
export function LocationQuickToggle() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [zip, setZip] = useState('');
  const [zipBusy, setZipBusy] = useState(false);
  const [zipOpen, setZipOpen] = useState(false);

  const { data: bp } = useQuery({
    queryKey: ['barber-location', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('barber_profiles')
        .select('location_sharing_enabled, latitude, longitude')
        .eq('user_id', user.id)
        .maybeSingle();
      return data as { location_sharing_enabled: boolean; latitude: number | null; longitude: number | null } | null;
    },
    enabled: !!user?.id,
  });

  const isOn = !!bp?.location_sharing_enabled;
  const hasCoords = bp?.latitude != null && bp?.longitude != null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['barber-location', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['barberProfile', user?.id] });
  };

  const saveCoords = async (lat: number, lng: number) => {
    if (!user?.id) return false;
    const { error } = await supabase
      .from('barber_profiles')
      .update({
        location_sharing_enabled: true,
        latitude: lat,
        longitude: lng,
      } as any)
      .eq('user_id', user.id);
    if (error) {
      toast.error('Failed to save location');
      return false;
    }
    toast.success("You're live on the Barbers Near Me map!");
    invalidate();
    return true;
  };

  const handleToggle = async (next: boolean) => {
    if (!user?.id || busy) return;

    if (!next) {
      // Turn OFF — keep coords
      setBusy(true);
      const { error } = await supabase
        .from('barber_profiles')
        .update({ location_sharing_enabled: false } as any)
        .eq('user_id', user.id);
      setBusy(false);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Hidden from map');
      invalidate();
      return;
    }

    // Turn ON — fast path if coords already saved
    if (hasCoords) {
      setBusy(true);
      const { error } = await supabase
        .from('barber_profiles')
        .update({ location_sharing_enabled: true } as any)
        .eq('user_id', user.id);
      setBusy(false);
      if (error) { toast.error('Failed to enable'); return; }
      toast.success("You're live on the map!");
      invalidate();
      return;
    }

    // First time — try GPS
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported. Use the zip code option.');
      setZipOpen(true);
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await saveCoords(pos.coords.latitude, pos.coords.longitude);
        setBusy(false);
      },
      () => {
        setBusy(false);
        toast.error('Location denied. Try setting your zip code instead.', { duration: 4000 });
        setZipOpen(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleZipSave = async () => {
    if (!zip.trim()) return;
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      toast.error('Geocoding is not configured');
      return;
    }
    setZipBusy(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zip)}&key=${apiKey}`
      );
      const data = await res.json();
      if (data.status !== 'OK' || !data.results?.length) {
        toast.error('Could not find that location');
        return;
      }
      const { lat, lng } = data.results[0].geometry.location;
      const ok = await saveCoords(lat, lng);
      if (ok) {
        setZip('');
        setZipOpen(false);
      }
    } catch {
      toast.error('Geocoding failed');
    } finally {
      setZipBusy(false);
    }
  };

  const handleRefreshGps = () => {
    if (!navigator.geolocation || !user?.id) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await saveCoords(pos.coords.latitude, pos.coords.longitude);
        setBusy(false);
      },
      () => {
        toast.error('Location access denied');
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div
      className="w-full mt-2 rounded-2xl p-3"
      style={{
        background: 'linear-gradient(135deg, hsla(25,95%,53%,0.10) 0%, hsla(187,80%,60%,0.08) 100%)',
        border: '1px solid hsla(25,95%,53%,0.35)',
        boxShadow: '0 4px 20px hsla(25,95%,53%,0.15)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: isOn
                ? 'radial-gradient(circle, hsla(25,95%,53%,0.35) 0%, hsla(25,95%,53%,0.1) 70%)'
                : 'hsla(0,0%,100%,0.05)',
            }}
          >
            <MapPin className={`h-4 w-4 ${isOn ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground leading-tight">Share My Location</div>
            <div className="flex items-center gap-1.5 text-[11px] leading-tight mt-0.5">
              {isOn ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-primary font-semibold">Live on map</span>
                  {hasCoords && <CheckCircle2 className="h-3 w-3 text-cyan-400" />}
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                  <span className="text-muted-foreground">Hidden — clients can't find you</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
          <Switch checked={isOn} disabled={busy} onCheckedChange={handleToggle} />
        </div>
      </div>

      {isOn && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-primary/15">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={handleRefreshGps}
            className="h-7 px-2 text-[11px] gap-1 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
          >
            <RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} />
            Refresh GPS
          </Button>
          <Popover open={zipOpen} onOpenChange={setZipOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
              >
                Set by zip
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-foreground">Pin yourself by zip / city</div>
                <Input
                  placeholder="e.g. 90210 or Miami"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleZipSave()}
                  className="h-8 text-xs"
                />
                <Button
                  onClick={handleZipSave}
                  disabled={zipBusy || !zip.trim()}
                  size="sm"
                  className="w-full h-8 text-xs"
                >
                  {zipBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save location'}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {!isOn && !hasCoords && (
        <Popover open={zipOpen} onOpenChange={setZipOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="mt-2 text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              GPS blocked? Set by zip code instead
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-foreground">Pin yourself by zip / city</div>
              <Input
                placeholder="e.g. 90210 or Miami"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleZipSave()}
                className="h-8 text-xs"
              />
              <Button
                onClick={handleZipSave}
                disabled={zipBusy || !zip.trim()}
                size="sm"
                className="w-full h-8 text-xs"
              >
                {zipBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save location'}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
