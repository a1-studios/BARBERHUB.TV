import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Line } from "@react-three/drei";
import * as THREE from "three";

interface NetworkNode {
  id: number;
  position: [number, number, number];
  opacity: number;
  scale: number;
  connectionOpacity: number;
}

const DigitalGroveScene = () => {
  const groupRef = useRef<THREE.Group>(null);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [connections, setConnections] = useState<Array<{start: [number, number, number], end: [number, number, number]}>>([]);
  
  // Random rotation animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.003 + Math.sin(state.clock.elapsedTime * 0.1) * 0.001;
      groupRef.current.rotation.x += 0.001 + Math.cos(state.clock.elapsedTime * 0.15) * 0.0005;
      groupRef.current.rotation.z += 0.002 + Math.sin(state.clock.elapsedTime * 0.08) * 0.0008;
    }
  });

  // Generate digital grove network
  useEffect(() => {
    const generateNetwork = () => {
      const newNodes: NetworkNode[] = [];
      const newConnections: Array<{start: [number, number, number], end: [number, number, number]}> = [];
      
      // Create nodes around a sphere
      for (let i = 0; i < 18; i++) {
        const phi = Math.acos(-1 + (2 * Math.random()));
        const theta = Math.random() * Math.PI * 2;
        const radius = 2.5 + Math.random() * 1.5;
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        
        newNodes.push({
          id: i,
          position: [x, y, z],
          opacity: Math.random() * 0.6 + 0.4,
          scale: Math.random() * 0.8 + 0.3,
          connectionOpacity: Math.random() * 0.4 + 0.1
        });
      }
      
      // Create connections between nearby nodes
      for (let i = 0; i < newNodes.length; i++) {
        for (let j = i + 1; j < newNodes.length; j++) {
          const distance = Math.sqrt(
            Math.pow(newNodes[i].position[0] - newNodes[j].position[0], 2) +
            Math.pow(newNodes[i].position[1] - newNodes[j].position[1], 2) +
            Math.pow(newNodes[i].position[2] - newNodes[j].position[2], 2)
          );
          
          if (distance < 3 && Math.random() > 0.7) {
            newConnections.push({
              start: newNodes[i].position,
              end: newNodes[j].position
            });
          }
        }
      }
      
      setNodes(newNodes);
      setConnections(newConnections);
    };

    generateNetwork();
    const interval = setInterval(generateNetwork, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <group ref={groupRef}>
      {/* Central Grove/Earth */}
      <Sphere args={[1.8, 32, 32]}>
        <meshPhongMaterial
          color="#8B4513"
          emissive="#FF6B00"
          emissiveIntensity={0.2}
          shininess={30}
          transparent
          opacity={0.8}
        />
      </Sphere>

      {/* Digital Grid overlay on grove */}
      <Sphere args={[1.85, 16, 16]}>
        <meshBasicMaterial
          color="#FF6B00"
          transparent
          opacity={0.15}
          wireframe={true}
        />
      </Sphere>

      {/* Network nodes */}
      {nodes.map((node) => (
        <Sphere key={node.id} position={node.position} args={[0.08 * node.scale, 8, 8]}>
          <meshStandardMaterial
            color="#FFFFFF"
            transparent
            opacity={node.opacity}
            emissive="#FF6B00"
            emissiveIntensity={0.4}
          />
        </Sphere>
      ))}

      {/* Network connections */}
      {connections.map((connection, index) => {
        const points = [
          new THREE.Vector3(...connection.start),
          new THREE.Vector3(...connection.end)
        ];
        
        return (
          <Line
            key={index}
            points={points}
            color="#FF6B00"
            transparent
            opacity={0.3}
            lineWidth={1}
          />
        );
      })}

      {/* Outer glow atmosphere */}
      <Sphere args={[4.2, 32, 32]}>
        <meshBasicMaterial
          color="#FF6B00"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Floating data particles */}
      {Array.from({ length: 25 }, (_, i) => {
        const radius = 3.5 + Math.random() * 2;
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        const x = radius * Math.sin(theta) * Math.cos(phi);
        const y = radius * Math.sin(theta) * Math.sin(phi);
        const z = radius * Math.cos(theta);
        
        return (
          <Sphere key={`particle-${i}`} position={[x, y, z]} args={[0.02, 4, 4]}>
            <meshBasicMaterial
              color="#FFFFFF"
              transparent
              opacity={Math.random() * 0.6 + 0.2}
            />
          </Sphere>
        );
      })}
    </group>
  );
};

const DigitalGrove3D = () => {
  return (
    <div className="absolute inset-0 w-full h-full opacity-20">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.8} color="#FF6B00" />
        <pointLight position={[-10, -10, -10]} intensity={0.4} color="#FFFFFF" />
        <pointLight position={[0, 10, -10]} intensity={0.6} color="#FF8C00" />
        
        <DigitalGroveScene />
        
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.3}
          maxPolarAngle={Math.PI}
          minPolarAngle={0}
        />
      </Canvas>
    </div>
  );
};

export default DigitalGrove3D;