
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scissors, Heart, Trophy, MapPin, Vote, Calendar } from 'lucide-react';

interface RoleSelectionProps {
  onRoleSelect: (role: 'barber' | 'fan') => void;
  isLoading?: boolean;
}

const RoleSelection = ({ onRoleSelect, isLoading }: RoleSelectionProps) => {
  const [selectedRole, setSelectedRole] = useState<'barber' | 'fan' | null>(null);

  const handleRoleSelection = (role: 'barber' | 'fan') => {
    setSelectedRole(role);
    onRoleSelect(role);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Choose Your Path</h1>
        <p className="text-muted-foreground">
          Select your role to get started with your personalized experience
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Barber Card */}
        <Card 
          className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
            selectedRole === 'barber' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleRoleSelection('barber')}
        >
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
              <Scissors className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl text-white">I'm a Barber</CardTitle>
            <CardDescription className="text-base">
              Showcase your skills and compete with other barbers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Create and join battles</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Accept bookings from clients</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Show up on barber finder map</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Heart className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Build your follower base</span>
            </div>
            
            <div className="pt-4 border-t border-border/50">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">Create Battles</Badge>
                <Badge variant="outline" className="text-xs">Submit Entries</Badge>
                <Badge variant="outline" className="text-xs">Accept Bookings</Badge>
                <Badge variant="outline" className="text-xs">Earn Revenue</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fan Card */}
        <Card 
          className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
            selectedRole === 'fan' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleRoleSelection('fan')}
        >
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl text-white">I'm a Fan</CardTitle>
            <CardDescription className="text-base">
              Discover, vote, and connect with amazing barbers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Vote className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Vote in barber battles</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Heart className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Follow your favorite barbers</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Find barbers near you</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Book appointments easily</span>
            </div>
            
            <div className="pt-4 border-t border-border/50">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">Vote & Support</Badge>
                <Badge variant="outline" className="text-xs">Book Services</Badge>
                <Badge variant="outline" className="text-xs">Get Recommendations</Badge>
                <Badge variant="outline" className="text-xs">Follow Barbers</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedRole && (
        <div className="text-center mt-8">
          <Button 
            size="lg" 
            onClick={() => handleRoleSelection(selectedRole)}
            disabled={isLoading}
            className="px-8"
          >
            {isLoading ? 'Setting up your profile...' : `Continue as ${selectedRole === 'barber' ? 'Barber' : 'Fan'}`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default RoleSelection;
