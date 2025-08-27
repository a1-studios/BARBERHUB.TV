import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  Copy, 
  Share, 
  Gift, 
  TrendingUp,
  ExternalLink,
  UserPlus
} from 'lucide-react';

interface Profile {
  referral_code: string | null;
}

interface ReferralData {
  total_referrals: number;
  active_referrals: number;
  total_earned: number;
  recent_referrals: Array<{
    id: string;
    status: string;
    bonus_earned: number;
    created_at: string;
  }>;
}

export function ReferralProgram() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [referralData, setReferralData] = useState<ReferralData>({
    total_referrals: 0,
    active_referrals: 0,
    total_earned: 0,
    recent_referrals: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchReferralData();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setProfile(data);
    }
    setLoading(false);
  };

  const fetchReferralData = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('referral_tracking')
      .select('*')
      .eq('referrer_id', user.id);

    if (!error && data) {
      const totalEarned = data.reduce((sum, ref) => sum + (ref.bonus_earned || 0), 0);
      
      setReferralData({
        total_referrals: data.length,
        active_referrals: data.filter(ref => ref.status === 'active').length,
        total_earned: totalEarned,
        recent_referrals: data.slice(0, 5),
      });
    }
  };

  const copyReferralLink = () => {
    if (!profile?.referral_code) return;

    const referralUrl = `${window.location.origin}?ref=${profile.referral_code}`;
    navigator.clipboard.writeText(referralUrl);
    toast.success('Referral link copied to clipboard!');
  };

  const shareReferralLink = () => {
    if (!profile?.referral_code) return;

    const referralUrl = `${window.location.origin}?ref=${profile.referral_code}`;
    const text = `Join me on Barber Hub and let's share our barbering skills! Use my referral code: ${profile.referral_code}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join Barber Hub',
        text: text,
        url: referralUrl,
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      const shareText = `${text} ${referralUrl}`;
      navigator.clipboard.writeText(shareText);
      toast.success('Referral message copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading referral program...</div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Error loading referral data</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral Stats */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Referral Program
          </CardTitle>
          <CardDescription>
            Invite friends and earn Barber Bucks together
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{referralData.total_referrals}</div>
                <div className="text-sm text-muted-foreground">Total Referrals</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-success">{referralData.total_earned}</div>
                <div className="text-sm text-muted-foreground">BB Earned</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Referral Code</label>
              <div className="flex gap-2">
                <Input 
                  value={profile.referral_code || ''} 
                  readOnly 
                  className="font-mono"
                />
                <Button variant="outline" size="icon" onClick={copyReferralLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Button onClick={shareReferralLink} className="w-full">
                <Share className="mr-2 h-4 w-4" />
                Share Referral Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Referral Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <span className="font-medium">Friend Joins</span>
              </div>
              <Badge variant="success">+50 BB</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium">Friend Creates Content</span>
              </div>
              <Badge variant="success">+25 BB</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                <span className="font-medium">5 Referrals Milestone</span>
              </div>
              <Badge variant="default">+200 BB</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                <span className="font-medium">10 Referrals Milestone</span>
              </div>
              <Badge variant="default">+500 BB</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Referrals */}
      {referralData.recent_referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referralData.recent_referrals.map((referral) => (
                <div key={referral.id} className="flex justify-between items-center p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      referral.status === 'active' ? 'bg-success' : 'bg-muted-foreground'
                    }`} />
                    <span className="text-sm capitalize">{referral.status}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    +{referral.bonus_earned} BB
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}