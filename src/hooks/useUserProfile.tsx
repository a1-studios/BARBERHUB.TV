import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserProfile {
  user_id: string;
  display_name?: string;
  user_type: 'fan' | 'barber';
  country_code?: string;
  is_verified_by_competition?: boolean;
  three_x_vote_expires_at?: string;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, user_type, country_code, is_verified_by_competition, three_x_vote_expires_at')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user
  });

  const isBarber = profile?.user_type === 'barber';
  const isFan = profile?.user_type === 'fan';
  
  // Check if user has verified status and it hasn't expired
  const isVerified = profile?.is_verified_by_competition && 
    (!profile?.three_x_vote_expires_at || new Date(profile.three_x_vote_expires_at) > new Date());

  return {
    profile,
    isBarber,
    isFan,
    isVerified,
    isLoading,
    error
  };
};