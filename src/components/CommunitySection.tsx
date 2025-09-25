import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Heart, MessageCircle, Star, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
const CommunitySection = () => {
  const { data: barberProfiles, isLoading } = useQuery({
    queryKey: ['public-barber-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_creator_profiles');
      if (error) throw error;
      return data;
    }
  });

  const { data: barberDetails } = useQuery({
    queryKey: ['barber-profiles-details'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('user_id, name, specialty, location, country_code');
      if (error) throw error;
      return data;
    },
    enabled: !!barberProfiles?.length
  });

  // Combine profile data with barber details and sort by follower count
  const topBarbers = barberProfiles
    ?.map((profile) => {
      const barberDetail = barberDetails?.find(b => b.user_id === profile.user_id);
      return {
        id: profile.user_id,
        name: profile.display_name || barberDetail?.name || 'Unknown Barber',
        shop: barberDetail?.name || 'Barber Shop',
        location: barberDetail?.location || `${barberDetail?.country_code || 'Unknown'}`,
        votes: profile.like_count || 0,
        subscribers: profile.follower_count || 0,
        specialties: barberDetail?.specialty ? [barberDetail.specialty] : ['General'],
        avatar: profile.avatar_url || '',
        barberBucks: profile.subscription_count * 10 || 0
      };
    })
    .sort((a, b) => b.subscribers - a.subscribers)
    .slice(0, 10) // Top 10 barbers
    .map((barber, index) => ({ ...barber, rank: index + 1 })) || []; // Assign ranks after sorting

  if (isLoading) {
    return (
      <section id="community" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-gradient">Community</span> Leaderboard
            </h2>
            <p className="text-xl text-muted-foreground">Loading barber profiles...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!topBarbers.length) {
    return (
      <section id="community" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-gradient">Community</span> Leaderboard
            </h2>
            <p className="text-xl text-muted-foreground">
              No barber profiles found. Be the first to join our community!
            </p>
          </div>
        </div>
      </section>
    );
  }

  return <section id="community" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-gradient">Community</span> Leaderboard
          </h2>
          <p className="text-xl text-muted-foreground">
            Discover the top-rated barbers in the community. Vote for your favorites 
            and see who's leading the competition this month.
          </p>
        </div>

        {/* Leaderboard */}
        <div className="max-w-4xl mx-auto space-y-6">
          {topBarbers.map((barber, index) => <Card key={barber.id} className="card-gradient relative overflow-hidden">
              {/* Rank Badge */}
              <div className="absolute top-6 left-6">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${barber.rank === 1 ? 'bg-yellow-500 text-black' : barber.rank === 2 ? 'bg-gray-400 text-black' : barber.rank === 3 ? 'bg-amber-600 text-white' : 'bg-muted text-foreground'}`}>
                  {barber.rank === 1 && <Crown className="w-6 h-6" />}
                  {barber.rank !== 1 && barber.rank}
                </div>
              </div>

              <CardContent className="p-6 pl-24">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                  {/* Barber Info */}
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-16 h-16 ring-2 ring-primary/20">
                      <AvatarImage src={barber.avatar} alt={barber.name} />
                      <AvatarFallback>{barber.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h3 className="text-xl font-bold mb-1">{barber.name}</h3>
                      <p className="text-muted-foreground mb-2">{barber.shop}</p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <span>{barber.location}</span>
                      </p>
                      
                      {/* Specialties */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {barber.specialties.map((specialty, idx) => <Badge key={idx} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>)}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{barber.votes}</div>
                      <div className="text-xs text-muted-foreground">Votes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {barber.subscribers >= 1000 ? `${(barber.subscribers / 1000).toFixed(1)}K` : barber.subscribers}
                      </div>
                      <div className="text-xs text-muted-foreground">Followers</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">{barber.barberBucks}</div>
                      <div className="text-xs text-muted-foreground">Barber Bucks</div>
                    </div>
                    <div>
                      <Button size="sm" className="btn-primary">
                        <Heart className="w-4 h-4 mr-1" />
                        Vote
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>)}
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
          <Card className="card-gradient text-center p-6">
            <TrendingUp className="w-8 h-8 text-primary mx-auto mb-4" />
            <div className="text-3xl font-bold text-primary mb-2">847</div>
            <div className="text-sm text-muted-foreground">New Members This Week</div>
          </Card>
          
          <Card className="card-gradient text-center p-6">
            <MessageCircle className="w-8 h-8 text-primary mx-auto mb-4" />
            <div className="text-3xl font-bold text-primary mb-2">2.1K</div>
            <div className="text-sm text-muted-foreground">Community Posts</div>
          </Card>
          
          <Card className="card-gradient text-center p-6">
            <Star className="w-8 h-8 text-primary mx-auto mb-4" />
            <div className="text-3xl font-bold text-primary mb-2">4.8</div>
            <div className="text-sm text-muted-foreground">Average Rating</div>
          </Card>
          
          <Card className="card-gradient text-center p-6">
            <Crown className="w-8 h-8 text-primary mx-auto mb-4" />
            <div className="text-3xl font-bold text-primary mb-2">127</div>
            <div className="text-sm text-muted-foreground">Competition Winners</div>
          </Card>
        </div>

        {/* Join Community CTA */}
        <div className="text-center mt-16">
          
        </div>
      </div>
    </section>;
};
export default CommunitySection;