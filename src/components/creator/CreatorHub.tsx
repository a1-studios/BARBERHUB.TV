import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { CreatorDashboard } from './CreatorDashboard';
import { EarningSystem } from './EarningSystem';
import { ReferralProgram } from './ReferralProgram';
import { 
  Scissors, 
  DollarSign, 
  Users, 
  Trophy, 
  Star,
  TrendingUp,
  Gift,
  Crown
} from 'lucide-react';

export function CreatorHub() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="animate-pulse">Loading Creator Hub...</div>
        </div>
      </section>
    );
  }

  if (user) {
    return (
      <section className="py-20 px-4 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto space-y-12">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown className="h-8 w-8 text-primary" />
              <h2 className="text-4xl font-bold text-gradient">Creator Hub</h2>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Welcome back! Manage your content, track earnings, and grow your barbering empire.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <CreatorDashboard />
              <EarningSystem />
            </div>
            <div className="space-y-8">
              <ReferralProgram />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto">
        <div className="text-center space-y-6 mb-16">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-8 w-8 text-primary" />
            <h2 className="text-4xl font-bold text-gradient">Become a Creator</h2>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Join thousands of barbers earning Barber Bucks by sharing techniques, tutorials, and building the community.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="card-gradient">
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-success" />
                <CardTitle>Earn Barber Bucks</CardTitle>
              </div>
              <CardDescription>
                Get rewarded for every view, like, and share on your content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Content Views</span>
                  <Badge variant="success">+2 BB each</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Content Likes</span>
                  <Badge variant="success">+5 BB each</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Content Shares</span>
                  <Badge variant="success">+10 BB each</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-gradient">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <CardTitle>Referral Rewards</CardTitle>
              </div>
              <CardDescription>
                Invite friends and earn bonus Barber Bucks for every signup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Friend Joins</span>
                  <Badge variant="default">+50 BB</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Friend's 1st Content</span>
                  <Badge variant="default">+25 BB</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Milestone Bonuses</span>
                  <Badge variant="default">Up to 500 BB</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-gradient">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-warning" />
                <CardTitle>Creator Levels</CardTitle>
              </div>
              <CardDescription>
                Progress through levels and unlock exclusive rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-600"></div>
                    Bronze
                  </span>
                  <span className="text-sm text-muted-foreground">0+ BB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    Silver
                  </span>
                  <span className="text-sm text-muted-foreground">1,000+ BB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    Gold
                  </span>
                  <span className="text-sm text-muted-foreground">5,000+ BB</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-6">
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Track your progress</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>Build your reputation</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              <span>Unlock exclusive rewards</span>
            </div>
          </div>
          
          <AuthDialog>
            <Button size="lg" className="btn-primary">
              <Scissors className="mr-2 h-5 w-5" />
              Start Creating Today
            </Button>
          </AuthDialog>
          
          <p className="text-sm text-muted-foreground">
            Join the community • Share your skills • Earn rewards
          </p>
        </div>
      </div>
    </section>
  );
}