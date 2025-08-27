import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Eye, 
  Heart, 
  Share, 
  DollarSign, 
  TrendingUp,
  Edit,
  Plus,
  Crown
} from 'lucide-react';

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  is_creator: boolean;
  creator_level: string;
  barber_bucks: number;
  total_earnings: number;
  referral_code: string | null;
}

interface ContentStats {
  total_content: number;
  total_views: number;
  total_likes: number;
  total_shares: number;
  total_earnings: number;
}

export function CreatorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contentStats, setContentStats] = useState<ContentStats>({
    total_content: 0,
    total_views: 0,
    total_likes: 0,
    total_shares: 0,
    total_earnings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchContentStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data);
    }
    setLoading(false);
  };

  const fetchContentStats = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('creator_content')
      .select('views, likes, shares, earnings')
      .eq('creator_id', user.id);

    if (!error && data) {
      const stats = data.reduce((acc, content) => ({
        total_content: acc.total_content + 1,
        total_views: acc.total_views + (content.views || 0),
        total_likes: acc.total_likes + (content.likes || 0),
        total_shares: acc.total_shares + (content.shares || 0),
        total_earnings: acc.total_earnings + (content.earnings || 0),
      }), {
        total_content: 0,
        total_views: 0,
        total_likes: 0,
        total_shares: 0,
        total_earnings: 0,
      });

      setContentStats(stats);
    }
  };

  const becomeCreator = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ is_creator: true })
      .eq('user_id', user.id);

    if (!error) {
      fetchProfile();
    }
  };

  const getLevelProgress = (level: string, totalEarnings: number) => {
    const levels = {
      Bronze: { min: 0, max: 1000 },
      Silver: { min: 1000, max: 5000 },
      Gold: { min: 5000, max: 10000 },
      Platinum: { min: 10000, max: 25000 },
      Diamond: { min: 25000, max: Infinity },
    };

    const current = levels[level as keyof typeof levels];
    if (!current || current.max === Infinity) return 100;

    return Math.min(((totalEarnings - current.min) / (current.max - current.min)) * 100, 100);
  };

  const getNextLevel = (level: string) => {
    const levelOrder = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    const currentIndex = levelOrder.indexOf(level);
    return currentIndex < levelOrder.length - 1 ? levelOrder[currentIndex + 1] : null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading dashboard...</div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Error loading profile</div>
        </CardContent>
      </Card>
    );
  }

  if (!profile.is_creator) {
    return (
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Become a Creator
          </CardTitle>
          <CardDescription>
            Start sharing your barbering skills and earn Barber Bucks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={becomeCreator} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Activate Creator Mode
          </Button>
        </CardContent>
      </Card>
    );
  }

  const nextLevel = getNextLevel(profile.creator_level);
  const levelProgress = getLevelProgress(profile.creator_level, profile.total_earnings);

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card className="card-gradient">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>{profile.display_name || 'Creator'}</CardTitle>
                <CardDescription>@{profile.username || 'username'}</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="default" className="mb-2">
                {profile.creator_level}
              </Badge>
              <div className="text-2xl font-bold text-success">
                {profile.barber_bucks} BB
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {nextLevel && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to {nextLevel}</span>
                <span>{Math.round(levelProgress)}%</span>
              </div>
              <Progress value={levelProgress} className="h-2" />
            </div>
          )}
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-muted-foreground">
              Total Earned: {profile.total_earnings} BB
            </span>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{contentStats.total_content}</div>
            <div className="text-sm text-muted-foreground">Content</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              <Eye className="h-4 w-4" />
              {contentStats.total_views}
            </div>
            <div className="text-sm text-muted-foreground">Views</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              <Heart className="h-4 w-4" />
              {contentStats.total_likes}
            </div>
            <div className="text-sm text-muted-foreground">Likes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              <Share className="h-4 w-4" />
              {contentStats.total_shares}
            </div>
            <div className="text-sm text-muted-foreground">Shares</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create Content
            </Button>
            <Button variant="outline" className="w-full">
              <TrendingUp className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
            <Button variant="outline" className="w-full">
              <DollarSign className="mr-2 h-4 w-4" />
              Earning History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}