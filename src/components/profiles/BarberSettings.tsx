import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SpecialtyPillSelector } from './SpecialtyPillSelector';
import { ServicesManager } from './ServicesManager';
import { WeeklyAvailabilityManager } from './WeeklyAvailabilityManager';
import { Separator } from '@/components/ui/separator';
import { AvatarUpload } from './AvatarUpload';
import { PortfolioManager } from './PortfolioManager';
import { CountrySelector } from '@/components/CountrySelector';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  User, 
  Briefcase, 
  Globe, 
  DollarSign, 
  Shield,
  Settings,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  MapPin,
  Loader2,
  Save,
  Navigation,
  RefreshCw,
  CheckCircle
} from 'lucide-react';

interface BarberSettingsProps {
  onBack?: () => void;
}

export function BarberSettings({ onBack }: BarberSettingsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [gettingLocation, setGettingLocation] = useState(false);

  // Fetch profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
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

  // Fetch barber profile data
  const { data: barberProfile, isLoading: barberLoading } = useQuery({
    queryKey: ['barberProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch current slot duration from availability
  const { data: availabilityData } = useQuery({
    queryKey: ['barber-availability-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('barber_availability')
        .select('slot_duration_minutes')
        .eq('barber_user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Form states
  const [profileForm, setProfileForm] = useState({
    username: '',
    bio: '',
    country_code: '',
    avatar_url: ''
  });

  const [barberForm, setBarberForm] = useState({
    name: '',
    specialty: '',
    bio: '',
    location: '',
    country_code: '',
    portfolio_url: '',
    // Social media
    instagram: '',
    facebook: '', 
    twitter: '',
    youtube: '',
    // Business settings
    accepting_clients: true,
    available_for_battles: true,
    // Booking economy
    require_deposit: true,
    default_no_show_fee_bb: 50,
    booking_message: '',
    slot_duration_minutes: '30',
    shop_address: '',
    shop_city: '',
    shop_state: '',
    shop_postal_code: '',
    address_visibility: 'approximate' as 'approximate' | 'exact',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [geocoding, setGeocoding] = useState(false);

  // Update forms when data loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        username: profile.username || '',
        bio: profile.bio || '',
        country_code: profile.country_code || '',
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    if (barberProfile) {
      setBarberForm({
        name: barberProfile.name || '',
        specialty: barberProfile.specialty || '',
        bio: barberProfile.bio || '',
        location: barberProfile.location || '',
        country_code: barberProfile.country_code || '',
        portfolio_url: barberProfile.portfolio_url || '',
        instagram: (barberProfile as any).instagram_handle || '',
        facebook: (barberProfile as any).facebook_handle || '',
        twitter: (barberProfile as any).twitter_handle || '',
        youtube: (barberProfile as any).youtube_handle || '',
        accepting_clients: true,
        available_for_battles: true,
        require_deposit: (barberProfile as any).require_deposit ?? true,
        default_no_show_fee_bb: (barberProfile as any).default_no_show_fee_bb ?? 50,
        booking_message: (barberProfile as any).booking_message || '',
        slot_duration_minutes: availabilityData?.slot_duration_minutes?.toString() || '30'
      });
    }
  }, [barberProfile, availabilityData]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      if (!user?.id) throw new Error('No user');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: data.username,
          bio: data.bio,
          avatar_url: data.avatar_url
        })
        .eq('user_id', user.id);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['barberProfile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['public-barber-profile'] });
      toast.success('Profile updated successfully!');
    },
    onError: (error: any) => {
      if (error.code === '23505' || error.message?.includes('duplicate key value') || error.message?.includes('profiles_username_key')) {
        toast.error('This username is already taken. Please choose another one.');
      } else {
        toast.error('Failed to update profile: ' + error.message);
      }
    },
  });

  // Update barber profile mutation
  const updateBarberMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error('No user');
      const barberData: Record<string, any> = {
        user_id: user.id,
        name: data.name,
        specialty: data.specialty,
        bio: data.bio,
        location: data.location,
        portfolio_url: data.portfolio_url,
        instagram_handle: data.instagram || null,
        facebook_handle: data.facebook || null,
        twitter_handle: data.twitter || null,
        youtube_handle: data.youtube || null,
        require_deposit: data.require_deposit,
        default_no_show_fee_bb: data.default_no_show_fee_bb,
        booking_message: data.booking_message || null
      };

      const { error } = await supabase
        .from('barber_profiles')
        .upsert(barberData as any, { onConflict: 'user_id' });
      if (error) throw error;

      const duration = parseInt(data.slot_duration_minutes) || 30;
      const { error: availError } = await supabase
        .from('barber_availability')
        .update({ slot_duration_minutes: duration })
        .eq('barber_user_id', user.id);
      if (availError) console.warn('Could not update slot duration:', availError.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barberProfile', user?.id] });
      toast.success('Barber profile updated successfully!');
    },
    onError: (error: any) => {
      if (error.message?.includes('row-level security')) {
        toast.error('You must be a Barber to save barber profile. Please switch your role.');
      } else {
        toast.error('Failed to update barber profile: ' + error.message);
      }
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handleBarberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBarberMutation.mutate(barberForm);
  };

  const handleAvatarChange = (url: string) => {
    setProfileForm(prev => ({ ...prev, avatar_url: url }));
    updateProfileMutation.mutate({ ...profileForm, avatar_url: url });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
          );
          const data = await res.json();
          const location = [data.city, data.principalSubdivision, data.countryName].filter(Boolean).join(', ');
          setBarberForm(prev => ({ ...prev, location }));
          toast.success('Location detected!');
        } catch {
          setBarberForm(prev => ({ ...prev, location: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}` }));
        }
        setGettingLocation(false);
      },
      (err) => {
        toast.error('Could not get your location: ' + err.message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (profileLoading || barberLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-4">
          ← Back to Profile
        </Button>
      )}

      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Barber Settings</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto no-scrollbar gap-1 bg-muted p-1 rounded-lg">
          <TabsTrigger value="profile" className="flex-shrink-0 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Profile</TabsTrigger>
          <TabsTrigger value="professional" className="flex-shrink-0 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Pro</TabsTrigger>
          <TabsTrigger value="portfolio" className="flex-shrink-0 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Portfolio</TabsTrigger>
          <TabsTrigger value="business" className="flex-shrink-0 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Biz</TabsTrigger>
          <TabsTrigger value="privacy" className="flex-shrink-0 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Privacy</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Manage your basic profile information and avatar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center space-y-4">
                <AvatarUpload
                  currentAvatar={profileForm.avatar_url}
                  onAvatarChange={handleAvatarChange}
                  size="lg"
                />
              </div>

              <Separator />

              {/* Profile Form */}
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="@username"
                    className="border-cyan-500/30 focus-visible:ring-cyan-500/50"
                  />
                </div>

                <div>
                  <Label>Country</Label>
                  <CountrySelector
                    value={profileForm.country_code}
                    onChange={() => {}}
                    placeholder="Set during Arena Gate"
                    disabled={true}
                  />
                </div>

                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Professional Tab */}
        <TabsContent value="professional" className="space-y-6">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Professional Details
              </CardTitle>
              <CardDescription>
                Showcase your skills and professional information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBarberSubmit} className="space-y-5">
                {/* Social Media Links — moved to top */}
                <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-cyan-400" />
                    Social Media Links
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-pink-500 flex-shrink-0" />
                      <Input
                        placeholder="@instagram"
                        value={barberForm.instagram}
                        onChange={(e) => setBarberForm(prev => ({ ...prev, instagram: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <Input
                        placeholder="facebook.com/profile"
                        value={barberForm.facebook}
                        onChange={(e) => setBarberForm(prev => ({ ...prev, facebook: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Twitter className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      <Input
                        placeholder="@twitter"
                        value={barberForm.twitter}
                        onChange={(e) => setBarberForm(prev => ({ ...prev, twitter: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Youtube className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <Input
                        placeholder="youtube.com/channel"
                        value={barberForm.youtube}
                        onChange={(e) => setBarberForm(prev => ({ ...prev, youtube: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Specialties — compact mode */}
                <div>
                  <Label className="mb-2 block">Specialties</Label>
                  <SpecialtyPillSelector
                    value={barberForm.specialty}
                    onChange={(value) => setBarberForm(prev => ({ ...prev, specialty: value }))}
                    compact
                  />
                </div>

                {/* Location with geolocation */}
                <div>
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    Location
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="location"
                      value={barberForm.location}
                      onChange={(e) => setBarberForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="City, State/Country"
                      className="border-cyan-500/30 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleGetLocation}
                      disabled={gettingLocation}
                      className="border-primary/40 hover:bg-primary/10 flex-shrink-0"
                      title="Use my location"
                    >
                      {gettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4 text-primary" />}
                    </Button>
                  </div>
                </div>

                {/* Nationality — silent disabled */}
                <div>
                  <Label>Nationality</Label>
                  <CountrySelector
                    value={barberForm.country_code}
                    onChange={() => {}}
                    placeholder="Set during Arena Gate"
                    disabled={true}
                  />
                </div>

                {/* Professional Bio */}
                <div>
                  <Label htmlFor="prof_bio">Professional Bio</Label>
                  <Textarea
                    id="prof_bio"
                    value={barberForm.bio}
                    onChange={(e) => setBarberForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Describe your style and what makes you unique..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="portfolio_url">Portfolio Website</Label>
                  <Input
                    id="portfolio_url"
                    value={barberForm.portfolio_url}
                    onChange={(e) => setBarberForm(prev => ({ ...prev, portfolio_url: e.target.value }))}
                    placeholder="https://your-portfolio.com"
                    type="url"
                    className="border-cyan-500/30"
                  />
                </div>

                <Button type="submit" disabled={updateBarberMutation.isPending}>
                  {updateBarberMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  <Save className="w-4 h-4 mr-2" />
                  Save Professional Info
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio">
          <PortfolioManager barberId={barberProfile?.id} />
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Business Settings
              </CardTitle>
              <CardDescription>
                Manage your availability, pricing, and business preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Availability Settings */}
              <div>
                <h4 className="font-semibold mb-4">Availability</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="accepting_clients">Accepting New Clients</Label>
                      <p className="text-sm text-muted-foreground">Allow new clients to book appointments</p>
                    </div>
                    <Switch
                      id="accepting_clients"
                      checked={barberForm.accepting_clients}
                      onCheckedChange={(checked) => setBarberForm(prev => ({ ...prev, accepting_clients: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="available_battles">Available for Battles</Label>
                      <p className="text-sm text-muted-foreground">Participate in barber competitions</p>
                    </div>
                    <Switch
                      id="available_battles"
                      checked={barberForm.available_for_battles}
                      onCheckedChange={(checked) => setBarberForm(prev => ({ ...prev, available_for_battles: checked }))}
                    />
                  </div>

                  {/* Location Sharing Toggle */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="location_sharing" className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          Share My Location
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Show your shop on the barber finder map
                        </p>
                      </div>
                      <Switch
                        id="location_sharing"
                        checked={(barberProfile as any)?.location_sharing_enabled || false}
                        disabled={gettingLocation}
                        onCheckedChange={async (checked) => {
                          if (!user?.id) return;

                          if (checked) {
                            const hasCoords = !!(barberProfile as any)?.latitude && !!(barberProfile as any)?.longitude;

                            if (hasCoords) {
                              // Coords already saved — just flip the flag
                              const { error } = await supabase
                                .from('barber_profiles')
                                .update({ location_sharing_enabled: true } as any)
                                .eq('user_id', user.id);
                              if (error) toast.error('Failed to enable');
                              else {
                                toast.success('You\'re now visible on the map!');
                                queryClient.invalidateQueries({ queryKey: ['barberProfile', user.id] });
                              }
                            } else {
                              // First time — request GPS
                              if (!navigator.geolocation) {
                                toast.error('Geolocation is not supported by your browser');
                                return;
                              }
                              setGettingLocation(true);
                              navigator.geolocation.getCurrentPosition(
                                async (pos) => {
                                  const { error } = await supabase
                                    .from('barber_profiles')
                                    .update({
                                      location_sharing_enabled: true,
                                      latitude: pos.coords.latitude,
                                      longitude: pos.coords.longitude,
                                    } as any)
                                    .eq('user_id', user.id);
                                  if (error) toast.error('Failed to save location');
                                  else {
                                    toast.success('Location saved — you\'re now visible on the map!');
                                    queryClient.invalidateQueries({ queryKey: ['barberProfile', user.id] });
                                  }
                                  setGettingLocation(false);
                                },
                                () => {
                                  toast.error('Location denied. Open in a full browser window or use the Quick Toggle on your profile to set by zip.');
                                  setGettingLocation(false);
                                  queryClient.invalidateQueries({ queryKey: ['barberProfile', user.id] });
                                },
                                { enableHighAccuracy: true, timeout: 10000 }
                              );
                            }
                          } else {
                            // Turning OFF — keep saved coords, just hide
                            const { error } = await supabase
                              .from('barber_profiles')
                              .update({ location_sharing_enabled: false } as any)
                              .eq('user_id', user.id);
                            if (error) toast.error('Failed to update');
                            else {
                              toast.success('Location hidden from map');
                              queryClient.invalidateQueries({ queryKey: ['barberProfile', user.id] });
                            }
                          }
                        }}
                      />
                    </div>

                    {/* Status indicator */}
                    <div className="flex items-center gap-2 text-xs">
                      {(barberProfile as any)?.location_sharing_enabled ? (
                        <>
                          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-green-400">Live on map</span>
                          {(barberProfile as any)?.latitude && (
                            <span className="text-muted-foreground ml-1 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Location saved
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                          <span className="text-muted-foreground">Hidden</span>
                        </>
                      )}
                    </div>

                    {/* Refresh Location button — only when sharing is ON */}
                    {(barberProfile as any)?.location_sharing_enabled && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={gettingLocation}
                        className="text-xs gap-1.5"
                        onClick={() => {
                          if (!navigator.geolocation || !user?.id) return;
                          setGettingLocation(true);
                          navigator.geolocation.getCurrentPosition(
                            async (pos) => {
                              const { error } = await supabase
                                .from('barber_profiles')
                                .update({
                                  latitude: pos.coords.latitude,
                                  longitude: pos.coords.longitude,
                                } as any)
                                .eq('user_id', user.id);
                              if (error) toast.error('Failed to update location');
                              else {
                                toast.success('Location refreshed!');
                                queryClient.invalidateQueries({ queryKey: ['barberProfile', user.id] });
                              }
                              setGettingLocation(false);
                            },
                            () => {
                              toast.error('Location access denied');
                              setGettingLocation(false);
                            },
                            { enableHighAccuracy: true, timeout: 10000 }
                          );
                        }}
                      >
                        {gettingLocation ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Refresh Location
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Booking Economy */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Booking Economy
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="require_deposit">Require Deposit</Label>
                      <p className="text-sm text-muted-foreground">Clients must pay BB deposit to book</p>
                    </div>
                    <Switch
                      id="require_deposit"
                      checked={barberForm.require_deposit}
                      onCheckedChange={(checked) => setBarberForm(prev => ({ ...prev, require_deposit: checked }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="no_show_fee">No-Show Fee (BB)</Label>
                    <p className="text-xs text-muted-foreground mb-1">Amount deducted from client if they miss the appointment</p>
                    <Input
                      id="no_show_fee"
                      type="number"
                      min={0}
                      max={1000}
                      value={barberForm.default_no_show_fee_bb}
                      onChange={(e) => setBarberForm(prev => ({ ...prev, default_no_show_fee_bb: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="booking_message">Custom Booking Message</Label>
                    <p className="text-xs text-muted-foreground mb-1">Shown to clients when they book</p>
                    <Textarea
                      id="booking_message"
                      value={barberForm.booking_message}
                      onChange={(e) => setBarberForm(prev => ({ ...prev, booking_message: e.target.value }))}
                      placeholder="e.g., Please arrive 5 minutes early. No refunds within 2 hours of appointment."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="slot_duration">Time Slot Duration</Label>
                    <p className="text-xs text-muted-foreground mb-1">How long each bookable slot should be</p>
                    <Select value={barberForm.slot_duration_minutes} onValueChange={(value) => setBarberForm(prev => ({ ...prev, slot_duration_minutes: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select slot duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Services Manager */}
              <ServicesManager barberId={barberProfile?.id} />

              <Separator />

              {/* Weekly Availability */}
              <WeeklyAvailabilityManager barberId={barberProfile?.id} />

              <Button 
                onClick={handleBarberSubmit} 
                disabled={updateBarberMutation.isPending}
                className="w-full"
              >
                {updateBarberMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Save Business Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Privacy & Security
              </CardTitle>
              <CardDescription>
                Control your privacy settings and account security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Privacy Settings</h3>
                <p className="text-muted-foreground mb-4">
                  Advanced privacy and security features coming soon
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Two-factor authentication</p>
                  <p>• Profile visibility controls</p>
                  <p>• Data export and deletion</p>
                  <p>• Password change options</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
