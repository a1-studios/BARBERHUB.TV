import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const PrizePoolCard = () => {
  const navigate = useNavigate();

  return (
    <Card className="relative overflow-hidden border-2 border-primary/50 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-pulse" />

      <CardContent className="relative z-10 text-center py-8 sm:py-12">
        <div className="mx-auto mb-6 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-primary to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_50px_hsl(var(--primary)/0.5)]">
          <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
        </div>

        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary mb-4">
          $25,000
        </h2>
        <p className="text-xl sm:text-2xl text-foreground font-semibold mb-2">
          Grand Prize
        </p>

        <p className="text-lg sm:text-xl text-muted-foreground mb-6">
          Which Nation Takes the Crown?
        </p>

        <Button
          size="lg"
          onClick={() => navigate('/portal')}
          className="text-base sm:text-lg px-6 sm:px-8"
        >
          Enter the League
        </Button>

        <div className="grid grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-primary">50+</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Nations</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-primary">1,000+</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Barbers</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-primary">$50K</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Total Prizes</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
