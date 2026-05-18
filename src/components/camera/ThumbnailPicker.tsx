import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface ThumbnailPickerProps {
  videoUrl: string;
  onSelect: (dataUrl: string) => void;
  selected?: string | null;
}

/** Grabs 3 thumbnails from a local blob URL at 25/50/75% of duration. */
export function ThumbnailPicker({ videoUrl, onSelect, selected }: ThumbnailPickerProps) {
  const [thumbs, setThumbs] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = document.createElement('video');
    v.src = videoUrl;
    v.muted = true;
    v.crossOrigin = 'anonymous';
    v.preload = 'auto';
    const canvas = document.createElement('canvas');

    const grab = async () => {
      const duration = v.duration;
      if (!isFinite(duration) || duration <= 0) return;
      const points = [0.25, 0.5, 0.75].map((p) => p * duration);
      const out: string[] = [];
      for (const t of points) {
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            canvas.width = v.videoWidth || 360;
            canvas.height = v.videoHeight || 640;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              out.push(canvas.toDataURL('image/jpeg', 0.7));
            }
            v.removeEventListener('seeked', onSeeked);
            resolve();
          };
          v.addEventListener('seeked', onSeeked);
          v.currentTime = t;
        });
      }
      setThumbs(out);
      if (out[1] && !selected) onSelect(out[1]);
    };

    v.addEventListener('loadedmetadata', grab, { once: true });
    return () => {
      v.removeAttribute('src');
      v.load();
    };
  }, [videoUrl]);

  return (
    <div className="grid grid-cols-3 gap-2">
      {thumbs.length === 0 ? (
        <div className="col-span-3 h-20 bg-muted rounded-md animate-pulse" />
      ) : (
        thumbs.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(t)}
            className={`relative aspect-video rounded-md overflow-hidden border-2 ${
              selected === t ? 'border-primary' : 'border-transparent'
            }`}
          >
            <img src={t} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
            {selected === t && (
              <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </button>
        ))
      )}
    </div>
  );
}
