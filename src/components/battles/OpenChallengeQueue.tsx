import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { IssueChallenge } from './IssueChallenge';
import { ChallengeFeed } from './ChallengeFeed';
import { Flame, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

export const OpenChallengeQueue = () => {
  const { user } = useAuth();
  const { isBarber } = useUserRole();
  const { tierName } = useSubscriptionLimits();

  const isSilverPlus = ['silver', 'gold', 'diamond'].includes(tierName);

  // Show to ALL barbers (viewing is open, creating/accepting gated to Silver+)
  if (!user || !isBarber) return null;

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-red-500" />
            <span className="text-lg font-bold text-foreground tracking-wide">
              Personal Challenges
            </span>
            <span className="text-xs text-yellow-500/70 hidden sm:inline">
              Unofficial — no ranking impact
            </span>
          </div>

          {isSilverPlus && (
            <Drawer>
              <DrawerTrigger asChild>
                <Button size="icon" variant="outline" className="border-red-500/30 hover:border-red-500/60 hover:bg-red-500/10">
                  <Plus className="w-5 h-5 text-red-500" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader>
                  <DrawerTitle className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-red-500" />
                    Issue a Challenge
                  </DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6 overflow-y-auto">
                  <IssueChallenge />
                </div>
              </DrawerContent>
            </Drawer>
          )}
        </div>

        <ChallengeFeed />
      </div>
    </section>
  );
};
