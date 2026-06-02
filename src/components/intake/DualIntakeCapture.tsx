import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { uploadPortfolioImage } from '@/lib/storage';
import { toast } from 'sonner';
import { IntakePreviewCard } from './IntakePreviewCard';

interface Props {
  serviceLine?: string;
  onChange: (state: { referenceUrl: string | null; currentUrl: string | null; note: string }) => void;
  initial?: { referenceUrl?: string | null; currentUrl?: string | null; note?: string | null };
}

/**
 * Dual-image intake capture: live camera (current) + file picker (reference) + note.
 * Both uploads target R2 via uploadPortfolioImage (existing helper).
 */
export function DualIntakeCapture({ serviceLine, onChange, initial }: Props) {
  const { user } = useAuth();
  const [referenceUrl, setReferenceUrl] = useState<string | null>(initial?.referenceUrl ?? null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(initial?.currentUrl ?? null);
  const [note, setNote] = useState(initial?.note ?? '');
  const [uploading, setUploading] = useState<'ref' | 'cur' | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File, kind: 'ref' | 'cur') => {
    if (!user?.id) { toast.error('Sign in first'); return; }
    setUploading(kind);
    try {
      const url = await uploadPortfolioImage(file, user.id);
      if (kind === 'ref') { setReferenceUrl(url); onChange({ referenceUrl: url, currentUrl, note }); }
      else { setCurrentUrl(url); onChange({ referenceUrl, currentUrl: url, note }); }
    } catch (e: any) { toast.error(e.message || 'Upload failed'); }
    finally { setUploading(null); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-col h-auto py-3 gap-1"
          onClick={() => fileRef.current?.click()}
          disabled={uploading === 'ref'}
        >
          {uploading === 'ref' ? <Loader2 className="w-4 h-4 animate-spin" /> : referenceUrl ? <RefreshCw className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
          <span className="text-[11px]">{referenceUrl ? 'Replace Reference' : 'Upload Reference'}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-col h-auto py-3 gap-1"
          onClick={() => cameraRef.current?.click()}
          disabled={uploading === 'cur'}
        >
          {uploading === 'cur' ? <Loader2 className="w-4 h-4 animate-spin" /> : currentUrl ? <RefreshCw className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          <span className="text-[11px]">{currentUrl ? 'Recapture Current' : 'Capture Current'}</span>
        </Button>
      </div>

      <input
        ref={fileRef} hidden type="file" accept="image/*"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'ref')}
      />
      <input
        ref={cameraRef} hidden type="file" accept="image/*" capture="user"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'cur')}
      />

      <IntakePreviewCard
        referenceUrl={referenceUrl}
        currentUrl={currentUrl}
        note={note}
        serviceLine={serviceLine}
      />

      <div>
        <Label className="text-[11px] text-muted-foreground">Note (60 char max shown)</Label>
        <Textarea
          rows={2}
          value={note}
          maxLength={500}
          onChange={(e) => { setNote(e.target.value); onChange({ referenceUrl, currentUrl, note: e.target.value }); }}
          placeholder="Anything the barber should know..."
        />
      </div>
    </div>
  );
}
