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

interface BattleDirectoryPanelProps { onRefresh: () => void; }

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'bg-white/10 text-white/60', live: 'bg-red-500/20 text-red-400', streaming: 'bg-cyan-500/20 text-cyan-400',
  voting: 'bg-orange-500/20 text-orange-400', completed: 'bg-white/[0.06] text-white/40', cancelled: 'bg-white/[0.04] text-white/20',
  paused: 'bg-red-500/10 text-red-300', awaiting_submissions: 'bg-cyan-500/10 text-cyan-300',
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
    title: '', category: '', status: 'upcoming', battle_type: '1v1', barber1_id: '', barber2_id: '', starts_at: '', voting_ends_at: '', description: '', prize_amount: 0, currency: 'USD',
  });
  const [actionLoading, setActionLoading] = useState(false);

  const invoke = useCallback(async (action: string, params: any) => {
    const res = await supabase.functions.invoke('sovereign-battle-control', { body: { action, ...params } });
    if (res.error) throw res.error; return res.data;
  }, []);

  const fetchBattles = useCallback(async () => {
    setLoading(true);
    try { const data = await invoke('get_battles', { status_filter: statusFilter, limit: 100 }); setBattles(data?.battles || []); setTotal(data?.total || 0); }
    catch { toast.error('Failed to load battles'); } finally { setLoading(false); }
  }, [statusFilter, invoke]);

  useEffect(() => { fetchBattles(); }, [fetchBattles]);

  const handleCreate = async () => { setActionLoading(true); try { await invoke('create_battle', { battle_data: formData }); toast.success('Battle created'); setModalOpen(null); fetchBattles(); onRefresh(); } catch (e: any) { toast.error(e.message || 'Failed'); } finally { setActionLoading(false); } };
  const handleEdit = async () => { setActionLoading(true); try { await invoke('edit_battle', { battle_id: selectedBattle.id, battle_data: formData }); toast.success('Battle updated'); setModalOpen(null); fetchBattles(); onRefresh(); } catch (e: any) { toast.error(e.message || 'Failed'); } finally { setActionLoading(false); } };
  const handleDelete = async () => { setActionLoading(true); try { await invoke('delete_battle', { battle_id: deleteTarget.id }); toast.success(`Deleted: ${deleteTarget.title}`); setDeleteTarget(null); fetchBattles(); onRefresh(); } catch (e: any) { toast.error(e.message || 'Failed'); } finally { setActionLoading(false); } };

  const openEdit = (battle: any) => {
    setSelectedBattle(battle);
    setFormData({ title: battle.title || '', category: battle.category || '', status: battle.status || 'upcoming', battle_type: battle.battle_type || '1v1', barber1_id: battle.barber1_id || '', barber2_id: battle.barber2_id || '', starts_at: battle.starts_at ? battle.starts_at.slice(0, 16) : '', voting_ends_at: battle.voting_ends_at ? battle.voting_ends_at.slice(0, 16) : '', description: battle.description || '', prize_amount: battle.prize_amount || 0, currency: battle.currency || 'USD' });
    setModalOpen('edit');
  };

  const openCreate = () => { setFormData({ title: '', category: '', status: 'upcoming', battle_type: '1v1', barber1_id: '', barber2_id: '', starts_at: '', voting_ends_at: '', description: '', prize_amount: 0, currency: 'USD' }); setModalOpen('create'); };
  const filteredBattles = battles.filter(b => !search || b.title?.toLowerCase().includes(search.toLowerCase()) || b.category?.toLowerCase().includes(search.toLowerCase()));

  const inputClass = "bg-[#0a0a0f] border-white/10 text-white h-8 text-sm";
  const labelClass = "text-white/40 text-xs";

  const BattleForm = () => (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className={labelClass}>Title</Label><Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className={inputClass} /></div>
        <div><Label className={labelClass}>Category</Label><Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. Speed Fade" className={inputClass} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className={labelClass}>Status</Label><Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent className="bg-[#12121a] border-white/10">{Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div><Label className={labelClass}>Battle Type</Label><Select value={formData.battle_type} onValueChange={v => setFormData({ ...formData, battle_type: v })}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent className="bg-[#12121a] border-white/10"><SelectItem value="1v1">1v1</SelectItem><SelectItem value="tournament">Tournament</SelectItem><SelectItem value="open">Open</SelectItem></SelectContent></Select></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className={labelClass}>Barber 1 ID</Label><Input value={formData.barber1_id} onChange={e => setFormData({ ...formData, barber1_id: e.target.value })} className={`${inputClass} font-mono`} placeholder="UUID" /></div>
        <div><Label className={labelClass}>Barber 2 ID</Label><Input value={formData.barber2_id} onChange={e => setFormData({ ...formData, barber2_id: e.target.value })} className={`${inputClass} font-mono`} placeholder="UUID" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className={labelClass}>Starts At</Label><Input type="datetime-local" value={formData.starts_at} onChange={e => setFormData({ ...formData, starts_at: e.target.value })} className={inputClass} /></div>
        <div><Label className={labelClass}>Voting Ends</Label><Input type="datetime-local" value={formData.voting_ends_at} onChange={e => setFormData({ ...formData, voting_ends_at: e.target.value })} className={inputClass} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className={labelClass}>Prize Amount</Label><Input type="number" value={formData.prize_amount} onChange={e => setFormData({ ...formData, prize_amount: Number(e.target.value) })} className={inputClass} /></div>
        <div><Label className={labelClass}>Currency</Label><Select value={formData.currency} onValueChange={v => setFormData({ ...formData, currency: v })}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent className="bg-[#12121a] border-white/10"><SelectItem value="USD">USD</SelectItem><SelectItem value="BB">BB</SelectItem></SelectContent></Select></div>
      </div>
      <div><Label className={labelClass}>Description</Label><Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className={inputClass} /></div>
    </div>
  );

  return (
    <>
      <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-white">Battle Directory</h3>
            <span className="text-xs text-white/30">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/[0.04] h-8 text-xs" onClick={openCreate}><Plus className="h-3 w-3 mr-1" /> New</Button>
            <Button size="sm" variant="ghost" className="text-white/30 h-8" onClick={fetchBattles} disabled={loading}><RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /></Button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="flex-1">
            <TabsList className="bg-[#0a0a0f] border border-white/[0.06] h-8">
              {['all', 'upcoming', 'live', 'voting', 'completed', 'cancelled'].map(s => (
                <TabsTrigger key={s} value={s} className="text-xs h-6 data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/30">{s}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative w-48">
            <Search className="h-3 w-3 absolute left-2 top-2.5 text-white/20" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-[#0a0a0f] border-white/10 text-white h-8 text-xs pl-7" />
          </div>
        </div>

        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                {['Title', 'Category', 'Matchup', 'Status', 'Type', 'Date', ''].map(h => (
                  <TableHead key={h} className="text-white/30 text-xs">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBattles.map(b => (
                <TableRow key={b.id} className="border-white/[0.06] hover:bg-white/[0.02]">
                  <TableCell className="text-white text-xs font-medium max-w-[200px] truncate">{b.title}</TableCell>
                  <TableCell className="text-white/40 text-xs">{b.category || '—'}</TableCell>
                  <TableCell className="text-xs"><span className="text-cyan-400">{b.barber1?.display_name || '—'}</span><span className="text-white/20 mx-1">vs</span><span className="text-orange-400">{b.barber2?.display_name || '—'}</span></TableCell>
                  <TableCell><Badge className={`${STATUS_COLORS[b.status] || 'bg-white/[0.04] text-white/30'} text-[10px] px-1.5 py-0 border-0`}>{b.status}</Badge></TableCell>
                  <TableCell className="text-white/40 text-xs">{b.battle_type}</TableCell>
                  <TableCell className="text-white/20 text-xs">{b.starts_at ? new Date(b.starts_at).toLocaleDateString() : '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/20 hover:text-white" onClick={() => { setSelectedBattle(b); setModalOpen('details'); }}><Eye className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/30 hover:text-white" onClick={() => openEdit(b)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/20 hover:text-red-400" onClick={() => setDeleteTarget(b)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBattles.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-white/30 text-sm py-8">No battles found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={modalOpen === 'create'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#12121a] border-white/[0.06] max-w-lg">
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><Plus className="h-4 w-4 text-orange-500" /> Create Battle</DialogTitle></DialogHeader>
          <BattleForm />
          <DialogFooter><Button variant="ghost" onClick={() => setModalOpen(null)} className="text-white/40">Cancel</Button><Button className="bg-orange-500 hover:bg-orange-600" disabled={actionLoading || !formData.title} onClick={handleCreate}>{actionLoading ? 'Creating...' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen === 'edit'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#12121a] border-white/[0.06] max-w-lg">
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><Pencil className="h-4 w-4 text-orange-500" /> Edit Battle</DialogTitle></DialogHeader>
          <BattleForm />
          <DialogFooter><Button variant="ghost" onClick={() => setModalOpen(null)} className="text-white/40">Cancel</Button><Button className="bg-orange-500 hover:bg-orange-600" disabled={actionLoading} onClick={handleEdit}>{actionLoading ? 'Saving...' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen === 'details'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#12121a] border-white/[0.06] max-w-lg">
          <DialogHeader><DialogTitle className="text-white">{selectedBattle?.title}</DialogTitle><DialogDescription className="text-white/20 font-mono text-xs">{selectedBattle?.id}</DialogDescription></DialogHeader>
          {selectedBattle && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-white/30">Status:</span> <Badge className={`${STATUS_COLORS[selectedBattle.status]} text-xs border-0`}>{selectedBattle.status}</Badge></div>
                <div><span className="text-white/30">Category:</span> <span className="text-white">{selectedBattle.category || '—'}</span></div>
                <div><span className="text-white/30">Barber 1:</span> <span className="text-cyan-400">{selectedBattle.barber1?.display_name || '—'}</span></div>
                <div><span className="text-white/30">Barber 2:</span> <span className="text-orange-400">{selectedBattle.barber2?.display_name || '—'}</span></div>
                <div><span className="text-white/30">Votes:</span> <span className="text-white">{selectedBattle.vote_count1 || 0} — {selectedBattle.vote_count2 || 0}</span></div>
                <div><span className="text-white/30">Prize:</span> <span className="text-white">{selectedBattle.prize_amount} {selectedBattle.currency}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#12121a] border-white/[0.06] text-white">
          <AlertDialogHeader><AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle><AlertDialogDescription className="text-white/40">This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="border-white/10 text-white/40 bg-transparent">Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-500 hover:bg-red-600" disabled={actionLoading} onClick={handleDelete}>{actionLoading ? 'Deleting...' : 'Delete'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BattleDirectoryPanel;
