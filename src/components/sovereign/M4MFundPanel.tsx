import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Heart, RefreshCw, DollarSign, Gift, Coins } from 'lucide-react';

interface M4MSummary {
  total_balance_bb: number;
  total_from_donations: number;
  total_from_pot_distribution: number;
  total_from_tip_fees: number;
  recent_deposits: Array<{ amount_bb: number; source_type: string; reference_id: string; created_at: string }>;
  deposit_count: number;
}

const M4MFundPanel = () => {
  const [summary, setSummary] = useState<M4MSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_m4m_fund_summary');
    if (!error && data && data.length > 0) setSummary(data[0] as unknown as M4MSummary);
    setLoading(false);
  };

  useEffect(() => { fetchSummary(); }, []);

  const sourceLabel = (type: string) => {
    const map: Record<string, string> = { battle_donation: 'Battle Donation', pot_distribution: 'Pot Distribution', direct_tip_fee: 'Tip Fee' };
    return map[type] || type;
  };

  const sourceIcon = (type: string) => {
    const map: Record<string, React.ReactNode> = { battle_donation: <Gift className="h-3 w-3" />, pot_distribution: <Coins className="h-3 w-3" />, direct_tip_fee: <DollarSign className="h-3 w-3" /> };
    return map[type] || <Heart className="h-3 w-3" />;
  };

  return (
    <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">M4M Fund</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">{summary ? `${summary.total_balance_bb.toLocaleString()} BB` : '...'}</span>
          <Button size="sm" variant="ghost" onClick={fetchSummary} disabled={loading} className="text-white/30 hover:text-white hover:bg-white/[0.04]">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading && !summary ? (
        <div className="text-white/30 text-sm">Loading...</div>
      ) : summary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Battle Donations', value: summary.total_from_donations, icon: Gift },
              { label: 'Pot Distributions', value: summary.total_from_pot_distribution, icon: Coins },
              { label: 'Tip Fees', value: summary.total_from_tip_fees, icon: DollarSign },
            ].map((s, i) => (
              <div key={i} className="bg-[#0a0a0f] rounded-lg p-3 text-center border border-white/[0.06]">
                <s.icon className="h-3.5 w-3.5 mx-auto mb-1.5 text-white/20" />
                <div className="text-lg font-semibold text-white">{s.value.toLocaleString()} BB</div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>

          {summary.recent_deposits && summary.recent_deposits.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-white/40 mb-2">Recent Deposits ({summary.deposit_count} total)</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {summary.recent_deposits.map((deposit, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#0a0a0f] rounded px-3 py-2 border border-white/[0.06]">
                    <div className="flex items-center gap-2 text-white/40">
                      {sourceIcon(deposit.source_type)}
                      <span className="text-xs">{sourceLabel(deposit.source_type)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-white">+{deposit.amount_bb} BB</span>
                      <span className="text-[10px] text-white/20">{new Date(deposit.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-white/30 text-sm">No M4M fund data available.</div>
      )}
    </div>
  );
};

export default M4MFundPanel;
