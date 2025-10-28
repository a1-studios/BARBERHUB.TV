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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
        <Card className="border-2 border-orange-500/30 hover:border-orange-500/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-3">
              <MapPin className="w-6 h-6 text-orange-500" />
            </div>
            <CardTitle>Find Top Barbers Near Me</CardTitle>
            <CardDescription>
              Discover skilled barbers in your area. Browse portfolios, read reviews, and book appointments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate('/barbers')}>
              Find Barbers
            </Button>
          </CardContent>
        </Card>
      </div>

      <HaircutAdvisorModal isOpen={showHaircutAdvisor} onClose={() => setShowHaircutAdvisor(false)} />
    </>;
};