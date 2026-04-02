import { useState, useEffect } from 'react';
import { Activity, Users, Vote, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface LivePulseMonitorProps {
  refreshTrigger?: number;
}

const LivePulseMonitor = ({ refreshTrigger }: LivePulseMonitorProps) => {
  const [stats, setStats] = useState({
    active_battles: 0,
    recent_vote_activity: 0,
    active_streams: 0,
    transactions_last_hour: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('sovereign-system-control', {
        body: { action: 'get_platform_stats' }
      });
      if (response.error) throw response.error;
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch platform stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  return (
    <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-white">Live Pulse</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
          className="text-white/30 hover:text-white hover:bg-white/[0.04]"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Activity, label: 'Active Battles', value: stats.active_battles },
          { icon: Vote, label: 'Votes (5min)', value: stats.recent_vote_activity },
          { icon: Users, label: 'Active Streams', value: stats.active_streams },
          { icon: Activity, label: 'Txns (1hr)', value: stats.transactions_last_hour },
        ].map((item, i) => (
          <div key={i} className="bg-[#0a0a0f] p-3 rounded-lg border border-white/[0.06] text-center">
            <item.icon className="h-3.5 w-3.5 text-white/20 mx-auto mb-2" />
            <div className="text-2xl font-semibold text-white">{item.value}</div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LivePulseMonitor;
