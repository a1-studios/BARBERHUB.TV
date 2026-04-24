import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Grid } from '@react-three/drei';
import * as THREE from 'three';

interface ArenaEnvironmentProps {
  pulse?: number;
}

export const ArenaEnvironment = ({ pulse = 0 }: ArenaEnvironmentProps) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame((_state, delta) => {
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.06;
    if (haloRef.current) {
      const target = 0.18 + pulse * 0.5;
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity += (target - mat.opacity) * 0.08;
    }
  });

  return (
    <>
      <fog attach="fog" args={['#05060A', 8, 28]} />
      <color attach="background" args={['#05060A']} />

      <ambientLight intensity={0.3} color="#22D3EE" />
      <directionalLight position={[5, 8, 5]} intensity={0.6} color="#F97316" />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} color="#22D3EE" />
      <pointLight position={[0, 4, 0]} intensity={1.2} color="#F97316" distance={12} />

      <Stars radius={50} depth={30} count={1500} factor={3} saturation={0} fade speed={0.5} />

      <Grid
        position={[0, -1.5, 0]}
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#22D3EE"
        sectionSize={3}
        sectionThickness={1.2}
        sectionColor="#22D3EE"
        fadeDistance={22}
        fadeStrength={1.2}
        followCamera={false}
        infiniteGrid
      />

      <mesh ref={haloRef} position={[0, -1.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 3.2, 64]} />
        <meshBasicMaterial color="#22D3EE" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>

      {/* Overhead jumbotron-style rings */}
      <mesh ref={ringRef} position={[0, 4.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5, 0.06, 16, 80]} />
        <meshStandardMaterial color="#F97316" emissive="#F97316" emissiveIntensity={0.6} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 4.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.2, 0.03, 16, 80]} />
        <meshStandardMaterial color="#22D3EE" emissive="#22D3EE" emissiveIntensity={0.8} metalness={0.6} roughness={0.4} />
      </mesh>
    </>
  );
};
