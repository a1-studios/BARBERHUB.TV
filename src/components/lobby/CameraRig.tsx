import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraRigProps {
  staticCamera?: boolean;
}

export const CameraRig = ({ staticCamera = false }: CameraRigProps) => {
  const { camera, gl } = useThree();
  const target = useRef(new THREE.Vector3(0, 0.5, 0));
  const mouse = useRef({ x: 0, y: 0 });
  const dolly = useRef(0);

  useEffect(() => {
    camera.position.set(0, 6, 14);
    dolly.current = 0;
  }, [camera]);

  useEffect(() => {
    if (staticCamera) return;
    const handle = (e: MouseEvent) => {
      const w = gl.domElement.clientWidth;
      const h = gl.domElement.clientHeight;
      mouse.current.x = (e.clientX / w) * 2 - 1;
      mouse.current.y = (e.clientY / h) * 2 - 1;
    };
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, [gl, staticCamera]);

  useFrame((_s, delta) => {
    if (dolly.current < 1) {
      dolly.current = Math.min(1, dolly.current + delta * 0.7);
      camera.position.lerp(new THREE.Vector3(0, 2.2, 8.5), 0.08);
    }
    if (!staticCamera) {
      target.current.x += (mouse.current.x * 0.6 - target.current.x) * 0.05;
      target.current.y += (-mouse.current.y * 0.3 + 0.5 - target.current.y) * 0.05;
    }
    camera.lookAt(target.current);
  });

  return null;
};
