import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Mic, MicOff, X, RotateCcw, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StyleAnalysis {
  current_style_detected: string;
  face_shape: string;
  hair_texture: string;
  client_brief: string;
}

interface StyleCaptureButtonProps {
  onAnalysisComplete: (brief: string, analysis: StyleAnalysis) => void;
}

export function StyleCaptureButton({ onAnalysisComplete }: StyleCaptureButtonProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [editableTranscript, setEditableTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);

  // Track if we need to re-acquire camera after facingMode change
  const [needsReacquire, setNeedsReacquire] = useState(false);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setSpeechSupported(false);
  }, []);

  // Attach stream to video element once it's mounted
  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [showCamera]);

  // Re-acquire camera when facingMode changes (triggered by flip)
  useEffect(() => {
    if (!needsReacquire) return;
    setNeedsReacquire(false);

    const reacquire = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      } catch {
        toast.error('Could not switch camera');
      }
    };
    reacquire();
  }, [needsReacquire, facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      // Get stream first (must be in click handler for user-gesture)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      // Show the camera UI — useEffect will attach stream to videoRef
      setShowCamera(true);
    } catch {
      toast.error('Camera access denied');
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const flipCamera = useCallback(() => {
    // Stop current tracks
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    // Toggle facing mode and trigger re-acquire
    setFacingMode(f => f === 'user' ? 'environment' : 'user');
    setNeedsReacquire(true);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = transcript;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + ' ';
        } else {
          interim = t;
        }
      }
      const combined = finalTranscript + interim;
      setTranscript(finalTranscript);
      setEditableTranscript(combined.trim());
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => {
      setIsListening(false);
      setTranscript(finalTranscript);
      setEditableTranscript(finalTranscript.trim());
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, transcript]);

  const runAnalysis = useCallback(async () => {
    if (!capturedPhoto) return;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-haircut', {
        body: {
          images: [capturedPhoto],
          voice_transcript: editableTranscript || undefined,
          preferences: {},
        },
      });
      if (error) throw error;
      const result: StyleAnalysis = {
        current_style_detected: data.current_style_detected || '',
        face_shape: data.face_shape || '',
        hair_texture: data.hair_texture || '',
        client_brief: data.client_brief || `${data.current_style_detected} · ${data.face_shape} face · ${data.hair_texture}`,
      };
      setAnalysis(result);
      onAnalysisComplete(result.client_brief, result);
      toast.success('Style analysis complete');
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [capturedPhoto, editableTranscript, onAnalysisComplete]);

  const reset = () => {
    setCapturedPhoto(null);
    setTranscript('');
    setEditableTranscript('');
    setAnalysis(null);
    stopCamera();
  };

  const hiddenCanvas = <canvas ref={canvasRef} className="hidden" />;

  // Already analyzed — show summary
  if (analysis) {
    return (
      <div className="space-y-2">
        {hiddenCanvas}
        <div className="flex items-center gap-3">
          {capturedPhoto && (
            <img src={capturedPhoto} alt="Style" className="h-12 w-12 rounded-full object-cover border-2 border-primary/40" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Style Brief
            </p>
            <p className="text-xs text-muted-foreground truncate">{analysis.client_brief}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Full-screen camera viewfinder
  if (showCamera) {
    return (
      <>
        {hiddenCanvas}
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="flex-1 w-full object-cover"
          />
          {/* Controls overlay */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-6 p-6 pb-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full text-white bg-white/10 backdrop-blur-sm"
              onClick={stopCamera}
            >
              <X className="h-6 w-6" />
            </Button>
            <button
              onClick={capturePhoto}
              className="h-20 w-20 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm active:scale-90 transition-transform"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full text-white bg-white/10 backdrop-blur-sm"
              onClick={flipCamera}
            >
              <RotateCcw className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Photo captured — show thumbnail + mic + analyze
  if (capturedPhoto) {
    return (
      <div className="space-y-3">
        {hiddenCanvas}
        <div className="flex items-center justify-center gap-4">
          <div className="relative">
            <img src={capturedPhoto} alt="Captured" className="h-16 w-16 rounded-full object-cover border-2 border-primary/40" />
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full p-0"
              onClick={reset}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {speechSupported && (
            <button
              onClick={toggleListening}
              className={cn(
                'h-16 w-16 rounded-full flex items-center justify-center transition-all border-2',
                isListening
                  ? 'bg-destructive/20 border-destructive text-destructive animate-pulse'
                  : 'bg-primary/10 border-primary/40 text-primary hover:bg-primary/20'
              )}
            >
              {isListening ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
            </button>
          )}
        </div>

        {isListening && (
          <p className="text-xs text-center text-primary animate-pulse font-medium">
            Listening… tell us what you want
          </p>
        )}

        {editableTranscript && !isListening && (
          <Input
            value={editableTranscript}
            onChange={(e) => setEditableTranscript(e.target.value)}
            placeholder="Describe the style you want..."
            className="text-xs border-primary/30"
          />
        )}

        {!speechSupported && !editableTranscript && (
          <Input
            value={editableTranscript}
            onChange={(e) => setEditableTranscript(e.target.value)}
            placeholder="Describe the style you want..."
            className="text-xs border-primary/30"
          />
        )}

        <Button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className="w-full h-9 text-xs font-bold bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
          variant="outline"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {editableTranscript ? 'Analyze Photo + Voice' : 'Analyze Photo'}
            </>
          )}
        </Button>
      </div>
    );
  }

  // Default — Camera button
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      {hiddenCanvas}
      <button
        onClick={startCamera}
        className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/40 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors active:scale-95"
      >
        <Camera className="h-7 w-7" />
      </button>
      <p className="text-[11px] text-muted-foreground">Snap your look</p>
    </div>
  );
}
