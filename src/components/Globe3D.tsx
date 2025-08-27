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

const EarthGlobe = () => {
  const earthRef = useRef<THREE.Mesh>(null);
  const [dots, setDots] = useState<CountryDot[]>([]);

  // Slow rotation animation
  useFrame((state) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.002;
      earthRef.current.rotation.x += 0.001;
    }
  });

  // Generate random country dots
  useEffect(() => {
    const generateDots = () => {
      const newDots: CountryDot[] = [];
      for (let i = 0; i < 12; i++) {
        // Random spherical coordinates
        const phi = Math.acos(-1 + (2 * Math.random()));
        const theta = Math.random() * Math.PI * 2;
        const radius = 2.02; // Slightly above sphere surface
        
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
    const interval = setInterval(generateDots, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <group>
      {/* Earth Sphere */}
      <Sphere ref={earthRef} args={[2, 64, 64]}>
        <meshPhongMaterial
          color="#1a4d3a"
          emissive="#0a1a0f"
          shininess={100}
          transparent
          opacity={0.9}
        />
      </Sphere>

      {/* Country highlighting dots */}
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

      {/* Atmosphere glow */}
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

const Globe3D = () => {
  return (
    <div className="absolute inset-0 w-full h-full opacity-30">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#FF6B00" />
        
        <EarthGlobe />
        
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI}
          minPolarAngle={0}
        />
      </Canvas>
    </div>
  );
};

export default Globe3D;