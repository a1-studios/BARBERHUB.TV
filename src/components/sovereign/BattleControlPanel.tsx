import { useState } from 'react';
import { Swords, Play, Pause, Trophy, RotateCcw, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BattleControlPanelProps {
  stats: {
    active?: number;
    voting?: number;
    live?: number;
  };
  onRefresh: () => void;
}

const BattleControlPanel = ({ stats, onRefresh }: BattleControlPanelProps) => {
  const [modalOpen, setModalOpen] = useState<'status' | 'winner' | 'reset' | 'forfeit' | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    battle_id: '',
    new_status: '',
    winner_id: '',
    forfeit_user_id: '',
    reason: ''
  });

  const executeAction = async (action: string, params: any) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('sovereign-battle-control', {
        body: { action, ...params }
      });

      if (response.error) throw response.error;
      
      toast.success(`Battle ${action.replace('_', ' ')} completed`);
      onRefresh();
      setModalOpen(null);
      setFormData({ battle_id: '', new_status: '', winner_id: '', forfeit_user_id: '', reason: '' });
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-[#1a1a2e] border border-blue-900/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Swords className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-bold text-blue-400">BATTLE ORCHESTRATION</h3>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Active</div>
            <div className="text-2xl font-mono text-green-400">{stats?.active || 0}</div>
          </div>
          <div className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Voting</div>
            <div className="text-2xl font-mono text-yellow-400">{stats?.voting || 0}</div>
          </div>
          <div className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Live</div>
            <div className="text-2xl font-mono text-red-400">{stats?.live || 0}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="bg-purple-950/30 border-purple-700 text-purple-400 hover:bg-purple-900/50"
            onClick={() => setModalOpen('status')}
          >
            <Play className="h-4 w-4 mr-2" />
            Force Status
          </Button>
          <Button
            variant="outline"
            className="bg-yellow-950/30 border-yellow-700 text-yellow-400 hover:bg-yellow-900/50"
            onClick={() => setModalOpen('winner')}
          >
            <Trophy className="h-4 w-4 mr-2" />
            Override Winner
          </Button>
          <Button
            variant="outline"
            className="bg-cyan-950/30 border-cyan-700 text-cyan-400 hover:bg-cyan-900/50"
            onClick={() => setModalOpen('reset')}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Votes
          </Button>
          <Button
            variant="outline"
            className="bg-red-950/30 border-red-700 text-red-400 hover:bg-red-900/50"
            onClick={() => setModalOpen('forfeit')}
          >
            <Flag className="h-4 w-4 mr-2" />
            Force Forfeit
          </Button>
        </div>
      </div>

      {/* Force Status Modal */}
      <Dialog open={modalOpen === 'status'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#1a1a2e] border-purple-900/50">
          <DialogHeader>
            <DialogTitle className="text-purple-400 flex items-center gap-2">
              <Play className="h-5 w-5" /> Force Battle Status
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Change a battle's status to any state.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Battle ID</Label>
              <Input
                placeholder="UUID of battle"
                value={formData.battle_id}
                onChange={(e) => setFormData({ ...formData, battle_id: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">New Status</Label>
              <Select
                value={formData.new_status}
                onValueChange={(value) => setFormData({ ...formData, new_status: value })}
              >
                <SelectTrigger className="bg-[#0f0f1a] border-gray-700 text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-gray-700">
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="streaming">Streaming</SelectItem>
                  <SelectItem value="voting">Voting</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Reason</Label>
              <Textarea
                placeholder="Reason for status change"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              disabled={loading || !formData.battle_id || !formData.new_status}
              onClick={() => executeAction('force_status', {
                battle_id: formData.battle_id,
                new_status: formData.new_status,
                reason: formData.reason
              })}
            >
              {loading ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Winner Modal */}
      <Dialog open={modalOpen === 'winner'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#1a1a2e] border-yellow-900/50">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 flex items-center gap-2">
              <Trophy className="h-5 w-5" /> Override Winner
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Manually declare a battle winner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Battle ID</Label>
              <Input
                placeholder="UUID of battle"
                value={formData.battle_id}
                onChange={(e) => setFormData({ ...formData, battle_id: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Winner User ID</Label>
              <Input
                placeholder="UUID of winner"
                value={formData.winner_id}
                onChange={(e) => setFormData({ ...formData, winner_id: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Reason</Label>
              <Textarea
                placeholder="Reason for override"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)}>Cancel</Button>
            <Button
              className="bg-yellow-600 hover:bg-yellow-700 text-black"
              disabled={loading || !formData.battle_id || !formData.winner_id}
              onClick={() => executeAction('override_winner', {
                battle_id: formData.battle_id,
                winner_id: formData.winner_id,
                reason: formData.reason
              })}
            >
              {loading ? 'Setting...' : 'Set Winner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Votes Modal */}
      <Dialog open={modalOpen === 'reset'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#1a1a2e] border-cyan-900/50">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 flex items-center gap-2">
              <RotateCcw className="h-5 w-5" /> Reset Votes
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Clear all votes for a battle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Battle ID</Label>
              <Input
                placeholder="UUID of battle"
                value={formData.battle_id}
                onChange={(e) => setFormData({ ...formData, battle_id: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Reason</Label>
              <Textarea
                placeholder="Reason for resetting votes"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)}>Cancel</Button>
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              disabled={loading || !formData.battle_id}
              onClick={() => executeAction('reset_votes', {
                battle_id: formData.battle_id,
                reason: formData.reason
              })}
            >
              {loading ? 'Resetting...' : 'Reset Votes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Forfeit Modal */}
      <Dialog open={modalOpen === 'forfeit'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#1a1a2e] border-red-900/50">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <Flag className="h-5 w-5" /> Force Forfeit
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Force a participant to forfeit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Battle ID</Label>
              <Input
                placeholder="UUID of battle"
                value={formData.battle_id}
                onChange={(e) => setFormData({ ...formData, battle_id: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Forfeiting User ID</Label>
              <Input
                placeholder="UUID of user to forfeit"
                value={formData.forfeit_user_id}
                onChange={(e) => setFormData({ ...formData, forfeit_user_id: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Reason</Label>
              <Textarea
                placeholder="Reason for forfeit"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={loading || !formData.battle_id || !formData.forfeit_user_id}
              onClick={() => executeAction('force_forfeit', {
                battle_id: formData.battle_id,
                forfeit_user_id: formData.forfeit_user_id,
                reason: formData.reason
              })}
            >
              {loading ? 'Forfeiting...' : 'Force Forfeit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BattleControlPanel;
