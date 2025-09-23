import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Share2, Play, Heart, TrendingUp } from "lucide-react";
import { BattleCommentsPanel } from "./BattleCommentsPanel";
import { DonationModal } from "./DonationModal";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Battle {
  id: string;
  title: string;
  barber1_id: string;
  barber2_id: string;
  vote_count1: number;
  vote_count2: number;
  status: string;
}

interface BarberProfile {
  id: string;
  user_id: string;
  name: string;
}

export const DynamicBattleHero = () => {
  const { user } = useAuth();
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [selectedBarberName, setSelectedBarberName] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Fetch active battle
  const { data: battle, isLoading: battleLoading } = useQuery({
    queryKey: ['activeBattle'],
    queryFn: async () => {
      // First try to find a voting battle
      let { data, error } = await supabase
        .from('battles')
        .select('*')
        .eq('status', 'voting')
        .not('barber1_id', 'is', null)
        .not('barber2_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // If no voting battle, try upcoming battles
      if (!data) {
        const upcomingResult = await supabase
          .from('battles')
          .select('*')
          .eq('status', 'upcoming')
          .not('barber1_id', 'is', null)
          .not('barber2_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        data = upcomingResult.data;
        error = upcomingResult.error;
      }
      
      if (error) throw error;
      return data as Battle | null;
    },
    refetchInterval: 5000 // Refresh every 5 seconds for live updates
  });

  // Fetch barber profiles for the battle
  const { data: barbers, isLoading: barbersLoading } = useQuery({
    queryKey: ['battleBarbers', battle?.barber1_id, battle?.barber2_id],
    queryFn: async () => {
      if (!battle?.barber1_id || !battle?.barber2_id) return [];
      
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('id, user_id, name')
        .in('user_id', [battle.barber1_id, battle.barber2_id]);

      if (error) throw error;
      return data;
    },
    enabled: !!battle?.barber1_id && !!battle?.barber2_id
  });

  const handleVote = async (barberId: string) => {
    if (!user || !battle) {
      toast.error("Please sign in to vote");
      return;
    }

    try {
      const { error } = await supabase
        .from('battle_votes')
        .insert({
          battle_id: battle.id,
          voter_id: user.id,
          submission_id: barberId
        });

      if (error) throw error;
      toast.success("Vote cast successfully!");
    } catch (error) {
      toast.error("Failed to cast vote");
    }
  };

  const handleDonate = (barberId: string, barberName: string) => {
    setSelectedBarberId(barberId);
    setSelectedBarberName(barberName);
    setIsDonationModalOpen(true);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: battle?.title || "Battle",
        text: "Check out this barber battle!",
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const getCountryFlag = (countryCode: string) => {
    if (!countryCode) return "🏳️";
    return countryCode.toUpperCase().replace(/./g, char => 
      String.fromCodePoint(127397 + char.charCodeAt(0))
    );
  };

  const getFlagImageUrl = (countryCode?: string) => {
    if (!countryCode) return "";
    return `https://flagcdn.com/w1600/${countryCode.toLowerCase()}.jpg`;
  };

  const calculatePercentages = () => {
    if (!battle) return { barber1: 50, barber2: 50 };
    const total = battle.vote_count1 + battle.vote_count2;
    if (total === 0) return { barber1: 50, barber2: 50 };
    
    return {
      barber1: Math.round((battle.vote_count1 / total) * 100),
      barber2: Math.round((battle.vote_count2 / total) * 100)
    };
  };

  if (battleLoading || barbersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="animate-pulse text-lg">Loading battle...</div>
      </div>
    );
  }

  // Create synthetic placeholder data when no real battle exists
  if (!battle || !barbers || barbers.length < 2) {
    const syntheticBattle = {
      id: 'synthetic-battle',
      title: 'Epic Head-to-Head Battle',
      vote_count1: 68,
      vote_count2: 32,
      status: 'live'
    };
    
    const syntheticBarbers = [
      {
        id: 'synthetic-1',
        user_id: 'synthetic-barber-1',
        name: "Carlos 'FadeKing' Martinez",
        country_code: 'mx'
      },
      {
        id: 'synthetic-2', 
        user_id: 'synthetic-barber-2',
        name: "Jamal 'SharpLine' Brooks",
        country_code: 'us'
      }
    ];

    const syntheticPercentages = { barber1: 68, barber2: 32 };
    const barber1Photo = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop&crop=face";
    const barber2Photo = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=800&fit=crop&crop=face";

    return (
      <div className="min-h-screen flex">
        {/* Main Battle Area */}
        <div className="flex-1 relative">
          <div className="h-screen flex">
            {/* Barber 1 Side */}
            <div 
              className="flex-1 relative overflow-hidden cursor-pointer group"
              onClick={() => toast.info("This is a preview battle. Real voting available in live battles!")}
              style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url(${getFlagImageUrl('mx')}), url(${barber1Photo})`,
                backgroundSize: 'cover, cover, cover',
                backgroundPosition: 'center, center, center',
                backgroundBlendMode: 'normal, overlay, normal'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/20 to-black/60" />
              
              {/* Vote Percentage */}
              <div className="absolute top-8 left-8 z-10">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                  <span className="text-white font-bold text-2xl">{syntheticPercentages.barber1}%</span>
                </div>
              </div>

              {/* Barber Info */}
              <div className="absolute bottom-32 left-8 z-10 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">{getCountryFlag('mx')}</span>
                  <h3 className="text-3xl font-bold">{syntheticBarbers[0].name}</h3>
                </div>
                <p className="text-white/80">Click to vote</p>
              </div>

              {/* Action Buttons */}
              <div className="absolute bottom-8 left-8 z-10 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDonate('synthetic-barber-1', syntheticBarbers[0].name);
                  }}
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
                >
                  <Heart className="w-4 h-4 mr-1" />
                  Donate
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* VS Center */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="bg-white rounded-full w-24 h-24 flex items-center justify-center shadow-2xl border-4 border-primary">
                <div className="text-center">
                  <Play className="w-8 h-8 text-primary mx-auto mb-1" />
                  <span className="text-xs font-bold text-primary">VS</span>
                </div>
              </div>
            </div>

            {/* Barber 2 Side */}
            <div 
              className="flex-1 relative overflow-hidden cursor-pointer group"
              onClick={() => toast.info("This is a preview battle. Real voting available in live battles!")}
              style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url(${getFlagImageUrl('us')}), url(${barber2Photo})`,
                backgroundSize: 'cover, cover, cover',
                backgroundPosition: 'center, center, center',
                backgroundBlendMode: 'normal, overlay, normal'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/20 to-black/60" />
              
              {/* Vote Percentage */}
              <div className="absolute top-8 right-8 z-10">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                  <span className="text-white font-bold text-2xl">{syntheticPercentages.barber2}%</span>
                </div>
              </div>

              {/* Barber Info */}
              <div className="absolute bottom-32 right-8 z-10 text-white text-right">
                <div className="flex items-center gap-3 mb-2 justify-end">
                  <h3 className="text-3xl font-bold">{syntheticBarbers[1].name}</h3>
                  <span className="text-4xl">{getCountryFlag('us')}</span>
                </div>
                <p className="text-white/80">Click to vote</p>
              </div>

              {/* Action Buttons */}
              <div className="absolute bottom-8 right-8 z-10 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDonate('synthetic-barber-2', syntheticBarbers[1].name);
                  }}
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
                >
                  <Heart className="w-4 h-4 mr-1" />
                  Donate
                </Button>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>

          {/* Quick Action Buttons at Bottom */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="flex gap-4">
              <Button 
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                onClick={() => window.location.href = '/battles'}
              >
                View All Battles
              </Button>
              <Button 
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                onClick={() => window.location.href = '/portal'}
              >
                Battle Portal
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const barber1 = barbers.find(b => b.user_id === battle.barber1_id);
  const barber2 = barbers.find(b => b.user_id === battle.barber2_id);
  const percentages = calculatePercentages();
  
  // Default photos for barbers
  const barber1Photo = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&h=800&fit=crop&crop=face";
  const barber2Photo = "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&h=800&fit=crop&crop=face";

  return (
    <div className="min-h-screen flex">
      {/* Main Battle Area */}
      <div className="flex-1 relative">
        <div className="h-screen flex">
          {/* Barber 1 Side */}
          <div 
            className="flex-1 relative overflow-hidden cursor-pointer group"
            onClick={() => handleVote(barber1?.user_id || '')}
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url(${getFlagImageUrl('us')}), url(${barber1Photo})`,
              backgroundSize: 'cover, cover, cover',
              backgroundPosition: 'center, center, center',
              backgroundBlendMode: 'normal, overlay, normal'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/20 to-black/60" />
            
            {/* Vote Percentage */}
            <div className="absolute top-8 left-8 z-10">
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                <span className="text-white font-bold text-2xl">{percentages.barber1}%</span>
              </div>
            </div>

            {/* Barber Info */}
            <div className="absolute bottom-32 left-8 z-10 text-white">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{getCountryFlag('us')}</span>
                <h3 className="text-3xl font-bold">{barber1?.name}</h3>
              </div>
              <p className="text-white/80">Click to vote</p>
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-8 left-8 z-10 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDonate(barber1?.user_id || '', barber1?.name || '');
                }}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
              >
                <Heart className="w-4 h-4 mr-1" />
                Donate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>

            {/* Hover Effect */}
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* VS Center */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="bg-white rounded-full w-24 h-24 flex items-center justify-center shadow-2xl border-4 border-primary">
              <div className="text-center">
                <Play className="w-8 h-8 text-primary mx-auto mb-1" />
                <span className="text-xs font-bold text-primary">VS</span>
              </div>
            </div>
          </div>

          {/* Barber 2 Side */}
          <div 
            className="flex-1 relative overflow-hidden cursor-pointer group"
            onClick={() => handleVote(barber2?.user_id || '')}
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url(${getFlagImageUrl('ca')}), url(${barber2Photo})`,
              backgroundSize: 'cover, cover, cover',
              backgroundPosition: 'center, center, center',
              backgroundBlendMode: 'normal, overlay, normal'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/20 to-black/60" />
            
            {/* Vote Percentage */}
            <div className="absolute top-8 right-8 z-10">
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                <span className="text-white font-bold text-2xl">{percentages.barber2}%</span>
              </div>
            </div>

            {/* Barber Info */}
            <div className="absolute bottom-32 right-8 z-10 text-white text-right">
              <div className="flex items-center gap-3 mb-2 justify-end">
                <h3 className="text-3xl font-bold">{barber2?.name}</h3>
                <span className="text-4xl">{getCountryFlag('ca')}</span>
              </div>
              <p className="text-white/80">Click to vote</p>
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-8 right-8 z-10 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDonate(barber2?.user_id || '', barber2?.name || '');
                }}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
              >
                <Heart className="w-4 h-4 mr-1" />
                Donate
              </Button>
            </div>

            {/* Hover Effect */}
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </div>

        {/* Mobile Layout (Hidden on Desktop) */}
        <div className="lg:hidden absolute inset-0 bg-background/95 backdrop-blur-sm flex flex-col">
          <div className="flex-1 p-6 flex flex-col justify-center space-y-6">
            {/* Battle Title */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">{battle.title}</h2>
              <div className="flex items-center justify-center gap-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Live Battle</span>
              </div>
            </div>

            {/* Barber 1 */}
            <div 
              className="bg-card rounded-lg p-6 border cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleVote(barber1?.user_id || '')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCountryFlag('us')}</span>
                  <h3 className="text-xl font-bold">{barber1?.name}</h3>
                </div>
                <div className="text-2xl font-bold text-primary">{percentages.barber1}%</div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDonate(barber1?.user_id || '', barber1?.name || '');
                  }}
                >
                  <Heart className="w-4 h-4 mr-1" />
                  Donate
                </Button>
              </div>
            </div>

            {/* VS */}
            <div className="text-center">
              <div className="inline-block bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center font-bold text-xl">
                VS
              </div>
            </div>

            {/* Barber 2 */}
            <div 
              className="bg-card rounded-lg p-6 border cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleVote(barber2?.user_id || '')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCountryFlag('ca')}</span>
                  <h3 className="text-xl font-bold">{barber2?.name}</h3>
                </div>
                <div className="text-2xl font-bold text-primary">{percentages.barber2}%</div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDonate(barber2?.user_id || '', barber2?.name || '');
                  }}
                >
                  <Heart className="w-4 h-4 mr-1" />
                  Donate
                </Button>
              </div>
            </div>

            {/* Share Button */}
            <div className="text-center">
              <Button onClick={handleShare} className="w-full">
                <Share2 className="w-4 h-4 mr-2" />
                Share Battle
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Panel (Desktop Only) */}
      <div className="hidden lg:block">
        <BattleCommentsPanel 
          battleId={battle.id}
          isOpen={isPanelOpen}
          onToggle={() => setIsPanelOpen(!isPanelOpen)}
        />
      </div>

      {/* Donation Modal */}
      <DonationModal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        creatorId={selectedBarberId || ''}
        creatorName={selectedBarberName}
      />
    </div>
  );
};