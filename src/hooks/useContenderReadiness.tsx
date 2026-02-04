import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ContenderPresence {
  barber_id: string;
  user_id: string;
  display_name: string;
  country_code: string;
  is_ready: boolean;
  has_camera: boolean;
  position: 1 | 2;
  joined_at: string;
}

interface UseContenderReadinessOptions {
  battleId: string;
  barberId: string;
  barberPosition: 1 | 2;
  displayName: string;
  countryCode?: string;
  hasCamera?: boolean;
}

interface UseContenderReadinessReturn {
  localReady: boolean;
  opponentReady: boolean;
  opponentPresence: ContenderPresence | null;
  isOpponentPresent: boolean;
  setReady: (ready: boolean) => Promise<void>;
  bothReady: boolean;
  isTracking: boolean;
}

export const useContenderReadiness = ({
  battleId,
  barberId,
  barberPosition,
  displayName,
  countryCode = 'XX',
  hasCamera = false,
}: UseContenderReadinessOptions): UseContenderReadinessReturn => {
  const { user } = useAuth();
  const [localReady, setLocalReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [opponentPresence, setOpponentPresence] = useState<ContenderPresence | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceDataRef = useRef<ContenderPresence>({
    barber_id: barberId,
    user_id: user?.id || '',
    display_name: displayName,
    country_code: countryCode,
    is_ready: false,
    has_camera: hasCamera,
    position: barberPosition,
    joined_at: new Date().toISOString(),
  });

  // Update presence data when props change
  useEffect(() => {
    presenceDataRef.current = {
      ...presenceDataRef.current,
      barber_id: barberId,
      user_id: user?.id || '',
      display_name: displayName,
      country_code: countryCode,
      has_camera: hasCamera,
      position: barberPosition,
    };
  }, [barberId, user?.id, displayName, countryCode, hasCamera, barberPosition]);

  // Set ready status and update presence
  const setReady = useCallback(async (ready: boolean) => {
    setLocalReady(ready);
    presenceDataRef.current.is_ready = ready;
    
    if (channelRef.current) {
      await channelRef.current.track(presenceDataRef.current);
    }
  }, []);

  // Initialize presence tracking
  useEffect(() => {
    if (!battleId || !user?.id || !barberId) return;

    const channelName = `battle-contenders-${battleId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        
        // Find opponent's presence (different position)
        let foundOpponent: ContenderPresence | null = null;
        
        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((presence: ContenderPresence) => {
            if (presence.position !== barberPosition && presence.user_id !== user.id) {
              foundOpponent = presence;
              setOpponentReady(presence.is_ready);
            }
          });
        });
        
        setOpponentPresence(foundOpponent);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Contender joined:', newPresences);
        newPresences.forEach((presence: any) => {
          if (presence.position !== barberPosition && presence.user_id !== user.id) {
            setOpponentPresence(presence);
            setOpponentReady(presence.is_ready || false);
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Contender left:', leftPresences);
        leftPresences.forEach((presence: any) => {
          if (presence.position !== barberPosition) {
            setOpponentPresence(null);
            setOpponentReady(false);
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our presence
          presenceDataRef.current.user_id = user.id;
          await channel.track(presenceDataRef.current);
          setIsTracking(true);
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsTracking(false);
    };
  }, [battleId, user?.id, barberId, barberPosition]);

  // Update camera status when it changes
  useEffect(() => {
    const updateCameraStatus = async () => {
      if (channelRef.current && isTracking) {
        presenceDataRef.current.has_camera = hasCamera;
        await channelRef.current.track(presenceDataRef.current);
      }
    };
    
    updateCameraStatus();
  }, [hasCamera, isTracking]);

  return {
    localReady,
    opponentReady,
    opponentPresence,
    isOpponentPresent: !!opponentPresence,
    setReady,
    bothReady: localReady && opponentReady,
    isTracking,
  };
};
