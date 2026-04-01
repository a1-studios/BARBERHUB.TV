import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBookAppointment } from '@/hooks/useBookAppointment';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CalendarDays, Clock, Coins, Star, Home, X, AlertTriangle, CalendarClock } from 'lucide-react';
import { format, isPast, formatDistanceToNow, differenceInHours } from 'date-fns';
import { PostAppointmentReviewModal } from '@/components/reviews/PostAppointmentReviewModal';
import { HouseCallBountyWidget } from '@/components/booking/HouseCallBountyWidget';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  escrow_amount_bb: number;
  status: string;
  appointment_type: string;
  notes: string | null;
  barber_id: string;
  barber_user_id: string;
}

interface Bounty {
  id: string;
  location_text: string;
  service_description: string | null;
  bounty_amount_bb: number;
  status: string;
  expires_at: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
  completed: 'bg-primary/20 text-primary border-primary/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
  denied: 'bg-destructive/20 text-destructive border-destructive/30',
  no_show: 'bg-muted text-muted-foreground border-muted',
  open: 'bg-accent/20 text-accent border-accent/30',
  claimed: 'bg-green-500/20 text-green-400 border-green-500/30',
  expired: 'bg-muted text-muted-foreground border-muted',
};

function AppointmentCard({ appointment, barberName, hasReview, onReview, onCancel, cancelPending }: {
  appointment: Appointment;
  barberName: string;
  hasReview: boolean;
  onReview: () => void;
  onCancel: (id: string, isLateCancel: boolean) => void;
  cancelPending: boolean;
}) {
  const canCancel = ['pending', 'confirmed'].includes(appointment.status);
  const hoursUntil = differenceInHours(new Date(appointment.scheduled_at), new Date());
  const isLateCancel = hoursUntil < 2 && hoursUntil >= 0;

  return (
    <Card className="mb-3">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-medium text-foreground truncate">{barberName}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {format(new Date(appointment.scheduled_at), 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(appointment.scheduled_at), 'h:mm a')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Coins className="w-3 h-3" />
                {appointment.escrow_amount_bb} BB
              </span>
              <Badge variant="outline" className="text-[10px] capitalize">
                {appointment.appointment_type}
              </Badge>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] capitalize ${statusColors[appointment.status] || ''}`}>
            {appointment.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Cancel & Reschedule buttons */}
        {canCancel && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 text-xs"
              onClick={() => onCancel(appointment.id, isLateCancel)}
              disabled={cancelPending}
            >
              <X className="h-3 w-3 mr-1" /> Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs opacity-50 cursor-not-allowed"
              disabled
              title="Coming soon"
            >
              <CalendarClock className="h-3 w-3 mr-1" /> Reschedule
            </Button>
          </div>
        )}

        {appointment.status === 'completed' && !hasReview && (
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={onReview}>
            <Star className="h-3 w-3 mr-1" /> Rate Your Barber
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function MyAppointments({ compact = false }: { compact?: boolean } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { manageMutation } = useBookAppointment();
  const [reviewTarget, setReviewTarget] = useState<{ appointmentId: string; revieweeId: string } | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<{ id: string; isLate: boolean } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return { appointments: [], barberNames: {}, reviewedIds: new Set<string>() };

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', user.id)
        .order('scheduled_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const barberIds = [...new Set((appointments || []).map(a => a.barber_id))];
      const barberNames: Record<string, string> = {};

      if (barberIds.length > 0) {
        const { data: barbers } = await supabase
          .from('barber_profiles')
          .select('id, name')
          .in('id', barberIds);
        barbers?.forEach(b => { barberNames[b.id] = b.name; });
      }

      const completedIds = (appointments || []).filter(a => a.status === 'completed').map(a => a.id);
      const reviewedIds = new Set<string>();
      if (completedIds.length > 0) {
        const { data: reviews } = await supabase
          .from('appointment_reviews')
          .select('appointment_id')
          .eq('reviewer_id', user.id)
          .in('appointment_id', completedIds);
        reviews?.forEach(r => reviewedIds.add(r.appointment_id));
      }

      return { appointments: appointments || [], barberNames, reviewedIds };
    },
    enabled: !!user?.id,
  });

  // Fetch client's bounties
  const { data: bounties, isLoading: bountiesLoading } = useQuery({
    queryKey: ['my-bounties', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('house_call_bounties')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as Bounty[];
    },
    enabled: !!user?.id,
  });

  const cancelBounty = useMutation({
    mutationFn: async (bountyId: string) => {
      // Client cancels their own bounty - update status, trigger will refund
      const { error } = await supabase
        .from('house_call_bounties')
        .update({ status: 'expired' })
        .eq('id', bountyId)
        .eq('client_id', user!.id)
        .eq('status', 'open');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bounties'] });
      queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
      toast.success('Bounty cancelled. BB refunded.');
    },
    onError: () => toast.error('Failed to cancel bounty'),
  });

  const upcoming = data?.appointments.filter(
    a => ['pending', 'confirmed'].includes(a.status) && !isPast(new Date(a.scheduled_at))
  ) || [];
  const past = data?.appointments.filter(
    a => !(['pending', 'confirmed'].includes(a.status) && !isPast(new Date(a.scheduled_at)))
  ).slice(0, 10) || [];

  const activeBounties = bounties?.filter(b => b.status === 'open') || [];
  const pastBounties = bounties?.filter(b => b.status !== 'open') || [];

  const limitedUpcoming = compact ? upcoming.slice(0, 3) : upcoming;
  const limitedPast = compact ? past.slice(0, 3) : past;

  const tabsContent = (
    <Tabs defaultValue="upcoming">
      <TabsList className="w-full mb-3">
        <TabsTrigger value="upcoming" className="flex-1">
          Upcoming {upcoming.length > 0 && `(${upcoming.length})`}
        </TabsTrigger>
        <TabsTrigger value="past" className="flex-1">Past</TabsTrigger>
        {!compact && (
          <TabsTrigger value="bounties" className="flex-1">
            <Home className="h-3 w-3 mr-1" />
            Bounties {activeBounties.length > 0 && `(${activeBounties.length})`}
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="upcoming">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
        ) : limitedUpcoming.length > 0 ? (
          limitedUpcoming.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
            .map(apt => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                barberName={data?.barberNames[apt.barber_id] || 'Barber'}
                hasReview={false}
                onReview={() => {}}
                onCancel={(id, isLate) => setCancelConfirm({ id, isLate })}
                cancelPending={manageMutation.isPending}
              />
            ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">No upcoming appointments</p>
        )}
      </TabsContent>

      <TabsContent value="past">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
        ) : limitedPast.length > 0 ? (
          limitedPast.map(apt => (
            <AppointmentCard
              key={apt.id}
              appointment={apt}
              barberName={data?.barberNames[apt.barber_id] || 'Barber'}
              hasReview={data?.reviewedIds.has(apt.id) || false}
              onReview={() => setReviewTarget({ appointmentId: apt.id, revieweeId: apt.barber_user_id })}
              onCancel={(id, isLate) => setCancelConfirm({ id, isLate })}
              cancelPending={manageMutation.isPending}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">No past appointments</p>
        )}
      </TabsContent>

      {!compact && (
        <TabsContent value="bounties" className="space-y-4">
          <HouseCallBountyWidget />

          {activeBounties.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Bounties</p>
              {activeBounties.map(b => (
                <Card key={b.id} className="border-accent/20">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">📍 {b.location_text}</p>
                        {b.service_description && <p className="text-xs text-muted-foreground">{b.service_description}</p>}
                        <p className="text-[10px] text-muted-foreground">
                          Expires {formatDistanceToNow(new Date(b.expires_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-primary">{b.bounty_amount_bb} BB</p>
                        <Badge variant="outline" className={`text-[10px] ${statusColors[b.status]}`}>{b.status}</Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full text-xs text-destructive hover:text-destructive"
                      onClick={() => cancelBounty.mutate(b.id)}
                      disabled={cancelBounty.isPending}
                    >
                      <X className="h-3 w-3 mr-1" /> Cancel & Refund
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {pastBounties.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Past Bounties</p>
              {pastBounties.slice(0, 5).map(b => (
                <Card key={b.id} className="opacity-60">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">📍 {b.location_text}</p>
                      <p className="text-xs text-muted-foreground">{b.bounty_amount_bb} BB</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${statusColors[b.status]}`}>{b.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      )}
    </Tabs>
  );

  if (compact) return <>{tabsContent}</>;

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">My Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {tabsContent}
        </CardContent>
      </Card>

      {reviewTarget && (
        <PostAppointmentReviewModal
          open={!!reviewTarget}
          onOpenChange={(open) => !open && setReviewTarget(null)}
          appointmentId={reviewTarget.appointmentId}
          revieweeId={reviewTarget.revieweeId}
          isBarberReviewing={false}
          onSuccess={() => refetch()}
        />
      )}
    </>
  );
}
