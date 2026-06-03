import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { SignatureHeader } from '@/components/shared/SignatureHeader';
import {
  ACADEMY_CATEGORIES,
  fetchCourses,
  fetchFeaturedCourses,
  fetchUserXp,
} from '../lib/queries';
import { CourseCard } from '../components/CourseCard';
import { XpProgressBar } from '../components/XpProgressBar';
import { GraduationCap } from 'lucide-react';

const AcademyHome = () => {
  const { user } = useAuth();
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const { data: xp } = useQuery({
    queryKey: ['academy-xp', user?.id],
    queryFn: () => fetchUserXp(user!.id),
    enabled: !!user?.id,
  });

  const { data: featured = [] } = useQuery({
    queryKey: ['academy-featured'],
    queryFn: fetchFeaturedCourses,
  });

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['academy-courses', activeCat],
    queryFn: () => fetchCourses(activeCat || undefined),
  });

  const userXp = xp?.xp_total ?? 0;
  const userLevel = xp?.xp_level ?? 1;

  const visibleFeatured = useMemo(() => featured.slice(0, 4), [featured]);

  return (
    <main className="min-h-screen bg-[#0a0a0f] pb-24">
      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B1A]/15 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-[#FF6B1A]" />
          </div>
          <SignatureHeader title="Barber Hub Academy" subtitle="LEARN · LEVEL UP · EARN XP" className="" />
        </div>

        {user && <XpProgressBar xpTotal={userXp} xpLevel={userLevel} />}

        {/* Featured row */}
        {visibleFeatured.length > 0 && (
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Featured
            </h2>
            <div className="flex md:grid md:grid-cols-4 gap-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
              {visibleFeatured.map((c) => (
                <div key={c.id} className="snap-start flex-shrink-0 w-[70%] md:w-auto">
                  <CourseCard course={c} userXp={userXp} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category tabs */}
        <section>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
            <button
              onClick={() => setActiveCat(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                activeCat === null
                  ? 'bg-[#FF6B1A] border-[#FF6B1A] text-white'
                  : 'bg-card/40 border-border/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            {ACADEMY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                  activeCat === cat
                    ? 'bg-[#FF6B1A] border-[#FF6B1A] text-white'
                    : 'bg-card/40 border-border/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Course grid */}
        <section>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-card/30 animate-pulse" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No courses{activeCat ? ` in ${activeCat}` : ''} yet. Check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {courses.map((c) => (
                <CourseCard key={c.id} course={c} userXp={userXp} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default AcademyHome;
