import { useEffect, useState } from 'react';

const WORDS = ['JOIN', 'WIN', 'WATCH', 'VOTE', 'CHALLENGE'] as const;

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

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-11 px-8 rounded-full bg-black/40 border border-cyan-400/70 text-cyan-100 font-black uppercase tracking-[0.3em] text-sm shadow-[0_0_14px_rgba(34,211,238,0.55),inset_0_0_10px_rgba(34,211,238,0.18)] hover:shadow-[0_0_22px_rgba(34,211,238,0.8),inset_0_0_14px_rgba(34,211,238,0.28)] active:scale-95 transition-all overflow-hidden"
    >
      <span
        key={WORDS[idx]}
        className="inline-block animate-fade-in"
      >
        {WORDS[idx]}
      </span>
    </button>
  );
};

export default RotatingJoinCTA;
