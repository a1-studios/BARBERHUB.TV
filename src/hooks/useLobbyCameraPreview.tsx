import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Lightweight, lobby-only camera+mic acquisition. Owns ONE MediaStream so the
 * podium preview bubble can render the local contender's face. Stops cleanly
 * before the lobby hands off to ContenderTheater so LiveKit can re-acquire
 * devices on iOS Safari without "device in use" errors.
 */
export const useLobbyCameraPreview = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [hasSpeaker, setHasSpeaker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = s;
      setStream(s);
      setHasCamera(s.getVideoTracks().length > 0);
      setHasMic(s.getAudioTracks().length > 0);
      return s;
    } catch (e: any) {
      setError(e?.message || 'Permission denied');
      return null;
    }
  }, []);

  const enableSpeaker = useCallback(async () => {
    try {
      // Use a one-shot AudioContext resume gesture to satisfy iOS audio unlock.
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === 'suspended') await ctx.resume();
        // Tiny silent buffer to actually start the output device on iOS.
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      }
      setHasSpeaker(true);
      return true;
    } catch {
      setHasSpeaker(true); // Best-effort — don't block the user.
      return true;
    }
  }, []);

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

  return { stream, hasCamera, hasMic, hasSpeaker, error, start, enableSpeaker, stop };
};
