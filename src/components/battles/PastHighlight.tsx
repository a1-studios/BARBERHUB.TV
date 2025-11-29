import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trophy, Play, Crown } from "lucide-react";

interface BarberData {
  id: string;
  user_id: string;
  name: string;
  display_name?: string;
  avatar_url?: string;
  country_code?: string;
}

interface PastHighlightProps {
  winner: BarberData;
  loser: BarberData;
  battleId: string;
  battleTitle: string;
  prizeAmount?: number;
  highlightVideoUrl?: string;
  completedAt?: Date;
}

export const PastHighlight = ({ 
  winner, 
  loser, 
  battleId, 
  battleTitle, 
  prizeAmount,
  highlightVideoUrl,
  completedAt 
}: PastHighlightProps) => {
  const navigate = useNavigate();

  const getFlagUrl = (code?: string) => code ? `https://flagcdn.com/w80/${code.toLowerCase()}.png` : '';

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Gold/Victory gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-yellow-900/30 via-black/70 to-black/90" />
      
      {/* Animated particles/confetti effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400/60 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center space-y-4 sm:space-y-6">
        {/* Crown & Title */}
        <div className="flex flex-col items-center gap-2">
          <Crown className="w-10 h-10 sm:w-14 sm:h-14 text-yellow-400 animate-pulse" />
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            PREVIOUS <span className="text-yellow-400">CHAMPION</span>
          </h2>
        </div>

        {/* Winner Showcase */}
        <div 
          className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
          onClick={() => navigate(`/barber/${winner.user_id}`)}
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-2xl animate-pulse" />
            
            <Avatar className="relative w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 border-4 border-yellow-400 shadow-2xl shadow-yellow-400/40">
              <AvatarImage src={winner.avatar_url} alt={winner.display_name} />
              <AvatarFallback className="text-3xl bg-yellow-900/50 text-yellow-400">
                {winner.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            {/* Trophy badge */}
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-6 h-6 text-black" />
            </div>
            
            {winner.country_code && (
              <img 
                src={getFlagUrl(winner.country_code)} 
                alt={winner.country_code}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-7 rounded shadow-lg border border-white/20"
              />
            )}
          </div>
          
          <h3 className="mt-4 text-white font-black text-lg sm:text-xl lg:text-2xl">
            {winner.display_name || winner.name}
          </h3>
          <p className="text-yellow-400 font-semibold text-sm sm:text-base">WINNER</p>
        </div>

        {/* Battle Info */}
        <div className="space-y-2">
          <p className="text-white/80 text-sm sm:text-base font-medium">{battleTitle}</p>
          
          <div className="flex items-center justify-center gap-4 text-muted-foreground text-xs sm:text-sm">
            <span>vs {loser.display_name || loser.name}</span>
            {prizeAmount && prizeAmount > 0 && (
              <>
                <span>•</span>
                <span className="text-primary font-semibold">${prizeAmount} Prize</span>
              </>
            )}
          </div>

          {completedAt && (
            <p className="text-muted-foreground text-xs">
              {completedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button 
            onClick={() => navigate(`/battle/${battleId}`)}
            className="bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold px-6 py-2.5 border border-cyan/20"
          >
            <Play className="w-4 h-4 mr-2" />
            Watch Full Replay
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => navigate(`/barber/${winner.user_id}`)}
            className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10"
          >
            View Champion Profile
          </Button>
        </div>
      </div>
    </div>
  );
};
