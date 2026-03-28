import { supabase } from '@/integrations/supabase/client';

/**
 * Upload a battle video to Cloudflare R2 via presigned URL.
 * 1. Gets a presigned PUT URL from the edge function.
 * 2. PUTs the file directly to R2.
 * 3. Returns the public object URL.
 */
export async function uploadBattleVideo(
  file: File,
  battleId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const ext = file.name.split('.').pop() || 'mp4';
  const key = `battles/${battleId}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.functions.invoke('get-r2-presigned-url', {
    body: { key, contentType: file.type || 'video/mp4' },
  });

  if (error || !data?.uploadUrl) {
    throw new Error(error?.message || data?.error || 'Failed to get upload URL');
  }

  // PUT directly to R2
  const uploadRes = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'video/mp4' },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
  }

  onProgress?.(100);
  return data.publicUrl as string;
}

/**
 * Upload a generic image to R2.
 */
export async function uploadBattleImage(file: File, path: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const key = `${path}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.functions.invoke('get-r2-presigned-url', {
    body: { key, contentType: file.type || 'image/jpeg' },
  });

  if (error || !data?.uploadUrl) {
    throw new Error(error?.message || data?.error || 'Failed to get upload URL');
  }

  const uploadRes = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'image/jpeg' },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${uploadRes.status}`);
  }

  return data.publicUrl as string;
}
