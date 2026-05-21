import { useState, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { BarberSubscriptionTiers } from '@/components/barber/BarberSubscriptionTiers';
import { AddFundsModal } from '@/components/AddFundsModal';
import { M4MVerificationModal } from '@/components/m4m/M4MVerificationModal';
import { M4MCertificationModal } from '@/components/m4m/M4MCertificationModal';
import { M4MQRCodeModal } from '@/components/m4m/M4MQRCodeModal';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { useTiersEnabled } from '@/hooks/useTiersEnabled';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { M4MAvatarBadge } from '@/components/m4m/M4MAvatarBadge';

interface AvatarCrestProps {
  tier: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  children: ReactNode;
  className?: string;
  m4mCertified?: boolean;
  m4mPaid?: boolean;
  m4mLivesTouched?: number;
  barberName?: string;
  barberUserId?: string;
  isOwnProfile?: boolean;
  showM4M?: boolean;
}

const ZION_BLUE = '#002D62';
const M4M_CYAN = '#00E5FF';

const SIZE_CONFIG = {
  sm: { svgSize: 80, avatarSize: 52, ringR: 30, wingScale: 0.65, starSize: 3 },
  md: { svgSize: 110, avatarSize: 72, ringR: 40, wingScale: 0.85, starSize: 4 },
  lg: { svgSize: 160, avatarSize: 104, ringR: 58, wingScale: 1, starSize: 5 },
};

const TIER_COLORS = {
  free: { stroke: 'hsl(0 0% 30%)', fill: 'none', glow: 'none', starFill: 'hsl(0 0% 30%)' },
  bronze: { stroke: 'hsl(24 80% 45%)', fill: 'hsl(24 80% 45%)', glow: '0 0 16px hsl(24 80% 45% / 0.6)', starFill: 'hsl(24 80% 50%)' },
  silver: { stroke: 'hsl(210 20% 80%)', fill: 'hsl(210 20% 80%)', glow: '0 0 20px hsl(210 20% 80% / 0.6)', starFill: 'hsl(210 20% 85%)' },
  gold: { stroke: 'hsl(45 100% 55%)', fill: 'hsl(45 100% 55%)', glow: '0 0 28px hsl(45 100% 55% / 0.6)', starFill: 'hsl(45 100% 60%)' },
  diamond: { stroke: 'hsl(200 80% 75%)', fill: 'hsl(200 80% 75%)', glow: '0 0 32px hsl(200 80% 75% / 0.7)', starFill: 'hsl(200 80% 80%)' },
};

const TIER_ORDER = ['free', 'bronze', 'silver', 'gold', 'diamond'] as const;

const getNextTierColor = (currentTier: string) => {
  const idx = TIER_ORDER.indexOf(currentTier as any);
  const nextKey = TIER_ORDER[Math.min(idx + 1, TIER_ORDER.length - 1)];
  return TIER_COLORS[nextKey];
};

// Bronze: angular chevron wings
const BronzeWings = ({ cx, cy, scale, active, ghost }: { cx: number; cy: number; scale: number; active: boolean; ghost?: boolean }) => (
  <g opacity={active ? 1 : ghost ? undefined : 0.35} className={active ? 'animate-crest-wing-bronze' : ghost ? 'animate-crest-ghost-pulse' : ''}>
    <path
      d={`M${cx - 34 * scale} ${cy - 8 * scale} L${cx - 48 * scale} ${cy - 20 * scale} L${cx - 42 * scale} ${cy - 4 * scale} L${cx - 50 * scale} ${cy + 8 * scale} L${cx - 36 * scale} ${cy + 4 * scale} Z`}
      stroke={TIER_COLORS.bronze.stroke}
      strokeWidth={active ? 3 : 2}
      fill={active ? TIER_COLORS.bronze.fill : 'none'}
      fillOpacity={active ? 0.4 : 0}
      style={active ? { filter: TIER_COLORS.bronze.glow } : {}}
    />
    <path
      d={`M${cx - 38 * scale} ${cy - 14 * scale} L${cx - 55 * scale} ${cy - 28 * scale} L${cx - 48 * scale} ${cy - 10 * scale} L${cx - 58 * scale} ${cy + 4 * scale} L${cx - 42 * scale} ${cy - 2 * scale}`}
      stroke={TIER_COLORS.bronze.stroke}
      strokeWidth={active ? 2 : 1.5}
      fill="none"
      opacity={active ? 0.7 : 0.2}
    />
    <path
      d={`M${cx + 34 * scale} ${cy - 8 * scale} L${cx + 48 * scale} ${cy - 20 * scale} L${cx + 42 * scale} ${cy - 4 * scale} L${cx + 50 * scale} ${cy + 8 * scale} L${cx + 36 * scale} ${cy + 4 * scale} Z`}
      stroke={TIER_COLORS.bronze.stroke}
      strokeWidth={active ? 3 : 2}
      fill={active ? TIER_COLORS.bronze.fill : 'none'}
      fillOpacity={active ? 0.4 : 0}
      style={active ? { filter: TIER_COLORS.bronze.glow } : {}}
    />
    <path
      d={`M${cx + 38 * scale} ${cy - 14 * scale} L${cx + 55 * scale} ${cy - 28 * scale} L${cx + 48 * scale} ${cy - 10 * scale} L${cx + 58 * scale} ${cy + 4 * scale} L${cx + 42 * scale} ${cy - 2 * scale}`}
      stroke={TIER_COLORS.bronze.stroke}
      strokeWidth={active ? 2 : 1.5}
      fill="none"
      opacity={active ? 0.7 : 0.2}
    />
  </g>
);

// Silver: curved laurel branches
const SilverWings = ({ cx, cy, scale, active, ghost }: { cx: number; cy: number; scale: number; active: boolean; ghost?: boolean }) => (
  <g opacity={active ? 1 : ghost ? undefined : 0.35} className={active ? 'animate-crest-wing-silver' : ghost ? 'animate-crest-ghost-pulse' : ''}>
    {[-24, -16, -8, 0, 8, 16].map((offset, i) => (
      <ellipse
        key={`l-${i}`}
        cx={cx - 40 * scale - i * 2 * scale}
        cy={cy + offset * scale * 0.6}
        rx={8 * scale}
        ry={4 * scale}
        transform={`rotate(${-30 + i * 10} ${cx - 40 * scale - i * 2 * scale} ${cy + offset * scale * 0.6})`}
        stroke={TIER_COLORS.silver.stroke}
        strokeWidth={active ? 2.5 : 1.8}
        fill={active ? TIER_COLORS.silver.fill : 'none'}
        fillOpacity={active ? 0.35 : 0}
        style={active ? { filter: TIER_COLORS.silver.glow } : {}}
      />
    ))}
    {[-24, -16, -8, 0, 8, 16].map((offset, i) => (
      <ellipse
        key={`r-${i}`}
        cx={cx + 40 * scale + i * 2 * scale}
        cy={cy + offset * scale * 0.6}
        rx={8 * scale}
        ry={4 * scale}
        transform={`rotate(${30 - i * 10} ${cx + 40 * scale + i * 2 * scale} ${cy + offset * scale * 0.6})`}
        stroke={TIER_COLORS.silver.stroke}
        strokeWidth={active ? 2.5 : 1.8}
        fill={active ? TIER_COLORS.silver.fill : 'none'}
        fillOpacity={active ? 0.35 : 0}
        style={active ? { filter: TIER_COLORS.silver.glow } : {}}
      />
    ))}
    <path
      d={`M${cx - 34 * scale} ${cy - 18 * scale} Q${cx - 50 * scale} ${cy} ${cx - 38 * scale} ${cy + 18 * scale}`}
      stroke={TIER_COLORS.silver.stroke}
      strokeWidth={active ? 2.5 : 1.8}
      fill="none"
      opacity={active ? 0.9 : 0.2}
    />
    <path
      d={`M${cx + 34 * scale} ${cy - 18 * scale} Q${cx + 50 * scale} ${cy} ${cx + 38 * scale} ${cy + 18 * scale}`}
      stroke={TIER_COLORS.silver.stroke}
      strokeWidth={active ? 2.5 : 1.8}
      fill="none"
      opacity={active ? 0.9 : 0.2}
    />
  </g>
);

// Gold: elaborate multi-layered wings
const GoldWings = ({ cx, cy, scale, active, ghost }: { cx: number; cy: number; scale: number; active: boolean; ghost?: boolean }) => (
  <g opacity={active ? 1 : ghost ? undefined : 0.35} className={active ? 'animate-crest-wing-gold' : ghost ? 'animate-crest-ghost-pulse' : ''}>
    <path
      d={`M${cx - 34 * scale} ${cy - 5 * scale} 
          C${cx - 50 * scale} ${cy - 30 * scale} ${cx - 65 * scale} ${cy - 25 * scale} ${cx - 60 * scale} ${cy - 10 * scale}
          C${cx - 55 * scale} ${cy + 5 * scale} ${cx - 45 * scale} ${cy + 15 * scale} ${cx - 34 * scale} ${cy + 10 * scale}`}
      stroke={TIER_COLORS.gold.stroke}
      strokeWidth={active ? 3.5 : 2}
      fill={active ? TIER_COLORS.gold.fill : 'none'}
      fillOpacity={active ? 0.4 : 0}
      style={active ? { filter: TIER_COLORS.gold.glow } : {}}
    />
    <path
      d={`M${cx - 38 * scale} ${cy - 10 * scale}
          C${cx - 58 * scale} ${cy - 38 * scale} ${cx - 75 * scale} ${cy - 30 * scale} ${cx - 68 * scale} ${cy - 12 * scale}
          C${cx - 62 * scale} ${cy + 8 * scale} ${cx - 48 * scale} ${cy + 20 * scale} ${cx - 36 * scale} ${cy + 8 * scale}`}
      stroke={TIER_COLORS.gold.stroke}
      strokeWidth={active ? 2 : 1.5}
      fill="none"
      opacity={active ? 0.6 : 0.15}
    />
    <circle
      cx={cx - 62 * scale} cy={cy - 14 * scale} r={3.5 * scale}
      stroke={TIER_COLORS.gold.stroke} strokeWidth={active ? 2 : 1.2}
      fill={active ? TIER_COLORS.gold.fill : 'none'} fillOpacity={active ? 0.5 : 0}
    />
    <path
      d={`M${cx + 34 * scale} ${cy - 5 * scale}
          C${cx + 50 * scale} ${cy - 30 * scale} ${cx + 65 * scale} ${cy - 25 * scale} ${cx + 60 * scale} ${cy - 10 * scale}
          C${cx + 55 * scale} ${cy + 5 * scale} ${cx + 45 * scale} ${cy + 15 * scale} ${cx + 34 * scale} ${cy + 10 * scale}`}
      stroke={TIER_COLORS.gold.stroke}
      strokeWidth={active ? 3.5 : 2}
      fill={active ? TIER_COLORS.gold.fill : 'none'}
      fillOpacity={active ? 0.4 : 0}
      style={active ? { filter: TIER_COLORS.gold.glow } : {}}
    />
    <path
      d={`M${cx + 38 * scale} ${cy - 10 * scale}
          C${cx + 58 * scale} ${cy - 38 * scale} ${cx + 75 * scale} ${cy - 30 * scale} ${cx + 68 * scale} ${cy - 12 * scale}
          C${cx + 62 * scale} ${cy + 8 * scale} ${cx + 48 * scale} ${cy + 20 * scale} ${cx + 36 * scale} ${cy + 8 * scale}`}
      stroke={TIER_COLORS.gold.stroke}
      strokeWidth={active ? 2 : 1.5}
      fill="none"
      opacity={active ? 0.6 : 0.15}
    />
    <circle
      cx={cx + 62 * scale} cy={cy - 14 * scale} r={3.5 * scale}
      stroke={TIER_COLORS.gold.stroke} strokeWidth={active ? 2 : 1.2}
      fill={active ? TIER_COLORS.gold.fill : 'none'} fillOpacity={active ? 0.5 : 0}
    />
  </g>
);

// Diamond: crystalline faceted wings
const DiamondWings = ({ cx, cy, scale, active, ghost }: { cx: number; cy: number; scale: number; active: boolean; ghost?: boolean }) => (
  <g opacity={active ? 1 : ghost ? undefined : 0.35} className={active ? 'animate-crest-wing-diamond' : ghost ? 'animate-crest-ghost-pulse' : ''}>
    <path
      d={`M${cx - 34 * scale} ${cy - 5 * scale}
          L${cx - 52 * scale} ${cy - 32 * scale}
          L${cx - 58 * scale} ${cy - 18 * scale}
          L${cx - 70 * scale} ${cy - 22 * scale}
          L${cx - 64 * scale} ${cy - 6 * scale}
          L${cx - 72 * scale} ${cy + 4 * scale}
          L${cx - 56 * scale} ${cy + 8 * scale}
          L${cx - 48 * scale} ${cy + 18 * scale}
          L${cx - 34 * scale} ${cy + 10 * scale} Z`}
      stroke={TIER_COLORS.diamond.stroke}
      strokeWidth={active ? 3.5 : 2}
      fill={active ? TIER_COLORS.diamond.fill : 'none'}
      fillOpacity={active ? 0.35 : 0}
      style={active ? { filter: TIER_COLORS.diamond.glow } : {}}
    />
    <path
      d={`M${cx - 52 * scale} ${cy - 32 * scale} L${cx - 50 * scale} ${cy - 4 * scale} L${cx - 70 * scale} ${cy - 22 * scale}`}
      stroke={TIER_COLORS.diamond.stroke} strokeWidth={1.5} fill="none" opacity={active ? 0.5 : 0.1}
    />
    <path
      d={`M${cx - 50 * scale} ${cy - 4 * scale} L${cx - 48 * scale} ${cy + 18 * scale}`}
      stroke={TIER_COLORS.diamond.stroke} strokeWidth={1.5} fill="none" opacity={active ? 0.4 : 0.1}
    />
    <circle cx={cx - 70 * scale} cy={cy - 22 * scale} r={3 * scale}
      stroke={TIER_COLORS.diamond.stroke} strokeWidth={1.5}
      fill={active ? TIER_COLORS.diamond.fill : 'none'} fillOpacity={active ? 0.6 : 0} />
    <path
      d={`M${cx + 34 * scale} ${cy - 5 * scale}
          L${cx + 52 * scale} ${cy - 32 * scale}
          L${cx + 58 * scale} ${cy - 18 * scale}
          L${cx + 70 * scale} ${cy - 22 * scale}
          L${cx + 64 * scale} ${cy - 6 * scale}
          L${cx + 72 * scale} ${cy + 4 * scale}
          L${cx + 56 * scale} ${cy + 8 * scale}
          L${cx + 48 * scale} ${cy + 18 * scale}
          L${cx + 34 * scale} ${cy + 10 * scale} Z`}
      stroke={TIER_COLORS.diamond.stroke}
      strokeWidth={active ? 3.5 : 2}
      fill={active ? TIER_COLORS.diamond.fill : 'none'}
      fillOpacity={active ? 0.35 : 0}
      style={active ? { filter: TIER_COLORS.diamond.glow } : {}}
    />
    <path
      d={`M${cx + 52 * scale} ${cy - 32 * scale} L${cx + 50 * scale} ${cy - 4 * scale} L${cx + 70 * scale} ${cy - 22 * scale}`}
      stroke={TIER_COLORS.diamond.stroke} strokeWidth={1.5} fill="none" opacity={active ? 0.5 : 0.1}
    />
    <path
      d={`M${cx + 50 * scale} ${cy - 4 * scale} L${cx + 48 * scale} ${cy + 18 * scale}`}
      stroke={TIER_COLORS.diamond.stroke} strokeWidth={1.5} fill="none" opacity={active ? 0.4 : 0.1}
    />
    <circle cx={cx + 70 * scale} cy={cy - 22 * scale} r={3 * scale}
      stroke={TIER_COLORS.diamond.stroke} strokeWidth={1.5}
      fill={active ? TIER_COLORS.diamond.fill : 'none'} fillOpacity={active ? 0.6 : 0} />
  </g>
);

// Stars row — bolder
const Stars = ({ cx, cy, count, scale, color, active, ghost }: { cx: number; cy: number; count: number; scale: number; color: string; active: boolean; ghost?: boolean }) => {
  const spacing = 10 * scale;
  const startX = cx - ((count - 1) * spacing) / 2;
  return (
    <g opacity={active ? 1 : ghost ? undefined : 0.35} className={active ? 'animate-crest-star-twinkle' : ghost ? 'animate-crest-ghost-pulse' : ''}>
      {Array.from({ length: count }).map((_, i) => {
        const sx = startX + i * spacing;
        const r = 5 * scale;
        const points = Array.from({ length: 5 }).map((_, j) => {
          const angle = (j * 72 - 90) * (Math.PI / 180);
          const innerAngle = ((j * 72 + 36) - 90) * (Math.PI / 180);
          return `${sx + r * Math.cos(angle)},${cy + r * Math.sin(angle)} ${sx + r * 0.4 * Math.cos(innerAngle)},${cy + r * 0.4 * Math.sin(innerAngle)}`;
        }).join(' ');
        return (
          <polygon
            key={i}
            points={points}
            fill={active ? color : 'none'}
            stroke={color}
            strokeWidth={active ? 1.2 : 0.8}
            fillOpacity={active ? 1 : 0}
            style={active ? { filter: `drop-shadow(0 0 4px ${color})` } : {}}
          />
        );
      })}
    </g>
  );
};

// M4M Heart at bottom of crest
const M4MHeart = ({ cx, cy, scale, glowState }: { cx: number; cy: number; scale: number; glowState: 'ghost' | 'certified' | 'complete' }) => {
  const s = scale * 0.45;
  const color = glowState === 'ghost' ? 'hsl(180 100% 70%)' : M4M_CYAN;
  return (
    <g
      opacity={glowState === 'ghost' ? 0.3 : glowState === 'certified' ? 0.8 : 1}
      style={
        glowState === 'complete'
          ? { filter: `drop-shadow(0 0 6px ${M4M_CYAN}) drop-shadow(0 0 14px ${M4M_CYAN}80)` }
          : glowState === 'certified'
          ? { filter: `drop-shadow(0 0 4px ${M4M_CYAN}80)` }
          : {}
      }
    >
      <rect x={cx - 18 * s} y={cy - 16 * s} width={36 * s} height={34 * s} fill="transparent" style={{ pointerEvents: 'all' }} />
      <path
        d={`M${cx} ${cy + 16 * s} C${cx} ${cy + 16 * s} ${cx - 16 * s} ${cy + 4 * s} ${cx - 16 * s} ${cy - 5 * s} C${cx - 16 * s} ${cy - 11 * s} ${cx - 11 * s} ${cy - 14 * s} ${cx - 6 * s} ${cy - 14 * s} C${cx - 3 * s} ${cy - 14 * s} ${cx - 1 * s} ${cy - 11 * s} ${cx} ${cy - 9 * s} C${cx + 1 * s} ${cy - 11 * s} ${cx + 3 * s} ${cy - 14 * s} ${cx + 6 * s} ${cy - 14 * s} C${cx + 11 * s} ${cy - 14 * s} ${cx + 16 * s} ${cy - 11 * s} ${cx + 16 * s} ${cy - 5 * s} C${cx + 16 * s} ${cy + 4 * s} ${cx} ${cy + 16 * s} ${cx} ${cy + 16 * s} Z`}
        stroke={color} strokeWidth={1.5 * s}
        fill={glowState === 'complete' ? `${M4M_CYAN}30` : 'none'}
      />
      <path
        d={`M${cx} ${cy - 8 * s} L${cx - 5.5 * s} ${cy - 4 * s} L${cx - 5.5 * s} ${cy + 3 * s} C${cx - 5.5 * s} ${cy + 7 * s} ${cx - 3 * s} ${cy + 10 * s} ${cx} ${cy + 12 * s} C${cx + 3 * s} ${cy + 10 * s} ${cx + 5.5 * s} ${cy + 7 * s} ${cx + 5.5 * s} ${cy + 3 * s} L${cx + 5.5 * s} ${cy - 4 * s} Z`}
        stroke={color} strokeWidth={1 * s} fill="none"
      />
      {glowState !== 'ghost' && (
        <path
          d={`M${cx - 2.5 * s} ${cy + 2 * s} L${cx - 0.5 * s} ${cy + 4.5 * s} L${cx + 3 * s} ${cy - 1 * s}`}
          stroke={M4M_CYAN} strokeWidth={1.2 * s} strokeLinecap="round" strokeLinejoin="round" fill="none"
        />
      )}
    </g>
  );
};

export const AvatarCrest = ({
  tier,
  size = 'md',
  interactive = false,
  children,
  className,
  m4mCertified = false,
  m4mPaid = false,
  m4mLivesTouched = 0,
  barberName = '',
  barberUserId = '',
  isOwnProfile = false,
  showM4M = false,
}: AvatarCrestProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [certificationModalOpen, setCertificationModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [ghostHovered, setGhostHovered] = useState(false);
  const { barberBucks, isLoading: bbLoading } = useBarberBucks();
  const { enabled: tiersEnabled } = useTiersEnabled();

  const tierKey = (tier?.toLowerCase() || 'free') as keyof typeof TIER_COLORS;
  const validTier = TIER_COLORS[tierKey] ? tierKey : 'free';
  const isActive = validTier !== 'free';
  const config = SIZE_CONFIG[size];

  // Master tier toggle OFF → render plain avatar (no crest, no wings, no stars, no M4M heart)
  if (!tiersEnabled) {
    return (
      <div className={cn('relative inline-flex flex-col items-center', className)}>
        <div className="rounded-full overflow-hidden">{children}</div>
      </div>
    );
  }

  const cx = config.svgSize / 2;
  const cy = config.svgSize / 2;
  const starCount = validTier === 'diamond' ? 6 : validTier === 'gold' ? 5 : validTier === 'silver' ? 4 : validTier === 'bronze' ? 3 : 0;
  const tierColors = TIER_COLORS[validTier];

  const m4mState: 'ghost' | 'certified' | 'complete' =
    m4mCertified && m4mPaid ? 'complete' : m4mCertified ? 'certified' : 'ghost';

  // Allow upgrade from any tier — no isActive guard
  const handleRingClick = () => {
    if (!interactive) return;
    setDrawerOpen(true);
  };

  const handleM4MClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOwnProfile) {
      if (!m4mCertified) setCertificationModalOpen(true);
      else setQrModalOpen(true);
    } else {
      setVerificationModalOpen(true);
    }
  };

  const handleShowAddFunds = () => {
    setDrawerOpen(false);
    setShowAddFunds(true);
  };

  const handleGhostInteraction = () => {
    if (interactive && !isActive) {
      setDrawerOpen(true);
    }
  };

  const svgW = config.svgSize + 40 * config.wingScale;
  const svgH = config.svgSize + 8 * config.wingScale;
  const nextTierColors = getNextTierColor(validTier);

  return (
    <>
      <div className={cn('relative inline-flex flex-col items-center', className)}>
        <div className="relative" style={{ width: svgW, height: svgH }}>
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            width={svgW}
            height={svgH}
            className="absolute inset-0"
            style={{ overflow: 'visible' }}
          >
            {/* Ghost preview for free tier — interactive */}
            {!isActive && (
              <g
                className={cn(
                  'transition-all duration-300 cursor-pointer',
                  ghostHovered ? 'animate-crest-ghost-hover' : ''
                )}
                style={{ opacity: ghostHovered ? 0.7 : undefined }}
                onMouseEnter={() => setGhostHovered(true)}
                onMouseLeave={() => setGhostHovered(false)}
                onTouchStart={() => setGhostHovered(true)}
                onTouchEnd={() => { setGhostHovered(false); handleGhostInteraction(); }}
                onClick={handleGhostInteraction}
              >
                <BronzeWings cx={svgW / 2} cy={cy + (svgH - config.svgSize) / 2} scale={config.wingScale} active={false} ghost />
                <SilverWings cx={svgW / 2} cy={cy + (svgH - config.svgSize) / 2} scale={config.wingScale} active={false} ghost />
                <GoldWings cx={svgW / 2} cy={cy + (svgH - config.svgSize) / 2} scale={config.wingScale} active={false} ghost />
              </g>
            )}

            {/* Active tier wings */}
            {validTier === 'bronze' && <BronzeWings cx={svgW / 2} cy={cy + (svgH - config.svgSize) / 2} scale={config.wingScale} active={true} />}
            {validTier === 'silver' && <SilverWings cx={svgW / 2} cy={cy + (svgH - config.svgSize) / 2} scale={config.wingScale} active={true} />}
            {validTier === 'gold' && <GoldWings cx={svgW / 2} cy={cy + (svgH - config.svgSize) / 2} scale={config.wingScale} active={true} />}
            {validTier === 'diamond' && <DiamondWings cx={svgW / 2} cy={cy + (svgH - config.svgSize) / 2} scale={config.wingScale} active={true} />}

            {/* Inner ring — bold badge style */}
            <circle
              cx={svgW / 2}
              cy={cy + (svgH - config.svgSize) / 2}
              r={config.ringR}
              stroke={tierColors.stroke}
              strokeWidth={isActive ? (validTier === 'diamond' ? 5 : validTier === 'gold' ? 4.5 : 4) : 2}
              fill="none"
              opacity={isActive ? 1 : 0.4}
              style={isActive ? { filter: tierColors.glow } : {}}
            />
            {/* Outer glow ring for gold/diamond */}
            {(validTier === 'gold' || validTier === 'diamond') && (
              <circle
                cx={svgW / 2}
                cy={cy + (svgH - config.svgSize) / 2}
                r={config.ringR + 3}
                stroke={tierColors.stroke}
                strokeWidth={1.5}
                fill="none"
                opacity={0.4}
                style={{ filter: tierColors.glow }}
              />
            )}

            {/* Stars */}
            {starCount > 0 && (
              <Stars
                cx={svgW / 2}
                cy={cy + (svgH - config.svgSize) / 2 + config.ringR + 10 * config.wingScale}
                count={starCount}
                scale={config.wingScale}
                color={tierColors.starFill}
                active={isActive}
              />
            )}
            {/* Ghost stars for free */}
            {!isActive && (
              <Stars
                cx={svgW / 2}
                cy={cy + (svgH - config.svgSize) / 2 + config.ringR + 10 * config.wingScale}
                count={3}
                scale={config.wingScale}
                color="hsl(0 0% 40%)"
                active={false}
                ghost
              />
            )}

            {/* M4M heart now rendered as overlay on the avatar (below) */}
          </svg>

          {/* Avatar with M4M badge overlay */}
          <div
            className="absolute"
            style={{
              width: config.avatarSize,
              height: config.avatarSize,
              left: (svgW - config.avatarSize) / 2,
              top: cy + (svgH - config.svgSize) / 2 - config.avatarSize / 2,
            }}
          >
            <div
              className="w-full h-full rounded-full overflow-hidden relative"
              onClick={handleRingClick}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
            >
              {children}
            </div>
            {showM4M && (
              <M4MAvatarBadge
                certified={m4mCertified}
                paid={m4mPaid}
                livesTouched={m4mLivesTouched}
                barberName={barberName}
                barberUserId={barberUserId}
                isOwnProfile={isOwnProfile}
                size={Math.round(config.avatarSize * 0.36)}
                position="bottom-right"
              />
            )}
          </div>

          {/* "Upgrade" label on ghost hover */}
          {!isActive && ghostHovered && interactive && (
            <div
              className="absolute left-1/2 -translate-x-1/2 text-xs font-bold tracking-wide pointer-events-none"
              style={{
                bottom: -4,
                color: 'hsl(187 100% 50%)',
                textShadow: '0 0 8px hsl(187 100% 50% / 0.6)',
              }}
            >
              UPGRADE
            </div>
          )}
        </div>

      </div>

      {/* Membership Plans Drawer */}
      {interactive && (
        <>
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader className="text-center pb-2">
                <DrawerTitle className="text-xl font-bold">Membership Plans</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6 overflow-y-auto">
                <div className="flex items-center justify-center gap-2 py-2 px-4 bg-muted/30 rounded-lg border border-border/30 mx-auto w-fit mb-4">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    Balance: <span className="text-primary font-bold">{bbLoading ? '...' : `${barberBucks} BB`}</span>
                  </span>
                </div>
                <BarberSubscriptionTiers onShowAddFunds={handleShowAddFunds} />
              </div>
            </DrawerContent>
          </Drawer>
          <AddFundsModal isOpen={showAddFunds} onClose={() => setShowAddFunds(false)} />
        </>
      )}

      {/* M4M Modals */}
      {showM4M && (
        <>
          <M4MVerificationModal open={verificationModalOpen} onOpenChange={setVerificationModalOpen} barberName={barberName} barberUserId={barberUserId} livesTouched={m4mLivesTouched} />
          <M4MCertificationModal open={certificationModalOpen} onOpenChange={setCertificationModalOpen} barberName={barberName} barberUserId={barberUserId} />
          <M4MQRCodeModal open={qrModalOpen} onOpenChange={setQrModalOpen} barberName={barberName} barberUserId={barberUserId} livesTouched={m4mLivesTouched} />
        </>
      )}
    </>
  );
};
