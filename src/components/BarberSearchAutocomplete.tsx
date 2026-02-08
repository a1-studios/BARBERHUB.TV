import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, MapPin, Loader2, User, Scissors, Globe } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface BarberSuggestion {
  barber_id: string;
  name: string;
  avatar_url: string | null;
  location: string | null;
  country_code: string | null;
}

interface LocationSuggestion {
  value: string;
  type: 'location' | 'country';
}

interface SpecialtySuggestion {
  value: string;
}

export const BarberSearchAutocomplete = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions based on query
  const { data: suggestions } = useQuery({
    queryKey: ['barber-search-suggestions', query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_barber_profiles')
        .select('barber_id, barber_name, display_name, avatar_url, location, country_code, specialty')
        .order('rating', { ascending: false })
        .limit(50);

      if (error) throw error;

      const searchLower = query.toLowerCase();

      // Build barber suggestions
      const barbers: BarberSuggestion[] = (data || [])
        .filter(b =>
          !query ||
          b.barber_name?.toLowerCase().includes(searchLower) ||
          b.display_name?.toLowerCase().includes(searchLower)
        )
        .slice(0, 5)
        .map(b => ({
          barber_id: b.barber_id!,
          name: b.display_name || b.barber_name || 'Barber',
          avatar_url: b.avatar_url,
          location: b.location,
          country_code: b.country_code,
        }));

      // Build unique location suggestions
      const locationSet = new Set<string>();
      const locations: LocationSuggestion[] = [];
      (data || []).forEach(b => {
        if (b.location && (!query || b.location.toLowerCase().includes(searchLower))) {
          if (!locationSet.has(b.location.toLowerCase())) {
            locationSet.add(b.location.toLowerCase());
            locations.push({ value: b.location, type: 'location' });
          }
        }
        if (b.country_code && (!query || b.country_code.toLowerCase().includes(searchLower))) {
          const cc = b.country_code.toUpperCase();
          if (!locationSet.has(cc.toLowerCase())) {
            locationSet.add(cc.toLowerCase());
            locations.push({ value: cc, type: 'country' });
          }
        }
      });

      // Build unique specialty suggestions
      const specSet = new Set<string>();
      const specialties: SpecialtySuggestion[] = [];
      (data || []).forEach(b => {
        if (b.specialty && (!query || b.specialty.toLowerCase().includes(searchLower))) {
          if (!specSet.has(b.specialty.toLowerCase())) {
            specSet.add(b.specialty.toLowerCase());
            specialties.push({ value: b.specialty });
          }
        }
      });

      return {
        barbers,
        locations: locations.slice(0, 5),
        specialties: specialties.slice(0, 5),
      };
    },
    enabled: isOpen,
    staleTime: 10000,
  });

  const handleGeolocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Use a free reverse geocode API to get the country/city
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await res.json();
          const city = data.city || data.locality || '';
          const countryCode = data.countryCode || '';

          // Auto-fill with city or country
          const locationText = city || countryCode;
          if (locationText) {
            setQuery(locationText);
            setLocationGranted(true);
            setIsOpen(true);
          }
        } catch {
          // Silently fail — user can still type manually
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        // Denied or error — silently fail
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);

  const handleSelect = (type: 'barber' | 'location' | 'country' | 'specialty', value: string) => {
    setIsOpen(false);
    if (type === 'country') {
      navigate(`/barbers?country=${encodeURIComponent(value)}`);
    } else if (type === 'barber') {
      navigate(`/barbers?search=${encodeURIComponent(value)}`);
    } else {
      navigate(`/barbers?search=${encodeURIComponent(value)}`);
    }
  };

  const handleSubmit = () => {
    setIsOpen(false);
    navigate(`/barbers${query ? `?search=${encodeURIComponent(query)}` : ''}`);
  };

  const hasSuggestions =
    (suggestions?.barbers?.length ?? 0) > 0 ||
    (suggestions?.locations?.length ?? 0) > 0 ||
    (suggestions?.specialties?.length ?? 0) > 0;

  return (
    <div ref={containerRef} className="max-w-md mx-auto relative">
      <div className="relative flex items-center rounded-full border border-border/60 bg-muted/30 backdrop-blur-sm px-4 py-2">
        <Search className="w-4 h-4 text-muted-foreground mr-3 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Find the best barber near you"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 text-foreground"
        />
        <button
          onClick={handleGeolocation}
          disabled={isLocating}
          className={cn(
            'p-1.5 rounded-full transition-colors flex-shrink-0 mr-1',
            locationGranted
              ? 'text-primary'
              : 'text-muted-foreground hover:text-primary',
            isLocating && 'animate-pulse'
          )}
          title="Use my location"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MapPin className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={handleSubmit}
          className="text-xs text-primary hover:text-primary/80 flex-shrink-0 px-2 font-medium"
        >
          Search
        </button>
      </div>

      {/* Autocomplete dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <Command className="rounded-xl border border-border/60 bg-popover shadow-lg overflow-hidden">
            <CommandList>
              {!hasSuggestions && query.length > 0 && (
                <CommandEmpty className="py-4 text-sm text-muted-foreground">
                  No barbers found for "{query}"
                </CommandEmpty>
              )}

              {!hasSuggestions && query.length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                  Start typing or tap <MapPin className="w-3 h-3 inline-block mx-0.5" /> to find nearby barbers
                </div>
              )}

              {(suggestions?.barbers?.length ?? 0) > 0 && (
                <CommandGroup heading="Barbers">
                  {suggestions!.barbers.map((barber) => (
                    <CommandItem
                      key={barber.barber_id}
                      onSelect={() => handleSelect('barber', barber.name)}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
                        {barber.avatar_url ? (
                          <img
                            src={barber.avatar_url}
                            alt={barber.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">{barber.name}</p>
                        {(barber.location || barber.country_code) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {barber.location || barber.country_code}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {(suggestions?.locations?.length ?? 0) > 0 && (
                <CommandGroup heading="Locations">
                  {suggestions!.locations.map((loc, i) => (
                    <CommandItem
                      key={`loc-${i}`}
                      onSelect={() => handleSelect(loc.type, loc.value)}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                    >
                      <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-foreground">{loc.value}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {(suggestions?.specialties?.length ?? 0) > 0 && (
                <CommandGroup heading="Specialties">
                  {suggestions!.specialties.map((spec, i) => (
                    <CommandItem
                      key={`spec-${i}`}
                      onSelect={() => handleSelect('specialty', spec.value)}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                    >
                      <Scissors className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-foreground">{spec.value}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
};
