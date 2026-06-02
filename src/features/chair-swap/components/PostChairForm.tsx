import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Upload, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePostChair } from '../hooks/usePostChair';
import { CHAIR_AMENITIES } from '../types';
import { uploadPortfolioImage } from '@/lib/storage';
import { toast } from 'sonner';

const schema = z.object({
  shop_name: z.string().trim().max(120).optional(),
  chair_name: z.string().trim().min(2, 'Required').max(80),
  description: z.string().trim().max(500).optional(),
  address: z.string().trim().max(200).optional(),
  daily_rate_bb: z.coerce.number().int().positive().max(50_000),
  weekly_rate_bb: z.coerce.number().int().positive().max(300_000).optional().or(z.literal('')),
  available_from: z.string().min(1, 'Required'),
  available_to: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onPosted?: () => void;
}

export function PostChairForm({ onPosted }: Props) {
  const { user } = useAuth();
  const { mutateAsync: post, isPending } = usePostChair(user?.id);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onUpload = async (files: FileList | null) => {
    if (!files?.length || !user?.id) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const f of Array.from(files).slice(0, 6 - photos.length)) {
        const url = await uploadPortfolioImage(f, user.id);
        uploaded.push(url);
      }
      setPhotos((p) => [...p, ...uploaded]);
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const submit = handleSubmit(async (values) => {
    await post({
      shop_name: values.shop_name || undefined,
      chair_name: values.chair_name,
      description: values.description || undefined,
      address: values.address || undefined,
      daily_rate_bb: values.daily_rate_bb,
      weekly_rate_bb: values.weekly_rate_bb ? Number(values.weekly_rate_bb) : null,
      amenities,
      photo_urls: photos,
      availability: [{ from: values.available_from, to: values.available_to }],
    });
    reset(); setAmenities([]); setPhotos([]);
    onPosted?.();
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Shop name</Label>
          <Input {...register('shop_name')} placeholder="Faded Kingz" />
        </div>
        <div>
          <Label>Chair name *</Label>
          <Input {...register('chair_name')} placeholder="Chair #3" />
          {errors.chair_name && <p className="text-xs text-destructive">{errors.chair_name.message}</p>}
        </div>
      </div>

      <div>
        <Label>Address</Label>
        <Input {...register('address')} placeholder="123 Main St, Brooklyn" />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea rows={2} {...register('description')} placeholder="What's the vibe? What's included?" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Daily rate (BB) *</Label>
          <Input type="number" min={1} {...register('daily_rate_bb')} placeholder="150" />
          {errors.daily_rate_bb && <p className="text-xs text-destructive">{errors.daily_rate_bb.message}</p>}
        </div>
        <div>
          <Label>Weekly rate (BB)</Label>
          <Input type="number" min={1} {...register('weekly_rate_bb')} placeholder="900" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Available from *</Label>
          <Input type="date" {...register('available_from')} />
          {errors.available_from && <p className="text-xs text-destructive">{errors.available_from.message}</p>}
        </div>
        <div>
          <Label>Available to *</Label>
          <Input type="date" {...register('available_to')} />
          {errors.available_to && <p className="text-xs text-destructive">{errors.available_to.message}</p>}
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Amenities</Label>
        <div className="grid grid-cols-2 gap-2">
          {CHAIR_AMENITIES.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={amenities.includes(a.id)}
                onCheckedChange={() =>
                  setAmenities((s) => (s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id]))
                }
              />
              {a.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Photos (up to 6)</Label>
        <div className="flex gap-2 flex-wrap">
          {photos.map((u, i) => (
            <div key={u} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border/40">
              <img src={u} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                className="absolute top-0 right-0 bg-black/70 p-0.5 rounded-bl-lg"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          {photos.length < 6 && (
            <label className="w-16 h-16 rounded-lg border border-dashed border-border/60 flex items-center justify-center cursor-pointer hover:border-primary/60">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
              <input
                type="file"
                multiple
                accept="image/*"
                hidden
                onChange={(e) => onUpload(e.target.files)}
              />
            </label>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full bg-gradient-to-r from-primary to-primary/80">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Post Chair
      </Button>
    </form>
  );
}
