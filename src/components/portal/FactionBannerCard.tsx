import { useState } from 'react';
import { motion } from 'framer-motion';
import { TournamentCategory } from '@/config/categories';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FactionBannerCardProps {
  category: TournamentCategory;
  prizePool: number;
  participantCount: number;
  weeklyGrowth?: number;
  onSelect: (categoryId: string) => void;
  isSelected?: boolean;
  index: number;
}

export const FactionBannerCard = ({
  category,
  prizePool,
  participantCount,
  weeklyGrowth = 0,
  onSelect,
  isSelected,
  index
}: FactionBannerCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(cents / 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, rotateX: -15 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ 
        delay: index * 0.1,
        type: 'spring',
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ 
        y: -10,
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative"
    >
      {/* Chain/Hanging Effect */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-1 z-10">
        <div className="w-1 h-6 bg-gradient-to-b from-muted-foreground/50 to-muted-foreground/20 rounded-full" />
        <div className="w-1 h-6 bg-gradient-to-b from-muted-foreground/50 to-muted-foreground/20 rounded-full" />
      </div>
      
      {/* Banner Card */}
      <div
        className={cn(
          "relative w-48 sm:w-56 overflow-hidden rounded-b-xl transition-all duration-300",
          "border border-border/50 backdrop-blur-sm",
          isSelected && "ring-2 ring-primary"
        )}
        style={{
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 92%, 50% 100%, 0% 92%)',
          background: `linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--card)/0.8) 100%)`
        }}
      >
        {/* Glow Effect */}
        <motion.div
          animate={{
            opacity: isHovered ? 0.6 : 0.2,
            scale: isHovered ? 1.1 : 1
          }}
          className={cn(
            "absolute inset-0 blur-2xl -z-10",
            `bg-gradient-to-br ${category.colorTheme.gradient}`
          )}
        />

        {/* Top Accent Bar */}
        <div 
          className={cn(
            "h-2 w-full bg-gradient-to-r",
            category.colorTheme.gradient
          )}
        />

        {/* Content */}
        <div className="p-4 pb-8 text-center space-y-3">
          {/* Icon */}
          <motion.div
            animate={{ 
              scale: isHovered ? 1.2 : 1,
              rotate: isHovered ? [0, -5, 5, 0] : 0
            }}
            transition={{ duration: 0.3 }}
            className="text-4xl sm:text-5xl mx-auto"
          >
            {category.icon}
          </motion.div>

          {/* Category Name */}
          <div>
            <h3 
              className={cn(
                "font-bold text-sm sm:text-base uppercase tracking-wider bg-clip-text text-transparent",
                `bg-gradient-to-r ${category.colorTheme.gradient}`
              )}
            >
              {category.shortName}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {category.vibe}
            </p>
          </div>

          {/* Divider */}
          <div 
            className={cn(
              "h-px w-3/4 mx-auto bg-gradient-to-r opacity-50",
              category.colorTheme.gradient
            )}
          />

          {/* Prize Pool */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Prize Pool
            </p>
            <motion.p
              key={prizePool}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "text-xl sm:text-2xl font-bold bg-clip-text text-transparent",
                `bg-gradient-to-r ${category.colorTheme.gradient}`
              )}
            >
              {formatCurrency(prizePool)}
            </motion.p>
          </div>

          {/* Stats Row */}
          <div className="flex justify-center gap-4 text-[10px]">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{participantCount}</span>
            </div>
            {weeklyGrowth > 0 && (
              <div className="flex items-center gap-1 text-green-500">
                <TrendingUp className="w-3 h-3" />
                <span>+{formatCurrency(weeklyGrowth)}</span>
              </div>
            )}
          </div>

          {/* Enter Button */}
          <Button
            onClick={() => onSelect(category.id)}
            size="sm"
            className={cn(
              "w-full mt-2 font-bold uppercase tracking-wider text-xs",
              "bg-gradient-to-r hover:opacity-90 transition-opacity",
              category.colorTheme.gradient,
              "text-white shadow-lg"
            )}
            style={{
              boxShadow: isHovered 
                ? `0 0 20px ${category.colorTheme.glow}` 
                : 'none'
            }}
          >
            Enter Faction
          </Button>
        </div>

        {/* Bottom Point Decoration */}
        <div 
          className={cn(
            "absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45",
            "bg-gradient-to-br",
            category.colorTheme.gradient
          )}
          style={{ marginBottom: '-6px' }}
        />
      </div>
    </motion.div>
  );
};

export default FactionBannerCard;
