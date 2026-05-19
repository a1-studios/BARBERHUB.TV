import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Trash2, Ban, X, ExternalLink, Shield } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  resolution_action: string | null;
}

interface Strike {
  id: string;
  user_id: string;
  reason: string;
  content_type: string | null;
  created_at: string;
}

export default function ModerationDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmTerminate, setConfirmTerminate] = useState<Report | null>(null);

  const load = async () => {
    setLoading(true);
    const [r, s] = await Promise.all([
      supabase.from('content_reports').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('moderation_strikes').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setReports((r.data || []) as Report[]);
    setStrikes((s.data || []) as Strike[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const open = reports.filter((r) => r.status === 'open' || !r.status);
  const resolved = reports.filter((r) => r.status !== 'open' && r.status);

  const dismiss = async (r: Report) => {
    setBusy(r.id);
    const { error } = await supabase
      .from('content_reports')
      .update({
        status: 'dismissed',
        resolved_at: new Date().toISOString(),
        resolved_by: (await supabase.auth.getUser()).data.user?.id,
        resolution_action: 'dismissed',
      })
      .eq('id', r.id);
    setBusy(null);
    if (error) return toast.error('Failed to dismiss');
    toast.success('Report dismissed');
    load();
  };

  const deleteContent = async (r: Report) => {
    setBusy(r.id);
    const { data, error } = await supabase.functions.invoke('admin-moderation-delete', {
      body: { report_id: r.id, target_type: r.target_type, target_id: r.target_id },
    });
    setBusy(null);
    if (error || !data?.success) return toast.error(data?.error || 'Delete failed');
    toast.success('Content deleted');
    load();
  };

  const terminate = async (r: Report) => {
    setBusy(r.id);
    const { data, error } = await supabase.functions.invoke('admin-moderation-terminate', {
      body: { report_id: r.id, target_type: r.target_type, target_id: r.target_id, reason: 'Repeat infringement' },
    });
    setBusy(null);
    setConfirmTerminate(null);
    if (error || !data?.success) return toast.error(data?.error || 'Termination failed');
    toast.success('Account terminated');
    load();
  };

  const Row = ({ r, showActions }: { r: Report; showActions: boolean }) => (
    <div className="rounded-[12px] border border-border bg-background/50 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] uppercase">{r.target_type}</Badge>
            <Badge variant="destructive" className="text-[10px] uppercase">{r.reason}</Badge>
            <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
          </div>
          <p className="text-xs text-white/80 mt-1 break-words">
            <span className="text-muted-foreground">Target:</span> {r.target_id}
          </p>
          {r.details && <p className="text-xs text-muted-foreground mt-1">"{r.details}"</p>}
          {r.resolution_action && (
            <p className="text-[10px] text-cyan-400 mt-1 uppercase">Action: {r.resolution_action}</p>
          )}
        </div>
      </div>
      {showActions && (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => dismiss(r)} disabled={busy === r.id}>
            <X className="w-3 h-3 mr-1" /> Dismiss
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 text-xs"
            onClick={() => deleteContent(r)}
            disabled={busy === r.id}
          >
            {busy === r.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
            Delete Content
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 text-xs bg-red-900 hover:bg-red-800"
            onClick={() => setConfirmTerminate(r)}
            disabled={busy === r.id}
          >
            <Ban className="w-3 h-3 mr-1" /> Terminate Account
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 pt-20 pb-16 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-cyan-400" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">Sovereign Moderation</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="open">
            <TabsList>
              <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
              <TabsTrigger value="strikes">Strikes ({strikes.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="open" className="space-y-2 mt-4">
              {open.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No open reports.</p>}
              {open.map((r) => <Row key={r.id} r={r} showActions />)}
            </TabsContent>
            <TabsContent value="resolved" className="space-y-2 mt-4">
              {resolved.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nothing resolved yet.</p>}
              {resolved.map((r) => <Row key={r.id} r={r} showActions={false} />)}
            </TabsContent>
            <TabsContent value="strikes" className="space-y-2 mt-4">
              {strikes.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No strikes issued.</p>}
              {strikes.map((s) => (
                <div key={s.id} className="rounded-[12px] border border-border bg-background/50 p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-[10px] uppercase">{s.reason}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-white/80 mt-1 break-words">User: {s.user_id}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <AlertDialog open={!!confirmTerminate} onOpenChange={(o) => !o && setConfirmTerminate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate this account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently bans the offending user, signs them out of all sessions, and logs the action.
              This is intended for repeat infringers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmTerminate && terminate(confirmTerminate)}
              className="bg-destructive text-destructive-foreground"
            >
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
