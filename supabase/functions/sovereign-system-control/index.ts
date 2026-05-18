import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOVEREIGN_EMAIL = Deno.env.get('SOVEREIGN_EMAIL') || 'a1studios.film@gmail.com';

interface SystemRequest {
  action: 'get_status' | 'pause_battles' | 'resume_battles' | 'freeze_economy' | 'unfreeze_economy' | 'maintenance_mode' | 'exit_maintenance' | 'get_audit_log' | 'get_platform_stats' | 'enforce_tiers_on' | 'enforce_tiers_off' | 'tiers_enable' | 'tiers_disable' | 'challenge_stakes_enable' | 'challenge_stakes_disable' | 'challenge_set_min_stake' | 'quick_play_enable' | 'quick_play_disable' | 'quick_play_feed_enable' | 'quick_play_feed_disable' | 'dev_mode_enable' | 'dev_mode_disable';
  reason?: string;
  notes?: string;
  limit?: number;
  offset?: number;
  min_stake_bb?: number;
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

    const body: SystemRequest = await req.json();
    const { action, reason, notes, limit = 50, offset = 0, min_stake_bb } = body;

    console.log(`Sovereign system action: ${action} by ${user.email}`);

    let result: any = null;
    let beforeState: any = null;
    let afterState: any = null;
    let severity = 'normal';

