import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Crown, Zap, Swords, Loader2, CheckCircle, TrendingUp } from 'lucide-react';
import { TournamentCategory } from '@/config/categories';
import { HoverParticles } from './HoverParticles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ImmersiveBannerCardProps {
  category: TournamentCategory;
  prizePool: number;
  participantCount: number;
  onSelect: (categoryId: string) => void;
  isSelected?: boolean;
  index: number;
  topBarber?: {
    name: string;
    avatar_url: string | null;
  } | null;
  isBarber?: boolean;
  onJoin?: (categoryShortName: string) => void;
  isJoining?: boolean;
  isInQueue?: boolean;
  viewMode?: 'showcase' | 'compete';
}

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(cents / 100);
};

/* ─── Join Button (barbers only, compete mode) ─── */
const JoinButton = ({
  category,
  index,
  isJoining,
  isInQueue,
  onJoin,
}: {
  category: TournamentCategory;
  index: number;
  isJoining?: boolean;
  isInQueue?: boolean;
  onJoin?: (s: string) => void;
}) => (
  <motion.button
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08 + 0.3, duration: 0.35, ease: 'easeOut' }}
    whileHover={!isJoining && !isInQueue ? { scale: 1.08, y: -1 } : {}}
    whileTap={!isJoining && !isInQueue ? { scale: 0.92 } : {}}
    onClick={(e) => {
      e.stopPropagation();
      if (!isJoining && !isInQueue) onJoin?.(category.shortName);
    }}
    disabled={isJoining || isInQueue}
    className={cn(
      'relative mb-1.5 flex items-center gap-1 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wide uppercase transition-all overflow-hidden',
      isInQueue ? 'text-foreground cursor-default' : 'text-primary-foreground cursor-pointer',
      isJoining && 'cursor-wait',
    )}
    style={{
      background: isInQueue
        ? 'linear-gradient(135deg, hsl(187 100% 35%) 0%, hsl(187 80% 25%) 100%)'
        : 'linear-gradient(135deg, hsl(24 100% 55%) 0%, hsl(24 100% 42%) 50%, hsl(15 100% 38%) 100%)',
      border: isInQueue
        ? '1px solid hsl(187 100% 50% / 0.5)'
        : '1px solid hsl(24 100% 65% / 0.6)',
      boxShadow: isInQueue
        ? '0 0 10px hsl(187 100% 50% / 0.3), inset 0 1px 0 hsl(187 100% 70% / 0.2)'
        : '0 2px 8px hsl(24 100% 40% / 0.4), 0 0 12px hsl(24 100% 50% / 0.2), inset 0 1px 0 hsl(24 100% 70% / 0.3)',
    }}
  >
    {/* Shimmer sweep */}
    {!isInQueue && !isJoining && (
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
        style={{
          background: 'linear-gradient(90deg, transparent 0%, hsl(187 100% 80% / 0.15) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
        }}
      />
    )}

    {/* Queued pulse ring */}
    {isInQueue && (
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{ opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ boxShadow: 'inset 0 0 8px hsl(187 100% 50% / 0.4)' }}
      />
    )}

    <span className="relative z-10 flex items-center gap-1">
      {isJoining ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : isInQueue ? (
        <CheckCircle className="w-3 h-3 text-cyan" />
      ) : (
        <Swords className="w-3 h-3" style={{ filter: 'drop-shadow(0 0 3px hsl(187 100% 70% / 0.5))' }} />
      )}
      <span className="hidden sm:inline">
        {isJoining ? '...' : isInQueue ? 'Queued' : 'Join'}
      </span>
    </span>
  </motion.button>
);

/* ─── Compete Content (barbers) ─── */
const CompeteContent = ({
  category,
  topBarber,
  prizePool,
  participantCount,
  isHovered,
}: {
  category: TournamentCategory;
  topBarber?: { name: string; avatar_url: string | null } | null;
  prizePool: number;
  participantCount: number;
  isHovered: boolean;
}) => (
  <div className="relative z-10 flex flex-col items-center text-center pt-6 px-2 h-full">
    <BannerAvatar category={category} topBarber={topBarber} isHovered={isHovered} />

    <h3 className="text-sm sm:text-base font-bold leading-tight text-foreground mb-2">
      {category.shortName}
    </h3>

    <motion.div
      key={prizePool}
      initial={{ scale: 0.9 }}
      animate={{
        scale: isHovered ? [1, 1.05, 1] : 1,
        textShadow: isHovered ? '0 0 20px hsl(187 100% 50%)' : '0 0 10px hsl(187 100% 50% / 0.5)',
      }}
      transition={{ duration: 0.5, repeat: isHovered ? Infinity : 0 }}
      className="text-xl sm:text-2xl font-bold text-cyan"
    >
      {formatCurrency(prizePool)}
    </motion.div>

    <div className="flex items-center gap-1 text-xs text-cyan/70 mt-2">
      <Users className="w-3 h-3" />
      <span>{participantCount} barbers</span>
    </div>

    <div className="text-[10px] text-primary/80 mt-1 font-medium">$50 Entry</div>
  </div>
);

