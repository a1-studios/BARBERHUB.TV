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
import { ArrowLeft, MapPin, Award, Calendar, Instagram, Facebook, Twitter, Youtube } from 'lucide-react';
import { BarberVideoSection } from '@/components/barber/BarberVideoSection';
import { BarberActionButtons } from '@/components/barber/BarberActionButtons';
import { useState } from 'react';
import { DonationModal } from '@/components/DonationModal';

export default function BarberPublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);

  // Fetch barber profile
  const { data: barberData, isLoading } = useQuery({
    queryKey: ['barber-public-profile', userId],
    queryFn: async () => {
      // First get barber profile
      const { data: barberProfile, error: barberError } = await supabase
        .from('barber_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (barberError) throw barberError;
      if (!barberProfile) return null;

      // Then get user profile data
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, bio, country_code')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (profileError) throw profileError;

      return {
        ...barberProfile,
        profiles: userProfile
      };
    },
    enabled: !!userId
  });

  // Fetch barber stats
  const { data: stats } = useQuery({
    queryKey: ['barber-public-stats', barberData?.id],
    queryFn: async () => {
      if (!barberData?.id) return null;
      
      const { data, error } = await supabase
        .from('barber_stats')
        .select('*')
        .eq('barber_id', barberData.id)
        .maybeSingle();
      
      if (error) throw error;
      return data || {
        follower_count: 0,
        like_count: 0,
        subscription_count: 0,
        total_donations_cents: 0
      };
    },
    enabled: !!barberData?.id
  });

  // Fetch recent battles using barber_profile id
  const { data: recentBattles } = useQuery({
    queryKey: ['barber-battles', barberData?.id],
    queryFn: async () => {
      if (!barberData?.id) return [];
      
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .or(`barber1_id.eq.${barberData.id},barber2_id.eq.${barberData.id}`)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data;
    },
    enabled: !!barberData?.id
  });

  // Fetch portfolio
  const { data: portfolio } = useQuery({
    queryKey: ['barber-portfolio', barberData?.id],
    queryFn: async () => {
      if (!barberData?.id) return [];
      
      const { data, error } = await supabase
        .from('creations')
        .select('*')
        .eq('barber_id', barberData.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!barberData?.id
  });

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

  const profile = barberData.profiles as any;
  const displayName = profile?.display_name || barberData.name;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Hero Section */}
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="w-32 h-32 border-4 border-primary/30">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-4xl font-bold">
                  {(displayName || 'B').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-4xl font-bold text-white">{displayName}</h1>
                    {profile?.country_code && (
                      <span className="text-3xl">{getCountryFlag(profile.country_code)}</span>
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
                  barberId={barberData.id}
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
                {profile?.bio && (
                  <p className="text-muted-foreground">{profile.bio}</p>
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

                {/* Social Links */}
                {(profile?.instagram_handle || profile?.facebook_handle || profile?.twitter_handle || profile?.youtube_handle) && (
                  <div className="flex gap-4 pt-4 border-t">
                    {profile?.instagram_handle && (
                      <a href={`https://instagram.com/${profile.instagram_handle}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <Instagram className="w-5 h-5" />
                        </Button>
                      </a>
                    )}
                    {profile?.facebook_handle && (
                      <a href={`https://facebook.com/${profile.facebook_handle}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <Facebook className="w-5 h-5" />
                        </Button>
                      </a>
                    )}
                    {profile?.twitter_handle && (
                      <a href={`https://twitter.com/${profile.twitter_handle}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <Twitter className="w-5 h-5" />
                        </Button>
                      </a>
                    )}
                    {profile?.youtube_handle && (
                      <a href={`https://youtube.com/${profile.youtube_handle}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <Youtube className="w-5 h-5" />
                        </Button>
                      </a>
                    )}
                  </div>
                )}
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
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                {portfolio && portfolio.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {portfolio.map((creation) => (
                      <div 
                        key={creation.id}
                        className="aspect-square rounded-lg overflow-hidden border border-primary/20 hover:border-primary/50 transition-colors cursor-pointer"
                      >
                        <img 
                          src={creation.thumbnail_url || creation.media_url} 
                          alt={creation.title || 'Portfolio item'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No portfolio items yet</p>
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
