import { useState } from 'react';
import { motion } from 'framer-motion';
import bbCoinLogo from '@/assets/bb-coin-logo.png';

interface RotatingBBCoinProps {
  avatarUrl?: string | null;
  displayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  onClick?: () => void;
}

const sizeMap = { xs: 28, sm: 36, md: 56, lg: 72, xl: 96 };

export const RotatingBBCoin = ({
  avatarUrl,
  displayName = 'U',
  size = 'md',
  animate = true,
  onClick,
}: RotatingBBCoinProps) => {
  const pixelSize = sizeMap[size];
  const initial = (displayName || 'U').charAt(0).toUpperCase();
  const borderWidth = Math.max(2, Math.round(pixelSize * 0.05));
  const edgeDepth = Math.max(2, Math.round(pixelSize * 0.06));

  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const showImage = avatarUrl && !imgError;

  const faceBase: React.CSSProperties = {
    position: 'absolute',
    width: pixelSize,
    height: pixelSize,
    backfaceVisibility: 'hidden',
    borderRadius: '50%',
    border: `${borderWidth}px solid #B8860B`,
    boxShadow: `
      0 4px 15px rgba(0,0,0,0.4),
      inset 0 1px 3px rgba(255,255,255,0.2),
      inset 0 0 0 1px rgba(218,165,32,0.4)
    `,
    overflow: 'hidden',
  };

  const edgeLayers = Array.from({ length: edgeDepth }, (_, i) => (
    <div
      key={`edge-${i}`}
      style={{
        position: 'absolute',
        width: pixelSize,
        height: pixelSize,
        borderRadius: '50%',
        transform: `translateZ(${-(i + 1)}px)`,
        background: `linear-gradient(${90 + i * 15}deg, #B8860B 0%, #DAA520 30%, #8B6914 60%, #B8860B 100%)`,
        filter: `brightness(${1 - i * 0.05})`,
      }}
    />
  ));

  return (
    <div
      className="relative cursor-pointer"
      style={{ perspective: 1000, width: pixelSize, height: pixelSize + 4 }}
      onClick={onClick}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d', width: pixelSize, height: pixelSize }}
        animate={animate ? { rotateY: 360 } : undefined}
        transition={
          animate
            ? { duration: 6, repeat: Infinity, ease: 'linear' }
            : undefined
        }
      >
        {/* ── FRONT FACE ── BB Logo */}
        <div style={{ ...faceBase, transform: `translateZ(${edgeDepth / 2}px)` }}>
          <img
            src={bbCoinLogo}
            alt="BB Coin"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>

        {/* ── EDGE SLICES ── Gold cylindrical rim */}
        {edgeLayers}

        {/* ── BACK FACE ── User Profile (engraved look) */}
        <div style={{ ...faceBase, transform: `translateZ(${-edgeDepth / 2}px) rotateY(180deg)`, background: '#111' }}>
          {showImage && (
            <img
              src={avatarUrl}
              alt="Profile"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                opacity: imgLoaded ? 0.85 : 0,
                filter: 'contrast(1.2) saturate(0.8)',
                transition: 'opacity 0.2s ease',
              }}
            />
          )}

          {(!showImage || !imgLoaded) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                color: '#F5C518',
                fontSize: pixelSize * 0.4,
                fontWeight: 'bold',
                borderRadius: '50%',
              }}
            >
              {initial}
            </div>
          )}

          {/* Engraving overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(184,134,11,0.3) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </motion.div>

      {/* ── DROP SHADOW ── Grounds the coin */}
      <div
        style={{
          position: 'absolute',
          bottom: -4,
          left: '10%',
          width: '80%',
          height: 4,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.3), transparent)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