/* ─── Showcase Content (fans / guests) ─── */
const ShowcaseContent = ({
  category,
  topBarber,
  isHovered,
  onSelect,
}: {
  category: TournamentCategory;
  topBarber?: { name: string; avatar_url: string | null } | null;
  isHovered: boolean;
  onSelect: (id: string) => void;
}) => (
  <div className="relative z-10 flex flex-col items-center text-center pt-6 px-2 h-full">
    <BannerAvatar category={category} topBarber={topBarber} isHovered={isHovered} />

    {/* Top barber name */}
    {topBarber?.name && (
      <p className="text-xs font-semibold text-foreground truncate max-w-full mb-1">
        {topBarber.name}
      </p>
    )}

    <h3 className="text-sm sm:text-base font-bold leading-tight text-foreground mb-2">
      {category.shortName}
    </h3>

    {/* Trending badge */}
    <div className="flex items-center gap-1 text-cyan mt-1">
      <TrendingUp className="w-3 h-3 animate-pulse" />
      <span className="text-[10px] uppercase tracking-wider font-bold">Trending</span>
    </div>

    {/* Explore pill */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        onSelect(category.id);
      }}
      className="mt-3 px-4 py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wide border border-cyan/30 text-cyan hover:bg-cyan/10 transition-colors"
    >
      Explore
    </button>
  </div>
);

