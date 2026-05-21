import { memo, useEffect, useRef, useState, useCallback } from 'react';
import type { VideoComment } from '@/hooks/useVideoComments';
import { cn } from '@/lib/utils';

interface FloatingCommentOverlayProps {
  comments: VideoComment[];
  /** Pause scrolling while video is paused (optional). */
  paused?: boolean;
  className?: string;
}

interface ActiveComment {
  uid: string;          // unique render key (commentId + nonce, in case of replays)
  commentId: string;
  lane: number;
  content: string;
  displayName: string | null;
  avatarUrl: string | null;
  durationMs: number;
}

const LANE_COUNT = 3;
const MIN_DURATION_MS = 7000;
const MAX_DURATION_MS = 12000;

/**
 * Danmaku-style floating comment overlay.
 *
 * Performance contract:
 *  - pointer-events: none on the wrapper
 *  - Movement is pure CSS keyframe (`danmaku-scroll`)
 *  - No requestAnimationFrame / setInterval position polling
 *  - Lane bookkeeping lives in refs to avoid re-renders that would
 *    disturb the video element on the page
 */
function FloatingCommentOverlayImpl({
  comments,
  paused = false,
  className,
}: FloatingCommentOverlayProps) {
  const [active, setActive] = useState<ActiveComment[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const nextLaneRef = useRef(0);
  // Track when each lane will be free again (approx, used only for round-robin
  // skip — never read during render).
  const laneBusyUntilRef = useRef<number[]>(Array(LANE_COUNT).fill(0));

  // Pick the next lane round-robin, preferring the one that has been idle
  // the longest. Pure ref math — does not trigger re-renders.
  const pickLane = useCallback((durationMs: number) => {
    const now = performance.now();
    let bestLane = nextLaneRef.current;
    let earliest = laneBusyUntilRef.current[bestLane];
    for (let i = 1; i < LANE_COUNT; i++) {
      const lane = (nextLaneRef.current + i) % LANE_COUNT;
      if (laneBusyUntilRef.current[lane] < earliest) {
        earliest = laneBusyUntilRef.current[lane];
        bestLane = lane;
      }
    }
    // Stagger so two comments in the same lane don't fully overlap.
    const startBusy = Math.max(now, laneBusyUntilRef.current[bestLane]);
    laneBusyUntilRef.current[bestLane] = startBusy + durationMs * 0.6;
    nextLaneRef.current = (bestLane + 1) % LANE_COUNT;
    return bestLane;
  }, []);

  // When new comments arrive, enqueue them into active lanes once.
  useEffect(() => {
    if (comments.length === 0) return;
    const fresh: ActiveComment[] = [];
    for (const c of comments) {
      if (seenIdsRef.current.has(c.id)) continue;
      seenIdsRef.current.add(c.id);
      const durationMs =
        MIN_DURATION_MS +
        Math.floor(Math.random() * (MAX_DURATION_MS - MIN_DURATION_MS));
      fresh.push({
        uid: `${c.id}-${Date.now()}`,
        commentId: c.id,
        lane: pickLane(durationMs),
        content: c.content,
        displayName: c.display_name,
        avatarUrl: c.avatar_url,
        durationMs,
      });
    }
    if (fresh.length > 0) {
      setActive((prev) => [...prev, ...fresh]);
    }
  }, [comments, pickLane]);

  const handleAnimationEnd = useCallback((uid: string) => {
    setActive((prev) => prev.filter((c) => c.uid !== uid));
  }, []);

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-10 h-1/4 overflow-hidden',
        className,
      )}
      aria-hidden="true"
    >
      {active.map((c) => (
        <DanmakuRow
          key={c.uid}
          item={c}
          paused={paused}
          onEnd={handleAnimationEnd}
        />
      ))}
    </div>
  );
}

interface RowProps {
  item: ActiveComment;
  paused: boolean;
  onEnd: (uid: string) => void;
}

const DanmakuRow = memo(function DanmakuRow({ item, paused, onEnd }: RowProps) {
  // Lane top: evenly distribute within the top quarter (each lane ~33% of overlay).
  const laneTopPct = (item.lane / LANE_COUNT) * 100 + 4; // +4% top padding
  return (
    <div
      className="danmaku-track absolute left-0 whitespace-nowrap"
      style={{
        top: `${laneTopPct}%`,
        animationDuration: `${item.durationMs}ms`,
        animationPlayState: paused ? 'paused' : 'running',
      }}
      onAnimationEnd={(e) => {
        // Strip will-change once the row is done to free GPU resources before unmount.
        (e.currentTarget as HTMLDivElement).style.willChange = 'auto';
        onEnd(item.uid);
      }}
    >
      <div className="flex items-center gap-2 rounded-full bg-black/55 px-3 py-1 backdrop-blur-sm">
        {item.avatarUrl ? (
          <img
            src={item.avatarUrl}
            alt=""
            className="h-5 w-5 rounded-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="h-5 w-5 rounded-full bg-white/15" />
        )}
        {item.displayName && (
          <span className="text-xs font-semibold text-orange-400 drop-shadow">
            {item.displayName}
          </span>
        )}
        <span
          className="text-sm font-medium text-white"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
        >
          {item.content}
        </span>
      </div>
    </div>
  );
});

export const FloatingCommentOverlay = memo(FloatingCommentOverlayImpl);
