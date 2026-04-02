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

interface TournamentManagerPanelProps { onRefresh: () => void; }

const TournamentManagerPanel = ({ onRefresh }: TournamentManagerPanelProps) => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState<'create' | 'edit' | 'details' | 'phase' | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [details, setDetails] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({ name: '', season: '', status: 'upcoming', start_date: '', end_date: '', description: '' });
  const [phaseForm, setPhaseForm] = useState({ phase_name: '', phase_type: 'qualification', phase_order: 1, status: 'pending' });

  const invoke = useCallback(async (action: string, params: any) => {
    const res = await supabase.functions.invoke('sovereign-battle-control', { body: { action, ...params } });
    if (res.error) throw res.error; return res.data;
  }, []);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try { const data = await invoke('get_tournaments', { limit: 50 }); setTournaments(data?.tournaments || []); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, [invoke]);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  const fetchDetails = async (tid: string) => { try { const data = await invoke('get_tournament_details', { tournament_id: tid }); setDetails(data); } catch { toast.error('Failed'); } };
  const handleCreate = async () => { setActionLoading(true); try { await invoke('create_tournament', { tournament_data: formData }); toast.success('Created'); setModalOpen(null); fetchTournaments(); onRefresh(); } catch (e: any) { toast.error(e.message || 'Failed'); } finally { setActionLoading(false); } };
  const handleEdit = async () => { setActionLoading(true); try { await invoke('edit_tournament', { tournament_id: selectedTournament.id, tournament_data: formData }); toast.success('Updated'); setModalOpen(null); fetchTournaments(); onRefresh(); } catch (e: any) { toast.error(e.message || 'Failed'); } finally { setActionLoading(false); } };
  const handleCreatePhase = async () => { setActionLoading(true); try { await invoke('create_phase', { tournament_id: selectedTournament.id, phase_data: phaseForm }); toast.success('Phase created'); setModalOpen(null); fetchDetails(selectedTournament.id); onRefresh(); } catch (e: any) { toast.error(e.message || 'Failed'); } finally { setActionLoading(false); } };
  const handleGenerateBracket = async (tid: string) => { setActionLoading(true); try { await invoke('generate_bracket', { tournament_id: tid, num_participants: 16 }); toast.success('Bracket generated!'); fetchDetails(tid); onRefresh(); } catch (e: any) { toast.error(e.message || 'Failed'); } finally { setActionLoading(false); } };

  const openEdit = (t: any) => { setSelectedTournament(t); setFormData({ name: t.name || '', season: t.season || '', status: t.status || 'upcoming', start_date: t.start_date ? t.start_date.slice(0, 10) : '', end_date: t.end_date ? t.end_date.slice(0, 10) : '', description: t.description || '' }); setModalOpen('edit'); };
  const openDetails = async (t: any) => { setSelectedTournament(t); await fetchDetails(t.id); setModalOpen('details'); };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { upcoming: 'bg-white/10 text-white/60', qualification: 'bg-cyan-500/20 text-cyan-400', elimination: 'bg-orange-500/20 text-orange-400', completed: 'bg-white/[0.06] text-white/40', cancelled: 'bg-white/[0.04] text-white/20' };
    return map[s] || 'bg-white/[0.04] text-white/30';
  };

  const inputClass = "bg-[#0a0a0f] border-white/10 text-white h-8 text-sm";
  const labelClass = "text-white/40 text-xs";

  return (
    <>
      <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-white">Tournaments</h3>
            <span className="text-xs text-white/30">{tournaments.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/[0.04] h-8 text-xs" onClick={() => { setFormData({ name: '', season: '', status: 'upcoming', start_date: '', end_date: '', description: '' }); setModalOpen('create'); }}>
              <Plus className="h-3 w-3 mr-1" /> New
            </Button>
            <Button size="sm" variant="ghost" className="text-white/30 h-8" onClick={fetchTournaments} disabled={loading}><RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /></Button>
          </div>
        </div>

        <div className="max-h-[350px] overflow-auto">
          <Table>
            <TableHeader><TableRow className="border-white/[0.06] hover:bg-transparent">
              {['Name', 'Season', 'Status', 'Dates', ''].map(h => <TableHead key={h} className="text-white/30 text-xs">{h}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>
              {tournaments.map(t => (
                <TableRow key={t.id} className="border-white/[0.06] hover:bg-white/[0.02]">
                  <TableCell className="text-white text-xs font-medium">{t.name}</TableCell>
                  <TableCell className="text-white/40 text-xs">{t.season || '—'}</TableCell>
                  <TableCell><Badge className={`${statusColor(t.status)} text-[10px] px-1.5 py-0 border-0`}>{t.status}</Badge></TableCell>
                  <TableCell className="text-white/20 text-xs">{t.start_date ? new Date(t.start_date).toLocaleDateString() : '—'} — {t.end_date ? new Date(t.end_date).toLocaleDateString() : '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/20 hover:text-white" onClick={() => openDetails(t)}><Eye className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/30 hover:text-white" onClick={() => openEdit(t)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/20 hover:text-orange-400" onClick={() => handleGenerateBracket(t.id)} disabled={actionLoading} title="Generate Bracket"><GitBranch className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tournaments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-white/30 text-sm py-8">No tournaments</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={modalOpen === 'create' || modalOpen === 'edit'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#12121a] border-white/[0.06] max-w-md">
          <DialogHeader><DialogTitle className="text-white">{modalOpen === 'create' ? 'Create Tournament' : 'Edit Tournament'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className={labelClass}>Name</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClass} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className={labelClass}>Season</Label><Input value={formData.season} onChange={e => setFormData({ ...formData, season: e.target.value })} className={inputClass} placeholder="e.g. 2026" /></div>
              <div><Label className={labelClass}>Status</Label><Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent className="bg-[#12121a] border-white/10">{['upcoming', 'qualification', 'elimination', 'completed', 'cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className={labelClass}>Start</Label><Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className={inputClass} /></div>
              <div><Label className={labelClass}>End</Label><Input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className={inputClass} /></div>
            </div>
            <div><Label className={labelClass}>Description</Label><Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className={inputClass} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setModalOpen(null)} className="text-white/40">Cancel</Button><Button className="bg-orange-500 hover:bg-orange-600" disabled={actionLoading || !formData.name} onClick={modalOpen === 'create' ? handleCreate : handleEdit}>{actionLoading ? 'Saving...' : modalOpen === 'create' ? 'Create' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen === 'details'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#12121a] border-white/[0.06] max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><Trophy className="h-4 w-4 text-orange-500" /> {selectedTournament?.name}</DialogTitle><DialogDescription className="text-white/20 font-mono text-xs">{selectedTournament?.id}</DialogDescription></DialogHeader>
          {details && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-cyan-400 flex items-center gap-1"><Layers className="h-3 w-3" /> Phases</h4>
                  <Button size="sm" variant="outline" className="h-6 text-xs border-white/10 text-cyan-400" onClick={() => { setPhaseForm({ phase_name: '', phase_type: 'qualification', phase_order: (details.phases?.length || 0) + 1, status: 'pending' }); setModalOpen('phase'); }}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                </div>
                {details.phases?.length > 0 ? details.phases.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between bg-[#0a0a0f] p-2 rounded border border-white/[0.06] text-xs mb-1">
                    <span className="text-white">{p.phase_name}</span>
                    <div className="flex items-center gap-2">
                      <Badge className="text-[10px] bg-cyan-500/20 text-cyan-400 border-0">{p.phase_type}</Badge>
                      <Badge className={`text-[10px] border-0 ${p.status === 'active' ? 'bg-white/10 text-white/60' : p.status === 'completed' ? 'bg-white/[0.04] text-white/30' : 'bg-orange-500/20 text-orange-400'}`}>{p.status}</Badge>
                    </div>
                  </div>
                )) : <p className="text-white/30 text-xs">No phases</p>}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-white/50 mb-2">Standings ({details.standings?.length || 0})</h4>
                {details.standings?.length > 0 ? (
                  <Table><TableHeader><TableRow className="border-white/[0.06]">{['#', 'Barber', 'Pts', 'W/D/L', 'MP'].map(h => <TableHead key={h} className="text-white/30 text-xs">{h}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>{details.standings.map((s: any) => (
                      <TableRow key={s.id} className="border-white/[0.06]">
                        <TableCell className="text-orange-400 text-xs font-semibold">{s.rank || '—'}</TableCell>
                        <TableCell className="text-white text-xs">{s.barber?.display_name || s.barber_id?.slice(0, 8)}</TableCell>
                        <TableCell className="text-white text-xs font-mono">{s.points}</TableCell>
                        <TableCell className="text-xs"><span className="text-green-400">{s.wins}</span>/<span className="text-white/30">{s.draws}</span>/<span className="text-red-400">{s.losses}</span></TableCell>
                        <TableCell className="text-white/40 text-xs">{s.matches_played}</TableCell>
                      </TableRow>
                    ))}</TableBody></Table>
                ) : <p className="text-white/30 text-xs">No standings</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-white/50 flex items-center gap-1"><GitBranch className="h-3 w-3" /> Bracket ({details.matches?.length || 0})</h4>
                  <Button size="sm" variant="outline" className="h-6 text-xs border-white/10 text-white/40" onClick={() => handleGenerateBracket(selectedTournament.id)} disabled={actionLoading}>Generate</Button>
                </div>
                {details.matches?.length > 0 ? details.matches.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between bg-[#0a0a0f] p-2 rounded border border-white/[0.06] text-xs mb-1">
                    <span className="text-white/30">R{m.round_number} M{m.match_number}</span>
                    <span className="text-white">{m.round_name}</span>
                    <Badge className={`text-[10px] border-0 ${m.status === 'completed' ? 'bg-white/[0.06] text-white/40' : m.status === 'in_progress' ? 'bg-red-500/20 text-red-400' : 'bg-white/[0.04] text-white/30'}`}>{m.status}</Badge>
                  </div>
                )) : <p className="text-white/30 text-xs">No bracket matches</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen === 'phase'} onOpenChange={() => setModalOpen('details')}>
        <DialogContent className="bg-[#12121a] border-white/[0.06] max-w-sm">
          <DialogHeader><DialogTitle className="text-white">Add Phase</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className={labelClass}>Phase Name</Label><Input value={phaseForm.phase_name} onChange={e => setPhaseForm({ ...phaseForm, phase_name: e.target.value })} className={inputClass} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className={labelClass}>Type</Label><Select value={phaseForm.phase_type} onValueChange={v => setPhaseForm({ ...phaseForm, phase_type: v })}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent className="bg-[#12121a] border-white/10"><SelectItem value="qualification">Qualification</SelectItem><SelectItem value="elimination">Elimination</SelectItem></SelectContent></Select></div>
              <div><Label className={labelClass}>Order</Label><Input type="number" value={phaseForm.phase_order} onChange={e => setPhaseForm({ ...phaseForm, phase_order: Number(e.target.value) })} className={inputClass} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setModalOpen('details')} className="text-white/40">Cancel</Button><Button className="bg-orange-500 hover:bg-orange-600" disabled={actionLoading || !phaseForm.phase_name} onClick={handleCreatePhase}>{actionLoading ? 'Creating...' : 'Create Phase'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TournamentManagerPanel;
