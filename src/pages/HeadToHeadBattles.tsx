import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HeadToHeadBattle } from '@/components/battles/HeadToHeadBattle';
import { BackButton } from '@/components/ui/BackButton';
import Header from '@/components/Header';
import { Loader2, Trophy, Clock, Users } from 'lucide-react';
import { TOURNAMENT_CATEGORIES } from '@/config/categories';

export default function HeadToHeadBattles() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Fetch head-to-head battles
  const { data: battles, isLoading, refetch } = useQuery({
    queryKey: ['head-to-head-battles', statusFilter, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('battles')
        .select(`
          *,
          barber1:barber_profiles!battles_barber1_id_fkey(
            id,
            name,
            user_id
          ),
          barber2:barber_profiles!battles_barber2_id_fkey(
            id,
            name,
            user_id
          )
        `)
        .not('barber1_id', 'is', null)
        .not('barber2_id', 'is', null)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Get battle statistics
  const { data: stats } = useQuery({
    queryKey: ['battle-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battles')
        .select('status')
        .not('barber1_id', 'is', null)
        .not('barber2_id', 'is', null);

      if (error) throw error;

      const counts = data.reduce((acc, battle) => {
        acc[battle.status] = (acc[battle.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total: data.length,
        active: counts.voting || 0,
        upcoming: counts.upcoming || 0,
        completed: counts.completed || 0
      };
    },
    enabled: !!user
  });

  const handleVote = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-20 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const activeBattles = battles?.filter(b => b.status === 'voting') || [];
  const upcomingBattles = battles?.filter(b => b.status === 'upcoming') || [];
  const completedBattles = battles?.filter(b => b.status === 'completed') || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <Header />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <BackButton className="mb-6" />
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Head-to-Head Battles</h1>
            <p className="text-lg text-muted-foreground">
              Watch barbers compete in direct matchups
            </p>
          </div>

          {/* Battle Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total Battles</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                  <div className="text-sm text-muted-foreground">Active</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
                  <div className="text-sm text-muted-foreground">Upcoming</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-600">{stats.completed}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="voting">Active Voting</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {TOURNAMENT_CATEGORIES.map((category) => (
                  <SelectItem key={category.id} value={category.shortName}>
                    {category.icon} {category.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Battle Tabs */}
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Active ({activeBattles.length})
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Upcoming ({upcomingBattles.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Completed ({completedBattles.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-6">
              <div className="space-y-6">
                {activeBattles.length > 0 ? (
                  activeBattles.map((battle) => (
                    <HeadToHeadBattle
                      key={battle.id}
                      battle={battle}
                      onVote={handleVote}
                    />
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Active Battles</h3>
                      <p className="text-muted-foreground">
                        There are no battles currently accepting votes. Check back soon!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="upcoming" className="mt-6">
              <div className="space-y-6">
                {upcomingBattles.length > 0 ? (
                  upcomingBattles.map((battle) => (
                    <HeadToHeadBattle
                      key={battle.id}
                      battle={battle}
                      onVote={handleVote}
                    />
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Upcoming Battles</h3>
                      <p className="text-muted-foreground">
                        No battles are scheduled to start soon.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              <div className="space-y-6">
                {completedBattles.length > 0 ? (
                  completedBattles.map((battle) => (
                    <HeadToHeadBattle
                      key={battle.id}
                      battle={battle}
                      onVote={handleVote}
                    />
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Completed Battles</h3>
                      <p className="text-muted-foreground">
                        No battles have been completed yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}