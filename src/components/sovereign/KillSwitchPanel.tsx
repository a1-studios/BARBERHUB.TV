import { useState } from 'react';
import { AlertTriangle, Pause, Play, Lock, Unlock, Wrench, ShieldCheck } from 'lucide-react';
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
