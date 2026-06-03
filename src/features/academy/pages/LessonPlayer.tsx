import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stream } from '@cloudflare/stream-react';
import { ArrowLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { fetchLesson, fetchLessons, fetchCourse, fetchUserXp } from '../lib/queries';

const R2_BASE = 'https://media.barberhub.tv';

const LessonPlayer = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const grantedRef = useRef(false);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ['academy-lesson', lessonId],
    queryFn: () => fetchLesson(lessonId!),
    enabled: !!lessonId,
  });

  const { data: course } = useQuery({
    queryKey: ['academy-course', courseId],
    queryFn: () => fetchCourse(courseId!),
    enabled: !!courseId,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['academy-lessons', courseId],
    queryFn: () => fetchLessons(courseId!),
    enabled: !!courseId,
  });

  const nextLesson = useMemo(() => {
    if (!lesson) return null;
    const idx = lessons.findIndex((l) => l.id === lesson.id);
    return idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null;
  }, [lesson, lessons]);

  // Reset grant flag when lesson changes
  useEffect(() => {
    grantedRef.current = false;
  }, [lessonId]);

  const handleComplete = async () => {
    if (!user || !lesson || !courseId || grantedRef.current) return;
    grantedRef.current = true;

    const reward = lesson.xp_reward ?? 0;

    try {
      // Upsert progress row
      const { error: progErr } = await supabase
        .from('academy_progress')
        .upsert(
          {
            user_id: user.id,
            course_id: courseId,
            lesson_id: lesson.id,
            completed: true,
            progress_pct: 100,
            xp_earned: reward,
            completed_at: new Date().toISOString(),
            last_watched_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,lesson_id' },
        );
      if (progErr) throw progErr;

      // Increment xp_total on barber_profiles (best-effort, only if row exists)
      if (reward > 0) {
        const { data: bp } = await supabase
          .from('barber_profiles')
          .select('xp_total')
          .eq('user_id', user.id)
          .maybeSingle();
        if (bp) {
          await supabase
            .from('barber_profiles')
            .update({ xp_total: ((bp as any).xp_total ?? 0) + reward })
            .eq('user_id', user.id);
        }
      }

      toast.success(`+${reward} XP earned!`, {
        icon: <Sparkles className="w-4 h-4 text-[#1DC4A0]" />,
      });
      queryClient.invalidateQueries({ queryKey: ['academy-progress', user.id, courseId] });
      queryClient.invalidateQueries({ queryKey: ['academy-xp', user.id] });
    } catch (e: any) {
      toast.error('Could not save progress');
      grantedRef.current = false;
    }
  };

  if (isLoading || !lesson) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#FF6B1A]" />
      </main>
    );
  }

  const r2Url = lesson.r2_video_key ? `${R2_BASE}/${lesson.r2_video_key}` : null;
  const aspectClass = isMobile ? 'aspect-[9/16]' : 'aspect-video';

  return (
    <main className="min-h-screen bg-[#0a0a0f] pb-24">
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <button
          onClick={() => navigate(`/academy/${courseId}`)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {course?.title || 'Course'}
        </button>

        <div className={`relative w-full ${aspectClass} bg-black rounded-2xl overflow-hidden`}>
          {lesson.cloudflare_stream_uid ? (
            <Stream
              controls
              src={lesson.cloudflare_stream_uid}
              onEnded={handleComplete}
              className="w-full h-full"
              responsive={false}
            />
          ) : r2Url ? (
            <video
              src={r2Url}
              controls
              playsInline
              onEnded={handleComplete}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              No video source available
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">{lesson.title}</h1>
          {lesson.description && (
            <p className="text-sm text-muted-foreground">{lesson.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {lesson.duration_seconds && <span>{Math.ceil(lesson.duration_seconds / 60)} min</span>}
            {(lesson.xp_reward ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[#1DC4A0] font-semibold">
                <Sparkles className="w-3 h-3" /> +{lesson.xp_reward} XP
              </span>
            )}
          </div>
        </div>

        {nextLesson && (
          <button
            onClick={() => navigate(`/academy/${courseId}/lesson/${nextLesson.id}`)}
            className="mt-6 w-full py-3 rounded-xl bg-card/60 border border-border/40 hover:border-[#FF6B1A]/50 flex items-center justify-between px-4 text-sm transition-all"
          >
            <span className="text-left">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Up next</span>
              <span className="block font-semibold text-foreground">{nextLesson.title}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-[#FF6B1A]" />
          </button>
        )}
      </div>
    </main>
  );
};

export default LessonPlayer;
