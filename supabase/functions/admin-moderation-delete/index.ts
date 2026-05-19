import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, DeleteObjectCommand } from "npm:@aws-sdk/client-s3@^3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOVEREIGN_EMAIL = Deno.env.get('SOVEREIGN_EMAIL') || 'a1studios.film@gmail.com';
const BUCKET = Deno.env.get('R2_BUCKET_NAME') || 'battles-submissions';
const CDN = (Deno.env.get('MEDIA_CDN_DOMAIN') || 'https://media.barberhub.tv').replace(/\/$/, '');

async function verifySovereign(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw { status: 401, message: 'Unauthorized' };
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw { status: 401, message: 'Unauthorized' };
  if (user.email !== SOVEREIGN_EMAIL) throw { status: 404, message: 'Not found' };
  const { data: hasRole } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'sovereign' });
  if (!hasRole) throw { status: 404, message: 'Not found' };
  return user;
}

function extractR2Key(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith(CDN + '/')) return url.slice(CDN.length + 1);
  const m = url.match(/r2\.dev\/(.+)$/);
  if (m) return m[1];
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const admin = await verifySovereign(req, supabase);
    const { report_id, target_type, target_id } = await req.json();

    if (!target_type || !target_id) throw new Error('target_type and target_id required');

    // Resolve owner + media URL by target type
    const tableMap: Record<string, { table: string; ownerCol: string; urlCols: string[] }> = {
      creation: { table: 'creations', ownerCol: 'barber_id', urlCols: ['media_url', 'thumbnail_url'] },
      battle_submission: { table: 'battle_submissions', ownerCol: 'user_id', urlCols: ['media_url', 'thumbnail_url'] },
      creator_content: { table: 'creator_content', ownerCol: 'creator_id', urlCols: ['media_url', 'thumbnail_url'] },
      post: { table: 'creations', ownerCol: 'barber_id', urlCols: ['media_url', 'thumbnail_url'] },
    };

    const cfg = tableMap[target_type];
    let ownerUserId: string | null = null;
    const keysToDelete: string[] = [];

    if (cfg) {
      const { data: row } = await supabase.from(cfg.table).select('*').eq('id', target_id).maybeSingle();
      if (row) {
        ownerUserId = row[cfg.ownerCol] || null;
        // For creations, barber_id is barber_profiles.id — resolve to user_id
        if (target_type === 'creation' || target_type === 'post') {
          const { data: bp } = await supabase.from('barber_profiles').select('user_id').eq('id', row.barber_id).maybeSingle();
          ownerUserId = bp?.user_id || null;
        }
        for (const col of cfg.urlCols) {
          const k = extractR2Key(row[col]);
          if (k) keysToDelete.push(k);
        }
        await supabase.from(cfg.table).delete().eq('id', target_id);
      }
    }

    // Delete R2 objects
    const r2Endpoint = Deno.env.get('R2_ENDPOINT');
    const r2AccessKey = Deno.env.get('R2_ACCESS_KEY_ID');
    const r2SecretKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    if (r2Endpoint && r2AccessKey && r2SecretKey && keysToDelete.length) {
      const s3 = new S3Client({
        region: 'auto',
        endpoint: r2Endpoint,
        credentials: { accessKeyId: r2AccessKey, secretAccessKey: r2SecretKey },
      });
      for (const Key of keysToDelete) {
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }));
        } catch (e) {
          console.error('R2 delete failed for key', Key, e);
        }
      }
    }

    // Strike + audit
    if (ownerUserId) {
      await supabase.from('moderation_strikes').insert({
        user_id: ownerUserId,
        content_id: target_id,
        content_type: target_type,
        report_id: report_id || null,
        reason: 'content_removed',
        issued_by: admin.id,
      });
    }
    await supabase.from('moderation_actions').insert({
      admin_id: admin.id,
      target_user_id: ownerUserId,
      target_content_id: target_id,
      target_content_type: target_type,
      action_type: 'delete_content',
      metadata: { r2_keys: keysToDelete, report_id },
    });

    if (report_id) {
      await supabase
        .from('content_reports')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: admin.id,
          resolution_action: 'content_deleted',
        })
        .eq('id', report_id);
    }

    return new Response(JSON.stringify({ success: true, r2_keys_deleted: keysToDelete }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[admin-moderation-delete]', e);
    return new Response(JSON.stringify({ success: false, error: e.message || 'Error' }), {
      status: e.status || 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
