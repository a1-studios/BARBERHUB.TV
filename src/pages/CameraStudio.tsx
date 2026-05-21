import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStreamingPermissions } from '@/hooks/useStreamingPermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger,
} from '@/components/ui/drawer';
import {
  ArrowLeft, Camera, Mic, MicOff, Video, VideoOff, Sun, Volume2,
  RefreshCw, CheckCircle2, Settings, Swords, Wifi, WifiOff, Play,
  Circle, Square, Image, GraduationCap, Lightbulb, Flame, Upload, Radio,
} from 'lucide-react';
import { useBattleVideoRoom } from '@/hooks/useBattleVideoRoom';
import { ChallengeModal } from '@/components/battles/ChallengeModal';
import { RecordingReviewSheet, type ReviewResult } from '@/components/camera/RecordingReviewSheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type StudioMode = 'idle' | 'portfolio' | 'challenge' | 'course' | 'tips' | 'livestream';

interface DeviceInfo {
  deviceId: string;
  label: string;
}

const MODE_OPTIONS: { mode: StudioMode; icon: React.ReactNode; label: string; desc: string }[] = [
  { mode: 'portfolio', icon: <Image className="h-5 w-5" />, label: 'Portfolio', desc: 'Record content for your profile' },
  { mode: 'challenge', icon: <Flame className="h-5 w-5" />, label: 'Challenge', desc: 'Issue a battle challenge' },
  { mode: 'course', icon: <GraduationCap className="h-5 w-5" />, label: 'Course', desc: 'Record a masterclass module' },
  { mode: 'tips', icon: <Lightbulb className="h-5 w-5" />, label: 'Tips', desc: 'Share a quick technique tip' },
  { mode: 'livestream', icon: <Radio className="h-5 w-5" />, label: 'Live Stream', desc: 'Broadcast live to the Arena' },
];

const R2_FOLDERS: Record<string, string> = {
  portfolio: 'portfolios',
  course: 'education',
  tips: 'education',
};

