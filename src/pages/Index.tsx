import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Vote, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user } = useAuth();

  // If user is authenticated, they shouldn't be on landing page
  // AuthGuard will handle the redirect
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Only show basic header without navigation for non-authenticated users */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">BarberBattles</span>
            </div>
            <Button asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - focused on authentication */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-white mb-6">
            Welcome to BarberBattles
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            The ultimate platform for barber competitions. Watch epic battles, vote for your favorites, and discover amazing talent.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">
                Get Started
              </Link>
            </Button>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Epic Battles</h3>
              <p className="text-muted-foreground">
                Watch barbers compete in real-time battles showcasing their incredible skills
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Vote className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Vote & Support</h3>
              <p className="text-muted-foreground">
                Support your favorite barbers by voting and help them win amazing prizes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Find Barbers</h3>
              <p className="text-muted-foreground">
                Discover talented barbers near you and book appointments easily
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
