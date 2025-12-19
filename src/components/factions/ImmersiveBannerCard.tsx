import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Crown } from 'lucide-react';
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
  const { colorTheme } = category;
  const themeColor = colorTheme.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.08,
        duration: 0.4,
        ease: "easeOut"
      }}
      className="relative flex-shrink-0"
      style={{ perspective: '800px' }}
    >
      {/* Simple Chain */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
        <div 
          className="w-4 h-2 rounded-t-full"
          style={{ backgroundColor: themeColor }}
        />
        <div 
          className="w-2 h-3 border rounded-full"
          style={{ borderColor: themeColor }}
        />
      </div>
      
      {/* Main Banner */}
      <motion.div
        animate={{
          rotateY: [-1, 1, -1],
          rotateX: [0.3, -0.3, 0.3],
        }}
        transition={{
          duration: 4 + index * 0.3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{ 
          scale: 1.08,
          rotateY: 0,
          rotateX: 0,
          transition: { duration: 0.2 }
        }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={() => onSelect(category.id)}
        className="relative w-24 sm:w-28 lg:w-32 cursor-pointer transform-gpu"
      >
        {/* Hover Particles */}
        <HoverParticles isHovered={isHovered} color={themeColor} />

        {/* Banner Body */}
        <div 
          className={cn(
            "relative pt-5 pb-3 px-2 rounded-t-lg overflow-hidden",
            "bg-gradient-to-b from-background/95 to-muted/90",
            "border-2 border-b-0",
            isSelected ? "border-primary" : "border-white/10"
          )}
          style={{
            boxShadow: isHovered || isSelected
              ? `0 0 25px ${themeColor}, 0 15px 30px rgba(0,0,0,0.5)`
              : `0 8px 20px rgba(0,0,0,0.4)`
          }}
        >
          {/* Holographic overlay */}
          <motion.div
            className="absolute inset-0 opacity-0 pointer-events-none"
            animate={{
              opacity: isHovered ? 0.3 : 0,
              backgroundPosition: isHovered ? ['0% 0%', '100% 100%'] : '0% 0%'
            }}
            transition={{ duration: 0.8 }}
            style={{
              background: `linear-gradient(135deg, 
                transparent 0%, 
                ${themeColor}40 25%, 
                transparent 50%, 
                ${themeColor}40 75%, 
                transparent 100%)`,
              backgroundSize: '200% 200%'
            }}
          />

          {/* Theme color glow at top */}
          <div 
            className="absolute top-0 left-0 right-0 h-16 opacity-30"
            style={{
              background: `linear-gradient(180deg, ${themeColor} 0%, transparent 100%)`
            }}
          />
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center space-y-2">
            {/* Top Barber Avatar or Category Icon */}
            <div className="relative">
              {topBarber?.avatar_url ? (
                <div className="relative">
                  <Avatar 
                    className="w-12 h-12 sm:w-14 sm:h-14 border-2"
                    style={{ borderColor: themeColor }}
                  >
                    <AvatarImage src={topBarber.avatar_url} alt={topBarber.name} />
                    <AvatarFallback style={{ backgroundColor: themeColor }}>
                      {topBarber.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Crown badge */}
                  <div 
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: themeColor }}
                  >
                    <Crown className="w-3 h-3 text-background" />
                  </div>
                </div>
              ) : (
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-2xl border-2"
                  style={{ 
                    borderColor: themeColor,
                    backgroundColor: `${themeColor}20`
                  }}
                >
                  {category.icon}
                </div>
              )}
            </div>
            
            {/* Category Name */}
            <h3 
              className="text-xs sm:text-sm font-bold leading-tight"
              style={{ color: themeColor }}
            >
              {category.shortName}
            </h3>
            
            {/* Prize Pool */}
            <motion.div
              key={prizePool}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-lg sm:text-xl font-bold"
              style={{ color: themeColor }}
            >
              {formatCurrency(prizePool)}
            </motion.div>
            
            {/* Participant Count */}
            <div 
              className="flex items-center gap-1 text-xs"
              style={{ color: `${themeColor}cc` }}
            >
              <Users className="w-3 h-3" />
              <span>{participantCount}</span>
            </div>
            
            {/* Entry Fee Indicator */}
            <div 
              className="text-[10px] opacity-60"
              style={{ color: themeColor }}
            >
              $50 Entry
            </div>
          </div>
        </div>
        
        {/* Pointed V-Bottom */}
        <div 
          className="relative h-10"
          style={{
            background: `linear-gradient(180deg, hsl(var(--muted) / 0.9) 0%, ${themeColor}40 100%)`,
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            borderLeft: `2px solid ${isSelected ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.1)'}`,
            borderRight: `2px solid ${isSelected ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.1)'}`
          }}
        />
        
        {/* Selection indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
            style={{
              backgroundColor: themeColor,
              boxShadow: `0 0 10px ${themeColor}`
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
};
