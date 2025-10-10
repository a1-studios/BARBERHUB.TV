import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Swords, DollarSign, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const BarberActionZone = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: leagueStatus } = useQuery({
    queryKey: ['leagueStatus', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data } = await supabase
        .from('tournament_standings')
        .select('rank, points, wins, draws, losses, qualified')
        .eq('barber_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return data;
    },
    enabled: !!user
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-8">
      <Card className="border-2 border-primary/30 hover:border-primary/50 transition-colors">
        <CardHeader>
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
            <Swords className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Create a Battle</CardTitle>
          <CardDescription>
            Challenge other barbers and showcase your skills to the world
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => navigate('/battles/create')}
          >
            Create Battle
          </Button>
        </CardContent>
      </Card>

      <Card className="border-2 border-blue-500/30 hover:border-blue-500/50 transition-colors">
        <CardHeader>
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
            <DollarSign className="w-6 h-6 text-blue-500" />
          </div>
          <CardTitle>Your Career. Funded.</CardTitle>
          <CardDescription>
            Check if you qualify for over $10K in grants. Access opportunities from WIOA, Scholarships, and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/grants')}
          >
            Explore Grants
          </Button>
        </CardContent>
      </Card>

      <Card className="border-2 border-purple-500/30 hover:border-purple-500/50 transition-colors">
        <CardHeader>
          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
            <Trophy className="w-6 h-6 text-purple-500" />
          </div>
          <CardTitle>My League Status</CardTitle>
          {leagueStatus ? (
            <CardDescription>
              Rank: #{leagueStatus.rank} | Points: {leagueStatus.points} | 
              Record: {leagueStatus.wins}-{leagueStatus.draws}-{leagueStatus.losses}
            </CardDescription>
          ) : (
            <CardDescription>
              You're not enrolled in the Global League yet. Join to compete for prizes!
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/portal')}
          >
            {leagueStatus ? 'View Details' : 'Join the League'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
