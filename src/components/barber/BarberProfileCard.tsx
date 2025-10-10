import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Users, Bell, DollarSign, ExternalLink, Scissors } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DonationModal } from '../DonationModal';
import { BarberVideoSection } from './BarberVideoSection';

interface BarberProfileCardProps {
  barberId: string;
  userId: string;
  layout?: 'compact' | 'full';
  showVideo?: boolean;
  showActions?: boolean;
  onProfileClick?: (userId: string) => void;
}

export const BarberProfileCard = ({ 
  barberId, 
  userId,
  layout = 'full',
  showVideo = false,
  showActions = true,
  onProfileClick
}: BarberProfileCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);

  // Fetch barber profile data
  const { data: barberProfile, isLoading } = useQuery({
    queryKey: ['barber-profile', barberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_profiles')
        .select(`
          *,
          profiles:user_id (
            display_name,
            avatar_url,
            bio,
            country_code
          )
        `)
        .eq('id', barberId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch barber stats
  const { data: stats } = useQuery({
    queryKey: ['barber-stats', barberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_stats')
        .select('*')
        .eq('barber_id', barberId)
        .maybeSingle();
      
      if (error) throw error;
      return data || {
        follower_count: 0,
        like_count: 0,
        subscription_count: 0,
        total_donations_cents: 0
      };
    }
  });

  // Check user's relationship with barber
  const { data: userRelations } = useQuery({
    queryKey: ['barber-relations', userId, user?.id],
    queryFn: async () => {
      if (!user?.id) return { isFollowing: false, hasLiked: false, isSubscribed: false };
      
      const [followResult, likeResult, subscriptionResult] = await Promise.all([
        supabase.from('creator_follows').select('id').eq('creator_id', userId).eq('follower_id', user.id).maybeSingle(),
        supabase.from('creator_likes').select('id').eq('creator_id', userId).eq('user_id', user.id).maybeSingle(),
        supabase.from('creator_subscriptions').select('id').eq('creator_id', userId).eq('user_id', user.id).maybeSingle()
      ]);

      return {
        isFollowing: !followResult.error && followResult.data !== null,
        hasLiked: !likeResult.error && likeResult.data !== null,
        isSubscribed: !subscriptionResult.error && subscriptionResult.data !== null
      };
    },
    enabled: !!user?.id
  });

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      if (!user?.id) throw new Error('Not authenticated');
      
      if (action === 'follow') {
        const { error } = await supabase
          .from('creator_follows')
          .insert({ creator_id: userId, follower_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('creator_follows')
          .delete()
          .eq('creator_id', userId)
          .eq('follower_id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['barber-relations'] });
      queryClient.invalidateQueries({ queryKey: ['barber-stats'] });
      toast.success(`Successfully ${action === 'follow' ? 'followed' : 'unfollowed'}`);
    }
  });

  // Like/Unlike mutation
  const likeMutation = useMutation({
    mutationFn: async (action: 'like' | 'unlike') => {
      if (!user?.id) throw new Error('Not authenticated');
      
      if (action === 'like') {
        const { error } = await supabase
          .from('creator_likes')
          .insert({ creator_id: userId, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('creator_likes')
          .delete()
          .eq('creator_id', userId)
          .eq('user_id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['barber-relations'] });
      queryClient.invalidateQueries({ queryKey: ['barber-stats'] });
      toast.success(action === 'like' ? 'Liked!' : 'Unliked');
    }
  });

  // Subscribe/Unsubscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async (action: 'subscribe' | 'unsubscribe') => {
      if (!user?.id) throw new Error('Not authenticated');
      
      if (action === 'subscribe') {
        const { error } = await supabase
          .from('creator_subscriptions')
          .insert({ creator_id: userId, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('creator_subscriptions')
          .delete()
          .eq('creator_id', userId)
          .eq('user_id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['barber-relations'] });
      queryClient.invalidateQueries({ queryKey: ['barber-stats'] });
      toast.success(`${action}d successfully`);
    }
  });

  const getCountryFlag = (countryCode: string | null) => {
    if (!countryCode) return null;
    return String.fromCodePoint(
      ...countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0))
    );
  };

  const handleViewProfile = () => {
    if (onProfileClick) {
      onProfileClick(userId);
    } else {
      navigate(`/barber/${userId}`);
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="w-12 h-12 bg-primary/20 rounded-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-primary/20 rounded w-3/4" />
            <div className="h-4 bg-primary/20 rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!barberProfile) return null;

  const profile = barberProfile.profiles as any;
  const displayName = profile?.display_name || barberProfile.name;

  return (
    <>
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-primary/30">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                {(displayName || 'B').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg text-white">
                  {displayName}
                </CardTitle>
                {profile?.country_code && (
                  <span className="text-lg" title={`Country: ${profile.country_code}`}>
                    {getCountryFlag(profile.country_code)}
                  </span>
                )}
                {barberProfile.is_live && (
                  <Badge variant="destructive" className="animate-pulse">
                    🔴 LIVE
                  </Badge>
                )}
              </div>
              {barberProfile.specialty && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Scissors className="w-3 h-3" />
                  <span>{barberProfile.specialty}</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {profile?.bio && layout === 'full' && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {profile.bio}
            </p>
          )}

          {/* Video Section */}
          {showVideo && (
            <BarberVideoSection
              videoId={barberProfile.is_live ? barberProfile.live_video_id : barberProfile.featured_video_id}
              isLive={barberProfile.is_live}
              aspectRatio="portrait"
            />
          )}

          {/* Stats */}
          <div className="flex items-center justify-around text-center border border-primary/10 rounded-lg p-3 bg-primary/5">
            <div>
              <div className="text-lg font-semibold text-white">{stats?.follower_count || 0}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white">{stats?.like_count || 0}</div>
              <div className="text-xs text-muted-foreground">Likes</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white">{stats?.subscription_count || 0}</div>
              <div className="text-xs text-muted-foreground">Subscribers</div>
            </div>
          </div>

          {/* Action Buttons */}
          {showActions && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={userRelations?.isFollowing ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => followMutation.mutate(userRelations?.isFollowing ? 'unfollow' : 'follow')}
                  disabled={followMutation.isPending || !user}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  {userRelations?.isFollowing ? 'Following' : 'Follow'}
                </Button>
                
                <Button
                  variant={userRelations?.hasLiked ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => likeMutation.mutate(userRelations?.hasLiked ? 'unlike' : 'like')}
                  disabled={likeMutation.isPending || !user}
                  className="flex items-center gap-2"
                >
                  <Heart className={`w-4 h-4 ${userRelations?.hasLiked ? 'fill-current text-red-400' : ''}`} />
                  {userRelations?.hasLiked ? 'Liked' : 'Like'}
                </Button>

                <Button
                  variant={userRelations?.isSubscribed ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => subscribeMutation.mutate(userRelations?.isSubscribed ? 'unsubscribe' : 'subscribe')}
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

              <Button
                variant="default"
                size="sm"
                onClick={handleViewProfile}
                className="w-full flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <DonationModal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        creatorId={userId}
        creatorName={displayName || 'Barber'}
      />
    </>
  );
};
