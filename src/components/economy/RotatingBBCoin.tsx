import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import bbCoinLogo from '@/assets/bb-coin-logo.png';

interface RotatingBBCoinProps {
  avatarUrl?: string | null;
  displayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  onClick?: () => void;
}

const sizeMap = {
  xs: 28,
  sm: 36,
  md: 56,
  lg: 72,
  xl: 96
};

// Proportional sizing for inner elements
const getProportions = (size: number) => ({
  rimWidth: Math.max(1, size * 0.04),
  innerRingWidth: Math.max(1, size * 0.02),
  centerSize: size * 0.82,
  edgeThickness: Math.max(3, size * 0.08),
});

// Beveled edge color function for realistic 3D effect
const getEdgeColor = (index: number, total: number, copperGradient: string) => {
  if (index < 2 || index >= total - 2) {
    return 'linear-gradient(90deg, #5C3D2E 0%, #8B5A2B 50%, #5C3D2E 100%)';
  }
  return copperGradient;
};

export const RotatingBBCoin = ({
  avatarUrl,
  displayName = 'U',
  size = 'md',
  animate = true,
  onClick
}: RotatingBBCoinProps) => {
  const pixelSize = sizeMap[size];
  const proportions = getProportions(pixelSize);
  const initial = (displayName || 'U').charAt(0).toUpperCase();

  // Metallic gradient colors
  const bronzeGradient = 'linear-gradient(135deg, #CD7F32 0%, #F5A623 25%, #CD7F32 50%, #8B4513 75%, #CD7F32 100%)';
  const darkMetallicGradient = 'linear-gradient(135deg, #2D1F1F 0%, #4A3232 50%, #2D1F1F 100%)';
  const copperEdgeGradient = 'linear-gradient(90deg, #8B4513 0%, #CD7F32 50%, #8B4513 100%)';

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
      {/* Drop Shadow */}
      <div
        className="absolute rounded-full"
        style={{
          width: pixelSize * 0.9,
          height: pixelSize * 0.15,
          bottom: -pixelSize * 0.05,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%)',
          filter: 'blur(2px)',
        }}
      />

      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={animate ? { 
          rotateY: 360,
        } : undefined}
        transition={animate ? {
          duration: 6,
          repeat: Infinity,
          ease: 'linear'
        } : undefined}
      >
        {/* Coin Edge - Multiple layers for solid 3D thickness */}
        {Array.from({ length: 8 }).map((_, i) => {
          const edgeDepth = Math.max(6, pixelSize * 0.15);
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: pixelSize - 2,
                height: pixelSize - 2,
                left: 1,
                top: 1,
                background: getEdgeColor(i, 8, copperEdgeGradient),
                transform: `translateZ(${-((i + 1) * (edgeDepth / 8))}px)`,
                boxShadow: i === 7 ? 'inset 0 0 8px rgba(0, 0, 0, 0.6)' : 'none',
              }}
            />
          );
        })}

        {/* Front Face - BB Logo */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ 
            backfaceVisibility: 'hidden',
            background: bronzeGradient,
            padding: proportions.rimWidth,
            boxShadow: `
              0 4px 12px rgba(0, 0, 0, 0.4),
              0 2px 4px rgba(0, 0, 0, 0.2),
              inset 0 2px 4px rgba(255, 255, 255, 0.2),
              inset 0 -2px 4px rgba(0, 0, 0, 0.3)
            `,
          }}
        >
          {/* Inner Ring */}
          <div
            className="w-full h-full rounded-full"
            style={{
              background: darkMetallicGradient,
              padding: proportions.innerRingWidth,
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Center Face with Logo */}
            <div
              className="w-full h-full rounded-full overflow-hidden relative"
              style={{
                background: 'linear-gradient(145deg, #1A1A1A 0%, #0D0D0D 100%)',
                boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.6)',
              }}
            >
              <img
                src={bbCoinLogo}
                alt="BB Coin"
                className="w-full h-full object-cover"
                style={{
                  transform: 'scale(1.15)',
                  filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))',
                }}
              />
              
              {/* Specular Highlight (top-left) */}
              <div 
                className="absolute inset-0 pointer-events-none rounded-full"
                style={{
                  background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.25) 0%, transparent 50%)',
                }}
              />
            </div>
          </div>
          
          {/* Animated Shine Sweep */}
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-full"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)',
            }}
            animate={animate ? { 
              opacity: [0, 1, 0],
              x: ['-100%', '100%'],
            } : undefined}
            transition={animate ? {
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
              repeatDelay: 3,
            } : undefined}
          />
        </div>

        {/* Back Face - User Avatar */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: bronzeGradient,
            padding: proportions.rimWidth,
            boxShadow: `
              0 4px 12px rgba(0, 0, 0, 0.4),
              0 2px 4px rgba(0, 0, 0, 0.2),
              inset 0 2px 4px rgba(255, 255, 255, 0.2),
              inset 0 -2px 4px rgba(0, 0, 0, 0.3)
            `,
          }}
        >
          {/* Inner Ring */}
          <div
            className="w-full h-full rounded-full"
            style={{
              background: darkMetallicGradient,
              padding: proportions.innerRingWidth,
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Center Face with Avatar */}
            <div
              className="w-full h-full rounded-full overflow-hidden relative"
              style={{
                background: 'linear-gradient(145deg, #1A1A1A 0%, #0D0D0D 100%)',
                boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.6)',
              }}
            >
              <Avatar className="w-full h-full">
                <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                <AvatarFallback 
                  className="bg-gradient-to-br from-primary/40 to-primary/20 text-primary-foreground font-bold"
                  style={{ fontSize: pixelSize * 0.25 }}
                >
                  {initial}
                </AvatarFallback>
              </Avatar>
              
              {/* Specular Highlight (top-left) */}
              <div 
                className="absolute inset-0 pointer-events-none rounded-full"
                style={{
                  background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)',
                }}
              />
            </div>
          </div>
          
          {/* Animated Shine Sweep */}
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-full"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)',
            }}
            animate={animate ? { 
              opacity: [0, 1, 0],
              x: ['-100%', '100%'],
            } : undefined}
            transition={animate ? {
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
              repeatDelay: 3,
            } : undefined}
          />
        </div>
      </motion.div>
    </div>
  );
};
