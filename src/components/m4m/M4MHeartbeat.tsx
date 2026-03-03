import { useState } from 'react';
import { motion } from 'framer-motion';
import { M4MVerificationModal } from './M4MVerificationModal';
import { M4MCertificationModal } from './M4MCertificationModal';
import { M4MQRCodeModal } from './M4MQRCodeModal';

interface M4MHeartbeatProps {
  certified: boolean;
  paid: boolean;
  livesTouched: number;
  barberName: string;
  barberUserId: string;
  size?: 'sm' | 'md';
  isOwnProfile?: boolean;
}

const ZION_BLUE = '#002D62';

const HeartShieldIcon = ({
  className,
  style,
  glowState,
}: {
  className?: string;
  style?: React.CSSProperties;
  glowState: 'ghost' | 'certified' | 'complete';
}) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    className={className}
    style={style}
  >
    {/* Heart outline */}
    <path
      d="M50 88 C50 88, 10 60, 10 33 C10 18, 22 10, 34 10 C42 10, 48 16, 50 22 C52 16, 58 10, 66 10 C78 10, 90 18, 90 33 C90 60, 50 88, 50 88Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />

    {/* Glowing trace path — only for certified/complete */}
    {glowState !== 'ghost' && (
      <path
        d="M50 88 C50 88, 10 60, 10 33 C10 18, 22 10, 34 10 C42 10, 48 16, 50 22 C52 16, 58 10, 66 10 C78 10, 90 18, 90 33 C90 60, 50 88, 50 88Z"
        stroke={ZION_BLUE}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className={
          glowState === 'complete'
            ? 'animate-trace-light'
            : 'animate-edge-glow'
        }
        style={{
          strokeDasharray: glowState === 'complete' ? '40 260' : 'none',
          filter:
            glowState === 'complete'
              ? `drop-shadow(0 0 6px ${ZION_BLUE}) drop-shadow(0 0 12px ${ZION_BLUE}80)`
              : `drop-shadow(0 0 3px ${ZION_BLUE}60)`,
        }}
      />
    )}

    {/* Shield inside the heart */}
    <path
      d="M50 30 L36 38 L36 52 C36 62, 42 70, 50 74 C58 70, 64 62, 64 52 L64 38 Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={glowState === 'complete' ? `${ZION_BLUE}30` : 'none'}
    />

    {/* Shield checkmark — only for certified states */}
    {glowState !== 'ghost' && (
      <path
        d="M44 52 L48 57 L56 46"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    )}
  </svg>
);

export function M4MHeartbeat({
  certified,
  paid,
  livesTouched,
  barberName,
  barberUserId,
  size = 'sm',
  isOwnProfile = false,
}: M4MHeartbeatProps) {
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [certificationModalOpen, setCertificationModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const sizeClass = size === 'md' ? 'w-16 h-16 md:w-24 md:h-24' : 'w-10 h-10';

  const handleClick = () => {
    if (isOwnProfile) {
      if (!certified) {
        setCertificationModalOpen(true);
      } else {
        setQrModalOpen(true);
      }
    } else {
      setVerificationModalOpen(true);
    }
  };

  const renderIcon = () => {
    // State C: Full member — beating pulse with bright glow + tracing edge
    if (certified && paid) {
      return (
        <motion.div
          animate={{ scale: [1, 1.12, 1, 1.08, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.6 }}
        >
          <HeartShieldIcon
            className={sizeClass}
            glowState="complete"
            style={{
              color: ZION_BLUE,
              filter: `drop-shadow(0 0 8px ${ZION_BLUE}) drop-shadow(0 0 16px ${ZION_BLUE}80)`,
            }}
          />
        </motion.div>
      );
    }

    // State B: Certified but not paid — brighter with edge glow
    if (certified) {
      return (
        <HeartShieldIcon
          className={`${sizeClass} opacity-60`}
          glowState="certified"
          style={{ color: ZION_BLUE }}
        />
      );
    }

    // State A: Not certified — ghost
    return (
      <HeartShieldIcon
        className={`${sizeClass} text-muted-foreground opacity-[0.15]`}
        glowState="ghost"
      />
    );
  };

  return (
    <div className="flex justify-center mt-1">
      <button
        onClick={handleClick}
        className="focus:outline-none"
        aria-label="M4M Status"
      >
        {renderIcon()}
      </button>

      <M4MVerificationModal
        open={verificationModalOpen}
        onOpenChange={setVerificationModalOpen}
        barberName={barberName}
        barberUserId={barberUserId}
        livesTouched={livesTouched}
      />

      <M4MCertificationModal
        open={certificationModalOpen}
        onOpenChange={setCertificationModalOpen}
        barberName={barberName}
        barberUserId={barberUserId}
      />

      <M4MQRCodeModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        barberName={barberName}
        barberUserId={barberUserId}
        livesTouched={livesTouched}
      />
    </div>
  );
}
