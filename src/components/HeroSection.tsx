import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Users, DollarSign } from "lucide-react";

const HeroSection = () => {
  const [prizeAmount, setPrizeAmount] = useState(0);
  const targetAmount = 25000;

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const increment = targetAmount / (duration / 50);
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetAmount) {
        setPrizeAmount(targetAmount);
        clearInterval(timer);
      } else {
        setPrizeAmount(Math.floor(current));
      }
    }, 50);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary rounded-full animate-float" />
        <div className="absolute top-40 right-20 w-16 h-16 bg-primary rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-primary rounded-full animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
            Welcome to{" "}
            <span className="text-gradient">BARBER-HUB</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            The ultimate platform for barber competitions, community, and grants. 
            Where skills meet recognition.
          </p>

          {/* Prize Pool Counter */}
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto animate-glow">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Trophy className="w-8 h-8 text-primary" />
              <span className="text-lg font-semibold">Current Prize Pool</span>
            </div>
            <div className="text-5xl md:text-6xl font-bold text-gradient animate-counter-up">
              ${prizeAmount.toLocaleString()}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button size="lg" className="btn-primary text-lg px-8 py-4">
              <Users className="w-5 h-5 mr-2" />
              Watch & Vote
            </Button>
            <Button size="lg" variant="outline" className="btn-secondary text-lg px-8 py-4">
              <DollarSign className="w-5 h-5 mr-2" />
              Buy Barber Bucks
            </Button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 max-w-2xl mx-auto">
            <div className="bg-card/30 backdrop-blur-sm rounded-xl p-6 card-gradient">
              <div className="text-3xl font-bold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">Active Barbers</div>
            </div>
            <div className="bg-card/30 backdrop-blur-sm rounded-xl p-6 card-gradient">
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground">Community Votes</div>
            </div>
            <div className="bg-card/30 backdrop-blur-sm rounded-xl p-6 card-gradient">
              <div className="text-3xl font-bold text-primary">$50K+</div>
              <div className="text-sm text-muted-foreground">Grants Awarded</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;