import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Sparkles, ArrowLeft, Scissors, Loader2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface HairstyleRecommendation {
  name: string;
  category: 'similar' | 'short' | 'long';
  description: string;
  image_url: string;
  styling_tips: string;
}

interface AnalysisResult {
  current_style_detected: string;
  face_shape: string;
  hair_texture: string;
  recommendations: HairstyleRecommendation[];
}

const HaircutAdvisor = () => {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<('similar' | 'short' | 'long')[]>(['similar', 'short', 'long']);
  const [styleVibe, setStyleVibe] = useState<string>('modern');
  const [maintenance, setMaintenance] = useState<string>('medium');
  const [currentStep, setCurrentStep] = useState<'capture' | 'preferences' | 'results'>('capture');
  const [generationProgress, setGenerationProgress] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && capturedImages.length < 3) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImages(prev => [...prev, imageData]);
        
        if (capturedImages.length === 0) {
          toast({
            title: "Photo Captured! 📸",
            description: "You can add up to 2 more photos for better results.",
          });
        } else {
          toast({
            title: `Photo ${capturedImages.length + 1} Added!`,
            description: capturedImages.length < 2 ? "Add another or continue to preferences." : "Maximum photos reached!",
          });
        }
        
        if (capturedImages.length >= 2) {
          stopCamera();
        }
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files).slice(0, 3 - capturedImages.length);
      
      fileArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
      
      toast({
        title: `${fileArray.length} Image${fileArray.length > 1 ? 's' : ''} Uploaded! 📷`,
        description: "Continue to set your preferences.",
      });
      
      stopCamera();
    }
  };

  const analyzeImage = async () => {
    if (capturedImages.length === 0) return;

    setIsAnalyzing(true);
    setCurrentStep('results');
    setGenerationProgress('Analyzing your photos...');
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-haircut', {
        body: { 
          images: capturedImages,
          preferences: {
            categories: selectedCategories,
            vibe: styleVibe,
            maintenance: maintenance
          }
        }
      });

      if (error) {
        console.error('Function error:', error);
        throw new Error(error.message || 'Failed to analyze image');
      }

      setGenerationProgress('Generating your personalized hairstyles...');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAnalysisResult(data);
      setGenerationProgress('');
      
      toast({
        title: "Hairstyles Generated! ✨",
        description: `${data.recommendations.length} personalized styles ready for you.`,
      });
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Please try again with clearer photos.",
        variant: "destructive",
      });
      setCurrentStep('preferences');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetProcess = () => {
    setCapturedImages([]);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setIsCameraActive(false);
    setCurrentStep('capture');
    setShowPreferences(false);
    setSelectedCategories(['similar', 'short', 'long']);
    stopCamera();
    startCamera();
  };

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
    if (capturedImages.length === 3 && !isCameraActive) {
      startCamera();
    }
  };

  const toggleCategory = (category: 'similar' | 'short' | 'long') => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const proceedToPreferences = () => {
    if (capturedImages.length === 0) {
      toast({
        title: "No Photos",
        description: "Please capture or upload at least one photo.",
        variant: "destructive",
      });
      return;
    }
    stopCamera();
    setCurrentStep('preferences');
    setShowPreferences(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Scissors className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Hairstyle AI</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Step 1: Capture/Upload */}
        {currentStep === 'capture' && (
          <Card className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Capture Your Look</h2>
              <p className="text-muted-foreground">
                Take 1-3 photos from different angles for best results
              </p>
            </div>

            {/* Captured Images Preview */}
            {capturedImages.length > 0 && (
              <div className="mb-6">
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {capturedImages.map((img, idx) => (
                    <div key={idx} className="relative shrink-0">
                      <img src={img} alt={`Capture ${idx + 1}`} className="w-32 h-32 object-cover rounded-lg" />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() => removeImage(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {capturedImages.length}/3 photos • {3 - capturedImages.length} more allowed
                </p>
              </div>
            )}

            {/* Camera View */}
            {isCameraActive && capturedImages.length < 3 && (
              <div className="mb-4">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-4 mt-4">
                  <Button onClick={capturePhoto} className="flex-1" disabled={capturedImages.length >= 3}>
                    <Camera className="mr-2 h-4 w-4" />
                    {capturedImages.length === 0 ? 'Capture Photo' : `Add Photo ${capturedImages.length + 1}/3`}
                  </Button>
                  {capturedImages.length > 0 && (
                    <Button onClick={proceedToPreferences} variant="default" className="flex-1">
                      Continue
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Upload Options */}
            {!isCameraActive && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={startCamera}
                    variant="outline"
                    className="h-32 flex-col gap-2"
                    disabled={capturedImages.length >= 3}
                  >
                    <Camera className="h-8 w-8" />
                    <span>Use Camera</span>
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="h-32 flex-col gap-2"
                    disabled={capturedImages.length >= 3}
                  >
                    <Upload className="h-8 w-8" />
                    <span>Upload Photos</span>
                  </Button>
                </div>
                
                {capturedImages.length > 0 && (
                  <Button onClick={proceedToPreferences} className="w-full" size="lg">
                    Continue to Preferences
                  </Button>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> Multiple photos from different angles help our AI generate more accurate results!
              </p>
            </div>
          </Card>
        )}

        {/* Step 2: Preferences */}
        {currentStep === 'preferences' && showPreferences && (
          <Card className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Choose Your Style Preferences</h2>
              <p className="text-muted-foreground">
                Select which hairstyles you'd like to see
              </p>
            </div>

            <div className="space-y-6">
              {/* Category Selection */}
              <div>
                <label className="text-sm font-medium mb-3 block">Hairstyle Categories</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: 'similar', label: 'Refined Version', desc: 'Polish your current look' },
                    { id: 'short', label: 'Bold Short', desc: 'Buzzcut or crew cut' },
                    { id: 'long', label: 'Long & Flowing', desc: 'Extended length styles' }
                  ].map(cat => (
                    <Button
                      key={cat.id}
                      variant={selectedCategories.includes(cat.id as any) ? 'default' : 'outline'}
                      className="h-auto py-4 px-4 flex-col items-start gap-1"
                      onClick={() => toggleCategory(cat.id as any)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                          selectedCategories.includes(cat.id as any) ? 'bg-primary border-primary' : 'border-muted-foreground'
                        }`}>
                          {selectedCategories.includes(cat.id as any) && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className="font-semibold">{cat.label}</span>
                      </div>
                      <span className="text-xs opacity-80 text-left">{cat.desc}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Style Vibe */}
              <div>
                <label className="text-sm font-medium mb-3 block">Style Vibe</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['Classic', 'Modern', 'Edgy', 'Natural'].map(vibe => (
                    <Button
                      key={vibe}
                      variant={styleVibe === vibe.toLowerCase() ? 'default' : 'outline'}
                      onClick={() => setStyleVibe(vibe.toLowerCase())}
                    >
                      {vibe}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Maintenance Level */}
              <div>
                <label className="text-sm font-medium mb-3 block">Maintenance Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Low', 'Medium', 'High'].map(level => (
                    <Button
                      key={level}
                      variant={maintenance === level.toLowerCase() ? 'default' : 'outline'}
                      onClick={() => setMaintenance(level.toLowerCase())}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="outline" onClick={resetProcess} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={analyzeImage} 
                disabled={isAnalyzing || selectedCategories.length === 0}
                className="flex-1"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate My Hairstyles
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <Card className="p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
              <h3 className="text-xl font-semibold">{generationProgress}</h3>
              <p className="text-muted-foreground">
                This usually takes 10-20 seconds. Creating your personalized hairstyles...
              </p>
            </div>
          </Card>
        )}

        {/* Step 3: Results */}
        {currentStep === 'results' && analysisResult && !isAnalyzing && (
          <div className="space-y-6">
            {/* Analysis Summary */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Your Hair Analysis</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">Face Shape</h3>
                  <Badge variant="secondary" className="text-base capitalize">
                    {analysisResult.face_shape}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">Hair Texture</h3>
                  <Badge variant="secondary" className="text-base capitalize">
                    {analysisResult.hair_texture}
                  </Badge>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">Current Style</h3>
                  <p className="text-sm">{analysisResult.current_style_detected}</p>
                </div>
              </div>
            </Card>

            {/* Generated Hairstyles */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Your Personalized Hairstyles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {analysisResult.recommendations.map((rec, index) => (
                  <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-square relative">
                      <img
                        src={rec.image_url}
                        alt={rec.name}
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-3 right-3 capitalize">
                        {rec.category}
                      </Badge>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{rec.name}</h3>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                      </div>
                      
                      <div className="pt-3 border-t border-border">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Scissors className="h-4 w-4" />
                          Styling Tips
                        </h4>
                        <p className="text-xs text-muted-foreground">{rec.styling_tips}</p>
                      </div>
                      
                      <Button className="w-full" variant="outline">
                        Show This to My Barber
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button onClick={resetProcess} variant="outline" className="flex-1">
                Try Different Photos
              </Button>
              <Button onClick={() => setCurrentStep('preferences')} variant="outline" className="flex-1">
                Adjust Preferences
              </Button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default HaircutAdvisor;
