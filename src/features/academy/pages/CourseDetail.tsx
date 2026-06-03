import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { invokeAuthedFunction } from '@/lib/invokeAuthed';
import { toast } from 'sonner';
import { ArrowLeft, Lock, Play, CheckCircle2, Coins, Sparkles, Loader2 } from 'lucide-react';
import {
  fetchCourse,
  fetchLessons,
  fetchCourseProgress,
  fetchEducatorName,
  fetchUserXp,
} from '../lib/queries';

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unlocking, setUnlocking] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ['academy-course', courseId],
    queryFn: () => fetchCourse(courseId!),
    enabled: !!courseId,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['academy-lessons', courseId],
    queryFn: () => fetchLessons(courseId!),
    enabled: !!courseId,
  });

  const { data: educator } = useQuery({
    queryKey: ['academy-educator', course?.educator_id],
    queryFn: () => fetchEducatorName(course!.educator_id),
    enabled: !!course?.educator_id,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['academy-progress', user?.id, courseId],
    queryFn: () => fetchCourseProgress(user!.id, courseId!),
    enabled: !!user?.id && !!courseId,
  });

  const { data: xp } = useQuery({
    queryKey: ['academy-xp', user?.id],
    queryFn: () => fetchUserXp(user!.id),
    enabled: !!user?.id,
  });

  const { data: unlocked } = useQuery({
    queryKey: ['academy-unlock-status', user?.id, courseId],
    queryFn: async () => {
      if (!user?.id || !courseId) return false;
      const { data } = await supabase
        .from('academy_unlocks')
        .select('id')
        .eq('content_id', courseId)
        .eq('student_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id && !!courseId,
  });

  const completedIds = useMemo(
    () => new Set(progress.filter((p) => p.completed).map((p) => p.lesson_id)),
    [progress],
  );
  const completedPct = lessons.length
    ? Math.round((completedIds.size / lessons.length) * 100)
    : 0;

  const userXp = xp?.xp_total ?? 0;
  const xpReq = course?.xp_required ?? 0;
  const price = course?.price_bb ?? 0;
  const meetsXp = userXp >= xpReq;
  const hasAccess = meetsXp || (price > 0 && unlocked);

  const handleUnlock = async () => {
    if (!user) {
      toast.error('Sign in to unlock courses');
      return;
    }
    setUnlocking(true);
    try {
      const { data, error } = await invokeAuthedFunction('academy-unlock-course', {
        content_id: courseId,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Unlocked! ${price} BB spent.`);
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || 'Unlock failed');
    } finally {
      setUnlocking(false);
    }
  };

  const startLearning = () => {
    const firstUnlocked = lessons.find((l) => l.is_free_preview || hasAccess);
    if (firstUnlocked) navigate(`/academy/${courseId}/lesson/${firstUnlocked.id}`);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#FF6B1A]" />
      </main>
    );
  }

  if (!course) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-4 py-12 text-center">
        <p className="text-muted-foreground">Course not found.</p>
        <Link to="/academy" className="mt-4 inline-block text-[#FF6B1A] text-sm">Back to Academy</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <button
          onClick={() => navigate('/academy')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Academy
        </button>

        {/* Hero */}
        <div className="rounded-3xl overflow-hidden border border-border/40 bg-card/40">
          <div className="relative aspect-video bg-gradient-to-br from-[#1a1a22] to-[#0a0a0f]">
            {course.thumbnail_url && (
              <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
            )}
          </div>

          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[#FF6B1A]/15 text-[#FF6B1A] text-[10px] font-bold uppercase tracking-wider border border-[#FF6B1A]/30">
                {course.category}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground text-[10px] font-bold uppercase tracking-wider border border-border/40">
                {course.difficulty}
              </span>
              {(course.total_xp ?? 0) > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#1DC4A0]/15 text-[#1DC4A0] text-[10px] font-bold uppercase tracking-wider border border-[#1DC4A0]/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> +{course.total_xp} XP
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{course.title}</h1>
            {course.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>
            )}

            <div className="flex items-center gap-3">
              {educator?.avatar_url ? (
                <img src={educator.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted/30" />
              )}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Educator</p>
                <p className="text-sm font-semibold text-foreground">{educator?.name || '—'}</p>
              </div>
            </div>

            {/* Progress ring */}
            {user && hasAccess && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1DC4A0]/5 border border-[#1DC4A0]/20">
                <ProgressRing pct={completedPct} />
                <div>
                  <p className="text-xs text-muted-foreground">Your progress</p>
                  <p className="text-sm font-bold text-foreground">
                    {completedIds.size} / {lessons.length} lessons · {completedPct}%
                  </p>
                </div>
              </div>
            )}

            {/* Access gate */}
            {hasAccess ? (
              <button
                onClick={startLearning}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6B1A] to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" /> Start Learning
              </button>
            ) : price > 0 ? (
              <button
                onClick={handleUnlock}
                disabled={unlocking}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6B1A] to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                Unlock for {price} BB
              </button>
            ) : (
              <div className="w-full py-3 rounded-xl bg-muted/30 border border-border/40 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                Reach {xpReq} XP to unlock ({Math.max(0, xpReq - userXp)} XP to go)
              </div>
            )}
          </div>
        </div>

        {/* Lessons */}
        <section className="mt-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Lessons
          </h2>
          <div className="space-y-2">
            {lessons.map((lesson, i) => {
              const isCompleted = completedIds.has(lesson.id);
              const isLocked = !hasAccess && !lesson.is_free_preview;
              return (
                <button
                  key={lesson.id}
                  disabled={isLocked}
                  onClick={() => navigate(`/academy/${courseId}/lesson/${lesson.id}`)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    isLocked
                      ? 'border-border/30 bg-card/20 opacity-60 cursor-not-allowed'
                      : 'border-border/40 bg-card/40 hover:border-[#FF6B1A]/50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                    {isCompleted ? <CheckCircle2 className="w-4 h-4 text-[#1DC4A0]" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{lesson.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {lesson.duration_seconds ? `${Math.ceil(lesson.duration_seconds / 60)} min` : '—'}
                      {(lesson.xp_reward ?? 0) > 0 && ` · +${lesson.xp_reward} XP`}
                      {lesson.is_free_preview && ' · Preview'}
                    </p>
                  </div>
                  {isLocked ? (
                    <Lock className="w-4 h-4 text-muted-foreground/60" />
                  ) : (
                    <Play className="w-4 h-4 text-[#FF6B1A]" />
                  )}
                </button>
              );
            })}
            {lessons.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No lessons yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

const ProgressRing = ({ pct }: { pct: number }) => {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="flex-shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="#1DC4A0"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="26" textAnchor="middle" className="text-[10px] font-bold" fill="#fff">
        {pct}%
      </text>
    </svg>
  );
};

export default CourseDetail;
