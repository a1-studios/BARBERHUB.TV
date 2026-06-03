import { Link } from 'react-router-dom';
import { Coins, Sparkles, BookOpen, Lock } from 'lucide-react';
import type { AcademyCourse } from '../lib/queries';

interface Props {
  course: AcademyCourse;
  userXp: number;
  className?: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  intermediate: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  advanced: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export const CourseCard = ({ course, userXp, className = '' }: Props) => {
  const xpReq = course.xp_required ?? 0;
  const meetsXp = userXp >= xpReq;
  const price = course.price_bb ?? 0;
  const isFreeViaXp = xpReq > 0 && meetsXp && price === 0;

  return (
    <Link
      to={`/academy/${course.id}`}
      className={`group block rounded-2xl overflow-hidden border border-border/40 bg-card/40 hover:border-[#FF6B1A]/50 transition-all ${className}`}
    >
      <div className="relative aspect-video bg-gradient-to-br from-[#1a1a22] to-[#0a0a0f] overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
            <BookOpen className="w-8 h-8" />
          </div>
        )}
        {!meetsXp && xpReq > 0 && price === 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-[10px] font-bold text-[#1DC4A0]">
            <Lock className="w-2.5 h-2.5" />
            {xpReq} XP
          </div>
        )}
        <span className={`absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[course.difficulty?.toLowerCase()] || 'bg-muted/40 border-border text-muted-foreground'}`}>
          {course.difficulty || '—'}
        </span>
      </div>

      <div className="p-3 space-y-2">
        <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
          {course.title}
        </h3>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{course.total_lessons ?? 0} lessons</span>
          {(course.total_xp ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[#1DC4A0] font-semibold">
              <Sparkles className="w-3 h-3" />
              +{course.total_xp} XP
            </span>
          )}
        </div>
        <div className="pt-1">
          {price > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FF6B1A]">
              <Coins className="w-3.5 h-3.5" />
              {price} BB
            </span>
          ) : isFreeViaXp ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1DC4A0]">
              <Sparkles className="w-3.5 h-3.5" />
              FREE via XP
            </span>
          ) : (
            <span className="text-xs font-bold text-emerald-400">FREE</span>
          )}
        </div>
      </div>
    </Link>
  );
};
