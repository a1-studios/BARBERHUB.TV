import { ReactNode } from 'react';
import { useSovereignRole } from '@/hooks/useSovereignRole';
import NotFound from '@/pages/NotFound';

interface SovereignGuardProps {
  children: ReactNode;
}

/**
 * SovereignGuard - Route protection for the God-Level Command Center
 * 
 * Security layers:
 * 1. Checks if authenticated user's email matches hardcoded sovereign email
 * 2. Verifies 'sovereign' role exists in user_roles table
 * 3. Returns 404 (not 403) for non-sovereign users - security through obscurity
 */
const SovereignGuard = ({ children }: SovereignGuardProps) => {
  const { isSovereign, loading } = useSovereignRole();

  // Show loading state while checking
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  // Security through obscurity - show 404 to non-sovereign users
  if (!isSovereign) {
    return <NotFound />;
  }

  return <>{children}</>;
};

export default SovereignGuard;
