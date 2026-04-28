import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Lock, Play, Coins } from 'lucide-react';

interface AcademyRailProps {
  onCourseSelect: (course: AcademyCourse) => void;
}

export interface AcademyCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  media_url: string | null;
  cloudflare_stream_uid: string | null;
  price_bb: number;
  creator_id: string;
  content_type: string;
}

export function AcademyRail({ onCourseSelect }: AcademyRailProps) {
  const { user } = useAuth();

  const { data: courses, isLoading } = useQuery({
    queryKey: ['academy-courses-featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_content')
        .select('id, title, description, thumbnail_url, media_url, cloudflare_stream_uid, price_bb, creator_id, content_type')
        .in('content_type', ['masterclass', 'tutorial'])
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data as any[]) as AcademyCourse[];
    },
  });

  const { data: unlockedIds } = useQuery({
    queryKey: ['academy-unlocked-ids', user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      const { data } = await supabase
        .from('academy_unlocks')
        .select('content_id')
        .eq('student_id', user.id);
      return new Set((data || []).map((r: any) => r.content_id as string));
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto px-4 -mx-4 pb-2 scrollbar-hide">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-shrink-0 w-44 h-32 rounded-xl bg-card/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="rounded-xl border border-border/20 bg-card/30 p-6 text-center">
        <p className="text-xs text-muted-foreground">No courses published yet — be the first.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto px-4 -mx-4 pb-2 scrollbar-hide snap-x snap-mandatory">
      {courses.map((course) => {
        const isUnlocked = unlockedIds?.has(course.id) || course.creator_id === user?.id;
        const isFree = course.price_bb === 0;

        return (
          <button
            key={course.id}
            onClick={() => onCourseSelect(course)}
            className="flex-shrink-0 w-44 snap-start rounded-xl overflow-hidden bg-card/60 border border-border/30 hover:border-primary/40 transition-all active:scale-[0.97] text-left"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-background overflow-hidden">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-8 h-8 text-primary/50" />
                </div>
              )}

              {/* Lock overlay */}
              {!isUnlocked && !isFree && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
              )}

              {/* Price chip */}
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur border border-primary/30">
                {isFree ? (
                  <span className="text-[10px] font-bold text-green-400 uppercase">Free</span>
                ) : (
                  <>
                    <Coins className="w-2.5 h-2.5 text-primary" />
                    <span className="text-[10px] font-bold text-primary">{course.price_bb}</span>
                  </>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="p-2.5">
              <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-tight">
                {course.title}
              </h4>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
                {course.content_type}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
