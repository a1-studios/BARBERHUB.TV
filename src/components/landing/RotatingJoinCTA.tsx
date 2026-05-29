import { useEffect, useState } from 'react';
import { RotatingBBCoin } from '@/components/economy/RotatingBBCoin';

const WORDS = ['JOIN', 'WIN', 'WATCH', 'VOTE', 'CHALLENGE', 'STREAM', 'EARN-BB'] as const;

interface Props {
  onClick: () => void;
}

export const RotatingJoinCTA = ({ onClick }: Props) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setIdx((i) => (i + 1) % WORDS.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const word = WORDS[idx];
  const showCoin = word === 'EARN-BB';

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-12 px-9 rounded-full bg-black/40 border border-cyan-400/70 text-orange-500 font-black uppercase tracking-[0.3em] text-[15px] shadow-[0_0_14px_rgba(34,211,238,0.55),inset_0_0_10px_rgba(34,211,238,0.18)] hover:shadow-[0_0_22px_rgba(34,211,238,0.8),inset_0_0_14px_rgba(34,211,238,0.28)] active:scale-95 transition-all overflow-hidden inline-flex items-center justify-center gap-2"
    >
      <span key={word} className="inline-flex items-center gap-2 animate-fade-in">
        {showCoin && <RotatingBBCoin size="xs" animate />}
        {word}
      </span>
    </button>
  );
};

export default RotatingJoinCTA;
