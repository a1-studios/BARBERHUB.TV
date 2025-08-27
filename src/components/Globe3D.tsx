import { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere, Instances, Instance } from "@react-three/drei";
import * as THREE from "three";

interface TacticalDot {
  id: number;
  position: [number, number, number];
  intensity: number;
  pulseSpeed: number;
  isHighlighted: boolean;
  highlightTime: number;
}

const TacticalDotField = ({ dots }: { dots: TacticalDot[] }) => {
  const instancesRef = useRef<THREE.InstancedMesh>(null);
  const highlightRef = useRef<THREE.InstancedMesh>(null);
  
  useFrame((state) => {
    if (!instancesRef.current || !highlightRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    dots.forEach((dot, i) => {
      // Base dot pulsing
      const pulse = Math.sin(time * dot.pulseSpeed) * 0.3 + 0.7;
      const scale = dot.intensity * pulse * 0.8;
      
      const matrix = new THREE.Matrix4();
      matrix.setPosition(...dot.position);
      matrix.scale(new THREE.Vector3(scale, scale, scale));
      instancesRef.current?.setMatrixAt(i, matrix);
      
      // Highlighted dots with expanding rings
      if (dot.isHighlighted) {
        const highlightPulse = Math.sin(time * 4) * 0.5 + 0.5;
        const ringScale = (1 + highlightPulse * 2) * scale;
        
        const highlightMatrix = new THREE.Matrix4();
        highlightMatrix.setPosition(...dot.position);
        highlightMatrix.scale(new THREE.Vector3(ringScale, ringScale, ringScale));
        highlightRef.current?.setMatrixAt(i, highlightMatrix);
      } else {
        const emptyMatrix = new THREE.Matrix4();
        emptyMatrix.scale(new THREE.Vector3(0, 0, 0));
        highlightRef.current?.setMatrixAt(i, emptyMatrix);
      }
    });
    
    instancesRef.current.instanceMatrix.needsUpdate = true;
    highlightRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {/* Base tactical dots */}
      <Instances limit={dots.length} ref={instancesRef}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={0.4}
          transparent
          opacity={0.8}
        />
        {dots.map((_, i) => (
          <Instance key={i} />
        ))}
      </Instances>
      
      {/* Highlight rings */}
      <Instances limit={dots.length} ref={highlightRef}>
        <ringGeometry args={[0.05, 0.15, 16]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
        {dots.map((_, i) => (
          <Instance key={i} />
        ))}
      </Instances>
    </>
  );
};

const EarthGlobe = () => {
  const earthRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [dots, setDots] = useState<TacticalDot[]>([]);
  const [highlightedDot, setHighlightedDot] = useState<number | null>(null);
  const { mouse } = useThree();
  
  // Generate persistent tactical dot field
  const tacticalDots = useMemo(() => {
    const newDots: TacticalDot[] = [];
    for (let i = 0; i < 24; i++) {
      const phi = Math.acos(-1 + (2 * Math.random()));
      const theta = Math.random() * Math.PI * 2;
      const radius = 2.08;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      
      newDots.push({
        id: i,
        position: [x, y, z],
        intensity: Math.random() * 0.8 + 0.4,
        pulseSpeed: Math.random() * 2 + 1,
        isHighlighted: false,
        highlightTime: 0,
      });
    }
    return newDots;
  }, []);

  // Update dots with highlighting
  useEffect(() => {
    const updateDots = () => {
      const updatedDots = tacticalDots.map((dot, index) => ({
        ...dot,
        isHighlighted: index === highlightedDot,
      }));
      setDots(updatedDots);
    };
    updateDots();
  }, [tacticalDots, highlightedDot]);

  // Random spotlight highlighting
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.3) {
        const randomIndex = Math.floor(Math.random() * tacticalDots.length);
        setHighlightedDot(randomIndex);
        
        setTimeout(() => {
          setHighlightedDot(null);
        }, 2000 + Math.random() * 3000);
      }
    }, 1500 + Math.random() * 2000);
    
    return () => clearInterval(interval);
  }, [tacticalDots.length]);

  // Enhanced rotation with mouse interaction
  useFrame((state) => {
    if (earthRef.current && groupRef.current) {
      // Base slow rotation
      earthRef.current.rotation.y += 0.003;
      earthRef.current.rotation.x += 0.001;
      
      // Subtle mouse interaction
      const mouseInfluence = 0.1;
      groupRef.current.rotation.y += (mouse.x * mouseInfluence - groupRef.current.rotation.y) * 0.02;
      groupRef.current.rotation.x += (mouse.y * mouseInfluence - groupRef.current.rotation.x) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Enhanced Earth with tactical styling */}
      <Sphere ref={earthRef} args={[2, 64, 64]}>
        <meshPhongMaterial
          color="#0a2818"
          emissive="#061a0f"
          shininess={200}
          transparent
          opacity={0.85}
        />
      </Sphere>

      {/* Tactical dot field */}
      <TacticalDotField dots={dots} />

      {/* Enhanced atmosphere with neon glow */}
      <Sphere args={[2.15, 64, 64]}>
        <meshBasicMaterial
          color="#00ff88"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </Sphere>
      
      {/* Outer tactical glow */}
      <Sphere args={[2.25, 32, 32]}>
        <meshBasicMaterial
          color="#004422"
          transparent
          opacity={0.05}
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