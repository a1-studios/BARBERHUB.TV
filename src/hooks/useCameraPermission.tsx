import { useState, useEffect, useCallback, useRef } from 'react';

type PermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

const PERMISSION_STORAGE_KEY = 'camera_permission_status';
const PERMISSION_TIMESTAMP_KEY = 'camera_permission_timestamp';
const PERMISSION_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const useCameraPermission = () => {
  const [status, setStatus] = useState<PermissionStatus>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check cached permission on mount
  useEffect(() => {
    const checkCachedPermission = async () => {
      const cachedStatus = localStorage.getItem(PERMISSION_STORAGE_KEY);
      const cachedTimestamp = localStorage.getItem(PERMISSION_TIMESTAMP_KEY);
      
      // If we have a cached "granted" status within the cache duration, verify it's still valid
      if (cachedStatus === 'granted' && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10);
        const isRecent = Date.now() - timestamp < PERMISSION_CACHE_DURATION;
        
        if (isRecent) {
          // Try to use the Permissions API to verify current status
          try {
            const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
            if (result.state === 'granted') {
              setStatus('granted');
              return;
            } else if (result.state === 'denied') {
              setStatus('denied');
              return;
            }
          } catch {
            // Permissions API not supported, trust cache
            setStatus('granted');
            return;
          }
        }
      }
      
      // Check if browser supports permissions API
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (result.state === 'granted') {
            setStatus('granted');
            cachePermission('granted');
          } else if (result.state === 'denied') {
            setStatus('denied');
          }
          // If 'prompt', stay in idle state
        } catch {
          // Permissions API not fully supported
        }
      }
    };

    checkCachedPermission();
  }, []);

  const cachePermission = (permissionStatus: PermissionStatus) => {
    localStorage.setItem(PERMISSION_STORAGE_KEY, permissionStatus);
    localStorage.setItem(PERMISSION_TIMESTAMP_KEY, Date.now().toString());
  };

  const requestPermission = useCallback(async (): Promise<MediaStream | null> => {
    // If already granted and we have a stream, return it
    if (status === 'granted' && streamRef.current) {
      return streamRef.current;
    }

    setStatus('requesting');

    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Detect mobile for optimized constraints
      const isMobile = window.innerWidth < 768;

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: isMobile ? 720 : 1280 }, 
          height: { ideal: isMobile ? 1280 : 720 }, // Portrait on mobile
          frameRate: { ideal: 30 }
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus('granted');
      cachePermission('granted');
      
      return mediaStream;
    } catch (error: any) {
      console.error('Camera permission error:', error);
      
      const errorName = error?.name || '';
      
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        setStatus('denied');
        cachePermission('denied');
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        setStatus('unavailable');
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        // Camera in use by another app
        setStatus('unavailable');
      } else {
        setStatus('denied');
      }
      
      return null;
    }
  }, [status]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  const resetPermission = useCallback(() => {
    stopStream();
    setStatus('idle');
    localStorage.removeItem(PERMISSION_STORAGE_KEY);
    localStorage.removeItem(PERMISSION_TIMESTAMP_KEY);
  }, [stopStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    status,
    stream,
    requestPermission,
    stopStream,
    resetPermission,
    isGranted: status === 'granted',
    isDenied: status === 'denied',
    isRequesting: status === 'requesting',
  };
};
