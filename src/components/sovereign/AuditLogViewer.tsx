import { useState, useEffect } from 'react';
import { ScrollText, RefreshCw, AlertTriangle, AlertCircle, Info } from 'lucide-react';
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
      const response = await supabase.functions.invoke('sovereign-system-control', {
        body: { action: 'get_audit_log', limit: 20 }
      });

      if (response.error) throw response.error;
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [refreshTrigger]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'emergency':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'economy':
        return 'text-yellow-400';
      case 'battle':
        return 'text-blue-400';
      case 'user':
        return 'text-purple-400';
      case 'system':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-[#1a1a2e] border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-300">SOVEREIGN AUDIT LOG</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchLogs}
          disabled={loading}
          className="text-gray-400 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-4 text-sm">
            No audit log entries yet
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800 text-sm"
            >
              <div className="flex items-start gap-2">
                {getSeverityIcon(log.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-500 font-mono text-xs">
                      {format(new Date(log.created_at), 'HH:mm:ss')}
                    </span>
                    <span className={`uppercase text-xs font-bold ${getCategoryColor(log.action_category)}`}>
                      {log.action_category}
                    </span>
                    <span className="text-gray-300">{log.action_type.replace(/_/g, ' ')}</span>
                  </div>
                  {log.target_id && (
                    <div className="text-xs text-gray-500 mt-1 font-mono truncate">
                      Target: {log.target_id}
                    </div>
                  )}
                  {log.notes && (
                    <div className="text-xs text-gray-400 mt-1">
                      {log.notes}
                    </div>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  log.severity === 'emergency' ? 'bg-red-950 text-red-400' :
                  log.severity === 'critical' ? 'bg-orange-950 text-orange-400' :
                  'bg-gray-800 text-gray-400'
                }`}>
                  {log.severity}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AuditLogViewer;
