import { Button } from '@/components/ui/button';
import { Heart, UserPlus, DollarSign } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface BarberActionButtonsProps {
  barberId: string;
  barberUserId: string;
  onDonateClick?: () => void;
  variant?: 'default' | 'compact';
}

export const BarberActionButtons = ({ 
  barberId, 
  barberUserId, 
  onDonateClick,
  variant = 'default' 
}: BarberActionButtonsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user is following
  const { data: isFollowing = false } = useQuery({
    queryKey: ['is-following', barberUserId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('creator_follows')
        .select('id')
        .eq('creator_id', barberUserId)
        .eq('follower_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  // Check if user has liked
  const { data: isLiked = false } = useQuery({
    queryKey: ['is-liked', barberUserId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('creator_likes')
        .select('id')
        .eq('creator_id', barberUserId)
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');
      
      if (isFollowing) {
        await supabase
          .from('creator_follows')
          .delete()
          .eq('creator_id', barberUserId)
          .eq('follower_id', user.id);
      } else {
        await supabase
          .from('creator_follows')
          .insert({ creator_id: barberUserId, follower_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-following', barberUserId] });
      queryClient.invalidateQueries({ queryKey: ['barber-stats', barberId] });
      toast({
        title: isFollowing ? 'Unfollowed' : 'Following',
        description: isFollowing ? 'You have unfollowed this barber' : 'You are now following this barber',
      });
    },
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');
      
      if (isLiked) {
        await supabase
          .from('creator_likes')
          .delete()
          .eq('creator_id', barberUserId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('creator_likes')
          .insert({ creator_id: barberUserId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-liked', barberUserId] });
      queryClient.invalidateQueries({ queryKey: ['barber-stats', barberId] });
      toast({
        title: isLiked ? 'Unliked' : 'Liked',
        description: isLiked ? 'You have unliked this barber' : 'You have liked this barber',
      });
    },
  });

  const handleAction = (action: () => void) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to perform this action',
      });
      return;
    }
    action();
  };

  const buttonSize = variant === 'compact' ? 'sm' : 'default';

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant={isFollowing ? 'secondary' : 'default'}
        size={buttonSize}
        onClick={() => handleAction(() => followMutation.mutate())}
        disabled={followMutation.isPending}
      >
        <UserPlus className="w-4 h-4 mr-2" />
        {isFollowing ? 'Following' : 'Follow'}
      </Button>

      <Button
        variant={isLiked ? 'secondary' : 'outline'}
        size={buttonSize}
        onClick={() => handleAction(() => likeMutation.mutate())}
        disabled={likeMutation.isPending}
      >
        <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
        {isLiked ? 'Liked' : 'Like'}
      </Button>

      {onDonateClick && (
        <Button
          variant="outline"
          size={buttonSize}
          onClick={() => handleAction(onDonateClick)}
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Donate
        </Button>
      )}
    </div>
  );
};
