import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, Coins, Star } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { PostAppointmentReviewModal } from '@/components/reviews/PostAppointmentReviewModal';

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

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
  completed: 'bg-primary/20 text-primary border-primary/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
  denied: 'bg-destructive/20 text-destructive border-destructive/30',
  no_show: 'bg-muted text-muted-foreground border-muted',
};

function AppointmentCard({ appointment, barberName, hasReview, onReview }: {
  appointment: Appointment;
  barberName: string;
  hasReview: boolean;
  onReview: () => void;
}) {
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

        {appointment.status === 'completed' && !hasReview && (
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={onReview}>
            <Star className="h-3 w-3 mr-1" /> Rate Your Barber
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function MyAppointments() {
  const { user } = useAuth();
  const [reviewTarget, setReviewTarget] = useState<{ appointmentId: string; revieweeId: string } | null>(null);

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

      // Check which appointments user has already reviewed
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

  const upcoming = data?.appointments.filter(
    a => ['pending', 'confirmed'].includes(a.status) && !isPast(new Date(a.scheduled_at))
  ) || [];
  const past = data?.appointments.filter(
    a => !(['pending', 'confirmed'].includes(a.status) && !isPast(new Date(a.scheduled_at)))
  ).slice(0, 10) || [];

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">My Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming">
            <TabsList className="w-full mb-3">
              <TabsTrigger value="upcoming" className="flex-1">
                Upcoming {upcoming.length > 0 && `(${upcoming.length})`}
              </TabsTrigger>
              <TabsTrigger value="past" className="flex-1">Past</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
              ) : upcoming.length > 0 ? (
                upcoming.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                  .map(apt => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      barberName={data?.barberNames[apt.barber_id] || 'Barber'}
                      hasReview={false}
                      onReview={() => {}}
                    />
                  ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No upcoming appointments</p>
              )}
            </TabsContent>

            <TabsContent value="past">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
              ) : past.length > 0 ? (
                past.map(apt => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    barberName={data?.barberNames[apt.barber_id] || 'Barber'}
                    hasReview={data?.reviewedIds.has(apt.id) || false}
                    onReview={() => setReviewTarget({ appointmentId: apt.id, revieweeId: apt.barber_user_id })}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No past appointments</p>
              )}
            </TabsContent>
          </Tabs>
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
