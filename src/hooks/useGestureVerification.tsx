import { useState, useCallback, useRef } from 'react';

export interface SwipeMetrics {
  startTime: number;
  endTime: number;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  pathPoints: Array<{ x: number; y: number; t: number }>;
  velocity: number;
  angle: number;
  jitterVariance: number;
  duration: number;
}

interface UseGestureVerificationResult {
  isTracking: boolean;
  startTracking: (x: number, y: number) => void;
  trackPoint: (x: number, y: number) => void;
  endTracking: (x: number, y: number) => SwipeMetrics | null;
  validateHumanGesture: (metrics: SwipeMetrics) => { valid: boolean; reason?: string };
  generateVerificationToken: (country: string, metrics: SwipeMetrics) => string;
  reset: () => void;
}

export const useGestureVerification = (): UseGestureVerificationResult => {
  const [isTracking, setIsTracking] = useState(false);
  const pathPointsRef = useRef<Array<{ x: number; y: number; t: number }>>([]);
  const startPointRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const reset = useCallback(() => {
    setIsTracking(false);
    pathPointsRef.current = [];
    startPointRef.current = null;
  }, []);

  const startTracking = useCallback((x: number, y: number) => {
    const now = Date.now();
    startPointRef.current = { x, y, t: now };
    pathPointsRef.current = [{ x, y, t: now }];
    setIsTracking(true);
  }, []);

  const trackPoint = useCallback((x: number, y: number) => {
    if (!isTracking) return;
    pathPointsRef.current.push({ x, y, t: Date.now() });
  }, [isTracking]);

  const calculateJitterVariance = (points: Array<{ x: number; y: number }>): number => {
    if (points.length < 3) return 0;

    const start = points[0];
    const end = points[points.length - 1];
    
    // Calculate the perfect line from start to end
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lineLength = Math.sqrt(dx * dx + dy * dy);
    
    if (lineLength === 0) return 0;

    // Calculate perpendicular distances from each point to the line
    const distances = points.map(point => {
      const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (lineLength * lineLength);
      const projX = start.x + t * dx;
      const projY = start.y + t * dy;
      return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
    });

    // Calculate variance of distances
    const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + (d - mean) ** 2, 0) / distances.length;
    
    return Math.sqrt(variance);
  };

  const endTracking = useCallback((x: number, y: number): SwipeMetrics | null => {
    if (!startPointRef.current) return null;

    const endTime = Date.now();
    const endPoint = { x, y };
    pathPointsRef.current.push({ x, y, t: endTime });

    const startPoint = { x: startPointRef.current.x, y: startPointRef.current.y };
    const startTime = startPointRef.current.t;
    const duration = endTime - startTime;

    // Calculate distance and velocity
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const velocity = distance / Math.max(duration, 1);

    // Calculate angle in degrees (0° = right, 90° = up)
    const angle = Math.atan2(-dy, dx) * (180 / Math.PI);
    
    // Calculate jitter variance
    const jitterVariance = calculateJitterVariance(pathPointsRef.current);

    const metrics: SwipeMetrics = {
      startTime,
      endTime,
      startPoint,
      endPoint,
      pathPoints: [...pathPointsRef.current],
      velocity,
      angle,
      jitterVariance,
      duration,
    };

    setIsTracking(false);
    return metrics;
  }, []);

  const validateHumanGesture = useCallback((metrics: SwipeMetrics): { valid: boolean; reason?: string } => {
    // 1. Check angle is roughly diagonal (30-60 degrees from horizontal going up-right)
    // Note: negative angle because y increases downward, so up-right is negative
    const normalizedAngle = metrics.angle < 0 ? metrics.angle + 360 : metrics.angle;
    const expectedAngle = 45; // 45 degrees up-right
    const angleDiff = Math.min(
      Math.abs(normalizedAngle - expectedAngle),
      Math.abs(normalizedAngle - (expectedAngle + 360))
    );
    
    if (angleDiff > 35) {
      return { valid: false, reason: 'Swipe at a diagonal angle (↗)' };
    }

    // 2. Check velocity is human-like (not instant, not too slow)
    if (metrics.velocity < 0.2) {
      return { valid: false, reason: 'Swipe a bit faster!' };
    }
    if (metrics.velocity > 8) {
      return { valid: false, reason: 'That was too fast!' };
    }

    // 3. Critical: Check jitter variance (humans are never perfectly straight)
    // If path variance is < 1.5px, likely a bot
    if (metrics.jitterVariance < 1.5 && metrics.pathPoints.length > 5) {
      return { valid: false, reason: 'Try a more natural swipe' };
    }

    // 4. Check duration is reasonable (150ms - 2500ms)
    if (metrics.duration < 150) {
      return { valid: false, reason: 'Hold and swipe smoothly' };
    }
    if (metrics.duration > 2500) {
      return { valid: false, reason: 'Swipe in one motion' };
    }

    // 5. Check minimum distance traveled
    const distance = Math.sqrt(
      (metrics.endPoint.x - metrics.startPoint.x) ** 2 +
      (metrics.endPoint.y - metrics.startPoint.y) ** 2
    );
    if (distance < 50) {
      return { valid: false, reason: 'Swipe further!' };
    }

    return { valid: true };
  }, []);

  const generateVerificationToken = useCallback((country: string, metrics: SwipeMetrics): string => {
    const payload = {
      country,
      timestamp: Date.now(),
      velocity: metrics.velocity.toFixed(2),
      jitter: metrics.jitterVariance.toFixed(2),
      angle: metrics.angle.toFixed(1),
      duration: metrics.duration,
    };
    return btoa(JSON.stringify(payload));
  }, []);

  return {
    isTracking,
    startTracking,
    trackPoint,
    endTracking,
    validateHumanGesture,
    generateVerificationToken,
    reset,
  };
};
