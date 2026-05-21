import { FloatingCommentOverlay } from './FloatingCommentOverlay';
import { CommentInputBar } from './CommentInputBar';
import { useVideoComments } from '@/hooks/useVideoComments';

interface VideoCommentsLayerProps {
  videoId: string;
  focusTrigger?: number; // increments to request input focus
}

/**
 * Mounts the realtime comment hook + Danmaku overlay + input bar.
 * Rendered ONLY for the currently active video to keep the realtime
 * subscription and animation cost scoped to one item at a time.
 */
export function VideoCommentsLayer({ videoId, focusTrigger }: VideoCommentsLayerProps) {
  const { comments, submitComment, searchUsers, submitting } =
    useVideoComments(videoId);

  return (
    <>
      <FloatingCommentOverlay comments={comments} />
      <CommentInputBar
        onSubmit={submitComment}
        searchUsers={searchUsers}
        submitting={submitting}
        focusTrigger={focusTrigger}
      />
    </>
  );
}

/**
 * Extracts the underlying UUID from a WatchFeed item id (e.g.
 * `creation-<uuid>`, `profile-<uuid>`, `submission-<uuid>`, or a bare uuid).
 * Returns null when no valid uuid can be parsed.
 */
const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function extractVideoUuid(
  feedItemId: string | undefined,
  contentId?: string | null,
): string | null {
  if (contentId && UUID_RE.test(contentId)) return contentId.match(UUID_RE)![0];
  if (!feedItemId) return null;
  const m = feedItemId.match(UUID_RE);
  return m ? m[0] : null;
}
