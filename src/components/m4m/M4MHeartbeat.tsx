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

const HandsHeartIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    {/* Heart outline */}
    <path d="M50 85 C50 85, 15 60, 15 35 C15 22, 25 15, 35 15 C42 15, 48 20, 50 25 C52 20, 58 15, 65 15 C75 15, 85 22, 85 35 C85 60, 50 85, 50 85Z" />
    {/* Left hand - fingers reaching right */}
    <path d="M28 52 L38 48 L42 44 L46 48" />
    <path d="M30 56 L38 52 L42 48" />
    <path d="M32 60 L40 56 L44 52" />
    {/* Right hand - fingers reaching left */}
    <path d="M72 52 L62 48 L58 44 L54 48" />
    <path d="M70 56 L62 52 L58 48" />
    <path d="M68 60 L60 56 L56 52" />
    {/* Handshake clasp in center */}
    <path d="M46 48 C48 46, 52 46, 54 48" />
    <path d="M44 52 C47 50, 53 50, 56 52" />
    {/* Wrists */}
    <path d="M25 58 L32 60" />
    <path d="M75 58 L68 60" />
  </svg>
);

export function M4MHeartbeat({
  certified,
  paid,
  livesTouched,
  barberName,
  barberUserId,
  size = 'sm',
  isOwnProfile = false
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

  // Determine visual state
  const renderIcon = () => {
    // State C: Full member — beating pulse with Zion Blue glow
    if (certified && paid) {
      return (
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <HandsHeartIcon
            className={sizeClass}
            style={{
              color: ZION_BLUE,
              filter: `drop-shadow(0 0 6px ${ZION_BLUE}) drop-shadow(0 0 12px ${ZION_BLUE}80)`,
            }}
          />
        </motion.div>
      );
    }

    // State B: Certified but not paid — static grey outline
    if (certified) {
      return (
        <HandsHeartIcon
          className={`${sizeClass} text-muted-foreground opacity-50`}
        />
      );
    }

    // State A: Not certified — ghost outline
    return (
      <HandsHeartIcon
        className={`${sizeClass} text-gray-500 opacity-[0.15]`}
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

      {/* Client verification modal */}
      <M4MVerificationModal
        open={verificationModalOpen}
        onOpenChange={setVerificationModalOpen}
        barberName={barberName}
        barberUserId={barberUserId}
        livesTouched={livesTouched}
      />

      {/* Barber certification flow */}
      <M4MCertificationModal
        open={certificationModalOpen}
        onOpenChange={setCertificationModalOpen}
        barberName={barberName}
        barberUserId={barberUserId}
      />

      {/* Barber QR code display */}
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
