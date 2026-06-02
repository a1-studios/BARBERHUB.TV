import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeAuthedFunction } from '@/lib/invokeAuthed';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Swords, Coins, Clock, Users, Trophy, Lock, Zap, Loader2, ChevronDown, Flame, Settings2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { useChallengeStakeConfig } from '@/hooks/useChallengeStakeConfig';
import { useQuickPlayConfig } from '@/hooks/useQuickPlayConfig';
import { AcceptChallengeModal } from './AcceptChallengeModal';
import { differenceInSeconds } from 'date-fns';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Challenge {
  id: string;
  challenger_id: string;
  challenger_username: string;
  title: string;
  stake_amount: number | null;
  pot_total: number | null;
  donations_total: number | null;
  created_at: string;
  status: string;
  expires_at: string | null;
  duration_minutes: number | null;
}

const QUICK_PRESETS = [
  { title: '⚔️ Sharpest Fade', stake: 100, emoji: '💈', color: 'from-blue-500 to-cyan-500' },
  { title: '🧔 Beard Battle', stake: 150, emoji: '🔥', color: 'from-orange-500 to-red-500' },
  { title: '🎨 Freestyle Showdown', stake: 200, emoji: '🎯', color: 'from-purple-500 to-pink-500' },
];

const CountdownBadge = ({ expiresAt }: { expiresAt: string }) => {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, differenceInSeconds(new Date(expiresAt), new Date())));

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, differenceInSeconds(new Date(expiresAt), new Date()));
      setSecondsLeft(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (secondsLeft <= 0) return <Badge variant="destructive" className="text-[10px]">EXPIRED</Badge>;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isUrgent = secondsLeft < 300;

  return (
    <Badge variant="outline" className={`text-[10px] ${isUrgent ? 'border-destructive/50 text-destructive animate-pulse' : 'border-blue-500/50 text-blue-500'}`}>
      <Clock className="w-3 h-3 mr-1" />
      {mins}:{secs.toString().padStart(2, '0')}
    </Badge>
  );
};

