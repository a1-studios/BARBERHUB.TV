import { useEffect, useState, useRef } from 'react';
import { Howl } from 'howler';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Play, Pause, Check, Music2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string | null;
  audio_url: string;
  duration_seconds: number | null;
  genre: string | null;
  mood: string | null;
  license: string;
}

interface Props {
  selectedTrackId?: string | null;
  onSelect: (track: MusicTrack | null) => void;
}

export function MusicSelector({ selectedTrackId, onSelect }: Props) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const howlRef = useRef<Howl | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('music_tracks')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setTracks((data || []) as MusicTrack[]);
      setLoading(false);
    })();
    return () => {
      howlRef.current?.stop();
      howlRef.current?.unload();
    };
  }, []);

  const togglePreview = (track: MusicTrack) => {
    if (playingId === track.id) {
      howlRef.current?.stop();
      setPlayingId(null);
      return;
    }
    howlRef.current?.stop();
    howlRef.current?.unload();
    const h = new Howl({
      src: [track.audio_url],
      html5: true,
      volume: 0.6,
      onend: () => setPlayingId(null),
    });
    howlRef.current = h;
    h.play();
    setPlayingId(track.id);
  };

  const filtered = tracks.filter((t) => {
    const q = query.toLowerCase();
    return (
      !q ||
      t.title.toLowerCase().includes(q) ||
      (t.artist || '').toLowerCase().includes(q) ||
      (t.genre || '').toLowerCase().includes(q) ||
      (t.mood || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Music2 className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-white">Add music (optional)</h3>
        {selectedTrackId && (
          <Button size="sm" variant="ghost" className="ml-auto text-xs h-7" onClick={() => onSelect(null)}>
            Clear
          </Button>
        )}
      </div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title, artist, genre, mood…"
        className="rounded-[10px] border-cyan-500/25 bg-background/60"
      />
      <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
        {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-[10px]" />)}
        {!loading && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">No tracks available.</p>
        )}
        {!loading &&
          filtered.map((t) => {
            const isSelected = selectedTrackId === t.id;
            const isPlaying = playingId === t.id;
            return (
              <div
                key={t.id}
                className={`flex items-center gap-2 rounded-[10px] border p-2 ${
                  isSelected ? 'border-cyan-400 bg-cyan-500/10' : 'border-border bg-background/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => togglePreview(t)}
                  className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[t.artist, t.genre, t.mood].filter(Boolean).join(' · ') || 'Royalty-free'}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isSelected ? 'default' : 'outline'}
                  className="h-7 px-2 text-xs"
                  onClick={() => onSelect(isSelected ? null : t)}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5" /> : 'Use'}
                </Button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
