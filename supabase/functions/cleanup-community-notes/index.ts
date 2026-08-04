import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isAuthorizedCron } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Machine-invoked only: requires the shared CRON_SECRET.
  if (!(await isAuthorizedCron(req))) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }


  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting community notes cleanup...');
    
    // Delete notes older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: deletedNotes, error } = await supabase
      .from('community_notes')
      .delete()
      .lt('created_at', sevenDaysAgo.toISOString())
      .select('id');

    if (error) {
      console.error('Error deleting old community notes:', error);
      throw error;
    }

    const deletedCount = deletedNotes?.length || 0;
    console.log(`Community notes cleanup complete: ${deletedCount} notes deleted`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: deletedCount,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});