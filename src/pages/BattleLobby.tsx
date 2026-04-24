import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useContenderReadiness } from '@/hooks/useContenderReadiness';
import { useLobbyCameraPreview } from '@/hooks/useLobbyCameraPreview';
import { ReadyUpPanel } from '@/components/lobby/ReadyUpPanel';
import { LobbyContenderControls } from '@/components/lobby/LobbyContenderControls';
import { FanTerminal } from '@/components/lobby/FanTerminal';
import { PrizePoolBeacon } from '@/components/lobby/PrizePoolBeacon';
import { Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LobbyScene = lazy(() => import('@/components/lobby/LobbyScene'));

interface BattleRow {
  id: string;
  status: string;
  prize_amount: number | null;
  tournament_id: string | null;
  barber1_id: string | null;
  barber2_id: string | null;
}

interface BarberInfo {
  userId: string;
  profileId: string;
  name: string;
  flag?: string;
  countryCode?: string;
}

const flagFromCC = (cc?: string) => {
  if (!cc || cc.length !== 2) return undefined;
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.toUpperCase().charCodeAt(0) - 65) +
         String.fromCodePoint(A + cc.toUpperCase().charCodeAt(1) - 65);
};

const BattleLobby = () => {
  const { id: battleId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [battle, setBattle] = useState<BattleRow | null>(null);
  const [b1, setB1] = useState<BarberInfo | null>(null);
  const [b2, setB2] = useState<BarberInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulseTrigger, setPulseTrigger] = useState(0);
  const [livePrizeBB, setLivePrizeBB] = useState(0);
  const [handoff, setHandoff] = useState(false);

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Local camera/mic preview owned at the page level so we can stop it before handoff
  const {
    stream,
    hasCamera,
    hasMic,
    hasSpeaker,
    isVideoEnabled,
    isAudioEnabled,
    error: mediaError,
    start: startMedia,
    enableSpeaker,
    toggleVideo,
    toggleAudio,
    switchCamera,
    stop: stopMedia,
  } = useLobbyCameraPreview();

  const handleLeave = useCallback(() => {
    try { stopMedia(); } catch {}
    navigate('/watch', { replace: true });
  }, [stopMedia, navigate]);

  // Safety guard #1: must come from challenge flow
  useEffect(() => {
    if (!battleId) return;
    if (searchParams.get('source') !== 'challenge') {
      navigate(`/battle/${battleId}/contender`, { replace: true });
    }
  }, [battleId, searchParams, navigate]);

  // Load battle + both barber profiles
  useEffect(() => {
    if (!battleId) return;
    let cancelled = false;
    (async () => {
      const { data: battleData, error } = await supabase
        .from('battles')
        .select('id, status, prize_amount, tournament_id, barber1_id, barber2_id')
        .eq('id', battleId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !battleData) {
        navigate('/watch', { replace: true });
        return;
      }

      if (battleData.tournament_id) {
        navigate(`/battle/${battleId}/contender`, { replace: true });
        return;
      }

      if (battleData.status !== 'live' && battleData.status !== 'upcoming') {
        navigate(`/battle/${battleId}/theater`, { replace: true });
        return;
      }

      setBattle(battleData as BattleRow);
      setLivePrizeBB(battleData.prize_amount || 0);

      const ids = [battleData.barber1_id, battleData.barber2_id].filter(Boolean) as string[];
      if (ids.length > 0) {
        const { data: barbers } = await supabase
          .from('barber_profiles')
          .select('id, user_id, name, country_code')
          .in('id', ids);

        if (barbers && !cancelled) {
          const findFor = (profileId: string | null): BarberInfo | null => {
            if (!profileId) return null;
            const b = barbers.find((x) => x.id === profileId);
            if (!b) return null;
            return {
              userId: b.user_id,
              profileId: b.id,
              name: b.name || 'Contender',
              countryCode: b.country_code || undefined,
              flag: flagFromCC(b.country_code || undefined),
            };
          };
          setB1(findFor(battleData.barber1_id));
          setB2(findFor(battleData.barber2_id));
        }
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [battleId, navigate]);

  const localPosition: 1 | 2 | null = useMemo(() => {
    if (!user) return null;
    if (b1?.userId === user.id) return 1;
    if (b2?.userId === user.id) return 2;
    return null;
  }, [user, b1, b2]);
  const isContender = localPosition !== null;
  const localBarber = localPosition === 1 ? b1 : localPosition === 2 ? b2 : null;

  const readiness = useContenderReadiness({
    battleId: battleId || '',
    barberId: localBarber?.profileId || 'fan-spectator',
    barberPosition: (localPosition || 1) as 1 | 2,
    displayName: localBarber?.name || 'Spectator',
    countryCode: localBarber?.countryCode || 'XX',
    hasCamera,
  });

  const b1Ready = localPosition === 1 ? readiness.localReady : (readiness.opponentPresence?.position === 1 ? readiness.opponentReady : false);
  const b2Ready = localPosition === 2 ? readiness.localReady : (readiness.opponentPresence?.position === 2 ? readiness.opponentReady : false);
  const b1Present = localPosition === 1 ? !!user : readiness.opponentPresence?.position === 1;
  const b2Present = localPosition === 2 ? !!user : readiness.opponentPresence?.position === 2;

  // Realtime: donations → bump pulse + update live prize amount
  useEffect(() => {
    if (!battleId) return;
    const ch = supabase
      .channel(`lobby-donations-${battleId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'battle_donations', filter: `battle_id=eq.${battleId}` },
        (payload: any) => {
          setPulseTrigger((n) => n + 1);
          if (payload?.new?.amount_bb) setLivePrizeBB((v) => v + payload.new.amount_bb);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [battleId]);

  // BOTH READY → instant handoff (no countdown). Stop media first so LiveKit can re-acquire.
  useEffect(() => {
    if (!readiness.bothReady || handoff) return;
    setHandoff(true);
    const t = setTimeout(() => {
      stopMedia();
      if (isContender) navigate(`/battle/${battleId}/contender`, { replace: true });
      else navigate(`/battle/${battleId}/theater`, { replace: true });
    }, 650); // brief whoosh transition
    return () => clearTimeout(t);
  }, [readiness.bothReady, handoff, isContender, navigate, battleId, stopMedia]);

  if (loading || !battle || !b1) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#05060A]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-xs font-mono uppercase tracking-widest text-cyan-300/60">
            Entering the Arena...
          </p>
        </div>
      </div>
    );
  }

  const b2Display = b2 ?? { name: 'Awaiting Challenger', flag: undefined, userId: '', profileId: '' };

  return (
    <div className="lobby-canvas fixed inset-0 overflow-hidden bg-[#05060A]">
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        }
      >
        <LobbyScene
          barber1={{
            name: b1.name,
            flag: b1.flag,
            ready: b1Ready,
            present: !!b1Present,
            isLocal: localPosition === 1,
          }}
          barber2={{
            name: b2Display.name,
            flag: b2Display.flag,
            ready: b2Ready,
            present: !!b2Present,
            isLocal: localPosition === 2,
          }}
          pulse={Math.min(1, pulseTrigger * 0.05)}
          isMobile={isMobile}
          reducedMotion={reducedMotion}
          localStream={stream}
        />
      </Suspense>

      <PrizePoolBeacon amountBB={livePrizeBB} pulseTrigger={pulseTrigger} />

      {isContender && (
        <ReadyUpPanel
          isLockedIn={readiness.localReady}
          opponentPresent={readiness.isOpponentPresent}
          opponentReady={readiness.opponentReady}
          hasCamera={hasCamera}
          hasMic={hasMic}
          hasSpeaker={hasSpeaker}
          onAllowMedia={startMedia}
          onEnableSpeaker={enableSpeaker}
          onLockIn={readiness.setReady}
          permError={mediaError}
        />
      )}

      {!isContender && b2 && (
        <FanTerminal
          battleId={battle.id}
          barber1={{ userId: b1.userId, profileId: b1.profileId, name: b1.name }}
          barber2={{ userId: b2.userId, profileId: b2.profileId, name: b2.name }}
          isMobile={isMobile}
        />
      )}

      {/* Quick whoosh transition when both contenders are locked in */}
      <AnimatePresence>
        {handoff && (
          <motion.div
            key="handoff"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              className="text-center"
            >
              <div className="text-5xl font-black tracking-[0.3em] bg-gradient-to-r from-orange-400 via-cyan-300 to-orange-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(34,211,238,0.7)]">
                FIGHT
              </div>
              <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.4em] text-cyan-300/80">
                entering the ring
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BattleLobby;
