import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, CompleteMultipartUploadCommand } from "npm:@aws-sdk/client-s3@^3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Ingest a video URL into Cloudflare Stream for adaptive HLS delivery.
 * Gracefully degrades — logs errors but never throws.
 */
async function ingestToCloudflareStream(
  sourceUrl: string,
  table: string,
  recordId: string,
  supabaseAdmin: any
): Promise<string | null> {
  const cfAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const cfApiToken = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
  if (!cfAccountId || !cfApiToken) {
    console.warn('[CF-STREAM] Secrets not configured, skipping ingest');
    return null;
  }

  const videoExts = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
  const lowerUrl = sourceUrl.toLowerCase();
  const isVideo = videoExts.some((ext) => lowerUrl.includes(ext)) || lowerUrl.includes('/recordings/');
  if (!isVideo) {
    console.log('[CF-STREAM] Skipping non-video URL:', sourceUrl);
    return null;
  }

  try {
    console.log(`[CF-STREAM] Ingesting ${sourceUrl} into Cloudflare Stream...`);
    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/copy`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: sourceUrl,
          meta: { name: `${table}/${recordId}` },
        }),
      }
    );

    const cfData = await cfResponse.json();
    if (!cfData.success || !cfData.result?.uid) {
      console.error('[CF-STREAM] Cloudflare Stream copy failed:', cfData.errors);
      return null;
    }

    const streamUid = cfData.result.uid;
    console.log(`[CF-STREAM] Stream UID: ${streamUid} — updating ${table}.${recordId}`);

    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({ cloudflare_stream_uid: streamUid })
      .eq('id', recordId);

    if (updateError) {
      console.error('[CF-STREAM] DB update failed:', updateError);
    }

    return streamUid;
  } catch (err) {
    console.error('[CF-STREAM] Ingest error (non-fatal):', err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { key, uploadId, parts, battleId, title, description } = await req.json();
    if (!key || !uploadId || !parts?.length) {
      return new Response(JSON.stringify({ error: 'key, uploadId, and parts are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const r2Endpoint = Deno.env.get('R2_ENDPOINT');
    const r2AccessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const r2SecretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const r2BucketName = Deno.env.get('R2_BUCKET_NAME') || 'battles-submissions';
    const r2PublicUrl = Deno.env.get('R2_PUBLIC_URL');

    if (!r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey) {
      return new Response(JSON.stringify({ error: 'R2 credentials not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in Supabase secrets.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint,
      credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
    });

    const command = new CompleteMultipartUploadCommand({
      Bucket: r2BucketName,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((p: { partNumber: number; etag: string }) => ({
          PartNumber: p.partNumber,
          ETag: p.etag,
        })),
      },
    });

    await s3.send(command);

    const publicUrl = r2PublicUrl
      ? `${r2PublicUrl.replace(/\/$/, '')}/${key}`
      : key;

    // DB sync: insert battle_submissions record if battleId provided
    let submissionId: string | null = null;
    if (battleId) {
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: newSub } = await serviceClient.from('battle_submissions').insert({
        battle_id: battleId,
        user_id: user.id,
        media_url: publicUrl,
        title: title || null,
        description: description || null,
        status: 'submitted',
      }).select('id').single();

      submissionId = newSub?.id || null;

      // Check if both barbers submitted → transition to voting
      const { count } = await serviceClient
        .from('battle_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('battle_id', battleId);

      if (count && count >= 2) {
        await serviceClient.from('battles').update({
          status: 'voting',
          voting_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('id', battleId).in('status', ['awaiting_submissions', 'active']);
      }

      // ── Cloudflare Stream auto-ingest for battle submission ──
      if (submissionId) {
        ingestToCloudflareStream(publicUrl, 'battle_submissions', submissionId, serviceClient)
          .catch((e) => console.error('[CF-STREAM] Background ingest failed:', e));
      }
    }

    return new Response(
      JSON.stringify({ success: true, url: publicUrl, key }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[COMPLETE-MULTIPART] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
