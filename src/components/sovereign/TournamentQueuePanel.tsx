import { useState, useEffect, useCallback } from 'react';
import { Users, Zap, Trash2, RefreshCw, Link2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TournamentQueuePanelProps {
  onRefresh: () => void;
}

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
    if (res.error) throw res.error;
    return res.data;
  }, []);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke('get_queue', { queue_status: statusFilter, category_filter: categoryFilter });
      setEntries(data?.entries || []);
      setTotal(data?.total || 0);
    } catch {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, invoke]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleRemove = async (id: string) => {
    try {
      await invoke('remove_queue_entry', { queue_entry_id: id });
      toast.success('Entry removed');
      fetchQueue();
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
  };

  const handleForceMatch = async () => {
    const ids = Array.from(selected);
    if (ids.length !== 2) { toast.error('Select exactly 2 entries to match'); return; }
    try {
      const data = await invoke('force_match', { queue_entry_ids: ids });
      toast.success(`Force matched! Battle: ${data.battle?.id}`);
      setSelected(new Set());
      fetchQueue();
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Match failed');
    }
  };

  const handleExecuteMatch = async () => {
    const ids = Array.from(selected);
    if (ids.length !== 2) { toast.error('Select exactly 2 entries'); return; }
    try {
      // Force match first
      const data = await invoke('force_match', { queue_entry_ids: ids });
      const battleId = data.battle?.id;
      toast.success(`Match created! Battle: ${battleId}`);

      // Then send SMS notifications
      if (battleId) {
        try {
          const smsRes = await supabase.functions.invoke('send-match-sms', {
            body: {
              battle_id: battleId,
              barber1_user_id: data.battle?.barber1_user_id,
              barber2_user_id: data.battle?.barber2_user_id,
            },
          });
          if (smsRes.data?.sent > 0) {
            toast.success(`SMS sent to ${smsRes.data.sent} barber(s)`);
          }
        } catch (smsErr) {
          console.error('SMS error (non-fatal):', smsErr);
          toast.info('Match created but SMS notification failed');
        }
      }

      setSelected(new Set());
      fetchQueue();
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Execute match failed');
    }
  };

  const triggerMatchmaker = async () => {
    setMatchmakerLoading(true);
    try {
      const res = await supabase.functions.invoke('tournament-matchmaker');
      if (res.error) throw res.error;
      const data = res.data;
      toast.success(`Matchmaker ran: ${data.matches_created || 0} matches created`);
      fetchQueue();
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Matchmaker failed');
    } finally {
      setMatchmakerLoading(false);
    }
  };

  const waitingCount = entries.filter(e => e.status === 'waiting').length;
  const categories = [...new Set(entries.map(e => e.category))];

  return (
    <div className="bg-[#1a1a2e] border border-emerald-900/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-500" />
          <h3 className="text-lg font-bold text-emerald-400">TOURNAMENT QUEUE</h3>
          <Badge variant="outline" className="border-emerald-700 text-emerald-400 text-xs">{total} total</Badge>
          <Badge variant="outline" className="border-yellow-700 text-yellow-400 text-xs">{waitingCount} waiting</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="bg-amber-950/30 border-amber-700 text-amber-400 h-8" onClick={triggerMatchmaker} disabled={matchmakerLoading}>
            <Zap className={`h-3 w-3 mr-1 ${matchmakerLoading ? 'animate-spin' : ''}`} /> Run Matchmaker
          </Button>
          {selected.size === 2 && (
            <>
              <Button size="sm" variant="outline" className="bg-purple-950/30 border-purple-700 text-purple-400 h-8" onClick={handleForceMatch}>
                <Link2 className="h-3 w-3 mr-1" /> Force Match
              </Button>
              <Button size="sm" variant="outline" className="bg-red-950/30 border-red-700 text-red-400 h-8" onClick={handleExecuteMatch}>
                <Send className="h-3 w-3 mr-1" /> Execute + SMS
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="text-gray-400 h-8" onClick={fetchQueue} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-[#0f0f1a] border-gray-700 text-white h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-gray-700">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="matched">Matched</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="bg-[#0f0f1a] border-gray-700 text-white h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-gray-700">
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="max-h-[350px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-500 text-xs w-8"></TableHead>
              <TableHead className="text-gray-500 text-xs">Barber</TableHead>
              <TableHead className="text-gray-500 text-xs">Category</TableHead>
              <TableHead className="text-gray-500 text-xs">Country</TableHead>
              <TableHead className="text-gray-500 text-xs">Status</TableHead>
              <TableHead className="text-gray-500 text-xs">Queued At</TableHead>
              <TableHead className="text-gray-500 text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(e => (
              <TableRow key={e.id} className={`border-gray-800 hover:bg-emerald-950/20 ${selected.has(e.id) ? 'bg-emerald-950/30' : ''}`}>
                <TableCell>
                  <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggleSelect(e.id)} className="border-gray-600" />
                </TableCell>
                <TableCell className="text-white text-xs">{e.profile?.display_name || e.user_id?.slice(0, 8)}</TableCell>
                <TableCell className="text-gray-400 text-xs">{e.category}</TableCell>
                <TableCell className="text-xs">
                  <span className="text-lg mr-1">{e.country_code ? String.fromCodePoint(...[...e.country_code.toUpperCase()].map(c => 127397 + c.charCodeAt(0))) : ''}</span>
                  <span className="text-gray-400">{e.country_code}</span>
                </TableCell>
                <TableCell>
                  <Badge className={`text-[10px] px-1.5 py-0 ${e.status === 'waiting' ? 'bg-yellow-600 text-black' : e.status === 'matched' ? 'bg-green-600' : 'bg-gray-600'}`}>{e.status}</Badge>
                </TableCell>
                <TableCell className="text-gray-500 text-xs">{new Date(e.queue_timestamp).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-300" onClick={() => handleRemove(e.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-gray-500 text-sm py-8">Queue is empty</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TournamentQueuePanel;
