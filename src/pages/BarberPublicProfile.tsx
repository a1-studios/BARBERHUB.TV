import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { parseSpecialties, getSpecialtyDisplay } from '@/config/specialtyTags';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, MapPin, Award, Upload, Image as ImageIcon, Video, Trash2, Calendar, Instagram, Twitter, Youtube, Facebook, Settings, Briefcase, Globe, DollarSign, Shield, Save, Navigation, Loader2, ChevronDown, Lock } from 'lucide-react';
import { BarberVideoSection } from '@/components/barber/BarberVideoSection';
import { SmartVideoPlayer } from '@/components/video/SmartVideoPlayer';
import { BarberActionButtons } from '@/components/barber/BarberActionButtons';
import { AvatarCrest } from '@/components/AvatarCrest';
import { SocialOrbit } from '@/components/profiles/SocialOrbit';
import { AvatarUpload } from '@/components/profiles/AvatarUpload';
import { SpecialtyPillSelector } from '@/components/profiles/SpecialtyPillSelector';
import { ServicesManager } from '@/components/profiles/ServicesManager';
import { useSponsorAds } from '@/hooks/useSponsorAds';
import { WeeklyAvailabilityManager } from '@/components/profiles/WeeklyAvailabilityManager';
import { useState, useEffect, useRef } from 'react';
import { DonationModal } from '@/components/DonationModal';
import { BookingConsole } from '@/components/booking/BookingConsole';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { uploadPortfolioMedia } from '@/lib/storage';

