import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import bbCoinLogo from '@/assets/bb-coin-logo.png';

interface RotatingBBCoinProps {
  avatarUrl?: string | null;
  displayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  animate?: boolean;
  onClick?: () => void;
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64
};

export const RotatingBBCoin = ({
  avatarUrl,
  displayName = 'U',
  size = 'md',
  animate = true,
  onClick
}: RotatingBBCoinProps) => {
  const pixelSize = sizeMap[size];
  const initial = (displayName || 'U').charAt(0).toUpperCase();

  return (
    <div
      className="relative cursor-pointer"
      style={{ 
        perspective: '1000px',
        width: pixelSize,
        height: pixelSize
      }}
      onClick={onClick}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={animate ? { rotateY: 360 } : undefined}
        transition={animate ? {
          duration: 6,
          repeat: Infinity,
          ease: 'linear'
        } : undefined}
      >
        {/* Front Face - BB Logo */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ 
            backfaceVisibility: 'hidden',
            boxShadow: '0 0 12px rgba(249, 115, 22, 0.4), inset 0 0 8px rgba(0, 0, 0, 0.3)'
          }}
        >
          <img
            src={bbCoinLogo}
            alt="BB Coin"
            className="w-full h-full object-cover"
          />
          {/* Metallic shine overlay */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10 pointer-events-none"
          />
        </div>

        {/* Back Face - User Avatar */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden border-2 border-primary/60"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            boxShadow: '0 0 12px rgba(249, 115, 22, 0.4), inset 0 0 8px rgba(0, 0, 0, 0.3)'
          }}
        >
          <Avatar className="w-full h-full">
            <AvatarImage src={avatarUrl || undefined} className="object-cover" />
            <AvatarFallback 
              className="bg-gradient-to-br from-primary/40 to-primary/20 text-primary-foreground font-bold"
              style={{ fontSize: pixelSize * 0.4 }}
            >
              {initial}
            </AvatarFallback>
          </Avatar>
          {/* Metallic shine overlay */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10 pointer-events-none rounded-full"
          />
        </div>
      </motion.div>
    </div>
  );
};
