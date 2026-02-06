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

const sizeMap = { xs: 28, sm: 36, md: 56, lg: 72, xl: 96 };

/** Polished gold edge color per layer – dark at front/back, bright in the middle */
const getEdgeGradient = (i: number, total: number) => {
  const pos = i / (total - 1); // 0 → 1
  if (pos < 0.25 || pos > 0.75) {
    // Front & back lip – darker bronze shadow
    return 'linear-gradient(180deg, #8B6914 0%, #A67C00 50%, #8B6914 100%)';
  }
  // Middle – bright polished gold
  return 'linear-gradient(180deg, #F5C518 0%, #D4A017 40%, #F5C518 100%)';
};

/** Shared specular highlight overlay */
const SpecularHighlight = () => (
  <div
    className="absolute inset-0 pointer-events-none rounded-full"
    style={{
      background:
        'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)',
    }}
  />
);

/** Shared animated shine sweep */
const ShineSweep = ({ animate }: { animate: boolean }) => (
  <motion.div
    className="absolute inset-0 pointer-events-none rounded-full"
    style={{
      background:
        'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)',
    }}
    animate={
      animate
        ? { opacity: [0, 1, 0], x: ['-100%', '100%'] }
        : undefined
    }
    transition={
      animate
        ? { duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }
        : undefined
    }
  />
);

/** CSS-built coin face used for the back (avatar) side */
const AvatarFace = ({
  pixelSize,
  avatarUrl,
  initial,
  animate,
}: {
  pixelSize: number;
  avatarUrl?: string | null;
  initial: string;
  animate: boolean;
}) => {
  const rimWidth = Math.max(1, pixelSize * 0.04);
  const innerRingWidth = Math.max(1, pixelSize * 0.02);
  const bronzeGradient =
    'linear-gradient(135deg, #CD7F32 0%, #F5A623 25%, #CD7F32 50%, #8B4513 75%, #CD7F32 100%)';
  const darkMetallic =
    'linear-gradient(135deg, #2D1F1F 0%, #4A3232 50%, #2D1F1F 100%)';

  return (
    <div
      className="absolute inset-0 rounded-full overflow-hidden"
      style={{
        backfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
        background: bronzeGradient,
        padding: rimWidth,
        boxShadow: `
          0 4px 12px rgba(0,0,0,0.4),
          0 2px 4px rgba(0,0,0,0.2),
          inset 0 2px 4px rgba(255,255,255,0.2),
          inset 0 -2px 4px rgba(0,0,0,0.3)
        `,
      }}
    >
      {/* Inner ring */}
      <div
        className="w-full h-full rounded-full"
        style={{
          background: darkMetallic,
          padding: innerRingWidth,
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        {/* Center – avatar */}
        <div
          className="w-full h-full rounded-full overflow-hidden relative"
          style={{
            background: 'linear-gradient(145deg, #1A1A1A 0%, #0D0D0D 100%)',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6)',
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

          <SpecularHighlight />
        </div>
      </div>

      <ShineSweep animate={animate} />
    </div>
  );
};

export const RotatingBBCoin = ({
  avatarUrl,
  displayName = 'U',
  size = 'md',
  animate = true,
  onClick,
}: RotatingBBCoinProps) => {
  const pixelSize = sizeMap[size];
  const initial = (displayName || 'U').charAt(0).toUpperCase();
  const edgeLayers = 8;
  const edgeDepth = Math.max(6, pixelSize * 0.15);

  return (
    <div
      className="relative cursor-pointer"
      style={{ perspective: '1000px', width: pixelSize, height: pixelSize }}
      onClick={onClick}
    >
      {/* Drop shadow */}
      <div
        className="absolute rounded-full"
        style={{
          width: pixelSize * 0.9,
          height: pixelSize * 0.15,
          bottom: -pixelSize * 0.05,
          left: '50%',
          transform: 'translateX(-50%)',
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%)',
          filter: 'blur(2px)',
        }}
      />

      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={animate ? { rotateY: 360 } : undefined}
        transition={
          animate
            ? { duration: 6, repeat: Infinity, ease: 'linear' }
            : undefined
        }
      >
        {/* ── EDGE LAYERS ── polished gold bevel */}
        {Array.from({ length: edgeLayers }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: pixelSize - 2,
              height: pixelSize - 2,
              left: 1,
              top: 1,
              background: getEdgeGradient(i, edgeLayers),
              transform: `translateZ(${-((i + 1) * (edgeDepth / edgeLayers))}px)`,
              boxShadow:
                i === edgeLayers - 1
                  ? 'inset 0 0 8px rgba(0,0,0,0.6)'
                  : 'none',
            }}
          />
        ))}

        {/* ── FRONT FACE ── new coin image (includes its own rim & logo) */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            boxShadow: `
              0 4px 12px rgba(0,0,0,0.4),
              inset 0 2px 4px rgba(255,255,255,0.15),
              inset 0 -2px 4px rgba(0,0,0,0.3)
            `,
          }}
        >
          <img
            src={bbCoinLogo}
            alt="BB Coin"
            className="w-full h-full object-cover rounded-full"
          />
          <SpecularHighlight />
          <ShineSweep animate={animate} />
        </div>

        {/* ── BACK FACE ── user avatar with CSS rim */}
        <AvatarFace
          pixelSize={pixelSize}
          avatarUrl={avatarUrl}
          initial={initial}
          animate={animate}
        />
      </motion.div>
    </div>
  );
};
