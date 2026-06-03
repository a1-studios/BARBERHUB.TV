import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { ChallengeFeed } from './ChallengeFeed';
import { SignatureHeader } from '@/components/shared/SignatureHeader';

export const OpenChallengeQueue = () => {
  const { user } = useAuth();
  const { isBarber } = useUserRole();

  if (!user || !isBarber) return null;

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl">
        <SignatureHeader title="Challenges" subtitle="OPEN CHALLENGES" />
        <ChallengeFeed />
      </div>
    </section>
  );
};
