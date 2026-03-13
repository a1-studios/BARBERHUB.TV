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
import { ArrowLeft, MapPin, Award, Upload, Image as ImageIcon, Video, Trash2, Calendar, Instagram, Twitter, Youtube, Facebook } from 'lucide-react';
import { BarberVideoSection } from '@/components/barber/BarberVideoSection';
import { BarberActionButtons } from '@/components/barber/BarberActionButtons';
import { AvatarCrest } from '@/components/AvatarCrest';
import { useState } from 'react';
import { DonationModal } from '@/components/DonationModal';
import { BookingConsole } from '@/components/booking/BookingConsole';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

export default function BarberPublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
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
  const imageCount = portfolio?.filter(p => p.media_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i))?.length || 0;
  const videoCount = portfolio?.filter(p => p.media_url?.match(/\.(mp4|mov|avi|webm)$/i))?.length || 0;

  const handleDeletePortfolioItem = async (creationId: string, mediaUrl: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      // Extract file path from URL
      const urlParts = mediaUrl.split('/');
      const bucket = urlParts[urlParts.length - 2]; // 'portfolios' or 'videos'
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${bucket}/${fileName}`;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('creations')
        .delete()
        .eq('id', creationId);

      if (dbError) throw dbError;

      toast.success('Item deleted successfully');
      refetchPortfolio();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete item');
    }
  };

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
              <AvatarCrest
                tier={subscriptionData?.active_subscription_tier}
                size="lg"
                interactive={!isOwner}
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

                  {/* Social Media Icons - Max 3 */}
                  {(() => {
                    const socials = [
                      { key: 'instagram', url: (barberData as any).instagram_handle, icon: Instagram, hoverClass: 'hover:text-pink-500' },
                      { key: 'twitter', url: (barberData as any).twitter_handle, icon: Twitter, hoverClass: 'hover:text-blue-400' },
                      { key: 'youtube', url: (barberData as any).youtube_handle, icon: Youtube, hoverClass: 'hover:text-red-500' },
                      { key: 'facebook', url: (barberData as any).facebook_handle, icon: Facebook, hoverClass: 'hover:text-blue-500' },
                    ].filter(s => s.url).slice(0, 3);

                    if (socials.length === 0) return null;

                    return (
                      <div className="flex items-center gap-2 mt-2">
                        {socials.map(({ key, url, icon: Icon, hoverClass }) => (
                          <a
                            key={key}
                            href={url!.startsWith('http') ? url! : `https://${url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-muted-foreground ${hoverClass} transition-colors`}
                          >
                            <Icon className="h-5 w-5" />
                          </a>
                        ))}
                      </div>
                    );
                  })()}
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

                {/* Action Buttons - Only show for visitors, not the profile owner */}
                {!isOwner && (
                  <div className="flex gap-3 flex-wrap">
                    <BarberActionButtons
                      barberId={barberData.barber_id}
                      barberUserId={userId!}
                      onDonateClick={() => setIsDonationModalOpen(true)}
                    />
                    
                    {/* Book Appointment */}
                    <Button 
                      variant="default" 
                      size="default"
                      className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
                      onClick={() => setIsBookingOpen(true)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Appointment
                    </Button>
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Portfolio</CardTitle>
                    {isOwner && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {imageCount}/5 images • {videoCount}/1 video
                      </p>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={imageCount < 5 ? "default" : "outline"}
                        disabled={uploading || imageCount >= 5}
                        onClick={() => document.getElementById('portfolio-image-upload')?.click()}
                        className="flex-1 sm:flex-none"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Upload Image
                        {imageCount >= 5 && <span className="ml-1 text-xs">(Max)</span>}
                      </Button>
                      <Button
                        size="sm"
                        variant={videoCount < 1 ? "default" : "outline"}
                        disabled={uploading || videoCount >= 1}
                        onClick={() => document.getElementById('portfolio-video-upload')?.click()}
                        className="flex-1 sm:flex-none"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Upload Video
                        {videoCount >= 1 && <span className="ml-1 text-xs">(Max)</span>}
                      </Button>
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
                        const isVideo = creation.media_url?.match(/\.(mp4|mov|avi|webm)$/i);
                        return (
                          <div 
                            key={creation.id}
                            className="aspect-square rounded-lg overflow-hidden border border-primary/20 hover:border-primary/50 transition-all hover:shadow-lg relative group"
                          >
                            {isVideo ? (
                              <>
                                <video 
                                  src={creation.media_url} 
                                  className="w-full h-full object-cover"
                                  controls
                                />
                                <Badge className="absolute top-2 right-2 bg-black/80 text-white border-0">
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
                                className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                onClick={() => handleDeletePortfolioItem(creation.id, creation.media_url)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Show upload prompts if under limit */}
                    {isOwner && (imageCount < 5 || videoCount < 1) && (
                      <div className="flex gap-4 pt-4 border-t border-primary/10">
                        {imageCount < 5 && (
                          <button
                            onClick={() => document.getElementById('portfolio-image-upload')?.click()}
                            disabled={uploading}
                            className="flex-1 border-2 border-dashed border-primary/30 rounded-lg p-6 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-primary/60" />
                            <p className="text-sm font-medium">Add More Images</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {5 - imageCount} slot{5 - imageCount !== 1 ? 's' : ''} left • Max 5MB
                            </p>
                          </button>
                        )}
                        {videoCount < 1 && (
                          <button
                            onClick={() => document.getElementById('portfolio-video-upload')?.click()}
                            disabled={uploading}
                            className="flex-1 border-2 border-dashed border-primary/30 rounded-lg p-6 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Video className="w-8 h-8 mx-auto mb-2 text-primary/60" />
                            <p className="text-sm font-medium">Add Video</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              1 video slot • Max 100MB
                            </p>
                          </button>
                        )}
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
                            Showcase your best work with up to 5 images and 1 video
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => document.getElementById('portfolio-image-upload')?.click()}
                            disabled={uploading}
                            className="border-2 border-dashed border-primary/30 rounded-lg p-6 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <ImageIcon className="w-10 h-10 mx-auto mb-3 text-primary" />
                            <p className="font-medium mb-1">Upload Images</p>
                            <p className="text-xs text-muted-foreground">Max 5 photos, 5MB each</p>
                          </button>
                          
                          <button
                            onClick={() => document.getElementById('portfolio-video-upload')?.click()}
                            disabled={uploading}
                            className="border-2 border-dashed border-primary/30 rounded-lg p-6 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Video className="w-10 h-10 mx-auto mb-3 text-primary" />
                            <p className="font-medium mb-1">Upload Video</p>
                            <p className="text-xs text-muted-foreground">Max 1 video, 100MB</p>
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
