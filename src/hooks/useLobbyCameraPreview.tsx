import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Lightweight, lobby-only camera+mic acquisition. Owns ONE MediaStream so the
 * podium preview bubble can render the local contender's face. Stops cleanly
 * before the lobby hands off to ContenderTheater so LiveKit can re-acquire
 * devices on iOS Safari without "device in use" errors.
 *
 * Also exposes contender-style controls used inside the lobby: video/mic
 * toggles, and front/rear camera flip on supported devices.
 */
type Facing = 'user' | 'environment';

export const useLobbyCameraPreview = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [hasSpeaker, setHasSpeaker] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [facing, setFacing] = useState<Facing>('user');
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const acquire = useCallback(async (mode: Facing) => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: true,
      });
      streamRef.current = s;
      setStream(s);
      setHasCamera(s.getVideoTracks().length > 0);
      setHasMic(s.getAudioTracks().length > 0);
      // Sync enabled state to fresh tracks
      s.getVideoTracks().forEach((t) => (t.enabled = isVideoEnabled));
      s.getAudioTracks().forEach((t) => (t.enabled = isAudioEnabled));
      return s;
    } catch (e: any) {
      setError(e?.message || 'Permission denied');
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    return acquire(facing);
  }, [acquire, facing]);

  const enableSpeaker = useCallback(async () => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === 'suspended') await ctx.resume();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      }
      setHasSpeaker(true);
      return true;
    } catch {
      setHasSpeaker(true);
      return true;
    }
  }, []);

  const toggleVideo = useCallback(() => {
    setIsVideoEnabled((prev) => {
      const next = !prev;
      streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  const toggleAudio = useCallback(() => {
    setIsAudioEnabled((prev) => {
      const next = !prev;
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  const switchCamera = useCallback(async () => {
    const next: Facing = facing === 'user' ? 'environment' : 'user';
    // Stop current tracks before re-acquiring
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setFacing(next);
    await acquire(next);
  }, [facing, acquire]);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    stream,
    hasCamera,
    hasMic,
    hasSpeaker,
    isVideoEnabled,
    isAudioEnabled,
    facing,
    error,
    start,
    enableSpeaker,
    toggleVideo,
    toggleAudio,
    switchCamera,
    stop,
  };
};
