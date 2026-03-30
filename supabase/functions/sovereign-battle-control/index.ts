import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOVEREIGN_EMAIL = Deno.env.get('SOVEREIGN_EMAIL') || 'a1studios.film@gmail.com';

interface BattleRequest {
  action: string;
  battle_id?: string;
  new_status?: string;
  winner_id?: string;
  forfeit_user_id?: string;
  reason?: string;
  notes?: string;
  status_filter?: string;
  limit?: number;
  offset?: number;
  // create/edit battle
  battle_data?: Record<string, any>;
  // queue management
  queue_entry_id?: string;
  queue_entry_ids?: string[];
  queue_status?: string;
  category_filter?: string;
  // tournament management
  tournament_id?: string;
  tournament_data?: Record<string, any>;
  phase_data?: Record<string, any>;
  num_participants?: number;
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
    const body: BattleRequest = await req.json();
    const { action, battle_id, new_status, winner_id, forfeit_user_id, reason, notes, status_filter, limit = 50, offset = 0 } = body;

    console.log(`Sovereign battle action: ${action} by ${user.email}`);

    let result: any = null;
    let beforeState: any = null;
    let afterState: any = null;
    let shouldLog = true;

    switch (action) {
      // ========== BATTLE READ ==========
      case 'get_battles': {
        shouldLog = false;
        let query = supabase
          .from('battles')
          .select(`*, organizer:profiles!battles_organizer_id_fkey(display_name), barber1:profiles!battles_barber1_id_fkey(display_name), barber2:profiles!battles_barber2_id_fkey(display_name)`, { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (status_filter && status_filter !== 'all') {
          query = query.eq('status', status_filter);
        }

        const { data: battles, count } = await query;
        result = { battles, total: count };
        break;
      }

      case 'get_battle_details': {
        shouldLog = false;
        if (!battle_id) throw new Error('Battle ID required');

        const { data: battle } = await supabase
          .from('battles')
          .select(`*, organizer:profiles!battles_organizer_id_fkey(display_name, email), barber1:profiles!battles_barber1_id_fkey(display_name, email), barber2:profiles!battles_barber2_id_fkey(display_name, email)`)
          .eq('id', battle_id)
          .single();

        const { data: votes } = await supabase.from('battle_votes').select('*').eq('battle_id', battle_id);
        const { data: submissions } = await supabase.from('battle_submissions').select('*').eq('battle_id', battle_id);

        result = { battle, votes, submissions };
        break;
      }

      // ========== BATTLE WRITE ==========
      case 'force_status': {
        if (!battle_id || !new_status) throw new Error('Battle ID and new status required');

        const { data: battle } = await supabase.from('battles').select('status, title').eq('id', battle_id).single();
        beforeState = { status: battle?.status };

        const { error: updateError } = await supabase.from('battles')
          .update({ status: new_status, updated_at: new Date().toISOString() })
          .eq('id', battle_id);
        if (updateError) throw updateError;

        afterState = { status: new_status };
        result = { success: true, battle_title: battle?.title, old_status: battle?.status, new_status };
        break;
      }

      case 'override_winner': {
        if (!battle_id || !winner_id) throw new Error('Battle ID and winner ID required');

        const { data: battle } = await supabase.from('battles').select('winner_id, status, title').eq('id', battle_id).single();
        beforeState = { winner_id: battle?.winner_id, status: battle?.status };

        const { error: updateError } = await supabase.from('battles')
          .update({ winner_id, status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', battle_id);
        if (updateError) throw updateError;

        afterState = { winner_id, status: 'completed' };
        result = { success: true, battle_title: battle?.title };
        break;
      }

      case 'reset_votes': {
        if (!battle_id) throw new Error('Battle ID required');

        const { count } = await supabase.from('battle_votes').select('*', { count: 'exact' }).eq('battle_id', battle_id);
        beforeState = { vote_count: count };

        const { error: deleteError } = await supabase.from('battle_votes').delete().eq('battle_id', battle_id);
        if (deleteError) throw deleteError;

        await supabase.from('battles').update({ vote_count1: 0, vote_count2: 0 }).eq('id', battle_id);

        afterState = { vote_count: 0 };
        result = { success: true, votes_deleted: count };
        break;
      }

      case 'force_forfeit': {
        if (!battle_id || !forfeit_user_id) throw new Error('Battle ID and forfeit user ID required');

        const { data: battle } = await supabase.from('battles').select('barber1_id, barber2_id, status, title').eq('id', battle_id).single();
        beforeState = { status: battle?.status };

        const winnerId = battle?.barber1_id === forfeit_user_id ? battle?.barber2_id : battle?.barber1_id;

        const { error: updateError } = await supabase.from('battles')
          .update({ status: 'completed', winner_id: winnerId, forfeit_winner_id: winnerId, forfeit_reason: reason || 'Sovereign forced forfeit', updated_at: new Date().toISOString() })
          .eq('id', battle_id);
        if (updateError) throw updateError;

        afterState = { status: 'completed', forfeit_winner_id: winnerId };
        result = { success: true, battle_title: battle?.title, winner_id: winnerId };
        break;
      }

      case 'create_battle': {
        const data = body.battle_data;
        if (!data) throw new Error('battle_data required');

        const { data: battle, error } = await supabase.from('battles')
          .insert({ organizer_id: user.id, ...data })
          .select()
          .single();
        if (error) throw error;

        afterState = { battle_id: battle.id, status: battle.status };
        result = { success: true, battle };
        break;
      }

      case 'edit_battle': {
        if (!battle_id) throw new Error('Battle ID required');
        const data = body.battle_data;
        if (!data) throw new Error('battle_data required');

        const { data: before } = await supabase.from('battles').select('*').eq('id', battle_id).single();
        beforeState = { title: before?.title, status: before?.status };

        const { error } = await supabase.from('battles')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', battle_id);
        if (error) throw error;

        afterState = data;
        result = { success: true, battle_id };
        break;
      }

      case 'delete_battle': {
        if (!battle_id) throw new Error('Battle ID required');

        const { data: before } = await supabase.from('battles').select('title, status').eq('id', battle_id).single();
        beforeState = { title: before?.title, status: before?.status };

        // Cascade delete related data
        await supabase.from('battle_votes').delete().eq('battle_id', battle_id);
        await supabase.from('battle_submissions').delete().eq('battle_id', battle_id);
        await supabase.from('battle_participants').delete().eq('battle_id', battle_id);
        await supabase.from('battle_chat_messages').delete().eq('battle_id', battle_id);
        await supabase.from('battle_reactions').delete().eq('battle_id', battle_id);
        await supabase.from('battle_donations').delete().eq('battle_id', battle_id);

        const { error } = await supabase.from('battles').delete().eq('id', battle_id);
        if (error) throw error;

        afterState = { deleted: true };
        result = { success: true, deleted_title: before?.title };
        break;
      }

      // ========== TOURNAMENT QUEUE ==========
      case 'get_queue': {
        shouldLog = false;
        let query = supabase
          .from('tournament_queue')
          .select(`*, profile:profiles!tournament_queue_user_id_fkey(display_name, avatar_url)`, { count: 'exact' })
          .order('queue_timestamp', { ascending: true });

        if (body.queue_status && body.queue_status !== 'all') {
          query = query.eq('status', body.queue_status);
        }
        if (body.category_filter && body.category_filter !== 'all') {
          query = query.eq('category', body.category_filter);
        }

        const { data: entries, count } = await query;
        result = { entries, total: count };
        break;
      }

      case 'remove_queue_entry': {
        const entryId = body.queue_entry_id;
        if (!entryId) throw new Error('queue_entry_id required');

        const { data: before } = await supabase.from('tournament_queue').select('*').eq('id', entryId).single();
        beforeState = before;

        const { error } = await supabase.from('tournament_queue').delete().eq('id', entryId);
        if (error) throw error;

        afterState = { deleted: true };
        result = { success: true };
        break;
      }

      case 'update_queue_status': {
        const entryId = body.queue_entry_id;
        if (!entryId || !body.queue_status) throw new Error('queue_entry_id and queue_status required');

        const { data: before } = await supabase.from('tournament_queue').select('status').eq('id', entryId).single();
        beforeState = { status: before?.status };

        const { error } = await supabase.from('tournament_queue').update({ status: body.queue_status }).eq('id', entryId);
        if (error) throw error;

        afterState = { status: body.queue_status };
        result = { success: true };
        break;
      }

      case 'force_match': {
        const ids = body.queue_entry_ids;
        if (!ids || ids.length !== 2) throw new Error('Exactly 2 queue_entry_ids required');

        const { data: entries } = await supabase.from('tournament_queue').select('*').in('id', ids);
        if (!entries || entries.length !== 2) throw new Error('Could not find both queue entries');

        const [e1, e2] = entries;
        beforeState = { entry1: e1, entry2: e2 };

        // Create battle
        const { data: battle, error: battleError } = await supabase.from('battles').insert({
          organizer_id: user.id,
          barber1_id: e1.user_id,
          barber2_id: e2.user_id,
          category: e1.category,
          title: `${e1.category} Tournament Match (Sovereign)`,
          status: 'upcoming',
          is_tournament_match: true,
          currency: 'USD',
          prize_amount: 0,
        }).select().single();
        if (battleError) throw battleError;

        // Update queue
        await supabase.from('tournament_queue').update({ status: 'matched', matched_battle_id: battle.id }).in('id', ids);

        afterState = { battle_id: battle.id };
        result = { success: true, battle };
        break;
      }

      // ========== TOURNAMENTS ==========
      case 'get_tournaments': {
        shouldLog = false;
        const { data: tournaments, count } = await supabase
          .from('tournaments')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        result = { tournaments, total: count };
        break;
      }

      case 'create_tournament': {
        const data = body.tournament_data;
        if (!data) throw new Error('tournament_data required');

        const { data: tournament, error } = await supabase.from('tournaments').insert(data).select().single();
        if (error) throw error;

        afterState = { tournament_id: tournament.id };
        result = { success: true, tournament };
        break;
      }

      case 'edit_tournament': {
        const tid = body.tournament_id;
        const data = body.tournament_data;
        if (!tid || !data) throw new Error('tournament_id and tournament_data required');

        const { data: before } = await supabase.from('tournaments').select('*').eq('id', tid).single();
        beforeState = { name: before?.name, status: before?.status };

        const { error } = await supabase.from('tournaments').update({ ...data, updated_at: new Date().toISOString() }).eq('id', tid);
        if (error) throw error;

        afterState = data;
        result = { success: true, tournament_id: tid };
        break;
      }

      case 'get_tournament_details': {
        shouldLog = false;
        const tid = body.tournament_id;
        if (!tid) throw new Error('tournament_id required');

        const { data: tournament } = await supabase.from('tournaments').select('*').eq('id', tid).single();
        const { data: phases } = await supabase.from('tournament_phases').select('*').eq('tournament_id', tid).order('phase_order');
        const { data: standings } = await supabase.from('tournament_standings').select('*, barber:profiles!tournament_standings_barber_id_fkey(display_name)').eq('tournament_id', tid).order('rank');
        const { data: matches } = await supabase.from('bracket_matches').select('*').eq('tournament_id', tid).order('round_number, match_number');

        result = { tournament, phases, standings, matches };
        break;
      }

      case 'create_phase': {
        const tid = body.tournament_id;
        const data = body.phase_data;
        if (!tid || !data) throw new Error('tournament_id and phase_data required');

        const { data: phase, error } = await supabase.from('tournament_phases').insert({ tournament_id: tid, ...data }).select().single();
        if (error) throw error;

        afterState = { phase_id: phase.id };
        result = { success: true, phase };
        break;
      }

      case 'generate_bracket': {
        const tid = body.tournament_id;
        const numP = body.num_participants || 16;
        if (!tid) throw new Error('tournament_id required');

        const { error } = await supabase.rpc('generate_elimination_bracket', { tournament_id_param: tid, num_participants: numP });
        if (error) throw error;

        afterState = { bracket_generated: true, num_participants: numP };
        result = { success: true };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Audit log
    if (shouldLog) {
      await supabase.from('sovereign_audit_log').insert({
        sovereign_id: user.id,
        action_category: action.includes('tournament') || action.includes('queue') || action.includes('phase') || action.includes('bracket') ? 'tournament' : 'battle',
        action_type: action,
        target_type: action.includes('tournament') || action.includes('phase') || action.includes('bracket') ? 'tournament' : action.includes('queue') ? 'queue' : 'battle',
        target_id: battle_id || body.tournament_id || body.queue_entry_id,
        before_state: beforeState,
        after_state: afterState,
        severity: ['delete_battle', 'override_winner', 'force_forfeit', 'force_match'].includes(action) ? 'critical' : 'normal',
        notes: notes || reason
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || 'Internal error';
    console.error('Sovereign battle error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
