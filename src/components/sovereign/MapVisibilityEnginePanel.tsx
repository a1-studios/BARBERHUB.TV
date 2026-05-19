import { useEffect, useState } from 'react';
import { Map as MapIcon, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const KEYS = [
  { key: 'map_weight_tier', label: 'Tier', desc: 'Diamond/Gold/Silver/Bronze ranking weight' },
  { key: 'map_weight_bb', label: 'BB Purchases', desc: 'Lifetime Barber Bucks bought' },
  { key: 'map_weight_battle', label: 'Battle Activity', desc: 'Battles participated in' },
  { key: 'map_weight_contribution', label: 'Contribution', desc: 'M4M lives + stream hours' },
] as const;

const MapVisibilityEnginePanel = () => {
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('platform_state')
      .select('key, value')
      .in('key', KEYS.map(k => k.key));
    const m: Record<string, number> = {};
    (data ?? []).forEach((r: any) => { m[r.key] = parseFloat(r.value); });
    KEYS.forEach(k => { if (m[k.key] === undefined) m[k.key] = 1.0; });
    setWeights(m);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (key: string, val: number) => {
    setWeights(prev => ({ ...prev, [key]: val }));
    const { error } = await supabase
      .from('platform_state')
      .upsert({ key, value: val.toFixed(2) }, { onConflict: 'key' });
    if (error) { toast.error(`Failed to save ${key}`); return; }
    qc.invalidateQueries({ queryKey: ['map-visibility-weights'] });
    qc.invalidateQueries({ queryKey: ['platform-state'] });
  };

  const resetAll = async () => {
    await Promise.all(KEYS.map(k =>
      supabase.from('platform_state').upsert({ key: k.key, value: '1.00' }, { onConflict: 'key' })
    ));
    toast.success('Reset to defaults');
    qc.invalidateQueries({ queryKey: ['map-visibility-weights'] });
    qc.invalidateQueries({ queryKey: ['platform-state'] });
    load();
  };

  return (
    <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapIcon className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-white">Map Visibility Engine</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={resetAll} className="text-white/40 hover:text-white text-xs h-7">
          <RotateCcw className="h-3 w-3 mr-1" /> Reset
        </Button>
      </div>

      <p className="text-[11px] text-white/40 mb-4">
        Adjust how barbers are prioritized on the marketplace map. Higher weight = larger pin, higher z-index, later clustering.
      </p>

      {loading ? (
        <p className="text-xs text-white/30">Loading…</p>
      ) : (
        <div className="space-y-4">
          {KEYS.map(k => (
            <div key={k.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <p className="text-xs font-medium text-white">{k.label}</p>
                  <p className="text-[10px] text-white/30">{k.desc}</p>
                </div>
                <span className="text-xs font-mono text-orange-500 tabular-nums">
                  {(weights[k.key] ?? 1).toFixed(2)}×
                </span>
              </div>
              <Slider
                value={[weights[k.key] ?? 1]}
                onValueChange={(v) => setWeights(prev => ({ ...prev, [k.key]: v[0] }))}
                onValueCommit={(v) => save(k.key, v[0])}
                min={0}
                max={2}
                step={0.05}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MapVisibilityEnginePanel;
