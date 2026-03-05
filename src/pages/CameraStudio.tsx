import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Camera, Mic, MicOff, Video, VideoOff, Sun, Volume2, RefreshCw, CheckCircle2 } from 'lucide-react';

interface DeviceInfo {
  deviceId: string;
  label: string;
}

export default function CameraStudio() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [cameras, setCameras] = useState<DeviceInfo[]>([]);
  const [mics, setMics] = useState<DeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Enumerate devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter(d => d.kind === 'videoinput').map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${i + 1}`,
      })));
      setMics(devices.filter(d => d.kind === 'audioinput').map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${i + 1}`,
      })));
    } catch { /* ignore */ }
  }, []);

  // Start camera
  const startPreview = useCallback(async () => {
    try {
      setError(null);
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          ...(selectedCamera ? { deviceId: { exact: selectedCamera } } : { facingMode: 'user' }),
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          ...(selectedMic ? { deviceId: { exact: selectedMic } } : {}),
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setIsActive(true);
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Set up audio analyser
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(mediaStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Re-enumerate to get labels
      await enumerateDevices();

      // Start meters
      updateMeters();
    } catch (err: any) {
      let msg = 'Failed to access camera';
      if (err.name === 'NotAllowedError') msg = 'Camera/microphone permission denied.';
      else if (err.name === 'NotFoundError') msg = 'No camera or microphone found.';
      else if (err.name === 'NotReadableError') msg = 'Camera is in use by another app.';
      setError(msg);
    }
  }, [selectedCamera, selectedMic, enumerateDevices]);

  // Stop camera
  const stopPreview = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    cancelAnimationFrame(animFrameRef.current);
    setIsActive(false);
    setAudioLevel(0);
    setBrightness(0);
  }, []);

  // Update audio + brightness meters
  const updateMeters = useCallback(() => {
    // Audio level
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setAudioLevel(Math.round((avg / 255) * 100));
    }

    // Brightness from video frame
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx && videoRef.current.videoWidth > 0) {
        const w = 64, h = 48;
        canvasRef.current.width = w;
        canvasRef.current.height = h;
        ctx.drawImage(videoRef.current, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h).data;
        let total = 0;
        for (let i = 0; i < imgData.length; i += 4) {
          total += (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
        }
        setBrightness(Math.round((total / (w * h)) / 255 * 100));
      }
    }

    animFrameRef.current = requestAnimationFrame(updateMeters);
  }, []);

  const toggleVideo = () => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoEnabled(p => !p);
  };

  const toggleAudio = () => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsAudioEnabled(p => !p);
  };

  // Cleanup
  useEffect(() => {
    enumerateDevices();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [enumerateDevices]);

  // Restart when device changes
  useEffect(() => {
    if (isActive) {
      stopPreview();
      startPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera, selectedMic]);

  const getLightingLabel = () => {
    if (brightness < 20) return { label: 'Too Dark', color: 'text-destructive' };
    if (brightness < 40) return { label: 'Low Light', color: 'text-yellow-500' };
    if (brightness > 85) return { label: 'Too Bright', color: 'text-yellow-500' };
    return { label: 'Good Lighting', color: 'text-green-500' };
  };

  const lighting = getLightingLabel();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Camera Studio</h1>
            <p className="text-xs text-muted-foreground">Calibrate your gear before battle</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Preview */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {!isActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 gap-4">
                    <Camera className="w-16 h-16 text-muted-foreground/50" />
                    <Button onClick={startPreview} size="lg">
                      <Camera className="mr-2 h-5 w-5" />
                      Start Camera Preview
                    </Button>
                    {error && <p className="text-destructive text-sm max-w-md text-center">{error}</p>}
                  </div>
                )}

                {/* Rule of thirds overlay */}
                {isActive && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/15" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/15" />
                    <div className="absolute top-1/3 left-0 right-0 h-px bg-white/15" />
                    <div className="absolute top-2/3 left-0 right-0 h-px bg-white/15" />
                  </div>
                )}
              </div>

              {/* Controls Bar */}
              {isActive && (
                <div className="flex items-center justify-center gap-3 p-4 bg-card border-t border-border">
                  <Button
                    variant={isVideoEnabled ? 'default' : 'destructive'}
                    size="icon"
                    onClick={toggleVideo}
                  >
                    {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant={isAudioEnabled ? 'default' : 'destructive'}
                    size="icon"
                    onClick={toggleAudio}
                  >
                    {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => { stopPreview(); startPreview(); }}>
                    <RefreshCw className="h-5 w-5" />
                  </Button>
                  <Button variant="destructive" onClick={stopPreview}>
                    Stop Preview
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Settings Panel */}
          <div className="space-y-4">
            {/* Device Selectors */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Device Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Camera</label>
                  <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                    <SelectTrigger><SelectValue placeholder="Default Camera" /></SelectTrigger>
                    <SelectContent>
                      {cameras.map(c => (
                        <SelectItem key={c.deviceId} value={c.deviceId}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Microphone</label>
                  <Select value={selectedMic} onValueChange={setSelectedMic}>
                    <SelectTrigger><SelectValue placeholder="Default Microphone" /></SelectTrigger>
                    <SelectContent>
                      {mics.map(m => (
                        <SelectItem key={m.deviceId} value={m.deviceId}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Audio Meter */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Volume2 className="h-4 w-4" /> Audio Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={audioLevel} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  {audioLevel > 5 ? 'Mic is picking up audio ✓' : 'Speak to test your microphone'}
                </p>
              </CardContent>
            </Card>

            {/* Lighting Indicator */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sun className="h-4 w-4" /> Lighting Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={brightness} className="h-3" />
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-sm font-medium ${lighting.color}`}>{lighting.label}</span>
                  <span className="text-xs text-muted-foreground">{brightness}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Battle-Ready Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  'Face a window or ring light for even lighting',
                  'Position camera at eye level or slightly above',
                  'Use the rule-of-thirds grid to frame your shot',
                  'Test your mic — speak clearly and check levels',
                  'Minimize background noise and distractions',
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    <span>{tip}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
