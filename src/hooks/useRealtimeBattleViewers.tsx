import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ViewerData {
  barber1: number;
  barber2: number;
  peak1: number;
  peak2: number;
  lastUpdate: string | null;
}

export const useRealtimeBattleViewers = (battleId: string) => {
  const [viewerData, setViewerData] = useState<ViewerData>({
    barber1: 0,
    barber2: 0,
    peak1: 0,
    peak2: 0,
    lastUpdate: null
  });

  useEffect(() => {
    if (!battleId) return;

    // Initial fetch
    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('battles')
        .select('barber1_live_viewers, barber2_live_viewers, barber1_peak_viewers, barber2_peak_viewers, last_viewer_check')
        .eq('id', battleId)
        .single();
      
      if (error) {
        console.error('Error fetching initial viewer data:', error);
        return;
      }

      if (data) {
        setViewerData({
          barber1: data.barber1_live_viewers || 0,
          barber2: data.barber2_live_viewers || 0,
          peak1: data.barber1_peak_viewers || 0,
          peak2: data.barber2_peak_viewers || 0,
          lastUpdate: data.last_viewer_check
        });
      }
    };
    
    fetchInitial();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`battle-viewers-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battles',
          filter: `id=eq.${battleId}`
        },
        (payload: any) => {
          console.log('Live viewer count updated:', payload.new);
          setViewerData({
            barber1: payload.new.barber1_live_viewers || 0,
            barber2: payload.new.barber2_live_viewers || 0,
            peak1: payload.new.barber1_peak_viewers || 0,
            peak2: payload.new.barber2_peak_viewers || 0,
            lastUpdate: payload.new.last_viewer_check
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId]);

  return viewerData;
};
