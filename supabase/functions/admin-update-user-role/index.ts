import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoleUpdateRequest {
  user_id: string;
  new_role: 'admin' | 'barber' | 'fan';
  action: 'add' | 'remove';
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

    const { user_id, new_role, action }: RoleUpdateRequest = await req.json();

    // Runtime whitelist — TypeScript types are erased at runtime, so we must
    // explicitly block privilege escalation to 'sovereign' or other roles.
    const ALLOWED_ROLES = ['admin', 'barber', 'fan'] as const;
    if (!ALLOWED_ROLES.includes(new_role as typeof ALLOWED_ROLES[number])) {
      throw new Error('Invalid role');
    }
    const ALLOWED_ACTIONS = ['add', 'remove'] as const;
    if (!ALLOWED_ACTIONS.includes(action as typeof ALLOWED_ACTIONS[number])) {
      throw new Error('Invalid action');
    }
    if (typeof user_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(user_id)) {
      throw new Error('Invalid user_id');
    }

    if (action === 'add') {
      // Add role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id, role: new_role })
        .select()
        .single();

      if (insertError && !insertError.message.includes('duplicate')) {
        throw insertError;
      }

      // Update user_type in profiles if it's the primary role
      await supabase
        .from('profiles')
        .update({ user_type: new_role })
        .eq('user_id', user_id);

      // If adding barber role, create barber profile
      if (new_role === 'barber') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user_id)
          .single();

        await supabase
          .from('barber_profiles')
          .insert({
            user_id,
            name: profile?.display_name || 'New Barber'
          });
      }
    } else {
      // Remove role
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user_id)
        .eq('role', new_role);

      if (deleteError) throw deleteError;
    }

    // Log admin action
    await supabase.from('admin_action_logs').insert({
      admin_id: user.id,
      action_type: 'update_user_role',
      entity_type: 'user',
      entity_id: user_id,
      details: { new_role, action }
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating user role:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});