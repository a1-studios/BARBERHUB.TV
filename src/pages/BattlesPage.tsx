
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Trophy, Users, Clock, Plus, Vote, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Battle {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  prize_amount: number;
  currency: string;
  cover_image_url?: string;
  max_participants?: number;
  starts_at?: string;
  ends_at?: string;
  voting_ends_at?: string;
  created_at: string;
  organizer_id: string;
  participant_count?: number;
}

const BattlesPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [battlesLoading, setBattlesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchBattles();
    }
  }, [user, loading, navigate]);

  const fetchBattles = async () => {
    try {
      setBattlesLoading(true);
      
      // Fetch battles with participant counts
      const { data: battlesData, error } = await supabase
        .from('battles')
        .select(`
          *,
          battle_participants!inner(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include participant counts
      const battlesWithCounts = battlesData?.map(battle => ({
        ...battle,
        participant_count: battle.battle_participants?.length || 0
      })) || [];

      setBattles(battlesWithCounts);
    } catch (error) {
      console.error('Error fetching battles:', error);
      toast.error('Failed to load battles');
    } finally {
      setBattlesLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'upcoming': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'voting': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'completed': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Trophy className="w-4 h-4" />;
      case 'upcoming': return <Calendar className="w-4 h-4" />;
      case 'voting': return <Vote className="w-4 h-4" />;
      case 'completed': return <Trophy className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const filterBattles = (status: string) => {
    if (status === 'all') return battles;
    return battles.filter(battle => battle.status === status);
  };

  if (loading || battlesLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-24 flex items-center justify-center">
          <div className="animate-pulse text-lg">Loading battles...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Barber Battles
              </h1>
              <p className="text-muted-foreground">
                Compete, showcase your skills, and win amazing prizes
              </p>
            </div>
            <Button
              onClick={() => navigate('/battles/create')}
              size="lg"
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Battle
            </Button>
          </div>

          {/* Battle Filters */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="voting">Voting</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {filterBattles(activeTab).length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    No battles found
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {activeTab === 'all' 
                      ? "Be the first to create a battle!" 
                      : `No ${activeTab} battles at the moment.`
                    }
                  </p>
                  <Button onClick={() => navigate('/battles/create')}>
                    Create Your First Battle
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filterBattles(activeTab).map((battle) => (
                    <Card
                      key={battle.id}
                      className="border border-border/50 shadow-lg backdrop-blur-sm bg-card/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(24_100%_52%/0.5),inset_0_0_20px_hsl(24_100%_52%/0.15)] hover:border-primary/30 cursor-pointer"
                      style={{ borderRadius: '1.5rem' }}
                      onClick={() => navigate(`/battles/${battle.id}`)}
                    >
                      {battle.cover_image_url && (
                        <div className="aspect-video w-full overflow-hidden rounded-t-3xl">
                          <img
                            src={battle.cover_image_url}
                            alt={battle.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={`${getStatusColor(battle.status)} flex items-center gap-1`}>
                            {getStatusIcon(battle.status)}
                            {battle.status.charAt(0).toUpperCase() + battle.status.slice(1)}
                          </Badge>
                          {battle.category && (
                            <Badge variant="outline" className="text-primary border-primary/30">
                              {battle.category}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-white line-clamp-2">{battle.title}</CardTitle>
                        {battle.description && (
                          <CardDescription className="text-muted-foreground line-clamp-2">
                            {battle.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            {battle.participant_count || 0}
                            {battle.max_participants && ` / ${battle.max_participants}`} participants
                          </div>
                          <div className="text-primary font-semibold">
                            {battle.prize_amount > 0 ? `$${battle.prize_amount}` : 'Free'}
                          </div>
                        </div>
                        
                        {battle.starts_at && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            Starts: {formatDate(battle.starts_at)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BattlesPage;
