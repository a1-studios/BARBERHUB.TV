import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useContenderReadiness } from '@/hooks/useContenderReadiness';
import { ReadyUpPanel } from '@/components/lobby/ReadyUpPanel';
import { FanTerminal } from '@/components/lobby/FanTerminal';
import { PrizePoolBeacon } from '@/components/lobby/PrizePoolBeacon';
import { CountdownLauncher } from '@/components/lobby/CountdownLauncher';
import { Loader2 } from 'lucide-react';

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
  const [launching, setLaunching] = useState(false);

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

      // Safety guard #2: tournament battles never use the lobby
      if (battleData.tournament_id) {
        navigate(`/battle/${battleId}/contender`, { replace: true });
        return;
      }

      // Safety guard #3: only upcoming/live battles use the lobby
      if (battleData.status !== 'live' && battleData.status !== 'upcoming') {
        navigate(`/battle/${battleId}/theater`, { replace: true });
        return;
      }

      setBattle(battleData as BattleRow);
      setLivePrizeBB(battleData.prize_amount || 0);

      // Load both barbers — battle.barber{1,2}_id are barber_profiles.id (NOT user_id)
      const ids = [battleData.barber1_id, battleData.barber2_id].filter(Boolean) as string[];
      if (ids.length === 2) {
        const { data: barbers } = await supabase
          .from('barber_profiles')
          .select('id, user_id, name, country_code')
          .in('id', ids);

        if (barbers && !cancelled) {
          const findFor = (profileId: string): BarberInfo | null => {
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
          setB1(findFor(battleData.barber1_id!));
          setB2(findFor(battleData.barber2_id!));
        }
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [battleId, navigate]);

  // Determine local user's role on this battle (compare auth.uid() to the
  // barber profiles' user_id — battle.barber{1,2}_id are profile IDs, not user IDs)
  const localPosition: 1 | 2 | null = useMemo(() => {
    if (!user) return null;
    if (b1?.userId === user.id) return 1;
    if (b2?.userId === user.id) return 2;
    return null;
  }, [user, b1, b2]);
  const isContender = localPosition !== null;
  const localBarber = localPosition === 1 ? b1 : localPosition === 2 ? b2 : null;

  // Wire presence — only meaningful for contenders, but reading state is harmless for fans
  const readiness = useContenderReadiness({
    battleId: battleId || '',
    barberId: localBarber?.profileId || 'fan-spectator',
    barberPosition: (localPosition || 1) as 1 | 2,
    displayName: localBarber?.name || 'Spectator',
    countryCode: localBarber?.countryCode || 'XX',
  });

  // Per-side ready/present derived from presence
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

  // Safety guard #4: contender joining when bothReady already true → skip lobby
  useEffect(() => {
    if (isContender && readiness.bothReady && !launching) {
      // Late joiner — bypass countdown, go straight to theater
      const t = setTimeout(() => {
        navigate(`/battle/${battleId}/contender`, { replace: true });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isContender, readiness.bothReady, launching, navigate, battleId]);

  // When both ready → fire countdown
  useEffect(() => {
    if (readiness.bothReady && !launching) setLaunching(true);
  }, [readiness.bothReady, launching]);

  const handleLaunchComplete = () => {
    if (isContender) {
      navigate(`/battle/${battleId}/contender`, { replace: true });
    } else {
      navigate(`/battle/${battleId}/theater`, { replace: true });
    }
  };

  if (loading || !battle || !b1 || !b2) {
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

  return (
    <div className="lobby-canvas fixed inset-0 overflow-hidden bg-[#05060A]">
      {/* 3D scene */}
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
            name: b2.name,
            flag: b2.flag,
            ready: b2Ready,
            present: !!b2Present,
            isLocal: localPosition === 2,
          }}
          pulse={Math.min(1, pulseTrigger * 0.05)}
          isMobile={isMobile}
          reducedMotion={reducedMotion}
        />
      </Suspense>

      {/* Center prize beacon */}
      <PrizePoolBeacon amountBB={livePrizeBB} pulseTrigger={pulseTrigger} />

      {/* Contender-only ready-up */}
      {isContender && (
        <ReadyUpPanel
          onLockIn={readiness.setReady}
          isLockedIn={readiness.localReady}
          opponentPresent={readiness.isOpponentPresent}
          opponentReady={readiness.opponentReady}
        />
      )}

      {/* Fan terminal — visible to everyone (contenders also get to see chat) */}
      {!isContender && (
        <FanTerminal
          battleId={battle.id}
          barber1={{ userId: b1.userId, profileId: b1.profileId, name: b1.name }}
          barber2={{ userId: b2.userId, profileId: b2.profileId, name: b2.name }}
          isMobile={isMobile}
        />
      )}

      {/* Countdown overlay */}
      <CountdownLauncher active={launching} onComplete={handleLaunchComplete} />
    </div>
  );
};

export default BattleLobby;
