import { useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface BarberGuardProps {
  children: React.ReactNode;
}

export function BarberGuard({ children }: BarberGuardProps) {
  const { isBarber, isLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isBarber) {
      toast({
        title: "Access Denied",
        description: "This area is only accessible to barbers.",
        variant: "destructive"
      });
      navigate('/', { replace: true });
    }
  }, [isBarber, isLoading, navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  if (!isBarber) {
    return null;
  }

  return <>{children}</>;
}
