import { supabase } from '@/integrations/supabase/client';

/**
 * Chunked / multipart upload to Cloudflare R2 via Supabase Edge Functions.
 * Uses initiate-multipart-upload → presign-upload-part → PUT parts → complete-multipart-upload.
 *
 * Falls back to a single presigned PUT for small files (< partSize) since the
 * multipart overhead isn't worth it.
 */
export interface MultipartUploadOptions {
  /** 'portfolios' | 'education' | 'recordings' | etc. — controls the R2 key prefix in initiate-multipart-upload. */
  category?: string;
  /** Optional battle id when uploading a battle submission. */
  battleId?: string;
  /** Chunk size in bytes. Defaults to 8 MB — a good balance for mobile. */
  partSize?: number;
  /** Max parallel part PUTs. Defaults to 3. */
  concurrency?: number;
  /** Progress callback 0..1. */
  onProgress?: (pct: number) => void;
  /** Abort signal. */
  signal?: AbortSignal;
}

export interface MultipartUploadResult {
  publicUrl: string;
  key: string;
}

const DEFAULT_PART_SIZE = 8 * 1024 * 1024; // 8 MB
const DEFAULT_CONCURRENCY = 3;

/** Small-file path — single presigned PUT. */
async function singlePutUpload(
  file: Blob,
  filename: string,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<MultipartUploadResult> {
  const { data, error } = await supabase.functions.invoke('get-r2-presigned-url', {
    body: { key: filename, contentType },
  });
  if (error || !data?.uploadUrl) throw new Error(error?.message || 'Failed to get upload URL');

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', data.uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`R2 upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });

  return { publicUrl: data.publicUrl as string, key: data.key as string };
}

export async function uploadFileMultipart(
  file: File | Blob,
  filename: string,
  contentType: string,
  opts: MultipartUploadOptions = {},
): Promise<MultipartUploadResult> {
  const partSize = opts.partSize ?? DEFAULT_PART_SIZE;
  const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;
  const onProgress = opts.onProgress;
  const size = file.size;

  // Small file → single PUT
  if (size <= partSize) {
    return singlePutUpload(file, filename, contentType, onProgress);
  }

  // 1. Initiate
  const initRes = await supabase.functions.invoke('initiate-multipart-upload', {
    body: {
      filename,
      contentType,
      category: opts.category,
      battleId: opts.battleId,
    },
  });
  if (initRes.error || !initRes.data?.uploadId) {
    throw new Error(initRes.error?.message || 'Failed to initiate multipart upload');
  }
  const { uploadId, key } = initRes.data as { uploadId: string; key: string };

  const totalParts = Math.ceil(size / partSize);
  const partNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);

  // 2. Presign all parts in batches of 50 (edge function cap)
  const presignedMap = new Map<number, string>();
  for (let i = 0; i < partNumbers.length; i += 50) {
    const batch = partNumbers.slice(i, i + 50);
    const { data, error } = await supabase.functions.invoke('presign-upload-part', {
      body: { key, uploadId, partNumbers: batch },
    });
    if (error || !data?.presignedUrls) throw new Error(error?.message || 'Failed to presign parts');
    for (const p of data.presignedUrls as Array<{ partNumber: number; presignedUrl: string }>) {
      presignedMap.set(p.partNumber, p.presignedUrl);
    }
  }

  // 3. Upload parts (bounded concurrency, with per-part progress)
  const partLoaded = new Array<number>(totalParts).fill(0);
  const reportProgress = () => {
    if (!onProgress) return;
    const loaded = partLoaded.reduce((s, v) => s + v, 0);
    onProgress(Math.min(0.99, loaded / size));
  };

  const completedParts: Array<{ partNumber: number; etag: string }> = [];

  const uploadPart = async (partNumber: number) => {
    if (opts.signal?.aborted) throw new Error('Upload aborted');
    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, size);
    const chunk = file.slice(start, end);
    const url = presignedMap.get(partNumber)!;

    const etag = await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          partLoaded[partNumber - 1] = e.loaded;
          reportProgress();
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const et = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag');
          if (!et) {
            reject(new Error('Missing ETag in part response — check R2 CORS exposes ETag header'));
            return;
          }
          partLoaded[partNumber - 1] = chunk.size;
          reportProgress();
          resolve(et.replace(/"/g, ''));
        } else {
          reject(new Error(`Part ${partNumber} failed (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error(`Part ${partNumber} network error`));
      xhr.onabort = () => reject(new Error('Upload aborted'));
      opts.signal?.addEventListener('abort', () => xhr.abort(), { once: true });
      xhr.send(chunk);
    });

    completedParts.push({ partNumber, etag });
  };

  // Simple bounded-concurrency worker pool
  const queue = [...partNumbers];
  const runWorker = async () => {
    while (queue.length) {
      const pn = queue.shift();
      if (pn == null) return;
      await uploadPart(pn);
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, totalParts) }, runWorker));
  } catch (err) {
    // Abort upload on failure
    await supabase.functions.invoke('abort-multipart-upload', {
      body: { key, uploadId },
    }).catch(() => { /* best effort */ });
    throw err;
  }

  completedParts.sort((a, b) => a.partNumber - b.partNumber);

  // 4. Complete
  const completeRes = await supabase.functions.invoke('complete-multipart-upload', {
    body: { key, uploadId, parts: completedParts, battleId: opts.battleId },
  });
  if (completeRes.error || !completeRes.data?.url) {
    throw new Error(completeRes.error?.message || 'Failed to finalize upload');
  }

  onProgress?.(1);
  return { publicUrl: completeRes.data.url as string, key: completeRes.data.key as string };
}
