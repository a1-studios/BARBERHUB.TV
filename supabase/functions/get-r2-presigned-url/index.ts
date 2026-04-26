import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.658.1";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.658.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUCKET = Deno.env.get("R2_BUCKET_NAME") || "battles-submissions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const r2Endpoint = Deno.env.get("R2_ENDPOINT");
    const r2AccessKey = Deno.env.get("R2_ACCESS_KEY_ID");
    const r2SecretKey = Deno.env.get("R2_SECRET_ACCESS_KEY");

    if (!r2Endpoint || !r2AccessKey || !r2SecretKey) {
      throw new Error("R2 credentials not configured");
    }

    // Auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: authError } =
      await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { key, contentType } = await req.json();
    if (!key) throw new Error("key is required");

    const s3 = new S3Client({
      region: "auto",
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId: r2AccessKey,
        secretAccessKey: r2SecretKey,
      },
    });

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType || "application/octet-stream",
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    // Derive public URL from R2_PUBLIC_URL (custom domain or public bucket URL)
    const r2PublicUrl = Deno.env.get("R2_PUBLIC_URL");
    if (!r2PublicUrl) {
      throw new Error("R2_PUBLIC_URL not configured");
    }
    const publicUrl = `${r2PublicUrl}/${key}`;

    return new Response(
      JSON.stringify({ success: true, uploadUrl, publicUrl, key }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[GET-R2-PRESIGNED-URL] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
