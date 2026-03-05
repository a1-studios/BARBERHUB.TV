import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere } from "@react-three/drei";
import * as THREE from "three";

interface CountryDot {
  id: number;
  position: [number, number, number];
  opacity: number;
  scale: number;
  color: string;
}

interface EarthGlobeProps {
  rotationSpeed?: number;
  dotCount?: number;
}

const EarthGlobe = ({ rotationSpeed = 1, dotCount = 12 }: EarthGlobeProps) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [dots, setDots] = useState<CountryDot[]>([]);

  useFrame((state) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.002 * rotationSpeed;
      earthRef.current.rotation.x += 0.001 * rotationSpeed;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.003 * rotationSpeed;
      // Pulsing emissive
      const mat = ringRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  useEffect(() => {
    const generateDots = () => {
      const newDots: CountryDot[] = [];
      for (let i = 0; i < dotCount; i++) {
        const phi = Math.acos(-1 + (2 * Math.random()));
        const theta = Math.random() * Math.PI * 2;
        const radius = 2.02;
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        
        newDots.push({
          id: i,
          position: [x, y, z],
          opacity: Math.random() * 0.8 + 0.2,
          scale: Math.random() * 0.5 + 0.5,
          color: i % 3 === 0 ? "#FF6B00" : i % 3 === 1 ? "#00C853" : "#FFFFFF"
        });
      }
      setDots(newDots);
    };

    generateDots();
    const regenTime = rotationSpeed > 1 ? 2500 : 4000;
    const interval = setInterval(generateDots, regenTime);
    return () => clearInterval(interval);
  }, [dotCount, rotationSpeed]);

  return (
    <group>
      <Sphere ref={earthRef} args={[2, 64, 64]}>
        <meshPhongMaterial
          color="#1a4d3a"
          emissive="#0a1a0f"
          shininess={100}
          transparent
          opacity={0.9}
        />
      </Sphere>

      {dots.map((dot) => (
        <Sphere key={dot.id} position={dot.position} args={[0.05 * dot.scale, 16, 16]}>
          <meshStandardMaterial
            color={dot.color}
            transparent
            opacity={dot.opacity}
            emissive={dot.color}
            emissiveIntensity={0.3}
          />
        </Sphere>
      ))}

      {/* Pulsing energy ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.3, 0.02, 16, 100]} />
        <meshStandardMaterial
          color="#FF6B00"
          emissive="#FF6B00"
          emissiveIntensity={0.4}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Cyan inner ring */}
      <mesh rotation={[Math.PI / 2.5, 0.3, 0]}>
        <torusGeometry args={[2.15, 0.015, 16, 100]} />
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#00d4ff"
          emissiveIntensity={0.3}
          transparent
          opacity={0.5}
        />
      </mesh>

      <Sphere args={[2.1, 64, 64]}>
        <meshBasicMaterial
          color="#4a90e2"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
};

interface Globe3DProps {
  rotationSpeed?: number;
  dotCount?: number;
  opacity?: number;
}

const Globe3D = ({ rotationSpeed = 1, dotCount = 12, opacity = 0.3 }: Globe3DProps) => {
  return (
    <div className="absolute inset-0 w-full h-full" style={{ opacity }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#FF6B00" />
        
        <EarthGlobe rotationSpeed={rotationSpeed} dotCount={dotCount} />
        
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5 * rotationSpeed}
          maxPolarAngle={Math.PI}
          minPolarAngle={0}
        />
      </Canvas>
    </div>
  );
};

export default Globe3D;
