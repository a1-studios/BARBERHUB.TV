import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Heart, RefreshCw, DollarSign, Gift, Coins } from 'lucide-react';

interface M4MSummary {
  total_balance_bb: number;
  total_from_donations: number;
  total_from_pot_distribution: number;
  total_from_tip_fees: number;
  recent_deposits: Array<{
    amount_bb: number;
    source_type: string;
    reference_id: string;
    created_at: string;
  }>;
  deposit_count: number;
}

const M4MFundPanel = () => {
  const [summary, setSummary] = useState<M4MSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_m4m_fund_summary');
    if (!error && data && data.length > 0) {
      setSummary(data[0] as unknown as M4MSummary);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSummary(); }, []);

  const sourceLabel = (type: string) => {
    switch (type) {
      case 'battle_donation': return 'Battle Donation';
      case 'pot_distribution': return 'Pot Distribution';
      case 'direct_tip_fee': return 'Tip Fee';
      default: return type;
    }
  };

  const sourceIcon = (type: string) => {
    switch (type) {
      case 'battle_donation': return <Gift className="h-3 w-3" />;
      case 'pot_distribution': return <Coins className="h-3 w-3" />;
      case 'direct_tip_fee': return <DollarSign className="h-3 w-3" />;
      default: return <Heart className="h-3 w-3" />;
    }
  };

  return (
    <Card className="bg-[#1a1a2e] border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-500" />
          <h3 className="text-lg font-bold text-white">M4M Fund — Minutes for Men</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">
            {summary ? `${summary.total_balance_bb.toLocaleString()} BB` : '...'}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchSummary}
            disabled={loading}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading && !summary ? (
        <div className="text-gray-500 text-sm">Loading M4M fund data...</div>
      ) : summary ? (
        <div className="space-y-4">
          {/* Source breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'From Battle Donations', value: summary.total_from_donations, color: 'text-orange-400', icon: Gift },
              { label: 'From Pot Distributions', value: summary.total_from_pot_distribution, color: 'text-yellow-400', icon: Coins },
              { label: 'From Tip Fees', value: summary.total_from_tip_fees, color: 'text-green-400', icon: DollarSign },
            ].map((s, i) => (
              <div key={i} className="bg-gray-900/50 rounded-lg p-3 text-center">
                <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                <div className={`text-lg font-bold ${s.color}`}>{s.value.toLocaleString()} BB</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent deposits */}
          {summary.recent_deposits && summary.recent_deposits.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">
                Recent Deposits ({summary.deposit_count} total)
              </h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {summary.recent_deposits.map((deposit, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-900/30 rounded px-3 py-2">
                    <div className="flex items-center gap-2">
                      {sourceIcon(deposit.source_type)}
                      <span className="text-xs text-gray-300">{sourceLabel(deposit.source_type)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-pink-400">+{deposit.amount_bb} BB</span>
                      <span className="text-xs text-gray-600">
                        {new Date(deposit.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-500 text-sm">No M4M fund data available.</div>
      )}
    </Card>
  );
};

export default M4MFundPanel;
