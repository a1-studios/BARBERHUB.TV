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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Unauthorized');

    const { key, uploadId, parts } = await req.json();
    if (!key || !uploadId || !parts?.length) throw new Error('key, uploadId, and parts are required');

    const r2AccountId = Deno.env.get('R2_ACCOUNT_ID')!;
    const r2AccessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')!;
    const r2SecretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')!;
    const r2BucketName = Deno.env.get('R2_BUCKET_NAME') || 'battle-submissions';
    const r2PublicUrl = Deno.env.get('R2_PUBLIC_URL');

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
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
