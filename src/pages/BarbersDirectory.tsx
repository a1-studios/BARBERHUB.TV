import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Scissors, Crown, Sparkles, Star, Diamond } from 'lucide-react';
import { BarberProfileCard } from '@/components/barber/BarberProfileCard';
import { BackButton } from '@/components/ui/BackButton';
import { QuickBookBanner } from '@/components/fan/QuickBookBanner';
import { SPECIALTY_TAGS, parseSpecialties } from '@/config/specialtyTags';
import { cn } from '@/lib/utils';

export default function BarbersDirectory() {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [liveFilter, setLiveFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortBy, setSortBy] = useState('tier');

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

  // Create a map of user_id to tier for quick lookup
  const tierMap = new Map(subscriptionTiers?.map(t => [t.user_id, t.active_subscription_tier]) || []);

  // Get unique specialties and countries
  const countries = [...new Set(barbers?.map(b => b.country_code).filter(Boolean))] as string[];

  // Filter and sort barbers
  const filteredBarbers = barbers?.filter(barber => {
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

  // Sort barbers
  const sortedBarbers = filteredBarbers?.sort((a, b) => {
    // Helper to get tier priority (Gold > Silver > Bronze > Free)
    const getTierPriority = (userId: string) => {
      const tier = tierMap.get(userId)?.toLowerCase();
      if (tier === 'diamond') return 5;
      if (tier === 'gold') return 4;
      if (tier === 'silver') return 3;
      if (tier === 'bronze') return 2;
      return 1; // free
    };

    switch (sortBy) {
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <BackButton className="mb-6" />

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            <span className="text-primary">Barber</span> Directory
          </h1>
          <p className="text-muted-foreground">
            Discover talented barbers from around the world
          </p>
        </div>

        {/* Quick Book Banner */}
        <QuickBookBanner />

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="lg:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search barbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Tier Filter */}
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="diamond">
                    <div className="flex items-center gap-2">
                      <Diamond className="w-4 h-4 text-cyan-400" />
                      Diamond
                    </div>
                  </SelectItem>
                  <SelectItem value="gold">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      Gold
                    </div>
                  </SelectItem>
                  <SelectItem value="silver">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-slate-400" />
                      Silver
                    </div>
                  </SelectItem>
                  <SelectItem value="bronze">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-orange-500" />
                      Bronze
                    </div>
                  </SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>

              {/* Country Filter */}
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Live Status Filter */}
              <Select value={liveFilter} onValueChange={setLiveFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Live Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="live">🔴 Live Now</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort and Results Count */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {sortedBarbers?.length || 0} barbers found
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tier">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      Tier (High to Low)
                    </div>
                  </SelectItem>
                  <SelectItem value="followers">Most Followers</SelectItem>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="experience">Experience</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Specialty Pill Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSpecialtyFilter('all')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
              specialtyFilter === 'all'
                ? 'bg-primary/20 border-primary/50 text-primary shadow-sm'
                : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/30'
            )}
          >
            All Specialties
          </button>
          {SPECIALTY_TAGS.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSpecialtyFilter(specialtyFilter === tag.id ? 'all' : tag.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                specialtyFilter === tag.id
                  ? 'bg-primary/20 border-primary/50 text-primary shadow-sm'
                  : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/30'
              )}
            >
              <span>{tag.emoji}</span>
              <span>{tag.label}</span>
            </button>
          ))}
        </div>

        {/* Results */}
        {isLoading ? (
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
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Scissors className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No barbers found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or search terms
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
}
