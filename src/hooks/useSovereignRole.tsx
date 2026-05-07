import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SovereignStatus {
  isSovereign: boolean;
  loading: boolean;
  error: string | null;
}

export const useSovereignRole = (): SovereignStatus => {
  const { user, loading: authLoading } = useAuth();
  const [isSovereign, setIsSovereign] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      if (authLoading) return;

      if (!user) {
        setIsSovereign(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error: rpcError } = await supabase.rpc('is_sovereign');

        if (rpcError) {
          console.error('Error checking sovereign role:', rpcError);
          setError(rpcError.message);
          setIsSovereign(false);
        } else {
          setIsSovereign(data === true);
        }
      } catch (err) {
        console.error('Error in sovereign check:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsSovereign(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [user, authLoading]);

  return {
    isSovereign,
    loading: loading || authLoading,
    error,
  };
};
