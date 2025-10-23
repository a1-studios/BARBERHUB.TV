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
import { Scissors, Users, Trophy, Plus, User, Loader2, Globe, Edit3, X, Settings, Upload, Zap, CheckCircle, Clock, Award, Heart, Bell, DollarSign } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { CountrySelector } from '@/components/CountrySelector';
import { BarberProfileForm } from '@/components/profiles/BarberProfileForm';
import { ClientProfileForm } from '@/components/profiles/ClientProfileForm';
import { CreationUpload } from '@/components/creations/CreationUpload';
import BarberDashboard from '@/components/barber/BarberDashboard';
import { BarberSettings } from '@/components/profiles/BarberSettings';
import { AvatarUpload } from '@/components/profiles/AvatarUpload';
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

  // Fetch battles where user is a participant (for barbers only)
  const {
    data: myBattles
  } = useQuery({
    queryKey: ['myBattles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get participant records
      const {
        data: participants,
        error: partError
      } = await supabase.from('battle_participants').select('id, battle_id, joined_at').eq('user_id', user.id).order('joined_at', {
        ascending: false
      });
      if (partError) throw partError;
      if (!participants || participants.length === 0) return [];

      // Get battle details for those battles
      const battleIds = participants.map(p => p.battle_id);
      const {
        data: battles,
        error: battleError
      } = await supabase.from('battles').select('id, title, description, status, prize_amount, currency, category, starts_at, voting_ends_at').in('id', battleIds);
      if (battleError) throw battleError;

      // Combine the data
      return participants.map(p => ({
        ...p,
        battles: battles?.find(b => b.id === p.battle_id)
      }));
    },
    enabled: !!user?.id && isUserBarber
  });

  // Fetch battle submissions for the user
  const {
    data: mySubmissions
  } = useQuery({
    queryKey: ['mySubmissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const {
        data,
        error
      } = await supabase.from('battle_submissions').select('battle_id, status, created_at').eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isUserBarber
  });

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
        subscription_count: 0,
        total_donations_cents: 0
      };
    },
    enabled: !!barberProfile?.id && isBarber
  });

  // Get submission status for a battle
  const getSubmissionStatus = (battleId: string) => {
    const submission = mySubmissions?.find(s => s.battle_id === battleId);
    return submission?.status || 'pending';
  };

  // Check if battle needs submission
  const needsSubmission = (battle: any) => {
    if (!battle) return false;
    const hasSubmission = mySubmissions?.some(s => s.battle_id === battle.id);
    return !hasSubmission && (battle.status === 'upcoming' || battle.status === 'active');
  };

  // Categorize battles
  const activeBattles = myBattles?.filter((b: any) => b.battles && (b.battles.status === 'voting' || b.battles.status === 'active')) || [];
  const upcomingBattles = myBattles?.filter((b: any) => b.battles && b.battles.status === 'upcoming') || [];
  const pastBattles = myBattles?.filter((b: any) => b.battles && b.battles.status === 'completed') || [];

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error('No user');
      
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: data.display_name,
          bio: data.bio,
          username: data.username,
          country_code: data.country_code
        })
        .eq('user_id', user.id);
      
      if (profileError) throw profileError;
      
      // If user is a barber, ALSO update barber_profiles.country_code
      if (isUserBarber && barberProfile?.id) {
        const { error: barberError } = await supabase
          .from('barber_profiles')
          .update({ country_code: data.country_code })
          .eq('user_id', user.id);
        
        if (barberError) throw barberError;
      }
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
      // Handle duplicate username error specifically
      if (error.code === '23505' && error.message.includes('profiles_username_key')) {
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
          
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            {/* Profile Info */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Personal Information Card */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <User className="h-5 w-5 flex-shrink-0" />
                        <span className="truncate">Personal Information</span>
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        Manage your basic profile information and avatar
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Upload Section - Barbers Only */}
                  {isBarber && (
                    <div className="flex flex-col items-center pb-6 border-b">
                      <AvatarUpload currentAvatar={profile?.avatar_url || ''} onAvatarChange={url => {
                        queryClient.invalidateQueries({
                          queryKey: ['profile', user?.id]
                        });
                      }} size="lg" />
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="display_name">Display Name</Label>
                        <Input id="display_name" value={formData.display_name} onChange={e => setFormData(prev => ({
                        ...prev,
                        display_name: e.target.value
                      }))} disabled={!isEditing} className="w-full" />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" value={formData.username} onChange={e => setFormData(prev => ({
                        ...prev,
                        username: e.target.value
                      }))} disabled={!isEditing} placeholder="@username" className="w-full" />
                        <p className="text-xs text-muted-foreground">
                          Choose a unique username
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Country</Label>
                      <CountrySelector value={formData.country_code} onChange={country_code => setFormData(prev => ({
                      ...prev,
                      country_code
                    }))} placeholder="Select your country" disabled={false} />
                    </div>

                    {/* Only show bio for barbers */}
                    {isBarber && <div className="space-y-2">
                        <Label htmlFor="bio">Personal Bio</Label>
                        <Textarea id="bio" value={formData.bio} onChange={e => setFormData(prev => ({
                      ...prev,
                      bio: e.target.value
                    }))} disabled={!isEditing} placeholder="Tell people about yourself..." rows={3} className="resize-none w-full" />
                      </div>}

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={user?.email || ''} disabled className="bg-muted" />
                    </div>

                    <div className="space-y-2">
                      <Label>Account Type</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant={isBarber ? "default" : "secondary"} className="text-sm px-3 py-1">
                          {isBarber ? <>
                              <Scissors className="w-4 h-4 mr-1.5" />
                              Barber
                            </> : <>
                              <Users className="w-4 h-4 mr-1.5" />
                              Fan
                            </>}
                        </Badge>
                        <RoleBadge size="sm" />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                      {isEditing ? <>
                          <Button type="submit" disabled={updateProfileMutation.isPending} className="w-full sm:w-auto">
                            {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Profile
                          </Button>
                          <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                            Cancel
                          </Button>
                        </> : <Button type="button" onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
                          Edit Profile
                        </Button>}
                      
                      {isBarber && <Button variant="outline" size="default" onClick={() => setShowBarberSettings(true)} className="w-full sm:w-auto sm:ml-auto">
                          <Settings className="h-4 w-4 mr-2" />
                          Barber Settings
                        </Button>}
                      {(barberProfile || clientProfile) && <Button variant="outline" size="default" onClick={() => setShowProfileSetup(true)} className="w-full sm:w-auto">
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit {isBarber ? 'Barber' : 'Client'} Profile
                        </Button>}
                    </div>
                  </form>

                  {/* Specialized Profile Info */}
                  {barberProfile && <div className="mt-6 pt-6 border-t">
                      <h4 className="font-semibold mb-4">Barber Profile</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Professional Name:</span>
                          <p className="font-medium">{barberProfile.name}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Specialty:</span>
                          <p className="font-medium">{barberProfile.specialty || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Experience:</span>
                          <p className="font-medium">
                            {barberProfile.years_experience ? `${barberProfile.years_experience} years` : 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Rating:</span>
                          <p className="font-medium">{barberProfile.rating || 0}/5</p>
                        </div>
                      </div>
                    </div>}

                  {/* Fan stats section removed - keep it minimal */}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions Sidebar */}
            
          </div>

          {/* My Battles Section - Barbers Only */}
          {isBarber && myBattles && myBattles.length > 0 && <div className="mt-8">
              <h3 className="text-2xl font-bold mb-6">My Battles</h3>
              
              {/* Active Battles */}
              {activeBattles.length > 0 && <div className="mb-8">
                  <h4 className="text-xl font-semibold mb-4 text-primary">Active Battles</h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activeBattles.map(({
                battles
              }: any) => {
                const hasSubmission = !needsSubmission(battles);
                return <Card key={battles.id} className="border-primary/50 hover:border-primary cursor-pointer" onClick={() => navigate(`/battles/${battles.id}`)}>
                          <CardHeader>
                            <div className="flex items-center justify-between mb-2">
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                Active
                              </Badge>
                              {hasSubmission ? <Badge className="bg-green-500 text-white">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Submitted
                                </Badge> : <Badge variant="outline" className="border-orange-500 text-orange-500">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pending
                                </Badge>}
                            </div>
                            <CardTitle className="text-lg">{battles.title}</CardTitle>
                            <CardDescription className="line-clamp-2">
                              {battles.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">{battles.category}</span>
                              <span className="text-primary font-semibold">
                                ${battles.prize_amount}
                              </span>
                            </div>
                            {!hasSubmission && <Button className="w-full mt-3" size="sm" variant="outline">
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Submission
                              </Button>}
                          </CardContent>
                        </Card>;
              })}
                  </div>
                </div>}

              {/* Upcoming Battles */}
              {upcomingBattles.length > 0 && <div className="mb-8">
                  <h4 className="text-xl font-semibold mb-4">Upcoming Battles</h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {upcomingBattles.map(({
                battles
              }: any) => <Card key={battles.id} className="hover:border-primary cursor-pointer" onClick={() => navigate(`/battles/${battles.id}`)}>
                        <CardHeader>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary">Upcoming</Badge>
                            <Badge variant="outline">{battles.category}</Badge>
                          </div>
                          <CardTitle className="text-lg">{battles.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {battles.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground">
                            {battles.starts_at && <div>Starts: {new Date(battles.starts_at).toLocaleDateString()}</div>}
                            <div className="text-primary font-semibold mt-2">
                              Prize: ${battles.prize_amount}
                            </div>
                          </div>
                        </CardContent>
                      </Card>)}
                  </div>
                </div>}

              {/* Past Battles */}
              {pastBattles.length > 0 && <div>
                  <h4 className="text-xl font-semibold mb-4">Past Battles</h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {pastBattles.map(({
                battles
              }: any) => <Card key={battles.id} className="opacity-80 hover:opacity-100 cursor-pointer" onClick={() => navigate(`/battles/${battles.id}`)}>
                        <CardHeader>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">
                              <Award className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                            <Badge variant="outline">{battles.category}</Badge>
                          </div>
                          <CardTitle className="text-lg">{battles.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {battles.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button className="w-full" size="sm" variant="ghost">
                            View Results
                          </Button>
                        </CardContent>
                      </Card>)}
                  </div>
                </div>}
            </div>}

          {/* Empty State for Barbers with No Battles */}
          {isBarber && (!myBattles || myBattles.length === 0) && <div className="mt-8">
              <EmptyState icon={Trophy} title="No Battles Yet" description="Create your first battle or join a tournament to start competing!" actionLabel="Go to Portal" onAction={() => navigate('/portal')} />
            </div>}

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
    </div>;
};
export default Profile;