import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Heart, Share, FileText, TrendingUp, Gift, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CreatorStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatorStatsDrawer({ isOpen, onClose }: CreatorStatsDrawerProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_content: 0,
    total_views: 0,
    total_likes: 0,
    total_shares: 0,
    total_earnings: 0,
  });
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchData();
    }
  }, [isOpen, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch content stats
    const { data: content } = await supabase
      .from('creator_content')
      .select('views, likes, shares, earnings')
      .eq('creator_id', user.id);

    if (content) {
      setStats(content.reduce((acc, c) => ({
        total_content: acc.total_content + 1,
        total_views: acc.total_views + (c.views || 0),
        total_likes: acc.total_likes + (c.likes || 0),
        total_shares: acc.total_shares + (c.shares || 0),
        total_earnings: acc.total_earnings + (c.earnings || 0),
      }), { total_content: 0, total_views: 0, total_likes: 0, total_shares: 0, total_earnings: 0 }));
    }

    // Fetch referral code
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('user_id', user.id)
      .single();

    setReferralCode(profile?.referral_code || null);
    setLoading(false);
  };

  const copyReferral = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast.success('Referral code copied!');
    }
  };

  const statCards = [
    { label: 'Content', value: stats.total_content, icon: FileText, color: 'text-primary' },
    { label: 'Views', value: stats.total_views, icon: Eye, color: 'text-blue-400' },
    { label: 'Likes', value: stats.total_likes, icon: Heart, color: 'text-red-400' },
    { label: 'Shares', value: stats.total_shares, icon: Share, color: 'text-green-400' },
  ];

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg font-bold text-center">Creator Stats</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-sm animate-pulse">Loading...</div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2">
                {statCards.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Card key={s.label} className="border-border/20">
                      <CardContent className="p-2.5 text-center">
                        <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${s.color}`} />
                        <div className="text-lg font-bold">{s.value}</div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Earnings */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Total Earnings</span>
                  </div>
                  <span className="text-lg font-bold text-primary">{stats.total_earnings} BB</span>
                </CardContent>
              </Card>

              {/* Referral */}
              {referralCode && (
                <Card className="border-border/20">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium">Referral Code</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 py-1.5 px-3 rounded-lg bg-muted/30 text-sm font-mono text-center">
                        {referralCode}
                      </code>
                      <Button variant="outline" size="sm" onClick={copyReferral} className="shrink-0">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
