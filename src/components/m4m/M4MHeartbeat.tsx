import { useState } from 'react';
import { motion } from 'framer-motion';
import { M4MVerificationModal } from './M4MVerificationModal';

interface M4MHeartbeatProps {
  certified: boolean;
  paid: boolean;
  livesTouched: number;
  barberName: string;
  barberUserId: string;
  size?: 'sm' | 'md';
}

const ZION_BLUE = '#002D62';

const HandsHeartIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    {/* Left hand reaching up and curving right to form half heart */}
    <path d="M16 40 C10 36, 6 30, 8 24 C10 18, 16 16, 20 20 C24 24, 28 28, 32 32" />
    {/* Right hand reaching up and curving left to form half heart */}
    <path d="M48 40 C54 36, 58 30, 56 24 C54 18, 48 16, 44 20 C40 24, 36 28, 32 32" />
    {/* Fingers interlocking at bottom */}
    <path d="M26 36 L30 34 M34 34 L38 36" />
    {/* Small heart shape at top where hands meet */}
    <path d="M28 18 C28 14, 32 12, 32 16 C32 12, 36 14, 36 18 C36 22, 32 26, 32 26 C32 26, 28 22, 28 18Z" />
  </svg>
);

export function M4MHeartbeat({
  certified,
  paid,
  livesTouched,
  barberName,
  barberUserId,
  size = 'sm'
}: M4MHeartbeatProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const sizeClass = size === 'md' ? 'w-16 h-16 md:w-24 md:h-24' : 'w-10 h-10';

  // State A: Not certified — ghost outline
  if (!certified) {
    return (
      <div className="flex justify-center mt-1">
        <button
          onClick={() => setModalOpen(true)}
          className="focus:outline-none"
          aria-label="M4M Status"
        >
          <HandsHeartIcon
            className={`${sizeClass} text-gray-500 opacity-[0.15]`}
          />
        </button>
        <M4MVerificationModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          barberName={barberName}
          barberUserId={barberUserId}
          livesTouched={livesTouched}
        />
      </div>
    );
  }

  // State B: Certified but not paid — static grey outline
  if (!paid) {
    return (
      <div className="flex justify-center mt-1">
        <button
          onClick={() => setModalOpen(true)}
          className="focus:outline-none"
          aria-label="M4M Status"
        >
          <HandsHeartIcon
            className={`${sizeClass} text-muted-foreground opacity-50`}
          />
        </button>
        <M4MVerificationModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          barberName={barberName}
          barberUserId={barberUserId}
          livesTouched={livesTouched}
        />
      </div>
    );
  }

  // State C: Full member — beating pulse with Zion Blue glow
  return (
    <div className="flex justify-center mt-1">
      <button
        onClick={() => setModalOpen(true)}
        className="focus:outline-none"
        aria-label="M4M Heartbeat"
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <HandsHeartIcon
            className={sizeClass}
            style={{
              color: ZION_BLUE,
              filter: `drop-shadow(0 0 6px ${ZION_BLUE}) drop-shadow(0 0 12px ${ZION_BLUE}80)`,
            }}
          />
        </motion.div>
      </button>
      <M4MVerificationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        barberName={barberName}
        barberUserId={barberUserId}
        livesTouched={livesTouched}
      />
    </div>
  );
}
