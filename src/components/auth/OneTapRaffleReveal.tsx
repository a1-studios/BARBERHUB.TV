import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Ticket } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type TierColor = 'white' | 'blue' | 'orange';
const TIER_STYLE: Record<TierColor, { ring: string; text: string; glow: string }> = {
  white:  { ring: 'hsla(0,0%,100%,0.55)',  text: 'hsl(0,0%,98%)',    glow: 'hsla(0,0%,100%,0.35)' },
  blue:   { ring: 'hsla(195,100%,55%,0.7)', text: 'hsl(195,100%,80%)', glow: 'hsla(195,100%,55%,0.55)' },
  orange: { ring: 'hsla(20,100%,56%,0.85)', text: 'hsl(28,100%,70%)',  glow: 'hsla(20,100%,56%,0.6)' },
};

/**
 * Reveals the raffle ticket awarded after Google One Tap signup so those users
 * see the same celebration as email signups (which run the full spin reveal).
 */
export const OneTapRaffleReveal = () => {
  const { user } = useAuth();
  const [data, setData] = useState<{ ticketCode: string; tierColor: TierColor } | null>(null);

  useEffect(() => {
    if (!user) return;
    try {
      const raw = sessionStorage.getItem('one_tap_raffle_reveal');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.ticketCode) {
        setData({ ticketCode: parsed.ticketCode, tierColor: (parsed.tierColor as TierColor) ?? 'white' });
      }
      sessionStorage.removeItem('one_tap_raffle_reveal');
    } catch { /* ignore */ }
  }, [user]);

  if (!data) return null;
  const style = TIER_STYLE[data.tierColor];

  return (
    <Dialog open onOpenChange={() => setData(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" /> Your raffle ticket
          </DialogTitle>
          <DialogDescription>Locked in. Tune in Sunday for the draw.</DialogDescription>
        </DialogHeader>

        <div
          className="mx-auto my-2 rounded-2xl px-6 py-5 text-center"
          style={{
            background: 'hsla(0,0%,4%,0.85)',
            border: `1.5px solid ${style.ring}`,
            boxShadow: `0 0 40px ${style.glow}`,
            color: style.text,
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold opacity-70">Ticket</div>
          <div className="font-mono text-2xl font-black mt-1" style={{ textShadow: `0 0 18px ${style.glow}` }}>
            {data.ticketCode}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OneTapRaffleReveal;
