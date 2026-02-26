import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBarberAvailability(barberId: string | undefined) {
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['barber-services', barberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_services')
        .select('*')
        .eq('barber_id', barberId!)
        .eq('is_active', true)
        .order('price_bb', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!barberId,
  });

  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ['barber-availability', barberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_availability')
        .select('*')
        .eq('barber_id', barberId!)
        .eq('is_available', true)
        .order('day_of_week', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!barberId,
  });

  const { data: blockedSlots, isLoading: blockedLoading } = useQuery({
    queryKey: ['barber-blocked-slots', barberId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('barber_blocked_slots')
        .select('*')
        .eq('barber_id', barberId!)
        .gte('blocked_end', now)
        .lte('blocked_start', twoWeeks);
      if (error) throw error;
      return data;
    },
    enabled: !!barberId,
  });

  const { data: existingAppointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['barber-existing-appointments', barberId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('appointments')
        .select('scheduled_at, duration_minutes')
        .eq('barber_id', barberId!)
        .in('status', ['pending', 'escrow_locked', 'confirmed', 'in_transit'])
        .gte('scheduled_at', now)
        .lte('scheduled_at', twoWeeks);
      if (error) throw error;
      return data;
    },
    enabled: !!barberId,
  });

  // Generate available time slots for a given date
  const getAvailableSlots = (date: Date) => {
    if (!availability) return [];

    const dayOfWeek = date.getDay();
    const dayAvail = availability.find(a => a.day_of_week === dayOfWeek);
    if (!dayAvail) return [];

    const slots: string[] = [];
    const [startH, startM] = dayAvail.start_time.split(':').map(Number);
    const [endH, endM] = dayAvail.end_time.split(':').map(Number);
    const slotDuration = dayAvail.slot_duration_minutes || 30;

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + slotDuration <= endMinutes) {
      const slotStart = new Date(date);
      slotStart.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0);

      const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

      // Check blocked slots
      const isBlocked = blockedSlots?.some(b => {
        const bStart = new Date(b.blocked_start).getTime();
        const bEnd = new Date(b.blocked_end).getTime();
        return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
      });

      // Check existing appointments
      const isBooked = existingAppointments?.some(a => {
        const aStart = new Date(a.scheduled_at).getTime();
        const aEnd = aStart + (a.duration_minutes || 30) * 60000;
        return slotStart.getTime() < aEnd && slotEnd.getTime() > aStart;
      });

      // Don't show past slots
      const isPast = slotStart.getTime() < Date.now();

      if (!isBlocked && !isBooked && !isPast) {
        slots.push(slotStart.toISOString());
      }

      currentMinutes += slotDuration;
    }

    return slots;
  };

  return {
    services: services || [],
    availability: availability || [],
    blockedSlots: blockedSlots || [],
    existingAppointments: existingAppointments || [],
    getAvailableSlots,
    isLoading: servicesLoading || availabilityLoading || blockedLoading || appointmentsLoading,
  };
}
