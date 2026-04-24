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
      {/* Floor disc / footrest */}
      <mesh position={[0, -1.05, 0]}>
        <cylinderGeometry args={[1.0, 1.15, 0.18, 32]} />
        <meshStandardMaterial color="#0F1116" metalness={0.85} roughness={0.35} />
      </mesh>
      {/* Glowing chrome ring at floor */}
      <mesh position={[0, -0.93, 0]}>
        <cylinderGeometry args={[1.02, 1.02, 0.04, 48]} />
        <meshStandardMaterial color={podiumColor.primary} emissive={podiumColor.emissive} emissiveIntensity={0.55} />
      </mesh>
      {/* Chair stem */}
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.18, 0.28, 0.55, 16]} />
        <meshStandardMaterial color="#23262d" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Chair seat */}
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.7, 0.62, 0.22, 32]} />
        <meshStandardMaterial color="#1a1d24" metalness={0.45} roughness={0.5} />
      </mesh>
      {/* Seat trim glow ring */}
      <mesh position={[0, -0.1, 0]}>
        <torusGeometry args={[0.7, 0.03, 12, 48]} />
        <meshStandardMaterial color={podiumColor.primary} emissive={podiumColor.emissive} emissiveIntensity={0.9} />
      </mesh>
      {/* Spinning halo above chair (state ring) */}
      <mesh ref={ringRef} position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.85, 0.04, 16, 64]} />
        <meshStandardMaterial
          color={podiumColor.primary}
          emissive={podiumColor.emissive}
          emissiveIntensity={0.7}
          metalness={0.4}
          roughness={0.2}
        />
      </mesh>

      {/* Live preview bubble — sits inside the halo */}
      <Html position={[0, 0.55, 0]} center distanceFactor={5.5} occlude={false} zIndexRange={[10, 0]}>
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
      <Html position={[0, 1.55, 0]} center distanceFactor={6} occlude={false}>
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
      <Html position={[0, -1.5, 0]} center distanceFactor={7} occlude={false}>
        <div className="pointer-events-none select-none whitespace-nowrap text-[10px] font-mono uppercase tracking-widest">
          {!isPresent && <span className="text-white/40">Waiting...</span>}
          {isPresent && !isReady && <span className="text-orange-400 animate-pulse">Arming</span>}
          {isReady && <span className="text-cyan-300 font-bold">● LOCKED</span>}
        </div>
      </Html>
    </group>
  );
};
