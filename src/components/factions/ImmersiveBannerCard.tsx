import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Crown, Zap } from 'lucide-react';
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
}

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(cents / 100);
};

export const ImmersiveBannerCard = ({
  category,
  prizePool,
  participantCount,
  onSelect,
  isSelected,
  index,
  topBarber
}: ImmersiveBannerCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.08,
        duration: 0.4,
        ease: "easeOut"
      }}
      className="relative flex-1 min-w-0"
      style={{ perspective: '1000px' }}
    >
      
      {/* Main Banner */}
      <motion.div
        animate={{
          rotateY: isHovered ? 0 : [-0.5, 0.5, -0.5],
          rotateX: isHovered ? 0 : [0.2, -0.2, 0.2],
        }}
        transition={{
          duration: 4 + index * 0.3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{ 
          scale: 1.05,
          transition: { duration: 0.2 }
        }}
        whileTap={{ scale: 0.98 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onTapStart={() => setIsPressed(true)}
        onTap={() => {
          setIsPressed(false);
          onSelect(category.id);
        }}
        onTapCancel={() => setIsPressed(false)}
        className={cn(
          "relative cursor-pointer transform-gpu h-[220px] sm:h-[260px] lg:h-[280px]",
          isHovered && "animate-electric-pulse",
          isPressed && "animate-energy-burst"
        )}
      >
        {/* Hover Particles - Electric style */}
        <HoverParticles isHovered={isHovered} color="hsl(187 100% 50%)" />

        {/* Outer Orange Frame - Double Border Effect */}
        <div 
          className={cn(
            "absolute inset-0 rounded-t-xl transition-all duration-300",
            isHovered ? "opacity-100" : "opacity-80"
          )}
          style={{
            background: 'linear-gradient(180deg, hsl(24 100% 52%) 0%, hsl(24 100% 40%) 100%)',
            clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)',
            boxShadow: isHovered 
              ? '0 0 30px hsl(187 100% 50% / 0.5), 0 0 60px hsl(187 100% 50% / 0.3), inset 0 0 20px hsl(24 100% 60% / 0.5)'
              : '0 0 15px hsl(24 100% 50% / 0.3), 0 8px 20px rgba(0,0,0,0.5)'
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

          {/* Cyan Energy Glow from Bottom */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            animate={{
              height: isHovered ? '60%' : '40%',
              opacity: isHovered ? 0.8 : 0.5,
            }}
            transition={{ duration: 0.3 }}
            style={{
              background: 'linear-gradient(180deg, transparent 0%, hsl(187 100% 50% / 0.15) 40%, hsl(187 100% 50% / 0.4) 100%)',
            }}
          />

          {/* Animated Energy Flames */}
          <motion.div
            className="absolute bottom-[15%] left-0 right-0 h-[30%] pointer-events-none"
            animate={{
              opacity: isHovered ? [0.6, 1, 0.6] : [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div 
              className="w-full h-full"
              style={{
                background: `radial-gradient(ellipse at 50% 100%, hsl(187 100% 50% / 0.5) 0%, transparent 70%)`,
                filter: 'blur(8px)',
              }}
            />
          </motion.div>

          {/* Lightning Effect at Bottom Point */}
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
              style={{ 
                filter: isHovered ? 'drop-shadow(0 0 8px hsl(187 100% 50%))' : 'none',
              }}
            />
          </motion.div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center pt-6 px-2 h-full">
            {/* Top Barber Avatar or Category Icon */}
            <div className="relative mb-3">
              {topBarber?.avatar_url ? (
                <div className="relative">
                  <Avatar 
                    className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-cyan"
                    style={{ 
                      boxShadow: isHovered 
                        ? '0 0 20px hsl(187 100% 50% / 0.6)' 
                        : '0 0 10px hsl(187 100% 50% / 0.3)'
                    }}
                  >
                    <AvatarImage src={topBarber.avatar_url} alt={topBarber.name} />
                    <AvatarFallback className="bg-cyan/20 text-cyan">
                      {topBarber.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Crown badge */}
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
                      : '0 0 10px hsl(187 100% 50% / 0.3)'
                  }}
                >
                  {category.icon}
                </div>
              )}
            </div>
            
            {/* Category Name */}
            <h3 className="text-sm sm:text-base font-bold leading-tight text-foreground mb-2">
              {category.shortName}
            </h3>
            
            {/* Prize Pool */}
            <motion.div
              key={prizePool}
              initial={{ scale: 0.9 }}
              animate={{ 
                scale: isHovered ? [1, 1.05, 1] : 1,
                textShadow: isHovered ? '0 0 20px hsl(187 100% 50%)' : '0 0 10px hsl(187 100% 50% / 0.5)'
              }}
              transition={{ duration: 0.5, repeat: isHovered ? Infinity : 0 }}
              className="text-xl sm:text-2xl font-bold text-cyan"
            >
              {formatCurrency(prizePool)}
            </motion.div>
            
            {/* Participant Count */}
            <div className="flex items-center gap-1 text-xs text-cyan/70 mt-2">
              <Users className="w-3 h-3" />
              <span>{participantCount} barbers</span>
            </div>
            
            {/* Entry Fee Indicator */}
            <div className="text-[10px] text-primary/80 mt-1 font-medium">
              $50 Entry
            </div>
          </div>
        </div>

        {/* Electric Arc Effects on Hover */}
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
        
        {/* Selection indicator glow */}
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
