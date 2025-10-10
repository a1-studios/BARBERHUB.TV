import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, MapPin, Heart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HaircutAdvisorModal } from '@/components/HaircutAdvisorModal';
import { DonationModal } from '@/components/DonationModal';

export const FanActionZone = () => {
  const navigate = useNavigate();
  const [showHaircutAdvisor, setShowHaircutAdvisor] = useState(false);
  const [showDonation, setShowDonation] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-8">
        <Card className="border-2 border-teal-500/30 hover:border-teal-500/50 transition-colors bg-gradient-to-br from-teal-500/5 to-green-500/5">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center mb-3">
              <Scissors className="w-6 h-6 text-teal-500" />
            </div>
            <CardTitle>Suggest My Next Cut</CardTitle>
            <CardDescription>
              Get AI-powered haircut recommendations based on your face shape, style preferences, and current trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full"
              onClick={() => setShowHaircutAdvisor(true)}
            >
              Try AI Advisor
            </Button>
          </CardContent>
        </Card>

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
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => navigate('/barbers')}
            >
              Find Barbers
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-pink-500/30 hover:border-pink-500/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center mb-3">
              <Heart className="w-6 h-6 text-pink-500" />
            </div>
            <CardTitle>Fuel the League</CardTitle>
            <CardDescription>
              Support Your Nation's Stylists. Help your favorite barbers compete and grow their careers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => setShowDonation(true)}
            >
              Support Barbers
            </Button>
          </CardContent>
        </Card>
      </div>

      <HaircutAdvisorModal 
        isOpen={showHaircutAdvisor} 
        onClose={() => setShowHaircutAdvisor(false)} 
      />
      
      {/* Note: DonationModal requires creatorId and creatorName props - this is a placeholder */}
    </>
  );
};
