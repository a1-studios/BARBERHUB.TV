import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Scissors, Crown, Sparkles, Star, Diamond, Map as MapIcon, List, SlidersHorizontal, ChevronDown, X, MapPin } from 'lucide-react';
import { BarberProfileCard } from '@/components/barber/BarberProfileCard';
import { BackButton } from '@/components/ui/BackButton';
import { SPECIALTY_TAGS, parseSpecialties } from '@/config/specialtyTags';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BarberMapDirectory } from '@/components/map/BarberMapDirectory';
import { BarberLocationSearch } from '@/components/map/BarberLocationSearch';
import { RadiusToggle, RADIUS_OPTIONS, type RadiusMiles } from '@/components/barber/RadiusToggle';
import { TopBarbersNearbyRail, type RankedNearbyBarber } from '@/components/barber/TopBarbersNearbyRail';
import { calculateVisibilityScore, DEFAULT_WEIGHTS } from '@/lib/visibilityScore';
import { usePlatformState } from '@/hooks/usePlatformState';
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

const RADIUS_LS_KEY = 'barbers:radiusMiles';

export default function BarbersDirectory() {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [liveFilter, setLiveFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortBy, setSortBy] = useState('distance');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Radius (persisted)
  const [radiusMiles, setRadiusMiles] = useState<RadiusMiles>(() => {
    if (typeof window === 'undefined') return 25;
    const stored = Number(localStorage.getItem(RADIUS_LS_KEY));
    return (RADIUS_OPTIONS as readonly number[]).includes(stored) ? (stored as RadiusMiles) : 25;
  });
  useEffect(() => {
    localStorage.setItem(RADIUS_LS_KEY, String(radiusMiles));
  }, [radiusMiles]);

  // Location search state
  const [locationFilter, setLocationFilter] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [nearbyBarbers, setNearbyBarbers] = useState<NearbyBarber[] | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const { value: enforceTiersVal } = usePlatformState('enforce_tiers');
  const enforceTiers = enforceTiersVal === 'true';

  // Pre-populate filters from URL params
  useEffect(() => {
    const search = searchParams.get('search');
    const country = searchParams.get('country');
    if (search) setSearchTerm(search);
    if (country) setCountryFilter(country);
  }, [searchParams]);

  // Fetch all barbers using unified view
  const { data: barbers, isLoading } = useQuery({
    queryKey: ['barbers-directory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_barber_profiles')
        .select('*')
        .order('barber_created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch subscription tiers for all barbers
  const { data: subscriptionTiers } = useQuery({
    queryKey: ['barbers-subscription-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('user_id, active_subscription_tier');
      if (error) throw error;
      return data;
    }
  });

  const tierMap = new Map(subscriptionTiers?.map(t => [t.user_id, t.active_subscription_tier]) || []);
  const countries = [...new Set(barbers?.map(b => b.country_code).filter(Boolean))] as string[];

  // Run nearby query
  const runNearbyQuery = async (lat: number, lng: number, label: string) => {
    setLocationFilter({ lat, lng, label });
    setLocationLoading(true);
    try {
      const { data, error } = await supabase.rpc('find_barbers_nearby', {
        p_lat: lat,
        p_lng: lng,
        p_radius_miles: radiusMiles,
        p_enforce_tiers: enforceTiers,
      });
      if (error) throw error;
      setNearbyBarbers((data as NearbyBarber[]) || []);
      if (!data?.length) toast.info(`No barbers within ${radiusMiles} miles — try expanding your radius.`);
    } catch (err: any) {
      toast.error(err.message || 'Location search failed');
    } finally {
      setLocationLoading(false);
    }
  };

  // Re-fetch when radius changes if a location is active
  useEffect(() => {
    if (locationFilter) {
      runNearbyQuery(locationFilter.lat, locationFilter.lng, locationFilter.label);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusMiles]);

  const handleLocationFound = (lat: number, lng: number, label: string) => {
    runNearbyQuery(lat, lng, label);
  };

  const clearLocationFilter = () => {
    setLocationFilter(null);
    setNearbyBarbers(null);
    setSortBy('tier');
  };

  const nearbyBarberIdSet = nearbyBarbers ? new Set(nearbyBarbers.map(b => b.user_id)) : null;
  const nearbyDistanceMap = nearbyBarbers
    ? new Map(nearbyBarbers.map(b => [b.user_id, b.distance_miles]))
    : null;

  // Top barbers nearby — ranked by visibility score
  const topNearby: RankedNearbyBarber[] = useMemo(() => {
    if (!nearbyBarbers?.length) return [];
    return nearbyBarbers
      .map((b) => ({
        user_id: b.user_id,
        barber_id: b.barber_id,
        name: b.name,
        avatar_url: b.avatar_url,
        distance_miles: b.distance_miles,
        active_subscription_tier: b.active_subscription_tier,
        score: calculateVisibilityScore(
          { active_subscription_tier: b.active_subscription_tier },
          DEFAULT_WEIGHTS,
        ),
      }))
      .sort((a, b) => b.score - a.score || a.distance_miles - b.distance_miles)
      .slice(0, 8);
  }, [nearbyBarbers]);

  // Filter and sort barbers
  const filteredBarbers = barbers?.filter(barber => {
    if (nearbyBarberIdSet && !nearbyBarberIdSet.has(barber.user_id)) return false;

    const matchesSearch =
      barber.barber_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barber.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barber.specialty?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecialty = specialtyFilter === 'all' || parseSpecialties(barber.specialty).includes(specialtyFilter);
    const matchesCountry = countryFilter === 'all' || barber.country_code === countryFilter;
    const matchesLive = liveFilter === 'all' ||
      (liveFilter === 'live' && barber.is_live) ||
      (liveFilter === 'offline' && !barber.is_live);

    const barberTier = tierMap.get(barber.user_id);
    const matchesTier = tierFilter === 'all' ||
      (tierFilter === 'free' && !barberTier) ||
      (tierFilter !== 'free' && barberTier?.toLowerCase() === tierFilter);

    return matchesSearch && matchesSpecialty && matchesCountry && matchesLive && matchesTier;
  });

  const sortedBarbers = filteredBarbers?.sort((a, b) => {
    const getTierPriority = (userId: string) => {
      const tier = tierMap.get(userId)?.toLowerCase();
      if (tier === 'diamond') return 5;
      if (tier === 'gold') return 4;
      if (tier === 'silver') return 3;
      if (tier === 'bronze') return 2;
      return 1;
    };
    switch (sortBy) {
      case 'distance':
        if (nearbyDistanceMap) {
          return (nearbyDistanceMap.get(a.user_id) ?? 999) - (nearbyDistanceMap.get(b.user_id) ?? 999);
        }
        return 0;
      case 'tier':
        return getTierPriority(b.user_id) - getTierPriority(a.user_id);
      case 'name':
        return (a.barber_name || '').localeCompare(b.barber_name || '');
      case 'experience':
        return (b.years_experience || 0) - (a.years_experience || 0);
      case 'followers':
        return (b.follower_count || 0) - (a.follower_count || 0);
      case 'recent':
      default:
        return new Date(b.barber_created_at || 0).getTime() - new Date(a.barber_created_at || 0).getTime();
    }
  });

  const activeCount =
    (searchTerm ? 1 : 0) +
    (specialtyFilter !== 'all' ? 1 : 0) +
    (tierFilter !== 'all' ? 1 : 0) +
    (countryFilter !== 'all' ? 1 : 0) +
    (liveFilter !== 'all' ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6 pt-[calc(env(safe-area-inset-top)+72px)]">
        <BackButton className="mb-4" />

        {/* View toggle + description */}
        <div className="flex items-end justify-between gap-3 mb-4">
          <p className="text-xs text-muted-foreground">
            Discover talented barbers from around the world
          </p>
          <div className="flex gap-1 bg-muted rounded-lg p-1 shrink-0">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('map')}
              aria-label="Map view"
            >
              <MapIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {viewMode === 'map' && (
          <div className="mb-8">
            <BarberMapDirectory />
          </div>
        )}

        {viewMode === 'list' && (
          <>
            {/* 1. Sticky search bar at top */}
            <div className="sticky top-[calc(env(safe-area-inset-top)+56px)] z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search barbers, specialties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 rounded-full bg-muted/40 border-border focus-visible:ring-primary"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Specialty pills — horizontal scroll quick filter */}
            <div className="mt-3 -mx-4 px-4">
              <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2 scrollbar-hide">
                <button
                  onClick={() => setSpecialtyFilter('all')}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    specialtyFilter === 'all'
                      ? 'bg-primary text-primary-foreground border-primary shadow'
                      : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  All
                </button>
                {SPECIALTY_TAGS.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setSpecialtyFilter(specialtyFilter === tag.id ? 'all' : tag.id)}
                    className={cn(
                      'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      specialtyFilter === tag.id
                        ? 'bg-primary text-primary-foreground border-primary shadow'
                        : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <span>{tag.emoji}</span>
                    <span>{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Location + radius chip row */}
            <div className="mt-2 mb-4 rounded-2xl border border-border bg-card p-3 space-y-3">
              {locationFilter ? (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary rounded-full px-3 py-1.5 text-xs font-medium">
                    <MapPin className="h-3 w-3" />
                    Near {locationFilter.label}
                    <button onClick={clearLocationFilter} className="hover:opacity-70">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <RadiusToggle value={radiusMiles} onChange={setRadiusMiles} />
                </div>
              ) : (
                <>
                  <BarberLocationSearch
                    onLocationFound={handleLocationFound}
                    onClear={clearLocationFilter}
                    activeLabel={null}
                    loading={locationLoading}
                    compact
                  />
                  <div className="flex justify-end">
                    <RadiusToggle value={radiusMiles} onChange={setRadiusMiles} />
                  </div>
                </>
              )}
            </div>

            {/* 4. Top Barbers Nearby — ranked rail */}
            {locationFilter && (
              <div className="mb-4">
                <TopBarbersNearbyRail barbers={topNearby} loading={locationLoading} />
              </div>
            )}

            {/* 5. Result count + sort + filters */}
            <Collapsible className="mb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {sortedBarbers?.length || 0} barbers
                  {locationFilter ? ` within ${radiusMiles} mi` : ''}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {nearbyBarbers && <SelectItem value="distance">Nearest first</SelectItem>}
                      <SelectItem value="tier">Tier (high → low)</SelectItem>
                      <SelectItem value="followers">Most followers</SelectItem>
                      <SelectItem value="recent">Most recent</SelectItem>
                      <SelectItem value="name">Name (A–Z)</SelectItem>
                      <SelectItem value="experience">Experience</SelectItem>
                    </SelectContent>
                  </Select>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 group">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">Filters</span>
                      {activeCount > 0 && (
                        <Badge className="h-4 min-w-[16px] px-1 bg-primary text-primary-foreground text-[10px]">
                          {activeCount}
                        </Badge>
                      )}
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent className="mt-3 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Select value={tierFilter} onValueChange={setTierFilter}>
                        <SelectTrigger><SelectValue placeholder="Tier" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Tiers</SelectItem>
                          <SelectItem value="diamond"><div className="flex items-center gap-2"><Diamond className="w-4 h-4 text-cyan-400" />Diamond</div></SelectItem>
                          <SelectItem value="gold"><div className="flex items-center gap-2"><Crown className="w-4 h-4 text-yellow-500" />Gold</div></SelectItem>
                          <SelectItem value="silver"><div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-slate-400" />Silver</div></SelectItem>
                          <SelectItem value="bronze"><div className="flex items-center gap-2"><Star className="w-4 h-4 text-orange-500" />Bronze</div></SelectItem>
                          <SelectItem value="free">Free</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={countryFilter} onValueChange={setCountryFilter}>
                        <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Countries</SelectItem>
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>{country}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={liveFilter} onValueChange={setLiveFilter}>
                        <SelectTrigger><SelectValue placeholder="Live Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="live">🔴 Live Now</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {activeCount > 0 && (
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => {
                            setSearchTerm('');
                            setSpecialtyFilter('all');
                            setTierFilter('all');
                            setCountryFilter('all');
                            setLiveFilter('all');
                          }}
                        >
                          <X className="h-3 w-3" />
                          Reset all
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* 6. Results grid */}
            {isLoading || locationLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="w-16 h-16 bg-primary/20 rounded-full mb-4" />
                      <div className="h-4 bg-primary/20 rounded w-3/4 mb-2" />
                      <div className="h-4 bg-primary/20 rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sortedBarbers && sortedBarbers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedBarbers.map((barber) => (
                  <BarberProfileCard
                    key={barber.barber_id}
                    barberId={barber.barber_id!}
                    userId={barber.user_id!}
                    layout="full"
                    showVideo={false}
                    showActions={true}
                    distanceMiles={nearbyDistanceMap?.get(barber.user_id!) ?? undefined}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Scissors className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No barbers found</h3>
                  <p className="text-muted-foreground text-sm">
                    {locationFilter
                      ? `Try expanding your radius beyond ${radiusMiles} mi or adjust your filters.`
                      : 'Try adjusting your filters or search terms'}
                  </p>
                  {locationFilter && radiusMiles < 100 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        const next = RADIUS_OPTIONS[
                          Math.min(RADIUS_OPTIONS.indexOf(radiusMiles) + 1, RADIUS_OPTIONS.length - 1)
                        ];
                        setRadiusMiles(next);
                      }}
                    >
                      Expand radius
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
