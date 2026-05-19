import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Trash2, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { uploadPortfolioMedia } from '@/lib/storage';
import { SmartVideoPlayer } from '@/components/video/SmartVideoPlayer';
import { toast } from 'sonner';

interface PortfolioManagerProps {
  barberId?: string;
  readonly?: boolean;
}

export function PortfolioManager({ barberId, readonly = false }: PortfolioManagerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
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
        const publicUrl = await uploadPortfolioMedia(file, user.id);
        const category = file.type.startsWith('video/') ? 'video' : 'haircut';

        const { data: newCreation, error: insertErr } = await supabase.from('creations').insert({
          barber_id: barberId,
          media_url: publicUrl,
          category,
          title: file.name.split('.')[0],
        }).select('id').single();

        if (insertErr) throw insertErr;

        // Auto-ingest videos into Cloudflare Stream for adaptive playback
        if (file.type.startsWith('video/') && newCreation?.id) {
          toast.info('Optimizing video for playback...');
          supabase.functions.invoke('upload-to-cloudflare-stream', {
            body: {
              sourceUrl: publicUrl,
              table: 'creations',
              recordId: newCreation.id,
            },
          }).catch((err: any) => console.error('Cloudflare Stream ingest queued but failed:', err));
        }

        uploaded++;
      } catch (error: any) {
        toast.error(`Failed to upload ${file.name}`);
        console.error('Upload error:', error);
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {portfolio.map((item) => {
              const mediaUrl = item.media_url || '';
              const isVid = isVideo(mediaUrl);
              return (
                <div key={item.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    {isVid ? (
                      <SmartVideoPlayer
                        streamUid={(item as any).cloudflare_stream_uid ?? null}
                        fallbackUrl={mediaUrl}
                        poster={item.thumbnail_url ?? null}
                        autoPlayWhenVisible={false}
                        muted
                        controls={true}
                        loop={false}
                        enableReplay
                        overlayPayload={(item as any).overlay_payload ?? null}
                        className="w-full h-full"
                      />
                    ) : (
                      <img
                        src={item.thumbnail_url || mediaUrl}
                        alt={item.title || 'Portfolio'}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {isVid && (
                      <Badge className="absolute top-2 right-2 bg-black/80 text-white border-0 pointer-events-none">
                        <Video className="w-3 h-3 mr-1" />
                        Video
                      </Badge>
                    )}

                    {/* Delete — always visible on mobile */}
                    {!readonly && (
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 left-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity h-8 w-8"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="mt-2">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.category && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {item.category}
                      </Badge>
                    )}
                  </div>
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
