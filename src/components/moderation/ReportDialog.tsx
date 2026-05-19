import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type ReportTarget = 'user' | 'post' | 'stream';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  targetType: ReportTarget;
  targetId: string;
}

const REASONS: { id: 'harassment' | 'copyright' | 'ip_violation' | 'fraud' | 'explicit_content'; label: string }[] = [
  { id: 'copyright', label: 'Copyright / DMCA Infringement' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'ip_violation', label: 'Other IP Violation' },
  { id: 'fraud', label: 'Fraud' },
  { id: 'explicit_content', label: 'Explicit Content' },
];

export function ReportDialog({ open, onOpenChange, targetType, targetId }: Props) {
  const { user } = useAuth();
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) {
      toast.error('Please sign in to report.');
      return;
    }
    if (!reason) {
      toast.error('Pick a reason.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('content_reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Could not submit report.');
      return;
    }
    toast.success('Report submitted. Our moderation team will review it.');
    setReason('');
    setDetails('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[440px] rounded-[16px] border-cyan-500/40 bg-background/95 backdrop-blur-xl"
        style={{ boxShadow: '0 0 36px -10px hsl(var(--cyan) / 0.5)' }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight text-white">
            Report {targetType}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Help us keep Barber-Hub safe. Pick the reason that fits best.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={reason} onValueChange={setReason} className="space-y-2 mt-2">
          {REASONS.map((r) => (
            <label
              key={r.id}
              htmlFor={`reason-${r.id}`}
              className="flex items-center gap-3 rounded-[12px] border border-cyan-500/25 bg-background/60 p-3 cursor-pointer hover:border-cyan-500/60 transition-colors"
            >
              <RadioGroupItem value={r.id} id={`reason-${r.id}`} className="border-cyan-500/60 text-primary" />
              <Label htmlFor={`reason-${r.id}`} className="text-sm font-bold text-white cursor-pointer">
                {r.label}
              </Label>
            </label>
          ))}
        </RadioGroup>

        <div className="mt-3 space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Details (optional)</Label>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Add any context that might help…"
            rows={3}
            maxLength={1000}
            className="rounded-[12px] border-cyan-500/30 bg-background/60"
          />
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-[12px]"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || !reason}
            className="flex-1 rounded-[12px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wide"
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
