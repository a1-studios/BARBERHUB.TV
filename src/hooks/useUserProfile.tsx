import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserProfile {
  user_id: string;
  display_name?: string;
  user_type: 'fan' | 'barber';
  country_code?: string;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, user_type, country_code')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user
  });

  const isBarber = profile?.user_type === 'barber';
  const isFan = profile?.user_type === 'fan';

  return {
    profile,
    isBarber,
    isFan,
    isLoading,
    error
  };
};