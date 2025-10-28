import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { IssueChallenge } from './IssueChallenge';
import { ChallengeFeed } from './ChallengeFeed';
import { Flame } from 'lucide-react';

export const OpenChallengeQueue = () => {
  const { user } = useAuth();
  const { isBarber } = useUserRole();

  if (!user) return null;

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-muted/30 to-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
      
      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-sm rounded-full border border-red-500/30 mb-6">
            <Flame className="w-6 h-6 text-red-500 animate-pulse" />
            <span className="text-sm font-bold text-foreground uppercase tracking-wider">
              Open Challenge Arena
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Go Live NOW and Challenge Anyone
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Issue spontaneous battles or accept challenges from barbers around the world
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Issue Challenge Section - Only for Barbers */}
          {isBarber && (
            <div className="lg:col-span-1">
              <IssueChallenge />
            </div>
          )}

          {/* Challenge Feed */}
          <div className={isBarber ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-foreground mb-2">
                🔴 Live Challenges
              </h3>
              <p className="text-muted-foreground">
                Active challenges waiting for opponents
              </p>
            </div>
            <ChallengeFeed />
          </div>
        </div>
      </div>
    </section>
  );
};
