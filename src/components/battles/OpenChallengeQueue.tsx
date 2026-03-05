import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { ChallengeFeed } from './ChallengeFeed';
import { Flame } from 'lucide-react';

export const OpenChallengeQueue = () => {
  const { user } = useAuth();
  const { isBarber } = useUserRole();

  if (!user || !isBarber) return null;

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center gap-3 mb-5">
          <Flame className="w-5 h-5 text-red-500" />
          <span className="text-lg font-bold text-foreground tracking-wide">
            Challenges
          </span>
          <span className="text-xs text-yellow-500/70 hidden sm:inline">
            Unofficial — no ranking impact
          </span>
        </div>

        <ChallengeFeed />
      </div>
    </section>
  );
};
