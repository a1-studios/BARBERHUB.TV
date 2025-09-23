import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useProfileSetup() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [barberProfile, setBarberProfile] = useState<any>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfiles();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProfiles = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch main profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setUserProfile(profile);

      if (profile) {
        // Fetch specialized profiles based on user type
        if (profile.user_type === 'barber') {
          const { data: barberData } = await supabase
            .from('barber_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          setBarberProfile(barberData);
          setNeedsProfileSetup(!barberData);
        } else if (profile.user_type === 'fan') {
          const { data: clientData } = await supabase
            .from('client_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          setClientProfile(clientData);
          setNeedsProfileSetup(!clientData);
        }
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfiles = () => {
    fetchProfiles();
  };

  return {
    userProfile,
    barberProfile,
    clientProfile,
    loading,
    needsProfileSetup,
    refreshProfiles,
    isBarber: userProfile?.user_type === 'barber',
    isClient: userProfile?.user_type === 'fan'
  };
}