const QuickChallengePresets = ({ isSilverPlus }: { isSilverPlus: boolean }) => {
  const [loadingPreset, setLoadingPreset] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { stakesEnabled } = useChallengeStakeConfig();

  const handleQuickChallenge = async (preset: typeof QUICK_PRESETS[0], index: number) => {
    if (stakesEnabled && !isSilverPlus) {
      toast.error('Silver+ subscription required to issue challenges');
      return;
    }
    setLoadingPreset(index);
    try {
      const effectiveStake = stakesEnabled ? preset.stake : 0;
      const { data, error } = await invokeAuthedFunction('create-challenge-stake', {
        title: preset.title, stake_amount: effectiveStake, duration_minutes: 15,
      });

      if (error) { if (error.message !== 'Not signed in' && error.message !== 'Session expired') throw error; return; }
      if (data?.error) throw new Error(data.error);

      toast.success(
        effectiveStake > 0
          ? `🔥 "${preset.title}" issued! ${effectiveStake} BB staked.`
          : `🔥 "${preset.title}" issued! Viewers can donate to the pot.`
      );
      queryClient.invalidateQueries({ queryKey: ['open-challenges'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create challenge');
    } finally {
      setLoadingPreset(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-500" />
        <h4 className="text-sm font-bold text-foreground">Instant Challenge</h4>
        <span className="text-[10px] text-muted-foreground">One tap to start</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {QUICK_PRESETS.map((preset, i) => (
          <motion.button
            key={preset.title}
            whileTap={{ scale: 0.93 }}
            whileHover={{ scale: 1.03 }}
            disabled={loadingPreset !== null || (stakesEnabled && !isSilverPlus)}
            onClick={() => handleQuickChallenge(preset, i)}
            className={`relative p-3 sm:p-4 rounded-xl border border-border/50 bg-gradient-to-br ${preset.color} hover:shadow-lg hover:shadow-primary/10 transition-shadow duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden`}
          >
            <div className="relative z-10">
              <span className="text-xl sm:text-2xl block">{preset.emoji}</span>
              <h5 className="font-bold text-white text-[11px] sm:text-sm mt-1 leading-tight">{preset.title}</h5>
              {stakesEnabled ? (
                <div className="flex items-center gap-1 mt-1.5">
                  <Coins className="w-3 h-3 text-yellow-300" />
                  <span className="text-[10px] sm:text-xs font-bold text-yellow-300">{preset.stake} BB</span>
                </div>
              ) : (
                <div className="mt-1.5 text-[10px] sm:text-xs font-bold text-white/90">FREE</div>
              )}
              {loadingPreset === i && (
                <Loader2 className="absolute top-0 right-0 w-4 h-4 text-white animate-spin" />
              )}
            </div>
            {stakesEnabled && !isSilverPlus && (
              <div className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-center z-20">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" /> Silver+
                </div>
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

const CustomChallengeForm = ({ isSilverPlus }: { isSilverPlus: boolean }) => {
  const { barberBucks: balance } = useBarberBucks();
  const { stakesEnabled, minStake } = useChallengeStakeConfig();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [stakeValue, setStakeValue] = useState(minStake);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { setStakeValue(prev => Math.max(prev, minStake)); }, [minStake]);

  const effectiveStake = stakesEnabled ? stakeValue : 0;
  const hasEnoughBalance = !stakesEnabled || (balance || 0) >= effectiveStake;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((stakesEnabled && !isSilverPlus) || !title || !hasEnoughBalance) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await invokeAuthedFunction('create-challenge-stake', {
        title,
        stake_amount: effectiveStake,
        challenge_message: message || null,
        duration_minutes: 15,
      });

      if (error) { if (error.message !== 'Not signed in' && error.message !== 'Session expired') throw error; setIsSubmitting(false); return; }
      if (data?.error) throw new Error(data.error);

      toast.success(
        effectiveStake > 0
          ? `🔥 Challenge issued! ${effectiveStake} BB staked.`
          : `🔥 Challenge issued! Viewers can donate to the pot.`
      );
      queryClient.invalidateQueries({ queryKey: ['open-challenges'] });
      setTitle('');
      setStakeValue(minStake);
      setMessage('');
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create challenge');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (stakesEnabled && !isSilverPlus) return null;

  const sliderMax = Math.max(minStake * 5, 500);
  const sliderStep = Math.max(Math.round(minStake / 2), 50);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-3 rounded-lg border border-dashed border-border/60 hover:border-primary/40 hover:bg-muted/20 transition-colors text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <span className="font-medium">Custom Challenge</span>
          </div>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm space-y-4"
        >
          {/* Balance — only show when stakes are enabled */}
          {stakesEnabled && (
            <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground">Balance</span>
              <div className="flex items-center gap-1 font-bold text-sm text-foreground">
                <Coins className="w-3.5 h-3.5 text-yellow-500" />
                {balance?.toLocaleString() || 0} BB
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="custom-title" className="text-xs">Title</Label>
              <Input
                id="custom-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Best Fade in Miami"
                required
                className="mt-1 h-9 text-sm"
              />
            </div>

            {stakesEnabled ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Stake</Label>
                  <span className="text-sm font-bold text-yellow-500">{stakeValue} BB</span>
                </div>
                <Slider
                  value={[stakeValue]}
                  onValueChange={([v]) => setStakeValue(v)}
                  min={minStake}
                  max={sliderMax}
                  step={sliderStep}
                  className="py-1"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{minStake} BB</span>
                  <span>{sliderMax} BB</span>
                </div>
                {!hasEnoughBalance && (
                  <p className="text-[11px] text-destructive mt-1">Insufficient balance ({balance || 0} BB)</p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-[11px] text-muted-foreground">
                🆓 <span className="font-semibold text-foreground">Free challenge</span> — viewers donate to grow the winner's pot.
              </div>
            )}

            <div>
              <Label htmlFor="custom-msg" className="text-xs">Trash Talk (optional)</Label>
              <Textarea
                id="custom-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="I can out-fade anyone in the city!"
                className="mt-1 min-h-[60px] text-sm"
                rows={2}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !title || !hasEnoughBalance}
              className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-600 h-9 text-sm"
            >
              {isSubmitting ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Creating...</>
              ) : stakesEnabled ? (
                <>🔥 Stake {stakeValue} BB & Challenge</>
              ) : (
                <>🔥 Issue Free Challenge</>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              {stakesEnabled
                ? 'Opponent matches your stake · Winner takes pot minus 5% to jackpot'
                : 'Viewers donate to the pot · Winner takes 95%, 5% to jackpot'}
            </p>
          </form>
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const ChallengeFeed = () => {
  const { user } = useAuth();
  const { isBarber } = useUserRole();
  const { tierName } = useSubscriptionLimits();
  const { quickPlayEnabled } = useQuickPlayConfig();
  const queryClient = useQueryClient();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  // DEV_MODE returns 'diamond' from useSubscriptionLimits, so this is always true in dev
  const isSilverPlus = true;

  const { data: jackpot } = useQuery({
    queryKey: ['challenge-jackpot'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_prize_pool')
        .select('total_pool_bb, total_challenges_completed')
        .eq('pool_year', new Date().getFullYear())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['open-challenges', user?.id ?? 'anon'],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      // Only show truly OPEN Quick Play challenges — drop matched/declined/expired rows.
      // Hide direct (targeted) challenges from everyone except the challenger and target.
      let query = supabase
        .from('open_challenges')
        .select('*')
        .eq('status', 'waiting_for_opponent')
        .gt('expires_at', nowIso);

      if (user?.id) {
        query = query.or(
          `target_barber_id.is.null,target_barber_id.eq.${user.id},challenger_id.eq.${user.id}`,
        );
      } else {
        query = query.is('target_barber_id', null);
      }

      const { data, error } = await query
        .order('stake_amount', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as Challenge[]).filter(c => {
        if (!c.expires_at) return false;
        return new Date(c.expires_at) > new Date();
      });
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('open-challenges-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'open_challenges' }, () => {
        queryClient.invalidateQueries({ queryKey: ['open-challenges'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  if (!quickPlayEnabled) {
    return (
      <div className="text-center py-8 bg-card/30 backdrop-blur-sm rounded-lg border border-dashed border-border">
        <Swords className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
        <h3 className="text-sm font-bold text-foreground mb-1">Quick Play is Off</h3>
        <p className="text-xs text-muted-foreground">Unranked challenges are temporarily disabled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Jackpot Pool Banner */}
      {jackpot && (jackpot.total_pool_bb || 0) > 0 && (
        <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <div>
                <h4 className="font-bold text-foreground text-xs">Challenge Jackpot</h4>
                <p className="text-[10px] text-muted-foreground">{jackpot.total_challenges_completed || 0} completed</p>
              </div>
            </div>
            <div className="flex items-center gap-1 font-bold text-lg text-yellow-500">
              <Coins className="w-4 h-4" />
              {(jackpot.total_pool_bb || 0).toLocaleString()} BB
            </div>
          </div>
        </Card>
      )}

      {/* Preset Cards */}
      {isBarber && <QuickChallengePresets isSilverPlus={isSilverPlus} />}

      {/* Custom Challenge */}
      {isBarber && <CustomChallengeForm isSilverPlus={isSilverPlus} />}

      {/* Divider */}
      <div className="flex items-center gap-2 pt-1">
        <Flame className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-bold text-foreground">Open Challenges</h4>
        <Badge variant="outline" className="text-[10px] ml-auto">{challenges.length} active</Badge>
      </div>

      {/* Active Challenges */}
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="w-5 h-5 mx-auto animate-spin text-muted-foreground" />
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-6 bg-card/30 backdrop-blur-sm rounded-lg border border-border">
          <Users className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground mb-1">No Open Challenges</h3>
          <p className="text-xs text-muted-foreground">Tap a preset above to throw down!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {challenges.map((challenge) => {
            const isOwnChallenge = user?.id === challenge.challenger_id;
            const canAccept = isBarber && !isOwnChallenge;

            return (
              <Card key={challenge.id} className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 p-5 relative overflow-hidden">
                {(challenge.stake_amount ?? 0) > 0 ? (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 px-3 py-0.5 rounded-bl-lg">
                    <div className="flex items-center gap-1 text-white font-bold text-xs">
                      <Coins className="w-3 h-3" />
                      <span>{challenge.stake_amount} BB</span>
                    </div>
                  </div>
                ) : (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-orange-500 px-3 py-0.5 rounded-bl-lg">
                    <div className="text-white font-bold text-[10px] tracking-wide">FREE</div>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-14">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Swords className="w-4 h-4 text-primary" />
                      <span className="font-bold text-foreground text-sm">{challenge.challenger_username}</span>
                    </div>
                    <h4 className="text-base font-bold text-foreground mb-2">{challenge.title}</h4>
                    <div className="flex items-center gap-2">
                      {challenge.expires_at && <CountdownBadge expiresAt={challenge.expires_at} />}
                    </div>
                  </div>
                </div>

                <Badge variant="outline" className="mb-3 text-[10px] border-yellow-500/40 text-yellow-500/80">UNOFFICIAL</Badge>

                {(challenge.stake_amount ?? 0) > 0 ? (
                  <div className="mb-3 p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Match stake:</span>
                      <span className="font-bold text-yellow-500">{challenge.stake_amount} BB</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-muted-foreground">Total pot:</span>
                      <span className="font-bold text-foreground">{(challenge.stake_amount || 0) * 2} BB</span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 p-2.5 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Donations:</span>
                      <span className="font-bold text-primary">{challenge.pot_total ?? 0} BB</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Viewers donate to grow the winner's pot</p>
                  </div>
                )}

                <div className="space-y-2">
                  {canAccept && (isSilverPlus || (challenge.stake_amount ?? 0) === 0) && (
                    <Button onClick={() => setSelectedChallenge(challenge)} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" size="sm">
                      <Swords className="w-4 h-4 mr-2" />
                      {(challenge.stake_amount ?? 0) > 0
                        ? `Match ${challenge.stake_amount} BB & Accept`
                        : `Accept Challenge`}
                    </Button>
                  )}

                  {canAccept && !isSilverPlus && (challenge.stake_amount ?? 0) > 0 && (
                    <div className="flex items-center gap-2 text-center text-xs text-muted-foreground py-2 bg-muted/30 rounded-lg px-3">
                      <Lock className="w-4 h-4 flex-shrink-0" />
                      <span>Silver+ required to accept</span>
                    </div>
                  )}

                  {isOwnChallenge && (
                    <div className="text-center text-xs text-muted-foreground py-2 space-y-1">
                      <p>Waiting for opponent...</p>
                      {challenge.expires_at && <CountdownBadge expiresAt={challenge.expires_at} />}
                    </div>
                  )}

                  {!isBarber && !isOwnChallenge && (
                    <div className="text-center text-[10px] text-muted-foreground py-2">
                      Only barbers can accept
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedChallenge && (
        <AcceptChallengeModal challenge={selectedChallenge} isOpen={!!selectedChallenge} onClose={() => setSelectedChallenge(null)} />
      )}
    </div>
  );
};
