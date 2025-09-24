
import { BackButton } from '@/components/ui/BackButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trophy, Users, Calendar, User, Star } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { FeaturedCreatorCard } from '@/components/FeaturedCreatorCard';
import { toast } from 'sonner';

const BattlesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: profile } = useQuery({
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

  // Fetch creators for fan experience
  const { data: creators } = useQuery({
    queryKey: ['creators'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_creator_profiles');
      if (error) throw error;
      return data;
    }
  });

  // Set favorite creator mutation
  const setFavoriteMutation = useMutation({
    mutationFn: async (creatorId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({ favorite_creator_id: creatorId })
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Favorite creator updated!');
    },
    onError: (error) => {
      toast.error(`Failed to update favorite: ${error.message}`);
    }
  });

  // Fetch battles with real-time updates
  const { data: battles, isLoading, refetch } = useQuery({
    queryKey: ['battles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battles')
        .select(`
          *,
          battle_participants(count),
          profiles!battles_organizer_id_fkey(display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Real-time updates for battles
  useEffect(() => {
    const channel = supabase
      .channel('battles-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battles'
      }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const isBarber = profile?.user_type === 'barber';
  const isFan = profile?.user_type === 'fan' || !profile?.user_type;

  // Get featured creator for fans
  const getFeaturedCreator = () => {
    if (!creators || creators.length === 0) return null;
    
    // Use user's favorite if set
    if (profile?.favorite_creator_id) {
      const favoriteCreator = creators.find(c => c.user_id === profile.favorite_creator_id);
      if (favoriteCreator) return { creator: favoriteCreator, isFavorite: true };
    }
    
    // Otherwise, show the creator with most followers
    const topCreator = creators.reduce((prev, current) => 
      (current.follower_count > prev.follower_count) ? current : prev
    );
    
    return { creator: topCreator, isFavorite: false };
  };

  const featuredCreator = getFeaturedCreator();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading battles...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton />
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isFan ? 'Vote in Epic Battles' : 'Barber Battles'}
          </h1>
          <p className="text-muted-foreground">
            {isFan 
              ? 'Support your favorite barbers and watch amazing skills unfold'
              : 'Showcase your skills and compete with the best barbers worldwide'
            }
          </p>
        </div>
        
        {/* Barber-only Create Button */}
        {isBarber && (
          <Button asChild size="lg">
            <Link to="/battles/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Battle
            </Link>
          </Button>
        )}
      </div>

      {/* Fan Experience - Featured Creator */}
      {isFan && user && featuredCreator && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Featured Creator</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Show profile link
                toast.success('Navigate to your profile to manage your favorite creator');
              }}
              className="text-primary hover:text-primary/80"
            >
              <User className="w-4 h-4 mr-2" />
              View Profile
            </Button>
          </div>
          <FeaturedCreatorCard
            creator={featuredCreator.creator}
            isFavorite={featuredCreator.isFavorite}
            onSetFavorite={(creatorId) => setFavoriteMutation.mutate(creatorId)}
          />
        </div>
      )}

      {/* Barber Info Card */}
      {isBarber && user && (
        <Card className="mb-8 bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Barber Dashboard</h3>
                <p className="text-muted-foreground">
                  Create battles, join competitions, and showcase your skills to the world.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Battles Grid */}
      {battles && battles.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {isFan ? 'Featured Battles' : 'All Battles'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {battles.map((battle) => (
              <Card key={battle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video relative">
                  {battle.cover_image_url ? (
                    <img
                      src={battle.cover_image_url}
                      alt={battle.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Trophy className="w-12 h-12 text-primary/50" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <Badge variant={
                      battle.status === 'upcoming' ? 'secondary' :
                      battle.status === 'active' ? 'default' :
                      battle.status === 'voting' ? 'destructive' :
                      'outline'
                    }>
                      {battle.status.toUpperCase()}
                    </Badge>
                  </div>
                  {battle.category && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="outline">{battle.category}</Badge>
                    </div>
                  )}
                </div>

                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-white line-clamp-1">
                    {battle.title}
                  </CardTitle>
                  {battle.description && (
                    <CardDescription className="line-clamp-2">
                      {battle.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Battle Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{battle.battle_participants?.[0]?.count || 0} participants</span>
                      {battle.max_participants && (
                        <span>/ {battle.max_participants} max</span>
                      )}
                    </div>

                    {battle.starts_at && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Starts {format(new Date(battle.starts_at), 'MMM d, yyyy')}</span>
                      </div>
                    )}

                    {battle.prize_amount > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Trophy className="w-4 h-4" />
                        <span>Prize: {battle.currency} {battle.prize_amount}</span>
                      </div>
                    )}
                  </div>

                  {/* Organizer */}
                  {battle.profiles && battle.profiles.length > 0 && (
                    <div className="flex items-center gap-2">
                      {battle.profiles[0]?.avatar_url ? (
                        <img
                          src={battle.profiles[0].avatar_url}
                          alt={battle.profiles[0]?.display_name || 'Organizer'}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-3 h-3 text-primary" />
                        </div>
                      )}
                      <span className="text-sm text-muted-foreground">
                        by {battle.profiles[0]?.display_name || 'Anonymous'}
                      </span>
                    </div>
                  )}

                  {/* Action Button - Fan only sees Watch, Vote, Donate */}
                  <Button asChild className="w-full">
                    <Link to={`/battles/${battle.id}`}>
                      {battle.status === 'voting' ? (
                        <>
                          <Trophy className="w-4 h-4 mr-2" />
                          {isFan ? 'Vote Now' : 'View Results'}
                        </>
                      ) : battle.status === 'active' ? (
                        <>
                          {isFan ? (
                            <>
                              <Users className="w-4 h-4 mr-2" />
                              Watch Battle
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4 mr-2" />
                              Join Battle
                            </>
                          )}
                        </>
                      ) : (
                        'View Details'
                      )}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold text-white mb-2">No battles yet</h3>
          <p className="text-muted-foreground mb-6">
            {isBarber 
              ? "Be the first to create an epic barber battle!"
              : "Battles will appear here once barbers start competing."
            }
          </p>
          {isBarber && (
            <Button asChild size="lg">
              <Link to="/battles/create">
                <Plus className="w-4 h-4 mr-2" />
                Create First Battle
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default BattlesPage;
