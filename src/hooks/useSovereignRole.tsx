import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const SOVEREIGN_EMAIL = 'a1studios.film@gmail.com';

interface SovereignStatus {
  isSovereign: boolean;
  loading: boolean;
  error: string | null;
}

export const useSovereignRole = (): SovereignStatus => {
  const { user, loading: authLoading } = useAuth();
  const [hasSovereignRole, setHasSovereignRole] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSovereignRole = async () => {
      if (authLoading) return;
      
      if (!user) {
        setHasSovereignRole(false);
        setLoading(false);
        return;
      }

      // First check: Email must match exactly
      if (user.email !== SOVEREIGN_EMAIL) {
        setHasSovereignRole(false);
        setLoading(false);
        return;
      }

      try {
        // Second check: Must have sovereign role in database
        const { data, error: roleError } = await supabase
          .rpc('has_role', { 
            _user_id: user.id, 
            _role: 'sovereign' 
          });

        if (roleError) {
          console.error('Error checking sovereign role:', roleError);
          setError(roleError.message);
          setHasSovereignRole(false);
        } else {
          setHasSovereignRole(data === true);
        }
      } catch (err) {
        console.error('Error in sovereign check:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setHasSovereignRole(false);
      } finally {
        setLoading(false);
      }
    };

    checkSovereignRole();
  }, [user, authLoading]);

  return {
    isSovereign: hasSovereignRole && user?.email === SOVEREIGN_EMAIL,
    loading: loading || authLoading,
    error
  };
};

export const SOVEREIGN_EMAIL_CHECK = SOVEREIGN_EMAIL;
