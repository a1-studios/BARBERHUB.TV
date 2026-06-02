import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useBarberLiveState } from '@/hooks/useBarberLiveState';

interface LiveAvatarProps {
  barberUserId?: string | null;
  /** Fallback route when the barber is not live (typically their profile). */
  fallbackHref?: string;
  /** Show a small LIVE / BATTLE pill under the avatar. */
  showLabel?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Wraps any avatar with a unified live-state ring + click-to-join behavior.
 * Single source of truth: useBarberLiveState (battle > broadcast > none).
 */
export const LiveAvatar = ({
  barberUserId,
  fallbackHref,
  showLabel = false,
  className,
  children,
}: LiveAvatarProps) => {
  const navigate = useNavigate();
  const { isLive, kind, destination } = useBarberLiveState(barberUserId);

  const handleClick = () => {
    const href = destination ?? fallbackHref;
    if (href) navigate(href);
  };

  const ringColor =
    kind === 'battle'
      ? 'ring-primary shadow-[0_0_18px_hsl(var(--primary)/0.7)]'
      : 'ring-red-500 shadow-[0_0_18px_rgb(239_68_68_/_0.7)]';

  const label = kind === 'battle' ? 'BATTLE' : 'LIVE';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!destination && !fallbackHref}
      className={cn(
        'relative inline-flex flex-col items-center group',
        (destination || fallbackHref) && 'cursor-pointer',
        className,
      )}
      aria-label={isLive ? `${label} — open` : undefined}
    >
      <div
        className={cn(
          'relative rounded-full transition-all',
          isLive && 'ring-2 ring-offset-2 ring-offset-background animate-pulse',
          isLive && ringColor,
        )}
      >
        {children}
        {isLive && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
        )}
      </div>
      {isLive && showLabel && (
        <span
          className={cn(
            'mt-1 text-[9px] font-extrabold tracking-widest px-1.5 py-0.5 rounded-sm',
            kind === 'battle'
              ? 'bg-primary text-primary-foreground'
              : 'bg-red-500 text-white',
          )}
        >
          {label}
        </span>
      )}
    </button>
  );
};
