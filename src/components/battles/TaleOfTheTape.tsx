import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Clock, Trophy, Zap } from "lucide-react";
import { useState, useEffect } from "react";

interface BarberData {
  id: string;
  user_id: string;
  name: string;
  display_name?: string;
  avatar_url?: string;
  country_code?: string;
  specialty?: string;
  rating?: number;
}

interface TaleOfTheTapeProps {
  barber1: BarberData;
  barber2: BarberData;
  battleId: string;
  startsAt: Date;
  category?: string;
}

export const TaleOfTheTape = ({ barber1, barber2, battleId, startsAt, category }: TaleOfTheTapeProps) => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = startsAt.getTime() - now;

      if (distance > 0) {
        setTimeLeft({
          hours: Math.floor(distance / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startsAt]);

  const getFlagUrl = (code?: string) => code ? `https://flagcdn.com/w80/${code.toLowerCase()}.png` : '';

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80" />
      
      {/* Content */}
      <div className="relative z-10 text-center space-y-4 sm:space-y-6">
        {/* Category Badge */}
        {category && (
          <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/40 rounded-full px-4 py-1.5">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-primary font-semibold text-sm">{category}</span>
          </div>
        )}

        {/* Main Title */}
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
          TALE OF THE <span className="text-primary">TAPE</span>
        </h2>

        {/* Barber Face-off */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 lg:gap-12">
          {/* Barber 1 */}
          <div 
            className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate(`/barber/${barber1.user_id}`)}
          >
            <div className="relative">
              <Avatar className="w-20 h-20 sm:w-28 sm:h-28 lg:w-36 lg:h-36 border-4 border-red-500/60 shadow-xl shadow-red-500/20">
                <AvatarImage src={barber1.avatar_url} alt={barber1.display_name} />
                <AvatarFallback className="text-2xl bg-red-900/50">{barber1.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              {barber1.country_code && (
                <img 
                  src={getFlagUrl(barber1.country_code)} 
                  alt={barber1.country_code}
                  className="absolute -bottom-2 -right-2 w-8 h-6 rounded shadow-lg border border-white/20"
                />
              )}
            </div>
            <h3 className="mt-3 text-white font-bold text-sm sm:text-base lg:text-lg">{barber1.display_name || barber1.name}</h3>
            {barber1.specialty && (
              <p className="text-muted-foreground text-xs">{barber1.specialty}</p>
            )}
          </div>

          {/* VS Badge */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-2xl shadow-primary/40 animate-pulse">
              <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <span className="text-white font-black text-xl sm:text-2xl mt-2">VS</span>
          </div>

          {/* Barber 2 */}
          <div 
            className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate(`/barber/${barber2.user_id}`)}
          >
            <div className="relative">
              <Avatar className="w-20 h-20 sm:w-28 sm:h-28 lg:w-36 lg:h-36 border-4 border-blue-500/60 shadow-xl shadow-blue-500/20">
                <AvatarImage src={barber2.avatar_url} alt={barber2.display_name} />
                <AvatarFallback className="text-2xl bg-blue-900/50">{barber2.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              {barber2.country_code && (
                <img 
                  src={getFlagUrl(barber2.country_code)} 
                  alt={barber2.country_code}
                  className="absolute -bottom-2 -left-2 w-8 h-6 rounded shadow-lg border border-white/20"
                />
              )}
            </div>
            <h3 className="mt-3 text-white font-bold text-sm sm:text-base lg:text-lg">{barber2.display_name || barber2.name}</h3>
            {barber2.specialty && (
              <p className="text-muted-foreground text-xs">{barber2.specialty}</p>
            )}
          </div>
        </div>

        {/* Countdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-cyan">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">STARTS IN</span>
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <div className="bg-black/60 backdrop-blur border border-cyan/30 rounded-lg px-3 py-2 sm:px-4 sm:py-3">
              <span className="text-2xl sm:text-4xl lg:text-5xl font-black text-white font-mono">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <p className="text-[10px] text-muted-foreground uppercase">Hours</p>
            </div>
            <span className="text-2xl sm:text-4xl text-primary font-bold">:</span>
            <div className="bg-black/60 backdrop-blur border border-cyan/30 rounded-lg px-3 py-2 sm:px-4 sm:py-3">
              <span className="text-2xl sm:text-4xl lg:text-5xl font-black text-white font-mono">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <p className="text-[10px] text-muted-foreground uppercase">Mins</p>
            </div>
            <span className="text-2xl sm:text-4xl text-primary font-bold">:</span>
            <div className="bg-black/60 backdrop-blur border border-cyan/30 rounded-lg px-3 py-2 sm:px-4 sm:py-3">
              <span className="text-2xl sm:text-4xl lg:text-5xl font-black text-white font-mono">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <p className="text-[10px] text-muted-foreground uppercase">Secs</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <p className="text-muted-foreground text-sm sm:text-base italic">
          Get your votes ready! 🔥
        </p>

        <Button 
          onClick={() => navigate(`/battle/${battleId}`)}
          className="bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold px-8 py-3 text-lg border border-cyan/20"
        >
          View Battle Details
        </Button>
      </div>
    </div>
  );
};
