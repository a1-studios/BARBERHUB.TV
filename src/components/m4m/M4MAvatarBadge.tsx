import { useState } from 'react';
import { cn } from '@/lib/utils';
import m4mIcon from '@/assets/m4m-handshake-heart.webp';
import { M4MVerificationModal } from './M4MVerificationModal';
import { M4MCertificationModal } from './M4MCertificationModal';
import { M4MQRCodeModal } from './M4MQRCodeModal';

interface M4MAvatarBadgeProps {
  certified: boolean;
  paid: boolean;
  livesTouched?: number;
  barberName: string;
  barberUserId: string;
  isOwnProfile?: boolean;
  /** size of the badge in px (renders as overlay inside its `relative` parent) */
  size?: number;
  /** corner position inside the parent */
  position?: 'bottom-right' | 'bottom-center' | 'top-right';
  className?: string;
}

/**
 * Handshake-heart M4M badge designed to be overlaid INSIDE a profile avatar.
 * - Parent MUST be `position: relative`.
 * - Ghost (faded grayscale) when not certified.
 * - Soft beat + fade in/out every 6s when certified.
 */
export function M4MAvatarBadge({
  certified,
  paid,
  livesTouched = 0,
  barberName,
  barberUserId,
  isOwnProfile = false,
  size = 28,
  position = 'bottom-right',
  className,
}: M4MAvatarBadgeProps) {
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [certificationOpen, setCertificationOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isOwnProfile) {
      if (!certified) setCertificationOpen(true);
      else setQrOpen(true);
    } else {
      setVerificationOpen(true);
    }
  };

  const posClass =
    position === 'bottom-center'
      ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/4'
      : position === 'top-right'
      ? 'top-0 right-0 -translate-y-1/4 translate-x-1/4'
      : 'bottom-0 right-0 translate-y-1/5 translate-x-1/5';

  const isCertified = certified;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={isCertified ? `M4M certified — ${barberName}` : 'M4M not certified'}
        className={cn(
          'absolute z-20 p-0 m-0 bg-transparent border-0 cursor-pointer focus:outline-none',
          posClass,
          className
        )}
        style={{ width: size, height: size }}
      >
        <img
          src={m4mIcon}
          alt=""
          draggable={false}
          className={cn(
            'w-full h-full select-none pointer-events-none object-contain',
            isCertified
              ? 'animate-m4m-pulse drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]'
              : 'opacity-20 grayscale'
          )}
        />
      </button>

      <M4MVerificationModal
        open={verificationOpen}
        onOpenChange={setVerificationOpen}
        barberName={barberName}
        barberUserId={barberUserId}
        livesTouched={livesTouched}
      />
      <M4MCertificationModal
        open={certificationOpen}
        onOpenChange={setCertificationOpen}
        barberName={barberName}
        barberUserId={barberUserId}
      />
      <M4MQRCodeModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        barberName={barberName}
        barberUserId={barberUserId}
        livesTouched={livesTouched}
      />
    </>
  );
}