export default function BarberPublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isBarber: isVisitorBarber } = useUserRole();
  const queryClient = useQueryClient();
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const isOwner = user?.id === userId;
  const editMode = searchParams.get('edit') === 'true';

  // Auto-open settings panel when navigating with ?edit=true
  useEffect(() => {
    if (isOwner && editMode) {
      setSettingsOpen(true);
    }
  }, [isOwner, editMode]);

  // Fetch barber profile using unified view
  const { data: barberData, isLoading } = useQuery({
    queryKey: ['barber-public-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_barber_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  // Fetch subscription tier separately
  const { data: subscriptionData } = useQuery({
    queryKey: ['barber-subscription-tier', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('active_subscription_tier, m4m_certified, m4m_paid, m4m_lives_touched')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  // Fetch full barber profile for editing (owner only)
  const { data: barberProfile } = useQuery({
    queryKey: ['barberProfile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && isOwner
  });

  // Fetch profile for editing (owner only)
  const { data: ownerProfile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && isOwner
  });

  // Fetch availability settings
  const { data: availabilityData } = useQuery({
    queryKey: ['barber-availability-settings', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('barber_availability')
        .select('slot_duration_minutes')
        .eq('barber_user_id', userId)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && isOwner
  });

  // Owner editing form state
  const [barberForm, setBarberForm] = useState({
    specialty: '',
    bio: '',
    location: '',
    portfolio_url: '',
    instagram: '',
    facebook: '',
    twitter: '',
    youtube: '',
    accepting_clients: true,
    available_for_battles: true,
    require_deposit: true,
    default_no_show_fee_bb: 50,
    booking_message: '',
    slot_duration_minutes: '30'
  });

  useEffect(() => {
    if (barberProfile) {
      setBarberForm({
        specialty: barberProfile.specialty || '',
        bio: barberProfile.bio || '',
        location: barberProfile.location || '',
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

  // Update barber profile mutation
  const updateBarberMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!userId) throw new Error('No user');
      const barberData: Record<string, any> = {
        user_id: userId,
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
        .eq('barber_user_id', userId);
      if (availError) console.warn('Could not update slot duration:', availError.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barberProfile', userId] });
      queryClient.invalidateQueries({ queryKey: ['barber-public-profile', userId] });
      toast.success('Settings saved!');
    },
    onError: (error: any) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  const handleAvatarChange = async (url: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('user_id', userId);
    if (error) {
      toast.error('Failed to update avatar');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    queryClient.invalidateQueries({ queryKey: ['barber-public-profile', userId] });
    toast.success('Avatar updated!');
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

  const handleBarberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBarberMutation.mutate(barberForm);
  };

  // Map stats directly from the view data
  const stats = barberData ? {
    follower_count: barberData.follower_count,
    like_count: barberData.like_count,
    total_donations_cents: barberData.total_donations_cents
  } : null;

  // Fetch recent battles using barber_id from view
  const { data: recentBattles } = useQuery({
    queryKey: ['barber-battles', barberData?.barber_id],
    queryFn: async () => {
      if (!barberData?.barber_id) return [];
      
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .or(`barber1_id.eq.${barberData.barber_id},barber2_id.eq.${barberData.barber_id}`)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data;
    },
    enabled: !!barberData?.barber_id
  });

  // Fetch portfolio using barber_id from view
  const { data: portfolio, refetch: refetchPortfolio } = useQuery({
    queryKey: ['barber-portfolio', barberData?.barber_id],
    queryFn: async () => {
      if (!barberData?.barber_id) return [];
      
      const { data, error } = await supabase
        .from('creations')
        .select('*')
        .eq('barber_id', barberData.barber_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!barberData?.barber_id
  });

  // Count images and videos in portfolio
  const isVideoItem = (p: any) => p.category === 'video' || p.media_url?.match(/\.(mp4|mov|avi|webm)$/i);
  const imageCount = portfolio?.filter(p => !isVideoItem(p))?.length || 0;
  const videoCount = portfolio?.filter(p => isVideoItem(p))?.length || 0;

  const handleDeletePortfolioItem = async (creationId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error: dbError } = await supabase
        .from('creations')
        .delete()
        .eq('id', creationId);

      if (dbError) throw dbError;

      toast.success('Item deleted successfully');
      refetchPortfolio();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === 'image' && !file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (type === 'video' && !file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    if (type === 'image' && imageCount >= 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    const existingTotalSize = (portfolio || []).reduce((sum, p) => sum + (p as any).file_size_bytes || 0, 0);
    if (existingTotalSize + file.size > 5 * 1024 * 1024 * 1024) {
      toast.error('Portfolio storage limit reached');
      return;
    }

    const maxSize = type === 'video' ? 5 * 1024 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large`);
      return;
    }

    setUploading(true);
    try {
      const publicUrl = await uploadPortfolioMedia(file, user?.id || '');

      const { error: createError } = await supabase
        .from('creations')
        .insert({
          barber_id: barberData?.barber_id,
          media_url: publicUrl,
          category: type === 'image' ? 'haircut' : 'video',
          title: file.name
        });

      if (createError) throw createError;

      toast.success(`${type === 'image' ? 'Image' : 'Video'} uploaded successfully!`);
      refetchPortfolio();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      setUploadKey(prev => prev + 1);
    }
  };

  const getCountryFlag = (countryCode: string | null) => {
    if (!countryCode) return null;
    return String.fromCodePoint(
      ...countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0))
    );
  };

  const { data: activeSponsors = [] } = useSponsorAds(true);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-primary/20 rounded-lg" />
            <div className="h-96 bg-primary/20 rounded-lg" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!barberData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Barber profile not found</p>
              <Button onClick={() => navigate('/')} className="mt-4">
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const displayName = barberData.display_name || barberData.barber_name;
  const sponsorPill = activeSponsors?.[0]?.name ?? null;




  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Hero Section with Flag Background */}
        <Card className="relative overflow-hidden border-primary/30">
          {barberData.country_code && barberData.country_code !== 'XX' && (
            <div 
              className="absolute inset-0 opacity-30 bg-cover bg-center"
              style={{
                backgroundImage: `url(https://flagcdn.com/w1280/${barberData.country_code.toLowerCase()}.png)`,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/80 to-primary/20" />
          <CardContent className="relative p-8 z-10">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <SocialOrbit
                radius={78}
                
                iconSize={28}
                links={{
                  instagram: (barberData as any).instagram_handle,
                  facebook: (barberData as any).facebook_handle,
                  twitter: (barberData as any).twitter_handle,
                  youtube: (barberData as any).youtube_handle,
                }}
              >
                <AvatarCrest
                  tier={subscriptionData?.active_subscription_tier}
                  size="lg"
                  interactive={isOwner}
                  showM4M={true}
                  m4mCertified={subscriptionData?.m4m_certified ?? false}
                  m4mPaid={subscriptionData?.m4m_paid ?? false}
                  m4mLivesTouched={subscriptionData?.m4m_lives_touched ?? 0}
                  barberName={displayName || 'Barber'}
                  barberUserId={userId!}
                  isOwnProfile={isOwner}
                >
                  <Avatar className="w-full h-full">
                    <AvatarImage src={barberData.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-4xl font-bold">
                      {(displayName || 'B').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </AvatarCrest>
              </SocialOrbit>

              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-4xl font-bold text-white">{displayName}</h1>
                    {barberData.country_code && (
                      <span className="text-3xl">{getCountryFlag(barberData.country_code)}</span>
                    )}
                    {barberData.is_live && (
                      <Badge variant="destructive" className="animate-pulse text-lg px-3 py-1">
                        🔴 LIVE NOW
                      </Badge>
                    )}
                  </div>
                  
                  {barberData.specialty && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {parseSpecialties(barberData.specialty).map(id => {
                        const tag = getSpecialtyDisplay(id);
                        return tag ? (
                          <Badge key={id} variant="secondary" className="text-xs px-2.5 py-1 bg-primary/10 text-primary border-primary/20">
                            {tag.emoji} {tag.label}
                          </Badge>
                        ) : (
                          <Badge key={id} variant="secondary" className="text-xs px-2.5 py-1">{id}</Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Social icons now orbit the avatar */}
                </div>

                {/* Stats Row */}
                <div className="flex gap-6 flex-wrap">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">{stats?.follower_count || 0}</div>
                    <div className="text-sm text-muted-foreground">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">{stats?.like_count || 0}</div>
                    <div className="text-sm text-muted-foreground">Likes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">${((stats?.total_donations_cents || 0) / 100).toFixed(0)}</div>
                    <div className="text-sm text-muted-foreground">Donated</div>
                  </div>
                </div>

                {/* Action Buttons - Only show for visitors */}
                {!isOwner && (
                  <div className="flex gap-3 flex-wrap">
                    <BarberActionButtons
                      barberId={barberData.barber_id}
                      barberUserId={userId!}
                      onDonateClick={() => setIsDonationModalOpen(true)}
                    />
                    
                    {!isVisitorBarber && (
                      <Button 
                        variant="default" 
                        size="default"
                        className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
                        onClick={() => setIsBookingOpen(true)}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Book Appointment
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video & Content Tabs */}
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(barberData.user_bio || barberData.barber_bio) && (
                  <p className="text-muted-foreground">{barberData.user_bio || barberData.barber_bio}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {barberData.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{barberData.location}</span>
                    </div>
                  )}
                  {barberData.years_experience && (
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary" />
                      <span>{barberData.years_experience} years experience</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {recentBattles && recentBattles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Battles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentBattles.map((battle) => (
                      <Card 
                        key={battle.id} 
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => navigate(`/battles/${battle.id}`)}
                      >
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-white">{battle.title}</h4>
                          <Badge variant={battle.status === 'completed' ? 'secondary' : 'default'} className="mt-2">
                            {battle.status}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="video">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {barberData.is_live && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      LIVE
                    </span>
                  )}
                  <span>{displayName}</span>
                  {sponsorPill && (
                    <Badge variant="outline" className="ml-auto text-[10px] border-primary/30 text-primary/90">
                      Sponsored by {sponsorPill}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarberVideoSection
                  videoId={barberData.is_live ? barberData.live_video_id : barberData.featured_video_id}
                  isLive={barberData.is_live}
                  aspectRatio="landscape"
                  barberUserId={userId}
                  isOwner={isOwner}
                  barberProfileId={barberData?.barber_id}
                  onVideoUploaded={() => {
                    refetchPortfolio();
                    queryClient.invalidateQueries({ queryKey: ['barber-public-profile', userId] });
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="portfolio">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Portfolio</CardTitle>
                    {isOwner && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {imageCount} images • {videoCount} videos
                      </p>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={uploading}
                        onClick={() => imageInputRef.current?.click()}
                        className="flex-1 sm:flex-none"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Upload Image
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        disabled={uploading}
                        onClick={() => videoInputRef.current?.click()}
                        className="flex-1 sm:flex-none"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Upload Video
                      </Button>
                      <input
                        key={`img-${uploadKey}`}
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'image')}
                      />
                      <input
                        key={`vid-${uploadKey}`}
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'video')}
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {uploading && (
                  <div className="text-center py-8 bg-primary/5 rounded-lg border border-primary/20 mb-4">
                    <Upload className="w-10 h-10 mx-auto mb-3 text-primary animate-bounce" />
                    <p className="text-sm font-medium">Uploading your file...</p>
                    <p className="text-xs text-muted-foreground mt-1">Please wait</p>
                  </div>
                )}
                
                {portfolio && portfolio.length > 0 ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {portfolio.map((creation) => {
                        const isVid = isVideoItem(creation);
                        return (
                          <div 
                            key={creation.id}
                            className="aspect-square rounded-lg overflow-hidden border border-primary/20 hover:border-primary/50 transition-all hover:shadow-lg relative group"
                          >
                            {isVid ? (
                              <>
                                <SmartVideoPlayer
                                  streamUid={(creation as any).cloudflare_stream_uid ?? null}
                                  fallbackUrl={creation.media_url}
                                  poster={creation.thumbnail_url ?? null}
                                  autoPlayWhenVisible={false}
                                  muted
                                  controls
                                  loop={false}
                                  enableReplay
                                  overlayPayload={(creation as any).overlay_payload ?? null}
                                  className="w-full h-full"
                                />
                                <Badge className="absolute bottom-2 right-2 bg-black/80 text-white border-0 pointer-events-none z-10">
                                  <Video className="w-3 h-3 mr-1" />
                                  Video
                                </Badge>
                              </>
                            ) : (
                              <img 
                                src={creation.thumbnail_url || creation.media_url} 
                                alt={creation.title || 'Portfolio item'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            )}
                            {isOwner && (
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute top-2 left-2 z-20 h-9 w-9 opacity-100"
                                onClick={() => handleDeletePortfolioItem(creation.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {isOwner && (
                      <div className="flex gap-4 pt-4 border-t border-primary/10">
                        <button
                          onClick={() => imageInputRef.current?.click()}
                          disabled={uploading}
                          className="flex-1 border-2 border-dashed border-primary/30 rounded-lg p-6 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-primary/60" />
                          <p className="text-sm font-medium">Add More Images</p>
                        </button>
                        <button
                          onClick={() => videoInputRef.current?.click()}
                          disabled={uploading}
                          className="flex-1 border-2 border-dashed border-primary/30 rounded-lg p-6 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Video className="w-8 h-8 mx-auto mb-2 text-primary/60" />
                          <p className="text-sm font-medium">Add More Videos</p>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-16">
                    {isOwner ? (
                      <div className="max-w-md mx-auto space-y-6">
                        <div className="text-center">
                          <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="text-lg font-semibold mb-2">Build Your Portfolio</h3>
                          <p className="text-sm text-muted-foreground">
                            Showcase your best work with images and videos
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => imageInputRef.current?.click()}
                            disabled={uploading}
                            className="border-2 border-dashed border-primary/30 rounded-lg p-6 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <ImageIcon className="w-10 h-10 mx-auto mb-3 text-primary" />
                            <p className="font-medium mb-1">Upload Images</p>
                            <p className="text-xs text-muted-foreground">Upload photos</p>
                          </button>
                          
                          <button
                            onClick={() => videoInputRef.current?.click()}
                            disabled={uploading}
                            className="border-2 border-dashed border-primary/30 rounded-lg p-6 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Video className="w-10 h-10 mx-auto mb-3 text-primary" />
                            <p className="font-medium mb-1">Upload Video</p>
                            <p className="text-xs text-muted-foreground">Upload videos</p>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No portfolio items yet</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ===== OWNER SETTINGS PANEL ===== */}
        {isOwner && (
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full flex items-center justify-between border-primary/30">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <span>Edit Profile & Settings</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6 pt-4">
              {/* Avatar */}
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-lg">Avatar</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <AvatarUpload
                    currentAvatar={ownerProfile?.avatar_url || ''}
                    onAvatarChange={handleAvatarChange}
                    size="lg"
                  />
                </CardContent>
              </Card>

              {/* Locked Fields */}
              <Card className="border-border/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Identity (Locked)
                  </CardTitle>
                  <CardDescription>These fields are set during registration and cannot be changed.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Username</Label>
                    <p className="text-sm font-medium text-foreground">@{ownerProfile?.username || '—'}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Nationality</Label>
                    <p className="text-sm font-medium text-foreground">
                      {barberData.country_code ? (
                        <span>{getCountryFlag(barberData.country_code)} {barberData.country_code.toUpperCase()}</span>
                      ) : '—'}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm text-muted-foreground">{user?.email || '—'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <p className="text-sm text-muted-foreground">{barberProfile?.phone_number || '—'}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 pt-1">Contact support to update locked fields.</p>
                </CardContent>
              </Card>

              {/* Professional Settings */}
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Professional
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBarberSubmit} className="space-y-5">
                    {/* Social Media Links */}
                    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-primary" />
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

                    {/* Specialties */}
                    <div>
                      <Label className="mb-2 block">Specialties</Label>
                      <SpecialtyPillSelector
                        value={barberForm.specialty}
                        onChange={(value) => setBarberForm(prev => ({ ...prev, specialty: value }))}
                        compact
                      />
                    </div>

                    {/* Location */}
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
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleGetLocation}
                          disabled={gettingLocation}
                          title="Use my location"
                        >
                          {gettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4 text-primary" />}
                        </Button>
                      </div>
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
                      />
                    </div>

                    <Button type="submit" disabled={updateBarberMutation.isPending} className="w-full">
                      {updateBarberMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Save className="w-4 h-4 mr-2" />
                      Save Professional Info
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Business Settings */}
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Business
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="accepting_clients">Accepting New Clients</Label>
                        <p className="text-sm text-muted-foreground">Allow new clients to book</p>
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
                        <p className="text-sm text-muted-foreground">Participate in competitions</p>
                      </div>
                      <Switch
                        id="available_battles"
                        checked={barberForm.available_for_battles}
                        onCheckedChange={(checked) => setBarberForm(prev => ({ ...prev, available_for_battles: checked }))}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="require_deposit">Require Deposit</Label>
                        <p className="text-sm text-muted-foreground">Clients pay BB deposit to book</p>
                      </div>
                      <Switch
                        id="require_deposit"
                        checked={barberForm.require_deposit}
                        onCheckedChange={(checked) => setBarberForm(prev => ({ ...prev, require_deposit: checked }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="no_show_fee">No-Show Fee (BB)</Label>
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
                      <Textarea
                        id="booking_message"
                        value={barberForm.booking_message}
                        onChange={(e) => setBarberForm(prev => ({ ...prev, booking_message: e.target.value }))}
                        placeholder="e.g., Please arrive 5 minutes early."
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="slot_duration">Time Slot Duration</Label>
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

                  <Separator />

                  <ServicesManager barberId={barberProfile?.id} />

                  <Separator />

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

              {/* Privacy */}
              <Card className="border-border/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    Privacy & Security
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Shield className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">Advanced privacy settings coming soon</p>
                    <div className="space-y-1 text-xs text-muted-foreground/60 mt-3">
                      <p>• Two-factor authentication</p>
                      <p>• Profile visibility controls</p>
                      <p>• Data export and deletion</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      <Footer />

      <DonationModal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        creatorId={userId || ''}
        creatorName={displayName || 'Barber'}
      />

      <BookingConsole
        open={isBookingOpen}
        onOpenChange={setIsBookingOpen}
        barberId={barberData.barber_id}
        barberUserId={userId!}
        barberName={displayName || 'Barber'}
        barberAvatar={barberData.avatar_url || undefined}
        barberTier={subscriptionData?.active_subscription_tier}
      />
    </div>
  );
}
