import { useState, useCallback, useRef, useEffect } from 'react';

interface UseLocalCameraPreviewReturn {
  stream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;
  startPreview: () => Promise<void>;
  stopPreview: () => void;
  switchCamera: () => Promise<void>;
  facingMode: 'user' | 'environment';
  isPreviewActive: boolean;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const useLocalCameraPreview = (): UseLocalCameraPreviewReturn => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startPreview = useCallback(async () => {
    try {
      setError(null);
      
      // Request camera and microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsPreviewActive(true);
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);

      // Attach to video element if available
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

    } catch (err: any) {
      console.error('Failed to start camera preview:', err);
      
      let errorMessage = 'Failed to access camera';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone permission denied. Please allow access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found. Please connect a device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is in use by another application.';
      }
      
      setError(errorMessage);
      setIsPreviewActive(false);
    }
  }, []);

  const stopPreview = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setStream(null);
    setIsPreviewActive(false);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
  }, []);

  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(prev => !prev);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(prev => !prev);
    }
  }, []);

  const switchCamera = useCallback(async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    
    // Stop current video tracks only
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => track.stop());
    }

    try {
      const newVideoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: newMode,
        },
      });

      const newVideoTrack = newVideoStream.getVideoTracks()[0];
      if (streamRef.current) {
        // Remove old video tracks and add new one
        const oldVideoTracks = streamRef.current.getVideoTracks();
        oldVideoTracks.forEach(t => streamRef.current!.removeTrack(t));
        streamRef.current.addTrack(newVideoTrack);
      }

      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }

      setFacingMode(newMode);
      setStream(streamRef.current);
    } catch (err) {
      console.error('Failed to switch camera:', err);
      toast.error('Could not switch camera');
    }
  }, [facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    stream,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    startPreview,
    stopPreview,
    switchCamera,
    facingMode,
    isPreviewActive,
    error,
    videoRef,
  };
};
