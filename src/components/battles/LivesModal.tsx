import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LiveBarberStreams } from './LiveBarberStreams';
import { isFreshLiveBroadcast } from '@/lib/liveBroadcast';

/**
 * Counts barbers currently live (battles + solo broadcasts).
 * Mirrors the gating used inside LiveBarberStreams so the modal only opens
 * when that component would actually render content.
 */
const useLiveCount = () => {
  const { data: battleCount = 0 } = useQuery({
    queryKey: ['lives-modal-battle-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('battles')
        .select('id', { count: 'exact', head: true })
        .in('status', ['waiting_for_opponent', 'active', 'voting']);
      return count ?? 0;
    },
    refetchInterval: 10000,
  });

  const { data: soloCount = 0 } = useQuery({
    queryKey: ['lives-modal-solo-count'],
    queryFn: async () => {
      const { data } = await supabase
        .from('stream_sessions')
        .select('barber_id, started_at')
        .eq('stream_type', 'solo_broadcast')
        .in('status', ['connecting', 'active']);
      const ids = Array.from(new Set((data || []).map((s: any) => s.barber_id).filter(Boolean)));
      if (!ids.length) return 0;
      const { data: barbers } = await supabase
        .from('barber_profiles')
        .select('id, is_live, last_live_check, updated_at')
        .in('id', ids);
      return (barbers || []).filter(
        (b: any) => b.is_live && isFreshLiveBroadcast(b.last_live_check, b.updated_at),
      ).length;
    },
    refetchInterval: 5000,
  });

  return battleCount + soloCount;
};

export const LivesModal = () => {
  const liveCount = useLiveCount();
  const [open, setOpen] = useState(false);
  const prevCountRef = useRef(0);

  // Auto-open: once per session when ≥1 barber is live, and again on every
  // 0 → ≥1 transition (a new barber went live).
  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = liveCount;
    if (liveCount <= 0) return;

    const seen = sessionStorage.getItem('lives_modal_seen') === 'true';
    const wentLive = prev === 0 && liveCount > 0;
    if (!seen || wentLive) {
      setOpen(true);
      sessionStorage.setItem('lives_modal_seen', 'true');
    }
  }, [liveCount]);

  if (liveCount <= 0) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[85vh] overflow-y-auto p-0 bg-background border-border">
          <DialogHeader className="sticky top-0 z-10 px-5 pt-5 pb-3 bg-background/95 backdrop-blur border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              Lives
              <Badge variant="destructive" className="text-xs px-2 py-0.5">{liveCount}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="px-2 pb-4">
            <LiveBarberStreams />
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating reopen pill — visible while live, hides when modal is open */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-full bg-red-600 text-white shadow-[0_0_18px_hsl(0_80%_50%/0.55)] hover:scale-105 transition-transform"
          aria-label="Open Lives"
        >
          <Radio className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">Lives</span>
          <span className="text-xs font-bold bg-white/20 rounded px-1.5 py-0.5">{liveCount}</span>
        </button>
      )}
    </>
  );
};

export default LivesModal;
