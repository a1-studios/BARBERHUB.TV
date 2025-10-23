import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * SphereImageGrid - Interactive 3D Image Sphere Component
 *
 * A React TypeScript component that displays images arranged in a 3D sphere layout.
 * Images are distributed using Fibonacci sphere distribution for optimal coverage.
 * Supports drag-to-rotate, momentum physics, auto-rotation, and modal image viewing.
 */

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface SphericalPosition {
  theta: number;  // Azimuth angle in degrees
  phi: number;    // Polar angle in degrees
  radius: number; // Distance from center
}

export interface WorldPosition extends Position3D {
  scale: number;
  zIndex: number;
  isVisible: boolean;
  fadeOpacity: number;
  originalIndex: number;
}

export interface ImageData {
  id: string;
  barberId?: string;
  src: string;
  alt: string;
  title?: string;
  description?: string;
  countryCode?: string;
  isChampion?: boolean;
  rating?: number;
  rank?: number;
  location?: string;
  stats?: {
    followers: number;
    likes: number;
  };
}

export interface SphereImageGridProps {
  images?: ImageData[];
  containerSize?: number;
  sphereRadius?: number;
  dragSensitivity?: number;
  momentumDecay?: number;
  maxRotationSpeed?: number;
  baseImageScale?: number;
  hoverScale?: number;
  perspective?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  championId?: string;
  grandPrize?: string;
  showCountryFlags?: boolean;
  showChampionCrown?: boolean;
  className?: string;
}

interface RotationState {
  x: number;
  y: number;
  z: number;
}

interface VelocityState {
  x: number;
  y: number;
}

interface MousePosition {
  x: number;
  y: number;
}

// ==========================================
// CONSTANTS & CONFIGURATION
// ==========================================

