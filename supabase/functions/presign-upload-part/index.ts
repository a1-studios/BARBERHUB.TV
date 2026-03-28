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

    const r2Endpoint = Deno.env.get('R2_ENDPOINT');
    const r2AccessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const r2SecretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const r2BucketName = Deno.env.get('R2_BUCKET_NAME') || 'battles-submissions';

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
