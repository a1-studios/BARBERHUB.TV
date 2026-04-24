import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { PodiumPreviewBubble } from './PodiumPreviewBubble';

interface ContenderPodiumProps {
  position: [number, number, number];
  side: 1 | 2;
  name: string;
  countryFlag?: string;
  isReady: boolean;
  isPresent: boolean;
  isLocal?: boolean;
  localStream?: MediaStream | null;
  bubbleSize?: number;
}

const SIDE_COLOR = {
  1: { primary: '#F97316', emissive: '#F97316' },
  2: { primary: '#22D3EE', emissive: '#22D3EE' },
};

/**
 * Stylized barber chair: hydraulic stem, leather seat, padded backrest,
 * headrest, two armrests, chrome footring. The spinning halo + live preview
 * bubble float just above the headrest.
 */
export const ContenderPodium = ({
  position,
  side,
  name,
  countryFlag,
  isReady,
  isPresent,
  isLocal,
  localStream,
  bubbleSize = 96,
}: ContenderPodiumProps) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const podiumColor = SIDE_COLOR[side];
  const idleColor = useRef(new THREE.Color(podiumColor.primary));
  const actualColor = useRef(new THREE.Color('#444'));

  useFrame((state, delta) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.y += delta * (isReady ? 0.8 : 0.25);
    const target = isReady
      ? new THREE.Color('#22D3EE')
      : (isPresent ? idleColor.current : new THREE.Color('#444'));
    actualColor.current.lerp(target, 0.1);
    const mat = ringRef.current.material as THREE.MeshStandardMaterial;
    mat.color.copy(actualColor.current);
    mat.emissive.copy(actualColor.current);
    mat.emissiveIntensity = isReady
      ? 1.6 + Math.sin(state.clock.elapsedTime * 4) * 0.3
      : (isPresent ? 0.7 : 0.2);
  });

  const fallbackInitial = (name || '?').trim().charAt(0);

  return (
    <group position={position}>
      {/* Floor base disc */}
      <mesh position={[0, -1.42, 0]}>
        <cylinderGeometry args={[0.85, 0.95, 0.1, 32]} />
        <meshStandardMaterial color="#0a0b10" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Chrome footring (glowing trim) */}
      <mesh position={[0, -1.34, 0]}>
        <torusGeometry args={[0.85, 0.04, 12, 48]} />
        <meshStandardMaterial color={podiumColor.primary} emissive={podiumColor.emissive} emissiveIntensity={0.7} metalness={0.95} roughness={0.15} />
      </mesh>
      {/* Hydraulic stem */}
      <mesh position={[0, -0.95, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 0.85, 16]} />
        <meshStandardMaterial color="#c0c4ca" metalness={0.95} roughness={0.18} />
      </mesh>
      {/* Stem cap */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.32, 0.28, 0.12, 24]} />
        <meshStandardMaterial color="#1a1d24" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Seat cushion (leather) */}
      <mesh position={[0, -0.32, 0]}>
        <boxGeometry args={[1.2, 0.22, 1.0]} />
        <meshStandardMaterial color="#15171c" metalness={0.25} roughness={0.65} />
      </mesh>
      {/* Seat side trim */}
      <mesh position={[0, -0.21, 0]}>
        <boxGeometry args={[1.22, 0.04, 1.02]} />
        <meshStandardMaterial color={podiumColor.primary} emissive={podiumColor.emissive} emissiveIntensity={0.55} />
      </mesh>

      {/* Backrest (padded, slight tilt) */}
      <group position={[0, 0.45, -0.42]} rotation={[-0.18, 0, 0]}>
        <mesh>
          <boxGeometry args={[1.15, 1.5, 0.22]} />
          <meshStandardMaterial color="#15171c" metalness={0.25} roughness={0.7} />
        </mesh>
        {/* Backrest tufting line */}
        <mesh position={[0, 0, 0.115]}>
          <boxGeometry args={[1.0, 0.04, 0.01]} />
          <meshStandardMaterial color={podiumColor.primary} emissive={podiumColor.emissive} emissiveIntensity={0.8} />
        </mesh>
        {/* Headrest pillow */}
        <mesh position={[0, 0.92, 0.06]}>
          <boxGeometry args={[0.7, 0.32, 0.22]} />
          <meshStandardMaterial color="#1c1f26" metalness={0.2} roughness={0.75} />
        </mesh>
      </group>

      {/* Left armrest */}
      <mesh position={[-0.72, -0.05, 0]}>
        <boxGeometry args={[0.18, 0.18, 0.85]} />
        <meshStandardMaterial color="#1a1d24" metalness={0.4} roughness={0.55} />
      </mesh>
      <mesh position={[-0.72, 0.05, 0]}>
        <boxGeometry args={[0.2, 0.04, 0.88]} />
        <meshStandardMaterial color={podiumColor.primary} emissive={podiumColor.emissive} emissiveIntensity={0.6} />
      </mesh>
      {/* Right armrest */}
      <mesh position={[0.72, -0.05, 0]}>
        <boxGeometry args={[0.18, 0.18, 0.85]} />
        <meshStandardMaterial color="#1a1d24" metalness={0.4} roughness={0.55} />
      </mesh>
      <mesh position={[0.72, 0.05, 0]}>
        <boxGeometry args={[0.2, 0.04, 0.88]} />
        <meshStandardMaterial color={podiumColor.primary} emissive={podiumColor.emissive} emissiveIntensity={0.6} />
      </mesh>

      {/* Spinning state halo above headrest */}
      <mesh ref={ringRef} position={[0, 1.55, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.04, 16, 64]} />
        <meshStandardMaterial
          color={podiumColor.primary}
          emissive={podiumColor.emissive}
          emissiveIntensity={0.7}
          metalness={0.4}
          roughness={0.2}
        />
      </mesh>

      {/* Live preview bubble — sits inside the halo */}
      <Html position={[0, 1.55, -0.15]} center distanceFactor={5.5} occlude={false} zIndexRange={[10, 0]}>
        <PodiumPreviewBubble
          stream={isLocal ? localStream ?? null : null}
          side={side}
          isReady={isReady}
          isPresent={isPresent}
          fallbackInitial={fallbackInitial}
          flag={countryFlag}
          size={bubbleSize}
        />
      </Html>

      {/* Name pill */}
      <Html position={[0, 2.5, -0.1]} center distanceFactor={6} occlude={false}>
        <div
          className={`pointer-events-none select-none whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-md transition-all duration-300 ${
            isReady
              ? 'bg-cyan-400/20 text-cyan-300 ring-2 ring-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.7)]'
              : isPresent
              ? side === 1
                ? 'bg-orange-500/20 text-orange-200 ring-1 ring-orange-400/60'
                : 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/60'
              : 'bg-black/60 text-white/50 ring-1 ring-white/20'
          }`}
        >
          {countryFlag && <span className="mr-1">{countryFlag}</span>}
          {name}
          {isLocal && <span className="ml-1 text-[10px] opacity-70">(YOU)</span>}
        </div>
      </Html>

      {/* Status caption */}
      <Html position={[0, -1.6, 0]} center distanceFactor={7} occlude={false}>
        <div className="pointer-events-none select-none whitespace-nowrap text-[10px] font-mono uppercase tracking-widest">
          {!isPresent && <span className="text-white/40">Waiting...</span>}
          {isPresent && !isReady && <span className="text-orange-400 animate-pulse">Arming</span>}
          {isReady && <span className="text-cyan-300 font-bold">● LOCKED</span>}
        </div>
      </Html>
    </group>
  );
};
