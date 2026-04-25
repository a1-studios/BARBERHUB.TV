import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerificationRequest {
  user_id: string;
  verified: boolean;
  grant_3x_vote?: boolean;
  vote_duration_days?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the admin user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      throw new Error('Admin access required');
    }

    const { user_id, verified, grant_3x_vote, vote_duration_days = 365 }: VerificationRequest = await req.json();

    const updateData: any = {
      is_verified_by_competition: verified
    };

    if (verified && grant_3x_vote) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + vote_duration_days);
      updateData.three_x_vote_expires_at = expiresAt.toISOString();
    } else if (!verified) {
      updateData.three_x_vote_expires_at = null;
    }

    // Update user verification status
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user_id);

    if (updateError) throw updateError;

    // Create notification
    await supabase.from('notifications').insert({
      user_id,
      type: 'verification_status',
      title: verified ? '✅ Account Verified!' : 'Verification Removed',
      message: verified 
        ? `Your account has been verified by competition${grant_3x_vote ? ' and you now have 3x voting power!' : '!'}`
        : 'Your verification status has been removed.',
      data: { verified, grant_3x_vote }
    });

    // Log admin action
    await supabase.from('admin_action_logs').insert({
      admin_id: user.id,
      action_type: 'toggle_verification',
      entity_type: 'user',
      entity_id: user_id,
      details: { verified, grant_3x_vote, vote_duration_days }
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error toggling verification:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});