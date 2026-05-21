import { motion } from 'framer-motion';
import { Ticket, ArrowRight } from 'lucide-react';
import { markGateCompleted } from '@/components/promotion-gate/useGateState';
import type { TierColor } from '@/components/ui/scroll-morph-hero';

interface Props {
  ticketCode: string;
  tierColor: TierColor;
  onClose: () => void;
}

const TIER_STYLE: Record<TierColor, { border: string; glow: string; text: string; bg: string }> = {
  white:  { border: 'hsla(0,0%,100%,0.6)',   glow: 'hsla(0,0%,100%,0.5)',  text: 'hsl(0,0%,98%)',    bg: 'hsla(0,0%,100%,0.08)' },
  blue:   { border: 'hsla(195,100%,55%,0.8)', glow: 'hsla(195,100%,55%,0.65)', text: 'hsl(195,100%,82%)', bg: 'hsla(195,100%,50%,0.12)' },
  orange: { border: 'hsla(20,100%,56%,0.95)', glow: 'hsla(20,100%,56%,0.75)',  text: 'hsl(28,100%,72%)',  bg: 'hsla(20,100%,56%,0.16)' },
};

const haptic = (ms = 25) => { try { navigator.vibrate?.(ms); } catch { /* */ } };

export const StepTicketReveal = ({ ticketCode, tierColor, onClose }: Props) => {
  const s = TIER_STYLE[tierColor];

  const save = () => {
    haptic(60);
    markGateCompleted();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-between h-full text-center pb-2"
    >
      <div className="pt-3 space-y-1.5">
        <span className="text-[10px] uppercase tracking-[0.25em] text-white/45 font-bold">Special Ticket</span>
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
          Locked in.
        </h2>
        <p className="text-xs text-white/65 px-6">Your color is sealed. Tune in Sunday.</p>
      </div>

      <motion.div
        initial={{ scale: 0.6, rotateZ: -6, opacity: 0 }}
        animate={{ scale: 1, rotateZ: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.15 }}
        className="relative my-6 w-full max-w-[320px] px-1"
      >
        <motion.div
          animate={{ opacity: [0.5, 0.95, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="absolute -inset-3 rounded-[22px] blur-xl"
          style={{ background: s.glow }}
        />
        <div
          className="relative rounded-[20px] p-6"
          style={{
            background: `linear-gradient(160deg, hsla(0,0%,4%,0.92), hsla(0,0%,8%,0.88)), ${s.bg}`,
            border: `2px solid ${s.border}`,
            boxShadow: `0 0 50px ${s.glow}, inset 0 1px 0 hsla(0,0%,100%,0.2), inset 0 -1px 0 hsla(0,0%,0%,0.4)`,
          }}
        >
          {/* Notches */}
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full" style={{ background: '#0a0a0f', border: `2px solid ${s.border}` }} />
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full" style={{ background: '#0a0a0f', border: `2px solid ${s.border}` }} />

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.25em] font-black mb-3"
            style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
            <Ticket className="w-3 h-3" /> Tier {tierColor}
          </div>

          <div className="text-[10px] uppercase tracking-[0.3em] text-white/45 font-bold mb-1">Your ticket</div>
          <div
            className="text-4xl font-black font-mono text-white tracking-wider"
            style={{ textShadow: `0 0 24px ${s.glow}` }}
          >
            {ticketCode}
          </div>

          <div className="mt-4 pt-3 border-t border-dashed flex items-center justify-between text-[10px] uppercase tracking-wider font-bold"
            style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
            <span className="text-white/45">Draw</span>
            <span style={{ color: s.text }}>Sunday · Live</span>
          </div>
        </div>
      </motion.div>

      <button
        type="button"
        onClick={save}
        className="w-full h-14 rounded-[16px] font-black uppercase tracking-wider text-base text-white flex items-center justify-center gap-2 transition-transform active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
          border: '1px solid rgba(255,255,255,0.35)',
          boxShadow: '0 12px 28px rgba(255,95,31,0.55), inset 0 1px 0 rgba(255,255,255,0.5)',
        }}
      >
        Save my ticket <ArrowRight className="w-5 h-5" />
      </button>
    </motion.div>
  );
};
