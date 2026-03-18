import { useState, useEffect } from 'react';
import { Activity, Users, Vote, Coins, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface LivePulseMonitorProps {
  refreshTrigger?: number;
}

const LivePulseMonitor = ({ refreshTrigger }: LivePulseMonitorProps) => {
  const [stats, setStats] = useState({
    active_battles: 0,
    recent_vote_activity: 0,
    total_bb_circulation: 0,
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
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  return (
    <div className="bg-[#1a1a2e] border border-cyan-900/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-cyan-500 animate-pulse" />
          <h3 className="text-lg font-bold text-cyan-400">LIVE PULSE</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
          className="text-gray-400 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Activity className="h-4 w-4 text-green-400" />
          </div>
          <div className="text-xl font-mono text-green-400">{stats.active_battles}</div>
          <div className="text-xs text-gray-500">Active Battles</div>
        </div>

        <div className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Vote className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-xl font-mono text-blue-400">{stats.recent_vote_activity}</div>
          <div className="text-xs text-gray-500">Votes (5min)</div>
        </div>

        <div className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="h-4 w-4 text-yellow-400" />
          </div>
          <div className="text-xl font-mono text-yellow-400">{stats.active_streams}</div>
          <div className="text-xs text-gray-500">Active Streams</div>
        </div>

        <div className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Activity className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-xl font-mono text-purple-400">{stats.transactions_last_hour}</div>
          <div className="text-xs text-gray-500">Txns (1hr)</div>
        </div>
      </div>
    </div>
  );
};

export default LivePulseMonitor;
