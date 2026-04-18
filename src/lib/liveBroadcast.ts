export const LIVE_BROADCAST_HEARTBEAT_MS = 10000;
export const LIVE_BROADCAST_STALE_MS = 15000;

export const getLiveReferenceTime = (
  lastLiveCheck?: string | null,
  updatedAt?: string | null,
) => lastLiveCheck ?? updatedAt ?? null;

export const isFreshLiveBroadcast = (
  lastLiveCheck?: string | null,
  updatedAt?: string | null,
  now = Date.now(),
) => {
  const referenceTime = getLiveReferenceTime(lastLiveCheck, updatedAt);

  if (!referenceTime) return false;

  return now - new Date(referenceTime).getTime() <= LIVE_BROADCAST_STALE_MS;
};