const SPHERE_MATH = {
  degreesToRadians: (degrees: number): number => degrees * (Math.PI / 180),
  radiansToDegrees: (radians: number): number => radians * (180 / Math.PI),

  sphericalToCartesian: (radius: number, theta: number, phi: number): Position3D => ({
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta)
  }),

  calculateDistance: (pos: Position3D, center: Position3D = { x: 0, y: 0, z: 0 }): number => {
    const dx = pos.x - center.x;
    const dy = pos.y - center.y;
    const dz = pos.z - center.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },

  normalizeAngle: (angle: number): number => {
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
  }
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const SphereImageGrid: React.FC<SphereImageGridProps> = ({
  images = [],
  containerSize = 400,
  sphereRadius = 200,
  dragSensitivity = 0.5,
  momentumDecay = 0.95,
  maxRotationSpeed = 5,
  baseImageScale = 0.12,
  hoverScale = 1.2,
  perspective = 1000,
  autoRotate = false,
  autoRotateSpeed = 0.3,
  championId,
  grandPrize = '$25,000',
  showCountryFlags = false,
  showChampionCrown = false,
  className = ''
}) => {

  // ==========================================
  // STATE & REFS
  // ==========================================

  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [rotation, setRotation] = useState<RotationState>({ x: 15, y: 15, z: 0 });
  const [velocity, setVelocity] = useState<VelocityState>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [imagePositions, setImagePositions] = useState<SphericalPosition[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef<MousePosition>({ x: 0, y: 0 });
  const animationFrame = useRef<number | null>(null);

  // ==========================================
  // COMPUTED VALUES
  // ==========================================

  const actualSphereRadius = sphereRadius || containerSize * 0.5;
  const baseImageSize = containerSize * baseImageScale;

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  const generateSpherePositions = useCallback((): SphericalPosition[] => {
    const positions: SphericalPosition[] = [];
    const imageCount = images.length;

    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const angleIncrement = 2 * Math.PI / goldenRatio;

    for (let i = 0; i < imageCount; i++) {
      const t = i / imageCount;
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = angleIncrement * i;

      let phi = inclination * (180 / Math.PI);
      let theta = (azimuth * (180 / Math.PI)) % 360;

      const poleBonus = Math.pow(Math.abs(phi - 90) / 90, 0.6) * 35;
      if (phi < 90) {
        phi = Math.max(5, phi - poleBonus);
      } else {
        phi = Math.min(175, phi + poleBonus);
      }

      phi = 15 + (phi / 180) * 150;

      const randomOffset = (Math.random() - 0.5) * 20;
      theta = (theta + randomOffset) % 360;
      phi = Math.max(0, Math.min(180, phi + (Math.random() - 0.5) * 10));

      positions.push({
        theta: theta,
        phi: phi,
        radius: actualSphereRadius
      });
    }

    return positions;
  }, [images.length, actualSphereRadius]);

  const calculateWorldPositions = useCallback((): WorldPosition[] => {
    const positions = imagePositions.map((pos, index) => {
      const thetaRad = SPHERE_MATH.degreesToRadians(pos.theta);
      const phiRad = SPHERE_MATH.degreesToRadians(pos.phi);
      const rotXRad = SPHERE_MATH.degreesToRadians(rotation.x);
      const rotYRad = SPHERE_MATH.degreesToRadians(rotation.y);

      let x = pos.radius * Math.sin(phiRad) * Math.cos(thetaRad);
      let y = pos.radius * Math.cos(phiRad);
      let z = pos.radius * Math.sin(phiRad) * Math.sin(thetaRad);

      const x1 = x * Math.cos(rotYRad) + z * Math.sin(rotYRad);
      const z1 = -x * Math.sin(rotYRad) + z * Math.cos(rotYRad);
      x = x1;
      z = z1;

      const y2 = y * Math.cos(rotXRad) - z * Math.sin(rotXRad);
      const z2 = y * Math.sin(rotXRad) + z * Math.cos(rotXRad);
      y = y2;
      z = z2;

      const worldPos: Position3D = { x, y, z };

      const fadeZoneStart = -10;
      const fadeZoneEnd = -30;
      const isVisible = worldPos.z > fadeZoneEnd;

      let fadeOpacity = 1;
      if (worldPos.z <= fadeZoneStart) {
        fadeOpacity = Math.max(0, (worldPos.z - fadeZoneEnd) / (fadeZoneStart - fadeZoneEnd));
      }

      const isPoleImage = pos.phi < 30 || pos.phi > 150;

      const distanceFromCenter = Math.sqrt(worldPos.x * worldPos.x + worldPos.y * worldPos.y);
      const maxDistance = actualSphereRadius;
      const distanceRatio = Math.min(distanceFromCenter / maxDistance, 1);

      const distancePenalty = isPoleImage ? 0.4 : 0.7;
      const centerScale = Math.max(0.3, 1 - distanceRatio * distancePenalty);

      const depthScale = (worldPos.z + actualSphereRadius) / (2 * actualSphereRadius);
      const scale = centerScale * Math.max(0.5, 0.8 + depthScale * 0.3);

      return {
        ...worldPos,
        scale,
        zIndex: Math.round(1000 + worldPos.z),
        isVisible,
        fadeOpacity,
        originalIndex: index
      };
    });

    const adjustedPositions = [...positions];

    for (let i = 0; i < adjustedPositions.length; i++) {
      const pos = adjustedPositions[i];
      if (!pos.isVisible) continue;

      let adjustedScale = pos.scale;
      const imageSize = baseImageSize * adjustedScale;

      for (let j = 0; j < adjustedPositions.length; j++) {
        if (i === j) continue;

        const other = adjustedPositions[j];
        if (!other.isVisible) continue;

        const otherSize = baseImageSize * other.scale;

        const dx = pos.x - other.x;
        const dy = pos.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const minDistance = (imageSize + otherSize) / 2 + 25;

        if (distance < minDistance && distance > 0) {
          const overlap = minDistance - distance;
          const reductionFactor = Math.max(0.4, 1 - (overlap / minDistance) * 0.6);
          adjustedScale = Math.min(adjustedScale, adjustedScale * reductionFactor);
        }
      }

      adjustedPositions[i] = {
        ...pos,
        scale: Math.max(0.25, adjustedScale)
      };
    }

    return adjustedPositions;
  }, [imagePositions, rotation, actualSphereRadius, baseImageSize]);

  const clampRotationSpeed = useCallback((speed: number): number => {
    return Math.max(-maxRotationSpeed, Math.min(maxRotationSpeed, speed));
  }, [maxRotationSpeed]);

  // ==========================================
  // PHYSICS & MOMENTUM
  // ==========================================

  const updateMomentum = useCallback(() => {
    if (isDragging) return;

    setVelocity(prev => {
      const newVelocity = {
        x: prev.x * momentumDecay,
        y: prev.y * momentumDecay
      };

      if (!autoRotate && Math.abs(newVelocity.x) < 0.01 && Math.abs(newVelocity.y) < 0.01) {
        return { x: 0, y: 0 };
      }

      return newVelocity;
    });

    setRotation(prev => {
      let newY = prev.y;

      if (autoRotate) {
        newY += autoRotateSpeed;
      }

      newY += clampRotationSpeed(velocity.y);

      return {
        x: SPHERE_MATH.normalizeAngle(prev.x + clampRotationSpeed(velocity.x)),
        y: SPHERE_MATH.normalizeAngle(newY),
        z: prev.z
      };
    });
  }, [isDragging, momentumDecay, velocity, clampRotationSpeed, autoRotate, autoRotateSpeed]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setVelocity({ x: 0, y: 0 });
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;

    const rotationDelta = {
      x: -deltaY * dragSensitivity,
      y: deltaX * dragSensitivity
    };

    setRotation(prev => ({
      x: SPHERE_MATH.normalizeAngle(prev.x + clampRotationSpeed(rotationDelta.x)),
      y: SPHERE_MATH.normalizeAngle(prev.y + clampRotationSpeed(rotationDelta.y)),
      z: prev.z
    }));

    setVelocity({
      x: clampRotationSpeed(rotationDelta.x),
      y: clampRotationSpeed(rotationDelta.y)
    });

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, [isDragging, dragSensitivity, clampRotationSpeed]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setVelocity({ x: 0, y: 0 });
    lastMousePos.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const touch = e.touches[0];
    const deltaX = touch.clientX - lastMousePos.current.x;
    const deltaY = touch.clientY - lastMousePos.current.y;

    const rotationDelta = {
      x: -deltaY * dragSensitivity,
      y: deltaX * dragSensitivity
    };

    setRotation(prev => ({
      x: SPHERE_MATH.normalizeAngle(prev.x + clampRotationSpeed(rotationDelta.x)),
      y: SPHERE_MATH.normalizeAngle(prev.y + clampRotationSpeed(rotationDelta.y)),
      z: prev.z
    }));

    setVelocity({
      x: clampRotationSpeed(rotationDelta.x),
      y: clampRotationSpeed(rotationDelta.y)
    });

    lastMousePos.current = { x: touch.clientX, y: touch.clientY };
  }, [isDragging, dragSensitivity, clampRotationSpeed]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ==========================================
  // EFFECTS & LIFECYCLE
  // ==========================================

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setImagePositions(generateSpherePositions());
  }, [generateSpherePositions]);

  useEffect(() => {
    const animate = () => {
      updateMomentum();
      animationFrame.current = requestAnimationFrame(animate);
    };

    if (isMounted) {
      animationFrame.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [isMounted, updateMomentum]);

  useEffect(() => {
    if (!isMounted) return;

    const container = containerRef.current;
    if (!container) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMounted, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const worldPositions = calculateWorldPositions();

  const getCountryFlagEmoji = (code: string): string => {
    const normalized = code?.trim();
    if (!normalized || normalized.length !== 2 || normalized === 'XX') return '🌍';
    const codePoints = normalized
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const renderImageNode = useCallback((image: ImageData, index: number) => {
    const position = worldPositions[index];

    if (!position || !position.isVisible) return null;

    const imageSize = baseImageSize * position.scale;
    const isHovered = hoveredIndex === index;
    const finalScale = isHovered ? Math.min(1.2, 1.2 / position.scale) : 1;
    const isChampion = showChampionCrown && championId && image.id === championId;

    return (
      <div
        key={image.id}
        className="absolute cursor-pointer select-none transition-transform duration-200 ease-out"
        style={{
          width: `${imageSize}px`,
          height: `${imageSize}px`,
          left: `${containerSize/2 + position.x}px`,
          top: `${containerSize/2 + position.y}px`,
          opacity: position.fadeOpacity,
          transform: `translate(-50%, -50%) scale(${finalScale})`,
          zIndex: position.zIndex
        }}
        onMouseEnter={() => setHoveredIndex(index)}
        onMouseLeave={() => setHoveredIndex(null)}
        onClick={() => setSelectedImage(image)}
      >
        <div className="relative w-full h-full rounded-full overflow-hidden shadow-lg border-2 border-primary/30 hover:border-primary/60 transition-colors">
          <img
            src={image.src}
            alt={image.alt}
            className="w-full h-full object-cover"
            draggable={false}
            loading={index < 3 ? 'eager' : 'lazy'}
          />
          
          {/* Country Flag Badge - bottom right */}
          {showCountryFlags && image.countryCode && (
            <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center text-sm">
              {getCountryFlagEmoji(image.countryCode)}
            </div>
          )}
          
          {/* Champion Crown - top center */}
          {isChampion && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl animate-pulse drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]">
              👑
            </div>
          )}
        </div>
      </div>
    );
  }, [worldPositions, baseImageSize, containerSize, hoveredIndex, showCountryFlags, showChampionCrown, championId]);

  const renderSpotlightModal = () => {
    if (!selectedImage) return null;

    const countryCode = selectedImage.countryCode || 'XX';
    
    // Convert country code to flag emoji (works for any valid ISO 3166-1 alpha-2 code)
    const getCountryFlagEmoji = (code: string): string => {
      const normalized = code?.trim();
      if (!normalized || normalized.length !== 2 || normalized === 'XX') return '🌍';
      const codePoints = normalized
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    };
    
    const countryFlagEmoji = getCountryFlagEmoji(countryCode);

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={() => setSelectedImage(null)}
        style={{
          animation: 'fadeIn 0.3s ease-out'
        }}
      >
        <div
          className="bg-card rounded-xl max-w-2xl w-full overflow-hidden border-2 border-primary/30 shadow-2xl cursor-pointer hover:border-primary/60 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            // Navigate to barber profile (barberId is stored in image.id)
            window.location.href = `/barber/${selectedImage.id}`;
          }}
          style={{
            animation: 'scaleIn 0.3s ease-out'
          }}
        >
          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(null);
            }}
            className="absolute top-3 right-3 w-10 h-10 bg-black/60 rounded-full text-white flex items-center justify-center hover:bg-black/80 transition-all z-10"
          >
            <X size={18} />
          </button>

          {/* 50/50 Split Layout */}
          <div className="flex flex-col sm:flex-row h-auto">
            {/* LEFT: Country Flag (50%) */}
            <div className="w-full sm:w-1/2 bg-gradient-to-br from-primary/5 to-primary/10 flex flex-col items-center justify-center p-6 min-h-[180px]">
              <div className="text-[4rem] md:text-[5rem] leading-none mb-2">
                {countryFlagEmoji}
              </div>
              <p className="text-lg font-bold text-foreground tracking-wider">
                {countryCode}
              </p>
            </div>

            {/* RIGHT: Stats (50%) */}
            <div className="w-full sm:w-1/2 p-6 flex flex-col justify-center space-y-3 border-l border-border/50">
              {/* Name */}
              <div>
                <h3 className="text-xl font-bold text-foreground truncate">
                  {selectedImage.title}
                </h3>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {countryCode} Contender
                </p>
              </div>

              {/* Stats Grid */}
              <div className="space-y-2 text-sm">
                {/* Location */}
                {selectedImage.location && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">📍</span>
                    <span className="text-foreground">{selectedImage.location}</span>
                  </div>
                )}
                
                {/* Followers */}
                {selectedImage.stats && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">👥</span>
                    <span className="text-foreground font-medium">{selectedImage.stats.followers.toLocaleString()}</span>
                    <span className="text-muted-foreground text-xs">followers</span>
                  </div>
                )}
                
                {/* Likes */}
                {selectedImage.stats && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">❤️</span>
                    <span className="text-foreground font-medium">{selectedImage.stats.likes.toLocaleString()}</span>
                    <span className="text-muted-foreground text-xs">likes</span>
                  </div>
                )}
                
                {/* Rank */}
                {selectedImage.rank && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">🏆</span>
                    <span className="text-foreground font-medium">Rank #{selectedImage.rank}</span>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Click to view full profile →
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // EARLY RETURNS
  // ==========================================

  if (!isMounted) {
    return (
      <div
        className="bg-muted/50 rounded-lg animate-pulse flex items-center justify-center"
        style={{ width: containerSize, height: containerSize }}
      >
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!images.length) {
    return (
      <div
        className="bg-muted/30 rounded-lg border-2 border-dashed border-border flex items-center justify-center"
        style={{ width: containerSize, height: containerSize }}
      >
        <div className="text-muted-foreground text-center">
          <p>No images provided</p>
          <p className="text-sm">Add images to the images prop</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN RENDER
  // ==========================================

  const renderCenterPrize = () => {
    if (!grandPrize) return null;

    // Responsive coin size: 20% smaller - 12.8% of container, min 64px, max 96px
    const coinSize = Math.min(Math.max(containerSize * 0.128, 64), 96);
    const fontSize = {
      logo: `${coinSize * 0.35}px`,
      label: `${coinSize * 0.095}px`,
      amount: `${coinSize * 0.2}px`
    };

    return (
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${containerSize/2}px`,
          top: `${containerSize/2}px`,
          transform: 'translate(-50%, -50%)',
          zIndex: 1500
        }}
      >
        {/* Gold Coin Container */}
        <div 
          className="relative animate-coin-spin"
          style={{
            width: `${coinSize}px`,
            height: `${coinSize}px`
          }}
        >
          {/* Coin Shadow */}
          <div className="absolute inset-0 rounded-full bg-black/40 blur-xl transform translate-y-2" />
          
          {/* Gold Coin */}
          <div 
            className="relative w-full h-full rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-2xl flex items-center justify-center animate-float"
            style={{
              borderWidth: `${Math.max(coinSize * 0.04, 3)}px`,
              borderColor: 'rgb(253 224 71)' // yellow-300
            }}
          >
            {/* Inner Coin Rings */}
            <div 
              className="absolute rounded-full border-yellow-300/50"
              style={{
                inset: `${coinSize * 0.08}px`,
                borderWidth: `${Math.max(coinSize * 0.02, 2)}px`
              }}
            />
            <div 
              className="absolute rounded-full border-yellow-300/30"
              style={{
                inset: `${coinSize * 0.16}px`,
                borderWidth: `${Math.max(coinSize * 0.01, 1)}px`
              }}
            />
            
            {/* Coin Content */}
            <div className="relative text-center z-10 px-2">
              <div 
                className="drop-shadow-lg leading-none flex items-center justify-center"
                style={{ 
                  width: `${coinSize * 0.4}px`,
                  height: `${coinSize * 0.4}px`,
                  marginBottom: `${coinSize * 0.02}px`,
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}
              >
                <img 
                  src="/lovable-uploads/c5bbb6c4-149e-41f8-9e68-1580ee1afdf8.png" 
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div 
                className="text-yellow-900 font-bold tracking-wider uppercase leading-none"
                style={{ 
                  fontSize: fontSize.label,
                  marginBottom: `${coinSize * 0.02}px`
                }}
              >
                Grand Prize
              </div>
              <div 
                className="font-black text-yellow-900 drop-shadow-sm leading-none whitespace-nowrap"
                style={{ fontSize: fontSize.amount }}
              >
                {grandPrize}
              </div>
            </div>
            
            {/* Shine Effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-transparent to-transparent animate-shine" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes coinSpin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes shine {
          0% { opacity: 0.6; transform: rotate(0deg); }
          50% { opacity: 0.3; }
          100% { opacity: 0.6; transform: rotate(360deg); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-coin-spin {
          animation: coinSpin 4s linear infinite;
          transform-style: preserve-3d;
        }
        .animate-shine {
          animation: shine 3s ease-in-out infinite;
        }
      `}</style>

      <div
        ref={containerRef}
        className={`relative select-none cursor-grab active:cursor-grabbing ${className}`}
        style={{
          width: containerSize,
          height: containerSize,
          perspective: `${perspective}px`
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="relative w-full h-full" style={{ zIndex: 10 }}>
          {images.map((image, index) => renderImageNode(image, index))}
        </div>
        
        {/* Center Grand Prize Display */}
        {renderCenterPrize()}
      </div>

      {renderSpotlightModal()}
    </>
  );
};

export default SphereImageGrid;
