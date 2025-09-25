import { useState, useRef } from 'react';
import { Camera, Upload, RotateCcw, Sparkles, Scissors, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface HaircutSuggestion {
  name: string;
  description: string;
  styling_tips: string;
  maintenance: string;
  face_shape_reason: string;
}

interface HaircutMockup {
  name: string;
  image_url: string;
  description: string;
}

interface AnalysisResult {
  face_shape: string;
  hair_texture: string;
  suggestions: HaircutSuggestion[];
  general_tips: string[];
  mockups?: HaircutMockup[];
}

interface UserPreferences {
  length?: string;
  vibe?: string;
  maintenance?: string;
  look?: string;
}

interface HaircutAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HaircutAdvisorModal = ({ isOpen, onClose }: HaircutAdvisorModalProps) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [showPreferences, setShowPreferences] = useState(false);
  
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
        setShowPreferences(true);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
        setShowPreferences(true);
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
        body: { 
          image_data: capturedImage,
          preferences: preferences
        }
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
    setPreferences({});
    setShowPreferences(false);
    stopCamera();
  };

  const handleClose = () => {
    resetProcess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Haircut Advisor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Camera/Upload Section */}
          {!capturedImage && !analysis && (
            <div className="space-y-6">
              {/* Example Hairstyles */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Scissors className="h-4 w-4" />
                    AI Haircut Analysis Examples
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {/* Regular Cut Avatar */}
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center border-2 border-primary/30">
                        <div className="w-12 h-12 rounded-full bg-muted-foreground/20 relative">
                          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-6 bg-muted-foreground/40 rounded-t-full"></div>
                          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-muted-foreground/60 rounded-full"></div>
                          <div className="absolute top-3 left-3 w-1 h-1 bg-muted-foreground/60 rounded-full"></div>
                          <div className="absolute top-3 right-3 w-1 h-1 bg-muted-foreground/60 rounded-full"></div>
                        </div>
                      </div>
                      <p className="text-xs font-medium">Regular Cut</p>
                      <p className="text-xs text-muted-foreground">Classic style</p>
                    </div>
                    
                    {/* Beard & Comeover Avatar */}
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/40 flex items-center justify-center border-2 border-secondary/30">
                        <div className="w-12 h-12 rounded-full bg-muted-foreground/20 relative">
                          <div className="absolute top-2 left-1 w-10 h-6 bg-muted-foreground/40 rounded-t-full transform -skew-x-6"></div>
                          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-muted-foreground/60 rounded-full"></div>
                          <div className="absolute top-3 left-3 w-1 h-1 bg-muted-foreground/60 rounded-full"></div>
                          <div className="absolute top-3 right-3 w-1 h-1 bg-muted-foreground/60 rounded-full"></div>
                          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-3 bg-muted-foreground/50 rounded-b-lg"></div>
                        </div>
                      </div>
                      <p className="text-xs font-medium">Beard & Comeover</p>
                      <p className="text-xs text-muted-foreground">Sharp & modern</p>
                    </div>
                    
                    {/* Buzz Cut Avatar */}
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-gradient-to-br from-accent/20 to-accent/40 flex items-center justify-center border-2 border-accent/30">
                        <div className="w-12 h-12 rounded-full bg-muted-foreground/20 relative">
                          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-4 bg-muted-foreground/30 rounded-t-full"></div>
                          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-muted-foreground/60 rounded-full"></div>
                          <div className="absolute top-3 left-3 w-1 h-1 bg-muted-foreground/60 rounded-full"></div>
                          <div className="absolute top-3 right-3 w-1 h-1 bg-muted-foreground/60 rounded-full"></div>
                        </div>
                      </div>
                      <p className="text-xs font-medium">Buzz Cut</p>
                      <p className="text-xs text-muted-foreground">Clean & minimal</p>
                    </div>
                  </div>
                  
                  <p className="text-center text-sm text-muted-foreground mb-4">
                    Upload your photo to get personalized recommendations for your face shape
                  </p>
                  
                  {/* Camera Controls */}
                  {cameraActive && (
                    <div className="space-y-3 mb-4">
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-auto max-h-48 object-cover"
                        />
                      </div>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={capturePhoto} size="sm">
                          <Camera className="h-3 w-3 mr-1" />
                          Capture
                        </Button>
                        <Button onClick={stopCamera} variant="outline" size="sm">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={startCamera}
                      size="sm"
                      variant="outline"
                      className="border-primary/30"
                      disabled={cameraActive}
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      Camera
                    </Button>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      size="sm"
                      variant="outline"
                      className="border-primary/30"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Upload
                    </Button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Preferences Section */}
          {capturedImage && showPreferences && !analysis && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-base">Fine-tune Your Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative mb-4">
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-32 h-32 mx-auto rounded-lg object-cover"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="block font-medium mb-1">Length Preference</label>
                    <Select onValueChange={(value) => setPreferences(prev => ({...prev, length: value}))}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Any length" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="long">Long</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block font-medium mb-1">Desired Vibe</label>
                    <Select onValueChange={(value) => setPreferences(prev => ({...prev, vibe: value}))}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Any style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="trendy">Trendy</SelectItem>
                        <SelectItem value="classic">Classic</SelectItem>
                        <SelectItem value="edgy">Edgy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block font-medium mb-1">Maintenance</label>
                    <Select onValueChange={(value) => setPreferences(prev => ({...prev, maintenance: value}))}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Any level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low maintenance</SelectItem>
                        <SelectItem value="medium">Medium maintenance</SelectItem>
                        <SelectItem value="high">High maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block font-medium mb-1">Desired Look</label>
                    <Select onValueChange={(value) => setPreferences(prev => ({...prev, look: value}))}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Any look" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="polished">Polished</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="dramatic">Dramatic</SelectItem>
                        <SelectItem value="natural">Natural</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 justify-center pt-2">
                  <Button
                    onClick={analyzeImage}
                    disabled={isAnalyzing}
                    className="btn-primary"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Get My Recommendations
                      </>
                    )}
                  </Button>
                  <Button onClick={() => setShowPreferences(false)} variant="outline" size="sm">
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-4">
              {/* Face Analysis */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Scissors className="h-4 w-4" />
                    Your Face Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <h4 className="font-medium text-sm mb-1">Face Shape</h4>
                      <Badge variant="secondary" className="text-xs">
                        {analysis.face_shape}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Hair Texture</h4>
                      <Badge variant="outline" className="text-xs">
                        {analysis.hair_texture}
                      </Badge>
                    </div>
                  </div>
                  {analysis.general_tips.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Tips</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {analysis.general_tips.slice(0, 2).map((tip, index) => (
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

              {/* Visual Mockups */}
              {analysis.mockups && analysis.mockups.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-white">Your Virtual Try-On</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {analysis.mockups.map((mockup, index) => (
                      <Card key={index} className="border-2 border-primary/50 hover:border-primary transition-colors">
                        <CardContent className="p-3">
                          <div className="aspect-square relative overflow-hidden rounded-lg mb-2">
                            <img
                              src={mockup.image_url}
                              alt={mockup.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-2 right-2">
                              <h4 className="font-semibold text-white text-xs leading-tight">
                                {mockup.name}
                              </h4>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Recommendations */}
              <div className="space-y-3">
                <h3 className="font-semibold text-white">Detailed Recommendations</h3>
                {analysis.suggestions.slice(0, 3).map((suggestion, index) => (
                  <Card key={index} className="border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{suggestion.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <p className="text-muted-foreground">{suggestion.description}</p>
                      
                      <div>
                        <h5 className="font-medium mb-1">Why it works:</h5>
                        <p className="text-muted-foreground">{suggestion.face_shape_reason}</p>
                      </div>
                      
                      <div>
                        <h5 className="font-medium mb-1">Styling:</h5>
                        <p className="text-muted-foreground">{suggestion.styling_tips}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Try Again Button */}
              <div className="text-center pt-4">
                <Button onClick={resetProcess} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Another Photo
                </Button>
              </div>
            </div>
          )}

          {/* Hidden canvas for image processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </DialogContent>
    </Dialog>
  );
};