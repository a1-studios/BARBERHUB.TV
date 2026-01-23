import { useState } from 'react';
import { AlertTriangle, Pause, Play, Lock, Unlock, Wrench } from 'lucide-react';
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
      <div className="bg-[#1a1a2e] border border-red-900/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-bold text-red-400">KILL SWITCHES</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Battles Kill Switch */}
          <div className={`p-4 rounded-lg border ${battlesPaused ? 'bg-red-950/30 border-red-700' : 'bg-[#0f0f1a] border-gray-800'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Battles</span>
              <span className={`text-xs px-2 py-1 rounded ${battlesPaused ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                {battlesPaused ? 'PAUSED' : 'ACTIVE'}
              </span>
            </div>
            <Button
              variant={battlesPaused ? 'default' : 'destructive'}
              size="sm"
              className="w-full"
              disabled={loading}
              onClick={() => openConfirmDialog(
                battlesPaused ? 'resume_battles' : 'pause_battles',
                battlesPaused ? 'Resume Battles' : 'Pause All Battles',
                battlesPaused 
                  ? 'This will allow new battles to start. Paused battles must be restarted manually.'
                  : 'This will immediately pause ALL active battles. Type PAUSE to confirm.',
                battlesPaused ? 'RESUME' : 'PAUSE'
              )}
            >
              {battlesPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
              {battlesPaused ? 'Resume' : 'Pause All'}
            </Button>
          </div>

          {/* Economy Kill Switch */}
          <div className={`p-4 rounded-lg border ${economyFrozen ? 'bg-red-950/30 border-red-700' : 'bg-[#0f0f1a] border-gray-800'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Economy</span>
              <span className={`text-xs px-2 py-1 rounded ${economyFrozen ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                {economyFrozen ? 'FROZEN' : 'ACTIVE'}
              </span>
            </div>
            <Button
              variant={economyFrozen ? 'default' : 'destructive'}
              size="sm"
              className="w-full"
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
              {economyFrozen ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              {economyFrozen ? 'Unfreeze' : 'Freeze'}
            </Button>
          </div>

          {/* Maintenance Mode */}
          <div className={`p-4 rounded-lg border ${maintenanceMode ? 'bg-orange-950/30 border-orange-700' : 'bg-[#0f0f1a] border-gray-800'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Maintenance</span>
              <span className={`text-xs px-2 py-1 rounded ${maintenanceMode ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'}`}>
                {maintenanceMode ? 'ON' : 'OFF'}
              </span>
            </div>
            <Button
              variant={maintenanceMode ? 'default' : 'destructive'}
              size="sm"
              className="w-full"
              disabled={loading}
              onClick={() => openConfirmDialog(
                maintenanceMode ? 'exit_maintenance' : 'maintenance_mode',
                maintenanceMode ? 'Exit Maintenance' : 'Enable Maintenance Mode',
                maintenanceMode 
                  ? 'This will restore full platform operations.'
                  : 'This will freeze ALL operations (battles + economy). Type MAINTENANCE to confirm.',
                maintenanceMode ? 'EXIT' : 'MAINTENANCE'
              )}
            >
              <Wrench className="h-4 w-4 mr-2" />
              {maintenanceMode ? 'Exit' : 'Enable'}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog?.open} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent className="bg-[#1a1a2e] border-red-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">{confirmDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {confirmDialog?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Input
              placeholder={`Type ${confirmDialog?.confirmText} to confirm`}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
              className="bg-[#0f0f1a] border-gray-700 text-white"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-gray-300 hover:bg-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
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
