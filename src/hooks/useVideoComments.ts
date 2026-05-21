import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface VideoComment {
  id: string;
  video_id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface MentionUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const MENTION_REGEX = /@(\w+)/g;

export function useVideoComments(videoId: string | null | undefined) {
  const { user } = useAuth();
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Cache author profiles per video session so realtime inserts can render
  // without re-fetching for repeat authors.
  const profileCacheRef = useRef<Map<string, MentionUser>>(new Map());

  const hydrateProfiles = useCallback(async (userIds: string[]) => {
    const missing = Array.from(new Set(userIds)).filter(
      (id) => !profileCacheRef.current.has(id),
    );
    if (missing.length === 0) return;
    const { data, error: rpcErr } = await supabase.rpc(
      'get_multiple_public_profiles',
      { user_ids: missing },
    );
    if (rpcErr || !data) return;
    for (const row of data as any[]) {
      profileCacheRef.current.set(row.user_id, {
        user_id: row.user_id,
        display_name: row.display_name ?? null,
        avatar_url: row.avatar_url ?? null,
      });
    }
  }, []);

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!videoId) {
      setComments([]);
      return;
    }
    let cancelled = false;
    profileCacheRef.current.clear();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data, error: qErr } = await supabase
          .from('comments')
          .select('id, video_id, user_id, content, created_at')
          .eq('video_id', videoId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(50);
        if (qErr) throw qErr;

        const rows = (data ?? []).slice().reverse();
        await hydrateProfiles(rows.map((r) => r.user_id));
        if (cancelled) return;

        setComments(
          rows.map((r) => {
            const p = profileCacheRef.current.get(r.user_id);
            return {
              ...r,
              display_name: p?.display_name ?? null,
              avatar_url: p?.avatar_url ?? null,
            };
          }),
        );
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`comments:video:${videoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `video_id=eq.${videoId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            video_id: string;
            user_id: string;
            content: string;
            created_at: string;
            is_deleted: boolean;
          };
          if (row.is_deleted) return;
          await hydrateProfiles([row.user_id]);
          const p = profileCacheRef.current.get(row.user_id);
          setComments((prev) => {
            if (prev.some((c) => c.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                video_id: row.video_id,
                user_id: row.user_id,
                content: row.content,
                created_at: row.created_at,
                display_name: p?.display_name ?? null,
                avatar_url: p?.avatar_url ?? null,
              },
            ];
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [videoId, hydrateProfiles]);

  const submitComment = useCallback(
    async (rawContent: string) => {
      if (!videoId) throw new Error('No active video');
      if (!user) throw new Error('Sign in to comment');
      const content = rawContent.trim();
      if (content.length < 1 || content.length > 150) {
        throw new Error('Comment must be 1–150 characters');
      }
      setSubmitting(true);
      try {
        const { data: inserted, error: insErr } = await supabase
          .from('comments')
          .insert({ video_id: videoId, user_id: user.id, content })
          .select('id, video_id, user_id, content, created_at')
          .single();
        if (insErr) throw insErr;

        // Mentions
        const handles = Array.from(
          new Set(
            Array.from(content.matchAll(MENTION_REGEX)).map((m) =>
              m[1].toLowerCase(),
            ),
          ),
        );
        if (handles.length > 0 && inserted) {
          const { data: matched } = await supabase
            .from('profiles')
            .select('user_id, display_name')
            .or(
              handles
                .map((h) => `display_name.ilike.${h}`)
                .join(','),
            );
          if (matched && matched.length > 0) {
            await supabase.from('comment_mentions').insert(
              matched.map((m: any) => ({
                comment_id: inserted.id,
                mentioned_user_id: m.user_id,
              })),
            );
          }
        }
        return inserted;
      } finally {
        setSubmitting(false);
      }
    },
    [videoId, user],
  );

  const searchUsers = useCallback(
    async (query: string): Promise<MentionUser[]> => {
      const q = query.trim();
      if (!q) return [];
      const { data, error: qErr } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .ilike('display_name', `${q}%`)
        .not('display_name', 'is', null)
        .limit(8);
      if (qErr || !data) return [];
      return (data as any[]).map((r) => ({
        user_id: r.user_id,
        display_name: r.display_name ?? null,
        avatar_url: r.avatar_url ?? null,
      }));
    },
    [],
  );

  return { comments, loading, error, submitting, submitComment, searchUsers };
}
