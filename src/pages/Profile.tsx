import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfileSetup } from '@/hooks/useProfileSetup';
import { useUserRole } from '@/hooks/useUserRole';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/BackButton';
import { RoleBadge } from '@/components/RoleBadge';
import { EmptyState } from '@/components/EmptyState';
import { Scissors, Users, Trophy, Plus, User, Loader2, Globe, Edit3, X, Settings, Heart, DollarSign, Lock } from 'lucide-react';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { AddFundsModal } from '@/components/AddFundsModal';
import { BBWalletWidget } from '@/components/economy/BBWalletWidget';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { CountrySelector } from '@/components/CountrySelector';
import { BarberProfileForm } from '@/components/profiles/BarberProfileForm';
import { ClientProfileForm } from '@/components/profiles/ClientProfileForm';
import { CreationUpload } from '@/components/creations/CreationUpload';
import BarberDashboard from '@/components/barber/BarberDashboard';
import { BarberSettings } from '@/components/profiles/BarberSettings';
import { AvatarUpload } from '@/components/profiles/AvatarUpload';
import { BarberProfileHeader } from '@/components/barber/BarberProfileHeader';
import { TransactionHistory } from '@/components/analytics/TransactionHistory';
const Profile = () => {
  const {
    user
  } = useAuth();
  const {
    isBarber: isUserBarber
  } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showCreationUpload, setShowCreationUpload] = useState(false);
  const [showBarberSettings, setShowBarberSettings] = useState(false);
  
  // Get barber bucks data
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

  // Fetch user profile
  const {
    data: profile,
    isLoading
  } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const {
        data,
        error
      } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    username: '',
    country_code: null as string | null
  });

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        username: profile.username || '',
        country_code: profile.country_code || null
      });
    }
  }, [profile]);

  // Fetch barber stats (must be at top level, not inside JSX!)
  const {
    data: barberStats
  } = useQuery({
    queryKey: ['barber-own-stats', barberProfile?.id],
    queryFn: async () => {
      if (!barberProfile?.id) return null;
      const {
        data,
        error
      } = await supabase.from('barber_stats').select('*').eq('barber_id', barberProfile.id).maybeSingle();
      if (error) throw error;
      return data || {
        follower_count: 0,
        like_count: 0,
        total_donations_cents: 0
      };
    },
    enabled: !!barberProfile?.id && isBarber
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error('No user');
      
      // Update profiles table — country_code is intentionally excluded (permanently locked)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: data.display_name,
          bio: data.bio,
          username: data.username
        })
        .eq('user_id', user.id);
      
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['barberProfile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['public-barber-profile'] });
      queryClient.invalidateQueries({ queryKey: ['global-contenders'] });
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    },
    onError: (error: any) => {
      // Handle duplicate username error — catch both specific code and raw constraint message
      if (error.code === '23505' || error.message?.includes('duplicate key value') || error.message?.includes('profiles_username_key')) {
        toast.error('This username is already taken. Please choose another one.');
      } else {
        toast.error('Failed to update profile: ' + error.message);
      }
    }
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };
  const handleCancel = () => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        username: profile.username || '',
        country_code: profile.country_code || null
      });
    }
    setIsEditing(false);
  };
  if (isLoading || profileLoading) {
    return <div className="min-h-screen">
        <Header />
        <div className="pt-20 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>;
  }

  // Show specialized profile setup if needed
  if (needsProfileSetup && !showProfileSetup) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        <Header />
        <main className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-2xl">
            <BackButton className="mb-6" />
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
      </div>;
  }
  if (showProfileSetup) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        <Header />
        <main className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-2xl">
            <BackButton className="mb-6" />
            <Button variant="ghost" onClick={() => setShowProfileSetup(false)} className="mb-4">
              ← Back to Profile
            </Button>
            
            {isBarber ? <BarberProfileForm onProfileCreated={() => {
            setShowProfileSetup(false);
            refreshProfiles();
          }} existingProfile={barberProfile} /> : <ClientProfileForm onProfileCreated={() => {
            setShowProfileSetup(false);
            refreshProfiles();
          }} existingProfile={clientProfile} />}
          </div>
        </main>
      </div>;
  }

  // Show barber settings if requested
  if (showBarberSettings && isBarber) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        <Header />
        <main className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <BarberSettings onBack={() => setShowBarberSettings(false)} />
          </div>
        </main>
      </div>;
  }

  // Barbers can access BarberDashboard via /portal route
  // This allows them to see their full profile with YouTube integration here

  return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <Header />
      <main className="pt-20 sm:pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <BackButton className="mb-4 sm:mb-6" />
          
          {/* Barber Profile Header - First Section */}
          {isBarber && barberProfile && barberStats && (
            <div className="mb-6">
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
                showActions={true}
                socialLinks={{
                  instagram: (barberProfile as any).instagram_handle,
                  facebook: (barberProfile as any).facebook_handle,
                  twitter: (barberProfile as any).twitter_handle,
                  youtube: (barberProfile as any).youtube_handle,
                }}
              />
            </div>
          )}
          
          <div className="space-y-4 sm:space-y-6">
            {/* Personal Information Card - For fans only (barbers use header) */}
            {!isBarber && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <User className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">Personal Information</span>
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Manage your basic profile information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="display_name">Display Name</Label>
                        <Input 
                          id="display_name" 
                          value={formData.display_name} 
                          onChange={e => setFormData(prev => ({ ...prev, display_name: e.target.value }))} 
                          disabled={!isEditing} 
                          className="w-full" 
                        />
            </div>

            {/* Transaction History for barbers */}
            {isBarber && (
              <div className="mb-6">
                <TransactionHistory />
              </div>
            )}
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input 
                          id="username" 
                          value={formData.username} 
                          onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))} 
                          disabled={!isEditing} 
                          placeholder="@username" 
                          className="w-full" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Country
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                          <Lock className="h-3 w-3 mr-1" />
                          Locked
                        </Badge>
                      </Label>
                      <CountrySelector 
                        value={formData.country_code} 
                        onChange={() => {}} 
                        placeholder="Select your country" 
                        disabled={true}
                      />
                      <p className="text-xs text-amber-500/80">
                        Nationality is permanently set during sign-up
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={user?.email || ''} disabled className="bg-muted" />
                    </div>

                    <div className="space-y-2">
                      <Label>Account Type</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-sm px-3 py-1">
                          <Users className="w-4 h-4 mr-1.5" />
                          Fan
                        </Badge>
                        <RoleBadge size="sm" />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                      {isEditing ? (
                        <>
                          <Button type="submit" disabled={updateProfileMutation.isPending} className="w-full sm:w-auto">
                            {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Profile
                          </Button>
                          <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button type="button" onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
                          Edit Profile
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Transaction History for fans */}
            {!isBarber && (
              <TransactionHistory />
            )}
            {/* BB Wallet Widget - For fans only (barbers have it in header) */}
            {!isBarber && (
              <BBWalletWidget
                isBarber={false}
                barberBucks={barberBucks}
                avatarUrl={profile?.avatar_url}
                displayName={profile?.display_name}
                onAddFunds={() => setShowAddFundsModal(true)}
              />
            )}
          </div>


          {/* Creation Upload Modal */}
          {showCreationUpload && isBarber && barberProfile && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
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
            </div>}
        </div>
      </main>
      
      {/* Add Funds Modal */}
      <AddFundsModal 
        isOpen={showAddFundsModal} 
        onClose={() => setShowAddFundsModal(false)} 
      />
    </div>;
};
export default Profile;