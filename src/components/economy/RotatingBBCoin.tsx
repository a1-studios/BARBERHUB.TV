import { useState } from 'react';
import { motion } from 'framer-motion';
import bbCoinLogo from '@/assets/bb-coin-logo.png';

interface RotatingBBCoinProps {
  avatarUrl?: string | null;
  displayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  onClick?: () => void;
  balanceText?: string;
}

const sizeMap = { xs: 28, sm: 36, md: 56, lg: 72, xl: 96 };

export const RotatingBBCoin = ({
  avatarUrl,
  displayName = 'U',
  size = 'md',
  animate = true,
  onClick,
  balanceText,
}: RotatingBBCoinProps) => {
  const pixelSize = sizeMap[size];
  const initial = (displayName || 'U').charAt(0).toUpperCase();
  const borderWidth = Math.max(2, Math.round(pixelSize * 0.05));

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
    boxShadow: '0 4px 15px rgba(0,0,0,0.4), inset 0 1px 3px rgba(255,255,255,0.2)',
    overflow: 'hidden',
  };

  return (
    <div
      className="relative cursor-pointer"
      style={{ perspective: 1000, width: pixelSize, height: pixelSize }}
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
        <div style={faceBase}>
          <img
            src={bbCoinLogo}
            alt="BB Coin"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>

        {/* ── BACK FACE ── User Profile (engraved look) */}
        <div style={{ ...faceBase, transform: 'rotateY(180deg)', background: '#111' }}>
          {/* Balance display mode */}
          {balanceText ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                borderRadius: '50%',
                gap: pixelSize * 0.02,
              }}
            >
              <span
                style={{
                  color: '#F5C518',
                  fontSize: pixelSize * 0.28,
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                }}
              >
                {balanceText}
              </span>
              <span
                style={{
                  color: 'rgba(245,197,24,0.55)',
                  fontSize: pixelSize * 0.16,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '0.08em',
                }}
              >
                BB
              </span>
            </div>
          ) : (
            <>
              {/* User avatar */}
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

              {/* Fallback initial letter */}
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
            </>
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
    </div>
  );
};
