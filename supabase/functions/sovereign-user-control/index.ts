import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOVEREIGN_EMAIL = 'a1studios.film@gmail.com';

interface UserRequest {
  action: 'search_users' | 'get_user_details' | 'assign_role' | 'remove_role' | 'freeze_account' | 'unfreeze_account' | 'force_verify' | 'remove_verify' | 'get_stats';
  user_id?: string;
  search_query?: string;
  role?: string;
  reason?: string;
  notes?: string;
  limit?: number;
  offset?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Auth validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sovereign checks
    if (user.email !== SOVEREIGN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: hasRole } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'sovereign' });
    
    if (!hasRole) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: UserRequest = await req.json();
    const { action, user_id, search_query, role, reason, notes, limit = 50, offset = 0 } = body;

    console.log(`Sovereign user action: ${action} by ${user.email}`);

    let result: any = null;
    let beforeState: any = null;
    let afterState: any = null;

    switch (action) {
      case 'get_stats': {
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { data: roleCounts } = await supabase
          .from('user_roles')
          .select('role');

        const roleStats = roleCounts?.reduce((acc: any, r) => {
          acc[r.role] = (acc[r.role] || 0) + 1;
          return acc;
        }, {}) || {};

        const { count: verifiedCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_verified', true);

        result = {
          total_users: totalUsers || 0,
          role_distribution: roleStats,
          verified_users: verifiedCount || 0
        };
        break;
      }

      case 'search_users': {
        let query = supabase
          .from('profiles')
          .select('*, barber_profiles(*)', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (search_query) {
          query = query.or(`display_name.ilike.%${search_query}%,username.ilike.%${search_query}%`);
        }

        const { data: users, count } = await query;

        // Get roles for each user
        const userIds = users?.map(u => u.user_id) || [];
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        const usersWithRoles = users?.map(u => ({
          ...u,
          roles: roles?.filter(r => r.user_id === u.user_id).map(r => r.role) || []
        }));

        result = { users: usersWithRoles, total: count };
        break;
      }

      case 'get_user_details': {
        if (!user_id) throw new Error('User ID required');

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user_id)
          .single();

        const { data: barberProfile } = await supabase
          .from('barber_profiles')
          .select('*')
          .eq('user_id', user_id)
          .single();

        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user_id);

        const { data: transactions } = await supabase
          .from('barber_bucks_transactions')
          .select('*')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(10);

        const { data: battles } = await supabase
          .from('battles')
          .select('id, title, status, created_at')
          .or(`organizer_id.eq.${user_id},barber1_id.eq.${user_id},barber2_id.eq.${user_id}`)
          .order('created_at', { ascending: false })
          .limit(10);

        result = {
          profile,
          barber_profile: barberProfile,
          roles: roles?.map(r => r.role) || [],
          recent_transactions: transactions,
          recent_battles: battles
        };
        break;
      }

      case 'assign_role': {
        if (!user_id || !role) throw new Error('User ID and role required');

        beforeState = { role: null };

        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id, role })
          .select();

        if (insertError && !insertError.message.includes('duplicate')) {
          throw insertError;
        }

        afterState = { role };
        result = { success: true, user_id, role_assigned: role };
        break;
      }

      case 'remove_role': {
        if (!user_id || !role) throw new Error('User ID and role required');

        // Prevent removing sovereign role from self
        if (user_id === user.id && role === 'sovereign') {
          throw new Error('Cannot remove sovereign role from yourself');
        }

        beforeState = { role };

        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user_id)
          .eq('role', role);

        if (deleteError) throw deleteError;

        afterState = { role: null };
        result = { success: true, user_id, role_removed: role };
        break;
      }

      case 'freeze_account': {
        if (!user_id) throw new Error('User ID required');

        // Prevent freezing sovereign
        if (user_id === user.id) {
          throw new Error('Cannot freeze sovereign account');
        }

        beforeState = { is_frozen: false };

        // Use auth admin to disable user
        const { error: banError } = await supabase.auth.admin.updateUserById(user_id, {
          ban_duration: '876000h' // ~100 years
        });

        if (banError) throw banError;

        afterState = { is_frozen: true };
        result = { success: true, user_id, action: 'frozen' };
        break;
      }

      case 'unfreeze_account': {
        if (!user_id) throw new Error('User ID required');

        beforeState = { is_frozen: true };

        const { error: unbanError } = await supabase.auth.admin.updateUserById(user_id, {
          ban_duration: 'none'
        });

        if (unbanError) throw unbanError;

        afterState = { is_frozen: false };
        result = { success: true, user_id, action: 'unfrozen' };
        break;
      }

      case 'force_verify': {
        if (!user_id) throw new Error('User ID required');

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_verified')
          .eq('user_id', user_id)
          .single();

        beforeState = { is_verified: profile?.is_verified };

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ is_verified: true })
          .eq('user_id', user_id);

        if (updateError) throw updateError;

        afterState = { is_verified: true };
        result = { success: true, user_id, is_verified: true };
        break;
      }

      case 'remove_verify': {
        if (!user_id) throw new Error('User ID required');

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_verified')
          .eq('user_id', user_id)
          .single();

        beforeState = { is_verified: profile?.is_verified };

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ is_verified: false })
          .eq('user_id', user_id);

        if (updateError) throw updateError;

        afterState = { is_verified: false };
        result = { success: true, user_id, is_verified: false };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log action
    if (!['get_stats', 'search_users', 'get_user_details'].includes(action)) {
      await supabase
        .from('sovereign_audit_log')
        .insert({
          sovereign_id: user.id,
          action_category: 'user',
          action_type: action,
          target_type: 'user',
          target_id: user_id,
          before_state: beforeState,
          after_state: afterState,
          severity: ['freeze_account', 'remove_role'].includes(action) ? 'critical' : 'normal',
          notes: notes || reason
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sovereign user error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
