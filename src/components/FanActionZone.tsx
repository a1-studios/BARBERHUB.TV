import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HaircutAdvisorModal } from '@/components/HaircutAdvisorModal';
export const FanActionZone = () => {
  const navigate = useNavigate();
  const [showHaircutAdvisor, setShowHaircutAdvisor] = useState(false);
  return <>
      <Card className="border-2 border-orange-500/30 hover:border-orange-500/50 transition-colors w-full max-w-md">
        <CardHeader className="text-center pb-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-2">
            <MapPin className="w-5 h-5 text-orange-500" />
          </div>
          <CardTitle className="text-lg">Find Top Barbers Near Me</CardTitle>
          <CardDescription className="text-sm">
            Discover skilled barbers in your area. Browse portfolios...
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button variant="outline" className="w-full" onClick={() => navigate('/barbers')}>
            Find Barbers
          </Button>
        </CardContent>
      </Card>

      <HaircutAdvisorModal isOpen={showHaircutAdvisor} onClose={() => setShowHaircutAdvisor(false)} />
    </>;
};