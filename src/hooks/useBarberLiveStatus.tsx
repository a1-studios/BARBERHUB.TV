import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useBarberLiveStatus = (barberId: string | null) => {
  const [isLive, setIsLive] = useState(false);
  const [liveVideoId, setLiveVideoId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!barberId) return;

    // Fetch initial status
    const fetchInitialStatus = async () => {
      const { data } = await supabase
        .from('barber_profiles')
        .select('is_live, live_video_id')
        .eq('id', barberId)
        .single();
      
      if (data) {
        setIsLive(data.is_live || false);
        setLiveVideoId(data.live_video_id);
      }
    };

    fetchInitialStatus();
    
    // Subscribe to changes on barber_profiles
    const subscription = supabase
      .channel(`barber:${barberId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'barber_profiles',
        filter: `id=eq.${barberId}`
      }, (payload) => {
        setIsLive(payload.new.is_live || false);
        setLiveVideoId(payload.new.live_video_id);
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [barberId]);
  
  return { isLive, liveVideoId };
};
