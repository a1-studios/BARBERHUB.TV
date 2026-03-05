import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger,
} from '@/components/ui/drawer';
import {
  ArrowLeft, Camera, Mic, MicOff, Video, VideoOff, Sun, Volume2,
  RefreshCw, CheckCircle2, Settings, Swords, Wifi, WifiOff, Play,
} from 'lucide-react';
import { useBattleVideoRoom } from '@/hooks/useBattleVideoRoom';

interface DeviceInfo {
  deviceId: string;
  label: string;
}

export default function CameraStudio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const battleId = searchParams.get('battleId');

  const videoRef = useRef<HTMLVideoElement>(null);
  const opponentVideoRef = useRef<HTMLVideoElement>(null);
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

  // Twilio room connection (only when battleId is present)
  const twilioRoom = useBattleVideoRoom({
    battleId: battleId || 'studio-test',
  });

  // Attach remote video track to opponent ref
  useEffect(() => {
    if (twilioRoom.remoteVideoTrack && opponentVideoRef.current) {
      const el = twilioRoom.remoteVideoTrack.attach();
      opponentVideoRef.current.innerHTML = '';
      opponentVideoRef.current.appendChild(el);
      return () => {
        twilioRoom.remoteVideoTrack?.detach().forEach(e => e.remove());
      };
    }
  }, [twilioRoom.remoteVideoTrack]);

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

      await enumerateDevices();
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
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setAudioLevel(Math.round((avg / 255) * 100));
    }

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

  const getLightingLabel = () => {
    if (brightness < 20) return { label: 'Too Dark', color: 'text-destructive' };
    if (brightness < 40) return { label: 'Low Light', color: 'text-yellow-500' };
    if (brightness > 85) return { label: 'Too Bright', color: 'text-yellow-500' };
    return { label: 'Good Lighting', color: 'text-green-500' };
  };

  const lighting = getLightingLabel();

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/portal')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Camera Studio</h1>
              <p className="text-xs text-muted-foreground">
                {battleId ? 'Pre-battle gear check' : 'Calibrate your gear before battle'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Settings Drawer */}
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[80vh]">
                <DrawerHeader>
                  <DrawerTitle>Studio Settings</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6 space-y-6 overflow-y-auto">
                  {/* Device Selectors */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Device Selection</h3>
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
                  </div>

                  {/* Audio Meter */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                      <Volume2 className="h-4 w-4" /> Audio Level
                    </h3>
                    <Progress value={audioLevel} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {audioLevel > 5 ? 'Mic is picking up audio ✓' : 'Speak to test your microphone'}
                    </p>
                  </div>

                  {/* Lighting */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                      <Sun className="h-4 w-4" /> Lighting Quality
                    </h3>
                    <Progress value={brightness} className="h-3" />
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-sm font-medium ${lighting.color}`}>{lighting.label}</span>
                      <span className="text-xs text-muted-foreground">{brightness}%</span>
                    </div>
                  </div>

                  {/* Tips */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Battle-Ready Checklist</h3>
                    {[
                      'Face a window or ring light for even lighting',
                      'Position camera at eye level or slightly above',
                      'Use the rule-of-thirds grid to frame your shot',
                      'Test your mic — speak clearly and check levels',
                      'Minimize background noise and distractions',
                    ].map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground mb-1.5">
                        <CheckCircle2 className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </DrawerContent>
            </Drawer>

            {battleId && (
              <Button
                onClick={() => navigate(`/battle/${battleId}/contender`)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Enter Battle
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content — 70/30 Battle Split */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* YOUR SIDE — 70% */}
        <div className="relative w-full lg:w-[70%] bg-black flex items-center justify-center min-h-[50vh] lg:min-h-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover absolute inset-0"
            style={{ transform: 'scaleX(-1)' }}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Label */}
          <div className="absolute top-3 left-3 z-10">
            <Badge className="bg-primary/80 text-primary-foreground font-bold text-xs px-3 py-1">
              YOUR SIDE
            </Badge>
          </div>

          {/* Connection status */}
          {battleId && (
            <div className="absolute top-3 right-3 z-10">
              <Badge variant="outline" className={`text-xs ${twilioRoom.isConnected ? 'border-green-500/50 text-green-500' : 'border-muted-foreground/50 text-muted-foreground'}`}>
                {twilioRoom.isConnected ? <><Wifi className="h-3 w-3 mr-1" /> Connected</> : <><WifiOff className="h-3 w-3 mr-1" /> Not Connected</>}
              </Badge>
            </div>
          )}

          {/* Start Camera Overlay */}
          {!isActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 gap-4 z-20">
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
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/15" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/15" />
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/15" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/15" />
            </div>
          )}

          {/* Bottom Control Bar */}
          {isActive && (
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant={isVideoEnabled ? 'default' : 'destructive'}
                  size="icon"
                  className="rounded-full h-12 w-12"
                  onClick={toggleVideo}
                >
                  {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
                <Button
                  variant={isAudioEnabled ? 'default' : 'destructive'}
                  size="icon"
                  className="rounded-full h-12 w-12"
                  onClick={toggleAudio}
                >
                  {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-12 w-12"
                  onClick={() => { stopPreview(); startPreview(); }}
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-full px-4"
                  onClick={stopPreview}
                >
                  Stop
                </Button>

                {/* Twilio connect/disconnect */}
                {battleId && isActive && !twilioRoom.isConnected && !twilioRoom.isConnecting && (
                  <Button
                    size="sm"
                    className="rounded-full px-4 bg-gradient-to-r from-blue-600 to-cyan-600"
                    onClick={() => twilioRoom.connect()}
                  >
                    <Wifi className="h-4 w-4 mr-1" />
                    Connect Room
                  </Button>
                )}
                {twilioRoom.isConnecting && (
                  <Badge variant="outline" className="text-xs animate-pulse border-blue-500/50 text-blue-400">
                    Connecting...
                  </Badge>
                )}
                {twilioRoom.isConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full px-4 border-destructive/50 text-destructive"
                    onClick={() => twilioRoom.disconnect()}
                  >
                    <WifiOff className="h-4 w-4 mr-1" />
                    Disconnect
                  </Button>
                )}
              </div>

              {/* Mini audio meter bar */}
              <div className="mt-3 max-w-xs mx-auto">
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-100"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* VS Divider */}
        <div className="hidden lg:flex items-center justify-center w-0 relative z-20">
          <div className="absolute bg-primary text-primary-foreground font-black text-sm rounded-full h-10 w-10 flex items-center justify-center shadow-lg border-2 border-background">
            VS
          </div>
        </div>

        {/* OPPONENT SIDE — 30% */}
        <div className="relative w-full lg:w-[30%] bg-muted/30 flex items-center justify-center min-h-[30vh] lg:min-h-0 border-t lg:border-t-0 lg:border-l border-border">
          {/* Label */}
          <div className="absolute top-3 left-3 z-10">
            <Badge variant="outline" className="text-xs font-bold border-muted-foreground/30 text-muted-foreground">
              OPPONENT
            </Badge>
          </div>

          {/* Remote video or placeholder */}
          {twilioRoom.hasOpponent ? (
            <div
              ref={opponentVideoRef}
              className="w-full h-full absolute inset-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground/50 p-6 text-center">
              <Swords className="h-12 w-12" />
              <p className="text-sm font-medium">
                {battleId ? 'Waiting for opponent...' : 'Opponent preview area'}
              </p>
              <p className="text-xs">
                {battleId
                  ? 'Your opponent will appear here when they connect'
                  : 'Accept a challenge to test the live connection'}
              </p>
            </div>
          )}

          {twilioRoom.hasOpponent && (
            <div className="absolute bottom-3 left-3 z-10">
              <Badge className="bg-green-600/80 text-white text-xs">
                {twilioRoom.opponentIdentity || 'Connected'}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
