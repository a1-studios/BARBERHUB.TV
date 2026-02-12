import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GigApplicationModal } from './GigApplicationModal';
import { Briefcase, MapPin, Heart, Coins, Sparkles } from 'lucide-react';

interface SponsorGig {
  id: string;
  title: string;
  description: string | null;
  budget_bb: number;
  location: string | null;
  charity_percent: number;
  slots: number;
  applications_count: number;
  sponsor_id: string;
}

export function SponsorDealBoard() {
  const [selectedGig, setSelectedGig] = useState<SponsorGig | null>(null);

  const { data: gigs, isLoading } = useQuery({
    queryKey: ['sponsor-gigs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sponsor_gigs' as any)
        .select('*')
        .eq('is_active', true)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SponsorGig[];
    },
  });

  return (
    <section>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Briefcase className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">
          <span className="text-foreground">DEAL</span>
          <span className="text-primary"> BOARD</span>
        </h2>
      </div>

      {/* Empty state */}
      {!isLoading && (!gigs || gigs.length === 0) && (
        <Card className="border-dashed border-muted-foreground/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No gigs available yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Sponsor opportunities will appear here
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-5 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-8 bg-muted rounded w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Gig grid */}
      {gigs && gigs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gigs.map((gig) => (
            <Card
              key={gig.id}
              className="border-border/50 hover:border-primary/30 transition-colors"
            >
              <CardContent className="p-5 space-y-3">
                <h3 className="font-bold text-foreground text-lg leading-tight">
                  {gig.title}
                </h3>

                {gig.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {gig.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                    <Coins className="w-3 h-3" />
                    {gig.budget_bb} BB
                  </span>
                  {gig.location && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {gig.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-pink-500/10 text-pink-400">
                    <Heart className="w-3 h-3" />
                    {gig.charity_percent}% to charity
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    {gig.applications_count}/{gig.slots} filled
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setSelectedGig(gig)}
                    disabled={gig.applications_count >= gig.slots}
                  >
                    {gig.applications_count >= gig.slots ? 'Full' : 'Apply'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Application modal */}
      {selectedGig && (
        <GigApplicationModal
          open={!!selectedGig}
          onOpenChange={(open) => !open && setSelectedGig(null)}
          gig={selectedGig}
        />
      )}
    </section>
  );
}
