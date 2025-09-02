import { BackButton } from '@/components/ui/BackButton';
import { useState, useRef } from 'react';
import { Camera, Upload, RotateCcw, Sparkles, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';

interface HaircutSuggestion {
  name: string;
  description: string;
  styling_tips: string;
  maintenance: string;
  face_shape_reason: string;
}

interface AnalysisResult {
  face_shape: string;
  hair_texture: string;
  suggestions: HaircutSuggestion[];
  general_tips: string[];
}

const HaircutAdvisor = () => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions or upload an image instead.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid image file.",
        variant: "destructive",
      });
    }
  };

  const analyzeImage = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-haircut', {
        body: { image_data: capturedImage }
      });

      if (error) throw error;

      if (data.success) {
        setAnalysis(data.analysis);
        toast({
          title: "Analysis Complete!",
          description: "Your personalized haircut recommendations are ready.",
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze your image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetProcess = () => {
    setCapturedImage(null);
    setAnalysis(null);
    stopCamera();
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <BackButton to="/" />
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-white">AI Haircut Advisor</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Take a photo and get personalized haircut recommendations based on your face shape and features
            </p>
          </div>

          {/* Main Content */}
          {!capturedImage && !analysis && (
            <div className="space-y-6">
              {/* Camera Section */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Take a Photo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!cameraActive ? (
                    <div className="text-center">
                      <Button onClick={startCamera} className="mb-4">
                        <Camera className="h-4 w-4 mr-2" />
                        Start Camera
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        We'll analyze your face shape and features to recommend the perfect haircut
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-auto max-h-96 object-cover"
                        />
                      </div>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={capturePhoto} size="lg">
                          <Camera className="h-4 w-4 mr-2" />
                          Capture Photo
                        </Button>
                        <Button onClick={stopCamera} variant="outline">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upload Section */}
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Or upload an existing photo</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="border-primary/30"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Image Preview and Analysis */}
          {capturedImage && !analysis && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Ready to Analyze</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full max-w-md mx-auto rounded-lg"
                  />
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={analyzeImage}
                    disabled={isAnalyzing}
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Get Recommendations
                      </>
                    )}
                  </Button>
                  <Button onClick={resetProcess} variant="outline">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-6">
              {/* Face Analysis */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="h-5 w-5" />
                    Your Face Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-semibold mb-2">Face Shape</h4>
                      <Badge variant="secondary" className="text-sm">
                        {analysis.face_shape}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Hair Texture</h4>
                      <Badge variant="outline" className="text-sm">
                        {analysis.hair_texture}
                      </Badge>
                    </div>
                  </div>
                  {analysis.general_tips.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">General Tips</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {analysis.general_tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Haircut Suggestions */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Recommended Haircuts</h3>
                {analysis.suggestions.map((suggestion, index) => (
                  <Card key={index} className="border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-lg">{suggestion.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-muted-foreground">{suggestion.description}</p>
                      
                      <div>
                        <h5 className="font-semibold text-sm mb-1">Why it works for you:</h5>
                        <p className="text-sm text-muted-foreground">{suggestion.face_shape_reason}</p>
                      </div>
                      
                      <div>
                        <h5 className="font-semibold text-sm mb-1">Styling Tips:</h5>
                        <p className="text-sm text-muted-foreground">{suggestion.styling_tips}</p>
                      </div>
                      
                      <div>
                        <h5 className="font-semibold text-sm mb-1">Maintenance:</h5>
                        <p className="text-sm text-muted-foreground">{suggestion.maintenance}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Try Again Button */}
              <div className="text-center pt-6">
                <Button onClick={resetProcess} variant="outline" size="lg">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Another Photo
                </Button>
              </div>
            </div>
          )}

          {/* Hidden canvas for image processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </main>
    </div>
  );
};

export default HaircutAdvisor;