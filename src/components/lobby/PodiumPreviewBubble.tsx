import { useEffect, useRef } from 'react';

interface PodiumPreviewBubbleProps {
  stream: MediaStream | null;
  side: 1 | 2;
  isReady: boolean;
  isPresent: boolean;
  fallbackInitial: string;
  flag?: string;
  size?: number;
}

/**
 * Circular live-preview bust that floats on top of a contender's podium.
 * - Renders the local contender's MediaStream when supplied (mirrored).
 * - Falls back to a stylized initial + flag avatar when no stream is available
 *   (i.e. opponent slot, since real video transport stays in LiveKit).
 */
export const PodiumPreviewBubble = ({
  stream,
  side,
  isReady,
  isPresent,
  fallbackInitial,
  flag,
  size = 96,
}: PodiumPreviewBubbleProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (stream && v.srcObject !== stream) {
      v.srcObject = stream;
      v.play().catch(() => {});
    }
    if (!stream && v.srcObject) {
      v.srcObject = null;
    }
  }, [stream]);

  const ringColor = isReady
    ? 'ring-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.85)]'
    : side === 1
      ? 'ring-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.55)]'
      : 'ring-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.55)]';

  const dim = `${size}px`;

  return (
    <div
      className={`relative flex items-center justify-center rounded-full bg-black ring-[3px] ${ringColor} transition-shadow`}
      style={{ width: dim, height: dim }}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full rounded-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center rounded-full text-2xl font-black ${
            isPresent
              ? side === 1
                ? 'bg-gradient-to-br from-orange-500/40 to-orange-700/40 text-orange-100'
                : 'bg-gradient-to-br from-cyan-500/40 to-cyan-700/40 text-cyan-100'
              : 'bg-white/5 text-white/40'
          }`}
        >
          {fallbackInitial?.toUpperCase() || '?'}
        </div>
      )}

      {flag && (
        <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-black bg-black/80 px-1 text-xs leading-none">
          <span className="leading-none">{flag}</span>
        </div>
      )}

      {isReady && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-cyan-400 px-1.5 py-[1px] text-[8px] font-black tracking-widest text-black">
          READY
        </div>
      )}
    </div>
  );
};
