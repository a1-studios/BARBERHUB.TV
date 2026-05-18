/**
 * Backfill legacy R2 videos into Cloudflare Stream so playback is ABR (HLS) everywhere.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     tsx scripts/backfill-cloudflare-stream.ts [--dry] [--table=creations] [--limit=200]
 *
 * Scans:
 *   - creations
 *   - creator_content
 *   - battle_submissions
 *   - barber_profiles (via featured_video_id; no cloudflare_stream_uid column → ingest only)
 * For rows where cloudflare_stream_uid IS NULL and media_url is an http(s) .mp4/.mov/.webm.
 *
 * Calls existing `upload-to-cloudflare-stream` edge function in batches of 10 with 2s gaps.
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  })
);
const DRY = args.get('dry') === 'true';
const TABLE_FILTER = args.get('table');
const LIMIT = Number(args.get('limit') ?? 200);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const VIDEO_EXT = /\.(mp4|mov|webm|m4v)(\?.*)?$/i;

const SOURCES = [
  { table: 'creations', cols: 'id, media_url, cloudflare_stream_uid' },
  { table: 'creator_content', cols: 'id, media_url, cloudflare_stream_uid' },
  { table: 'battle_submissions', cols: 'id, media_url, cloudflare_stream_uid' },
];

type Job = { table: string; recordId: string; sourceUrl: string };
const report: any = { dryRun: DRY, started: new Date().toISOString(), perTable: {}, successes: [], failures: [] };

async function gatherJobs(): Promise<Job[]> {
  const jobs: Job[] = [];
  for (const src of SOURCES) {
    if (TABLE_FILTER && TABLE_FILTER !== src.table) continue;
    const { data, error } = await supabase
      .from(src.table as any)
      .select(src.cols)
      .is('cloudflare_stream_uid', null)
      .not('media_url', 'is', null)
      .limit(LIMIT);
    if (error) { console.error(`[${src.table}] query error`, error); continue; }
    const eligible = (data ?? []).filter((r: any) =>
      typeof r.media_url === 'string' && /^https?:\/\//.test(r.media_url) && VIDEO_EXT.test(r.media_url)
    );
    report.perTable[src.table] = { scanned: data?.length ?? 0, eligible: eligible.length };
    eligible.forEach((r: any) => jobs.push({ table: src.table, recordId: r.id, sourceUrl: r.media_url }));
  }
  return jobs;
}

async function runJob(job: Job) {
  const res = await supabase.functions.invoke('upload-to-cloudflare-stream', {
    body: { sourceUrl: job.sourceUrl, table: job.table, recordId: job.recordId },
  });
  if (res.error) {
    report.failures.push({ ...job, error: res.error.message });
    console.warn(`✗ ${job.table}:${job.recordId} — ${res.error.message}`);
  } else {
    report.successes.push(job);
    console.log(`✓ ${job.table}:${job.recordId}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const jobs = await gatherJobs();
  console.log(`Found ${jobs.length} eligible rows. Dry-run: ${DRY}`);
  if (DRY) {
    writeFileSync('/tmp/backfill-report.json', JSON.stringify({ ...report, jobs }, null, 2));
    return;
  }
  for (let i = 0; i < jobs.length; i += 10) {
    const batch = jobs.slice(i, i + 10);
    await Promise.all(batch.map(runJob));
    if (i + 10 < jobs.length) await sleep(2000);
  }
  report.finished = new Date().toISOString();
  writeFileSync('/tmp/backfill-report.json', JSON.stringify(report, null, 2));
  console.log(`Done. ${report.successes.length} ok, ${report.failures.length} failed. Report at /tmp/backfill-report.json`);
})();
