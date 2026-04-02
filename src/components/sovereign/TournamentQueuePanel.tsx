import { useState, useEffect, useCallback } from 'react';
import { Users, Zap, Trash2, RefreshCw, Link2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TournamentQueuePanelProps { onRefresh: () => void; }

const TournamentQueuePanel = ({ onRefresh }: TournamentQueuePanelProps) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('waiting');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [matchmakerLoading, setMatchmakerLoading] = useState(false);

  const invoke = useCallback(async (action: string, params: any) => {
    const res = await supabase.functions.invoke('sovereign-battle-control', { body: { action, ...params } });
    if (res.error) throw res.error; return res.data;
  }, []);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try { const data = await invoke('get_queue', { queue_status: statusFilter, category_filter: categoryFilter }); setEntries(data?.entries || []); setTotal(data?.total || 0); }
    catch { toast.error('Failed to load queue'); } finally { setLoading(false); }
  }, [statusFilter, categoryFilter, invoke]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const toggleSelect = (id: string) => { setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); };
  const handleRemove = async (id: string) => { try { await invoke('remove_queue_entry', { queue_entry_id: id }); toast.success('Removed'); fetchQueue(); onRefresh(); } catch (e: any) { toast.error(e.message || 'Failed'); } };

  const handleForceMatch = async () => {
    const ids = Array.from(selected); if (ids.length !== 2) { toast.error('Select exactly 2'); return; }
    try { const data = await invoke('force_match', { queue_entry_ids: ids }); toast.success(`Matched! Battle: ${data.battle?.id}`); setSelected(new Set()); fetchQueue(); onRefresh(); }
    catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const handleExecuteMatch = async () => {
    const ids = Array.from(selected); if (ids.length !== 2) { toast.error('Select exactly 2'); return; }
    try {
      const data = await invoke('force_match', { queue_entry_ids: ids }); const battleId = data.battle?.id; toast.success(`Match created! Battle: ${battleId}`);
      if (battleId) { try { const smsRes = await supabase.functions.invoke('send-match-sms', { body: { battle_id: battleId, barber1_user_id: data.battle?.barber1_user_id, barber2_user_id: data.battle?.barber2_user_id } }); if (smsRes.data?.sent > 0) toast.success(`SMS sent to ${smsRes.data.sent} barber(s)`); } catch { toast.info('Match created but SMS failed'); } }
      setSelected(new Set()); fetchQueue(); onRefresh();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const triggerMatchmaker = async () => {
    setMatchmakerLoading(true);
    try { const res = await supabase.functions.invoke('tournament-matchmaker'); if (res.error) throw res.error; toast.success(`Matchmaker: ${res.data.matches_created || 0} matches`); fetchQueue(); onRefresh(); }
    catch (e: any) { toast.error(e.message || 'Failed'); } finally { setMatchmakerLoading(false); }
  };

  const waitingCount = entries.filter(e => e.status === 'waiting').length;
  const categories = [...new Set(entries.map(e => e.category))];

  const selectClass = "bg-[#0a0a0f] border-white/10 text-white h-8 text-xs";

  return (
    <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-white">Tournament Queue</h3>
          <span className="text-xs text-white/30">{total} total</span>
          <span className="text-xs text-orange-400/60">{waitingCount} waiting</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="border-white/10 text-orange-400 hover:bg-white/[0.04] h-8 text-xs" onClick={triggerMatchmaker} disabled={matchmakerLoading}>
            <Zap className={`h-3 w-3 mr-1 ${matchmakerLoading ? 'animate-spin' : ''}`} /> Matchmaker
          </Button>
          {selected.size === 2 && (
            <>
              <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/[0.04] h-8 text-xs" onClick={handleForceMatch}><Link2 className="h-3 w-3 mr-1" /> Force Match</Button>
              <Button size="sm" variant="outline" className="border-white/10 text-cyan-400 hover:bg-white/[0.04] h-8 text-xs" onClick={handleExecuteMatch}><Send className="h-3 w-3 mr-1" /> Execute + SMS</Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="text-white/30 h-8" onClick={fetchQueue} disabled={loading}><RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
      </div>

      <div className="flex gap-3 mb-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className={`${selectClass} w-36`}><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#12121a] border-white/10"><SelectItem value="all">All</SelectItem><SelectItem value="waiting">Waiting</SelectItem><SelectItem value="matched">Matched</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent></Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className={`${selectClass} w-40`}><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#12121a] border-white/10"><SelectItem value="all">All Categories</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
      </div>

      <div className="max-h-[350px] overflow-auto">
        <Table>
          <TableHeader><TableRow className="border-white/[0.06] hover:bg-transparent">
            <TableHead className="text-white/30 text-xs w-8"></TableHead>
            {['Barber', 'Category', 'Country', 'Status', 'Queued At', ''].map(h => <TableHead key={h} className="text-white/30 text-xs">{h}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {entries.map(e => (
              <TableRow key={e.id} className={`border-white/[0.06] hover:bg-white/[0.02] ${selected.has(e.id) ? 'bg-orange-500/5' : ''}`}>
                <TableCell><Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggleSelect(e.id)} className="border-white/20" /></TableCell>
                <TableCell className="text-white text-xs">{e.profile?.display_name || e.user_id?.slice(0, 8)}</TableCell>
                <TableCell className="text-white/40 text-xs">{e.category}</TableCell>
                <TableCell className="text-xs">
                  <span className="text-lg mr-1">{e.country_code ? String.fromCodePoint(...[...e.country_code.toUpperCase()].map(c => 127397 + c.charCodeAt(0))) : ''}</span>
                  <span className="text-white/30">{e.country_code}</span>
                </TableCell>
                <TableCell><Badge className={`text-[10px] px-1.5 py-0 border-0 ${e.status === 'waiting' ? 'bg-orange-500/20 text-orange-400' : e.status === 'matched' ? 'bg-white/10 text-white/60' : 'bg-white/[0.04] text-white/30'}`}>{e.status}</Badge></TableCell>
                <TableCell className="text-white/20 text-xs">{new Date(e.queue_timestamp).toLocaleString()}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/20 hover:text-red-400" onClick={() => handleRemove(e.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-white/30 text-sm py-8">Queue is empty</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TournamentQueuePanel;
