import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
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
import MediaPipelinePanel from '@/components/sovereign/MediaPipelinePanel';

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
      const stateRes = await supabase.functions.invoke('sovereign-system-control', {
        body: { action: 'get_status' }
      });
      if (stateRes.data) setPlatformState(stateRes.data.platform_state || {});

      const econRes = await supabase.functions.invoke('sovereign-economy-control', {
        body: { action: 'get_stats' }
      });
      if (econRes.data) setEconomyStats(econRes.data);

      const userRes = await supabase.functions.invoke('sovereign-user-control', {
        body: { action: 'get_stats' }
      });
      if (userRes.data) setUserStats(userRes.data);

      const battleRes = await supabase.functions.invoke('sovereign-battle-control', {
        body: { action: 'get_battles', status_filter: 'all', limit: 100 }
      });
      if (battleRes.data?.battles) {
        const battles = battleRes.data.battles;
        setBattleStats({
          active: battles.filter((b: any) => ['live', 'streaming', 'upcoming'].includes(b.status)).length,
          voting: battles.filter((b: any) => b.status === 'voting').length,
          live: battles.filter((b: any) => b.status === 'live').length
        });
      }
    };

    fetchAllData();
  }, [refreshTrigger]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-orange-500" />
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">
                Sovereign HQ
              </h1>
              <p className="text-xs text-white/30">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span>Live</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 space-y-4">
        <KillSwitchPanel platformState={platformState} onRefresh={refresh} />
        <LivePulseMonitor refreshTrigger={refreshTrigger} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <EconomyControlPanel stats={economyStats} onRefresh={refresh} refreshTrigger={refreshTrigger} />
          <BattleControlPanel stats={battleStats} onRefresh={refresh} />
          <UserControlPanel stats={userStats} onRefresh={refresh} />
        </div>

        <SponsorControlPanel onRefresh={refresh} />
        <AffiliateControlPanel onRefresh={refresh} />
        <M4MFundPanel />
        <VaultMetricsPanel />
        <MediaPipelinePanel />
        <BattleDirectoryPanel onRefresh={refresh} />
        <TournamentQueuePanel onRefresh={refresh} />
        <TournamentManagerPanel onRefresh={refresh} />
        <AuditLogViewer refreshTrigger={refreshTrigger} />
      </main>
    </div>
  );
};

export default SovereignHQ;
