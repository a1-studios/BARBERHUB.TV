import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Target, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { DonationModal } from '@/components/DonationModal';
import { cn } from '@/lib/utils';

interface FanActionBarProps {
  battleId: string;
  barber1: { userId: string; profileId: string; name: string };
  barber2: { userId: string; profileId: string; name: string };
}

export const FanActionBar = ({ battleId, barber1, barber2 }: FanActionBarProps) => {
  const { user } = useAuth();
  const [pickedSide, setPickedSide] = useState<1 | 2 | null>(null);
  const [followed, setFollowed] = useState<{ b1: boolean; b2: boolean }>({ b1: false, b2: false });
  const [predictOpen, setPredictOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('battle_predictions')
        .select('picked_barber_id')
        .eq('battle_id', battleId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setPickedSide(data.picked_barber_id === barber1.userId ? 1 : 2);
      }
    })();
  }, [user, battleId, barber1.userId]);

  const handleFollow = async (side: 1 | 2) => {
    if (!user) return toast.error('Sign in to follow');
    const target = side === 1 ? barber1 : barber2;
    try {
      const { error } = await supabase.from('creator_follows').insert({
        follower_id: user.id,
        creator_id: target.userId,
      });
      if (error && !String(error.message).toLowerCase().includes('duplicate')) throw error;
      setFollowed((f) => ({ ...f, [side === 1 ? 'b1' : 'b2']: true }));
      toast.success(`Following ${target.name}`);
    } catch (e: any) {
      toast.error(e.message || 'Could not follow');
    }
  };

  const handlePredict = async (side: 1 | 2) => {
    if (!user) return toast.error('Sign in to predict');
    const target = side === 1 ? barber1 : barber2;
    try {
      const { error } = await supabase.from('battle_predictions').upsert(
        { battle_id: battleId, user_id: user.id, picked_barber_id: target.userId },
        { onConflict: 'battle_id,user_id' }
      );
      if (error) throw error;
      setPickedSide(side);
      setPredictOpen(false);
      toast.success(`Locked your pick: ${target.name} 🎯`);
    } catch (e: any) {
      toast.error(e.message || 'Prediction failed');
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleFollow(1)}
            disabled={followed.b1}
            className={cn(
              'h-9 border-orange-500/40 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20 hover:text-orange-100 text-xs font-bold',
              followed.b1 && 'opacity-60'
            )}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            {followed.b1 ? 'Following' : `Follow ${barber1.name.split(' ')[0]}`}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleFollow(2)}
            disabled={followed.b2}
            className={cn(
              'h-9 border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 hover:text-cyan-100 text-xs font-bold',
              followed.b2 && 'opacity-60'
            )}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            {followed.b2 ? 'Following' : `Follow ${barber2.name.split(' ')[0]}`}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={() => setPredictOpen(true)}
            className={cn(
              'h-10 text-xs font-bold uppercase tracking-wide transition-all',
              pickedSide
                ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.4)] hover:bg-cyan-500/30'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.5)]'
            )}
          >
            <Target className="mr-1.5 h-4 w-4" />
            {pickedSide ? `Pick: ${(pickedSide === 1 ? barber1 : barber2).name.split(' ')[0]}` : 'Predict Winner'}
          </Button>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="sm"
              onClick={() => setDonateOpen(true)}
              className="h-10 w-full bg-gradient-to-r from-orange-500 via-orange-400 to-cyan-500 text-xs font-bold uppercase tracking-wide text-white shadow-[0_0_22px_rgba(249,115,22,0.5)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]"
            >
              <Coins className="mr-1.5 h-4 w-4" />
              Donate BB
            </Button>
          </motion.div>
        </div>
      </div>

      {predictOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lobby-modal-layer fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPredictOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-cyan-400/30 bg-black/90 p-5 ring-2 ring-cyan-400/40 shadow-[0_0_40px_rgba(34,211,238,0.3)]"
          >
            <h3 className="mb-1 text-center text-sm font-bold uppercase tracking-widest text-cyan-300">
              Pick the Winner
            </h3>
            <p className="mb-4 text-center text-xs text-white/60">Lock your prediction before the battle starts</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handlePredict(1)}
                className="h-20 flex-col bg-orange-500/20 border-2 border-orange-500/50 hover:border-orange-400 hover:bg-orange-500/30 text-orange-100"
              >
                <span className="text-xs uppercase tracking-wide opacity-70">Side 1</span>
                <span className="text-sm font-bold">{barber1.name}</span>
              </Button>
              <Button
                onClick={() => handlePredict(2)}
                className="h-20 flex-col bg-cyan-500/20 border-2 border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/30 text-cyan-100"
              >
                <span className="text-xs uppercase tracking-wide opacity-70">Side 2</span>
                <span className="text-sm font-bold">{barber2.name}</span>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {donateOpen && (
        <DonationModal
          isOpen={donateOpen}
          onClose={() => setDonateOpen(false)}
          creatorId={barber1.userId}
          creatorName={barber1.name}
          battleId={battleId}
          barberId={barber1.profileId}
        />
      )}
    </>
  );
};
