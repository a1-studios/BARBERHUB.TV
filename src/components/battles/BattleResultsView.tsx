import { Button } from "@/components/ui/button";
import { HLSVideoPlayer } from "./HLSVideoPlayer";
import { Trophy, Crown, ExternalLink } from "lucide-react";
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
}

export const BattleResultsView = ({
  barber1,
  barber2,
  winner,
  percentages,
  onViewProfile
}: BattleResultsViewProps) => {
  const getFlagImageUrl = (countryCode?: string) => {
    if (!countryCode) return "";
    return `https://flagcdn.com/w1600/${countryCode.toLowerCase()}.jpg`;
  };

  const isWinner = (barberKey: 'barber1' | 'barber2') => winner === barberKey;
  
  const renderBarber = (barber: typeof barber1 | typeof barber2, isLeft: boolean, barberKey: 'barber1' | 'barber2') => {
    const won = isWinner(barberKey);
    
    return (
      <div className={`relative flex-1 p-6 ${won ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10' : 'bg-black/40'}`}>
        {/* Flag Background */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(${getFlagImageUrl(barber.country_code)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Winner Crown */}
        {won && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-yellow-500 text-black px-6 py-3 rounded-full font-bold text-xl shadow-2xl flex items-center gap-2 animate-pulse">
              <Crown className="w-6 h-6" />
              WINNER
            </div>
          </div>
        )}
        
        {/* Barber Info */}
        <div className={`relative z-10 text-center mb-4 ${won ? 'mt-16' : 'mt-4'}`}>
          <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-2xl">
            <img src={barber.photo} alt={barber.name} className="w-full h-full object-cover" />
          </div>
          <h3 className="text-white text-2xl font-bold mb-2">{barber.name}</h3>
          <Badge variant={won ? "default" : "secondary"} className={won ? "bg-yellow-500 text-black" : ""}>
            <Trophy className="w-4 h-4 mr-1" />
            {barber.votes.toLocaleString()} votes
          </Badge>
        </div>

        {/* Vote Percentage */}
        <div className="relative z-10 text-center mb-6">
          <div className={`inline-block px-8 py-4 rounded-2xl ${won ? 'bg-yellow-500/20 border-2 border-yellow-500' : 'bg-white/10'}`}>
            <span className={`text-5xl font-bold ${won ? 'text-yellow-400' : 'text-white'}`}>
              {isLeft ? percentages.barber1 : percentages.barber2}%
            </span>
          </div>
        </div>

        {/* Video */}
        {barber.videoUrl && (
          <div className="relative z-10 w-full max-w-sm mx-auto h-96 rounded-xl overflow-hidden shadow-2xl">
            <YouTubeStreamPlayer 
              videoUrl={barber.videoUrl} 
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

      {/* Results Summary Overlay */}
      {winner === 'tie' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
            <h2 className="text-4xl font-bold mb-4">It's a Tie!</h2>
            <p className="text-xl text-muted-foreground">
              Both barbers received {percentages.barber1}% of the votes
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
