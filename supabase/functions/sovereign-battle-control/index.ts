import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOVEREIGN_EMAIL = 'a1studios.film@gmail.com';

interface BattleRequest {
  action: 'force_status' | 'override_winner' | 'reset_votes' | 'force_forfeit' | 'get_battles' | 'get_battle_details';
  battle_id?: string;
  new_status?: string;
  winner_id?: string;
  forfeit_user_id?: string;
  reason?: string;
  notes?: string;
  status_filter?: string;
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

    const body: BattleRequest = await req.json();
    const { action, battle_id, new_status, winner_id, forfeit_user_id, reason, notes, status_filter, limit = 50, offset = 0 } = body;

    console.log(`Sovereign battle action: ${action} by ${user.email}`);

    let result: any = null;
    let beforeState: any = null;
    let afterState: any = null;

    switch (action) {
      case 'get_battles': {
        let query = supabase
          .from('battles')
          .select(`
            *,
            organizer:profiles!battles_organizer_id_fkey(display_name),
            barber1:profiles!battles_barber1_id_fkey(display_name),
            barber2:profiles!battles_barber2_id_fkey(display_name)
          `, { count: 'exact' })
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
        if (!battle_id) throw new Error('Battle ID required');

        const { data: battle } = await supabase
          .from('battles')
          .select(`
            *,
            organizer:profiles!battles_organizer_id_fkey(display_name, email),
            barber1:profiles!battles_barber1_id_fkey(display_name, email),
            barber2:profiles!battles_barber2_id_fkey(display_name, email)
          `)
          .eq('id', battle_id)
          .single();

        const { data: votes } = await supabase
          .from('battle_votes')
          .select('*')
          .eq('battle_id', battle_id);

        const { data: submissions } = await supabase
          .from('battle_submissions')
          .select('*')
          .eq('battle_id', battle_id);

        result = { battle, votes, submissions };
        break;
      }

      case 'force_status': {
        if (!battle_id || !new_status) throw new Error('Battle ID and new status required');

        const { data: battle } = await supabase
          .from('battles')
          .select('status, title')
          .eq('id', battle_id)
          .single();

        beforeState = { status: battle?.status };

        const { error: updateError } = await supabase
          .from('battles')
          .update({ 
            status: new_status,
            updated_at: new Date().toISOString()
          })
          .eq('id', battle_id);

        if (updateError) throw updateError;

        afterState = { status: new_status };
        result = { success: true, battle_title: battle?.title, old_status: battle?.status, new_status };
        break;
      }

      case 'override_winner': {
        if (!battle_id || !winner_id) throw new Error('Battle ID and winner ID required');

        const { data: battle } = await supabase
          .from('battles')
          .select('winner_id, status, title')
          .eq('id', battle_id)
          .single();

        beforeState = { winner_id: battle?.winner_id, status: battle?.status };

        const { error: updateError } = await supabase
          .from('battles')
          .update({ 
            winner_id: winner_id,
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', battle_id);

        if (updateError) throw updateError;

        afterState = { winner_id: winner_id, status: 'completed' };
        result = { success: true, battle_title: battle?.title };
        break;
      }

      case 'reset_votes': {
        if (!battle_id) throw new Error('Battle ID required');

        const { data: votes, count } = await supabase
          .from('battle_votes')
          .select('*', { count: 'exact' })
          .eq('battle_id', battle_id);

        beforeState = { vote_count: count };

        const { error: deleteError } = await supabase
          .from('battle_votes')
          .delete()
          .eq('battle_id', battle_id);

        if (deleteError) throw deleteError;

        // Reset vote counts on battle
        await supabase
          .from('battles')
          .update({ vote_count1: 0, vote_count2: 0 })
          .eq('id', battle_id);

        afterState = { vote_count: 0 };
        result = { success: true, votes_deleted: count };
        break;
      }

      case 'force_forfeit': {
        if (!battle_id || !forfeit_user_id) throw new Error('Battle ID and forfeit user ID required');

        const { data: battle } = await supabase
          .from('battles')
          .select('barber1_id, barber2_id, status, title')
          .eq('id', battle_id)
          .single();

        beforeState = { status: battle?.status, forfeit_winner_id: null };

        // Determine winner (opposite of forfeiter)
        const winnerId = battle?.barber1_id === forfeit_user_id 
          ? battle?.barber2_id 
          : battle?.barber1_id;

        const { error: updateError } = await supabase
          .from('battles')
          .update({ 
            status: 'completed',
            winner_id: winnerId,
            forfeit_winner_id: winnerId,
            forfeit_reason: reason || 'Sovereign forced forfeit',
            updated_at: new Date().toISOString()
          })
          .eq('id', battle_id);

        if (updateError) throw updateError;

        afterState = { status: 'completed', forfeit_winner_id: winnerId };
        result = { success: true, battle_title: battle?.title, winner_id: winnerId };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log action
    if (!['get_battles', 'get_battle_details'].includes(action)) {
      await supabase
        .from('sovereign_audit_log')
        .insert({
          sovereign_id: user.id,
          action_category: 'battle',
          action_type: action,
          target_type: 'battle',
          target_id: battle_id,
          before_state: beforeState,
          after_state: afterState,
          severity: ['override_winner', 'force_forfeit'].includes(action) ? 'critical' : 'normal',
          notes: notes || reason
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sovereign battle error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
