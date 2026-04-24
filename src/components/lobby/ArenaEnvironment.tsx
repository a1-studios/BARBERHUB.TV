import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';

interface ArenaEnvironmentProps {
  pulse?: number;
}

/**
 * Warm, intimate barber arena. Wood-tone stage discs under each chair,
 * back-wall slab with neon trim, soft overhead light truss. Dropped the
 * starfield + hoop rings — they read as a void rather than a venue.
 */
export const ArenaEnvironment = ({ pulse = 0 }: ArenaEnvironmentProps) => {
  const trussRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const vsRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (trussRef.current) {
      const mat = trussRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 1.2) * 0.08;
    }
    if (haloRef.current) {
      const target = 0.22 + pulse * 0.5;
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity += (target - mat.opacity) * 0.08;
    }
    if (vsRef.current) {
      const mat = vsRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.55 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
    }
  });

  return (
    <>
      <fog attach="fog" args={['#0a0b10', 7, 22]} />
      <color attach="background" args={['#08090d']} />

      {/* Ambient warm + cyan rim */}
      <ambientLight intensity={0.42} color="#FFD8B5" />
      <directionalLight position={[5, 8, 5]} intensity={0.7} color="#F97316" />
      <directionalLight position={[-5, 5, -5]} intensity={0.45} color="#22D3EE" />
      <pointLight position={[0, 3.6, 1.5]} intensity={1.4} color="#F97316" distance={10} />
      <pointLight position={[0, 3.6, -1.5]} intensity={1.0} color="#22D3EE" distance={10} />

      {/* Subtle floor grid (reduced contrast vs. before) */}
      <Grid
        position={[0, -1.499, 0]}
        args={[40, 40]}
        cellSize={0.6}
        cellThickness={0.4}
        cellColor="#1f2a36"
        sectionSize={3}
        sectionThickness={0.9}
        sectionColor="#22D3EE"
        fadeDistance={18}
        fadeStrength={1.4}
        followCamera={false}
        infiniteGrid
      />

      {/* Wood-tone stage disc under both chairs */}
      <mesh position={[0, -1.495, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.5, 64]} />
        <meshStandardMaterial color="#2a1a12" metalness={0.15} roughness={0.85} />
      </mesh>

      {/* Inner cyan halo around the stage */}
      <mesh ref={haloRef} position={[0, -1.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.6, 4.2, 96]} />
        <meshBasicMaterial color="#22D3EE" transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>

      {/* Outer warm halo */}
      <mesh position={[0, -1.485, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.6, 5.2, 96]} />
        <meshBasicMaterial color="#F97316" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>

      {/* Back wall slab */}
      <mesh position={[0, 1.5, -4.5]}>
        <boxGeometry args={[14, 6, 0.2]} />
        <meshStandardMaterial color="#0d1018" metalness={0.3} roughness={0.75} />
      </mesh>
      {/* Wall trim - cyan strip */}
      <mesh position={[0, 4.4, -4.39]}>
        <boxGeometry args={[14, 0.06, 0.04]} />
        <meshStandardMaterial color="#22D3EE" emissive="#22D3EE" emissiveIntensity={0.9} />
      </mesh>
      {/* Wall trim - orange strip */}
      <mesh position={[0, -1.4, -4.39]}>
        <boxGeometry args={[14, 0.06, 0.04]} />
        <meshStandardMaterial color="#F97316" emissive="#F97316" emissiveIntensity={0.9} />
      </mesh>

      {/* Center "VS" mural between chairs */}
      <mesh ref={vsRef} position={[0, 1.6, -4.38]}>
        <torusGeometry args={[0.9, 0.06, 16, 64]} />
        <meshStandardMaterial color="#F97316" emissive="#F97316" emissiveIntensity={0.7} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.6, -4.37]}>
        <torusGeometry args={[0.62, 0.04, 16, 64]} />
        <meshStandardMaterial color="#22D3EE" emissive="#22D3EE" emissiveIntensity={0.8} metalness={0.4} roughness={0.4} />
      </mesh>

      {/* Overhead light truss bar */}
      <mesh ref={trussRef} position={[0, 4.2, 0]}>
        <boxGeometry args={[7, 0.12, 0.12]} />
        <meshStandardMaterial color="#F97316" emissive="#F97316" emissiveIntensity={0.55} metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Truss support pillars */}
      <mesh position={[-3.5, 1.3, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 5.8, 12]} />
        <meshStandardMaterial color="#1a1d24" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[3.5, 1.3, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 5.8, 12]} />
        <meshStandardMaterial color="#1a1d24" metalness={0.6} roughness={0.5} />
      </mesh>
    </>
  );
};
