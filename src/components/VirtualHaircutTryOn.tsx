import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
export const VirtualHaircutTryOn = () => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();

  // Only show to authenticated users
  if (!user) {
    return null;
  }
  return;
};