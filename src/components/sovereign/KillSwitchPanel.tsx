import { useEffect, useState } from 'react';
import { AlertTriangle, Pause, Play, Lock, Unlock, Wrench, ShieldCheck, Layers, Coins, Save, Swords, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface KillSwitchPanelProps {
  platformState: {
    battles_paused?: { value: string };
    economy_frozen?: { value: string };
    maintenance_mode?: { value: string };
    enforce_tiers?: { value: string };
    tiers_enabled?: { value: string };
    challenge_stakes_enabled?: { value: string };
    challenge_min_stake_bb?: { value: string };
    quick_play_enabled?: { value: string };
    quick_play_feed_publish?: { value: string };
    dev_mode?: { value: string };
  };
  onRefresh: () => void;
}

const KillSwitchPanel = ({ platformState, onRefresh }: KillSwitchPanelProps) => {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    title: string;
    description: string;
    confirmText: string;
  } | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);

  const battlesPaused = platformState?.battles_paused?.value === 'true';
  const economyFrozen = platformState?.economy_frozen?.value === 'true';
  const maintenanceMode = platformState?.maintenance_mode?.value === 'true';
  const tiersEnforced = platformState?.enforce_tiers?.value === 'true';
  // Default ON: only treated as disabled when value explicitly === 'false'
  const tiersEnabled = platformState?.tiers_enabled?.value !== 'false';
  // Default OFF: only treated as enabled when explicitly 'true'
  const stakesEnabled = platformState?.challenge_stakes_enabled?.value === 'true';
  // Quick Play — default ON (only disabled when explicitly 'false')
  const quickPlayEnabled = platformState?.quick_play_enabled?.value !== 'false';
  // Quick Play feed publish — default OFF (only ON when explicitly 'true')
  const quickPlayFeedEnabled = platformState?.quick_play_feed_publish?.value === 'true';
  const minStakeFromState = parseInt(platformState?.challenge_min_stake_bb?.value || '100', 10) || 100;
  // Developer Mode — default OFF (only enabled when explicitly 'true')
  const devModeEnabled = platformState?.dev_mode?.value === 'true';
  const [minStakeInput, setMinStakeInput] = useState<number>(minStakeFromState);
  const [savingMinStake, setSavingMinStake] = useState(false);

  // Keep input in sync if state changes from realtime/refresh
  useEffect(() => {
    setMinStakeInput(minStakeFromState);
  }, [minStakeFromState]);

  const saveMinStake = async () => {
    if (!minStakeInput || minStakeInput < 1) {
      toast.error('Minimum stake must be at least 1 BB');
      return;
    }
    setSavingMinStake(true);
    try {
      const response = await supabase.functions.invoke('sovereign-system-control', {
        body: { action: 'challenge_set_min_stake', min_stake_bb: minStakeInput }
      });
      if (response.error) throw response.error;
      toast.success(response.data.message || `Min stake set to ${minStakeInput} BB`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update min stake');
    } finally {
      setSavingMinStake(false);
    }
  };

  const executeAction = async (action: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await supabase.functions.invoke('sovereign-system-control', {
        body: { action }
      });

      if (response.error) throw response.error;

      toast.success(response.data.message || `Action ${action} completed`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setLoading(false);
      setConfirmDialog(null);
      setConfirmInput('');
    }
  };

  const openConfirmDialog = (action: string, title: string, description: string, confirmText: string) => {
    setConfirmDialog({ open: true, action, title, description, confirmText });
  };

  return (
    <>
      <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-white">Kill Switches</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Battles Kill Switch */}
          <div className="p-4 rounded-lg bg-[#0a0a0f] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40 uppercase tracking-wider">Battles</span>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${battlesPaused ? 'bg-red-400' : 'bg-green-500'}`} />
                <span className={`text-[10px] ${battlesPaused ? 'text-red-400' : 'text-white/50'}`}>
                  {battlesPaused ? 'PAUSED' : 'ACTIVE'}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-white/10 text-white hover:bg-white/[0.04] bg-transparent"
              disabled={loading}
              onClick={() => openConfirmDialog(
                battlesPaused ? 'resume_battles' : 'pause_battles',
                battlesPaused ? 'Resume Battles' : 'Pause All Battles',
                battlesPaused 
                  ? 'This will allow new battles to start.'
                  : 'This will immediately pause ALL active battles. Type PAUSE to confirm.',
                battlesPaused ? 'RESUME' : 'PAUSE'
              )}
            >
              {battlesPaused ? <Play className="h-3 w-3 mr-2" /> : <Pause className="h-3 w-3 mr-2" />}
              {battlesPaused ? 'Resume' : 'Pause All'}
            </Button>
          </div>

          {/* Economy Kill Switch */}
          <div className="p-4 rounded-lg bg-[#0a0a0f] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40 uppercase tracking-wider">Economy</span>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${economyFrozen ? 'bg-red-400' : 'bg-green-500'}`} />
                <span className={`text-[10px] ${economyFrozen ? 'text-red-400' : 'text-white/50'}`}>
                  {economyFrozen ? 'FROZEN' : 'ACTIVE'}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-white/10 text-white hover:bg-white/[0.04] bg-transparent"
              disabled={loading}
              onClick={() => openConfirmDialog(
                economyFrozen ? 'unfreeze_economy' : 'freeze_economy',
                economyFrozen ? 'Unfreeze Economy' : 'Freeze Economy',
                economyFrozen 
                  ? 'This will allow BB transactions to resume.'
                  : 'This will block ALL Barber Bucks transactions. Type FREEZE to confirm.',
                economyFrozen ? 'UNFREEZE' : 'FREEZE'
              )}
            >
              {economyFrozen ? <Unlock className="h-3 w-3 mr-2" /> : <Lock className="h-3 w-3 mr-2" />}
              {economyFrozen ? 'Unfreeze' : 'Freeze'}
            </Button>
          </div>

          {/* Maintenance Mode */}
          <div className="p-4 rounded-lg bg-[#0a0a0f] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40 uppercase tracking-wider">Maintenance</span>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${maintenanceMode ? 'bg-red-400' : 'bg-green-500'}`} />
                <span className={`text-[10px] ${maintenanceMode ? 'text-red-400' : 'text-white/50'}`}>
                  {maintenanceMode ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-white/10 text-white hover:bg-white/[0.04] bg-transparent"
              disabled={loading}
              onClick={() => openConfirmDialog(
                maintenanceMode ? 'exit_maintenance' : 'maintenance_mode',
                maintenanceMode ? 'Exit Maintenance' : 'Enable Maintenance Mode',
                maintenanceMode 
                  ? 'This will restore full platform operations.'
                  : 'This will freeze ALL operations. Type MAINTENANCE to confirm.',
                maintenanceMode ? 'EXIT' : 'MAINTENANCE'
              )}
            >
              <Wrench className="h-3 w-3 mr-2" />
              {maintenanceMode ? 'Exit' : 'Enable'}
            </Button>
          </div>

          {/* Tier Enforcement */}
          <div className="p-4 rounded-lg bg-[#0a0a0f] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40 uppercase tracking-wider">Tier Enforcement</span>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${tiersEnforced ? 'bg-green-500' : 'bg-orange-500'}`} />
                <span className={`text-[10px] ${tiersEnforced ? 'text-green-400' : 'text-orange-500'}`}>
                  {tiersEnforced ? 'ENFORCED' : 'TESTING'}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-white/10 text-white hover:bg-white/[0.04] bg-transparent"
              disabled={loading}
              onClick={() => openConfirmDialog(
                tiersEnforced ? 'enforce_tiers_off' : 'enforce_tiers_on',
                tiersEnforced ? 'Disable Tier Enforcement' : 'Enable Tier Enforcement',
                tiersEnforced
                  ? 'This will show ALL barbers on map regardless of subscription tier (QA mode).'
                  : 'This will restrict map & booking to Silver+ tier barbers only. Type ENFORCE to confirm.',
                tiersEnforced ? 'TESTING' : 'ENFORCE'
              )}
            >
              <ShieldCheck className="h-3 w-3 mr-2" />
              {tiersEnforced ? 'Switch to Testing' : 'Enforce Tiers'}
            </Button>
          </div>

          {/* Master Tier System Toggle */}
          <div className="p-4 rounded-lg bg-[#0a0a0f] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40 uppercase tracking-wider">Tier System</span>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${tiersEnabled ? 'bg-orange-500' : 'bg-white/20'}`} />
                <span className={`text-[10px] ${tiersEnabled ? 'text-orange-500' : 'text-white/40'}`}>
                  {tiersEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-white/10 text-white hover:bg-white/[0.04] bg-transparent"
              disabled={loading}
              onClick={() => openConfirmDialog(
                tiersEnabled ? 'tiers_disable' : 'tiers_enable',
                tiersEnabled ? 'Disable Tier System' : 'Enable Tier System',
                tiersEnabled
                  ? 'This will hide ALL tier UI (badges, rings, pricing cards, upgrade prompts) globally and treat every user as Standard. Type DISABLE to confirm.'
                  : 'This will re-enable the full tier subscription system across the platform. Type ENABLE to confirm.',
                tiersEnabled ? 'DISABLE' : 'ENABLE'
              )}
            >
              <Layers className="h-3 w-3 mr-2" />
              {tiersEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
          </div>

          {/* Challenge Stakes Toggle + Min Stake Configurator */}
          <div className="p-4 rounded-lg bg-[#0a0a0f] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40 uppercase tracking-wider">Challenge Stakes</span>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${stakesEnabled ? 'bg-orange-500' : 'bg-white/20'}`} />
                <span className={`text-[10px] ${stakesEnabled ? 'text-orange-500' : 'text-white/40'}`}>
                  {stakesEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-white/10 text-white hover:bg-white/[0.04] bg-transparent mb-2"
              disabled={loading}
              onClick={() => openConfirmDialog(
                stakesEnabled ? 'challenge_stakes_disable' : 'challenge_stakes_enable',
                stakesEnabled ? 'Disable Challenge Stakes' : 'Enable Challenge Stakes',
                stakesEnabled
                  ? 'Barbers will be able to challenge each other for FREE. Viewer donations will still build the winner\'s pot. Type DISABLE to confirm.'
                  : `Barbers will be required to lock at least ${minStakeFromState} BB to issue or accept challenges. Type ENABLE to confirm.`,
                stakesEnabled ? 'DISABLE' : 'ENABLE'
              )}
            >
              <Coins className="h-3 w-3 mr-2" />
              {stakesEnabled ? 'Disable' : 'Enable'}
            </Button>

            {stakesEnabled && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1.5">Min stake (BB)</label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    value={minStakeInput}
                    onChange={(e) => setMinStakeInput(parseInt(e.target.value, 10) || 0)}
                    className="bg-[#0a0a0f] border-white/10 text-white h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    className="h-8 px-2 bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={savingMinStake || minStakeInput === minStakeFromState || !minStakeInput}
                    onClick={saveMinStake}
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-[10px] text-white/30 mt-1">Current: {minStakeFromState} BB</p>
              </div>
            )}
          </div>

          {/* Quick Play (Unranked Challenges) — Master + Feed Publish */}
          <div className="p-4 rounded-lg bg-[#0a0a0f] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40 uppercase tracking-wider">Quick Play</span>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${quickPlayEnabled ? 'bg-orange-500' : 'bg-white/20'}`} />
                <span className={`text-[10px] ${quickPlayEnabled ? 'text-orange-500' : 'text-white/40'}`}>
                  {quickPlayEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-white/30 mb-2 leading-snug">
              Unranked barber-vs-barber matches. Tournament brackets & standings are unaffected.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-white/10 text-white hover:bg-white/[0.04] bg-transparent mb-2"
              disabled={loading}
              onClick={() => openConfirmDialog(
                quickPlayEnabled ? 'quick_play_disable' : 'quick_play_enable',
                quickPlayEnabled ? 'Disable Quick Play' : 'Enable Quick Play',
                quickPlayEnabled
                  ? 'Hides all Quick Play entry points and rejects new challenge requests. In-flight challenges expire normally. Type DISABLE to confirm.'
                  : 'Allows barbers to issue and accept unranked challenges. Type ENABLE to confirm.',
                quickPlayEnabled ? 'DISABLE' : 'ENABLE'
              )}
            >
              <Swords className="h-3 w-3 mr-2" />
              {quickPlayEnabled ? 'Disable' : 'Enable'}
            </Button>

            {quickPlayEnabled && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Publish to Feed</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${quickPlayFeedEnabled ? 'bg-orange-500' : 'bg-white/20'}`} />
                    <span className={`text-[10px] ${quickPlayFeedEnabled ? 'text-orange-500' : 'text-white/40'}`}>
                      {quickPlayFeedEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-white/10 text-white hover:bg-white/[0.04] bg-transparent"
                  disabled={loading}
                  onClick={() => openConfirmDialog(
                    quickPlayFeedEnabled ? 'quick_play_feed_disable' : 'quick_play_feed_enable',
                    quickPlayFeedEnabled ? 'Hide Quick Play from Feed' : 'Publish Quick Play to Feed',
                    quickPlayFeedEnabled
                      ? 'Quick Play matches will stop appearing in the watch feed. Type HIDE to confirm.'
                      : 'Quick Play matches will start appearing in the watch feed alongside tournament battles. Type PUBLISH to confirm.',
                    quickPlayFeedEnabled ? 'HIDE' : 'PUBLISH'
                  )}
                >
                  {quickPlayFeedEnabled ? 'Hide from Feed' : 'Publish to Feed'}
                </Button>
              </div>
            )}
          </div>

          {/* Developer Mode — Sovereign-controlled */}
          <div className="p-4 rounded-lg bg-[#0a0a0f] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40 uppercase tracking-wider">Developer Mode</span>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${devModeEnabled ? 'bg-orange-500' : 'bg-green-500'}`} />
                <span className={`text-[10px] ${devModeEnabled ? 'text-orange-500' : 'text-green-400'}`}>
                  {devModeEnabled ? 'ENABLED (DEV)' : 'PRODUCTION'}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-white/30 mb-2 leading-snug">
              Bypasses tier limits, subscription checks, and gating across the entire app. Keep OFF in production.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-white/10 text-white hover:bg-white/[0.04] bg-transparent"
              disabled={loading}
              onClick={() => openConfirmDialog(
                devModeEnabled ? 'dev_mode_disable' : 'dev_mode_enable',
                devModeEnabled ? 'Disable Developer Mode' : 'Enable Developer Mode',
                devModeEnabled
                  ? 'Production gates will re-engage. Free users will hit tier limits, premium prompts will appear. Type DISABLE to confirm.'
                  : 'ALL tier limits, subscription checks, and gating will be bypassed platform-wide. ONLY for QA/staging. Type ENABLE to confirm.',
                devModeEnabled ? 'DISABLE' : 'ENABLE'
              )}
            >
              <Code2 className="h-3 w-3 mr-2" />
              {devModeEnabled ? 'Disable Dev Mode' : 'Enable Dev Mode'}
            </Button>
          </div>
        </div>


      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog?.open} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent className="bg-[#12121a] border-white/[0.06]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{confirmDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-white/40">
              {confirmDialog?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Input
              placeholder={`Type ${confirmDialog?.confirmText} to confirm`}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
              className="bg-[#0a0a0f] border-white/10 text-white"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-white/60 hover:bg-white/[0.04]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={confirmInput !== confirmDialog?.confirmText || loading}
              onClick={() => confirmDialog && executeAction(confirmDialog.action)}
            >
              {loading ? 'Executing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default KillSwitchPanel;
