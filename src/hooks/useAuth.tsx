import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string, userType?: string, countryCode?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle post-OAuth role assignment
        if (event === 'SIGNED_IN' && session?.user) {
          const pendingRole = localStorage.getItem('pending_social_role');
          if (pendingRole && (pendingRole === 'barber' || pendingRole === 'fan')) {
            localStorage.removeItem('pending_social_role');
            // Use setTimeout to avoid blocking the auth state change
            setTimeout(async () => {
              const { error } = await supabase.rpc('assign_social_auth_role', {
                p_user_id: session.user.id,
                p_role: pendingRole,
              });
              if (error) {
                console.error('Role assignment error:', error);
              }
            }, 0);
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string, userType?: string, countryCode?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName || email.split('@')[0],
            user_type: userType || 'fan',
            country_code: countryCode
          }
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        toast.error(error.message);
        return { error };
      }

      if (data.user) {
        toast.success('Confirmation email queued. Check inbox in ~30s (and your spam folder).');
      }

      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      const authError = error as AuthError;
      toast.error(authError.message || "An unexpected error occurred");
      return { error: authError };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    // Clear local state regardless of error - if session is missing, user is effectively logged out
    setSession(null);
    setUser(null);
    
    if (error && !error.message.toLowerCase().includes('session')) {
      // Only show error for non-session-related issues
      toast.error(error.message);
    } else {
      toast.success('Signed out successfully');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}