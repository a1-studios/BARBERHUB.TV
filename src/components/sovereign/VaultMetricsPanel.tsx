import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Target, Users, Share2, Trophy, TrendingUp } from 'lucide-react';

interface VaultMetrics {
  totalLeads: number; barberLeads: number; fanLeads: number; shared: number; converted: number; prizeDistribution: Record<string, number>;
}

interface VaultMetricsPanelProps { onRefresh?: () => void; }

const VaultMetricsPanel = ({ onRefresh }: VaultMetricsPanelProps) => {
  const [metrics, setMetrics] = useState<VaultMetrics>({ totalLeads: 0, barberLeads: 0, fanLeads: 0, shared: 0, converted: 0, prizeDistribution: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('marketing_leads').select('*');
      if (data) {
        const prizes: Record<string, number> = {};
        data.forEach(l => { if (l.prize_id) prizes[l.prize_id] = (prizes[l.prize_id] || 0) + 1; });
        setMetrics({
          totalLeads: data.length, barberLeads: data.filter(l => l.role === 'barber').length,
          fanLeads: data.filter(l => l.role === 'fan').length, shared: data.filter(l => l.shared).length,
          converted: data.filter(l => l.converted).length, prizeDistribution: prizes,
        });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const conversionRate = metrics.totalLeads > 0 ? ((metrics.converted / metrics.totalLeads) * 100).toFixed(1) : '0';
  const shareRate = metrics.totalLeads > 0 ? ((metrics.shared / metrics.totalLeads) * 100).toFixed(1) : '0';

  return (
    <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-white">Vault of Honor — Lead Funnel</h3>
        </div>
        <span className="text-xs text-white/40">{metrics.totalLeads} leads</span>
      </div>

      {loading ? (
        <div className="text-white/30 text-sm">Loading...</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: Users, label: 'Total Leads', value: metrics.totalLeads },
              { icon: Users, label: 'Barbers', value: metrics.barberLeads },
              { icon: Users, label: 'Fans', value: metrics.fanLeads },
              { icon: Share2, label: 'Share Rate', value: `${shareRate}%` },
              { icon: TrendingUp, label: 'Conversion', value: `${conversionRate}%` },
            ].map((s, i) => (
              <div key={i} className="bg-[#0a0a0f] rounded-lg p-3 text-center border border-white/[0.06]">
                <s.icon className="h-3.5 w-3.5 mx-auto mb-1.5 text-white/20" />
                <div className="text-lg font-semibold text-white">{s.value}</div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>

          {Object.keys(metrics.prizeDistribution).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-white/40 mb-2 flex items-center gap-1"><Trophy className="h-3 w-3" /> Prize Distribution</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(metrics.prizeDistribution).map(([id, count]) => (
                  <div key={id} className="bg-[#0a0a0f] rounded px-3 py-2 flex justify-between items-center border border-white/[0.06]">
                    <span className="text-xs text-white/40 truncate">{id}</span>
                    <Badge variant="secondary" className="text-xs bg-white/[0.06] text-white/60 border-0">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VaultMetricsPanel;
