import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAuthorizedCron } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twentyThreeHoursFromNow = new Date(now.getTime() + 23 * 60 * 60 * 1000);

    // Fetch battles starting in ~1 hour (between 50-70 min from now)
    const { data: oneHourBattles } = await supabase
      .from("battles")
      .select("id, title, starts_at, barber1_id, barber2_id")
      .in("status", ["upcoming", "scheduled", "active"])
      .gte("starts_at", new Date(now.getTime() + 50 * 60 * 1000).toISOString())
      .lte("starts_at", new Date(now.getTime() + 70 * 60 * 1000).toISOString());

    // Fetch battles starting in ~24 hours (between 23-25 hours from now)
    const { data: dayBattles } = await supabase
      .from("battles")
      .select("id, title, starts_at, barber1_id, barber2_id")
      .in("status", ["upcoming", "scheduled", "active"])
      .gte("starts_at", twentyThreeHoursFromNow.toISOString())
      .lte("starts_at", new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString());

    let notificationsSent = 0;

    const sendReminder = async (battle: any, timeLabel: string) => {
      // Get user_ids from barber_profiles (barber1_id / barber2_id are barber_profiles.id)
      const barberProfileIds = [battle.barber1_id, battle.barber2_id].filter(Boolean);
      if (barberProfileIds.length === 0) return;

      const { data: barberProfiles } = await supabase
        .from("barber_profiles")
        .select("user_id")
        .in("id", barberProfileIds);

      if (!barberProfiles) return;

      for (const bp of barberProfiles) {
        await supabase.from("notifications").insert({
          user_id: bp.user_id,
          type: "battle_reminder",
          title: `⏰ Battle in ${timeLabel}!`,
          message: `Your battle "${battle.title}" starts in ${timeLabel}. Get ready!`,
          data: { battle_id: battle.id, reminder_type: timeLabel },
        });
        notificationsSent++;
      }
    };

    // Send 1-hour reminders
    for (const battle of oneHourBattles || []) {
      await sendReminder(battle, "1 hour");
    }

    // Send 24-hour reminders
    for (const battle of dayBattles || []) {
      await sendReminder(battle, "24 hours");
    }

    console.log(`Battle reminders sent: ${notificationsSent}`);

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: notificationsSent,
        one_hour_battles: oneHourBattles?.length || 0,
        day_battles: dayBattles?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in battle-reminders:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
