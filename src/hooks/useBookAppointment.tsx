import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BookAppointmentParams {
  barber_id: string;
  barber_user_id: string;
  service_id?: string;
  appointment_type: 'standard' | 'house_call' | 'sos';
  scheduled_at: string;
  duration_minutes?: number;
  escrow_amount_bb: number;
  client_location_text?: string;
  client_lat?: number;
  client_lng?: number;
  notes?: string;
}

interface ManageAppointmentParams {
  appointment_id: string;
  action: 'accept' | 'deny' | 'complete' | 'cancel';
  denial_reason?: string;
}

export function useBookAppointment() {
  const queryClient = useQueryClient();

  const bookMutation = useMutation({
    mutationFn: async (params: BookAppointmentParams) => {
      const { data, error } = await supabase.functions.invoke('book-appointment', {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
      queryClient.invalidateQueries({ queryKey: ['barber-existing-appointments'] });
      toast.success('Appointment booked! Waiting for barber confirmation.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to book appointment');
    },
  });

  const manageMutation = useMutation({
    mutationFn: async (params: ManageAppointmentParams) => {
      const { data, error } = await supabase.functions.invoke('manage-appointment', {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      const msgs: Record<string, string> = {
        confirmed: 'Appointment accepted!',
        denied: 'Appointment denied. Client refunded.',
        completed: `Appointment completed! Earned ${data.payout} BB`,
        cancelled: `Appointment cancelled. ${data.refund} BB refunded.`,
      };
      toast.success(msgs[data.status] || 'Appointment updated');
    },
    onError: (error: any) => {
      if (error.message?.includes('upgrade')) {
        toast.error('Upgrade to Silver+ to accept this booking');
      } else {
        toast.error(error.message || 'Failed to update appointment');
      }
    },
  });

  return { bookMutation, manageMutation };
}
