import { useState, useEffect } from 'react';
import { Zap, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import KillSwitchPanel from '@/components/sovereign/KillSwitchPanel';
import EconomyControlPanel from '@/components/sovereign/EconomyControlPanel';
import BattleControlPanel from '@/components/sovereign/BattleControlPanel';
import UserControlPanel from '@/components/sovereign/UserControlPanel';
import AuditLogViewer from '@/components/sovereign/AuditLogViewer';
import LivePulseMonitor from '@/components/sovereign/LivePulseMonitor';
import SponsorControlPanel from '@/components/sovereign/SponsorControlPanel';
import BattleDirectoryPanel from '@/components/sovereign/BattleDirectoryPanel';
import TournamentQueuePanel from '@/components/sovereign/TournamentQueuePanel';
import TournamentManagerPanel from '@/components/sovereign/TournamentManagerPanel';
import VaultMetricsPanel from '@/components/sovereign/VaultMetricsPanel';
import M4MFundPanel from '@/components/sovereign/M4MFundPanel';
import AffiliateControlPanel from '@/components/sovereign/AffiliateControlPanel';

const SovereignHQ = () => {
  const { user } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [platformState, setPlatformState] = useState<any>({});
  const [economyStats, setEconomyStats] = useState<any>({});
  const [userStats, setUserStats] = useState<any>({});
  const [battleStats, setBattleStats] = useState<any>({});

  const refresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    const fetchAllData = async () => {
      // Fetch platform state
      const stateRes = await supabase.functions.invoke('sovereign-system-control', {
        body: { action: 'get_status' }
      });
      if (stateRes.data) setPlatformState(stateRes.data.platform_state || {});

      // Fetch economy stats
      const econRes = await supabase.functions.invoke('sovereign-economy-control', {
        body: { action: 'get_stats' }
      });
      if (econRes.data) setEconomyStats(econRes.data);

      // Fetch user stats
      const userRes = await supabase.functions.invoke('sovereign-user-control', {
        body: { action: 'get_stats' }
      });
      if (userRes.data) setUserStats(userRes.data);

      // Fetch battle stats
      const battleRes = await supabase.functions.invoke('sovereign-battle-control', {
        body: { action: 'get_battles', status_filter: 'all', limit: 100 }
      });
      if (battleRes.data?.battles) {
        const battles = battleRes.data.battles;
        setBattleStats({
          active: battles.filter((b: any) => ['live', 'streaming', 'upcoming'].includes(b.status)).length,
          voting: battles.filter((b: any) => b.status === 'voting').length,
          live: battles.filter((b: any) => b.status === 'live').includes.length
        });
      }
    };

    fetchAllData();
  }, [refreshTrigger]);

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Header */}
      <header className="bg-[#1a1a2e] border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-2 rounded-lg">
              <Zap className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                SOVEREIGN COMMAND CENTER
              </h1>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Shield className="h-4 w-4 text-green-500" />
            <span>GOD MODE ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Kill Switches - Top Priority */}
        <KillSwitchPanel platformState={platformState} onRefresh={refresh} />

        {/* Live Pulse */}
        <LivePulseMonitor refreshTrigger={refreshTrigger} />

        {/* Control Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <EconomyControlPanel stats={economyStats} onRefresh={refresh} refreshTrigger={refreshTrigger} />
          <BattleControlPanel stats={battleStats} onRefresh={refresh} />
          <UserControlPanel stats={userStats} onRefresh={refresh} />
        </div>

        {/* Sponsor Board Control */}
        <SponsorControlPanel onRefresh={refresh} />

        {/* Affiliate Network Control */}
        <AffiliateControlPanel onRefresh={refresh} />

        {/* M4M Fund */}
        <M4MFundPanel />

        {/* Vault of Honor Metrics */}
        <VaultMetricsPanel />

        {/* Battle Directory - Full CRUD */}
        <BattleDirectoryPanel onRefresh={refresh} />

        {/* Tournament Queue */}
        <TournamentQueuePanel onRefresh={refresh} />

        {/* Tournament Manager */}
        <TournamentManagerPanel onRefresh={refresh} />

        {/* Audit Log */}
        <AuditLogViewer refreshTrigger={refreshTrigger} />
      </main>
    </div>
  );
};

export default SovereignHQ;