export default function CameraStudio() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const battleId = searchParams.get('battleId');
  const { canStream, isLoading: streamPermLoading, reason: streamDeniedReason } = useStreamingPermissions();

  const videoRef = useRef<HTMLVideoElement>(null);
  const opponentVideoRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFlippingRef = useRef(false);
  const activeMimeTypeRef = useRef<string>('video/mp4');

  const [isActive, setIsActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [cameras, setCameras] = useState<DeviceInfo[]>([]);
  const [mics, setMics] = useState<DeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);

  // Studio mode + recording
  const [studioMode, setStudioMode] = useState<StudioMode>('idle');
  const [isModeDrawerOpen, setIsModeDrawerOpen] = useState(false);
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);

  // LiveKit room connection (only when battleId is present)
  const battleRoom = useBattleVideoRoom({ battleId: battleId || 'studio-test' });

  const hasOpponent = battleId && battleRoom.hasOpponent;

  // Attach remote video track to opponent ref
  useEffect(() => {
    if (battleRoom.remoteVideoTrack && opponentVideoRef.current) {
      const el = battleRoom.remoteVideoTrack.attach();
      opponentVideoRef.current.innerHTML = '';
      opponentVideoRef.current.appendChild(el);
      return () => { battleRoom.remoteVideoTrack?.detach().forEach(e => e.remove()); };
    }
  }, [battleRoom.remoteVideoTrack]);

  // Enumerate devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter(d => d.kind === 'videoinput').map((d, i) => ({
        deviceId: d.deviceId, label: d.label || `Camera ${i + 1}`,
      })));
      setMics(devices.filter(d => d.kind === 'audioinput').map((d, i) => ({
        deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}`,
      })));
    } catch { /* ignore */ }
  }, []);

  // Start camera
  const startPreview = useCallback(async () => {
    try {
      setError(null);
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 },
          ...(selectedCamera ? { deviceId: { exact: selectedCamera } } : { facingMode }),
        },
        audio: {
          echoCancellation: true, noiseSuppression: true,
          ...(selectedMic ? { deviceId: { exact: selectedMic } } : {}),
        },
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setIsActive(true);
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;

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
  }, [selectedCamera, selectedMic, facingMode, enumerateDevices]);

  const stopPreview = useCallback(() => {
    if (isRecording) stopRecording();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    cancelAnimationFrame(animFrameRef.current);
    setIsActive(false);
    setAudioLevel(0);
    setBrightness(0);
  }, [isRecording]);

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

  // ─── Recording ───
  const getSupportedMimeType = (): string => {
    const candidates = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
    for (const mt of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mt)) return mt;
    }
    return 'video/webm';
  };

  const startRecording = useCallback(() => {
    if (!streamRef.current || isRecording) return;
    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    activeMimeTypeRef.current = mimeType;
    const mr = new MediaRecorder(streamRef.current, { mimeType });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: activeMimeTypeRef.current });
      if (blob.size < 1000) { toast.error('Recording too short'); return; }
      setPendingBlob(blob);
    };
    mr.start(1000);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setRecordingDuration(0);
    recTimerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    setIsRecording(false);
  }, []);

  // Upload a thumbnail data URL to R2 (best-effort) — returns public URL or null
  const uploadThumbnail = async (dataUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const key = `thumbnails/${Date.now()}_studio.jpg`;
      const { data: urlData } = await supabase.functions.invoke('get-r2-presigned-url', {
        body: { key, contentType: 'image/jpeg' },
      });
      if (!urlData?.uploadUrl) return null;
      const put = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });
      return put.ok ? (urlData.publicUrl as string) : null;
    } catch {
      return null;
    }
  };

  const uploadRecording = async (blob: Blob, result: ReviewResult) => {
    const mimeType = activeMimeTypeRef.current;
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const folder = R2_FOLDERS[studioMode] || 'portfolios';
    const filename = `${folder}/${Date.now()}_studio.${ext}`;
    const contentType = mimeType.split(';')[0];

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated — please sign in again.');

      // Verify barber profile up-front so we never silently skip the DB insert
      const { data: barberProfile, error: bpError } = await supabase
        .from('barber_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (bpError) throw new Error(`Profile lookup failed: ${bpError.message}`);
      if (!barberProfile) {
        throw new Error('Your barber profile is missing — finish onboarding to publish videos.');
      }

      const { data: urlData, error: urlErr } = await supabase.functions.invoke('get-r2-presigned-url', {
        body: { key: filename, contentType },
      });
      if (urlErr || !urlData?.uploadUrl) throw new Error(urlErr?.message || 'Failed to get upload URL');

      setUploadProgress(30);

      const res = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      if (!res.ok) throw new Error(`R2 upload failed (${res.status})`);

      setUploadProgress(60);
      const publicUrl = urlData.publicUrl as string;

      // Optional thumbnail upload
      let thumbnailUrl: string | null = null;
      if (result.thumbnailDataUrl) {
        thumbnailUrl = await uploadThumbnail(result.thumbnailDataUrl);
      }

      setUploadProgress(75);

      const title = result.title || `Studio ${studioMode} ${new Date().toLocaleDateString()}`;

      const overlayPayload = {
        version: 2,
        source: { r2_key: filename, r2_url: publicUrl },
        reference_resolution:
          result.aspect === '9:16'
            ? { width: 1080, height: 1920 }
            : { width: 1920, height: 1080 },
        aspect: result.aspect,
        trim: result.trim,
        sound: result.sound,
        overlays: result.textOverlays.map((o) => ({
          id: o.id,
          type: 'text' as const,
          text: o.text,
          style: {
            font_family: o.font_family,
            font_size: o.font_size,
            color: o.color,
            background: o.background,
          },
          position: { x: o.x, y: o.y, anchor: 'center' as const },
          timing: { start: o.start, end: o.end },
        })),
      };

      let insertedId: string | null = null;
      let insertedTable: 'creations' | 'creator_content' = 'creations';

      if (studioMode === 'course') {
        insertedTable = 'creator_content';
        const { data: record, error: insertErr } = await supabase
          .from('creator_content')
          .insert({
            creator_id: user.id,
            title,
            content_type: 'course_teaser',
            content_category: 'course',
            media_url: publicUrl,
            thumbnail_url: thumbnailUrl,
            overlay_payload: overlayPayload as any,
            is_published: result.publish,
          })
          .select('id')
          .single();
        if (insertErr) throw new Error(`Save failed: ${insertErr.message}`);
        insertedId = record?.id ?? null;
      } else {
        // Portfolio / tips → creations table. Use 'video' so WatchFeed picks it up.
        const category = studioMode === 'tips' ? 'tips' : 'video';
        const { data: record, error: insertErr } = await supabase
          .from('creations')
          .insert({
            barber_id: barberProfile.id,
            media_url: publicUrl,
            thumbnail_url: thumbnailUrl,
            overlay_payload: overlayPayload as any,
            category,
            title,
            is_published: result.publish,
          })
          .select('id')
          .single();
        if (insertErr) throw new Error(`Save failed: ${insertErr.message}`);
        insertedId = record?.id ?? null;
      }

      if (!insertedId) throw new Error('Save failed: no record id returned');
      console.info('[CameraStudio] inserted', insertedTable, insertedId);

      // Fire-and-forget CF Stream ingest (playback still works via R2 if this fails)
      if (result.publish) {
        supabase.functions.invoke('upload-to-cloudflare-stream', {
          body: {
            sourceUrl: publicUrl,
            table: insertedTable,
            recordId: insertedId,
            overlayPayload,
          },
        }).catch((err: any) => console.error('[CameraStudio] CF Stream ingest error:', err));
      }

      setUploadProgress(100);
      toast.success(result.publish ? 'Video published!' : 'Draft saved');
      setPendingBlob(null);
      chunksRef.current = [];
    } catch (err: any) {
      console.error('[CameraStudio] upload error:', err);
      toast.error(err?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRetake = () => {
    setPendingBlob(null);
    chunksRef.current = [];
    setRecordingDuration(0);
  };


  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleModeSelect = async (mode: StudioMode) => {
    setIsModeDrawerOpen(false);

    if (mode === 'livestream') {
      if (streamPermLoading) {
        toast.info('Checking streaming permissions...');
        return;
      }
      if (!canStream) {
        toast.error(streamDeniedReason || 'Live streaming is not available');
        return;
      }
      // Get broadcast token and navigate to studio
      toast.loading('Starting broadcast...', { id: 'broadcast-start' });
      const { data, error } = await supabase.functions.invoke('generate-broadcast-token');
      toast.dismiss('broadcast-start');
      if (error || !data?.token) {
        toast.error(data?.error || 'Failed to start broadcast');
        return;
      }
      navigate(`/broadcast/${data.barberId}/studio`, {
        state: { token: data.token, serverUrl: data.serverUrl },
      });
      return;
    }

    if (mode === 'challenge') {
      setChallengeModalOpen(true);
      setStudioMode('challenge');
    } else {
      setStudioMode(mode);
    }
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
      if (recTimerRef.current) clearInterval(recTimerRef.current);
    };
  }, [enumerateDevices]);

  // Restart when device selection changes (not facingMode — that's handled by flip handler)
  useEffect(() => {
    if (isActive) { stopPreview(); startPreview(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera, selectedMic]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ touchAction: 'manipulation' }}>
      {/* ── Header (slim, translucent) ── */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top,12px)] pb-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white/80 h-9 w-9" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-sm font-bold text-white">Camera Studio</h1>
              {studioMode !== 'idle' && (
                <p className="text-[10px] text-white/60 uppercase tracking-wider">
                  {studioMode === 'challenge' ? 'Challenge Mode' : studioMode === 'course' ? 'Course Recording' : studioMode === 'tips' ? 'Tips Recording' : 'Portfolio'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Settings Drawer */}
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white/80 h-9 w-9">
                  <Settings className="h-4 w-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[80vh]">
                <DrawerHeader><DrawerTitle>Studio Settings</DrawerTitle></DrawerHeader>
                <div className="px-4 pb-6 space-y-6 overflow-y-auto">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Device Selection</h3>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Camera</label>
                      <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                        <SelectTrigger><SelectValue placeholder="Default Camera" /></SelectTrigger>
                        <SelectContent>{cameras.map(c => (
                          <SelectItem key={c.deviceId} value={c.deviceId}>{c.label}</SelectItem>
                        ))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Microphone</label>
                      <Select value={selectedMic} onValueChange={setSelectedMic}>
                        <SelectTrigger><SelectValue placeholder="Default Microphone" /></SelectTrigger>
                        <SelectContent>{mics.map(m => (
                          <SelectItem key={m.deviceId} value={m.deviceId}>{m.label}</SelectItem>
                        ))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                      <Volume2 className="h-4 w-4" /> Audio Level
                    </h3>
                    <Progress value={audioLevel} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {audioLevel > 5 ? 'Mic is picking up audio ✓' : 'Speak to test your microphone'}
                    </p>
                  </div>
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
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Battle-Ready Checklist</h3>
                    {['Face a window or ring light for even lighting', 'Position camera at eye level', 'Use the rule-of-thirds grid', 'Test your mic — speak clearly', 'Minimize background noise'].map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground mb-1.5">
                        <CheckCircle2 className="h-3 w-3 mt-0.5 text-primary shrink-0" /><span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </DrawerContent>
            </Drawer>

            {battleId && (
              <Button size="sm" onClick={() => navigate(`/battle/${battleId}/contender`)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs h-8 px-3">
                <Play className="h-3 w-3 mr-1" /> Enter Battle
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Camera Area ── */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {hasOpponent ? (
            /* ── SPLIT SCREEN: 70/30 ── */
            <motion.div
              key="split"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col lg:flex-row"
            >
              {/* Your side — 70% */}
              <div className="relative w-full lg:w-[70%] h-[60%] lg:h-full bg-black">
                <video ref={videoRef} autoPlay playsInline muted
                  className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                <div className="absolute top-3 left-3 z-10">
                  <Badge className="bg-primary/80 text-primary-foreground font-bold text-[10px] px-2 py-0.5">YOUR SIDE</Badge>
                </div>
              </div>

              {/* VS divider */}
              <div className="hidden lg:flex items-center justify-center w-0 relative z-20">
                <div className="absolute bg-primary text-primary-foreground font-black text-xs rounded-full h-8 w-8 flex items-center justify-center shadow-lg border-2 border-background">VS</div>
              </div>

              {/* Opponent — 30% */}
              <div className="relative w-full lg:w-[30%] h-[40%] lg:h-full bg-muted/30 border-t lg:border-t-0 lg:border-l border-border">
                <div className="absolute top-3 left-3 z-10">
                  <Badge variant="outline" className="text-[10px] font-bold border-muted-foreground/30 text-muted-foreground">OPPONENT</Badge>
                </div>
                <div ref={opponentVideoRef} className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />
                {battleRoom.opponentIdentity && (
                  <div className="absolute bottom-3 left-3 z-10">
                    <Badge className="bg-green-600/80 text-white text-[10px]">{battleRoom.opponentIdentity}</Badge>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ── FULL SCREEN CAMERA ── */
            <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
              <video ref={videoRef} autoPlay playsInline muted
                className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            </motion.div>
          )}
        </AnimatePresence>

        <canvas ref={canvasRef} className="hidden" />

        {/* Connection status badge */}
        {battleId && (
          <div className="absolute top-[env(safe-area-inset-top,48px)] right-3 z-30 mt-10">
            <Badge variant="outline" className={`text-[10px] ${battleRoom.isConnected ? 'border-green-500/50 text-green-400' : 'border-white/20 text-white/50'}`}>
              {battleRoom.isConnected ? <><Wifi className="h-3 w-3 mr-1" /> Connected</> : <><WifiOff className="h-3 w-3 mr-1" /> Not Connected</>}
            </Badge>
          </div>
        )}

        {/* Start Camera Overlay */}
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4 z-20">
            <Camera className="w-16 h-16 text-white/30" />
            <Button onClick={startPreview} size="lg" className="bg-primary text-primary-foreground">
              <Camera className="mr-2 h-5 w-5" /> Start Camera
            </Button>
            {error && <p className="text-destructive text-sm max-w-xs text-center px-4">{error}</p>}
          </div>
        )}

        {/* Rule-of-thirds overlay */}
        {isActive && !hasOpponent && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/10" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/10" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/10" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/10" />
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-[env(safe-area-inset-top,48px)] left-1/2 -translate-x-1/2 z-30 mt-10">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white text-sm font-mono font-bold">{formatDuration(recordingDuration)}</span>
            </div>
          </div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
            <div className="bg-black/80 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center gap-3 min-w-[200px]">
              <Upload className="h-8 w-8 text-primary animate-bounce" />
              <p className="text-white text-sm font-medium">Uploading...</p>
              <Progress value={uploadProgress} className="h-2 w-full" />
              <span className="text-white/60 text-xs">{uploadProgress}%</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Control Bar ── */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/60 to-transparent pb-[env(safe-area-inset-bottom,16px)]">
          {/* Mode badge */}
          {studioMode !== 'idle' && !isRecording && (
            <div className="flex justify-center mb-2">
              <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs">
                {MODE_OPTIONS.find(m => m.mode === studioMode)?.label} Mode
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 px-4 py-3">
            {/* Video toggle */}
            <Button variant={isVideoEnabled ? 'ghost' : 'destructive'} size="icon"
              className="rounded-full h-10 w-10 min-w-[40px] text-white border border-white/20" onClick={toggleVideo}>
              {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>

            {/* Audio toggle */}
            <Button variant={isAudioEnabled ? 'ghost' : 'destructive'} size="icon"
              className="rounded-full h-10 w-10 min-w-[40px] text-white border border-white/20" onClick={toggleAudio}>
              {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>

            {/* REC / STOP button — always visible when camera is active */}
            {studioMode !== 'challenge' && (
              isRecording ? (
                <Button size="icon" className="rounded-full h-14 w-14 min-w-[56px] bg-red-600 hover:bg-red-700 border-4 border-white/30"
                  onClick={stopRecording}>
                  <Square className="h-5 w-5 text-white fill-white" />
                </Button>
              ) : (
                <Button size="icon" className="rounded-full h-14 w-14 min-w-[56px] bg-red-600 hover:bg-red-700 border-4 border-white/30"
                  onClick={() => {
                    if (studioMode === 'idle') setStudioMode('portfolio');
                    startRecording();
                  }}>
                  <Circle className="h-6 w-6 text-white fill-white" />
                </Button>
              )
            )}

            {/* Mode picker trigger */}
            <Drawer open={isModeDrawerOpen} onOpenChange={setIsModeDrawerOpen}>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon"
                  className="rounded-full h-10 w-10 min-w-[40px] text-white border border-primary/40 bg-primary/20">
                  <Swords className="h-4 w-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[80vh]">
                <DrawerHeader><DrawerTitle>What are you recording?</DrawerTitle></DrawerHeader>
                <div className="px-4 pb-6 space-y-2 overflow-y-auto max-h-[60vh]">
                  {MODE_OPTIONS.map(opt => {
                    const isLive = opt.mode === 'livestream';
                    return (
                      <button key={opt.mode} onClick={() => handleModeSelect(opt.mode)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                          studioMode === opt.mode
                            ? 'border-primary bg-primary/10 text-foreground'
                            : isLive
                              ? 'border-red-500/40 bg-red-500/5 hover:bg-red-500/10 text-foreground'
                              : 'border-border bg-card hover:bg-muted text-foreground'
                        }`}>
                        <div className={`relative p-2.5 rounded-lg ${
                          studioMode === opt.mode ? 'bg-primary text-primary-foreground'
                            : isLive ? 'bg-red-500/20 text-red-500'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {opt.icon}
                          {isLive && (
                            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse ring-2 ring-background" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className={`font-semibold text-sm ${isLive ? 'text-red-500' : ''}`}>{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </DrawerContent>
            </Drawer>

            {/* Flip camera */}
            <Button variant="ghost" size="icon"
              className="rounded-full h-10 w-10 min-w-[40px] text-white border border-white/20"
              onClick={async () => {
                if (isFlippingRef.current) return;
                isFlippingRef.current = true;
                try {
                  const newMode = facingMode === 'user' ? 'environment' : 'user';
                  setFacingMode(newMode);
                  setSelectedCamera('');
                  // Stop current stream
                  if (isRecording) stopRecording();
                  streamRef.current?.getTracks().forEach(t => t.stop());
                  streamRef.current = null;
                  if (videoRef.current) videoRef.current.srcObject = null;
                  cancelAnimationFrame(animFrameRef.current);
                  // Start with new facing mode
                  const constraints: MediaStreamConstraints = {
                    video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: newMode },
                    audio: { echoCancellation: true, noiseSuppression: true, ...(selectedMic ? { deviceId: { exact: selectedMic } } : {}) },
                  };
                  const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                  streamRef.current = mediaStream;
                  if (videoRef.current) videoRef.current.srcObject = mediaStream;
                  setIsActive(true);
                  setIsVideoEnabled(true);
                  setIsAudioEnabled(true);
                } catch (err) {
                  console.error('Failed to flip camera:', err);
                  toast.error('Could not switch camera');
                } finally {
                  isFlippingRef.current = false;
                }
              }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Mini audio meter */}
          <div className="max-w-xs mx-auto px-4 pb-1">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-100" style={{ width: `${audioLevel}%` }} />
            </div>
          </div>

          {/* Battle room controls */}
          {battleId && isActive && (
            <div className="flex justify-center gap-2 mt-2 pb-2">
              {!battleRoom.isConnected && !battleRoom.isConnecting && (
                <Button size="sm" className="rounded-full px-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs"
                  onClick={() => battleRoom.connect()}>
                  <Wifi className="h-3 w-3 mr-1" /> Connect Room
                </Button>
              )}
              {battleRoom.isConnecting && (
                <Badge variant="outline" className="text-xs animate-pulse border-blue-500/50 text-blue-400">Connecting...</Badge>
              )}
              {battleRoom.isConnected && (
                <Button variant="outline" size="sm" className="rounded-full px-4 border-destructive/50 text-destructive text-xs"
                  onClick={() => battleRoom.disconnect()}>
                  <WifiOff className="h-3 w-3 mr-1" /> Disconnect
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Challenge Modal */}
      <ChallengeModal open={challengeModalOpen} onClose={() => setChallengeModalOpen(false)} />

      {/* Post-record review: retake / save draft / publish + captions + thumbnail */}
      <RecordingReviewSheet
        blob={pendingBlob}
        defaultTitle={`Studio ${studioMode} ${new Date().toLocaleDateString()}`}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        onRetake={handleRetake}
        onClose={() => !isUploading && setPendingBlob(null)}
        onSubmit={(result) => pendingBlob && uploadRecording(pendingBlob, result)}
      />
    </div>
  );
}
