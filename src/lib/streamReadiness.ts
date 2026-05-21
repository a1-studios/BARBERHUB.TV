import { supabase } from '@/integrations/supabase/client';

export type StreamReadyTable = 'creations' | 'creator_content' | 'battle_submissions';

interface PollOptions {
  /** Initial delay before the first check, ms. Default 3000. */
  initialDelayMs?: number;
  /** Cap on the backoff interval, ms. Default 30000. */
  maxIntervalMs?: number;
  /** Stop polling after this many ms. Default 5 min. */
  timeoutMs?: number;
  /** Called on every status transition. */
  onStatus?: (status: 'pending' | 'ready' | 'errored', detail?: { progress?: number }) => void;
}

/**
 * Poll the poll-cloudflare-stream edge function until the row reports `ready`
 * (or `errored`, or we time out). Resolves with the final status.
 */
export async function pollStreamReady(
  table: StreamReadyTable,
  recordId: string,
  streamUid: string,
  opts: PollOptions = {},
): Promise<'ready' | 'errored' | 'timeout'> {
  const initial = opts.initialDelayMs ?? 3000;
  const max = opts.maxIntervalMs ?? 30000;
  const timeout = opts.timeoutMs ?? 5 * 60 * 1000;

  const started = Date.now();
  let delay = initial;

  await new Promise((r) => setTimeout(r, initial));

  while (Date.now() - started < timeout) {
    try {
      const { data, error } = await supabase.functions.invoke('poll-cloudflare-stream', {
        body: { table, recordId, streamUid },
      });
      if (!error && data) {
        const status = data.status as 'pending' | 'ready' | 'errored' | undefined;
        opts.onStatus?.(status ?? 'pending', { progress: data.progress });
        if (status === 'ready') return 'ready';
        if (status === 'errored') return 'errored';
      }
    } catch (e) {
      // Network blip — keep polling
      console.warn('[pollStreamReady] check failed:', e);
    }
    delay = Math.min(Math.round(delay * 1.5), max);
    await new Promise((r) => setTimeout(r, delay));
  }
  return 'timeout';
}
