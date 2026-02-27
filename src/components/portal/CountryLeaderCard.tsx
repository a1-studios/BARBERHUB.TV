import { motion } from 'framer-motion';
import { Crown, Users, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface CountryLeader {
  user_id: string;
  name: string;
  avatar_url: string | null;
  rating: number;
  rank: number;
}

interface CountryLeaderCardProps {
  countryCode: string;
  countryName: string;
  leaders: CountryLeader[];
  totalPoints: number;
  barberCount: number;
  index?: number;
}

const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export const CountryLeaderCard = ({
  countryCode,
  countryName,
  leaders,
  totalPoints,
  barberCount,
  index = 0
}: CountryLeaderCardProps) => {
  const topLeader = leaders[0];
  const runnerUps = leaders.slice(1, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="relative group"
    >
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b from-card to-background p-4 sm:p-5">
        {/* Background Flag Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <span className="text-[120px] sm:text-[150px] select-none">
            {getFlagEmoji(countryCode)}
          </span>
        </div>

        {/* Animated Border Glow */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-cyan-500/20 to-primary/20 blur-sm" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Country Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Animated Flag */}
              <motion.div
                animate={{ 
                  rotateY: [0, 10, 0, -10, 0],
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-3xl sm:text-4xl drop-shadow-lg"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {getFlagEmoji(countryCode)}
              </motion.div>
              <div>
                <h3 className="font-bold text-foreground text-sm sm:text-base">{countryName}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {barberCount} barber{barberCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            {/* Total Points Badge */}
            <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full">
              <Trophy className="w-3 h-3 text-primary" />
              <span className="text-xs font-bold text-primary">{totalPoints} pts</span>
            </div>
          </div>

          {/* Top Leader */}
          {topLeader && (
            <div className="relative mb-3">
              <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-3 border border-yellow-500/20">
                {/* Crown Animation */}
                <motion.div
                  animate={{ 
                    y: [0, -3, 0],
                    rotate: [-5, 5, -5]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -top-3 left-4"
                >
                  <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500/50 drop-shadow-glow" />
                </motion.div>
                
                <Avatar className="h-10 w-10 border-2 border-yellow-500/50">
                  <AvatarImage src={topLeader.avatar_url || undefined} />
                  <AvatarFallback className="bg-yellow-500/20 text-yellow-500 text-sm font-bold">
                    {topLeader.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {topLeader.name}
                  </p>
                  <p className="text-xs text-yellow-500/80">
                    Country Champion • {topLeader.rating} rating
                  </p>
                </div>
                
                <div className="text-right">
                  <span className="text-lg font-bold text-yellow-500">#1</span>
                </div>
              </div>
            </div>
          )}

          {/* Runner Ups */}
          {runnerUps.length > 0 && (
            <div className="space-y-2 mb-4">
              {runnerUps.map((leader, i) => (
                <div
                  key={leader.user_id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/30"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={leader.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {leader.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {leader.name}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    #{i + 2}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Challenge Button */}
          {onChallenge && (
            <Button
              variant="outline"
              size="sm"
              className="w-full group/btn border-primary/30 hover:border-primary hover:bg-primary/10"
              onClick={onChallenge}
            >
              <Swords className="w-4 h-4 mr-2 group-hover/btn:animate-pulse" />
              <span className="text-xs">Challenge This Country</span>
            </Button>
          )}
        </div>

        {/* Shine Effect on Hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
          initial={false}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </motion.div>
      </div>
    </motion.div>
  );
};
