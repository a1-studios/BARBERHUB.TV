import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Mic, Volume2, Lock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HapticFeedback } from '@/utils/hapticFeedback';
import { AudioManager } from '@/utils/audioManager';
import { cn } from '@/lib/utils';

interface ReadyUpPanelProps {
  isLockedIn: boolean;
  opponentPresent: boolean;
  opponentReady: boolean;
  hasCamera: boolean;
  hasMic: boolean;
  hasSpeaker: boolean;
  onAllowMedia: () => Promise<MediaStream | null> | void;
  onEnableSpeaker: () => Promise<boolean> | void;
  onLockIn: (ready: boolean) => Promise<void> | void;
  permError?: string | null;
}

export const ReadyUpPanel = ({
  isLockedIn,
  opponentPresent,
  opponentReady,
  hasCamera,
  hasMic,
  hasSpeaker,
  onAllowMedia,
  onEnableSpeaker,
  onLockIn,
  permError,
}: ReadyUpPanelProps) => {
  const [locking, setLocking] = useState(false);
  const mediaGranted = hasCamera && hasMic;
  const canLock = mediaGranted && hasSpeaker;

  const handleAllowMedia = async () => {
    HapticFeedback.vote();
    AudioManager.play('vote');
    await onAllowMedia();
  };

  const handleSpeaker = async () => {
    HapticFeedback.vote();
    AudioManager.play('vote');
    await onEnableSpeaker();
  };

  const handleLock = async () => {
    if (!canLock || locking) return;
    setLocking(true);
    HapticFeedback.streak(3);
    AudioManager.play('combo2');
    try {
      await onLockIn(!isLockedIn);
    } finally {
      setLocking(false);
    }
  };

  // Auto-prompt the speaker tile silently right after media is granted (single tap UX).
  useEffect(() => {
    if (mediaGranted && !hasSpeaker) {
      onEnableSpeaker();
    }
  }, [mediaGranted, hasSpeaker, onEnableSpeaker]);

  return (
    <div className="lobby-ui-interactive pointer-events-auto absolute left-1/2 z-20 w-[calc(100%-1rem)] max-w-[420px] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/65 p-2.5 backdrop-blur-xl shadow-2xl ring-1 ring-cyan-400/20"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Ready Check</h2>
        <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wide">
          <span className={cn('h-1.5 w-1.5 rounded-full', opponentPresent ? 'bg-green-400' : 'bg-white/30 animate-pulse')} />
          <span className="text-white/60">
            {opponentPresent ? (opponentReady ? 'OPP LOCKED' : 'OPP ARMING') : 'WAITING OPP'}
          </span>
        </div>
      </div>

      {!mediaGranted ? (
        <div className="grid grid-cols-2 gap-1.5">
          <BigTile
            icon={Camera}
            secondaryIcon={Mic}
            label="Allow Cam + Mic"
            sub="One tap"
            onClick={handleAllowMedia}
          />
          <BigTile
            icon={Lock}
            label="Lock In"
            sub="Allow first"
            disabled
          />
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-cyan-300/80">
            <span className="flex items-center gap-1"><Camera className="h-3 w-3" /> Cam</span>
            <span className="text-white/30">·</span>
            <span className="flex items-center gap-1"><Mic className="h-3 w-3" /> Mic</span>
            <span className="text-white/30">·</span>
            <button
              onClick={handleSpeaker}
              className={cn('flex items-center gap-1 rounded px-1 py-0.5', hasSpeaker ? 'text-cyan-300' : 'text-orange-300 hover:text-orange-200')}
            >
              <Volume2 className="h-3 w-3" /> Spk {hasSpeaker ? '✓' : '?'}
            </button>
            <span className="text-white/30">·</span>
            <Check className="h-3 w-3 text-cyan-300" />
          </div>
          <Button
            onClick={handleLock}
            disabled={!canLock || locking}
            className={cn(
              'h-10 w-full rounded-xl border-2 text-xs font-black uppercase tracking-[0.2em] transition-all',
              isLockedIn
                ? 'border-cyan-400 bg-cyan-400/20 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.6)]'
                : 'border-orange-400/70 bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-200 hover:border-orange-300 hover:bg-orange-500/30',
              !canLock && 'opacity-40 cursor-not-allowed'
            )}
          >
            <Lock className="mr-1.5 h-3.5 w-3.5" />
            {isLockedIn ? 'LOCKED IN' : "I'M READY"}
          </Button>
        </>
      )}

      {permError && <p className="mt-1.5 text-center text-[10px] text-red-400">{permError}</p>}

      {isLockedIn && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 text-center text-[10px] font-semibold text-cyan-300"
        >
          {opponentReady ? '🔥 BOTH LOCKED — entering ring' : 'Waiting for opponent to lock in...'}
        </motion.p>
      )}
    </div>
  );
};

const BigTile = ({
  icon: Icon,
  secondaryIcon: Secondary,
  label,
  sub,
  onClick,
  disabled,
}: {
  icon: typeof Camera;
  secondaryIcon?: typeof Camera;
  label: string;
  sub?: string;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <Button
    variant="ghost"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'relative h-auto flex-col gap-0.5 rounded-xl border-2 px-2 py-2.5 transition-all',
      'border-white/15 bg-white/5 text-white/80 hover:border-orange-400/70 hover:bg-orange-500/10 hover:text-orange-100',
      disabled && 'opacity-40 cursor-not-allowed hover:border-white/15 hover:bg-white/5 hover:text-white/80'
    )}
  >
    <div className="flex items-center gap-1">
      <Icon className="h-3.5 w-3.5" />
      {Secondary && <Secondary className="h-3.5 w-3.5" />}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    {sub && <span className="text-[8px] font-mono uppercase tracking-widest text-white/40">{sub}</span>}
  </Button>
);
