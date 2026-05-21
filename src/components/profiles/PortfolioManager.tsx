import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Trash2, Image as ImageIcon, Video, Loader2, Play } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SmartVideoPlayer } from '@/components/video/SmartVideoPlayer';
import { uploadFileMultipart } from '@/lib/multipartUpload';
import { captureVideoThumbnail } from '@/lib/videoThumbnail';
import { pollStreamReady } from '@/lib/streamReadiness';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface PortfolioManagerProps {
  barberId?: string;
  readonly?: boolean;
}

export function PortfolioManager({ barberId, readonly = false }: PortfolioManagerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<{ uid: string | null; url: string | null; poster: string | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch from creations table — same source as BarberPublicProfile
  const { data: portfolio = [], isLoading } = useQuery({
    queryKey: ['barber-portfolio', barberId],
    queryFn: async () => {
      if (!barberId) return [];
      const { data, error } = await supabase
        .from('creations')
        .select('*')
        .eq('barber_id', barberId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!barberId,
  });

  const isVideo = (url: string) => /\.(mp4|mov|avi|webm)$/i.test(url);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user || !barberId) return;

    // Cumulative 5GB cap
    const existingTotalSize = portfolio.reduce((sum, p) => sum + ((p as any).file_size_bytes || 0), 0);
    const newFilesSize = Array.from(files).reduce((s, f) => s + f.size, 0);
    if (existingTotalSize + newFilesSize > 5 * 1024 * 1024 * 1024) {
      toast.error('Portfolio storage limit reached (5GB)');
      return;
    }

    setUploading(true);
    let uploaded = 0;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`${file.name} is not a supported file type`);
        continue;
      }
      if (file.type.startsWith('image/') && file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB for images)`);
        continue;
      }

      try {
        const isVid = file.type.startsWith('video/');
        const filename = `${Date.now()}_${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;

        // Capture poster from videos in parallel with the upload — await before insert
        // so thumbnail_url is persisted with the row.
        const thumbPromise = isVid
          ? captureVideoThumbnail(file).then(async (b) => {
              if (!b) return null;
              try {
                const thumbKey = `thumbnails/${Date.now()}_${file.name.replace(/[^a-z0-9._-]/gi, '_')}.jpg`;
                const { data, error } = await supabase.functions.invoke('get-r2-presigned-url', {
                  body: { key: thumbKey, contentType: 'image/jpeg' },
                });
                if (error || !data?.uploadUrl) {
                  console.warn('[thumb] presign failed', error);
                  return null;
                }
                const put = await fetch(data.uploadUrl, {
                  method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: b,
                });
                if (!put.ok) {
                  console.warn('[thumb] PUT failed', put.status);
                  return null;
                }
                return data.publicUrl as string;
              } catch (e) {
                console.warn('[thumb] upload error', e);
                return null;
              }
            }).catch((e) => { console.warn('[thumb] capture error', e); return null; })
          : Promise.resolve<string | null>(null);

        const { publicUrl } = await uploadFileMultipart(file, filename, file.type, {
          category: isVid ? 'portfolios' : 'portfolios',
          onProgress: () => { /* could surface per-file progress here */ },
        });

        const thumbnailUrl = await thumbPromise;
        const category = isVid ? 'video' : 'haircut';

        const { data: newCreation, error: insertErr } = await supabase.from('creations').insert({
          barber_id: barberId,
          media_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          category,
          title: file.name.split('.')[0],
        }).select('id').single();

        if (insertErr) throw insertErr;

        if (isVid && newCreation?.id) {
          toast.info('Optimizing video for smooth playback…');
          const { data: ingest, error: ingestErr } = await supabase.functions.invoke('upload-to-cloudflare-stream', {
            body: { sourceUrl: publicUrl, table: 'creations', recordId: newCreation.id },
          });
          if (ingestErr || !ingest?.uid) {
            console.error('[ingest] failed', ingestErr, ingest);
            toast.warning('Video uploaded — optimization will retry shortly');
          } else {
            pollStreamReady('creations', newCreation.id, ingest.uid, {
              onStatus: (s) => {
                if (s === 'ready') {
                  toast.success('Video ready');
                  queryClient.invalidateQueries({ queryKey: ['barber-portfolio', barberId] });
                }
              },
            }).catch(() => {});
          }
        }

        uploaded++;
      } catch (error: any) {
        console.error('Upload error:', file.name, error);
        toast.error(`Failed to upload ${file.name}: ${error?.message || 'unknown error'}`);
      }
    }

    if (uploaded > 0) {
      toast.success(`Uploaded ${uploaded} file(s)`);
      queryClient.invalidateQueries({ queryKey: ['barber-portfolio', barberId] });
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    const { error } = await supabase.from('creations').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
      return;
    }
    toast.success('Deleted');
    queryClient.invalidateQueries({ queryKey: ['barber-portfolio', barberId] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Portfolio Gallery
            </CardTitle>
            <CardDescription>
              Showcase your best work — images &amp; videos
            </CardDescription>
          </div>

          {!readonly && (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Media
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {portfolio.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No media yet</h3>
            <p className="text-muted-foreground mb-4">
              {readonly
                ? "This barber hasn't uploaded any portfolio media yet"
                : 'Upload your best work to showcase your skills'}
            </p>
            {!readonly && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First File
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {portfolio.map((item) => {
              const mediaUrl = item.media_url || '';
              const isVid = isVideo(mediaUrl);
              const poster = (item as any).stream_thumbnail_url || item.thumbnail_url || null;
              const status = (item as any).stream_status as string | undefined;
              const processing = isVid && status && status !== 'ready';
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!isVid || processing) return;
                    setPlayingVideo({
                      uid: (item as any).cloudflare_stream_uid || null,
                      url: mediaUrl,
                      poster,
                    });
                  }}
                  className={`relative group aspect-square rounded-md overflow-hidden bg-muted ${isVid && !processing ? 'cursor-pointer' : ''}`}
                >
                  {isVid ? (
                    poster ? (
                      <img src={poster} alt={item.title || 'Video'} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      // First-frame fallback: most browsers paint the first frame at #t=0.1
                      <video
                        src={`${mediaUrl}#t=0.1`}
                        preload="metadata"
                        muted
                        playsInline
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    )
                  ) : (
                    <img
                      src={item.thumbnail_url || mediaUrl}
                      alt={item.title || 'Portfolio'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}

                  {isVid && !processing && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="flex items-center justify-center h-9 w-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 shadow-lg">
                        <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
                      </span>
                    </div>
                  )}

                  {processing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] font-medium text-white text-center px-1">
                      Optimizing…
                    </div>
                  )}

                  {!readonly && (
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 left-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity h-7 w-7"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}
