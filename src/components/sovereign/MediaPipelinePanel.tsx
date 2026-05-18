import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Film, RefreshCw, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface TableStat {
  table: string;
  total: number;
  ingested: number;
  pending: number;
}

const TABLES = ['creations', 'creator_content', 'battle_submissions'] as const;

export default function MediaPipelinePanel() {
  const [stats, setStats] = useState<TableStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    const results: TableStat[] = [];
    for (const table of TABLES) {
      const totalQ = await supabase.from(table as any).select('id', { count: 'exact', head: true }).not('media_url', 'is', null);
      const ingestedQ = await supabase.from(table as any).select('id', { count: 'exact', head: true }).not('cloudflare_stream_uid', 'is', null);
      const total = totalQ.count ?? 0;
      const ingested = ingestedQ.count ?? 0;
      results.push({ table, total, ingested, pending: Math.max(0, total - ingested) });
    }
    setStats(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
    const t = setInterval(fetchStats, 10_000);
    return () => clearInterval(t);
  }, []);

  const runBackfill = async () => {
    setRunning(true);
    const res = await supabase.functions.invoke('sovereign-system-control', {
      body: { action: 'run_media_backfill', limit: 25 },
    });
    if (res.error) toast.error(res.error.message);
    else toast.success(`Queued ${res.data?.queued ?? 0} ingest jobs`);
    setRunning(false);
    fetchStats();
  };

  const totalAll = stats.reduce((s, t) => s + t.total, 0);
  const ingestedAll = stats.reduce((s, t) => s + t.ingested, 0);
  const pct = totalAll === 0 ? 100 : Math.round((ingestedAll / totalAll) * 100);
  const healthColor = pct >= 90 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <section className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-white/60" />
          <h2 className="text-sm font-semibold text-white tracking-tight">Media Pipeline</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={fetchStats} className="h-7 text-white/60">
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button size="sm" onClick={runBackfill} disabled={running} className="h-7 bg-orange-500 hover:bg-orange-600 text-black">
            {running ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
            Run backfill (25)
          </Button>
        </div>
      </header>

      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-white/50 mb-1">
          <span>Cloudflare Stream ingest health</span>
          <span className="font-mono text-white/80">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className={`h-full ${healthColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.table} className="rounded border border-white/[0.06] bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-wide text-white/40">{s.table}</div>
              <div className="text-lg font-semibold text-white mt-1">{s.ingested}<span className="text-white/30 text-xs"> / {s.total}</span></div>
              <div className="text-[11px] text-amber-400/80 mt-0.5">{s.pending} pending</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
