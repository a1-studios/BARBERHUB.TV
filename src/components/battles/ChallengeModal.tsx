import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Search, Swords, Coins, Users } from 'lucide-react';
import { ChallengeFeed } from './ChallengeFeed';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { useChallengeStakeConfig } from '@/hooks/useChallengeStakeConfig';
import { toast } from 'sonner';

interface ChallengeModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: 'issue' | 'feed';
}

interface BarberResult {
  user_id: string;
  barber_name: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  location: string | null;
  specialty: string | null;
}

export const ChallengeModal = ({ open, onClose }: ChallengeModalProps) => {
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { barberBucks: balance } = useBarberBucks();
  const { stakesEnabled, minStake } = useChallengeStakeConfig();

  const [searchQuery, setSearchQuery] = useState('');
  const [allBarbers, setAllBarbers] = useState<BarberResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<BarberResult | null>(null);
  const [stakeAmount, setStakeAmount] = useState(minStake);
  const [isIssuing, setIsIssuing] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Keep stake in sync with sovereign-controlled minimum
  useEffect(() => {
    setStakeAmount(prev => Math.max(prev, minStake));
  }, [minStake]);

  // Lock body scroll + load barbers when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      loadBarbers();
    } else {
      document.body.style.overflow = '';
      setSearchQuery('');
      setSelectedBarber(null);
      setStakeAmount(minStake);
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, minStake]);

  const loadBarbers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('public_barber_profiles')
        .select('user_id, barber_name, display_name, username, avatar_url, location, specialty')
        .neq('user_id', user?.id || '')
        .limit(20);
      if (!error && data) setAllBarbers(data);
    } catch { /* ignore */ }
    setIsLoading(false);
  };

  // Client-side filter
  const filteredBarbers = searchQuery.length > 0
    ? allBarbers.filter(b => {
        const q = searchQuery.toLowerCase();
        return (b.display_name?.toLowerCase().includes(q) ||
                b.barber_name?.toLowerCase().includes(q) ||
                b.username?.toLowerCase().includes(q));
      })
    : allBarbers;

  const issueDirectChallenge = async () => {
    if (!selectedBarber || !user) return;
    const effectiveStake = stakesEnabled ? stakeAmount : 0;
    if (stakesEnabled && balance < effectiveStake) {
      toast.error(`Insufficient BB. You have ${balance} but need ${effectiveStake}.`);
      return;
    }
    setIsIssuing(true);
    let battleId: string | undefined;
    let succeeded = false;
    try {
      const { data, error } = await supabase.functions.invoke('create-challenge-stake', {
        body: {
          title: `Challenge to ${selectedBarber.display_name || selectedBarber.barber_name}`,
          stake_amount: effectiveStake,
          challenge_message: `Direct challenge to ${selectedBarber.display_name || selectedBarber.barber_name}`,
          target_barber_id: selectedBarber.user_id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.success === false) throw new Error(data?.message || 'Failed to issue challenge');

      battleId = data?.battle_id || data?.challenge?.battle_id;
      succeeded = true;
      toast.success(
        effectiveStake > 0
          ? `Challenge issued to ${selectedBarber.display_name || selectedBarber.barber_name}! ${effectiveStake} BB staked.`
          : `Challenge issued to ${selectedBarber.display_name || selectedBarber.barber_name}! Viewers can donate to the pot.`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to issue challenge');
    }
    setIsIssuing(false);

    if (succeeded) {
      setSelectedBarber(null);
      setSearchQuery('');
      onClose();
      if (battleId) navigate(`/battle/${battleId}/contender`);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-primary/30 bg-card shadow-2xl shadow-primary/10"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-card/95 backdrop-blur-md border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground tracking-wide leading-none">QUICK PLAY</h2>
                  <p className="text-[10px] text-muted-foreground tracking-wider mt-0.5">UNRANKED · NO TOURNAMENT IMPACT</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Direct Challenge Section */}
            <div className="p-4 border-b border-border/50">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Swords className="h-4 w-4 text-primary" /> Direct Challenge
              </h3>

              {/* Search input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter barbers by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-muted/50 border-border/50"
                />
              </div>

              {/* Selected barber → stake picker */}
              {selectedBarber ? (
                <SelectedBarberStake
                  selectedBarber={selectedBarber}
                  stakeAmount={stakeAmount}
                  setStakeAmount={setStakeAmount}
                  balance={balance}
                  isIssuing={isIssuing}
                  stakesEnabled={stakesEnabled}
                  minStake={minStake}
                  onClear={() => setSelectedBarber(null)}
                  onChallenge={issueDirectChallenge}
                />
              ) : (
                /* Barber list */
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                    <Users className="h-3 w-3" /> Available Barbers ({filteredBarbers.length})
                  </p>
                  {isLoading ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Loading barbers...</p>
                  ) : filteredBarbers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {searchQuery ? 'No barbers match your search' : 'No barbers available'}
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-border/30 bg-muted/20">
                      {filteredBarbers.map(b => (
                        <button
                          key={b.user_id}
                          onClick={() => { setSelectedBarber(b); setSearchQuery(''); }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                        >
                          <Avatar className="h-9 w-9">
                            {b.avatar_url ? <AvatarImage src={b.avatar_url} /> : null}
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                              {(b.display_name || b.barber_name || '?')[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {b.display_name || b.barber_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {b.specialty || b.location || 'Barber'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Unified Feed */}
            <div className="p-4">
              <ChallengeFeed />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/* Extracted sub-component for the stake picker after selecting a barber */
function SelectedBarberStake({
  selectedBarber, stakeAmount, setStakeAmount, balance, isIssuing, stakesEnabled, minStake, onClear, onChallenge,
}: {
  selectedBarber: BarberResult;
  stakeAmount: number;
  setStakeAmount: (v: number) => void;
  balance: number;
  isIssuing: boolean;
  stakesEnabled: boolean;
  minStake: number;
  onClear: () => void;
  onChallenge: () => void;
}) {
  const firstName = (selectedBarber.display_name || selectedBarber.barber_name || '').split(' ')[0];
  const sliderMax = Math.max(minStake * 5, 500);
  const sliderStep = Math.max(Math.round(minStake / 2), 50);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-muted/30 rounded-xl p-4 border border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/40">
            {selectedBarber.avatar_url ? <AvatarImage src={selectedBarber.avatar_url} /> : null}
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {(selectedBarber.display_name || selectedBarber.barber_name || '?')[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-bold text-foreground">{selectedBarber.display_name || selectedBarber.barber_name}</p>
            <p className="text-xs text-muted-foreground">{selectedBarber.specialty || 'Barber'}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-xs text-muted-foreground">Change</Button>
      </div>

      {stakesEnabled ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground flex items-center gap-1">
              <Coins className="h-3 w-3 text-yellow-500" /> Stake Amount
            </span>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs font-bold">{stakeAmount} BB</Badge>
          </div>
          <Slider value={[stakeAmount]} onValueChange={([v]) => setStakeAmount(v)} min={minStake} max={sliderMax} step={sliderStep} />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{minStake} BB</span>
            <span>Balance: {balance} BB</span>
            <span>{sliderMax} BB</span>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          🆓 <span className="font-semibold text-foreground">Free challenge</span> — no BB locked. Viewers can donate to grow the winner's pot.
        </div>
      )}

      <Button
        onClick={onChallenge}
        disabled={isIssuing || (stakesEnabled && balance < stakeAmount)}
        className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold"
      >
        {isIssuing
          ? 'Issuing...'
          : stakesEnabled
            ? `⚔️ Stake ${stakeAmount} BB & Challenge ${firstName}`
            : `⚔️ Challenge ${firstName}`}
      </Button>
    </motion.div>
  );
}

