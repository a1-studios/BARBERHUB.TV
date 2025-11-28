import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Users, Target, DollarSign, Upload, Eye, TrendingUp, Award, Calendar, Zap, Crown, ShoppingBag, FileText, BarChart3, X, Radio, Video } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CreationUpload } from '@/components/creations/CreationUpload';
import { SubscriptionStatusCard } from './SubscriptionStatusCard';
import { StreamControlPanel } from '@/components/streaming/StreamControlPanel';

interface BarberStats {
  battles_created: number;
  battles_won: number;
  total_votes: number;
  rank_position: number;
  barber_bucks: number;
  content_count: number;
  total_views: number;
  follower_count: number;
  win_rate: number;
}
const BarberDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreationUpload, setShowCreationUpload] = useState(false);
  const [showStreamPanel, setShowStreamPanel] = useState(false);
  // Fetch barber profile and stats
  const {
    data: barberProfile
  } = useQuery({
    queryKey: ['barberProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const {
        data,
        error
      } = await supabase.from('barber_profiles').select('*').eq('user_id', user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });
  const {
    data: userProfile
  } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const {
        data,
        error
      } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch active battles where this barber can stream
  const { data: activeBattle } = useQuery({
    queryKey: ['activeBattle', barberProfile?.id],
    queryFn: async () => {
      if (!barberProfile?.id) return null;
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .or(`barber1_id.eq.${barberProfile.id},barber2_id.eq.${barberProfile.id}`)
        .in('status', ['upcoming', 'voting'])
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!barberProfile?.id,
  });

  const barberPosition = activeBattle?.barber1_id === barberProfile?.id ? 1 : 2;

  // Mock stats for now - in production these would come from database aggregations
  const stats: BarberStats = {
    battles_created: 12,
    battles_won: 8,
    total_votes: 1247,
    rank_position: 15,
    barber_bucks: userProfile?.barber_bucks || 0,
    content_count: 24,
    total_views: 15420,
    follower_count: 892,
    win_rate: 67
  };
  const getProgressToNextLevel = () => {
    const currentLevel = userProfile?.creator_level || 'Bronze';
    const levelProgress = {
      'Bronze': 25,
      'Silver': 55,
      'Gold': 75,
      'Diamond': 90,
      'Master': 100
    };
    return levelProgress[currentLevel as keyof typeof levelProgress] || 25;
  };
  return <div className="min-h-screen bg-gradient-primary p-4 py-0">
      <div className="max-w-7xl mx-auto space-y-6 my-0 px-[100px] py-[38px]">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-2">YOUR ARENA AWAITS, KING</h1>
          <p className="text-muted-foreground">Master your craft, dominate the competition</p>
        </div>

        {/* Top Row - Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel - Subscription & Rank */}
          <div className="space-y-6">
            <SubscriptionStatusCard />
            
            <Card className="card-gradient border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Trophy className="h-5 w-5" />
                GLOBAL LEAGUE
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">#{stats.rank_position}</div>
                <p className="text-sm text-muted-foreground">Current Rank</p>
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/50">
                  {userProfile?.creator_level || 'Bronze'} Tier
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Battles Won</span>
                  <span className="font-semibold text-primary">{stats.battles_won}/{stats.battles_created}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Win Rate</span>
                  <span className="font-semibold text-success">{stats.win_rate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Votes</span>
                  <span className="font-semibold">{stats.total_votes.toLocaleString()}</span>
                </div>
              </div>

              <Link to="/portal">
                <Button className="w-full btn-primary">
                  <Target className="h-4 w-4 mr-2" />
                  VIEW BRACKET
                </Button>
              </Link>
            </CardContent>
          </Card>
          </div>

          {/* Center Panel - Character/Avatar */}
          <Card className="card-gradient border-primary/20">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mb-4 animate-glow">
                <Crown className="h-16 w-16 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">{barberProfile?.name || userProfile?.display_name || 'Barber King'}</h2>
              <p className="text-muted-foreground mb-4">{barberProfile?.specialty || 'Master Stylist'}</p>
              
              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Level Progress</span>
                  <span>{getProgressToNextLevel()}%</span>
                </div>
                <Progress value={getProgressToNextLevel()} className="h-3" />
                <p className="text-xs text-center text-muted-foreground">
                  Keep competing to reach the next tier!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Right Panel - Career Development */}
          <Card className="card-gradient border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Zap className="h-5 w-5" />
                CAREER ACCELERATOR
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Profile Complete</span>
                  <span className="text-sm font-semibold text-success">85%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Grants Applied</span>
                  <span className="text-sm font-semibold">2/5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Achievements</span>
                  <span className="text-sm font-semibold text-primary">12</span>
                </div>
              </div>

              <div className="space-y-2">
                <Badge className="w-full justify-center bg-success/20 text-success border-success/50">
                  <Award className="h-3 w-3 mr-1" />
                  Rising Star
                </Badge>
                <Badge className="w-full justify-center bg-primary/20 text-primary border-primary/50">
                  <Trophy className="h-3 w-3 mr-1" />
                  Battle Winner
                </Badge>
              </div>

              <Link to="/grants">
                <Button variant="secondary" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  GO TO MY APPLICATIONS
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Live Streaming Section */}
        {activeBattle && (
          <Card className="card-gradient border-red-500/30 bg-red-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-red-500">
                  <Radio className="h-5 w-5 animate-pulse" />
                  LIVE STREAMING
                </span>
                <Badge variant="outline" className="border-red-500/50 text-red-500">
                  Battle Ready
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>{activeBattle.title}</strong> - You're barber #{barberPosition}
              </p>
              {showStreamPanel ? (
                <StreamControlPanel
                  battleId={activeBattle.id}
                  barberPosition={barberPosition as 1 | 2}
                  barberName={barberProfile?.name || 'Barber'}
                />
              ) : (
                <Button 
                  onClick={() => setShowStreamPanel(true)}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <Video className="mr-2 h-4 w-4" />
                  Open Stream Controls
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Bottom Left - Creator Hub */}
          <Card className="card-gradient border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <BarChart3 className="h-5 w-5" />
                CREATOR INSIGHTS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.content_count}</div>
                  <p className="text-sm text-muted-foreground">Total Content</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.total_views.toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.follower_count}</div>
                  <p className="text-sm text-muted-foreground">Followers</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">{userProfile?.total_earnings || 0}</div>
                  <p className="text-sm text-muted-foreground">BB Earned</p>
                </div>
              </div>

              <div className="space-y-2">
                <Button className="w-full btn-primary" onClick={() => setShowCreationUpload(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  UPLOAD NEW PRODUCTS
                </Button>
                <Link to="/battles">
                  <Button variant="secondary" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    View Content Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Right - Financial Dashboard */}
          <Card className="card-gradient border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <DollarSign className="h-5 w-5" />
                BARBER BUCKS HQ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-primary mb-2">
                  {stats.barber_bucks.toLocaleString()} BB
                </div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-lg font-semibold text-success">+{userProfile?.total_earnings || 0}</div>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">2.5x</div>
                  <p className="text-xs text-muted-foreground">Multiplier</p>
                </div>
              </div>

              <div className="space-y-2">
                <Button className="w-full btn-primary">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  EARN MORE
                </Button>
                <Button variant="secondary" className="w-full">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  WITHDRAW
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  Recent transactions and earning history
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <Card className="card-gradient border-primary/20">
          
          
        </Card>
      </div>

      {/* Creation Upload Modal */}
      {showCreationUpload && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">Upload New Creation</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCreationUpload(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <CreationUpload onCreationUploaded={() => setShowCreationUpload(false)} barberProfileId={barberProfile?.id} />
            </div>
          </div>
        </div>}
    </div>;
};
export default BarberDashboard;