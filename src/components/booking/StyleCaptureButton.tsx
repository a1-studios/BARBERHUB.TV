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
  // Camera state
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

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) setSpeechSupported(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
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

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
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

    recognition.onerror = () => {
      setIsListening(false);
    };

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

  // Auto-analyze when photo captured and no transcript (user can still add voice)
  const handleAnalyzeClick = () => {
    runAnalysis();
  };

  const reset = () => {
    setCapturedPhoto(null);
    setTranscript('');
    setEditableTranscript('');
    setAnalysis(null);
    stopCamera();
  };

  // Canvas for photo capture (hidden)
  const hiddenCanvas = <canvas ref={canvasRef} className="hidden" />;

  // Already analyzed — show summary
  if (analysis) {
    return (
      <div className="space-y-2">
        {hiddenCanvas}
        <div className="flex items-center gap-3">
          {capturedPhoto && (
            <img src={capturedPhoto} alt="Style" className="h-12 w-12 rounded-full object-cover border-2 border-cyan-500/40" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-cyan-400 flex items-center gap-1">
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

  // Camera viewfinder open
  if (showCamera) {
    return (
      <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-h-[280px]">
        {hiddenCanvas}
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 p-4 bg-gradient-to-t from-black/60">
          <Button variant="ghost" size="icon" className="h-10 w-10 text-white" onClick={stopCamera}>
            <X className="h-5 w-5" />
          </Button>
          <button
            onClick={capturePhoto}
            className="h-16 w-16 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm active:scale-90 transition-transform"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white"
            onClick={() => {
              stopCamera();
              setFacingMode(f => f === 'user' ? 'environment' : 'user');
              setTimeout(startCamera, 100);
            }}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  // Photo captured — show thumbnail + mic + analyze
  if (capturedPhoto) {
    return (
      <div className="space-y-3">
        {hiddenCanvas}
        <div className="flex items-center justify-center gap-4">
          {/* Photo thumbnail */}
          <div className="relative">
            <img src={capturedPhoto} alt="Captured" className="h-16 w-16 rounded-full object-cover border-2 border-cyan-500/40" />
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full p-0"
              onClick={reset}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Mic button */}
          {speechSupported ? (
            <button
              onClick={toggleListening}
              className={cn(
                'h-16 w-16 rounded-full flex items-center justify-center transition-all border-2',
                isListening
                  ? 'bg-destructive/20 border-destructive text-destructive animate-pulse'
                  : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20'
              )}
            >
              {isListening ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
            </button>
          ) : null}
        </div>

        {/* Listening indicator */}
        {isListening && (
          <p className="text-xs text-center text-cyan-400 animate-pulse font-medium">
            Listening… tell us what you want
          </p>
        )}

        {/* Transcript (editable) */}
        {editableTranscript && !isListening && (
          <Input
            value={editableTranscript}
            onChange={(e) => setEditableTranscript(e.target.value)}
            placeholder="Describe the style you want..."
            className="text-xs border-cyan-500/30"
          />
        )}

        {/* Manual text input fallback */}
        {!speechSupported && !editableTranscript && (
          <Input
            value={editableTranscript}
            onChange={(e) => setEditableTranscript(e.target.value)}
            placeholder="Describe the style you want..."
            className="text-xs border-cyan-500/30"
          />
        )}

        {/* Analyze button */}
        <Button
          onClick={handleAnalyzeClick}
          disabled={isAnalyzing}
          className="w-full h-9 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30"
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
        className="h-16 w-16 rounded-full bg-cyan-500/10 border-2 border-cyan-500/40 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/20 transition-colors active:scale-95"
      >
        <Camera className="h-7 w-7" />
      </button>
      <p className="text-[11px] text-muted-foreground">Snap your look</p>
    </div>
  );
}
