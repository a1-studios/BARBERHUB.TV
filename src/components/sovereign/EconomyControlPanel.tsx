import { useState } from 'react';
import { Coins, Plus, Minus, ArrowRightLeft, TrendingUp } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EconomyControlPanelProps {
  stats: {
    total_supply?: number;
    transactions_24h?: number;
    users_with_bb?: number;
  };
  onRefresh: () => void;
  refreshTrigger?: number;
}

const EconomyControlPanel = ({ stats, onRefresh, refreshTrigger }: EconomyControlPanelProps) => {
  const [modalOpen, setModalOpen] = useState<'mint' | 'burn' | 'transfer' | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    target_user_id: '',
    from_user_id: '',
    to_user_id: '',
    amount: '',
    reason: ''
  });

  const executeAction = async (action: string, params: any) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('sovereign-economy-control', {
        body: { action, ...params }
      });

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

  return (
    <>
      <div className="bg-[#1a1a2e] border border-yellow-900/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-bold text-yellow-400">ECONOMY CONTROL</h3>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Total Supply</div>
            <div className="text-2xl font-mono text-yellow-400">
              {stats?.total_supply?.toLocaleString() || '0'}
            </div>
            <div className="text-xs text-gray-500">BB in circulation</div>
          </div>
          <div className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wide">24h Transactions</div>
            <div className="text-2xl font-mono text-blue-400">
              {stats?.transactions_24h?.toLocaleString() || '0'}
            </div>
            <div className="text-xs text-gray-500">transfers today</div>
          </div>
          <div className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Active Holders</div>
            <div className="text-2xl font-mono text-green-400">
              {stats?.users_with_bb?.toLocaleString() || '0'}
            </div>
            <div className="text-xs text-gray-500">users with BB</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="bg-green-950/30 border-green-700 text-green-400 hover:bg-green-900/50"
            onClick={() => setModalOpen('mint')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Mint BB
          </Button>
          <Button
            variant="outline"
            className="bg-red-950/30 border-red-700 text-red-400 hover:bg-red-900/50"
            onClick={() => setModalOpen('burn')}
          >
            <Minus className="h-4 w-4 mr-2" />
            Burn BB
          </Button>
          <Button
            variant="outline"
            className="bg-blue-950/30 border-blue-700 text-blue-400 hover:bg-blue-900/50"
            onClick={() => setModalOpen('transfer')}
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Force Transfer
          </Button>
        </div>
      </div>

      {/* Mint Modal */}
      <Dialog open={modalOpen === 'mint'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#1a1a2e] border-green-900/50">
          <DialogHeader>
            <DialogTitle className="text-green-400 flex items-center gap-2">
              <Plus className="h-5 w-5" /> Mint Barber Bucks
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Create new BB and add to a user's balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Target User ID</Label>
              <Input
                placeholder="UUID of recipient"
                value={formData.target_user_id}
                onChange={(e) => setFormData({ ...formData, target_user_id: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Amount</Label>
              <Input
                type="number"
                placeholder="Amount of BB to mint"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Reason</Label>
              <Textarea
                placeholder="Reason for minting (logged in audit)"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={loading || !formData.target_user_id || !formData.amount}
              onClick={() => executeAction('mint_bb', {
                target_user_id: formData.target_user_id,
                amount: parseInt(formData.amount),
                reason: formData.reason
              })}
            >
              {loading ? 'Minting...' : 'Mint BB'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Burn Modal */}
      <Dialog open={modalOpen === 'burn'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#1a1a2e] border-red-900/50">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <Minus className="h-5 w-5" /> Burn Barber Bucks
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Remove BB from a user's balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Target User ID</Label>
              <Input
                placeholder="UUID of user"
                value={formData.target_user_id}
                onChange={(e) => setFormData({ ...formData, target_user_id: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Amount</Label>
              <Input
                type="number"
                placeholder="Amount of BB to burn"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Reason</Label>
              <Textarea
                placeholder="Reason for burning (logged in audit)"
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
              disabled={loading || !formData.target_user_id || !formData.amount}
              onClick={() => executeAction('burn_bb', {
                target_user_id: formData.target_user_id,
                amount: parseInt(formData.amount),
                reason: formData.reason
              })}
            >
              {loading ? 'Burning...' : 'Burn BB'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Modal */}
      <Dialog open={modalOpen === 'transfer'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#1a1a2e] border-blue-900/50">
          <DialogHeader>
            <DialogTitle className="text-blue-400 flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" /> Force Transfer
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Transfer BB between users regardless of permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">From User ID</Label>
              <Input
                placeholder="UUID of sender"
                value={formData.from_user_id}
                onChange={(e) => setFormData({ ...formData, from_user_id: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">To User ID</Label>
              <Input
                placeholder="UUID of recipient"
                value={formData.to_user_id}
                onChange={(e) => setFormData({ ...formData, to_user_id: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Amount</Label>
              <Input
                type="number"
                placeholder="Amount to transfer"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Reason</Label>
              <Textarea
                placeholder="Reason for transfer"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loading || !formData.from_user_id || !formData.to_user_id || !formData.amount}
              onClick={() => executeAction('transfer_bb', {
                from_user_id: formData.from_user_id,
                to_user_id: formData.to_user_id,
                amount: parseInt(formData.amount),
                reason: formData.reason
              })}
            >
              {loading ? 'Transferring...' : 'Transfer BB'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EconomyControlPanel;