    switch (action) {
      case 'get_status': {
        const { data: states } = await supabase
          .from('platform_state')
          .select('key, value, updated_at');

        const stateMap = states?.reduce((acc: any, s) => {
          acc[s.key] = { value: s.value, updated_at: s.updated_at };
          return acc;
        }, {}) || {};

        result = { platform_state: stateMap };
        break;
      }

      case 'get_platform_stats': {
        // Active battles
        const { count: activeBattles } = await supabase
          .from('battles')
          .select('*', { count: 'exact', head: true })
          .in('status', ['live', 'streaming', 'voting']);

        // Total users online (approximation - users active in last 5 minutes)
        const { count: recentVotes } = await supabase
          .from('battle_votes')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

        // Total BB in circulation
        const { data: bbData } = await supabase
          .from('profiles')
          .select('barber_bucks');
        const totalBB = bbData?.reduce((sum, p) => sum + (p.barber_bucks || 0), 0) || 0;

        // Transactions in last hour
        const { count: recentTxns } = await supabase
          .from('barber_bucks_transactions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

        result = {
          active_battles: activeBattles || 0,
          recent_vote_activity: recentVotes || 0,
          total_bb_circulation: totalBB,
          transactions_last_hour: recentTxns || 0
        };
        break;
      }

      case 'get_audit_log': {
        const { data: logs, count } = await supabase
          .from('sovereign_audit_log')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        result = { logs, total: count };
        break;
      }

      case 'pause_battles': {
        beforeState = { battles_paused: false };
        severity = 'emergency';

        // Update platform state
        await supabase
          .from('platform_state')
          .update({ value: 'true', updated_at: new Date().toISOString(), updated_by: user.id })
          .eq('key', 'battles_paused');

        // Pause all active battles
        const { data: activeBattles } = await supabase
          .from('battles')
          .select('id')
          .in('status', ['live', 'streaming', 'upcoming', 'voting']);

        const pausedCount = activeBattles?.length || 0;

        await supabase
          .from('battles')
          .update({ status: 'paused' })
          .in('status', ['live', 'streaming', 'upcoming', 'voting']);

        afterState = { battles_paused: true, battles_affected: pausedCount };
        result = { success: true, battles_paused: pausedCount };
        break;
      }

      case 'resume_battles': {
        beforeState = { battles_paused: true };
        severity = 'critical';

        await supabase
          .from('platform_state')
          .update({ value: 'false', updated_at: new Date().toISOString(), updated_by: user.id })
          .eq('key', 'battles_paused');

        // Note: Paused battles stay paused - organizers must manually restart
        afterState = { battles_paused: false };
        result = { success: true, message: 'Battle operations resumed. Paused battles must be restarted manually.' };
        break;
      }

      case 'freeze_economy': {
        beforeState = { economy_frozen: false };
        severity = 'emergency';

        await supabase
          .from('platform_state')
          .update({ value: 'true', updated_at: new Date().toISOString(), updated_by: user.id })
          .eq('key', 'economy_frozen');

        afterState = { economy_frozen: true };
        result = { success: true, message: 'Economy frozen. All BB transactions are now blocked.' };
        break;
      }

      case 'unfreeze_economy': {
        beforeState = { economy_frozen: true };
        severity = 'critical';

        await supabase
          .from('platform_state')
          .update({ value: 'false', updated_at: new Date().toISOString(), updated_by: user.id })
          .eq('key', 'economy_frozen');

        afterState = { economy_frozen: false };
        result = { success: true, message: 'Economy unfrozen. BB transactions are now allowed.' };
        break;
      }

      case 'maintenance_mode': {
        beforeState = { maintenance_mode: false };
        severity = 'emergency';

        await supabase
          .from('platform_state')
          .update({ value: 'true', updated_at: new Date().toISOString(), updated_by: user.id })
          .eq('key', 'maintenance_mode');

        // Also pause battles and freeze economy
        await supabase
          .from('platform_state')
          .update({ value: 'true', updated_at: new Date().toISOString(), updated_by: user.id })
          .eq('key', 'battles_paused');

        await supabase
          .from('platform_state')
          .update({ value: 'true', updated_at: new Date().toISOString(), updated_by: user.id })
          .eq('key', 'economy_frozen');

        afterState = { maintenance_mode: true, battles_paused: true, economy_frozen: true };
        result = { success: true, message: 'Maintenance mode enabled. All operations frozen.' };
        break;
      }

      case 'exit_maintenance': {
        beforeState = { maintenance_mode: true };
        severity = 'critical';

        await supabase
          .from('platform_state')
          .update({ value: 'false', updated_at: new Date().toISOString(), updated_by: user.id })
          .eq('key', 'maintenance_mode');

        await supabase
          .from('platform_state')
          .update({ value: 'false', updated_at: new Date().toISOString(), updated_by: user.id })
          .eq('key', 'battles_paused');

        await supabase
          .from('platform_state')
          .update({ value: 'false', updated_at: new Date().toISOString(), updated_by: user.id })
          .eq('key', 'economy_frozen');

        afterState = { maintenance_mode: false, battles_paused: false, economy_frozen: false };
        result = { success: true, message: 'Maintenance mode disabled. Platform fully operational.' };
        break;
      }

      case 'enforce_tiers_on': {
        beforeState = { enforce_tiers: false };
        severity = 'critical';

        await supabase
          .from('platform_state')
          .update({ value: 'true', updated_at: new Date().toISOString(), updated_by: user.id })
          .eq('key', 'enforce_tiers');

        afterState = { enforce_tiers: true };
        result = { success: true, message: 'Tier enforcement enabled. Only Silver+ barbers visible on map.' };
        break;
      }

      case 'enforce_tiers_off': {
        beforeState = { enforce_tiers: true };
        severity = 'normal';

        await supabase
          .from('platform_state')
          .update({ value: 'false', updated_at: new Date().toISOString(), updated_by: user.id })
          .eq('key', 'enforce_tiers');

        afterState = { enforce_tiers: false };
        result = { success: true, message: 'Tier enforcement disabled. All barbers visible (testing mode).' };
        break;
      }

      case 'tiers_enable': {
        beforeState = { tiers_enabled: false };
        severity = 'critical';

        await supabase
          .from('platform_state')
          .upsert({ key: 'tiers_enabled', value: 'true', updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' });

        afterState = { tiers_enabled: true };
        result = { success: true, message: 'Tier system ENABLED. Subscriptions, badges, and tier perks are live.' };
        break;
      }

      case 'tiers_disable': {
        beforeState = { tiers_enabled: true };
        severity = 'emergency';

        await supabase
          .from('platform_state')
          .upsert({ key: 'tiers_enabled', value: 'false', updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' });

        afterState = { tiers_enabled: false };
        result = { success: true, message: 'Tier system DISABLED. All tier UI hidden, all users treated as standard.' };
        break;
      }

      case 'challenge_stakes_enable': {
        beforeState = { challenge_stakes_enabled: false };
        severity = 'critical';

        await supabase
          .from('platform_state')
          .upsert({ key: 'challenge_stakes_enabled', value: 'true', updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' });

        afterState = { challenge_stakes_enabled: true };
        result = { success: true, message: 'Challenge stakes ENABLED. Barbers must lock BB to issue or accept challenges.' };
        break;
      }

      case 'challenge_stakes_disable': {
        beforeState = { challenge_stakes_enabled: true };
        severity = 'critical';

        await supabase
          .from('platform_state')
          .upsert({ key: 'challenge_stakes_enabled', value: 'false', updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' });

        afterState = { challenge_stakes_enabled: false };
        result = { success: true, message: 'Challenge stakes DISABLED. Barbers can challenge each other for free; viewer donations build the pot.' };
        break;
      }

      case 'quick_play_enable': {
        beforeState = { quick_play_enabled: false };
        severity = 'normal';
        await supabase
          .from('platform_state')
          .upsert({ key: 'quick_play_enabled', value: 'true', updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' });
        afterState = { quick_play_enabled: true };
        result = { success: true, message: 'Quick Play ENABLED. Barbers can challenge each other into unranked matches.' };
        break;
      }

      case 'quick_play_disable': {
        beforeState = { quick_play_enabled: true };
        severity = 'critical';
        await supabase
          .from('platform_state')
          .upsert({ key: 'quick_play_enabled', value: 'false', updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' });
        afterState = { quick_play_enabled: false };
        result = { success: true, message: 'Quick Play DISABLED. Challenge entry points hidden; in-flight challenges expire normally.' };
        break;
      }

      case 'quick_play_feed_enable': {
        beforeState = { quick_play_feed_publish: false };
        severity = 'normal';
        await supabase
          .from('platform_state')
          .upsert({ key: 'quick_play_feed_publish', value: 'true', updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' });
        afterState = { quick_play_feed_publish: true };
        result = { success: true, message: 'Quick Play matches will now be published to the watch feed.' };
        break;
      }

      case 'quick_play_feed_disable': {
        beforeState = { quick_play_feed_publish: true };
        severity = 'normal';
        await supabase
          .from('platform_state')
          .upsert({ key: 'quick_play_feed_publish', value: 'false', updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' });
        afterState = { quick_play_feed_publish: false };
        result = { success: true, message: 'Quick Play matches will NOT be published to the watch feed.' };
        break;
      }

      case 'dev_mode_enable': {
        beforeState = { dev_mode: false };
        severity = 'emergency';
        await supabase
          .from('platform_state')
          .upsert({ key: 'dev_mode', value: 'true', updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' });
        afterState = { dev_mode: true };
        result = { success: true, message: 'Developer Mode ENABLED. Tier limits bypassed platform-wide.' };
        break;
      }

      case 'dev_mode_disable': {
        beforeState = { dev_mode: true };
        severity = 'critical';
        await supabase
          .from('platform_state')
          .upsert({ key: 'dev_mode', value: 'false', updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' });
        afterState = { dev_mode: false };
        result = { success: true, message: 'Developer Mode DISABLED. Production gates active.' };
        break;

      case 'challenge_set_min_stake': {
        const newMin = Math.max(1, Math.floor(Number(min_stake_bb) || 0));
        if (!newMin) {
          throw new Error('min_stake_bb must be a positive integer');
        }

        const { data: prevRow } = await supabase
          .from('platform_state')
          .select('value')
          .eq('key', 'challenge_min_stake_bb')
          .maybeSingle();

        beforeState = { challenge_min_stake_bb: prevRow?.value ?? null };
        severity = 'normal';

        await supabase
          .from('platform_state')
          .upsert({ key: 'challenge_min_stake_bb', value: String(newMin), updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' });

        afterState = { challenge_min_stake_bb: String(newMin) };
        result = { success: true, message: `Minimum challenge stake set to ${newMin} BB.`, min_stake_bb: newMin };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log action (except read-only)
    if (!['get_status', 'get_platform_stats', 'get_audit_log'].includes(action)) {
      await supabase
        .from('sovereign_audit_log')
        .insert({
          sovereign_id: user.id,
          action_category: 'system',
          action_type: action,
          target_type: 'platform',
          target_id: 'global',
          before_state: beforeState,
          after_state: afterState,
          severity,
          notes: notes || reason
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sovereign system error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
