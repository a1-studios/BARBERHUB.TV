import { useState, useEffect } from 'react';
import { ScrollText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface AuditLogViewerProps {
  refreshTrigger?: number;
}

const AuditLogViewer = ({ refreshTrigger }: AuditLogViewerProps) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('sovereign-system-control', { body: { action: 'get_audit_log', limit: 20 } });
      if (response.error) throw response.error;
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [refreshTrigger]);

  const severityDot = (severity: string) => {
    const color = severity === 'emergency' ? 'bg-red-400' : severity === 'critical' ? 'bg-orange-400' : 'bg-white/20';
    return <div className={`h-1.5 w-1.5 rounded-full ${color} shrink-0 mt-1.5`} />;
  };

  const getCategoryColor = (category: string) => {
    const map: Record<string, string> = { economy: 'text-orange-500', battle: 'text-cyan-400', user: 'text-white/60', system: 'text-red-400' };
    return map[category] || 'text-white/40';
  };

  return (
    <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-white">Audit Log</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={loading} className="text-white/30 hover:text-white hover:bg-white/[0.04]">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-white/30 text-center py-4 text-sm">No audit log entries yet</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-[#0a0a0f] p-3 rounded-lg border border-white/[0.06] text-sm">
              <div className="flex items-start gap-2">
                {severityDot(log.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white/20 font-mono text-xs">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                    <span className={`uppercase text-[10px] font-semibold tracking-wider ${getCategoryColor(log.action_category)}`}>{log.action_category}</span>
                    <span className="text-white/60 text-xs">{log.action_type.replace(/_/g, ' ')}</span>
                  </div>
                  {log.target_id && <div className="text-[10px] text-white/20 mt-0.5 font-mono truncate">Target: {log.target_id}</div>}
                  {log.notes && <div className="text-xs text-white/40 mt-0.5">{log.notes}</div>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AuditLogViewer;
