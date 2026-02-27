import { useState, useEffect, useCallback } from 'react';
import { Trophy, Plus, Pencil, Eye, RefreshCw, Layers, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TournamentManagerPanelProps {
  onRefresh: () => void;
}

const TournamentManagerPanel = ({ onRefresh }: TournamentManagerPanelProps) => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState<'create' | 'edit' | 'details' | 'phase' | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [details, setDetails] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '', season: '', status: 'upcoming', start_date: '', end_date: '', description: '',
  });
  const [phaseForm, setPhaseForm] = useState({ phase_name: '', phase_type: 'qualification', phase_order: 1, status: 'pending' });

  const invoke = useCallback(async (action: string, params: any) => {
    const res = await supabase.functions.invoke('sovereign-battle-control', { body: { action, ...params } });
    if (res.error) throw res.error;
    return res.data;
  }, []);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke('get_tournaments', { limit: 50 });
      setTournaments(data?.tournaments || []);
    } catch {
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  const fetchDetails = async (tid: string) => {
    try {
      const data = await invoke('get_tournament_details', { tournament_id: tid });
      setDetails(data);
    } catch {
      toast.error('Failed to load details');
    }
  };

  const handleCreate = async () => {
    setActionLoading(true);
    try {
      await invoke('create_tournament', { tournament_data: formData });
      toast.success('Tournament created');
      setModalOpen(null);
      fetchTournaments();
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
      await invoke('edit_tournament', { tournament_id: selectedTournament.id, tournament_data: formData });
      toast.success('Tournament updated');
      setModalOpen(null);
      fetchTournaments();
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Edit failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePhase = async () => {
    setActionLoading(true);
    try {
      await invoke('create_phase', { tournament_id: selectedTournament.id, phase_data: phaseForm });
      toast.success('Phase created');
      setModalOpen(null);
      fetchDetails(selectedTournament.id);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateBracket = async (tid: string) => {
    setActionLoading(true);
    try {
      await invoke('generate_bracket', { tournament_id: tid, num_participants: 16 });
      toast.success('Bracket generated!');
      fetchDetails(tid);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (t: any) => {
    setSelectedTournament(t);
    setFormData({ name: t.name || '', season: t.season || '', status: t.status || 'upcoming', start_date: t.start_date ? t.start_date.slice(0, 10) : '', end_date: t.end_date ? t.end_date.slice(0, 10) : '', description: t.description || '' });
    setModalOpen('edit');
  };

  const openDetails = async (t: any) => {
    setSelectedTournament(t);
    await fetchDetails(t.id);
    setModalOpen('details');
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { upcoming: 'bg-blue-600', qualification: 'bg-cyan-600', elimination: 'bg-purple-600', completed: 'bg-green-600', cancelled: 'bg-gray-600' };
    return map[s] || 'bg-gray-600';
  };

  return (
    <>
      <div className="bg-[#1a1a2e] border border-amber-900/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-bold text-amber-400">TOURNAMENT MANAGER</h3>
            <Badge variant="outline" className="border-amber-700 text-amber-400 text-xs">{tournaments.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="bg-green-950/30 border-green-700 text-green-400 h-8" onClick={() => { setFormData({ name: '', season: '', status: 'upcoming', start_date: '', end_date: '', description: '' }); setModalOpen('create'); }}>
              <Plus className="h-3 w-3 mr-1" /> New Tournament
            </Button>
            <Button size="sm" variant="ghost" className="text-gray-400 h-8" onClick={fetchTournaments} disabled={loading}>
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="max-h-[350px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800 hover:bg-transparent">
                <TableHead className="text-gray-500 text-xs">Name</TableHead>
                <TableHead className="text-gray-500 text-xs">Season</TableHead>
                <TableHead className="text-gray-500 text-xs">Status</TableHead>
                <TableHead className="text-gray-500 text-xs">Dates</TableHead>
                <TableHead className="text-gray-500 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournaments.map(t => (
                <TableRow key={t.id} className="border-gray-800 hover:bg-amber-950/20">
                  <TableCell className="text-white text-xs font-medium">{t.name}</TableCell>
                  <TableCell className="text-gray-400 text-xs">{t.season || '—'}</TableCell>
                  <TableCell><Badge className={`${statusColor(t.status)} text-[10px] px-1.5 py-0`}>{t.status}</Badge></TableCell>
                  <TableCell className="text-gray-500 text-xs">
                    {t.start_date ? new Date(t.start_date).toLocaleDateString() : '—'} — {t.end_date ? new Date(t.end_date).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-white" onClick={() => openDetails(t)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300" onClick={() => openEdit(t)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-purple-400 hover:text-purple-300" onClick={() => handleGenerateBracket(t.id)} disabled={actionLoading} title="Generate Bracket">
                        <GitBranch className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tournaments.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-gray-500 text-sm py-8">No tournaments</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={modalOpen === 'create' || modalOpen === 'edit'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#1a1a2e] border-amber-900/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-400">{modalOpen === 'create' ? 'Create Tournament' : 'Edit Tournament'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-gray-300 text-xs">Name</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300 text-xs">Season</Label>
                <Input value={formData.season} onChange={e => setFormData({ ...formData, season: e.target.value })} className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm" placeholder="e.g. 2026" />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-gray-700">
                    {['upcoming', 'qualification', 'elimination', 'completed', 'cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300 text-xs">Start Date</Label>
                <Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm" />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">End Date</Label>
                <Input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-gray-300 text-xs">Description</Label>
              <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-black" disabled={actionLoading || !formData.name} onClick={modalOpen === 'create' ? handleCreate : handleEdit}>
              {actionLoading ? 'Saving...' : modalOpen === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={modalOpen === 'details'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#1a1a2e] border-gray-700 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" /> {selectedTournament?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              ID: <span className="font-mono text-xs">{selectedTournament?.id}</span>
            </DialogDescription>
          </DialogHeader>

          {details && (
            <div className="space-y-4">
              {/* Phases */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-1"><Layers className="h-4 w-4" /> Phases</h4>
                  <Button size="sm" variant="outline" className="h-6 text-xs border-cyan-700 text-cyan-400" onClick={() => { setPhaseForm({ phase_name: '', phase_type: 'qualification', phase_order: (details.phases?.length || 0) + 1, status: 'pending' }); setModalOpen('phase'); }}>
                    <Plus className="h-3 w-3 mr-1" /> Add Phase
                  </Button>
                </div>
                {details.phases?.length > 0 ? (
                  <div className="space-y-1">
                    {details.phases.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between bg-[#0f0f1a] p-2 rounded border border-gray-800 text-xs">
                        <span className="text-white">{p.phase_name}</span>
                        <div className="flex items-center gap-2">
                          <Badge className="text-[10px] bg-cyan-800">{p.phase_type}</Badge>
                          <Badge className={`text-[10px] ${p.status === 'active' ? 'bg-green-600' : p.status === 'completed' ? 'bg-gray-600' : 'bg-yellow-600 text-black'}`}>{p.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-500 text-xs">No phases yet</p>}
              </div>

              {/* Standings */}
              <div>
                <h4 className="text-sm font-bold text-green-400 mb-2">Standings ({details.standings?.length || 0})</h4>
                {details.standings?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800 hover:bg-transparent">
                        <TableHead className="text-gray-500 text-xs">#</TableHead>
                        <TableHead className="text-gray-500 text-xs">Barber</TableHead>
                        <TableHead className="text-gray-500 text-xs">Pts</TableHead>
                        <TableHead className="text-gray-500 text-xs">W/D/L</TableHead>
                        <TableHead className="text-gray-500 text-xs">MP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details.standings.map((s: any) => (
                        <TableRow key={s.id} className="border-gray-800">
                          <TableCell className="text-yellow-400 text-xs font-bold">{s.rank || '—'}</TableCell>
                          <TableCell className="text-white text-xs">{s.barber?.display_name || s.barber_id?.slice(0, 8)}</TableCell>
                          <TableCell className="text-white text-xs font-mono">{s.points}</TableCell>
                          <TableCell className="text-xs"><span className="text-green-400">{s.wins}</span>/<span className="text-gray-400">{s.draws}</span>/<span className="text-red-400">{s.losses}</span></TableCell>
                          <TableCell className="text-gray-400 text-xs">{s.matches_played}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-gray-500 text-xs">No standings yet</p>}
              </div>

              {/* Bracket Matches */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-purple-400 flex items-center gap-1"><GitBranch className="h-4 w-4" /> Bracket ({details.matches?.length || 0})</h4>
                  <Button size="sm" variant="outline" className="h-6 text-xs border-purple-700 text-purple-400" onClick={() => handleGenerateBracket(selectedTournament.id)} disabled={actionLoading}>
                    Generate Bracket
                  </Button>
                </div>
                {details.matches?.length > 0 ? (
                  <div className="space-y-1">
                    {details.matches.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between bg-[#0f0f1a] p-2 rounded border border-gray-800 text-xs">
                        <span className="text-gray-400">R{m.round_number} M{m.match_number}</span>
                        <span className="text-white">{m.round_name}</span>
                        <Badge className={`text-[10px] ${m.status === 'completed' ? 'bg-green-600' : m.status === 'in_progress' ? 'bg-red-600' : 'bg-gray-600'}`}>{m.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-500 text-xs">No bracket matches yet</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Phase Dialog */}
      <Dialog open={modalOpen === 'phase'} onOpenChange={() => setModalOpen('details')}>
        <DialogContent className="bg-[#1a1a2e] border-cyan-900/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Add Phase</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-gray-300 text-xs">Phase Name</Label>
              <Input value={phaseForm.phase_name} onChange={e => setPhaseForm({ ...phaseForm, phase_name: e.target.value })} className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300 text-xs">Type</Label>
                <Select value={phaseForm.phase_type} onValueChange={v => setPhaseForm({ ...phaseForm, phase_type: v })}>
                  <SelectTrigger className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-gray-700">
                    <SelectItem value="qualification">Qualification</SelectItem>
                    <SelectItem value="elimination">Elimination</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Order</Label>
                <Input type="number" value={phaseForm.phase_order} onChange={e => setPhaseForm({ ...phaseForm, phase_order: Number(e.target.value) })} className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen('details')}>Cancel</Button>
            <Button className="bg-cyan-600 hover:bg-cyan-700" disabled={actionLoading || !phaseForm.phase_name} onClick={handleCreatePhase}>
              {actionLoading ? 'Creating...' : 'Create Phase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TournamentManagerPanel;
