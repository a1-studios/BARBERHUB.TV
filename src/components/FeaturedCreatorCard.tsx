import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Users, Bell, DollarSign, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DonationModal } from './DonationModal';
import { TierRing } from './TierRing';

interface Creator {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  country_code: string | null;
  follower_count: number;
  like_count: number;
  subscription_count: number;
}

interface FeaturedCreatorCardProps {
  creator: Creator;
  isFavorite?: boolean;
  onSetFavorite?: (creatorId: string) => void;
}

export const FeaturedCreatorCard = ({ creator, isFavorite, onSetFavorite }: FeaturedCreatorCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);

  // Check user's relationship with creator
  const { data: userRelations } = useQuery({
    queryKey: ['creator-relations', creator.user_id, user?.id],
    queryFn: async () => {
      if (!user?.id) return { isFollowing: false, hasLiked: false, isSubscribed: false };
      
      const [followResult, likeResult, subscriptionResult] = await Promise.all([
        supabase.from('creator_follows').select('id').eq('creator_id', creator.user_id).eq('follower_id', user.id).single(),
        supabase.from('creator_likes').select('id').eq('creator_id', creator.user_id).eq('user_id', user.id).single(),
        supabase.from('creator_subscriptions').select('id').eq('creator_id', creator.user_id).eq('user_id', user.id).single()
      ]);

      return {
        isFollowing: !followResult.error,
        hasLiked: !likeResult.error,
        isSubscribed: !subscriptionResult.error
      };
    },
    enabled: !!user?.id
  });

  // Fetch subscription tier
  const { data: subscriptionData } = useQuery({
    queryKey: ['creator-subscription-tier', creator.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('active_subscription_tier')
        .eq('user_id', creator.user_id)
        .single();
      
      if (error) return null;
      return data;
    }
  });

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      if (!user?.id) throw new Error('Not authenticated');
      
      if (action === 'follow') {
        const { error } = await supabase
          .from('creator_follows')
          .insert({ creator_id: creator.user_id, follower_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('creator_follows')
          .delete()
          .eq('creator_id', creator.user_id)
          .eq('follower_id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['creator-relations', creator.user_id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['creators'] });
      toast.success(`Successfully ${action === 'follow' ? 'followed' : 'unfollowed'} ${creator.display_name || creator.username}`);
    },
    onError: (error) => {
      toast.error(`Failed to update follow status: ${error.message}`);
    }
  });

  // Like/Unlike mutation
  const likeMutation = useMutation({
    mutationFn: async (action: 'like' | 'unlike') => {
      if (!user?.id) throw new Error('Not authenticated');
      
      if (action === 'like') {
        const { error } = await supabase
          .from('creator_likes')
          .insert({ creator_id: creator.user_id, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('creator_likes')
          .delete()
          .eq('creator_id', creator.user_id)
          .eq('user_id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['creator-relations', creator.user_id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['creators'] });
      toast.success(`${action === 'like' ? 'Liked' : 'Unliked'} ${creator.display_name || creator.username}`);
    },
    onError: (error) => {
      toast.error(`Failed to update like status: ${error.message}`);
    }
  });

  // Subscribe/Unsubscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async (action: 'subscribe' | 'unsubscribe') => {
      if (!user?.id) throw new Error('Not authenticated');
      
      if (action === 'subscribe') {
        const { error } = await supabase
          .from('creator_subscriptions')
          .insert({ creator_id: creator.user_id, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('creator_subscriptions')
          .delete()
          .eq('creator_id', creator.user_id)
          .eq('user_id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['creator-relations', creator.user_id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['creators'] });
      toast.success(`Successfully ${action}d to ${creator.display_name || creator.username}`);
    },
    onError: (error) => {
      toast.error(`Failed to update subscription: ${error.message}`);
    }
  });

  const handleFollow = () => {
    const action = userRelations?.isFollowing ? 'unfollow' : 'follow';
    followMutation.mutate(action);
  };

  const handleLike = () => {
    const action = userRelations?.hasLiked ? 'unlike' : 'like';
    likeMutation.mutate(action);
  };

  const handleSubscribe = () => {
    const action = userRelations?.isSubscribed ? 'unsubscribe' : 'subscribe';
    subscribeMutation.mutate(action);
  };

  const getCountryFlag = (countryCode: string | null) => {
    if (!countryCode) return null;
    return String.fromCodePoint(
      ...countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0))
    );
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-primary/30">
                <AvatarImage src={creator.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                  {(creator.display_name || creator.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-lg text-white">
                    {creator.display_name || creator.username || 'Anonymous Creator'}
                  </CardTitle>
                  {subscriptionData?.active_subscription_tier && (
                    <SubscriptionBadge tier={subscriptionData.active_subscription_tier} size="sm" />
                  )}
                  {creator.country_code && (
                    <span className="text-lg" title={`Country: ${creator.country_code}`}>
                      {getCountryFlag(creator.country_code)}
                    </span>
                  )}
                  {isFavorite && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="w-3 h-3 mr-1 text-yellow-400" />
                      Favorite
                    </Badge>
                  )}
                </div>
                {creator.username && creator.display_name && (
                  <p className="text-sm text-muted-foreground">@{creator.username}</p>
                )}
              </div>
            </div>
            {onSetFavorite && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetFavorite(creator.user_id)}
                className="text-yellow-400 hover:text-yellow-300"
              >
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {creator.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {creator.bio}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center justify-around text-center border border-primary/10 rounded-lg p-3 bg-primary/5">
            <div>
              <div className="text-lg font-semibold text-white">{creator.follower_count}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white">{creator.like_count}</div>
              <div className="text-xs text-muted-foreground">Likes</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white">{creator.subscription_count}</div>
              <div className="text-xs text-muted-foreground">Subscribers</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={userRelations?.isFollowing ? "secondary" : "outline"}
              size="sm"
              onClick={handleFollow}
              disabled={followMutation.isPending || !user}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              {userRelations?.isFollowing ? 'Following' : 'Follow'}
            </Button>
            
            <Button
              variant={userRelations?.hasLiked ? "secondary" : "outline"}
              size="sm"
              onClick={handleLike}
              disabled={likeMutation.isPending || !user}
              className="flex items-center gap-2"
            >
              <Heart className={`w-4 h-4 ${userRelations?.hasLiked ? 'fill-current text-red-400' : ''}`} />
              {userRelations?.hasLiked ? 'Liked' : 'Like'}
            </Button>

            <Button
              variant={userRelations?.isSubscribed ? "secondary" : "outline"}
              size="sm"
              onClick={handleSubscribe}
              disabled={subscribeMutation.isPending || !user}
              className="flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              {userRelations?.isSubscribed ? 'Subscribed' : 'Subscribe'}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => setIsDonationModalOpen(true)}
              disabled={!user}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <DollarSign className="w-4 h-4" />
              Donate
            </Button>
          </div>
        </CardContent>
      </Card>

      <DonationModal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        creatorId={creator.user_id}
        creatorName={creator.display_name || creator.username || 'Creator'}
      />
    </>
  );
};