import { Trophy, Users, Swords, TrendingUp, Send, MessageCircle, AtSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Globe3D from '@/components/Globe3D';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedCounter } from '@/components/battles/AnimatedCounter';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export const PrizePoolCard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [noteContent, setNoteContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Fetch users for mentions
  const { data: allUsers } = useQuery({
    queryKey: ['all-users-for-mentions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_user_profiles')
        .select('user_id, username, display_name, user_type')
        .not('username', 'is', null)
        .limit(100);
      
      if (error) throw error;
      
      // Fetch barber status to determine role
      const userIds = data?.map(u => u.user_id) || [];
      const { data: barbers, error: barberError } = await supabase
        .from('barber_profiles')
        .select('user_id')
        .in('user_id', userIds);
      
      if (barberError) {
        console.error('Error fetching barber profiles:', barberError);
      }
      
      const barberSet = new Set((barbers || []).map((b: any) => b.user_id));
      
      return data?.map(u => ({
        ...u,
        role: barberSet.has(u.user_id) ? 'barber' : 'fan'
      })) || [];
    }
  });

  // Fetch community notes with role and public profile information
  const { data: notes, error: notesError } = useQuery({
    queryKey: ['community-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_notes')
        .select('id, content, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notes:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        const userIds = data.map((note: any) => note.user_id);

        // Fetch public profile info
        const { data: profiles, error: profilesError } = await supabase
          .from('public_user_profiles')
          .select('user_id, display_name, avatar_url, username, user_type')
          .in('user_id', userIds);
        
        if (profilesError) {
          console.error('Error fetching public profiles:', profilesError);
        }
        
        // Fetch barber status to determine role
        const { data: barberRows, error: barberError } = await supabase
          .from('barber_profiles')
          .select('user_id')
          .in('user_id', userIds);
        
        if (barberError) {
          console.error('Error fetching barber profiles:', barberError);
        }
        
        const barberSet = new Set((barberRows || []).map((b: any) => b.user_id));
        
        // Attach public profile and role to notes
        return data.map((note: any) => ({
          ...note,
          profiles: profiles?.find((p: any) => p.user_id === note.user_id) || null,
          role: barberSet.has(note.user_id) ? 'barber' : 'fan'
        }));
      }
      
      return data || [];
    },
    refetchInterval: 2000 // Refetch every 2 seconds for faster real-time updates
  });

  // Log for debugging
  console.log('Community notes:', notes);
  console.log('Notes error:', notesError);

  // Real-time subscription for community notes with instant updates
  useEffect(() => {
    const channel = supabase
      .channel('community-notes-realtime', {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_notes'
        },
        (payload) => {
          console.log('New note received:', payload);
          // Immediately refetch to show new note
          queryClient.invalidateQueries({ queryKey: ['community-notes'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'community_notes'
        },
        (payload) => {
          console.log('Note updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['community-notes'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'community_notes'
        },
        (payload) => {
          console.log('Note deleted:', payload);
          queryClient.invalidateQueries({ queryKey: ['community-notes'] });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Handle textarea change with @mention detection
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setNoteContent(value);
    setCursorPosition(cursorPos);
    
    // Check if user is typing @mention
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtSymbol + 1);
      // Check if there's no space after @ (still typing username)
      if (!textAfterAt.includes(' ') && textAfterAt.length > 0) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
      } else if (textAfterAt.length === 0) {
        setMentionSearch('');
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Insert mention into textarea
  const insertMention = (username: string) => {
    const textBeforeCursor = noteContent.slice(0, cursorPosition);
    const textAfterCursor = noteContent.slice(cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    const newText = 
      textBeforeCursor.slice(0, lastAtSymbol) + 
      `@${username} ` + 
      textAfterCursor;
    
    setNoteContent(newText);
    setShowMentions(false);
    setMentionSearch('');
    
    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  // Filter users for mention suggestions
  const filteredUsers = allUsers?.filter(u => 
    u.username?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 5) || [];

  // Extract mentioned user IDs from content
  const extractMentionedUserIds = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex) || [];
    const usernames = matches.map(m => m.slice(1));
    
    return allUsers
      ?.filter(u => usernames.includes(u.username || ''))
      .map(u => u.user_id) || [];
  };

  // Post community note mutation
  const postNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Must be logged in');
      
      const taggedUserIds = extractMentionedUserIds(content);
      
      const { data, error } = await supabase
        .from('community_notes')
        .insert({ 
          user_id: user.id, 
          content,
          tagged_creator_ids: taggedUserIds 
        })
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

  // Render note content with highlighted @mentions
  const renderNoteContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        const mentionedUser = allUsers?.find(u => u.username === username);
        const roleColor = mentionedUser?.role === 'barber' ? 'text-orange-500' : 'text-green-500';
        
        return (
          <span key={index} className={`${roleColor} font-semibold hover:underline cursor-pointer`}>
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
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
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Share your thoughts... Use @username to mention someone!"
                    value={noteContent}
                    onChange={handleTextareaChange}
                    className="min-h-[100px] bg-transparent border-0 focus-visible:ring-0 resize-none text-base"
                    maxLength={500}
                  />
                  
                  {/* @Mention Dropdown */}
                  {showMentions && filteredUsers.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-2 w-full sm:w-64 bg-background border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                      <div className="p-2 space-y-1">
                        <div className="px-2 py-1 text-xs text-muted-foreground flex items-center gap-1">
                          <AtSign className="w-3 h-3" />
                          Mention someone
                        </div>
                        {filteredUsers.map((u) => {
                          const roleColor = u.role === 'barber' ? 'text-orange-500' : 'text-green-500';
                          return (
                            <button
                              key={u.user_id}
                              onClick={() => insertMention(u.username || '')}
                              className="w-full text-left px-2 py-2 rounded hover:bg-accent flex items-center gap-2 transition-colors"
                            >
                              <span className={`font-semibold ${roleColor}`}>
                                @{u.username}
                              </span>
                              {u.display_name && (
                                <span className="text-xs text-muted-foreground">
                                  {u.display_name}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {noteContent.length}/500
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      • Type @ to mention users
                    </span>
                  </div>
                  <Button
                    size="default"
                    onClick={handlePostNote}
                    disabled={postNoteMutation.isPending || !noteContent.trim()}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Post
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Recent Notes Feed */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {notes?.map((note: any) => {
              const isBarber = note.role === 'barber';
              const isFan = note.role === 'fan';
              const usernameColor = isBarber ? 'text-orange-500' : 'text-green-500';
              const username = note.profiles?.username || note.profiles?.display_name?.toLowerCase().replace(/\s+/g, '_') || 'anonymous';

              return (
                <div
                  key={note.id}
                  className="group relative bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg p-4 transition-all hover:bg-background/90 hover:border-primary/30 animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <button
                      onClick={() => window.location.href = `/barber/${note.user_id}`}
                      className={`font-bold ${usernameColor} hover:underline cursor-pointer text-base flex items-center gap-1`}
                    >
                      @{username}
                      {isBarber && <span className="text-xs">✂️</span>}
                    </button>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-sm text-foreground break-words leading-relaxed">
                    {renderNoteContent(note.content)}
                  </div>
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
