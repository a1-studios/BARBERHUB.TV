import { motion } from 'framer-motion';
import { Crown, Zap, Shield, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

const TIERS = [
  {
    name: 'Bronze',
    tier_name: 'bronze',
    icon: Shield,
    price: 50,
    color: 'hsl(30, 60%, 50%)',
    features: ['Directory listing', 'Battle portal access', '3x vote weight'],
  },
  {
    name: 'Silver',
    tier_name: 'silver',
    icon: Zap,
    price: 125,
    color: 'hsl(0, 0%, 70%)',
    recommended: true,
    features: ['Everything in Bronze', 'Unlimited battles', 'Priority matching'],
  },
  {
    name: 'Gold',
    tier_name: 'gold',
    icon: Crown,
    price: 250,
    color: 'hsl(43, 100%, 50%)',
    features: ['Everything in Silver', 'Premium placement', 'Exclusive gear access'],
  },
];

interface ArenaGateChooseTierStepProps {
  onNext: () => void;
  onBack: () => void;
}

export const ArenaGateChooseTierStep = ({ onNext, onBack }: ArenaGateChooseTierStepProps) => {
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const handleSubscribe = async (tierName: string) => {
    setSubscribing(tierName);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in first');
        return;
      }

      const { data, error } = await supabase.functions.invoke('subscribe-with-bb', {
        body: { tier_name: tierName },
      });

      if (error) throw error;

      if (data?.insufficient_funds) {
        toast.info(`You need ${data.shortfall} more BB. Visit the BB Store to top up!`);
      } else {
        toast.success(`Subscribed to ${tierName}!`);
        onNext();
      }
    } catch (err: any) {
      toast.error(err.message || 'Subscription failed');
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <motion.div
      key="choose-tier"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col min-h-0 overflow-y-auto"
    >
      <h3 className="text-lg font-black text-center bg-gradient-to-r from-amber-400 via-primary to-cyan-400 bg-clip-text text-transparent mb-3">
        UNLOCK YOUR FULL POTENTIAL
      </h3>

      <div className="space-y-2.5 flex-1">
        {TIERS.map((tier, i) => {
          const Icon = tier.icon;
          return (
            <motion.div
              key={tier.tier_name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative rounded-xl border p-3"
              style={{
                borderColor: `${tier.color}40`,
                background: `linear-gradient(135deg, ${tier.color}08, transparent)`,
              }}
            >
              {tier.recommended && (
                <span className="absolute -top-2 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                  RECOMMENDED
                </span>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" style={{ color: tier.color }} />
                  <div>
                    <div className="font-bold text-sm text-foreground">{tier.name}</div>
                    <div className="text-xs text-muted-foreground">{tier.price} BB/mo</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  style={{ borderColor: `${tier.color}60`, color: tier.color }}
                  disabled={subscribing !== null}
                  onClick={() => handleSubscribe(tier.tier_name)}
                >
                  {subscribing === tier.tier_name ? '...' : 'Subscribe'}
                </Button>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                {tier.features.map((f) => (
                  <span key={f} className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Check className="w-2.5 h-2.5 text-green-400" />
                    {f}
                  </span>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 space-y-2">
        <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={onNext}>
          Skip — I'll decide later
        </Button>
        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground/60" onClick={onBack}>
          ← Back
        </Button>
      </div>
    </motion.div>
  );
};
