import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfileSetup } from '@/hooks/useProfileSetup';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/BackButton';
import { Scissors, Users, Trophy, Plus, User, Loader2, Globe, Edit3, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { CountrySelector } from '@/components/CountrySelector';
import { BarberProfileForm } from '@/components/profiles/BarberProfileForm';
import { ClientProfileForm } from '@/components/profiles/ClientProfileForm';
import { CreationUpload } from '@/components/creations/CreationUpload';
import BarberDashboard from '@/components/barber/BarberDashboard';

const Profile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showCreationUpload, setShowCreationUpload] = useState(false);

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
  const { data: profile, isLoading } = useQuery({
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

  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    username: '',
    country_code: null as string | null,
  });

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        username: profile.username || '',
        country_code: profile.country_code || null,
      });
    }
  }, [profile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error('No user');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: data.display_name,
          bio: data.bio,
          username: data.username,
          country_code: data.country_code,
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error('Failed to update profile: ' + error.message);
    },
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
        country_code: profile.country_code || null,
      });
    }
    setIsEditing(false);
  };

  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-20 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Show specialized profile setup if needed
  if (needsProfileSetup && !showProfileSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        <Header />
        <main className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-2xl">
            <BackButton className="mb-6" />
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
                <CardDescription>
                  {isBarber 
                    ? 'Set up your professional barber profile to start competing' 
                    : 'Complete your profile to start voting and engaging with battles'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setShowProfileSetup(true)}
                  className="w-full"
                  size="lg"
                >
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
        <main className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-2xl">
            <BackButton className="mb-6" />
            <Button 
              variant="ghost" 
              onClick={() => setShowProfileSetup(false)}
              className="mb-4"
            >
              ← Back to Profile
            </Button>
            
            {isBarber ? (
              <BarberProfileForm 
                onProfileCreated={() => {
                  setShowProfileSetup(false);
                  refreshProfiles();
                }}
                existingProfile={barberProfile}
              />
            ) : (
              <ClientProfileForm 
                onProfileCreated={() => {
                  setShowProfileSetup(false);
                  refreshProfiles();
                }}
                existingProfile={clientProfile}
              />
            )}
          </div>
        </main>
      </div>
    );
  }

  // Show barber dashboard for barber users
  if (isBarber && barberProfile) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-20">
          <BarberDashboard />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <Header />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <BackButton className="mb-6" />
          
          <div className="grid gap-6 md:grid-cols-3">
            {/* Profile Info */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Profile Information
                      </CardTitle>
                      <CardDescription>
                        Manage your account details and preferences
                      </CardDescription>
                    </div>
                    {(barberProfile || clientProfile) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowProfileSetup(true)}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit {isBarber ? 'Barber' : 'Client'} Profile
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        value={formData.display_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="@username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Country</Label>
                      <CountrySelector
                        value={formData.country_code}
                        onChange={(country_code) => setFormData(prev => ({ ...prev, country_code }))}
                        placeholder="Select your country"
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Tell us about yourself..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={user?.email || ''} disabled />
                    </div>

                    <div className="space-y-2">
                      <Label>Account Type</Label>
                      <div>
                        <Badge variant={isBarber ? "default" : "secondary"} className="text-sm">
                          {isBarber ? (
                            <>
                              <Scissors className="w-4 h-4 mr-1" />
                              Barber
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4 mr-1" />
                              Fan
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      {isEditing ? (
                        <>
                          <Button 
                            type="submit" 
                            disabled={updateProfileMutation.isPending}
                          >
                            {updateProfileMutation.isPending && (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Save Changes
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handleCancel}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button 
                          type="button" 
                          onClick={() => setIsEditing(true)}
                        >
                          Edit Profile
                        </Button>
                      )}
                    </div>
                  </form>

                  {/* Specialized Profile Info */}
                  {barberProfile && (
                    <div className="mt-6 pt-6 border-t">
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
                    </div>
                  )}

                  {clientProfile && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-semibold mb-4">Voting Profile</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Username:</span>
                          <p className="font-medium">{clientProfile.username}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Votes Cast:</span>
                          <p className="font-medium">{clientProfile.total_votes_cast || 0}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Voting Power:</span>
                          <p className="font-medium">{clientProfile.voting_power || 1}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isBarber && barberProfile && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setShowCreationUpload(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Upload Creation
                    </Button>
                  )}
                  
                  <Link to="/battles">
                    <Button variant="outline" className="w-full justify-start">
                      <Trophy className="w-4 h-4 mr-2" />
                      View Battles
                    </Button>
                  </Link>
                  
                  {isBarber && (
                    <Link to="/battles/create">
                      <Button variant="outline" className="w-full justify-start">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Battle
                      </Button>
                    </Link>
                  )}

                  <Link to="/portal">
                    <Button variant="outline" className="w-full justify-start">
                      <Trophy className="w-4 h-4 mr-2" />
                      Battle Portal
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {isBarber && (
                <Card>
                  <CardHeader>
                    <CardTitle>Barber Tools</CardTitle>
                    <CardDescription>
                      Professional features for barbers
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      • Create and manage battles
                    </p>
                    <p className="text-sm text-muted-foreground">
                      • Showcase your work
                    </p>
                    <p className="text-sm text-muted-foreground">
                      • Build your reputation
                    </p>
                  </CardContent>
                </Card>
              )}

              {!isBarber && (
                <Card>
                  <CardHeader>
                    <CardTitle>Fan Features</CardTitle>
                    <CardDescription>
                      Engage with the community
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      • Vote on battles
                    </p>
                    <p className="text-sm text-muted-foreground">
                      • Follow your favorite barbers
                    </p>
                    <p className="text-sm text-muted-foreground">
                      • Join the conversation
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

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
                  <CreationUpload
                    barberProfileId={barberProfile.id}
                    onCreationUploaded={() => {
                      setShowCreationUpload(false);
                      toast.success('Creation uploaded successfully!');
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;