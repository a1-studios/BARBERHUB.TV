import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook, Twitter, Youtube, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type SocialKey = 'instagram' | 'facebook' | 'twitter' | 'youtube';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: 'fan' | 'barber';
  initialFocus?: SocialKey;
  initialValues?: Partial<Record<SocialKey, string | null | undefined>>;
  onSaved?: () => void;
}

const FIELDS: { key: SocialKey; label: string; Icon: any; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram, placeholder: 'instagram.com/yourhandle' },
  { key: 'facebook', label: 'Facebook', Icon: Facebook, placeholder: 'facebook.com/yourpage' },
  { key: 'twitter', label: 'X / Twitter', Icon: Twitter, placeholder: 'x.com/yourhandle' },
  { key: 'youtube', label: 'YouTube', Icon: Youtube, placeholder: 'youtube.com/@yourchannel' },
];

export function SocialLinksDialog({ open, onOpenChange, role, initialFocus, initialValues, onSaved }: Props) {
  const { user } = useAuth();
  const [values, setValues] = useState<Record<SocialKey, string>>({
    instagram: '', facebook: '', twitter: '', youtube: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues({
        instagram: initialValues?.instagram ?? '',
        facebook: initialValues?.facebook ?? '',
        twitter: initialValues?.twitter ?? '',
        youtube: initialValues?.youtube ?? '',
      });
    }
  }, [open, initialValues]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        instagram_handle: values.instagram.trim() || null,
        facebook_handle: values.facebook.trim() || null,
        twitter_handle: values.twitter.trim() || null,
        youtube_handle: values.youtube.trim() || null,
      };
      const table = role === 'barber' ? 'barber_profiles' : 'client_profiles';
      const { error } = await supabase.from(table).update(payload).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Social channels updated');
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error('[SocialLinksDialog] save failed', e);
      toast.error(e.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect your channels</DialogTitle>
          <DialogDescription>Add your social links so fans can follow you everywhere.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {FIELDS.map(({ key, label, Icon, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`social-${key}`} className="flex items-center gap-2 text-xs">
                <Icon className="h-3.5 w-3.5" /> {label}
              </Label>
              <Input
                id={`social-${key}`}
                autoFocus={initialFocus === key}
                value={values[key]}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
