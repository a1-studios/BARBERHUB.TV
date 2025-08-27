import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  Eye, 
  Heart, 
  Share, 
  Users, 
  Trophy,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

interface Milestone {
  id: string;
  milestone_type: string;
  milestone_value: number | null;
  reward_amount: number;
  achieved_at: string;
}

export function EarningSystem() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchMilestones();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('earning_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  const fetchMilestones = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('creator_milestones')
      .select('*')
      .eq('creator_id', user.id)
      .order('achieved_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setMilestones(data);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'content_view':
        return <Eye className="h-4 w-4" />;
      case 'content_like':
        return <Heart className="h-4 w-4" />;
      case 'content_share':
        return <Share className="h-4 w-4" />;
      case 'referral_bonus':
        return <Users className="h-4 w-4" />;
      case 'milestone_bonus':
        return <Trophy className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'first_content':
        return <Trophy className="h-4 w-4 text-success" />;
      case 'views_milestone':
        return <Eye className="h-4 w-4 text-primary" />;
      case 'likes_milestone':
        return <Heart className="h-4 w-4 text-destructive" />;
      case 'referral_milestone':
        return <Users className="h-4 w-4 text-warning" />;
      case 'level_up':
        return <TrendingUp className="h-4 w-4 text-success" />;
      default:
        return <Trophy className="h-4 w-4" />;
    }
  };

  const getMilestoneLabel = (type: string, value: number | null) => {
    switch (type) {
      case 'first_content':
        return 'First Content Created';
      case 'views_milestone':
        return `${value?.toLocaleString()} Views Reached`;
      case 'likes_milestone':
        return `${value?.toLocaleString()} Likes Reached`;
      case 'referral_milestone':
        return `${value} Referrals Made`;
      case 'level_up':
        return 'Level Up Achievement';
      default:
        return 'Special Achievement';
    }
  };

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">Loading earnings...</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">Loading achievements...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent Earnings
          </CardTitle>
          <CardDescription>
            Your latest Barber Bucks transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No earnings yet</p>
              <p className="text-sm">Start creating content to earn Barber Bucks!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.transaction_type)}
                    <div>
                      <div className="font-medium">
                        {getTransactionLabel(transaction.transaction_type)}
                      </div>
                      {transaction.description && (
                        <div className="text-sm text-muted-foreground">
                          {transaction.description}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <Badge variant="success" className="font-mono">
                    +{transaction.amount} BB
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements
          </CardTitle>
          <CardDescription>
            Your latest milestones and rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No achievements yet</p>
              <p className="text-sm">Keep creating to unlock achievements!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {getMilestoneIcon(milestone.milestone_type)}
                    <div>
                      <div className="font-medium">
                        {getMilestoneLabel(milestone.milestone_type, milestone.milestone_value)}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(milestone.achieved_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <Badge variant="default" className="font-mono">
                    +{milestone.reward_amount} BB
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}