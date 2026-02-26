import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfileValidator } from '@/hooks/useProfileValidator';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { ProfileSetupPrompt } from '@/components/auth/ProfileSetupPrompt';
import { CreatorDashboard } from '@/components/creator/CreatorDashboard';
import { EarningSystem } from '@/components/creator/EarningSystem';
import { ReferralProgram } from '@/components/creator/ReferralProgram';
import { BackButton } from '@/components/ui/BackButton';
import Header from '@/components/Header';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FeaturedCreatorCard } from '@/components/FeaturedCreatorCard';
import { BarberProfileHeader } from '@/components/barber/BarberProfileHeader';
import { AddFundsModal } from '@/components/AddFundsModal';
import { toast } from 'sonner';
import { SponsorDealBoard } from '@/components/creator/SponsorDealBoard';
import { BarberAppointmentManager } from '@/components/booking/BarberAppointmentManager';
import { 
  Crown,
  Scissors,
  User
} from 'lucide-react';

export default function CreatorHub() {
  const { user, loading } = useAuth();
  const { isBarber, isFan, isLoading: rolesLoading } = useUserRole();
  const { hasProfile, needsSetup, isLoading: validationLoading, profileType } = useProfileValidator();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { barberBucks, showAddFundsModal, setShowAddFundsModal } = useBarberBucks();

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

  // Fetch barber profile data for barbers
  const { data: barberProfile } = useQuery({
    queryKey: ['barberProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isBarber
  });

  // Fetch barber stats
  const { data: barberStats } = useQuery({
    queryKey: ['barber-stats', barberProfile?.id],
    queryFn: async () => {
      if (!barberProfile?.id) return null;
      const { data, error } = await supabase
        .from('barber_stats')
        .select('*')
        .eq('barber_id', barberProfile.id)
        .maybeSingle();
      
      if (error) throw error;
      return data || {
        follower_count: 0,
        like_count: 0,
        total_donations_cents: 0
      };
    },
    enabled: !!barberProfile?.id
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

  // Redirect non-barbers after loading completes
  if (!loading && !rolesLoading && user && !isBarber) {
    navigate('/', { replace: true });
    toast.error('Creator Hub is only accessible to barbers');
    return null;
  }

  // Show profile setup prompt if needed
  if (!loading && !rolesLoading && !validationLoading && user && isBarber && needsSetup) {
    return <ProfileSetupPrompt type="barber" />;
  }

  if (loading || rolesLoading || validationLoading) {
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

          {/* Barber Profile Header - First Section for Barbers */}
          {isBarber && barberProfile && barberStats && profile && (
            <div className="mb-8">
              <BarberProfileHeader
                avatar_url={profile.avatar_url}
                display_name={profile.display_name || barberProfile.name || 'Unknown'}
                country_code={barberProfile.country_code}
                specialty={barberProfile.specialty}
                is_live={barberProfile.is_live || false}
                subscription_tier={barberProfile.active_subscription_tier}
                stats={{
                  follower_count: barberStats.follower_count || 0,
                  like_count: barberStats.like_count || 0,
                  total_donations_cents: barberStats.total_donations_cents || 0
                }}
                barber_id={barberProfile.id}
                onSettingsClick={() => navigate('/profile')}
                onAddFundsClick={() => setShowAddFundsModal(true)}
                barberBucks={barberBucks}
                showActions={true}
                socialLinks={{
                  instagram: barberProfile.instagram_handle,
                  facebook: barberProfile.facebook_handle,
                  twitter: barberProfile.twitter_handle,
                  youtube: barberProfile.youtube_handle,
                }}
              />
            </div>
          )}

          {/* Add Funds Modal */}
          <AddFundsModal 
            isOpen={showAddFundsModal} 
            onClose={() => setShowAddFundsModal(false)} 
          />

          {/* Sponsor Deal Board */}
          {isBarber && (
            <SponsorDealBoard />
          )}

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

          {/* Appointment Manager */}
          {isBarber && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">📅 Appointments</h2>
              <BarberAppointmentManager />
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