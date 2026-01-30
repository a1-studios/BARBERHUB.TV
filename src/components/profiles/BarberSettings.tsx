import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  Phone, 
  Globe, 
  Clock, 
  DollarSign, 
  Shield,
  Settings,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  MapPin,
  Award,
  Loader2,
  Save,
  Lock
} from 'lucide-react';

interface BarberSettingsProps {
  onBack?: () => void;
}

export function BarberSettings({ onBack }: BarberSettingsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');

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

  // Form states
  const [profileForm, setProfileForm] = useState({
    display_name: '',
    username: '',
    bio: '',
    country_code: '',
    avatar_url: ''
  });

  const [barberForm, setBarberForm] = useState({
    name: '',
    nickname: '',
    specialty: '',
    bio: '',
    location: '',
    country_code: '',
    years_experience: '',
    portfolio_url: '',
    // Social media
    instagram: '',
    facebook: '', 
    twitter: '',
    youtube: '',
    // Contact
    phone: '',
    website: '',
    // Business settings
    accepting_clients: true,
    available_for_battles: true,
    pricing_range: '',
    business_hours: ''
  });

  const [businessSettings, setBusinessSettings] = useState({
    shop_name: '',
    shop_address: '',
    services: [] as string[],
    price_range: '',
    booking_enabled: false,
    online_presence: {
      website: '',
      instagram: '',
      facebook: '',
      twitter: '',
      youtube: '',
      tiktok: ''
    }
  });

  // Update forms when data loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        display_name: profile.display_name || '',
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
        nickname: barberProfile.nickname || '',
        specialty: barberProfile.specialty || '',
        bio: barberProfile.bio || '',
        location: barberProfile.location || '',
        country_code: barberProfile.country_code || '',
        years_experience: barberProfile.years_experience?.toString() || '',
        portfolio_url: barberProfile.portfolio_url || '',
        instagram: '',
        facebook: '',
        twitter: '',
        youtube: '',
        phone: '',
        website: '',
        accepting_clients: true,
        available_for_battles: true,
        pricing_range: '',
        business_hours: ''
      });
    }
  }, [barberProfile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      if (!user?.id) throw new Error('No user');
      
      // Update profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update(data)
        .eq('user_id', user.id);
      
      if (profileError) throw profileError;
      
      // Also update barber_profiles.country_code if barber exists
      if (barberProfile?.id) {
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
      toast.success('Profile updated successfully!');
    },
    onError: (error: any) => {
      toast.error('Failed to update profile: ' + error.message);
    },
  });

  // Update barber profile mutation
  const updateBarberMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error('No user');
      
      const barberData = {
        user_id: user.id,
        name: data.name,
        nickname: data.nickname,
        specialty: data.specialty,
        bio: data.bio,
        location: data.location,
        country_code: data.country_code,
        years_experience: data.years_experience ? parseInt(data.years_experience) : null,
        portfolio_url: data.portfolio_url
      };

      const { error } = await supabase
        .from('barber_profiles')
        .upsert(barberData, { onConflict: 'user_id' });
      
      if (error) throw error;
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
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Barber Settings</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={profileForm.display_name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, display_name: e.target.value }))}
                      placeholder="Your display name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="@username"
                    />
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    Country
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked
                    </Badge>
                  </Label>
                  <CountrySelector
                    value={profileForm.country_code}
                    onChange={() => {}}
                    placeholder="Set during Arena Gate"
                    disabled={true}
                  />
                  <p className="text-xs text-amber-500/80 mt-1">
                    Nationality is permanently set during sign-up
                  </p>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Professional Details
              </CardTitle>
              <CardDescription>
                Showcase your skills, experience, and professional information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBarberSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prof_name">Professional Name *</Label>
                    <Input
                      id="prof_name"
                      value={barberForm.name}
                      onChange={(e) => setBarberForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your professional name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nickname">Nickname</Label>
                    <Input
                      id="nickname"
                      value={barberForm.nickname}
                      onChange={(e) => setBarberForm(prev => ({ ...prev, nickname: e.target.value }))}
                      placeholder="Your street name or nickname"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="specialty">Specialty</Label>
                    <Select value={barberForm.specialty} onValueChange={(value) => setBarberForm(prev => ({ ...prev, specialty: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your specialty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fades">Fades</SelectItem>
                        <SelectItem value="cuts">Classic Cuts</SelectItem>
                        <SelectItem value="beard">Beard Styling</SelectItem>
                        <SelectItem value="color">Hair Color</SelectItem>
                        <SelectItem value="texture">Texture Work</SelectItem>
                        <SelectItem value="creative">Creative Styles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Input
                      id="experience"
                      type="number"
                      value={barberForm.years_experience}
                      onChange={(e) => setBarberForm(prev => ({ ...prev, years_experience: e.target.value }))}
                      placeholder="e.g., 5"
                      min="0"
                      max="50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={barberForm.location}
                      onChange={(e) => setBarberForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="City, State/Country"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      Professional Country
                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </Badge>
                    </Label>
                    <CountrySelector
                      value={barberForm.country_code}
                      onChange={() => {}}
                      placeholder="Set during Arena Gate"
                      disabled={true}
                    />
                    <p className="text-xs text-amber-500/80 mt-1 flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Represents your nation in World Cup battles
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="prof_bio">Professional Bio</Label>
                  <Textarea
                    id="prof_bio"
                    value={barberForm.bio}
                    onChange={(e) => setBarberForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Describe your style, experience, and what makes you unique..."
                    rows={4}
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
                  />
                </div>

                <Separator />

                {/* Social Media */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Social Media Links
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-pink-500" />
                      <Input
                        placeholder="@instagram_handle"
                        value={barberForm.instagram}
                        onChange={(e) => setBarberForm(prev => ({ ...prev, instagram: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-blue-500" />
                      <Input
                        placeholder="facebook.com/profile"
                        value={barberForm.facebook}
                        onChange={(e) => setBarberForm(prev => ({ ...prev, facebook: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Twitter className="h-4 w-4 text-blue-400" />
                      <Input
                        placeholder="@twitter_handle"
                        value={barberForm.twitter}
                        onChange={(e) => setBarberForm(prev => ({ ...prev, twitter: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Youtube className="h-4 w-4 text-red-500" />
                      <Input
                        placeholder="youtube.com/channel"
                        value={barberForm.youtube}
                        onChange={(e) => setBarberForm(prev => ({ ...prev, youtube: e.target.value }))}
                      />
                    </div>
                  </div>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
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
                </div>
              </div>

              <Separator />

              {/* Pricing */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing Information
                </h4>
                <div>
                  <Label htmlFor="pricing_range">Price Range</Label>
                  <Select value={barberForm.pricing_range} onValueChange={(value) => setBarberForm(prev => ({ ...prev, pricing_range: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your price range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget ($15-25)</SelectItem>
                      <SelectItem value="mid">Mid-range ($25-40)</SelectItem>
                      <SelectItem value="premium">Premium ($40-60)</SelectItem>
                      <SelectItem value="luxury">Luxury ($60+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Business Hours */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Business Hours
                </h4>
                <Textarea
                  placeholder="e.g., Mon-Fri: 9AM-6PM, Sat: 9AM-4PM, Sun: Closed"
                  value={barberForm.business_hours}
                  onChange={(e) => setBarberForm(prev => ({ ...prev, business_hours: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
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