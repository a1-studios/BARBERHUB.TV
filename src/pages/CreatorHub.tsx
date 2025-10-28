import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { CreatorDashboard } from '@/components/creator/CreatorDashboard';
import { EarningSystem } from '@/components/creator/EarningSystem';
import { ReferralProgram } from '@/components/creator/ReferralProgram';
import { BackButton } from '@/components/ui/BackButton';
import Header from '@/components/Header';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FeaturedCreatorCard } from '@/components/FeaturedCreatorCard';
import { toast } from 'sonner';
import { 
  Crown,
  Scissors,
  User
} from 'lucide-react';

export default function CreatorHub() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch creators for fan experience
  const { data: creators } = useQuery({
    queryKey: ['creators'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_creator_profiles');
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Set favorite creator mutation
  const setFavoriteMutation = useMutation({
    mutationFn: async (creatorId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({ favorite_creator_id: creatorId })
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Favorite creator updated!');
    },
    onError: (error) => {
      toast.error(`Failed to update favorite: ${error.message}`);
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="container mx-auto text-center">
          <div className="animate-pulse">Loading Creator Hub...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="min-h-screen pt-24 px-4 bg-gradient-to-br from-background to-muted/20">
          <div className="container mx-auto">
            <BackButton to="/" />
            <div className="text-center space-y-6 mt-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Crown className="h-8 w-8 text-primary" />
                <h1 className="text-4xl font-bold">
                  <span className="text-white">CREATOR</span>
                  <span className="text-primary">-HUB</span>
                </h1>
              </div>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Join thousands of barbers earning Barber Bucks by sharing techniques, tutorials, and building the community.
              </p>
              
              <AuthDialog>
                <Button size="lg" className="btn-primary">
                  <Scissors className="mr-2 h-5 w-5" />
                  Start Creating Today
                </Button>
              </AuthDialog>
              
              <p className="text-sm text-muted-foreground">
                Join the community • Share your skills • Earn rewards
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isBarber = profile?.user_type === 'barber';
  const isFan = profile?.user_type === 'fan' || !profile?.user_type;

  // Get featured creator for fans
  const getFeaturedCreator = () => {
    if (!creators || creators.length === 0) return null;
    
    // Use user's favorite if set
    if (profile?.favorite_creator_id) {
      const favoriteCreator = creators.find(c => c.user_id === profile.favorite_creator_id);
      if (favoriteCreator) return { creator: favoriteCreator, isFavorite: true };
    }
    
    // Otherwise, show the creator with most followers
    const topCreator = creators.reduce((prev, current) => 
      (current.follower_count > prev.follower_count) ? current : prev
    );
    
    return { creator: topCreator, isFavorite: false };
  };

  const featuredCreator = getFeaturedCreator();

  return (
    <>
      <Header />
      <div className="min-h-screen pt-24 px-4 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto space-y-12">
          <BackButton to="/" />
          
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">
                <span className="text-white">CREATOR</span>
                <span className="text-primary">-HUB</span>
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Welcome back! Manage your content, track earnings, and grow your barbering empire.
            </p>
          </div>

          {/* Fan Experience - Featured Creator */}
          {isFan && user && featuredCreator && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Featured Creator</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Show profile link
                    toast.success('Navigate to your profile to manage your favorite creator');
                  }}
                  className="text-primary hover:text-primary/80"
                >
                  <User className="w-4 h-4 mr-2" />
                  View Profile
                </Button>
              </div>
              <FeaturedCreatorCard
                creator={featuredCreator.creator}
                isFavorite={featuredCreator.isFavorite}
                onSetFavorite={(creatorId) => setFavoriteMutation.mutate(creatorId)}
              />
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <CreatorDashboard />
              <EarningSystem />
            </div>
            <div className="space-y-8">
              <ReferralProgram />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}