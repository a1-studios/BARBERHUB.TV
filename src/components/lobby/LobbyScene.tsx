import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { ArenaEnvironment } from './ArenaEnvironment';
import { CameraRig } from './CameraRig';
import { ContenderPodium } from './ContenderPodium';

interface LobbySceneProps {
  barber1: { name: string; flag?: string; ready: boolean; present: boolean; isLocal?: boolean };
  barber2: { name: string; flag?: string; ready: boolean; present: boolean; isLocal?: boolean };
  pulse?: number;
  isMobile?: boolean;
  reducedMotion?: boolean;
  localStream?: MediaStream | null;
}

const LobbyScene = ({ barber1, barber2, pulse = 0, isMobile, reducedMotion, localStream }: LobbySceneProps) => {
  // Pull podiums in tighter on mobile so neither is clipped on a 9:16 viewport.
  const podiumX = isMobile ? 1.95 : 2.6;
  const bubbleSize = isMobile ? 84 : 110;

  return (
    <Canvas
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      camera={{
        position: isMobile ? [0, 5.2, 11.5] : [0, 6, 14],
        fov: isMobile ? 55 : 45,
        near: 0.1,
        far: 100,
      }}
      shadows={false}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <ArenaEnvironment pulse={pulse} />
        <CameraRig staticCamera={isMobile || reducedMotion} />
        <ContenderPodium
          position={[-podiumX, 0, 0]}
          side={1}
          name={barber1.name}
          countryFlag={barber1.flag}
          isReady={barber1.ready}
          isPresent={barber1.present}
          isLocal={barber1.isLocal}
          localStream={barber1.isLocal ? localStream : null}
          bubbleSize={bubbleSize}
        />
        <ContenderPodium
          position={[podiumX, 0, 0]}
          side={2}
          name={barber2.name}
          countryFlag={barber2.flag}
          isReady={barber2.ready}
          isPresent={barber2.present}
          isLocal={barber2.isLocal}
          localStream={barber2.isLocal ? localStream : null}
          bubbleSize={bubbleSize}
        />
      </Suspense>
    </Canvas>
  );
};

export default LobbyScene;
