import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MapPin, Award, Upload, Image as ImageIcon, Video } from 'lucide-react';
import { BarberVideoSection } from '@/components/barber/BarberVideoSection';
import { BarberActionButtons } from '@/components/barber/BarberActionButtons';
import { useState } from 'react';
import { DonationModal } from '@/components/DonationModal';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function BarberPublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const isOwner = user?.id === userId;

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

  // Map stats directly from the view data
  const stats = barberData ? {
    follower_count: barberData.follower_count,
    like_count: barberData.like_count,
    subscription_count: barberData.subscription_count,
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
  const imageCount = portfolio?.filter(p => p.media_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i))?.length || 0;
  const videoCount = portfolio?.filter(p => p.media_url?.match(/\.(mp4|mov|avi|webm)$/i))?.length || 0;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (type === 'image' && !file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (type === 'video' && !file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Check limits
    if (type === 'image' && imageCount >= 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    if (type === 'video' && videoCount >= 1) {
      toast.error('Maximum 1 video allowed');
      return;
    }

    // Validate file size
    const maxSize = type === 'video' ? 100 * 1024 * 1024 : 5 * 1024 * 1024; // 100MB for video, 5MB for image
    if (file.size > maxSize) {
      toast.error(`File must be under ${type === 'video' ? '100MB' : '5MB'}`);
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const bucket = type === 'image' ? 'portfolios' : 'videos';
      const filePath = `${bucket}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Create portfolio entry
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
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const getCountryFlag = (countryCode: string | null) => {
    if (!countryCode) return null;
    return String.fromCodePoint(
      ...countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0))
    );
  };

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
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="w-32 h-32 border-4 border-primary/30">
                <AvatarImage src={barberData.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-4xl font-bold">
                  {(displayName || 'B').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

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
                    <p className="text-lg text-muted-foreground mt-2">{barberData.specialty}</p>
                  )}
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
                    <div className="text-3xl font-bold text-white">{stats?.subscription_count || 0}</div>
                    <div className="text-sm text-muted-foreground">Subscribers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">${((stats?.total_donations_cents || 0) / 100).toFixed(0)}</div>
                    <div className="text-sm text-muted-foreground">Donated</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <BarberActionButtons
                  barberId={barberData.barber_id}
                  barberUserId={userId!}
                  onDonateClick={() => setIsDonationModalOpen(true)}
                />
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
            {/* About Section */}
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

            {/* Recent Battles */}
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
                <CardTitle>
                  {barberData.is_live ? '🔴 Live Stream' : 'Featured Video'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarberVideoSection
                  videoId={barberData.is_live ? barberData.live_video_id : barberData.featured_video_id}
                  isLive={barberData.is_live}
                  aspectRatio="landscape"
                  barberUserId={userId}
                  isOwner={true}
                  onVideoUploaded={() => window.location.reload()}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Portfolio</CardTitle>
                  {isOwner && (
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">
                        {imageCount}/5 images • {videoCount}/1 video
                      </div>
                      <div className="flex gap-2">
                        {imageCount < 5 && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={uploading}
                            onClick={() => document.getElementById('portfolio-image-upload')?.click()}
                          >
                            <ImageIcon className="w-4 h-4 mr-1" />
                            Add Image
                          </Button>
                        )}
                        {videoCount < 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={uploading}
                            onClick={() => document.getElementById('portfolio-video-upload')?.click()}
                          >
                            <Video className="w-4 h-4 mr-1" />
                            Add Video
                          </Button>
                        )}
                      </div>
                      <input
                        id="portfolio-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'image')}
                      />
                      <input
                        id="portfolio-video-upload"
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
                  <div className="text-center py-4 text-muted-foreground">
                    <Upload className="w-8 h-8 mx-auto mb-2 animate-bounce" />
                    <p className="text-sm">Uploading...</p>
                  </div>
                )}
                {portfolio && portfolio.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {portfolio.map((creation) => {
                      const isVideo = creation.media_url?.match(/\.(mp4|mov|avi|webm)$/i);
                      return (
                        <div 
                          key={creation.id}
                          className="aspect-square rounded-lg overflow-hidden border border-primary/20 hover:border-primary/50 transition-colors cursor-pointer relative group"
                        >
                          {isVideo ? (
                            <video 
                              src={creation.media_url} 
                              className="w-full h-full object-cover"
                              controls
                            />
                          ) : (
                            <img 
                              src={creation.thumbnail_url || creation.media_url} 
                              alt={creation.title || 'Portfolio item'}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {isVideo && (
                            <Badge className="absolute top-2 right-2 bg-black/70">
                              <Video className="w-3 h-3" />
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-2">
                      {isOwner ? 'Upload your best work' : 'No portfolio items yet'}
                    </p>
                    {isOwner && (
                      <p className="text-xs text-muted-foreground">Max 5 images + 1 video</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />

      <DonationModal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        creatorId={userId || ''}
        creatorName={displayName || 'Barber'}
      />
    </div>
  );
}
