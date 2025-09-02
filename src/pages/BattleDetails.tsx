import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Calendar, MapPin, Vote, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { BackButton } from '@/components/ui/back-button';

const BattleDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();

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

  // Fetch battle details
  const { data: battle, isLoading, error } = useQuery({
    queryKey: ['battle', id],
    queryFn: async () => {
      if (!id) throw new Error('Battle ID is required');
      
      const { data, error } = await supabase
        .from('battles')
        .select(`
          *,
          battle_participants(
            id,
            user_id,
            status,
            joined_at,
            profiles(display_name, avatar_url)
          ),
          battle_submissions(
            id,
            title,
            description,
            media_url,
            thumbnail_url,
            created_at,
            user_id,
            profiles(display_name, avatar_url)
          ),
          profiles!battles_organizer_id_fkey(display_name, avatar_url)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const isBarber = profile?.user_type === 'barber';
  const isFan = profile?.user_type === 'fan' || !profile?.user_type;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BackButton />
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading battle details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BackButton />
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Error loading battle</h2>
            <p className="text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BackButton />
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Battle not found</h2>
            <p className="text-muted-foreground">The battle you're looking for doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton />
      
      {/* Battle Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Badge variant={
            battle.status === 'upcoming' ? 'secondary' :
            battle.status === 'active' ? 'default' :
            battle.status === 'voting' ? 'destructive' :
            'outline'
          }>
            {battle.status.toUpperCase()}
          </Badge>
          {battle.category && (
            <Badge variant="outline">{battle.category}</Badge>
          )}
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">{battle.title}</h1>
        
        {battle.description && (
          <p className="text-muted-foreground text-lg mb-4">{battle.description}</p>
        )}

        {/* Battle Actions - Role-based */}
        <div className="flex gap-4">
          {battle.status === 'voting' && (
            <Button size="lg">
              <Vote className="w-4 h-4 mr-2" />
              {isFan ? 'Vote Now' : 'View Voting'}
            </Button>
          )}
          
          {battle.status === 'active' && isBarber && (
            <Button size="lg">
              <Users className="w-4 h-4 mr-2" />
              Join Battle
            </Button>
          )}

          {isFan && (
            <Button variant="outline" size="lg">
              <Heart className="w-4 h-4 mr-2" />
              Support Barbers
            </Button>
          )}
        </div>
      </div>

      {/* Battle Cover Image */}
      {battle.cover_image_url && (
        <div className="mb-8">
          <img
            src={battle.cover_image_url}
            alt={battle.title}
            className="w-full h-64 object-cover rounded-lg"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Battle Info */}
          <Card>
            <CardHeader>
              <CardTitle>Battle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {battle.battle_participants?.length || 0} participants
                    {battle.max_participants && ` / ${battle.max_participants} max`}
                  </span>
                </div>

                {battle.starts_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      Starts {format(new Date(battle.starts_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}

                {battle.ends_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      Ends {format(new Date(battle.ends_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}

                {battle.prize_amount > 0 && (
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      Prize: {battle.currency} {battle.prize_amount}
                    </span>
                  </div>
                )}
              </div>

              {battle.rules && (
                <div>
                  <h4 className="font-semibold mb-2">Rules</h4>
                  <p className="text-sm text-muted-foreground">{battle.rules}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Battle Submissions */}
          {battle.battle_submissions && battle.battle_submissions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Submissions</CardTitle>
                <CardDescription>
                  {battle.battle_submissions.length} submission(s) in this battle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {battle.battle_submissions.map((submission) => (
                    <Card key={submission.id} className="overflow-hidden">
                      {submission.thumbnail_url && (
                        <div className="aspect-video">
                          <img
                            src={submission.thumbnail_url}
                            alt={submission.title || 'Submission'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="p-4">
                        {submission.title && (
                          <h4 className="font-semibold mb-2">{submission.title}</h4>
                        )}
                        {submission.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {submission.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>by {submission.profiles?.display_name || 'Anonymous'}</span>
                          <span>•</span>
                          <span>{format(new Date(submission.created_at), 'MMM d')}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Organizer */}
          <Card>
            <CardHeader>
              <CardTitle>Organizer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {battle.profiles?.avatar_url ? (
                  <img
                    src={battle.profiles.avatar_url}
                    alt={battle.profiles.display_name || 'Organizer'}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-medium">
                    {battle.profiles?.display_name || 'Anonymous'}
                  </p>
                  <p className="text-sm text-muted-foreground">Battle Organizer</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participants */}
          {battle.battle_participants && battle.battle_participants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
                <CardDescription>
                  {battle.battle_participants.length} barber(s) joined
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {battle.battle_participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3">
                    {participant.profiles?.avatar_url ? (
                      <img
                        src={participant.profiles.avatar_url}
                        alt={participant.profiles.display_name || 'Participant'}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {participant.profiles?.display_name || 'Anonymous'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {format(new Date(participant.joined_at), 'MMM d')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {participant.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Battle Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Battle Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">
                  {format(new Date(battle.created_at), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="outline" className="text-xs">
                  {battle.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Participants</span>
                <span className="text-sm">
                  {battle.battle_participants?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Submissions</span>
                <span className="text-sm">
                  {battle.battle_submissions?.length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BattleDetails;
