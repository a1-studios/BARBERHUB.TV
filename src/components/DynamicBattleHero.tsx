import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Share2, Play, Heart, TrendingUp, Users, DollarSign } from "lucide-react";
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
  const {
    user
  } = useAuth();
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [selectedBarberName, setSelectedBarberName] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Fetch active battle
  const {
    data: battle,
    isLoading: battleLoading
  } = useQuery({
    queryKey: ['activeBattle'],
    queryFn: async () => {
      // First try to find a voting battle
      let {
        data,
        error
      } = await supabase.from('battles').select('*').eq('status', 'voting').not('barber1_id', 'is', null).not('barber2_id', 'is', null).order('created_at', {
        ascending: false
      }).limit(1).maybeSingle();

      // If no voting battle, try upcoming battles
      if (!data) {
        const upcomingResult = await supabase.from('battles').select('*').eq('status', 'upcoming').not('barber1_id', 'is', null).not('barber2_id', 'is', null).order('created_at', {
          ascending: false
        }).limit(1).maybeSingle();
        data = upcomingResult.data;
        error = upcomingResult.error;
      }
      if (error) throw error;
      return data as Battle | null;
    },
    refetchInterval: 5000 // Refresh every 5 seconds for live updates
  });

  // Fetch barber profiles for the battle
  const {
    data: barbers,
    isLoading: barbersLoading
  } = useQuery({
    queryKey: ['battleBarbers', battle?.barber1_id, battle?.barber2_id],
    queryFn: async () => {
      if (!battle?.barber1_id || !battle?.barber2_id) return [];
      const {
        data,
        error
      } = await supabase.from('barber_profiles').select('id, user_id, name').in('user_id', [battle.barber1_id, battle.barber2_id]);
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
      const {
        error
      } = await supabase.from('battle_votes').insert({
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
    return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));
  };
  const getFlagImageUrl = (countryCode?: string) => {
    if (!countryCode) return "";
    return `https://flagcdn.com/w1600/${countryCode.toLowerCase()}.jpg`;
  };
  const calculatePercentages = () => {
    if (!battle) return {
      barber1: 50,
      barber2: 50
    };
    const total = battle.vote_count1 + battle.vote_count2;
    if (total === 0) return {
      barber1: 50,
      barber2: 50
    };
    return {
      barber1: Math.round(battle.vote_count1 / total * 100),
      barber2: Math.round(battle.vote_count2 / total * 100)
    };
  };
  if (battleLoading || barbersLoading) {
    return <div className="pt-24 lg:pt-28 pb-8 px-4 max-w-7xl mx-auto">
        <div className="aspect-video bg-card rounded-2xl shadow-2xl border-2 border-primary/50 animate-glow flex items-center justify-center">
          <div className="animate-pulse text-lg text-muted-foreground">Loading battle...</div>
        </div>
      </div>;
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
    const syntheticBarbers = [{
      id: 'synthetic-1',
      user_id: 'synthetic-barber-1',
      name: "Carlos 'FadeKing' Martinez",
      country_code: 'mx'
    }, {
      id: 'synthetic-2',
      user_id: 'synthetic-barber-2',
      name: "Jamal 'SharpLine' Brooks",
      country_code: 'us'
    }];
    const syntheticPercentages = {
      barber1: 68,
      barber2: 32
    };
    const barber1Photo = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop&crop=face";
    const barber2Photo = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=800&fit=crop&crop=face";
    return <div className="pt-20 sm:pt-24 lg:pt-32 pb-4 sm:pb-6 lg:pb-8 px-1 sm:px-2 lg:px-4 max-w-[95vw] sm:max-w-4xl lg:max-w-5xl mx-auto">
        {/* Main Battle Card - Mobile Optimized */}
        <div className="w-full portrait:aspect-[3/4] sm:portrait:aspect-[4/5] landscape:aspect-[16/10] lg:landscape:aspect-[16/9] bg-card rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl sm:shadow-2xl border border-primary/30 sm:border-2 sm:border-primary/50 animate-glow overflow-hidden relative transform-gpu will-change-transform">
          <div className="h-full flex">
            {/* Barber 1 Side */}
            <div className="flex-1 relative overflow-hidden cursor-pointer group" onClick={() => toast.info("This is a preview battle. Real voting available in live battles!")}>
              {/* Flag Background */}
              <div className="absolute inset-0" style={{
              backgroundImage: `url(${getFlagImageUrl('mx')})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.3
            }} />
              
              {/* Barber Photo - Responsive sizing based on aspect ratio */}
              <div className="absolute top-[12%] left-1/2 transform -translate-x-1/2 w-[20vw] h-[20vw] max-w-[80px] max-h-[80px] sm:max-w-[120px] sm:max-h-[120px] lg:max-w-[160px] lg:max-h-[160px] rounded-full overflow-hidden border-2 sm:border-4 border-white/80 shadow-xl sm:shadow-2xl">
                <img src={barber1Photo} alt={syntheticBarbers[0].name} className="w-full h-full object-cover" />
              </div>

              {/* Video Box */}
              <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 w-[35vw] h-[35vw] max-w-[140px] max-h-[140px] sm:max-w-[200px] sm:max-h-[200px] lg:max-w-[260px] lg:max-h-[260px] bg-black/80 border border-white/30 rounded-lg overflow-hidden shadow-lg">
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <Play className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white/60" />
                </div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
              
              {/* Vote Percentage - Responsive */}
              <div className="absolute top-1 sm:top-2 lg:top-3 left-1 sm:left-2 lg:left-3 z-10">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5">
                  <span className="text-white font-bold text-xs sm:text-sm lg:text-lg xl:text-xl">{syntheticPercentages.barber1}%</span>
                </div>
              </div>

              {/* Vertical Action Buttons - Mobile optimized */}
              <div className="absolute left-1 sm:left-2 lg:left-3 top-[35%] sm:top-[30%] z-10 flex flex-col gap-1 sm:gap-2">
                <button className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" onClick={e => {
                e.stopPropagation();
                handleVote(syntheticBarbers[0].id);
              }}>
                  <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
                <button className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" onClick={e => {
                e.stopPropagation();
                handleShare();
              }}>
                  <Share2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
                <button className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" onClick={e => {
                e.stopPropagation();
                handleDonate(syntheticBarbers[0].id, syntheticBarbers[0].name);
              }}>
                  <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
                <button className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" onClick={e => {
                e.stopPropagation();
                toast.info("Feature coming soon!");
              }}>
                  <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
              </div>

              {/* Barber Info - Responsive text */}
              <div className="absolute bottom-2 sm:bottom-4 lg:bottom-6 left-1 sm:left-2 lg:left-3 z-10 text-white">
                <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-2 mb-0.5 sm:mb-1">
                  
                  <h3 className="text-[10px] xs:text-xs sm:text-sm lg:text-lg xl:text-xl font-bold leading-tight truncate max-w-[15ch] sm:max-w-none">{syntheticBarbers[0].name}</h3>
                </div>
                
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Vertical Advertisement Bar - Mobile optimized */}
            <div className="absolute left-1/2 top-0 bottom-0 transform -translate-x-1/2 z-20 w-10 sm:w-14 lg:w-20">
              <div className="h-full bg-gradient-to-b from-black/80 via-black/60 to-black/80 backdrop-blur-sm border-x border-white/20 sm:border-x-2 flex flex-col">
                {/* Ad Spot 1 */}
                <div className="flex-1 border-b border-white/20 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="text-center">
                    <div className="text-white/60 text-[8px] sm:text-xs font-medium">AD</div>
                    <div className="text-white/40 text-[6px] sm:text-[10px]">SPOT 1</div>
                  </div>
                </div>
                
                {/* VS Center - Mobile optimized */}
                
                
                {/* Ad Spot 2 */}
                <div className="flex-1 border-b border-white/20 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="text-center">
                    <div className="text-white/60 text-[8px] sm:text-xs font-medium">AD</div>
                    <div className="text-white/40 text-[6px] sm:text-[10px]">SPOT 2</div>
                  </div>
                </div>
                
                {/* Ad Spot 3 */}
                <div className="flex-1 border-b border-white/20 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="text-center">
                    <div className="text-white/60 text-[8px] sm:text-xs font-medium">AD</div>
                    <div className="text-white/40 text-[6px] sm:text-[10px]">SPOT 3</div>
                  </div>
                </div>
                
                {/* Ad Spot 4 */}
                <div className="flex-1 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="text-center">
                    <div className="text-white/60 text-[8px] sm:text-xs font-medium">AD</div>
                    <div className="text-white/40 text-[6px] sm:text-[10px]">SPOT 4</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Barber 2 Side */}
            <div className="flex-1 relative overflow-hidden cursor-pointer group" onClick={() => toast.info("This is a preview battle. Real voting available in live battles!")}>
              {/* Flag Background */}
              <div className="absolute inset-0" style={{
              backgroundImage: `url(${getFlagImageUrl('us')})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.3
            }} />
              
              {/* Barber Photo - Responsive sizing based on aspect ratio */}
              <div className="absolute top-[12%] right-1/2 transform translate-x-1/2 w-[20vw] h-[20vw] max-w-[80px] max-h-[80px] sm:max-w-[120px] sm:max-h-[120px] lg:max-w-[160px] lg:max-h-[160px] rounded-full overflow-hidden border-2 sm:border-4 border-white/80 shadow-xl sm:shadow-2xl">
                <img src={barber2Photo} alt={syntheticBarbers[1].name} className="w-full h-full object-cover" />
              </div>

              {/* Video Box */}
              <div className="absolute top-[45%] right-1/2 transform translate-x-1/2 w-[35vw] h-[35vw] max-w-[140px] max-h-[140px] sm:max-w-[200px] sm:max-h-[200px] lg:max-w-[260px] lg:max-h-[260px] bg-black/80 border border-white/30 rounded-lg overflow-hidden shadow-lg">
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <Play className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white/60" />
                </div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/40 to-black/60" />
              
              {/* Vote Percentage - Responsive */}
              <div className="absolute top-1 sm:top-2 lg:top-3 right-1 sm:right-2 lg:right-3 z-10">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5">
                  <span className="text-white font-bold text-xs sm:text-sm lg:text-lg xl:text-xl">{syntheticPercentages.barber2}%</span>
                </div>
              </div>

              {/* Vertical Action Buttons - Mobile optimized */}
              <div className="absolute right-1 sm:right-2 lg:right-3 top-[35%] sm:top-[30%] z-10 flex flex-col gap-1 sm:gap-2">
                <button className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" onClick={e => {
                e.stopPropagation();
                handleVote(syntheticBarbers[1].id);
              }}>
                  <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
                <button className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" onClick={e => {
                e.stopPropagation();
                handleShare();
              }}>
                  <Share2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
                <button className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" onClick={e => {
                e.stopPropagation();
                handleDonate(syntheticBarbers[1].id, syntheticBarbers[1].name);
              }}>
                  <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
                <button className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 shadow-[0_0_10px_rgba(255,165,0,0.4)] hover:shadow-[0_0_15px_rgba(255,165,0,0.7)]" onClick={e => {
                e.stopPropagation();
                toast.info("Feature coming soon!");
              }}>
                  <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </button>
              </div>

              {/* Barber Info - Responsive text */}
              <div className="absolute bottom-2 sm:bottom-4 lg:bottom-6 right-1 sm:right-2 lg:right-3 z-10 text-white text-right">
                <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-2 mb-0.5 sm:mb-1 justify-end">
                  <h3 className="text-[10px] xs:text-xs sm:text-sm lg:text-lg xl:text-xl font-bold leading-tight truncate max-w-[15ch] sm:max-w-none">{syntheticBarbers[1].name}</h3>
                  
                </div>
                
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>

          {/* Action Buttons - Bottom Left */}
          <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 z-10 flex gap-1 sm:gap-2">
            
            
          </div>
        </div>
        
      </div>;
  }
  const barber1 = barbers.find(b => b.user_id === battle.barber1_id);
  const barber2 = barbers.find(b => b.user_id === battle.barber2_id);
  const percentages = calculatePercentages();

  // Default photos for barbers
  const barber1Photo = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&h=800&fit=crop&crop=face";
  const barber2Photo = "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&h=800&fit=crop&crop=face";
  return <div className="pt-24 lg:pt-28 pb-8 px-2 sm:px-4 max-w-5xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Main Battle Card - 30% smaller */}
        <div className="flex-1 max-w-3xl mx-auto lg:mx-0">
          <div className="w-full aspect-[16/9] sm:aspect-[16/10] bg-card rounded-xl sm:rounded-2xl shadow-2xl border-2 border-primary/50 animate-glow overflow-hidden relative transform-gpu will-change-transform">
            <div className="h-full flex">
              {/* Barber 1 Side */}
              <div className="flex-1 relative overflow-hidden cursor-pointer group" onClick={() => handleVote(barber1?.user_id || '')}>
                {/* Flag Background */}
                <div className="absolute inset-0" style={{
                backgroundImage: `url(${getFlagImageUrl('us')})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.3
              }} />
                
                {/* Barber Photo - Smaller and Clearer */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-white/80 shadow-2xl">
                  <img src={barber1Photo} alt={barber1?.name} className="w-full h-full object-cover" />
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
                
                {/* Vote Percentage */}
                <div className="absolute top-3 sm:top-6 left-3 sm:left-6 z-10">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1 sm:py-1.5">
                    <span className="text-white font-bold text-sm sm:text-lg lg:text-xl">{percentages.barber1}%</span>
                  </div>
                </div>

                {/* Vertical Stats Bar */}
                <div className="absolute left-3 sm:left-6 top-1/2 transform -translate-y-1/2 z-10 flex flex-col gap-2 bg-black/60 backdrop-blur-sm rounded-lg p-2">
                  <div className="flex items-center gap-1 text-white text-xs">
                    <TrendingUp className="w-3 h-3" />
                    <span>#5</span>
                  </div>
                  <div className="flex items-center gap-1 text-white text-xs">
                    <Heart className="w-3 h-3" />
                    <span>{battle.vote_count1}</span>
                  </div>
                  <div className="flex items-center gap-1 text-white text-xs">
                    <Users className="w-3 h-3" />
                    <span>1.2k</span>
                  </div>
                  <div className="flex items-center gap-1 text-white text-xs">
                    <DollarSign className="w-3 h-3" />
                    <span>$320</span>
                  </div>
                </div>

                {/* Barber Info */}
                <div className="absolute bottom-12 sm:bottom-20 left-3 sm:left-6 z-10 text-white">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1">
                    <span className="text-lg sm:text-2xl">{getCountryFlag('us')}</span>
                    <h3 className="text-sm sm:text-lg lg:text-xl xl:text-2xl font-bold leading-tight">{barber1?.name}</h3>
                  </div>
                  <p className="text-white/80 text-xs sm:text-sm">Click to vote</p>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Vertical Advertisement Bar */}
              <div className="absolute left-1/2 top-0 bottom-0 transform -translate-x-1/2 z-20 w-16 sm:w-20 lg:w-24">
                <div className="h-full bg-gradient-to-b from-black/80 via-black/60 to-black/80 backdrop-blur-sm border-x-2 border-white/20 flex flex-col">
                  {/* Ad Spot 1 */}
                  <div className="flex-1 border-b border-white/20 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="text-center">
                      <div className="text-white/60 text-xs font-medium">AD</div>
                      <div className="text-white/40 text-[10px]">SPOT 1</div>
                    </div>
                  </div>
                  
                  {/* VS Center */}
                  <div className="h-16 sm:h-20 lg:h-24 flex items-center justify-center bg-white/10">
                    <div className="bg-white rounded-full w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 flex items-center justify-center shadow-2xl border-2 border-primary">
                      <span className="text-xs sm:text-sm font-bold text-primary">VS</span>
                    </div>
                  </div>
                  
                  {/* Ad Spot 2 */}
                  <div className="flex-1 border-b border-white/20 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="text-center">
                      <div className="text-white/60 text-xs font-medium">AD</div>
                      <div className="text-white/40 text-[10px]">SPOT 2</div>
                    </div>
                  </div>
                  
                  {/* Ad Spot 3 */}
                  <div className="flex-1 border-b border-white/20 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="text-center">
                      <div className="text-white/60 text-xs font-medium">AD</div>
                      <div className="text-white/40 text-[10px]">SPOT 3</div>
                    </div>
                  </div>
                  
                  {/* Ad Spot 4 */}
                  <div className="flex-1 flex items-center justify-center group hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="text-center">
                      <div className="text-white/60 text-xs font-medium">AD</div>
                      <div className="text-white/40 text-[10px]">SPOT 4</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barber 2 Side */}
              <div className="flex-1 relative overflow-hidden cursor-pointer group" onClick={() => handleVote(barber2?.user_id || '')}>
                {/* Flag Background */}
                <div className="absolute inset-0" style={{
                backgroundImage: `url(${getFlagImageUrl('ca')})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.3
              }} />
                
                {/* Barber Photo - Smaller and Clearer */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-white/80 shadow-2xl">
                  <img src={barber2Photo} alt={barber2?.name} className="w-full h-full object-cover" />
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/40 to-black/60" />
                
                {/* Vote Percentage */}
                <div className="absolute top-3 sm:top-6 right-3 sm:right-6 z-10">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1 sm:py-1.5">
                    <span className="text-white font-bold text-sm sm:text-lg lg:text-xl">{percentages.barber2}%</span>
                  </div>
                </div>

                {/* Vertical Stats Bar */}
                <div className="absolute right-3 sm:right-6 top-1/2 transform -translate-y-1/2 z-10 flex flex-col gap-2 bg-black/60 backdrop-blur-sm rounded-lg p-2">
                  <div className="flex items-center gap-1 text-white text-xs">
                    <TrendingUp className="w-3 h-3" />
                    <span>#3</span>
                  </div>
                  <div className="flex items-center gap-1 text-white text-xs">
                    <Heart className="w-3 h-3" />
                    <span>{battle.vote_count2}</span>
                  </div>
                  <div className="flex items-center gap-1 text-white text-xs">
                    <Users className="w-3 h-3" />
                    <span>2.1k</span>
                  </div>
                  <div className="flex items-center gap-1 text-white text-xs">
                    <DollarSign className="w-3 h-3" />
                    <span>$890</span>
                  </div>
                </div>

                {/* Barber Info */}
                <div className="absolute bottom-12 sm:bottom-20 right-3 sm:right-6 z-10 text-white text-right">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 justify-end">
                    <h3 className="text-sm sm:text-lg lg:text-xl xl:text-2xl font-bold leading-tight">{barber2?.name}</h3>
                    <span className="text-lg sm:text-2xl">{getCountryFlag('ca')}</span>
                  </div>
                  <p className="text-white/80 text-xs sm:text-sm">Click to vote</p>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>

            {/* Action Buttons - Bottom Left */}
            <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 z-10 flex gap-1 sm:gap-2">
              <Button variant="secondary" size="sm" onClick={e => {
              e.stopPropagation();
              handleDonate(barber1?.user_id || '', barber1?.name || '');
            }} className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm px-2 sm:px-3">
                <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden xs:inline">Donate</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={e => {
              e.stopPropagation();
              handleShare();
            }} className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm px-2 sm:px-3">
                <Share2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden xs:inline">Share</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Comments Panel */}
        <div className="hidden lg:block lg:w-80">
          <BattleCommentsPanel battleId={battle.id} isOpen={isPanelOpen} onToggle={() => setIsPanelOpen(!isPanelOpen)} />
        </div>
      </div>

      {/* Mobile Comments Panel */}
      <div className="lg:hidden mt-6">
        <BattleCommentsPanel battleId={battle.id} isOpen={isPanelOpen} onToggle={() => setIsPanelOpen(!isPanelOpen)} />
      </div>

      {/* Donation Modal */}
      <DonationModal isOpen={isDonationModalOpen} onClose={() => setIsDonationModalOpen(false)} creatorId={selectedBarberId || ''} creatorName={selectedBarberName} />
    </div>;
};