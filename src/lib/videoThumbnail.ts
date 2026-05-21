/**
 * Capture the first decodable frame of a video Blob/File as a JPEG Blob.
 * Used to seed a portfolio thumbnail before Cloudflare Stream finishes transcoding.
 */
export async function captureVideoThumbnail(
  source: Blob | File | string,
  opts: { seekTo?: number; maxWidth?: number; quality?: number } = {},
): Promise<Blob | null> {
  const seekTo = opts.seekTo ?? 0.1;
  const maxWidth = opts.maxWidth ?? 720;
  const quality = opts.quality ?? 0.82;

  const url = typeof source === 'string' ? source : URL.createObjectURL(source);
  const cleanup = () => { if (typeof source !== 'string') URL.revokeObjectURL(url); };

  return new Promise<Blob | null>((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.src = url;

    const done = (blob: Blob | null) => { cleanup(); resolve(blob); };
    const timeout = window.setTimeout(() => done(null), 8000);

    video.onloadedmetadata = () => {
      try {
        video.currentTime = Math.min(seekTo, Math.max(0, (video.duration || 1) - 0.05));
      } catch {
        done(null);
      }
    };

    video.onseeked = () => {
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) { window.clearTimeout(timeout); return done(null); }
        const scale = Math.min(1, maxWidth / w);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { window.clearTimeout(timeout); return done(null); }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          window.clearTimeout(timeout);
          done(blob);
        }, 'image/jpeg', quality);
      } catch {
        window.clearTimeout(timeout);
        done(null);
      }
    };

    video.onerror = () => { window.clearTimeout(timeout); done(null); };
  });
}
