import { supabase } from '@/integrations/supabase/client';

/**
 * Upload a battle video to Cloudflare R2 via presigned URL.
 * Path: battles/{battleId}/{uuid}.{ext}
 */
export async function uploadBattleVideo(
  file: File,
  battleId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const ext = file.name.split('.').pop() || 'mp4';
  const key = `battles/${battleId}/${crypto.randomUUID()}.${ext}`;
  return uploadToR2(file, key, file.type || 'video/mp4', onProgress);
}

/**
 * Upload a generic image to R2.
 * Path: {path}/{uuid}.{ext}
 */
export async function uploadBattleImage(file: File, path: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const key = `${path}/${crypto.randomUUID()}.${ext}`;
  return uploadToR2(file, key, file.type || 'image/jpeg');
}

/**
 * Upload a portfolio image to R2.
 * Path: portfolios/{userId}/{uuid}.{ext}
 */
export async function uploadPortfolioImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const key = `portfolios/${userId}/${crypto.randomUUID()}.${ext}`;
  return uploadToR2(file, key, file.type || 'image/jpeg');
}

/**
 * Upload education content to R2.
 * Path: education/{creatorId}/{uuid}.{ext}
 */
export async function uploadEducationContent(file: File, creatorId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'mp4';
  const key = `education/${creatorId}/${crypto.randomUUID()}.${ext}`;
  return uploadToR2(file, key, file.type || 'video/mp4');
}

/**
 * Core R2 upload via presigned URL.
 */
async function uploadToR2(
  file: File,
  key: string,
  contentType: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-r2-presigned-url', {
    body: { key, contentType },
  });

  if (error || !data?.uploadUrl) {
    throw new Error(error?.message || data?.error || 'Failed to get upload URL');
  }

  const uploadRes = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
  }

  onProgress?.(100);
  return data.publicUrl as string;
}
