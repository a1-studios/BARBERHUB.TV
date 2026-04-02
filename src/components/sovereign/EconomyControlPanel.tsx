import { useState } from 'react';
import { Coins, Plus, Minus, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EconomyControlPanelProps {
  stats: { total_supply?: number; transactions_24h?: number; users_with_bb?: number };
  onRefresh: () => void;
  refreshTrigger?: number;
}

const EconomyControlPanel = ({ stats, onRefresh }: EconomyControlPanelProps) => {
  const [modalOpen, setModalOpen] = useState<'mint' | 'burn' | 'transfer' | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    target_user_id: '', from_user_id: '', to_user_id: '', amount: '', reason: ''
  });

  const executeAction = async (action: string, params: any) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('sovereign-economy-control', { body: { action, ...params } });
      if (response.error) throw response.error;
      toast.success(`${action.replace('_', ' ')} completed successfully`);
      onRefresh();
      setModalOpen(null);
      setFormData({ target_user_id: '', from_user_id: '', to_user_id: '', amount: '', reason: '' });
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const modalInputClass = "bg-[#0a0a0f] border-white/10 text-white";
  const modalLabelClass = "text-white/40 text-xs";

  return (
    <>
      <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-white">Economy</h3>
        </div>

        <div className="space-y-3 mb-4">
          {[
            { label: 'Total Supply', value: stats?.total_supply?.toLocaleString() || '0' },
            { label: '24h Transactions', value: stats?.transactions_24h?.toLocaleString() || '0' },
            { label: 'Active Holders', value: stats?.users_with_bb?.toLocaleString() || '0' },
          ].map((s, i) => (
            <div key={i} className="bg-[#0a0a0f] p-3 rounded-lg border border-white/[0.06]">
              <div className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</div>
              <div className="text-xl font-semibold text-white mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Mint', icon: Plus, action: 'mint' as const },
            { label: 'Burn', icon: Minus, action: 'burn' as const },
            { label: 'Transfer', icon: ArrowRightLeft, action: 'transfer' as const },
          ].map((btn) => (
            <Button key={btn.action} variant="outline" size="sm"
              className="border-white/10 text-white hover:bg-white/[0.04] bg-transparent text-xs"
              onClick={() => setModalOpen(btn.action)}>
              <btn.icon className="h-3 w-3 mr-1.5" /> {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Mint Modal */}
      <Dialog open={modalOpen === 'mint'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#12121a] border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Plus className="h-4 w-4 text-orange-500" /> Mint BB</DialogTitle>
            <DialogDescription className="text-white/40">Create new BB and add to a user's balance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className={modalLabelClass}>Target User ID</Label><Input placeholder="UUID" value={formData.target_user_id} onChange={(e) => setFormData({ ...formData, target_user_id: e.target.value })} className={modalInputClass} /></div>
            <div><Label className={modalLabelClass}>Amount</Label><Input type="number" placeholder="Amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className={modalInputClass} /></div>
            <div><Label className={modalLabelClass}>Reason</Label><Textarea placeholder="Reason (logged)" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className={modalInputClass} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)} className="text-white/40 hover:bg-white/[0.04]">Cancel</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" disabled={loading || !formData.target_user_id || !formData.amount}
              onClick={() => executeAction('mint_bb', { target_user_id: formData.target_user_id, amount: parseInt(formData.amount), reason: formData.reason })}>
              {loading ? 'Minting...' : 'Mint BB'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Burn Modal */}
      <Dialog open={modalOpen === 'burn'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#12121a] border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Minus className="h-4 w-4 text-orange-500" /> Burn BB</DialogTitle>
            <DialogDescription className="text-white/40">Remove BB from a user's balance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className={modalLabelClass}>Target User ID</Label><Input placeholder="UUID" value={formData.target_user_id} onChange={(e) => setFormData({ ...formData, target_user_id: e.target.value })} className={modalInputClass} /></div>
            <div><Label className={modalLabelClass}>Amount</Label><Input type="number" placeholder="Amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className={modalInputClass} /></div>
            <div><Label className={modalLabelClass}>Reason</Label><Textarea placeholder="Reason (logged)" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className={modalInputClass} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)} className="text-white/40 hover:bg-white/[0.04]">Cancel</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" disabled={loading || !formData.target_user_id || !formData.amount}
              onClick={() => executeAction('burn_bb', { target_user_id: formData.target_user_id, amount: parseInt(formData.amount), reason: formData.reason })}>
              {loading ? 'Burning...' : 'Burn BB'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Modal */}
      <Dialog open={modalOpen === 'transfer'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#12121a] border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><ArrowRightLeft className="h-4 w-4 text-orange-500" /> Force Transfer</DialogTitle>
            <DialogDescription className="text-white/40">Transfer BB between users.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className={modalLabelClass}>From User ID</Label><Input placeholder="UUID" value={formData.from_user_id} onChange={(e) => setFormData({ ...formData, from_user_id: e.target.value })} className={modalInputClass} /></div>
            <div><Label className={modalLabelClass}>To User ID</Label><Input placeholder="UUID" value={formData.to_user_id} onChange={(e) => setFormData({ ...formData, to_user_id: e.target.value })} className={modalInputClass} /></div>
            <div><Label className={modalLabelClass}>Amount</Label><Input type="number" placeholder="Amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className={modalInputClass} /></div>
            <div><Label className={modalLabelClass}>Reason</Label><Textarea placeholder="Reason" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className={modalInputClass} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)} className="text-white/40 hover:bg-white/[0.04]">Cancel</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" disabled={loading || !formData.from_user_id || !formData.to_user_id || !formData.amount}
              onClick={() => executeAction('transfer_bb', { from_user_id: formData.from_user_id, to_user_id: formData.to_user_id, amount: parseInt(formData.amount), reason: formData.reason })}>
              {loading ? 'Transferring...' : 'Transfer BB'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EconomyControlPanel;
