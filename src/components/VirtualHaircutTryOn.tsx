import { useState } from 'react';
import { Camera, Upload, Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { HaircutAdvisorModal } from './HaircutAdvisorModal';

export const VirtualHaircutTryOn = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Sparkles className="h-8 w-8 text-primary" />
              <h2 className="text-4xl font-bold text-white">AI Haircut Coach</h2>
            </div>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Upload your photo and see how different haircuts would look on you with AI-powered virtual try-on technology
            </p>
          </div>

          {/* Example Mockups Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[
              { name: "High-Fade Pompadour", style: "Professional & Sharp" },
              { name: "Asymmetric Undercut", style: "Modern & Edgy" },
              { name: "Textured Crop", style: "Casual & Trendy" },
              { name: "Classic Side Part", style: "Timeless & Elegant" }
            ].map((style, index) => (
              <Card key={index} className="border-2 border-primary/30 overflow-hidden hover:border-primary/60 transition-colors">
                <div className="aspect-square relative bg-gradient-to-br from-primary/20 to-transparent">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-primary/30 rounded-full flex items-center justify-center mb-3 mx-auto">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-xs text-muted-foreground">Preview</div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <h4 className="font-bold text-white text-sm leading-tight mb-1">
                      {style.name}
                    </h4>
                    <p className="text-xs text-primary/80">{style.style}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/10 to-transparent max-w-md mx-auto">
              <CardContent className="p-8">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Find Your Perfect Look</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a clear photo of your face for AI analysis and virtual haircut try-on
                  </p>
                </div>
                
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  size="lg" 
                  className="w-full mb-3"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take a Selfie or Upload Photo
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  Your privacy is important. Photos are used for analysis only.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <HaircutAdvisorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};