import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CalendarEvent } from '../types';

export function useCalendarEvents(from: Date, to: Date) {
  return useQuery({
    queryKey: ['hub-calendar', from.toISOString(), to.toISOString()],
    queryFn: async (): Promise<CalendarEvent[]> => {
      const { data, error } = await supabase.rpc('get_unified_calendar_events' as any, {
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      });
      if (error) throw error;
      return (data as CalendarEvent[]) || [];
    },
  });
}
