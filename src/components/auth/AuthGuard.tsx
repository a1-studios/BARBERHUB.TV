
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: ('barber' | 'fan')[];
}

export const AuthGuard = ({ 
  children, 
  requireAuth = true, 
  allowedRoles 
}: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      // If auth is required but user is not logged in, redirect to home
      if (requireAuth && !user) {
        navigate('/', { replace: true });
        return;
      }

      // If user is logged in but on landing page, redirect based on role
      if (user && location.pathname === '/') {
        // User is authenticated, redirect away from landing page
        navigate('/battles', { replace: true });
        return;
      }
    }
  }, [user, loading, requireAuth, navigate, location.pathname]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If auth is required but user is not authenticated, don't render children
  if (requireAuth && !user) {
    return null;
  }

  // If user is authenticated but on landing page, don't render children 
  // (let the useEffect handle the redirect)
  if (user && location.pathname === '/') {
    return null;
  }

  return <>{children}</>;
};
