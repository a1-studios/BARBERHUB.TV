/**
 * Rewrite R2 origin URLs to the public CDN (media.barberhub.tv) for reads.
 * Uploads still hit R2 directly. Idempotent + safe for non-R2 URLs.
 */
const CDN_HOST = 'media.barberhub.tv';

const R2_HOST_PATTERNS = [
  /\.r2\.cloudflarestorage\.com$/i, // private S3 endpoint
  /\.r2\.dev$/i,                    // public bucket dev domain
];

export function toCdnUrl(url?: string | null): string | undefined {
  if (!url) return url ?? undefined;
  // Pass through non-http(s)
  if (!/^https?:\/\//i.test(url)) return url;
  try {
    const u = new URL(url);
    if (u.hostname === CDN_HOST) return url;
    if (R2_HOST_PATTERNS.some((rx) => rx.test(u.hostname))) {
      // For the S3-style endpoint the first path segment is the bucket.
      // The CDN is configured to front a single bucket, so drop it.
      if (/\.r2\.cloudflarestorage\.com$/i.test(u.hostname)) {
        const parts = u.pathname.replace(/^\/+/, '').split('/');
        if (parts.length > 1) {
          parts.shift(); // drop bucket
          u.pathname = '/' + parts.join('/');
        }
      }
      u.hostname = CDN_HOST;
      u.protocol = 'https:';
      u.port = '';
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}
