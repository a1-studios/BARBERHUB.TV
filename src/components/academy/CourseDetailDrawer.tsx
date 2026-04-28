import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { AddFundsModal } from '@/components/AddFundsModal';
import { BrandedVideoPlayer } from '@/components/BrandedVideoPlayer';
import { CloudflareStreamPlayer } from '@/components/CloudflareStreamPlayer';
import { Coins, Lock, GraduationCap, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AcademyCourse } from './AcademyRail';

interface CourseDetailDrawerProps {
  course: AcademyCourse | null;
  onClose: () => void;
}

export function CourseDetailDrawer({ course, onClose }: CourseDetailDrawerProps) {
  const { user } = useAuth();
  const { barberBucks } = useBarberBucks();
  const queryClient = useQueryClient();
  const [unlocking, setUnlocking] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);

  const { data: isUnlocked, isLoading: checkingUnlock } = useQuery({
    queryKey: ['academy-unlock-check', course?.id, user?.id],
    queryFn: async () => {
      if (!course || !user) return false;
      if (course.creator_id === user.id) return true; // educator owns it
      if (course.price_bb === 0) {
        // Auto-unlock free for logged-in users on first view
        return true;
      }
      const { data } = await supabase
        .from('academy_unlocks')
        .select('id')
        .eq('content_id', course.id)
        .eq('student_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!course && !!user,
  });

  if (!course) return null;

  const isOwner = course.creator_id === user?.id;
  const isFree = course.price_bb === 0;
  const canWatch = isUnlocked || isOwner || isFree;

  const handleUnlock = async () => {
    if (!user) {
      toast.error('Sign in to unlock this course');
      return;
    }

    if (course.price_bb > 0 && barberBucks < course.price_bb) {
      setShowAddFunds(true);
      return;
    }

    setUnlocking(true);
    try {
      const { data, error } = await supabase.functions.invoke('academy-unlock-course', {
        body: { content_id: course.id },
      });

      if (error) throw error;
      if (data?.error === 'insufficient_funds') {
        setShowAddFunds(true);
        return;
      }

      toast.success(isFree ? 'Course unlocked!' : `Unlocked for ${course.price_bb} BB`);
      queryClient.invalidateQueries({ queryKey: ['academy-unlock-check', course.id] });
      queryClient.invalidateQueries({ queryKey: ['academy-unlocked-ids'] });
      queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
    } catch (err: any) {
      toast.error(err.message || 'Unlock failed');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <>
      <Drawer open={!!course} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center justify-center gap-2 text-base font-bold">
              <GraduationCap className="w-4 h-4 text-primary" />
              <span className="uppercase tracking-wide">{course.content_type}</span>
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-6 overflow-y-auto space-y-4">
            {/* Video / Paywall */}
            <div className="aspect-video rounded-xl overflow-hidden bg-background border border-border/30 relative">
              {canWatch && course.cloudflare_stream_uid ? (
                <CloudflareStreamPlayer streamUid={course.cloudflare_stream_uid} />
              ) : canWatch && course.media_url ? (
                <BrandedVideoPlayer src={course.media_url} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/10 to-background">
                  {course.thumbnail_url && (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                  )}
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="p-4 rounded-full bg-primary/15 border border-primary/30">
                      <Lock className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">Locked content</p>
                  </div>
                </div>
              )}
            </div>

            {/* Title + meta */}
            <div>
              <h2 className="text-xl font-black text-foreground leading-tight">{course.title}</h2>
              {course.description && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{course.description}</p>
              )}
            </div>

            {/* Price + CTA */}
            {!canWatch && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      Unlock Price
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Coins className="w-5 h-5 text-primary" />
                      <span className="text-2xl font-black text-primary">{course.price_bb}</span>
                      <span className="text-sm text-muted-foreground font-bold">BB</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      Your Balance
                    </p>
                    <p className="text-sm font-bold text-foreground mt-1">{barberBucks} BB</p>
                  </div>
                </div>

                <Button
                  onClick={handleUnlock}
                  disabled={unlocking || checkingUnlock}
                  className="w-full h-11 font-bold rounded-xl bg-primary hover:bg-primary/90"
                >
                  {unlocking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Unlocking...
                    </>
                  ) : barberBucks < course.price_bb ? (
                    <>Add Funds — Need {course.price_bb - barberBucks} more BB</>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Unlock for {course.price_bb} BB
                    </>
                  )}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  Educator earns 85% • Platform fee 15%
                </p>
              </div>
            )}

            {canWatch && !isOwner && (
              <div className="flex items-center justify-center gap-2 text-xs text-green-400 py-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-bold">Unlocked</span>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AddFundsModal isOpen={showAddFunds} onClose={() => setShowAddFunds(false)} />
    </>
  );
}