/* ─── Shared Avatar ─── */
const BannerAvatar = ({
  category,
  topBarber,
  isHovered,
}: {
  category: TournamentCategory;
  topBarber?: { name: string; avatar_url: string | null } | null;
  isHovered: boolean;
}) => (
  <div className="relative mb-3">
    {topBarber?.avatar_url ? (
      <div className="relative">
        <Avatar
          className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-cyan"
          style={{
            boxShadow: isHovered
              ? '0 0 20px hsl(187 100% 50% / 0.6)'
              : '0 0 10px hsl(187 100% 50% / 0.3)',
          }}
        >
          <AvatarImage src={topBarber.avatar_url} alt={topBarber.name} />
          <AvatarFallback className="bg-cyan/20 text-cyan">{topBarber.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Crown className="w-3 h-3 text-primary-foreground" />
        </div>
      </div>
    ) : (
      <div
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl border-2 border-cyan bg-cyan/10"
        style={{
          boxShadow: isHovered
            ? '0 0 20px hsl(187 100% 50% / 0.6)'
            : '0 0 10px hsl(187 100% 50% / 0.3)',
        }}
      >
        {category.icon}
      </div>
    )}
  </div>
);

/* ─── Main Card ─── */
export const ImmersiveBannerCard = ({
  category,
  prizePool,
  participantCount,
  onSelect,
  isSelected,
  index,
  topBarber,
  isBarber,
  onJoin,
  isJoining,
  isInQueue,
  viewMode = 'compete',
}: ImmersiveBannerCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isShowcase = viewMode === 'showcase';

  // Podium: center banner (index 1) is taller in showcase mode
  const podiumExtra = isShowcase && index === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: 'easeOut' }}
      className="relative flex-1 min-w-0 flex flex-col items-center"
      style={{ perspective: '1000px' }}
    >
      {/* Join Button — barbers only, compete mode */}
      {isBarber && !isShowcase && (
        <JoinButton
          category={category}
          index={index}
          isJoining={isJoining}
          isInQueue={isInQueue}
          onJoin={onJoin}
        />
      )}

      {/* Main Banner */}
      <motion.div
        animate={{
          rotateY: isHovered ? 0 : [-0.5, 0.5, -0.5],
          rotateX: isHovered ? 0 : [0.2, -0.2, 0.2],
        }}
        transition={{ duration: 4 + index * 0.3, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onTapStart={() => setIsPressed(true)}
        onTap={() => { setIsPressed(false); onSelect(category.id); }}
        onTapCancel={() => setIsPressed(false)}
        className={cn(
          'relative cursor-pointer transform-gpu w-full',
          isHovered && 'animate-electric-pulse',
          isPressed && 'animate-energy-burst',
          podiumExtra
            ? 'h-[260px] sm:h-[300px] lg:h-[320px] -mt-4'
            : isShowcase
              ? 'h-[240px] sm:h-[280px] lg:h-[300px]'
              : 'h-[220px] sm:h-[260px] lg:h-[280px]',
        )}
      >
        {/* Hover Particles */}
        <HoverParticles isHovered={isHovered} color="hsl(187 100% 50%)" />

        {/* Outer Orange Frame */}
        <div
          className={cn('absolute inset-0 rounded-t-xl transition-all duration-300', isHovered ? 'opacity-100' : 'opacity-80')}
          style={{
            background: 'linear-gradient(180deg, hsl(24 100% 52%) 0%, hsl(24 100% 40%) 100%)',
            clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)',
            boxShadow: isHovered
              ? '0 0 30px hsl(187 100% 50% / 0.5), 0 0 60px hsl(187 100% 50% / 0.3), inset 0 0 20px hsl(24 100% 60% / 0.5)'
              : '0 0 15px hsl(24 100% 50% / 0.3), 0 8px 20px rgba(0,0,0,0.5)',
          }}
        />

        {/* Inner Dark Body */}
        <div
          className="absolute inset-[3px] rounded-t-lg overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, hsl(240 10% 8%) 0%, hsl(240 10% 4%) 70%, hsl(187 100% 20% / 0.3) 100%)',
            clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)',
          }}
        >
          {/* Inner Orange Border Line */}
          <div
            className="absolute inset-[2px] rounded-t-md pointer-events-none"
            style={{
              border: '1px solid hsl(24 100% 52% / 0.6)',
              clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)',
            }}
          />

          {/* Cyan Energy Glow */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            animate={{ height: isHovered ? '60%' : '40%', opacity: isHovered ? 0.8 : 0.5 }}
            transition={{ duration: 0.3 }}
            style={{
              background: 'linear-gradient(180deg, transparent 0%, hsl(187 100% 50% / 0.15) 40%, hsl(187 100% 50% / 0.4) 100%)',
            }}
          />

          {/* Energy Flames */}
          <motion.div
            className="absolute bottom-[15%] left-0 right-0 h-[30%] pointer-events-none"
            animate={{ opacity: isHovered ? [0.6, 1, 0.6] : [0.3, 0.5, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              className="w-full h-full"
              style={{
                background: 'radial-gradient(ellipse at 50% 100%, hsl(187 100% 50% / 0.5) 0%, transparent 70%)',
                filter: 'blur(8px)',
              }}
            />
          </motion.div>

          {/* Lightning at Bottom */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
            animate={{
              opacity: isHovered ? [0.5, 1, 0.5] : 0.3,
              scale: isHovered ? [1, 1.2, 1] : 1,
            }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <Zap
              className="w-5 h-5 text-cyan"
              style={{ filter: isHovered ? 'drop-shadow(0 0 8px hsl(187 100% 50%))' : 'none' }}
            />
          </motion.div>

          {/* Content — mode switch */}
          {isShowcase ? (
            <ShowcaseContent
              category={category}
              topBarber={topBarber}
              isHovered={isHovered}
              onSelect={onSelect}
            />
          ) : (
            <CompeteContent
              category={category}
              topBarber={topBarber}
              prizePool={prizePool}
              participantCount={participantCount}
              isHovered={isHovered}
            />
          )}
        </div>

        {/* Electric Arcs on Hover */}
        {isHovered && (
          <>
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: [0, 1, 0], scaleY: [0, 1, 0] }}
              transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 0.5 }}
              className="absolute left-1 top-1/3 w-0.5 h-8 bg-gradient-to-b from-cyan via-cyan/50 to-transparent rounded-full"
              style={{ filter: 'blur(1px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: [0, 1, 0], scaleY: [0, 1, 0] }}
              transition={{ duration: 0.3, delay: 0.2, repeat: Infinity, repeatDelay: 0.5 }}
              className="absolute right-1 top-1/2 w-0.5 h-6 bg-gradient-to-b from-cyan via-cyan/50 to-transparent rounded-full"
              style={{ filter: 'blur(1px)' }}
            />
          </>
        )}

        {/* Selection glow */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: '0 0 40px hsl(187 100% 50% / 0.6), inset 0 0 30px hsl(187 100% 50% / 0.2)',
              clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)',
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
};
