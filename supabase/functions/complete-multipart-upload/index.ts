import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, CompleteMultipartUploadCommand } from "npm:@aws-sdk/client-s3@^3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const r2BucketName = Deno.env.get('R2_BUCKET_NAME') || 'battle-submissions';
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
    if (battleId) {
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      await serviceClient.from('battle_submissions').insert({
        battle_id: battleId,
        user_id: user.id,
        media_url: publicUrl,
        title: title || null,
        description: description || null,
        status: 'submitted',
      });

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
    }

    return new Response(
      JSON.stringify({ success: true, url: publicUrl, key }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[COMPLETE-MULTIPART] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
