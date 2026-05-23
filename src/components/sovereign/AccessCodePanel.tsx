import { useEffect, useState } from 'react';
import { Plus, Trash2, Power, Copy, RefreshCw, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AccessCode {
  id: string;
  code: string;
  type: 'vip' | 'promo';
  is_active: boolean;
  usage_count: number;
  max_uses: number | null;
  notes: string | null;
  created_at: string;
}

const AccessCodePanel = () => {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [vipMode, setVipMode] = useState(false);
  const [newType, setNewType] = useState<'vip' | 'promo'>('vip');
  const [newMax, setNewMax] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');

  const refresh = async () => {
    setLoading(true);
    try {
      const [codesRes, stateRes] = await Promise.all([
        supabase.functions.invoke('sovereign-access-codes', { body: { action: 'list_codes' } }),
        supabase.from('platform_state').select('value').eq('key', 'global_vip_mode').maybeSingle(),
      ]);
      if (codesRes.error) throw codesRes.error;
      setCodes(codesRes.data?.codes ?? []);
      setVipMode(stateRes.data?.value === 'true');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const toggleVip = async (enabled: boolean) => {
    setVipMode(enabled);
    const { error } = await supabase.functions.invoke('sovereign-access-codes', {
      body: { action: 'set_vip_mode', enabled },
    });
    if (error) {
      toast.error('Failed to update VIP mode');
      setVipMode(!enabled);
    } else {
      toast.success(`Global VIP mode ${enabled ? 'ON' : 'OFF'}`);
    }
  };

  const createCode = async () => {
    const { error } = await supabase.functions.invoke('sovereign-access-codes', {
      body: {
        action: 'create_code',
        type: newType,
        max_uses: newMax ? parseInt(newMax) : null,
        notes: newNotes || null,
      },
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Code created');
    setNewMax(''); setNewNotes('');
    refresh();
  };

  const toggleCode = async (c: AccessCode) => {
    await supabase.functions.invoke('sovereign-access-codes', {
      body: { action: 'toggle_code', id: c.id, is_active: !c.is_active },
    });
    refresh();
  };

  const deleteCode = async (id: string) => {
    if (!confirm('Delete this code?')) return;
    await supabase.functions.invoke('sovereign-access-codes', {
      body: { action: 'delete_code', id },
    });
    refresh();
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied ${code}`);
  };

  return (
    <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-white">Access Codes & Velvet Rope</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading} className="text-white/30 hover:text-white">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="flex items-center justify-between bg-[#0a0a0f] border border-white/[0.06] rounded-lg p-3 mb-4">
        <div>
          <div className="text-sm text-white">Global VIP Mode</div>
          <div className="text-[11px] text-white/40">When ON, every signup must redeem a valid VIP invite code.</div>
        </div>
        <Switch checked={vipMode} onCheckedChange={toggleVip} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as 'vip' | 'promo')}
          className="bg-[#0a0a0f] border border-white/[0.06] rounded px-2 py-1.5 text-xs text-white"
        >
          <option value="vip">VIP</option>
          <option value="promo">Promo</option>
        </select>
        <Input
          placeholder="Max uses (blank = ∞)"
          value={newMax}
          onChange={(e) => setNewMax(e.target.value)}
          className="bg-[#0a0a0f] border-white/[0.06] text-white text-xs"
        />
        <Input
          placeholder="Notes (e.g. influencer name)"
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          className="bg-[#0a0a0f] border-white/[0.06] text-white text-xs"
        />
        <Button onClick={createCode} className="bg-orange-500 hover:bg-orange-600 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Generate
        </Button>
      </div>

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {codes.map((c) => (
          <div key={c.id} className="flex items-center gap-2 bg-[#0a0a0f] border border-white/[0.04] rounded-lg p-2">
            <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${c.type === 'vip' ? 'bg-orange-500/15 text-orange-400' : 'bg-cyan-500/15 text-cyan-400'}`}>
              {c.type}
            </span>
            <code className="font-mono text-sm text-white tracking-wider">{c.code}</code>
            <button onClick={() => copy(c.code)} className="text-white/30 hover:text-white">
              <Copy className="h-3 w-3" />
            </button>
            <span className="text-[11px] text-white/40 ml-auto">
              {c.usage_count}{c.max_uses ? `/${c.max_uses}` : ''} used
            </span>
            <Switch checked={c.is_active} onCheckedChange={() => toggleCode(c)} />
            <button onClick={() => deleteCode(c.id)} className="text-rose-400/60 hover:text-rose-400">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {codes.length === 0 && !loading && (
          <div className="text-center text-xs text-white/30 py-6">No codes yet. Generate one above.</div>
        )}
      </div>
    </div>
  );
};

export default AccessCodePanel;
