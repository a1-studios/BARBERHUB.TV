import { useState } from 'react';
import { Swords, Play, Pause, Trophy, RotateCcw, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BattleControlPanelProps {
  stats: { active?: number; voting?: number; live?: number };
  onRefresh: () => void;
}

const BattleControlPanel = ({ stats, onRefresh }: BattleControlPanelProps) => {
  const [modalOpen, setModalOpen] = useState<'status' | 'winner' | 'reset' | 'forfeit' | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ battle_id: '', new_status: '', winner_id: '', forfeit_user_id: '', reason: '' });

  const executeAction = async (action: string, params: any) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('sovereign-battle-control', { body: { action, ...params } });
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

  const inputClass = "bg-[#0a0a0f] border-white/10 text-white";
  const labelClass = "text-white/40 text-xs";

  return (
    <>
      <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Swords className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-white">Battles</h3>
        </div>

        <div className="space-y-3 mb-4">
          {[
            { label: 'Active', value: stats?.active || 0 },
            { label: 'Voting', value: stats?.voting || 0 },
            { label: 'Live', value: stats?.live || 0 },
          ].map((s, i) => (
            <div key={i} className="bg-[#0a0a0f] p-3 rounded-lg border border-white/[0.06]">
              <div className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</div>
              <div className="text-xl font-semibold text-white mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Force Status', icon: Play, key: 'status' as const },
            { label: 'Override Winner', icon: Trophy, key: 'winner' as const },
            { label: 'Reset Votes', icon: RotateCcw, key: 'reset' as const },
            { label: 'Force Forfeit', icon: Flag, key: 'forfeit' as const },
          ].map((btn) => (
            <Button key={btn.key} variant="outline" size="sm"
              className="border-white/10 text-white hover:bg-white/[0.04] bg-transparent text-xs"
              onClick={() => setModalOpen(btn.key)}>
              <btn.icon className="h-3 w-3 mr-1.5" /> {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Force Status Modal */}
      <Dialog open={modalOpen === 'status'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#12121a] border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Play className="h-4 w-4 text-orange-500" /> Force Status</DialogTitle>
            <DialogDescription className="text-white/40">Change a battle's status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className={labelClass}>Battle ID</Label><Input placeholder="UUID" value={formData.battle_id} onChange={(e) => setFormData({ ...formData, battle_id: e.target.value })} className={inputClass} /></div>
            <div><Label className={labelClass}>New Status</Label>
              <Select value={formData.new_status} onValueChange={(v) => setFormData({ ...formData, new_status: v })}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent className="bg-[#12121a] border-white/10">
                  {['upcoming', 'live', 'streaming', 'voting', 'completed', 'cancelled', 'paused'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className={labelClass}>Reason</Label><Textarea placeholder="Reason" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className={inputClass} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)} className="text-white/40">Cancel</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" disabled={loading || !formData.battle_id || !formData.new_status}
              onClick={() => executeAction('force_status', { battle_id: formData.battle_id, new_status: formData.new_status, reason: formData.reason })}>
              {loading ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Winner Modal */}
      <Dialog open={modalOpen === 'winner'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#12121a] border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Trophy className="h-4 w-4 text-orange-500" /> Override Winner</DialogTitle>
            <DialogDescription className="text-white/40">Manually declare a winner.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className={labelClass}>Battle ID</Label><Input placeholder="UUID" value={formData.battle_id} onChange={(e) => setFormData({ ...formData, battle_id: e.target.value })} className={inputClass} /></div>
            <div><Label className={labelClass}>Winner User ID</Label><Input placeholder="UUID" value={formData.winner_id} onChange={(e) => setFormData({ ...formData, winner_id: e.target.value })} className={inputClass} /></div>
            <div><Label className={labelClass}>Reason</Label><Textarea placeholder="Reason" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className={inputClass} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)} className="text-white/40">Cancel</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" disabled={loading || !formData.battle_id || !formData.winner_id}
              onClick={() => executeAction('override_winner', { battle_id: formData.battle_id, winner_id: formData.winner_id, reason: formData.reason })}>
              {loading ? 'Setting...' : 'Set Winner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Votes Modal */}
      <Dialog open={modalOpen === 'reset'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#12121a] border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><RotateCcw className="h-4 w-4 text-orange-500" /> Reset Votes</DialogTitle>
            <DialogDescription className="text-white/40">Clear all votes for a battle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className={labelClass}>Battle ID</Label><Input placeholder="UUID" value={formData.battle_id} onChange={(e) => setFormData({ ...formData, battle_id: e.target.value })} className={inputClass} /></div>
            <div><Label className={labelClass}>Reason</Label><Textarea placeholder="Reason" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className={inputClass} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)} className="text-white/40">Cancel</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" disabled={loading || !formData.battle_id}
              onClick={() => executeAction('reset_votes', { battle_id: formData.battle_id, reason: formData.reason })}>
              {loading ? 'Resetting...' : 'Reset Votes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Forfeit Modal */}
      <Dialog open={modalOpen === 'forfeit'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#12121a] border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Flag className="h-4 w-4 text-red-400" /> Force Forfeit</DialogTitle>
            <DialogDescription className="text-white/40">Force a participant to forfeit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className={labelClass}>Battle ID</Label><Input placeholder="UUID" value={formData.battle_id} onChange={(e) => setFormData({ ...formData, battle_id: e.target.value })} className={inputClass} /></div>
            <div><Label className={labelClass}>Forfeiting User ID</Label><Input placeholder="UUID" value={formData.forfeit_user_id} onChange={(e) => setFormData({ ...formData, forfeit_user_id: e.target.value })} className={inputClass} /></div>
            <div><Label className={labelClass}>Reason</Label><Textarea placeholder="Reason" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className={inputClass} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)} className="text-white/40">Cancel</Button>
            <Button className="bg-red-500 hover:bg-red-600 text-white" disabled={loading || !formData.battle_id || !formData.forfeit_user_id}
              onClick={() => executeAction('force_forfeit', { battle_id: formData.battle_id, forfeit_user_id: formData.forfeit_user_id, reason: formData.reason })}>
              {loading ? 'Forfeiting...' : 'Force Forfeit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BattleControlPanel;
