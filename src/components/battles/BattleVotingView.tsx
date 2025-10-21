import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { YouTubeStreamPlayer } from "./YouTubeStreamPlayer";
import { Play, Trophy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BattleVotingViewProps {
  barber1: {
    id: string;
    user_id: string;
    name: string;
    country_code?: string;
    photo: string;
    videoUrl?: string;
    isLive?: boolean;
  };
  barber2: {
    id: string;
    user_id: string;
    name: string;
    country_code?: string;
    photo: string;
    videoUrl?: string;
    isLive?: boolean;
  };
  percentages: {
    barber1: number;
    barber2: number;
  };
  totalVotes: number;
  userVoted?: string | null;
  onVote: (barberId: string) => void;
  onViewProfile: (barberId: string) => void;
  isVoting?: boolean;
}

export const BattleVotingView = ({
  barber1,
  barber2,
  percentages,
  totalVotes,
  userVoted,
  onVote,
  onViewProfile,
  isVoting = false
}: BattleVotingViewProps) => {
  const getFlagImageUrl = (countryCode?: string) => {
    if (!countryCode) return "";
    return `https://flagcdn.com/w1600/${countryCode.toLowerCase()}.jpg`;
  };

  const renderBarberVideo = (barber: typeof barber1 | typeof barber2, isLeft: boolean) => {
    const hasVoted = userVoted === barber.user_id;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative group cursor-pointer flex-1"
        onClick={() => !hasVoted && onVote(barber.user_id)}
      >
        {/* Flag Background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${getFlagImageUrl(barber.country_code)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-${isLeft ? 'r' : 'l'} from-black/80 via-black/40 to-transparent`} />
        
        {/* Vote Percentage - Animated */}
        <motion.div 
          className={`absolute top-4 ${isLeft ? 'left-4' : 'right-4'} z-20`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="bg-white/20 backdrop-blur-md rounded-2xl px-4 py-2 border-2 border-white/30 shadow-2xl"
            animate={{ 
              scale: hasVoted ? [1, 1.1, 1] : 1,
              boxShadow: hasVoted ? "0 0 30px rgba(255, 255, 255, 0.5)" : "0 0 10px rgba(255, 255, 255, 0.2)"
            }}
            transition={{ duration: 0.5 }}
          >
            <motion.span 
              className="text-white font-bold text-3xl"
              key={percentages.barber1} // Re-render on percentage change
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {isLeft ? percentages.barber1 : percentages.barber2}%
            </motion.span>
          </motion.div>
        </motion.div>

        {/* Barber Info */}
        <div className={`absolute top-4 ${isLeft ? 'right-4' : 'left-4'} z-20 text-${isLeft ? 'right' : 'left'}`}>
          <motion.div
            initial={{ x: isLeft ? 20 : -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-white text-2xl font-bold drop-shadow-lg mb-1">
              {barber.name}
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-black/50 text-white">
                <Trophy className="w-3 h-3 mr-1" />
                Competing
              </Badge>
              {barber.isLive && (
                <Badge variant="destructive" className="animate-pulse">
                  🔴 LIVE
                </Badge>
              )}
            </div>
          </motion.div>
        </div>

        {/* Video Display - LARGE (60% of height) */}
        <div className="h-full flex items-center justify-center p-6">
          <motion.div 
            className="w-full max-w-lg h-[60vh] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            {barber.videoUrl ? (
              <YouTubeStreamPlayer 
                videoUrl={barber.videoUrl} 
                isLive={barber.isLive}
                title={barber.name}
                size="large"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <Play className="w-16 h-16 text-white/40" />
              </div>
            )}
          </motion.div>
        </div>

        {/* VOTE Button - Prominent with Glow */}
        <motion.div 
          className={`absolute bottom-8 ${isLeft ? 'left-1/2 -translate-x-1/2' : 'right-1/2 translate-x-1/2'} z-30`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              onVote(barber.user_id);
            }}
            disabled={hasVoted || isVoting}
            className={`
              relative px-8 py-6 text-xl font-bold rounded-2xl
              ${hasVoted 
                ? 'bg-green-500 hover:bg-green-600 border-4 border-green-300' 
                : 'bg-primary hover:bg-primary/90 border-4 border-primary/50'
              }
              shadow-2xl transition-all duration-300
              ${!hasVoted && 'animate-pulse hover:animate-none'}
            `}
            style={{
              boxShadow: hasVoted 
                ? '0 0 40px rgba(34, 197, 94, 0.6), 0 0 80px rgba(34, 197, 94, 0.3)'
                : '0 0 40px rgba(var(--primary-rgb), 0.6), 0 0 80px rgba(var(--primary-rgb), 0.3)'
            }}
          >
            {hasVoted ? '✓ VOTED' : 'VOTE'}
          </Button>
        </motion.div>

        {/* View Profile Button */}
        <div className={`absolute bottom-8 ${isLeft ? 'left-8' : 'right-8'} z-20`}>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(barber.user_id);
            }}
            className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-white/30"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Profile
          </Button>
        </div>

        {/* Voted Overlay */}
        <AnimatePresence>
          {hasVoted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-green-500/20 backdrop-blur-sm z-10 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="bg-green-500 text-white px-8 py-4 rounded-2xl text-2xl font-bold shadow-2xl"
              >
                ✓ Your Vote
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="w-full h-full">
      {/* Vote Counter */}
      <motion.div 
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="bg-black/80 backdrop-blur-md rounded-2xl px-6 py-3 border-2 border-white/30 shadow-2xl">
          <div className="text-center">
            <div className="text-white/60 text-sm font-medium mb-1">Total Votes</div>
            <motion.div 
              key={totalVotes}
              initial={{ scale: 1.3, color: '#fff' }}
              animate={{ scale: 1, color: '#ffffff99' }}
              transition={{ duration: 0.3 }}
              className="text-3xl font-bold text-white"
            >
              {totalVotes.toLocaleString()}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Desktop: Side by Side */}
      <div className="hidden lg:flex h-full">
        {renderBarberVideo(barber1, true)}
        {renderBarberVideo(barber2, false)}
      </div>

      {/* Mobile: Stacked Vertically */}
      <div className="flex flex-col lg:hidden h-full">
        {renderBarberVideo(barber1, true)}
        <div className="h-1 bg-gradient-to-r from-primary via-white to-primary" />
        {renderBarberVideo(barber2, false)}
      </div>
    </div>
  );
};
