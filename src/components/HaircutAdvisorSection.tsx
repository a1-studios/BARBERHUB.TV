import { useState } from 'react';
import { Camera, Scissors, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HaircutAdvisorModal } from './HaircutAdvisorModal';

export const HaircutAdvisorSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-primary/20 overflow-hidden">
          <CardContent className="p-8">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Content */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    AI Haircut Advisor
                  </h2>
                </div>
                
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Get personalized haircut recommendations based on your face shape, 
                  hair texture, and style preferences. Our AI analyzes your features 
                  to suggest the perfect cuts that complement your look.
                </p>
                
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Scissors className="h-4 w-4 text-primary" />
                    Face shape analysis
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Camera className="h-4 w-4 text-primary" />
                    Instant recommendations
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Style preferences
                  </div>
                </div>
                
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="btn-primary text-lg px-8 py-3 bg-gradient-to-r from-primary to-orange-500 hover:from-orange-500 hover:to-primary shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <Camera className="h-5 w-5 mr-3" />
                  Try AI Haircut Advisor
                </Button>
              </div>
              
              {/* Visual */}
              <div className="relative">
                <div className="aspect-square bg-gradient-to-br from-primary/10 to-transparent rounded-2xl p-8 flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
                    <div className="relative bg-card rounded-full p-6 border border-primary/30">
                      <Scissors className="h-12 w-12 text-primary animate-float" />
                    </div>
                  </div>
                  
                  {/* Floating elements */}
                  <div className="absolute top-4 right-8 bg-primary/10 p-2 rounded-lg animate-float">
                    <Camera className="h-4 w-4 text-primary" />
                  </div>
                  <div className="absolute bottom-8 left-6 bg-primary/10 p-2 rounded-lg animate-float" style={{ animationDelay: '1s' }}>
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <HaircutAdvisorModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      </div>
    </section>
  );
};