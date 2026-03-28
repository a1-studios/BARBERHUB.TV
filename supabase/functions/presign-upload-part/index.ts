import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, UploadPartCommand } from "npm:@aws-sdk/client-s3@^3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@^3";

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

    const body = await req.json();
    const { key, uploadId, partNumber, partNumbers } = body;

    if (!key || !uploadId) {
      return new Response(JSON.stringify({ error: 'key and uploadId are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Support batch mode (partNumbers array) or single mode (partNumber)
    const parts: number[] = partNumbers && Array.isArray(partNumbers)
      ? partNumbers
      : partNumber ? [partNumber] : [];

    if (parts.length === 0) {
      return new Response(JSON.stringify({ error: 'partNumber or partNumbers[] is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (parts.length > 50) {
      return new Response(JSON.stringify({ error: 'Maximum 50 parts per batch' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const r2AccountId = Deno.env.get('R2_ACCOUNT_ID')!;
    const r2AccessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')!;
    const r2SecretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')!;
    const r2BucketName = Deno.env.get('R2_BUCKET_NAME') || 'battle-submissions';

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
    });

    // Generate presigned URLs for all requested parts in parallel
    const presignedUrls = await Promise.all(
      parts.map(async (pn: number) => {
        const command = new UploadPartCommand({
          Bucket: r2BucketName,
          Key: key,
          UploadId: uploadId,
          PartNumber: pn,
        });
        const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        return { partNumber: pn, presignedUrl };
      })
    );

    return new Response(
      JSON.stringify({ success: true, presignedUrls }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[PRESIGN-PART] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
