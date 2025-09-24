import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const VirtualHaircutTryOn = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Only show to authenticated users
  if (!user) {
    return null;
  }
  
  return (
    <section className="relative py-10 px-4">
      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center">
          <Button 
            onClick={() => navigate('/haircut-advisor')} 
            size="lg" 
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            AI Haircut Advisor
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Get personalized haircut recommendations with AI
          </p>
        </div>
      </div>
    </section>
  );
};