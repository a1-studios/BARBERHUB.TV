import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { IssueChallenge } from './IssueChallenge';
import { ChallengeFeed } from './ChallengeFeed';
import { Flame } from 'lucide-react';

export const OpenChallengeQueue = () => {
  const { user } = useAuth();
  const { isBarber } = useUserRole();

  // Only show to barbers
  if (!user || !isBarber) return null;

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-muted/30 to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
      
      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-sm rounded-full border border-red-500/30 mb-6">
            <Flame className="w-6 h-6 text-red-500 animate-pulse" />
            <span className="text-sm font-bold text-foreground uppercase tracking-wider">
              Personal Challenge Arena
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Challenge Any Barber
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stake Barber Bucks and challenge opponents to video-submission battles. Winner takes the pot!
          </p>
          <p className="text-sm text-yellow-500/80 mt-2">
            These are unofficial battles — they do not count toward global rankings.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Issue Challenge Section */}
          <div className="lg:col-span-1">
            <IssueChallenge />
          </div>

          {/* Challenge Feed */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-foreground mb-2">
                🔴 Active Challenges
              </h3>
              <p className="text-muted-foreground">
                Open challenges waiting for opponents to match the stake
              </p>
            </div>
            <ChallengeFeed />
          </div>
        </div>
      </div>
    </section>
  );
};
