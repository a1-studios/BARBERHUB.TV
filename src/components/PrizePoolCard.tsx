import { Trophy, Users, Swords, TrendingUp, Send, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Globe3D from '@/components/Globe3D';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedCounter } from '@/components/battles/AnimatedCounter';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export const PrizePoolCard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [noteContent, setNoteContent] = useState('');

  // Fetch real community stats
  const { data: stats } = useQuery({
    queryKey: ['community-stats'],
    queryFn: async () => {
      const [usersRes, barbersRes, battlesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('barber_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('battles').select('id', { count: 'exact', head: true }).eq('status', 'voting')
      ]);

      return {
        totalUsers: usersRes.count || 0,
        totalBarbers: barbersRes.count || 0,
        activeBattles: battlesRes.count || 0
      };
    },
    refetchInterval: 10000
  });

  // Fetch community notes with role information
  const { data: notes } = useQuery({
    queryKey: ['community-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_notes')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles:user_id (display_name, avatar_url, username)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Fetch roles for all users in the notes
      if (data && data.length > 0) {
        const userIds = data.map((note: any) => note.user_id);
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);
        
        // Attach roles to notes
        return data.map((note: any) => ({
          ...note,
          role: roles?.find((r: any) => r.user_id === note.user_id)?.role || 'fan'
        }));
      }
      
      return data;
    }
  });

  // Real-time subscription for community notes
  useEffect(() => {
    const channel = supabase
      .channel('community-notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_notes'
        },
        () => {
          // Refetch notes when any change occurs
          queryClient.invalidateQueries({ queryKey: ['community-notes'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Post community note mutation
  const postNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data, error } = await supabase
        .from('community_notes')
        .insert({ user_id: user.id, content })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-notes'] });
      setNoteContent('');
      toast.success('Note posted!');
    },
    onError: (error) => {
      toast.error('Failed to post note');
      console.error(error);
    }
  });

  const handlePostNote = () => {
    if (!noteContent.trim()) {
      toast.error('Please write something');
      return;
    }
    if (!user) {
      toast.error('Please sign in to post');
      return;
    }
    postNoteMutation.mutate(noteContent);
  };

  return (
    <Card className="relative overflow-hidden border-2 border-primary/50 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Dynamic 3D Globe Background */}
      <Globe3D />
      
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-pulse" />

      <CardContent className="relative z-10 py-6 sm:py-8">
        {/* Grand Prize Display */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-primary to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_50px_hsl(var(--primary)/0.5)] animate-pulse">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-orange-500 to-primary bg-clip-text text-transparent mb-2">
            $25,000
          </h2>
          <p className="text-lg text-foreground font-semibold">Grand Prize Pool</p>
        </div>

        {/* Compact Stats - Icons Only */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="group relative flex items-center gap-2">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-lg blur-lg group-hover:blur-xl transition-all" />
            <div className="relative flex items-center gap-2 bg-background/50 backdrop-blur-sm px-3 py-2 rounded-lg border border-primary/20">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-xl font-bold text-primary">
                <AnimatedCounter value={stats?.totalUsers || 0} duration={2000} />
              </span>
            </div>
          </div>
          
          <div className="group relative flex items-center gap-2">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent rounded-lg blur-lg group-hover:blur-xl transition-all" />
            <div className="relative flex items-center gap-2 bg-background/50 backdrop-blur-sm px-3 py-2 rounded-lg border border-primary/20">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <span className="text-xl font-bold text-orange-500">
                <AnimatedCounter value={stats?.totalBarbers || 0} duration={2000} />
              </span>
            </div>
          </div>
          
          <div className="group relative flex items-center gap-2">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent rounded-lg blur-lg group-hover:blur-xl transition-all" />
            <div className="relative flex items-center gap-2 bg-background/50 backdrop-blur-sm px-3 py-2 rounded-lg border border-primary/20">
              <Swords className="w-5 h-5 text-green-500" />
              <span className="text-xl font-bold text-green-500">
                <AnimatedCounter value={stats?.activeBattles || 0} duration={2000} />
              </span>
            </div>
          </div>
        </div>

        {/* Community Notes Section */}
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="w-6 h-6 text-primary" />
            <h3 className="text-2xl font-bold">Community Notes</h3>
          </div>

          {/* Post Note Input */}
          {user && (
            <div className="relative mb-6">
              <div className="relative bg-background/80 backdrop-blur-sm border border-border rounded-lg p-4">
                <Textarea
                  placeholder="Share your thoughts with the community..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="min-h-[100px] bg-transparent border-0 focus-visible:ring-0 resize-none text-base"
                  maxLength={500}
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    {noteContent.length}/500
                  </span>
                  <Button
                    size="default"
                    onClick={handlePostNote}
                    disabled={postNoteMutation.isPending || !noteContent.trim()}
                    className="gap-2"
                  >
                    Post
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Recent Notes Feed */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {notes?.map((note: any) => {
              const isBarber = note.role === 'barber';
              const isFan = note.role === 'fan';
              const usernameColor = isBarber ? 'text-orange-500' : 'text-green-500';
              const username = note.profiles?.username || note.profiles?.display_name?.toLowerCase().replace(/\s+/g, '_') || 'anonymous';

              return (
                <div
                  key={note.id}
                  className="group relative bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg p-4 transition-all hover:bg-background/90"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <button
                      onClick={() => window.location.href = `/barber/${note.user_id}`}
                      className={`font-bold ${usernameColor} hover:underline cursor-pointer text-base`}
                    >
                      @{username}
                    </button>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground break-words leading-relaxed">{note.content}</p>
                </div>
              );
            })}
            {(!notes || notes.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No community notes yet. Be the first to share!</p>
              </div>
            )}
          </div>

          {/* Live Indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className="relative">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping" />
            </div>
            <p className="text-xs text-muted-foreground">
              Community Live & Growing
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
