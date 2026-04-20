// Daily 23:00 — checks each user's yield vs 7-day avg and emails if dropped > 15%.
// Called by pg_cron. Uses service role key to scan all users.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date().toISOString().slice(0, 10);
  const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  // Get distinct users with readings recently
  const { data: recent, error } = await supabase
    .from("biogas_readings")
    .select("user_id, date, biogas_m3")
    .gte("date", sevenAgo);
  if (error) {
    console.error("query error", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  const byUser = new Map<string, { today: number | null; prior: number[] }>();
  for (const r of recent ?? []) {
    const e = byUser.get(r.user_id) ?? { today: null, prior: [] };
    if (r.date === today) e.today = Number(r.biogas_m3);
    else e.prior.push(Number(r.biogas_m3));
    byUser.set(r.user_id, e);
  }

  const alerts: Array<{ userId: string; today: number; avg: number; dropPct: number }> = [];
  for (const [userId, e] of byUser) {
    if (e.today == null || e.prior.length === 0) continue;
    const avg = e.prior.reduce((s, v) => s + v, 0) / e.prior.length;
    if (avg > 0 && e.today < avg * 0.85) {
      alerts.push({ userId, today: e.today, avg, dropPct: ((avg - e.today) / avg) * 100 });
    }
  }

  let sent = 0;
  for (const a of alerts) {
    // Get email
    const { data: u } = await supabase.auth.admin.getUserById(a.userId);
    const email = u?.user?.email;
    if (!email) continue;

    try {
      const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: email,
          subject: `BiogasIQ Alert — Yield dropped by ${a.dropPct.toFixed(1)}%`,
          html: `
            <h2 style="color:#7F77DD">BiogasIQ Yield Alert</h2>
            <p>Today's biogas output dropped <strong>${a.dropPct.toFixed(1)}%</strong> below the 7-day average.</p>
            <ul>
              <li>Today: <strong>${a.today.toFixed(2)} m³</strong></li>
              <li>7-day avg: <strong>${a.avg.toFixed(2)} m³</strong></li>
            </ul>
            <p><strong>Suggested actions:</strong></p>
            <ul>
              <li>Check digester pH (target 6.8–7.2) and temperature (35–40°C)</li>
              <li>Verify feedstock C:N ratio (~25–30:1)</li>
              <li>Inspect agitator and gas outlet for blockages</li>
              <li>Review recent feedstock mix — high paper % can slow digestion</li>
            </ul>
            <p style="color:#888;font-size:12px">— BiogasIQ automated alert</p>
          `,
        }),
      });
      if (resp.ok) sent++;
      else console.error("email failed", await resp.text());
    } catch (e) {
      console.error("email error", e);
    }
  }

  return new Response(JSON.stringify({ checked: byUser.size, alertsTriggered: alerts.length, emailsSent: sent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
