import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit3, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  currentName: string;
  changedAt?: string | null;
}

const COOLDOWN_MS = 1000 * 60 * 60 * 24 * 30 * 3; // ~3 months

export const DisplayNameEditor = ({ currentName, changedAt }: Props) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentName || '');
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const lastChange = changedAt ? new Date(changedAt).getTime() : 0;
  const nextAllowedAt = lastChange ? lastChange + COOLDOWN_MS : 0;
  const lockedUntil = nextAllowedAt > Date.now() ? new Date(nextAllowedAt) : null;

  const submit = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc('update_display_name' as any, { new_name: value.trim() });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    const res = data as { ok: boolean; error?: string };
    if (!res?.ok) { toast.error(res?.error || 'Could not save'); return; }
    toast.success('Display name updated');
    qc.invalidateQueries({ queryKey: ['profile'] });
    qc.invalidateQueries({ queryKey: ['header-profile'] });
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-full text-orange-300/80 hover:text-orange-200 hover:bg-orange-500/10 transition"
        aria-label="Edit display name"
      >
        <Edit3 className="w-3.5 h-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose your display name</DialogTitle>
            <DialogDescription>
              This is the public name shown across the platform. Your email is never shown.
              You can change it once every 3 months.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. fade_king"
              maxLength={24}
              disabled={!!lockedUntil}
            />
            <p className="text-[11px] text-muted-foreground">
              3–24 chars. Letters, numbers, dot, underscore, dash. No spaces or "@".
            </p>
            {lockedUntil && (
              <p className="text-xs text-orange-400">
                You can change it again on {lockedUntil.toLocaleDateString()}.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={saving || !!lockedUntil || value.trim().length < 3}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
