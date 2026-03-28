import { Button } from "@/components/ui/button";
import { HLSVideoPlayer } from "./HLSVideoPlayer";
import { Trophy, Crown, ExternalLink, Handshake, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BattleResultsViewProps {
  barber1: {
    id: string;
    user_id: string;
    name: string;
    country_code?: string;
    photo: string;
    videoUrl?: string;
    votes: number;
  };
  barber2: {
    id: string;
    user_id: string;
    name: string;
    country_code?: string;
    photo: string;
    videoUrl?: string;
    votes: number;
  };
  winner: 'barber1' | 'barber2' | 'tie';
  percentages: {
    barber1: number;
    barber2: number;
  };
  onViewProfile: (barberId: string) => void;
  pendingPayouts?: Array<{ user_id: string; amount_bb: number; scheduled_release_at: string; payout_type: string }>;
}

export const BattleResultsView = ({
  barber1,
  barber2,
  winner,
  percentages,
  onViewProfile,
  pendingPayouts = []
}: BattleResultsViewProps) => {
  const getFlagImageUrl = (countryCode?: string) => {
    if (!countryCode) return "";
    return `https://flagcdn.com/w1600/${countryCode.toLowerCase()}.jpg`;
  };

  const isDraw = winner === 'tie';
  const isWinner = (barberKey: 'barber1' | 'barber2') => !isDraw && winner === barberKey;

  const getDaysUntilRelease = (releaseDate: string) => {
    const now = new Date();
    const release = new Date(releaseDate);
    const diff = Math.ceil((release.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getPayoutForBarber = (userId: string) => {
    return pendingPayouts.find(p => p.user_id === userId);
  };
  
  const renderBarber = (barber: typeof barber1 | typeof barber2, isLeft: boolean, barberKey: 'barber1' | 'barber2') => {
    const won = isWinner(barberKey);
    const payout = getPayoutForBarber(barber.user_id);
    
    return (
      <div className={`relative flex-1 p-6 ${
        isDraw ? 'bg-gradient-to-br from-amber-500/15 to-orange-500/10' :
        won ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10' : 'bg-black/40'
      }`}>
        {/* Flag Background */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(${getFlagImageUrl(barber.country_code)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Winner Crown or Draw Badge */}
        {won && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-yellow-500 text-black px-6 py-3 rounded-full font-bold text-xl shadow-2xl flex items-center gap-2 animate-pulse">
              <Crown className="w-6 h-6" />
              WINNER
            </div>
          </div>
        )}
        {isDraw && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-amber-500 text-black px-6 py-3 rounded-full font-bold text-xl shadow-2xl flex items-center gap-2">
              <Handshake className="w-6 h-6" />
              DRAW
            </div>
          </div>
        )}
        
        {/* Barber Info */}
        <div className={`relative z-10 text-center mb-4 ${(won || isDraw) ? 'mt-16' : 'mt-4'}`}>
          <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-2xl">
            <img src={barber.photo} alt={barber.name} className="w-full h-full object-cover" />
          </div>
          <h3 className="text-white text-2xl font-bold mb-2">{barber.name}</h3>
          <Badge variant={won ? "default" : isDraw ? "default" : "secondary"} className={
            won ? "bg-yellow-500 text-black" : isDraw ? "bg-amber-500 text-black" : ""
          }>
            <Trophy className="w-4 h-4 mr-1" />
            {barber.votes.toLocaleString()} votes
          </Badge>
        </div>

        {/* Vote Percentage */}
        <div className="relative z-10 text-center mb-4">
          <div className={`inline-block px-8 py-4 rounded-2xl ${
            won ? 'bg-yellow-500/20 border-2 border-yellow-500' :
            isDraw ? 'bg-amber-500/20 border-2 border-amber-500' : 'bg-white/10'
          }`}>
            <span className={`text-5xl font-bold ${
              won ? 'text-yellow-400' : isDraw ? 'text-amber-400' : 'text-white'
            }`}>
              {isLeft ? percentages.barber1 : percentages.barber2}%
            </span>
          </div>
        </div>

        {/* Pending Payout */}
        {payout && (
          <div className="relative z-10 text-center mb-4">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-300">
                {payout.amount_bb} BB — releases in {getDaysUntilRelease(payout.scheduled_release_at)} days
              </span>
            </div>
          </div>
        )}

        {/* Video */}
        {barber.videoUrl && (
          <div className="relative z-10 w-full max-w-sm mx-auto h-96 rounded-xl overflow-hidden shadow-2xl">
            <HLSVideoPlayer 
              src={barber.videoUrl} 
              title={barber.name}
              size="large"
            />
          </div>
        )}

        {/* View Profile Button */}
        <div className="relative z-10 mt-6 text-center">
          <Button
            variant={won ? "default" : "secondary"}
            onClick={() => onViewProfile(barber.user_id)}
            className={won ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Profile
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row">
      {/* Desktop: Side by Side */}
      <div className="hidden lg:flex w-full">
        {renderBarber(barber1, true, 'barber1')}
        <div className="w-1 bg-gradient-to-b from-primary via-white to-primary" />
        {renderBarber(barber2, false, 'barber2')}
      </div>

      {/* Mobile: Stacked */}
      <div className="flex flex-col lg:hidden w-full">
        {renderBarber(barber1, true, 'barber1')}
        <div className="h-1 bg-gradient-to-r from-primary via-white to-primary" />
        {renderBarber(barber2, false, 'barber2')}
      </div>
    </div>
  );
};
