import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOVEREIGN_EMAIL = Deno.env.get('SOVEREIGN_EMAIL') || 'a1studios.film@gmail.com';

interface UserRequest {
  action: 'search_users' | 'get_user_details' | 'assign_role' | 'remove_role' | 'freeze_account' | 'unfreeze_account' | 'force_verify' | 'remove_verify' | 'get_stats' | 'update_profile' | 'mint_bb' | 'burn_bb';
  user_id?: string;
  search_query?: string;
  role?: string;
  reason?: string;
  notes?: string;
  limit?: number;
  offset?: number;
  updates?: Record<string, any>;
  barber_updates?: Record<string, any>;
  client_updates?: Record<string, any>;
  amount?: number;
}

async function verifySovereign(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw { status: 401, message: 'Unauthorized' };

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) throw { status: 401, message: 'Unauthorized' };
  if (user.email !== SOVEREIGN_EMAIL) throw { status: 404, message: 'Not found' };

  const { data: hasRole } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'sovereign' });
  if (!hasRole) throw { status: 404, message: 'Not found' };

  return user;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const user = await verifySovereign(req, supabase);
    const body: UserRequest = await req.json();
    const { action, user_id, search_query, role, reason, notes, limit = 50, offset = 0, updates, barber_updates, client_updates, amount } = body;

    console.log(`Sovereign user action: ${action} by ${user.email}`);

    let result: any = null;
    let beforeState: any = null;
    let afterState: any = null;

    switch (action) {
      case 'get_stats': {
        const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { data: roleCounts } = await supabase.from('user_roles').select('role');
        const roleStats = roleCounts?.reduce((acc: any, r: any) => { acc[r.role] = (acc[r.role] || 0) + 1; return acc; }, {}) || {};
        const { count: verifiedCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_verified_by_competition', true);
        result = { total_users: totalUsers || 0, role_distribution: roleStats, verified_users: verifiedCount || 0 };
        break;
      }

      case 'search_users': {
        let query = supabase.from('profiles').select('*, barber_profiles(*), client_profiles(*)', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
        if (search_query) query = query.or(`display_name.ilike.%${search_query}%,username.ilike.%${search_query}%`);
        const { data: users, count } = await query;
        const userIds = users?.map((u: any) => u.user_id) || [];
        const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
        const usersWithRoles = users?.map((u: any) => ({
          ...u,
          roles: roles?.filter((r: any) => r.user_id === u.user_id).map((r: any) => r.role) || []
        }));
        result = { users: usersWithRoles, total: count };
        break;
      }

      case 'list_all_users': {
        const { data: allUsers } = await supabase.from('profiles').select('user_id, display_name, username, barber_bucks, sub_category, user_type').order('display_name', { ascending: true });
        const allUserIds = allUsers?.map((u: any) => u.user_id) || [];
        const { data: allRoles } = await supabase.from('user_roles').select('user_id, role').in('user_id', allUserIds);
        const usersWithAllRoles = allUsers?.map((u: any) => ({
          ...u,
          roles: allRoles?.filter((r: any) => r.user_id === u.user_id).map((r: any) => r.role) || []
        })) || [];
        const barbers = usersWithAllRoles.filter((u: any) => u.roles.includes('barber'));
        const fans = usersWithAllRoles.filter((u: any) => !u.roles.includes('barber'));
        result = { barbers, fans, total: allUsers?.length || 0 };
        break;
      }

      case 'get_user_details': {
        if (!user_id) throw new Error('User ID required');
        const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user_id).single();
        const { data: barberProfile } = await supabase.from('barber_profiles').select('*').eq('user_id', user_id).single();
        const { data: clientProfile } = await supabase.from('client_profiles').select('*').eq('user_id', user_id).single();
        const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user_id);
        const { data: transactions } = await supabase.from('barber_bucks_transactions').select('*').eq('user_id', user_id).order('created_at', { ascending: false }).limit(10);
        const { data: battles } = await supabase.from('battles').select('id, title, status, created_at').or(`organizer_id.eq.${user_id},barber1_id.eq.${user_id},barber2_id.eq.${user_id}`).order('created_at', { ascending: false }).limit(10);
        result = { profile, barber_profile: barberProfile, client_profile: clientProfile, roles: roles?.map((r: any) => r.role) || [], recent_transactions: transactions, recent_battles: battles };
        break;
      }

      case 'update_profile': {
        if (!user_id) throw new Error('User ID required');

        // Get before state
        const { data: beforeProfile } = await supabase.from('profiles').select('*').eq('user_id', user_id).single();
        const { data: beforeBarber } = await supabase.from('barber_profiles').select('*').eq('user_id', user_id).single();
        const { data: beforeClient } = await supabase.from('client_profiles').select('*').eq('user_id', user_id).single();
        beforeState = { profile: beforeProfile, barber_profile: beforeBarber, client_profile: beforeClient };

        // Whitelist allowed profile fields
        const allowedProfileFields = ['display_name', 'username', 'bio', 'avatar_url', 'barber_bucks', 'is_verified_by_competition', 'three_x_vote_expires_at', 'is_creator', 'creator_level', 'total_earnings', 'user_type', 'country_code', 'sub_category'];
        const allowedBarberFields = ['name', 'nickname', 'rating', 'specialty', 'location', 'years_experience', 'bio', 'can_stream', 'battles_created_this_month', 'active_subscription_tier'];
        const allowedClientFields = ['voting_power', 'total_votes_cast'];

        if (updates && Object.keys(updates).length > 0) {
          const sanitized: Record<string, any> = {};
          for (const key of Object.keys(updates)) {
            if (allowedProfileFields.includes(key)) sanitized[key] = updates[key];
          }
          if (Object.keys(sanitized).length > 0) {
            const { error } = await supabase.from('profiles').update(sanitized).eq('user_id', user_id);
            if (error) throw error;
          }
        }

        if (barber_updates && Object.keys(barber_updates).length > 0 && beforeBarber) {
          const sanitized: Record<string, any> = {};
          for (const key of Object.keys(barber_updates)) {
            if (allowedBarberFields.includes(key)) sanitized[key] = barber_updates[key];
          }
          if (Object.keys(sanitized).length > 0) {
            const { error } = await supabase.from('barber_profiles').update(sanitized).eq('user_id', user_id);
            if (error) throw error;
          }
        }

        if (client_updates && Object.keys(client_updates).length > 0 && beforeClient) {
          const sanitized: Record<string, any> = {};
          for (const key of Object.keys(client_updates)) {
            if (allowedClientFields.includes(key)) sanitized[key] = client_updates[key];
          }
          if (Object.keys(sanitized).length > 0) {
            const { error } = await supabase.from('client_profiles').update(sanitized).eq('user_id', user_id);
            if (error) throw error;
          }
        }

        // Get after state
        const { data: afterProfile } = await supabase.from('profiles').select('*').eq('user_id', user_id).single();
        const { data: afterBarber } = await supabase.from('barber_profiles').select('*').eq('user_id', user_id).single();
        const { data: afterClient } = await supabase.from('client_profiles').select('*').eq('user_id', user_id).single();
        afterState = { profile: afterProfile, barber_profile: afterBarber, client_profile: afterClient };

        result = { success: true, profile: afterProfile, barber_profile: afterBarber, client_profile: afterClient };
        break;
      }

      case 'mint_bb': {
        if (!user_id || !amount) throw new Error('User ID and amount required');
        const { data: profile } = await supabase.from('profiles').select('barber_bucks').eq('user_id', user_id).single();
        beforeState = { barber_bucks: profile?.barber_bucks };
        const newBalance = (profile?.barber_bucks || 0) + amount;
        await supabase.from('profiles').update({ barber_bucks: newBalance }).eq('user_id', user_id);
        await supabase.from('barber_bucks_transactions').insert({
          user_id, amount, balance_after: newBalance,
          transaction_type: 'sovereign_mint',
          description: reason || `Sovereign minted ${amount} BB`
        });
        afterState = { barber_bucks: newBalance };
        result = { success: true, new_balance: newBalance };
        break;
      }

      case 'burn_bb': {
        if (!user_id || !amount) throw new Error('User ID and amount required');
        const { data: profile } = await supabase.from('profiles').select('barber_bucks').eq('user_id', user_id).single();
        beforeState = { barber_bucks: profile?.barber_bucks };
        const newBalance = Math.max(0, (profile?.barber_bucks || 0) - amount);
        await supabase.from('profiles').update({ barber_bucks: newBalance }).eq('user_id', user_id);
        await supabase.from('barber_bucks_transactions').insert({
          user_id, amount: -amount, balance_after: newBalance,
          transaction_type: 'sovereign_burn',
          description: reason || `Sovereign burned ${amount} BB`
        });
        afterState = { barber_bucks: newBalance };
        result = { success: true, new_balance: newBalance };
        break;
      }

      case 'assign_role': {
        if (!user_id || !role) throw new Error('User ID and role required');
        beforeState = { role: null };
        const { error: insertError } = await supabase.from('user_roles').insert({ user_id, role }).select();
        if (insertError && !insertError.message.includes('duplicate')) throw insertError;
        afterState = { role };
        result = { success: true, user_id, role_assigned: role };
        break;
      }

      case 'remove_role': {
        if (!user_id || !role) throw new Error('User ID and role required');
        if (user_id === user.id && role === 'sovereign') throw new Error('Cannot remove sovereign role from yourself');
        beforeState = { role };
        const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', user_id).eq('role', role);
        if (deleteError) throw deleteError;
        afterState = { role: null };
        result = { success: true, user_id, role_removed: role };
        break;
      }

      case 'freeze_account': {
        if (!user_id) throw new Error('User ID required');
        if (user_id === user.id) throw new Error('Cannot freeze sovereign account');
        beforeState = { is_frozen: false };
        const { error: banError } = await supabase.auth.admin.updateUserById(user_id, { ban_duration: '876000h' });
        if (banError) throw banError;
        afterState = { is_frozen: true };
        result = { success: true, user_id, action: 'frozen' };
        break;
      }

      case 'unfreeze_account': {
        if (!user_id) throw new Error('User ID required');
        beforeState = { is_frozen: true };
        const { error: unbanError } = await supabase.auth.admin.updateUserById(user_id, { ban_duration: 'none' });
        if (unbanError) throw unbanError;
        afterState = { is_frozen: false };
        result = { success: true, user_id, action: 'unfrozen' };
        break;
      }

      case 'force_verify': {
        if (!user_id) throw new Error('User ID required');
        const { data: prof } = await supabase.from('profiles').select('is_verified_by_competition').eq('user_id', user_id).single();
        beforeState = { is_verified_by_competition: prof?.is_verified_by_competition };
        await supabase.from('profiles').update({ is_verified_by_competition: true }).eq('user_id', user_id);
        afterState = { is_verified_by_competition: true };
        result = { success: true, user_id, is_verified_by_competition: true };
        break;
      }

      case 'remove_verify': {
        if (!user_id) throw new Error('User ID required');
        const { data: prof } = await supabase.from('profiles').select('is_verified_by_competition').eq('user_id', user_id).single();
        beforeState = { is_verified_by_competition: prof?.is_verified_by_competition };
        await supabase.from('profiles').update({ is_verified_by_competition: false }).eq('user_id', user_id);
        afterState = { is_verified_by_competition: false };
        result = { success: true, user_id, is_verified_by_competition: false };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log non-read actions
    if (!['get_stats', 'search_users', 'get_user_details'].includes(action)) {
      await supabase.from('sovereign_audit_log').insert({
        sovereign_id: user.id,
        action_category: 'user',
        action_type: action,
        target_type: 'user',
        target_id: user_id,
        before_state: beforeState,
        after_state: afterState,
        severity: ['freeze_account', 'remove_role', 'burn_bb'].includes(action) ? 'critical' : 'normal',
        notes: notes || reason
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    const status = error.status || 500;
    const message = (error as Error).message || 'Internal error';
    console.error('Sovereign user error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
