import { motion } from 'framer-motion';
import { Users, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BannerChainEffect } from './BannerChainEffect';
import { TournamentCategory } from '@/config/categories';
import { cn } from '@/lib/utils';

interface ImmersiveBannerCardProps {
  category: TournamentCategory;
  prizePool: number;
  participantCount: number;
  onSelect: (categoryId: string) => void;
  isSelected?: boolean;
  index: number;
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
  index
}: ImmersiveBannerCardProps) => {
  const { colorTheme, icon } = category;
  const gradientClasses = colorTheme.gradient;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }}
      className="relative flex-shrink-0"
      style={{ perspective: '1000px' }}
    >
      {/* Chain Effect */}
      <BannerChainEffect colorTheme={colorTheme.glow} />
      
      {/* Main Banner */}
      <motion.div
        animate={{
          rotateY: [-1, 1, -1],
          rotateX: [0.5, -0.5, 0.5],
        }}
        transition={{
          duration: 4 + index * 0.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{ 
          scale: 1.05,
          rotateY: 0,
          rotateX: 0,
          transition: { duration: 0.3 }
        }}
        onClick={() => onSelect(category.id)}
        className={cn(
          "relative w-44 sm:w-52 cursor-pointer",
          "transform-gpu will-change-transform"
        )}
      >
        {/* Banner Body */}
        <div 
          className={cn(
            "relative pt-8 pb-4 px-4 rounded-t-lg",
            "bg-gradient-to-b from-background/90 to-muted/80",
            "border-2 border-b-0",
            isSelected ? "border-primary" : "border-white/10",
            "shadow-2xl overflow-hidden"
          )}
          style={{
            boxShadow: isSelected 
              ? `0 0 30px ${colorTheme.glow}, 0 20px 40px rgba(0,0,0,0.5)`
              : `0 10px 30px rgba(0,0,0,0.4)`
          }}
        >
          {/* Animated glow overlay */}
          <motion.div
            animate={{
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={cn(
              "absolute inset-0 bg-gradient-to-t",
              gradientClasses,
              "opacity-20"
            )}
          />
          
          {/* Fabric texture overlay */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            {/* Category Icon */}
            <motion.div
              animate={{ 
                y: [0, -5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.2
              }}
              className="text-5xl sm:text-6xl"
            >
              {icon}
            </motion.div>
            
            {/* Category Name */}
            <div>
              <h3 
                className={cn(
                  "text-lg sm:text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                  gradientClasses
                )}
              >
                {category.shortName}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {category.vibe}
              </p>
            </div>
            
            {/* Prize Pool */}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-yellow-400">
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-medium">PRIZE POOL</span>
              </div>
              <motion.div
                key={prizePool}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className={cn(
                  "text-2xl sm:text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                  gradientClasses
                )}
              >
                {formatCurrency(prizePool)}
              </motion.div>
            </div>
            
            {/* Participant Count */}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm">{participantCount} Barbers</span>
            </div>
            
            {/* Enter Button */}
            <Button
              size="sm"
              className={cn(
                "w-full mt-2 font-bold uppercase tracking-wider",
                "bg-gradient-to-r",
                gradientClasses,
                "hover:opacity-90 transition-opacity",
                "text-white shadow-lg"
              )}
              style={{
                boxShadow: `0 4px 15px ${colorTheme.glow}`
              }}
            >
              Enter Faction
            </Button>
          </div>
        </div>
        
        {/* Pointed Bottom (Banner Tail) */}
        <div 
          className={cn(
            "relative h-16 bg-gradient-to-b from-muted/80 to-background/60",
            "border-x-2",
            isSelected ? "border-primary" : "border-white/10"
          )}
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 30%, 50% 100%, 0 30%)'
          }}
        >
          {/* Inner shadow for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/40" />
        </div>
        
        {/* Selection indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary"
            style={{
              boxShadow: `0 0 15px ${colorTheme.glow}`
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
};
