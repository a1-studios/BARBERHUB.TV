
export function getDeviceFingerprint(): string {
  const raw = [
    navigator.userAgent,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ].join('|');

  // Simple hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) + raw.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'vfp_' + Math.abs(hash).toString(36);
}
