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
  options?: { title?: string; description?: string }
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

        if (!res.ok) throw new Error(`Chunk ${partNumber} failed: ${res.status}`);

        const etag = res.headers.get('ETag') || `"${partNumber}"`;
        return { partNumber, etag: etag.replace(/"/g, '') };
      } catch (err: any) {
        if (isCancelled || err.name === 'AbortError') throw new Error('Upload cancelled');
        if (attempt === MAX_RETRIES) throw err;
        // Exponential backoff
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
        { body: { filename: file.name, contentType: file.type || 'video/mp4', battleId } }
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

  const MULTIPART_THRESHOLD = 50 * 1024 * 1024; // 50MB

  if (file.size >= MULTIPART_THRESHOLD) {
    const battleId = category === 'recordings'
      ? (options?.battleId || `${category}-${userId}`)
      : `${category}-${userId}`;

    const controller = multipartUploadToR2(
      file,
      battleId,
      (progress) => onProgress?.(progress.percentage),
      { title: options?.title, description: options?.description }
    );
    return controller.promise;
  }

  return uploadToR2(file, key, file.type || 'application/octet-stream', onProgress);
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
