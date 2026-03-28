import { supabase } from '@/integrations/supabase/client';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB strict minimum for S3 multipart
const MAX_CONCURRENCY = 4;
const MAX_RETRIES = 3;
const BATCH_SIZE = 10;

export type UploadStatus = 'idle' | 'uploading' | 'paused' | 'completing' | 'done' | 'error' | 'cancelled';

export interface UploadProgress {
  status: UploadStatus;
  completedChunks: number;
  totalChunks: number;
  percentage: number;
  bytesUploaded: number;
  totalBytes: number;
  speed: number; // bytes per second
  error?: string;
}

export interface UploadController {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  promise: Promise<string>;
}

/**
 * Enterprise multipart upload to Cloudflare R2 via presigned URLs.
 * Supports files up to 5GB with pause/resume/cancel and per-chunk retry.
 */
export function multipartUploadToR2(
  file: File,
  battleId: string,
  onProgress?: (progress: UploadProgress) => void,
  options?: { title?: string; description?: string; category?: R2Category }
): UploadController {
  let isPaused = false;
  let isCancelled = false;
  let abortController = new AbortController();
  let uploadId = '';
  let key = '';
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const completedParts: { partNumber: number; etag: string }[] = [];
  const startTime = Date.now();

  const reportProgress = (status: UploadStatus, error?: string) => {
    const bytesUploaded = completedParts.length * CHUNK_SIZE;
    const elapsed = (Date.now() - startTime) / 1000;
    onProgress?.({
      status,
      completedChunks: completedParts.length,
      totalChunks,
      percentage: Math.round((completedParts.length / totalChunks) * 100),
      bytesUploaded: Math.min(bytesUploaded, file.size),
      totalBytes: file.size,
      speed: elapsed > 0 ? bytesUploaded / elapsed : 0,
      error,
    });
  };

  let resolveWaitForResume: (() => void) | null = null;

  const waitForResume = (): Promise<void> => {
    if (!isPaused) return Promise.resolve();
    return new Promise((resolve) => { resolveWaitForResume = resolve; });
  };

  const uploadChunk = async (
    partNumber: number,
    presignedUrl: string,
  ): Promise<{ partNumber: number; etag: string }> => {
    const start = (partNumber - 1) * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (isCancelled) throw new Error('Upload cancelled');
      await waitForResume();

      try {
        const res = await fetch(presignedUrl, {
          method: 'PUT',
          body: chunk,
          signal: abortController.signal,
        });

        if (!res.ok) {
          const bodyText = await res.text().catch(() => '(unreadable)');
          console.error(`[R2-UPLOAD] Chunk ${partNumber} HTTP ${res.status}`, {
            statusText: res.statusText,
            headers: Object.fromEntries(res.headers.entries()),
            body: bodyText.slice(0, 500),
          });
          throw new Error(`Chunk ${partNumber} failed: ${res.status} ${res.statusText}`);
        }

        const etag = res.headers.get('ETag');
        if (!etag) {
          console.error(`[R2-UPLOAD] Chunk ${partNumber} missing ETag header!`, {
            headers: Object.fromEntries(res.headers.entries()),
            hint: 'R2 CORS policy must include ExposeHeaders: ["ETag"]. Update your Cloudflare R2 bucket CORS settings.',
          });
          throw new Error(`Chunk ${partNumber}: ETag header missing — CORS ExposeHeaders misconfigured on R2`);
        }

        return { partNumber, etag: etag.replace(/"/g, '') };
      } catch (err: any) {
        if (isCancelled || err.name === 'AbortError') throw new Error('Upload cancelled');
        console.error(`[R2-UPLOAD] Chunk ${partNumber} attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`, err.message);
        if (attempt === MAX_RETRIES) throw err;
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
    throw new Error(`Failed after ${MAX_RETRIES} retries`);
  };

  const run = async (): Promise<string> => {
    try {
      // Step 1: Initiate multipart upload
      reportProgress('uploading');
      const { data: initData, error: initError } = await supabase.functions.invoke(
        'initiate-multipart-upload',
        { body: { filename: file.name, contentType: file.type || 'video/mp4', battleId, category: options?.category || 'recordings' } }
      );
      if (initError || !initData?.uploadId) {
        throw new Error(initData?.error || initError?.message || 'Failed to initiate upload');
      }
      uploadId = initData.uploadId;
      key = initData.key;

      // Step 2: Upload chunks in batches with concurrency pool
      const pendingParts = Array.from({ length: totalChunks }, (_, i) => i + 1);

      while (pendingParts.length > 0) {
        if (isCancelled) throw new Error('Upload cancelled');
        await waitForResume();

        // Request presigned URLs for next batch
        const batchParts = pendingParts.splice(0, BATCH_SIZE);
        const { data: presignData, error: presignError } = await supabase.functions.invoke(
          'presign-upload-part',
          { body: { key, uploadId, partNumbers: batchParts } }
        );
        if (presignError || !presignData?.presignedUrls) {
          throw new Error(presignData?.error || presignError?.message || 'Failed to get presigned URLs');
        }

        const urlMap = new Map<number, string>();
        for (const item of presignData.presignedUrls) {
          urlMap.set(item.partNumber, item.presignedUrl);
        }

        // Upload batch with concurrency pool
        const queue = [...batchParts];
        const inFlight: Promise<void>[] = [];

        const processNext = async () => {
          while (queue.length > 0) {
            if (isCancelled) return;
            await waitForResume();

            const partNum = queue.shift()!;
            const url = urlMap.get(partNum)!;
            const result = await uploadChunk(partNum, url);
            completedParts.push(result);
            reportProgress('uploading');
          }
        };

        for (let i = 0; i < Math.min(MAX_CONCURRENCY, queue.length); i++) {
          inFlight.push(processNext());
        }

        await Promise.all(inFlight);
      }

      if (isCancelled) throw new Error('Upload cancelled');

      // Step 3: Complete multipart upload
      reportProgress('completing');
      completedParts.sort((a, b) => a.partNumber - b.partNumber);

      const { data: completeData, error: completeError } = await supabase.functions.invoke(
        'complete-multipart-upload',
        {
          body: {
            key,
            uploadId,
            parts: completedParts,
            battleId,
            title: options?.title,
            description: options?.description,
          },
        }
      );

      if (completeError || !completeData?.success) {
        throw new Error(completeData?.error || completeError?.message || 'Failed to complete upload');
      }

      reportProgress('done');
      return completeData.url;
    } catch (err: any) {
      if (isCancelled) {
        reportProgress('cancelled');
        // Cleanup orphaned R2 parts
        if (uploadId && key) {
          supabase.functions.invoke('abort-multipart-upload', {
            body: { key, uploadId },
          }).catch(() => {}); // fire and forget
        }
        throw err;
      }
      reportProgress('error', err.message);
      throw err;
    }
  };

  const promise = run();

  return {
    pause: () => {
      isPaused = true;
      reportProgress('paused');
    },
    resume: () => {
      isPaused = false;
      if (resolveWaitForResume) {
        resolveWaitForResume();
        resolveWaitForResume = null;
      }
      reportProgress('uploading');
    },
    cancel: () => {
      isCancelled = true;
      abortController.abort();
      abortController = new AbortController();
    },
    promise,
  };
}

// ============ Category-aware R2 upload helpers ============

export type R2Category = 'recordings' | 'portfolios' | 'education';

/**
 * Upload any file to R2 via presigned URL (single PUT, for files < 50MB).
 * Returns the public URL.
 */
async function uploadToR2(
  file: File,
  key: string,
  contentType: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  console.log('[R2-SINGLE-PUT] Requesting presigned URL', { key, contentType, fileSize: file.size });

  const { data, error } = await supabase.functions.invoke('get-r2-presigned-url', {
    body: { key, contentType },
  });

  if (error || !data?.uploadUrl) {
    console.error('[R2-SINGLE-PUT] Presigned URL request failed', { error, data });
    throw new Error(error?.message || data?.error || 'Failed to get upload URL');
  }

  console.log('[R2-SINGLE-PUT] Got presigned URL', {
    uploadUrlDomain: new URL(data.uploadUrl).hostname,
    publicUrl: data.publicUrl,
    contentType,
  });

  try {
    const uploadRes = await fetch(data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });

    if (!uploadRes.ok) {
      const bodyText = await uploadRes.text().catch(() => '(unreadable)');
      console.error(`[R2-SINGLE-PUT] HTTP ${uploadRes.status}`, {
        statusText: uploadRes.statusText,
        headers: Object.fromEntries(uploadRes.headers.entries()),
        body: bodyText.slice(0, 500),
        contentType,
        key,
      });
      throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText} — ${bodyText.slice(0, 200)}`);
    }

    const etag = uploadRes.headers.get('ETag');
    console.log('[R2-SINGLE-PUT] Success', {
      status: uploadRes.status,
      etag,
      headers: Object.fromEntries(uploadRes.headers.entries()),
    });

    onProgress?.(100);
    return data.publicUrl as string;
  } catch (err: any) {
    if (err.name === 'TypeError') {
      console.error('[R2-SINGLE-PUT] Network/CORS error (TypeError)', {
        message: err.message,
        hint: 'This usually means CORS is blocking the PUT request or the presigned URL domain is unreachable.',
        contentType,
        key,
      });
    }
    throw err;
  }
}

/**
 * Smart upload: uses single PUT for small files, multipart for large files.
 * Works for any R2 category (recordings, portfolios, education).
 */
export async function uploadFileToR2(
  file: File,
  category: R2Category,
  userId: string,
  onProgress?: (pct: number) => void,
  options?: { battleId?: string; title?: string; description?: string }
): Promise<string> {
  const ext = file.name.split('.').pop() || 'mp4';
  const timestamp = Date.now();
  const key = category === 'recordings'
    ? `${category}/${options?.battleId || 'general'}/${userId}-${timestamp}.${ext}`
    : `${category}/${userId}/${timestamp}.${ext}`;

  const contentType = file.type || 'application/octet-stream';
  console.log('[R2-UPLOAD] uploadFileToR2 called', { category, key, contentType, fileSize: file.size, userId });

  const MULTIPART_THRESHOLD = 50 * 1024 * 1024; // 50MB

  if (file.size >= MULTIPART_THRESHOLD) {
    const battleIdForMultipart = category === 'recordings'
      ? (options?.battleId || 'general')
      : undefined;

    const controller = multipartUploadToR2(
      file,
      battleIdForMultipart || '',
      (progress) => onProgress?.(progress.percentage),
      { title: options?.title, description: options?.description, category }
    );
    return controller.promise;
  }

  return uploadToR2(file, key, contentType, onProgress);
}

// ============ Convenience wrappers ============

export async function uploadBattleVideo(
  file: File,
  battleId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  return uploadFileToR2(file, 'recordings', 'system', onProgress, { battleId });
}

export async function uploadPortfolioMedia(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  return uploadFileToR2(file, 'portfolios', userId, onProgress);
}

export async function uploadEducationContent(
  file: File,
  creatorId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  return uploadFileToR2(file, 'education', creatorId, onProgress);
}

export async function uploadBattleImage(file: File, path: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const key = `${path}/${crypto.randomUUID()}.${ext}`;
  return uploadToR2(file, key, file.type || 'image/jpeg');
}

export async function uploadPortfolioImage(file: File, userId: string): Promise<string> {
  return uploadPortfolioMedia(file, userId);
}
