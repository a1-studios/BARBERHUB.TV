import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, Eye } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import { useRealtimeBattleViewers } from '@/hooks/useRealtimeBattleViewers';
import { SubscriptionBadge } from '../SubscriptionBadge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BattleCardProps {
  battleId: string;
  status: string;
  barber1: {
    name: string;
    avatar_url?: string;
    country_code?: string;
    user_id?: string;
  } | null;
  barber2: {
    name: string;
    avatar_url?: string;
    country_code?: string;
    user_id?: string;
  } | null;
  barber1Votes: number;
  barber2Votes: number;
  onViewBattle: () => void;
}

const getCountryFlag = (countryCode: string | null): string => {
  if (!countryCode) return '🌍';
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌍';
  }
};

export const BattleCard = ({
  battleId,
  status,
  barber1,
  barber2,
  barber1Votes,
  barber2Votes,
  onViewBattle
}: BattleCardProps) => {
  const isLive = status === 'voting';
  const viewerData = useRealtimeBattleViewers(isLive ? battleId : '');
  const hasViewers = isLive && (viewerData.barber1 > 0 || viewerData.barber2 > 0);

  // Fetch subscription tiers for both barbers
  const { data: barber1Tier } = useQuery({
    queryKey: ['barber-tier', barber1?.user_id],
    queryFn: async () => {
      if (!barber1?.user_id) return null;
      const { data } = await supabase
        .from('barber_profiles')
        .select('active_subscription_tier')
        .eq('user_id', barber1.user_id)
        .single();
      return data?.active_subscription_tier || null;
    },
    enabled: !!barber1?.user_id
  });

  const { data: barber2Tier } = useQuery({
    queryKey: ['barber-tier', barber2?.user_id],
    queryFn: async () => {
      if (!barber2?.user_id) return null;
      const { data } = await supabase
        .from('barber_profiles')
        .select('active_subscription_tier')
        .eq('user_id', barber2.user_id)
        .single();
      return data?.active_subscription_tier || null;
    },
    enabled: !!barber2?.user_id
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-xl transition-all duration-200 border-primary/20 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <Badge 
              variant={isLive ? 'default' : 'secondary'}
              className={isLive ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''}
            >
              {isLive ? '🔴 LIVE' : 'UPCOMING'}
            </Badge>
            
            {hasViewers && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20"
              >
                <Eye className="w-3 h-3 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  <AnimatedCounter value={viewerData.barber1 + viewerData.barber2} />
                </span>
              </motion.div>
            )}
          </div>

          {/* Barbers */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {/* Barber 1 */}
            <div className="text-center">
              <Avatar className="w-14 h-14 mx-auto mb-2 border-2 border-primary/20">
                <AvatarImage src={barber1?.avatar_url} />
                <AvatarFallback className="bg-primary/10">
                  {barber1?.name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center justify-center gap-1 mb-1">
                <p className="font-semibold text-sm truncate">
                  {barber1?.name || 'Unknown'}
                </p>
                {barber1Tier && (
                  <SubscriptionBadge tier={barber1Tier} size="sm" showTooltip={false} />
                )}
              </div>
              <span className="text-xl">
                {getCountryFlag(barber1?.country_code || null)}
              </span>
              
              {/* Votes */}
              <div className="mt-2">
                <div className="text-primary font-bold text-lg">
                  <AnimatedCounter value={barber1Votes} />
                </div>
                <div className="text-xs text-muted-foreground">votes</div>
              </div>
              
              {/* Live viewers */}
              {hasViewers && (
                <div className="mt-1 flex items-center justify-center gap-1">
                  <Users className="w-3 h-3 text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    <AnimatedCounter value={viewerData.barber1} />
                  </span>
                </div>
              )}
            </div>

            {/* VS Divider */}
            <div className="flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-2xl font-bold text-primary"
              >
                VS
              </motion.div>
            </div>

            {/* Barber 2 */}
            <div className="text-center">
              <Avatar className="w-14 h-14 mx-auto mb-2 border-2 border-secondary/20">
                <AvatarImage src={barber2?.avatar_url} />
                <AvatarFallback className="bg-secondary/10">
                  {barber2?.name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center justify-center gap-1 mb-1">
                <p className="font-semibold text-sm truncate">
                  {barber2?.name || 'Unknown'}
                </p>
                {barber2Tier && (
                  <SubscriptionBadge tier={barber2Tier} size="sm" showTooltip={false} />
                )}
              </div>
              <span className="text-xl">
                {getCountryFlag(barber2?.country_code || null)}
              </span>
              
              {/* Votes */}
              <div className="mt-2">
                <div className="text-secondary font-bold text-lg">
                  <AnimatedCounter value={barber2Votes} />
                </div>
                <div className="text-xs text-muted-foreground">votes</div>
              </div>
              
              {/* Live viewers */}
              {hasViewers && (
                <div className="mt-1 flex items-center justify-center gap-1">
                  <Users className="w-3 h-3 text-secondary" />
                  <span className="text-xs font-semibold text-secondary">
                    <AnimatedCounter value={viewerData.barber2} />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <Button
            className="w-full"
            onClick={onViewBattle}
            variant={isLive ? 'default' : 'outline'}
          >
            {isLive ? 'Vote Now' : 'View Battle'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
