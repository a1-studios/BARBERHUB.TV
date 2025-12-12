import { useState, useCallback } from 'react';

interface UseMediaControlsOptions {
  initialMicEnabled?: boolean;
  initialVideoEnabled?: boolean;
}

interface UseMediaControlsReturn {
  isMicEnabled: boolean;
  isVideoEnabled: boolean;
  toggleMic: (stream: MediaStream | null) => void;
  toggleVideo: (stream: MediaStream | null) => void;
  setMicEnabled: (enabled: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
}

export const useMediaControls = (options: UseMediaControlsOptions = {}): UseMediaControlsReturn => {
  const { initialMicEnabled = true, initialVideoEnabled = true } = options;
  
  const [isMicEnabled, setIsMicEnabled] = useState(initialMicEnabled);
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideoEnabled);

  const toggleMic = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isMicEnabled;
      });
      setIsMicEnabled(prev => !prev);
    }
  }, [isMicEnabled]);

  const toggleVideo = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(prev => !prev);
    }
  }, [isVideoEnabled]);

  const setMicEnabled = useCallback((enabled: boolean) => {
    setIsMicEnabled(enabled);
  }, []);

  const setVideoEnabled = useCallback((enabled: boolean) => {
    setIsVideoEnabled(enabled);
  }, []);

  return {
    isMicEnabled,
    isVideoEnabled,
    toggleMic,
    toggleVideo,
    setMicEnabled,
    setVideoEnabled,
  };
};
