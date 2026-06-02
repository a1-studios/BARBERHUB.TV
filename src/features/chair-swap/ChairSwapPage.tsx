import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import { BottomNavBar } from '@/components/BottomNavBar';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { FEATURES } from '@/config/features';
import { ChairFilterSidebar } from './components/ChairFilterSidebar';
import { ChairMap } from './components/ChairMap';
import { BookingSummarySheet } from './components/BookingSummarySheet';
import { PostChairForm } from './components/PostChairForm';
import { MyChairsList } from './components/MyChairsList';
import { MyBookingsList } from './components/MyBookingsList';
import { useNearbyChairs } from './hooks/useChairListings';
import type { ChairFilters, ChairListing } from './types';
import { Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChairSwapPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isBarber, isLoading: roleLoading } = useUserRole();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [filters, setFilters] = useState<ChairFilters>({
    startDate: null,
    endDate: null,
    amenities: [],
    radiusMiles: 25,
  });
  const [selected, setSelected] = useState<ChairListing | null>(null);

  useEffect(() => {
    if (!FEATURES.CHAIR_SWAP_ENABLED) navigate('/', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!loading && !roleLoading && user && !isBarber) navigate('/', { replace: true });
  }, [user, isBarber, loading, roleLoading, navigate]);

  const { data: listings = [], isLoading: searching } = useNearbyChairs(coords, filters);

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setCoords({ lat: 40.7128, lng: -74.006 }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const sortedListings = useMemo(() => listings, [listings]);

  if (loading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="max-w-6xl mx-auto px-4 pt-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-[hsl(187,80%,55%)] bg-clip-text text-transparent">
            Chair Swap
          </h1>
          <p className="text-xs text-muted-foreground">Rent a station anywhere. Host yours when you're not in the chair.</p>
        </div>

        <Tabs defaultValue="discover" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md bg-card/40">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="post">Post a Chair</TabsTrigger>
            <TabsTrigger value="mine">Mine</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="mt-4">
            <div className="grid lg:grid-cols-[280px_1fr] gap-4">
              <div className="space-y-3">
                <ChairFilterSidebar filters={filters} onChange={setFilters} />
                {!coords && (
                  <Button onClick={requestLocation} className="w-full" variant="secondary">
                    <MapPin className="w-4 h-4 mr-2" /> Use my location
                  </Button>
                )}
              </div>
              <div className="relative h-[60vh] min-h-[400px] rounded-xl overflow-hidden border border-border/40 bg-card/20">
                <ChairMap center={coords} listings={sortedListings} onSelect={setSelected} />
                {searching && (
                  <div className="absolute top-3 left-3 bg-background/85 backdrop-blur px-3 py-1.5 rounded-full text-xs flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Searching…
                  </div>
                )}
                {!coords && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none">
                    Enable location to see chairs near you
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="post" className="mt-4 max-w-2xl">
            <PostChairForm />
          </TabsContent>

          <TabsContent value="mine" className="mt-4 max-w-2xl space-y-6">
            <section>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">My listings</h2>
              <MyChairsList />
            </section>
            <section>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">My bookings</h2>
              <MyBookingsList />
            </section>
          </TabsContent>
        </Tabs>
      </main>

      <BookingSummarySheet
        listing={selected}
        defaultStart={filters.startDate}
        defaultEnd={filters.endDate}
        onClose={() => setSelected(null)}
      />

      <BottomNavBar />
    </div>
  );
}
