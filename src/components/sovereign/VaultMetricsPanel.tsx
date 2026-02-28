import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Target, Users, Share2, Trophy, TrendingUp } from 'lucide-react';

interface VaultMetrics {
  totalLeads: number;
  barberLeads: number;
  fanLeads: number;
  shared: number;
  converted: number;
  prizeDistribution: Record<string, number>;
}

interface VaultMetricsPanelProps {
  onRefresh?: () => void;
}

const VaultMetricsPanel = ({ onRefresh }: VaultMetricsPanelProps) => {
  const [metrics, setMetrics] = useState<VaultMetrics>({
    totalLeads: 0, barberLeads: 0, fanLeads: 0, shared: 0, converted: 0, prizeDistribution: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('marketing_leads').select('*');
      if (data) {
        const prizes: Record<string, number> = {};
        data.forEach(l => {
          if (l.prize_id) prizes[l.prize_id] = (prizes[l.prize_id] || 0) + 1;
        });
        setMetrics({
          totalLeads: data.length,
          barberLeads: data.filter(l => l.role === 'barber').length,
          fanLeads: data.filter(l => l.role === 'fan').length,
          shared: data.filter(l => l.shared).length,
          converted: data.filter(l => l.converted).length,
          prizeDistribution: prizes,
        });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const conversionRate = metrics.totalLeads > 0
    ? ((metrics.converted / metrics.totalLeads) * 100).toFixed(1)
    : '0';

  const shareRate = metrics.totalLeads > 0
    ? ((metrics.shared / metrics.totalLeads) * 100).toFixed(1)
    : '0';

  return (
    <Card className="bg-[#1a1a2e] border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-[#FF5F1F]" />
          <h3 className="text-lg font-bold text-white">Vault of Honor — Lead Funnel</h3>
        </div>
        <Badge className="bg-[#FF5F1F]/20 text-[#FF5F1F] border-[#FF5F1F]/30">
          {metrics.totalLeads} leads
        </Badge>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: Users, label: 'Total Leads', value: metrics.totalLeads, color: 'text-white' },
              { icon: Users, label: 'Barbers', value: metrics.barberLeads, color: 'text-[#FF5F1F]' },
              { icon: Users, label: 'Fans', value: metrics.fanLeads, color: 'text-cyan-400' },
              { icon: Share2, label: `Share Rate`, value: `${shareRate}%`, color: 'text-green-400' },
              { icon: TrendingUp, label: 'Conversion', value: `${conversionRate}%`, color: 'text-yellow-400' },
            ].map((s, i) => (
              <div key={i} className="bg-gray-900/50 rounded-lg p-3 text-center">
                <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Prize distribution */}
          {Object.keys(metrics.prizeDistribution).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-1">
                <Trophy className="h-4 w-4" /> Prize Distribution
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(metrics.prizeDistribution).map(([id, count]) => (
                  <div key={id} className="bg-gray-900/30 rounded px-3 py-2 flex justify-between items-center">
                    <span className="text-xs text-gray-300 truncate">{id}</span>
                    <Badge variant="secondary" className="text-xs ml-2">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default VaultMetricsPanel;
