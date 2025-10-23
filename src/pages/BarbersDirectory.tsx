import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, MapPin, Scissors } from 'lucide-react';
import { BarberProfileCard } from '@/components/barber/BarberProfileCard';
import { BackButton } from '@/components/ui/BackButton';

export default function BarbersDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [liveFilter, setLiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

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

  // Get unique specialties and countries
  const specialties = [...new Set(barbers?.map(b => b.specialty).filter(Boolean))] as string[];
  const countries = [...new Set(barbers?.map(b => b.country_code).filter(Boolean))] as string[];

  // Filter and sort barbers
  const filteredBarbers = barbers?.filter(barber => {
    const matchesSearch = 
      barber.barber_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barber.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barber.specialty?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSpecialty = specialtyFilter === 'all' || barber.specialty === specialtyFilter;
    const matchesCountry = countryFilter === 'all' || barber.country_code === countryFilter;
    const matchesLive = liveFilter === 'all' || 
      (liveFilter === 'live' && barber.is_live) ||
      (liveFilter === 'offline' && !barber.is_live);

    return matchesSearch && matchesSpecialty && matchesCountry && matchesLive;
  });

  // Sort barbers
  const sortedBarbers = filteredBarbers?.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.barber_name || '').localeCompare(b.barber_name || '');
      case 'experience':
        return (b.years_experience || 0) - (a.years_experience || 0);
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

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

              {/* Specialty Filter */}
              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="experience">Experience</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

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
