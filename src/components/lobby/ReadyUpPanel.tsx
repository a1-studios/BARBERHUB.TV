import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Mic, Lock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HapticFeedback } from '@/utils/hapticFeedback';
import { AudioManager } from '@/utils/audioManager';
import { cn } from '@/lib/utils';

interface ReadyUpPanelProps {
  onLockIn: (ready: boolean) => Promise<void> | void;
  isLockedIn: boolean;
  opponentPresent: boolean;
  opponentReady: boolean;
}

type CheckState = { camera: boolean; mic: boolean; lock: boolean };

export const ReadyUpPanel = ({ onLockIn, isLockedIn, opponentPresent, opponentReady }: ReadyUpPanelProps) => {
  const [checks, setChecks] = useState<CheckState>({ camera: false, mic: false, lock: isLockedIn });
  const [permError, setPermError] = useState<string | null>(null);

  useEffect(() => {
    setChecks((c) => ({ ...c, lock: isLockedIn }));
  }, [isLockedIn]);

  const handleCamera = async () => {
    setPermError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      HapticFeedback.vote();
      AudioManager.play('vote');
      setChecks((c) => ({ ...c, camera: true }));
    } catch {
      setPermError('Camera permission denied');
    }
  };

  const handleMic = async () => {
    setPermError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      HapticFeedback.vote();
      AudioManager.play('vote');
      setChecks((c) => ({ ...c, mic: true }));
    } catch {
      setPermError('Microphone permission denied');
    }
  };

  const canLock = checks.camera && checks.mic;

  const handleLock = async () => {
    if (!canLock) return;
    const next = !checks.lock;
    HapticFeedback.streak(next ? 3 : 1);
    AudioManager.play(next ? 'combo2' : 'vote');
    setChecks((c) => ({ ...c, lock: next }));
    await onLockIn(next);
  };

  return (
    <div className="lobby-ui-interactive pointer-events-auto absolute left-1/2 top-4 z-20 w-[min(480px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/60 p-3 backdrop-blur-xl shadow-2xl ring-1 ring-cyan-400/20 sm:top-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/80">Ready Check</h2>
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide">
          <span className={cn('h-1.5 w-1.5 rounded-full', opponentPresent ? 'bg-green-400' : 'bg-white/30 animate-pulse')} />
          <span className="text-white/60">
            {opponentPresent ? (opponentReady ? 'OPP LOCKED' : 'OPP ARMING') : 'WAITING OPP'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <CheckTile icon={Camera} label="Camera" checked={checks.camera} onClick={handleCamera} />
        <CheckTile icon={Mic} label="Mic" checked={checks.mic} onClick={handleMic} />
        <CheckTile
          icon={Lock}
          label={checks.lock ? 'Locked' : 'Lock In'}
          checked={checks.lock}
          onClick={handleLock}
          disabled={!canLock}
          isLockTile
        />
      </div>

      {permError && <p className="mt-2 text-center text-xs text-red-400">{permError}</p>}

      {checks.lock && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-center text-[11px] font-semibold text-cyan-300"
        >
          {opponentReady ? '🔥 BOTH LOCKED — battle starts in seconds' : 'Waiting for opponent to lock in...'}
        </motion.p>
      )}
    </div>
  );
};

const CheckTile = ({
  icon: Icon,
  label,
  checked,
  onClick,
  disabled,
  isLockTile,
}: {
  icon: typeof Camera;
  label: string;
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
  isLockTile?: boolean;
}) => (
  <Button
    variant="ghost"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'relative h-auto flex-col gap-1 rounded-xl border-2 px-2 py-3 transition-all',
      checked && !isLockTile && 'border-cyan-400 bg-cyan-400/10 text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.4)]',
      checked && isLockTile && 'border-cyan-400 bg-cyan-400/20 text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.6)]',
      !checked && 'border-white/15 bg-white/5 text-white/70 hover:border-orange-400/60 hover:bg-orange-500/10 hover:text-orange-200',
      disabled && 'opacity-40 cursor-not-allowed hover:border-white/15 hover:bg-white/5 hover:text-white/70'
    )}
  >
    <div className="relative">
      <Icon className="h-4 w-4" />
      {checked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -right-1.5 -top-1.5 rounded-full bg-cyan-400 p-0.5"
        >
          <Check className="h-2 w-2 text-black" strokeWidth={4} />
        </motion.div>
      )}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
  </Button>
);
