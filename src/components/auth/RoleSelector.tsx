import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scissors, Users } from 'lucide-react';
import { AuthDialog } from './AuthDialog';

export function RoleSelector() {
  const [selectedRole, setSelectedRole] = useState<'barber' | 'fan' | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Choose Your Role</h2>
        <p className="text-muted-foreground">Select how you want to participate in the community</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:scale-105 ${
            selectedRole === 'barber' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => setSelectedRole('barber')}
        >
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
              <Scissors className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Barber</h3>
              <p className="text-sm text-muted-foreground">Create battles, showcase skills, compete</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:scale-105 ${
            selectedRole === 'fan' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => setSelectedRole('fan')}
        >
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Fan</h3>
              <p className="text-sm text-muted-foreground">Vote, follow barbers, discover talent</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedRole && (
        <div className="text-center">
          <AuthDialog initialRole={selectedRole}>
            <Button size="lg" className="px-8">
              Continue as {selectedRole === 'barber' ? 'Barber' : 'Fan'}
            </Button>
          </AuthDialog>
        </div>
      )}
    </div>
  );
}