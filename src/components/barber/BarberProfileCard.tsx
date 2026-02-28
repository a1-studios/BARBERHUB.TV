import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExternalLink, Scissors } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DonationModal } from '../DonationModal';
import { BarberVideoSection } from './BarberVideoSection';
import { BarberActionButtons } from './BarberActionButtons';
import { SubscriptionBadge } from '../SubscriptionBadge';
import { SubCategoryBadge } from '../SubCategoryBadge';
import { M4MHeartbeat } from '../m4m/M4MHeartbeat';

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

  // Fetch unified barber profile with stats
  const { data: barberProfile, isLoading } = useQuery({
    queryKey: ['public-barber-profile', barberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_barber_profiles')
        .select('*')
        .eq('barber_id', barberId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch subscription tier and sub_category
  const { data: extraProfileData } = useQuery({
    queryKey: ['barber-extra-profile', userId],
    queryFn: async () => {
      const [barberRes, profileRes] = await Promise.all([
        supabase.from('barber_profiles').select('active_subscription_tier, m4m_certified, m4m_paid, m4m_lives_touched, user_id').eq('user_id', userId).single(),
        supabase.from('profiles').select('sub_category').eq('user_id', userId).single()
      ]);
      return {
        active_subscription_tier: barberRes.data?.active_subscription_tier,
        sub_category: profileRes.data?.sub_category,
        m4m_certified: barberRes.data?.m4m_certified ?? false,
        m4m_paid: barberRes.data?.m4m_paid ?? false,
        m4m_lives_touched: barberRes.data?.m4m_lives_touched ?? 0,
        barber_user_id: barberRes.data?.user_id,
      };
    },
    enabled: !!userId
  });

  // Check user's relationship with barber
  const { data: userRelations } = useQuery({
    queryKey: ['barber-relations', userId, user?.id],
    queryFn: async () => {
      if (!user?.id) return { isFollowing: false, hasLiked: false, isSubscribed: false };
      
      const [followResult, likeResult] = await Promise.all([
        supabase.from('creator_follows').select('id').eq('creator_id', userId).eq('follower_id', user.id).maybeSingle(),
        supabase.from('creator_likes').select('id').eq('creator_id', userId).eq('user_id', user.id).maybeSingle()
      ]);

      return {
        isFollowing: !followResult.error && followResult.data !== null,
        hasLiked: !likeResult.error && likeResult.data !== null
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
      queryClient.invalidateQueries({ queryKey: ['public-barber-profile'] });
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
      queryClient.invalidateQueries({ queryKey: ['public-barber-profile'] });
      toast.success(action === 'like' ? 'Liked!' : 'Unliked');
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

  const displayName = barberProfile.display_name || barberProfile.barber_name;

  return (
    <>
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-primary/30">
              <AvatarImage src={barberProfile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                {(displayName || 'B').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <M4MHeartbeat
              certified={extraProfileData?.m4m_certified ?? false}
              paid={extraProfileData?.m4m_paid ?? false}
              livesTouched={extraProfileData?.m4m_lives_touched ?? 0}
              barberName={displayName || 'Barber'}
              barberUserId={userId}
              size="sm"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg text-white">
                  {displayName}
                </CardTitle>
                {extraProfileData?.active_subscription_tier && (
                  <SubscriptionBadge tier={extraProfileData.active_subscription_tier} size="sm" />
                )}
                <SubCategoryBadge subCategory={extraProfileData?.sub_category} size="sm" />
                {barberProfile.country_code && (
                  <span className="text-lg" title={`Country: ${barberProfile.country_code}`}>
                    {getCountryFlag(barberProfile.country_code)}
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
          {(barberProfile.user_bio || barberProfile.barber_bio) && layout === 'full' && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {barberProfile.user_bio || barberProfile.barber_bio}
            </p>
          )}

          {/* Video Section */}
          {showVideo && (
            <BarberVideoSection
              videoId={barberProfile.is_live ? barberProfile.live_video_id : barberProfile.featured_video_id}
              isLive={barberProfile.is_live || false}
              aspectRatio="portrait"
            />
          )}

          {/* Stats */}
          <div className="flex items-center justify-around text-center border border-primary/10 rounded-lg p-3 bg-primary/5">
            <div>
              <div className="text-lg font-semibold text-white">{barberProfile.follower_count || 0}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white">{barberProfile.like_count || 0}</div>
              <div className="text-xs text-muted-foreground">Likes</div>
            </div>
          </div>

          {/* Action Buttons */}
          {showActions && (
            <div className="space-y-2">
              <BarberActionButtons
                barberId={barberId}
                barberUserId={userId}
                onDonateClick={() => setIsDonationModalOpen(true)}
              />

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
