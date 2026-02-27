import { useState, useEffect, useCallback } from 'react';
import { Swords, Plus, Pencil, Trash2, Eye, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BattleDirectoryPanelProps {
  onRefresh: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'bg-blue-600',
  live: 'bg-red-600',
  streaming: 'bg-purple-600',
  voting: 'bg-yellow-600 text-black',
  completed: 'bg-green-600',
  cancelled: 'bg-gray-600',
  paused: 'bg-orange-600',
  awaiting_submissions: 'bg-cyan-600',
};

const BattleDirectoryPanel = ({ onRefresh }: BattleDirectoryPanelProps) => {
  const [battles, setBattles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState<'create' | 'edit' | 'details' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [selectedBattle, setSelectedBattle] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({
    title: '', category: '', status: 'upcoming', battle_type: '1v1',
    barber1_id: '', barber2_id: '', starts_at: '', voting_ends_at: '',
    description: '', prize_amount: 0, currency: 'USD',
  });
  const [actionLoading, setActionLoading] = useState(false);

  const invoke = useCallback(async (action: string, params: any) => {
    const res = await supabase.functions.invoke('sovereign-battle-control', { body: { action, ...params } });
    if (res.error) throw res.error;
    return res.data;
  }, []);

  const fetchBattles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke('get_battles', { status_filter: statusFilter, limit: 100 });
      setBattles(data?.battles || []);
      setTotal(data?.total || 0);
    } catch (e: any) {
      toast.error('Failed to load battles');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, invoke]);

  useEffect(() => { fetchBattles(); }, [fetchBattles]);

  const handleCreate = async () => {
    setActionLoading(true);
    try {
      await invoke('create_battle', { battle_data: formData });
      toast.success('Battle created');
      setModalOpen(null);
      fetchBattles();
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Create failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async () => {
    setActionLoading(true);
    try {
      await invoke('edit_battle', { battle_id: selectedBattle.id, battle_data: formData });
      toast.success('Battle updated');
      setModalOpen(null);
      fetchBattles();
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Edit failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await invoke('delete_battle', { battle_id: deleteTarget.id });
      toast.success(`Deleted: ${deleteTarget.title}`);
      setDeleteTarget(null);
      fetchBattles();
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (battle: any) => {
    setSelectedBattle(battle);
    setFormData({
      title: battle.title || '', category: battle.category || '', status: battle.status || 'upcoming',
      battle_type: battle.battle_type || '1v1', barber1_id: battle.barber1_id || '', barber2_id: battle.barber2_id || '',
      starts_at: battle.starts_at ? battle.starts_at.slice(0, 16) : '',
      voting_ends_at: battle.voting_ends_at ? battle.voting_ends_at.slice(0, 16) : '',
      description: battle.description || '', prize_amount: battle.prize_amount || 0, currency: battle.currency || 'USD',
    });
    setModalOpen('edit');
  };

  const openCreate = () => {
    setFormData({ title: '', category: '', status: 'upcoming', battle_type: '1v1', barber1_id: '', barber2_id: '', starts_at: '', voting_ends_at: '', description: '', prize_amount: 0, currency: 'USD' });
    setModalOpen('create');
  };

  const filteredBattles = battles.filter(b =>
    !search || b.title?.toLowerCase().includes(search.toLowerCase()) || b.category?.toLowerCase().includes(search.toLowerCase())
  );

  const BattleForm = () => (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-gray-300 text-xs">Title</Label>
          <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm" />
        </div>
        <div>
          <Label className="text-gray-300 text-xs">Category</Label>
          <Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. Speed Fade" className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-gray-300 text-xs">Status</Label>
          <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
            <SelectTrigger className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-gray-700">
              {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-300 text-xs">Battle Type</Label>
          <Select value={formData.battle_type} onValueChange={v => setFormData({ ...formData, battle_type: v })}>
            <SelectTrigger className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-gray-700">
              <SelectItem value="1v1">1v1</SelectItem>
              <SelectItem value="tournament">Tournament</SelectItem>
              <SelectItem value="open">Open</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-gray-300 text-xs">Barber 1 ID (user_id)</Label>
          <Input value={formData.barber1_id} onChange={e => setFormData({ ...formData, barber1_id: e.target.value })} className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm font-mono" placeholder="UUID" />
        </div>
        <div>
          <Label className="text-gray-300 text-xs">Barber 2 ID (user_id)</Label>
          <Input value={formData.barber2_id} onChange={e => setFormData({ ...formData, barber2_id: e.target.value })} className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm font-mono" placeholder="UUID" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-gray-300 text-xs">Starts At</Label>
          <Input type="datetime-local" value={formData.starts_at} onChange={e => setFormData({ ...formData, starts_at: e.target.value })} className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm" />
        </div>
        <div>
          <Label className="text-gray-300 text-xs">Voting Ends At</Label>
          <Input type="datetime-local" value={formData.voting_ends_at} onChange={e => setFormData({ ...formData, voting_ends_at: e.target.value })} className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-gray-300 text-xs">Prize Amount</Label>
          <Input type="number" value={formData.prize_amount} onChange={e => setFormData({ ...formData, prize_amount: Number(e.target.value) })} className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm" />
        </div>
        <div>
          <Label className="text-gray-300 text-xs">Currency</Label>
          <Select value={formData.currency} onValueChange={v => setFormData({ ...formData, currency: v })}>
            <SelectTrigger className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-gray-700">
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="BB">BB</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-gray-300 text-xs">Description</Label>
        <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm" />
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-[#1a1a2e] border border-blue-900/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-bold text-blue-400">BATTLE DIRECTORY</h3>
            <Badge variant="outline" className="border-blue-700 text-blue-400 text-xs">{total}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="bg-green-950/30 border-green-700 text-green-400 h-8" onClick={openCreate}>
              <Plus className="h-3 w-3 mr-1" /> New Battle
            </Button>
            <Button size="sm" variant="ghost" className="text-gray-400 h-8" onClick={fetchBattles} disabled={loading}>
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-3">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="flex-1">
            <TabsList className="bg-[#0f0f1a] border border-gray-800 h-8">
              {['all', 'upcoming', 'live', 'voting', 'completed', 'cancelled'].map(s => (
                <TabsTrigger key={s} value={s} className="text-xs h-6 data-[state=active]:bg-blue-900/50 data-[state=active]:text-blue-300">{s}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative w-48">
            <Search className="h-3 w-3 absolute left-2 top-2.5 text-gray-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-xs pl-7" />
          </div>
        </div>

        {/* Table */}
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800 hover:bg-transparent">
                <TableHead className="text-gray-500 text-xs">Title</TableHead>
                <TableHead className="text-gray-500 text-xs">Category</TableHead>
                <TableHead className="text-gray-500 text-xs">Matchup</TableHead>
                <TableHead className="text-gray-500 text-xs">Status</TableHead>
                <TableHead className="text-gray-500 text-xs">Type</TableHead>
                <TableHead className="text-gray-500 text-xs">Date</TableHead>
                <TableHead className="text-gray-500 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBattles.map(b => (
                <TableRow key={b.id} className="border-gray-800 hover:bg-blue-950/20">
                  <TableCell className="text-white text-xs font-medium max-w-[200px] truncate">{b.title}</TableCell>
                  <TableCell className="text-gray-400 text-xs">{b.category || '—'}</TableCell>
                  <TableCell className="text-xs">
                    <span className="text-cyan-400">{b.barber1?.display_name || '—'}</span>
                    <span className="text-gray-600 mx-1">vs</span>
                    <span className="text-orange-400">{b.barber2?.display_name || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${STATUS_COLORS[b.status] || 'bg-gray-600'} text-[10px] px-1.5 py-0`}>{b.status}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-400 text-xs">{b.battle_type}</TableCell>
                  <TableCell className="text-gray-500 text-xs">{b.starts_at ? new Date(b.starts_at).toLocaleDateString() : '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-white" onClick={() => { setSelectedBattle(b); setModalOpen('details'); }}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300" onClick={() => openEdit(b)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-300" onClick={() => setDeleteTarget(b)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBattles.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-gray-500 text-sm py-8">No battles found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={modalOpen === 'create'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#1a1a2e] border-green-900/50 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-green-400 flex items-center gap-2"><Plus className="h-5 w-5" /> Create Battle</DialogTitle>
            <DialogDescription className="text-gray-400">Sovereign override — create any battle.</DialogDescription>
          </DialogHeader>
          <BattleForm />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" disabled={actionLoading || !formData.title} onClick={handleCreate}>
              {actionLoading ? 'Creating...' : 'Create Battle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={modalOpen === 'edit'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#1a1a2e] border-blue-900/50 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-blue-400 flex items-center gap-2"><Pencil className="h-5 w-5" /> Edit Battle</DialogTitle>
            <DialogDescription className="text-gray-400">Modify any field — sovereign override.</DialogDescription>
          </DialogHeader>
          <BattleForm />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={actionLoading} onClick={handleEdit}>
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={modalOpen === 'details'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#1a1a2e] border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedBattle?.title}</DialogTitle>
            <DialogDescription className="text-gray-400">Battle ID: <span className="font-mono text-xs text-gray-500">{selectedBattle?.id}</span></DialogDescription>
          </DialogHeader>
          {selectedBattle && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-500">Status:</span> <Badge className={`${STATUS_COLORS[selectedBattle.status]} text-xs`}>{selectedBattle.status}</Badge></div>
                <div><span className="text-gray-500">Category:</span> <span className="text-white">{selectedBattle.category || '—'}</span></div>
                <div><span className="text-gray-500">Barber 1:</span> <span className="text-cyan-400">{selectedBattle.barber1?.display_name || selectedBattle.barber1_id || '—'}</span></div>
                <div><span className="text-gray-500">Barber 2:</span> <span className="text-orange-400">{selectedBattle.barber2?.display_name || selectedBattle.barber2_id || '—'}</span></div>
                <div><span className="text-gray-500">Votes:</span> <span className="text-white">{selectedBattle.vote_count1 || 0} — {selectedBattle.vote_count2 || 0}</span></div>
                <div><span className="text-gray-500">Prize:</span> <span className="text-yellow-400">{selectedBattle.prize_amount} {selectedBattle.currency}</span></div>
                <div><span className="text-gray-500">Starts:</span> <span className="text-white">{selectedBattle.starts_at ? new Date(selectedBattle.starts_at).toLocaleString() : '—'}</span></div>
                <div><span className="text-gray-500">Winner:</span> <span className="text-green-400">{selectedBattle.winner_id || '—'}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#1a1a2e] border-red-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Delete Battle</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Permanently delete "{deleteTarget?.title}" and all votes/submissions/participants. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete Forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BattleDirectoryPanel;
