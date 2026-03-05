import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfileSetup } from '@/hooks/useProfileSetup';
import { useUserRole } from '@/hooks/useUserRole';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { Scissors, Loader2, X } from 'lucide-react';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { AddFundsModal } from '@/components/AddFundsModal';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { BarberProfileForm } from '@/components/profiles/BarberProfileForm';
import { ClientProfileForm } from '@/components/profiles/ClientProfileForm';
import { CreationUpload } from '@/components/creations/CreationUpload';
import { BarberSettings } from '@/components/profiles/BarberSettings';
import { BarberProfileHeader } from '@/components/barber/BarberProfileHeader';
import { FanProfileHeader } from '@/components/fan/FanProfileHeader';
import { SponsorBoardPurchaseModal } from '@/components/fan/SponsorBoardPurchaseModal';
import { TransactionHistory } from '@/components/analytics/TransactionHistory';
import { toast } from 'sonner';
import { BottomNavBar } from '@/components/BottomNavBar';

const Profile = () => {
  const { user, signOut } = useAuth();
  const { isBarber: isUserBarber } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showCreationUpload, setShowCreationUpload] = useState(false);
  const [showBarberSettings, setShowBarberSettings] = useState(false);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { barberBucks, showAddFundsModal, setShowAddFundsModal } = useBarberBucks();

  const {
    userProfile,
    barberProfile,
    clientProfile,
    loading: profileLoading,
    needsProfileSetup,
    refreshProfiles,
    isBarber,
    isClient
  } = useProfileSetup();

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      await signOut();
      navigate('/');
      toast.success('Your account has been permanently deleted.');
    } catch (err) {
      console.error('Delete account error:', err);
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch barber stats
  const { data: barberStats } = useQuery({
    queryKey: ['barber-own-stats', barberProfile?.id],
    queryFn: async () => {
      if (!barberProfile?.id) return null;
      const { data, error } = await supabase.from('barber_stats').select('*').eq('barber_id', barberProfile.id).maybeSingle();
      if (error) throw error;
      return data || { follower_count: 0, like_count: 0, total_donations_cents: 0 };
    },
    enabled: !!barberProfile?.id && isBarber
  });

  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Profile setup flow
  if (needsProfileSetup && !showProfileSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        <Header />
        <main className="pt-16 sm:pt-20 pb-12 px-2 sm:px-4">
          <div className="container mx-auto max-w-none sm:max-w-2xl">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
                <CardDescription>
                  {isBarber ? 'Set up your professional barber profile to start competing' : 'Complete your profile to start voting and engaging with battles'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowProfileSetup(true)} className="w-full" size="lg">
                  {isBarber ? 'Create Barber Profile' : 'Complete Profile'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (showProfileSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        <Header />
        <main className="pt-16 sm:pt-20 pb-12 px-2 sm:px-4">
          <div className="container mx-auto max-w-none sm:max-w-2xl">
            <Button variant="ghost" onClick={() => setShowProfileSetup(false)} className="mb-4">
              ← Back to Profile
            </Button>
            {isBarber ? (
              <BarberProfileForm onProfileCreated={() => { setShowProfileSetup(false); refreshProfiles(); }} existingProfile={barberProfile} />
            ) : (
              <ClientProfileForm onProfileCreated={() => { setShowProfileSetup(false); refreshProfiles(); }} existingProfile={clientProfile} />
            )}
          </div>
        </main>
      </div>
    );
  }

  // Barber settings view
  if (showBarberSettings && isBarber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        <Header />
        <main className="pt-16 sm:pt-20 pb-12 px-2 sm:px-4">
          <div className="container mx-auto max-w-none sm:max-w-6xl">
            <BarberSettings onBack={() => setShowBarberSettings(false)} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <Header />
      <main className="pt-16 sm:pt-20 pb-12 px-2 sm:px-4">
        <div className="container mx-auto max-w-none sm:max-w-4xl">

          {/* Barber Profile Header */}
          {isBarber && barberProfile && barberStats && (
            <div className="mb-3">
              <BarberProfileHeader
                avatar_url={profile?.avatar_url}
                display_name={profile?.display_name || barberProfile.name || 'Unknown'}
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
                barberBucks={barberBucks}
                onSettingsClick={() => setShowBarberSettings(true)}
                onAddFundsClick={() => setShowAddFundsModal(true)}
                onSignOutClick={async () => { await signOut(); navigate('/'); }}
                onDeleteAccountClick={() => setShowDeleteConfirm(true)}
                showActions={true}
                m4m_certified={(barberProfile as any).m4m_certified || false}
                m4m_paid={(barberProfile as any).m4m_paid || false}
                m4m_lives_touched={(barberProfile as any).m4m_lives_touched || 0}
                barber_user_id={user?.id}
                socialLinks={{
                  instagram: (barberProfile as any).instagram_handle,
                  facebook: (barberProfile as any).facebook_handle,
                  twitter: (barberProfile as any).twitter_handle,
                  youtube: (barberProfile as any).youtube_handle,
                }}
              />
            </div>
          )}

          {/* Fan Profile Header — full-page hero style */}
          {!isBarber && profile && (
            <div className="mb-3">
              <FanProfileHeader
                userId={user?.id || ''}
                avatar_url={profile.avatar_url}
                display_name={profile.display_name || ''}
                username={profile.username}
                bio={profile.bio}
                country_code={profile.country_code}
                sub_category={(profile as any).sub_category}
                barberBucks={barberBucks}
                stats={{
                  votes_cast: clientProfile?.total_votes_cast || 0,
                  voting_power: clientProfile?.voting_power || 1,
                }}
                onAddFundsClick={() => setShowAddFundsModal(true)}
                onBecomeSponsorClick={() => setShowSponsorModal(true)}
                onSignOutClick={async () => { await signOut(); navigate('/'); }}
                onDeleteAccountClick={() => setShowDeleteConfirm(true)}
              />
            </div>
          )}

          {/* Transaction History */}
          <TransactionHistory />

          {/* Creation Upload Modal */}
          {showCreationUpload && isBarber && barberProfile && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Upload New Creation</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowCreationUpload(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4">
                  <CreationUpload barberProfileId={barberProfile.id} onCreationUploaded={() => {
                    setShowCreationUpload(false);
                    toast.success('Creation uploaded successfully!');
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <AddFundsModal isOpen={showAddFundsModal} onClose={() => setShowAddFundsModal(false)} />

      {/* Sponsor Purchase Modal */}
      {user && (
        <SponsorBoardPurchaseModal
          isOpen={showSponsorModal}
          onClose={() => setShowSponsorModal(false)}
          barberBucks={barberBucks}
          userId={user.id}
          displayName={profile?.display_name || undefined}
        />
      )}
      {/* Delete Account Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. All your data, battles, votes, and credits will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BottomNavBar />
    </div>
  );
};

export default Profile;
