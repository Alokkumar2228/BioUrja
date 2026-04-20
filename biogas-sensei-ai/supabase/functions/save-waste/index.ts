import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function calculate(foodKg: number, gardenKg: number, paperKg: number) {
  const totalWaste = foodKg + gardenKg + paperKg;
  const volatileSolids = totalWaste * 0.75;
  const biogasM3 = volatileSolids * 0.65;
  const methaneM3 = biogasM3 * 0.6;
  const kWh = biogasM3 * 0.6;
  const lpgCylinders = kWh / 24.5;
  const rupeeSavings = lpgCylinders * 1884.5;
  const co2Avoided = lpgCylinders * 0.128;
  return { totalWaste, volatileSolids, biogasM3, methaneM3, kWh, lpgCylinders, rupeeSavings, co2Avoided };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const date = String(body.date ?? "").slice(0, 10);
    const food = Number(body.foodKg), garden = Number(body.gardenKg), paper = Number(body.paperKg);
    if (!date || [food, garden, paper].some((v) => isNaN(v) || v < 0)) {
      return json({ error: "Invalid input" }, 400);
    }
    if (food + garden + paper === 0) return json({ error: "Total waste must be > 0" }, 400);

    const { data: log, error: e1 } = await supabase
      .from("waste_logs")
      .insert({ user_id: user.id, date, food_kg: food, garden_kg: garden, paper_kg: paper })
      .select()
      .single();
    if (e1) return json({ error: e1.message }, 400);

    const c = calculate(food, garden, paper);
    const { data: reading, error: e2 } = await supabase
      .from("biogas_readings")
      .insert({
        user_id: user.id,
        waste_log_id: log.id,
        date,
        total_waste: c.totalWaste,
        volatile_solids: c.volatileSolids,
        biogas_m3: c.biogasM3,
        methane_m3: c.methaneM3,
        kwh: c.kWh,
        lpg_cylinders: c.lpgCylinders,
        rupee_savings: c.rupeeSavings,
        co2_avoided: c.co2Avoided,
      })
      .select()
      .single();
    if (e2) return json({ error: e2.message }, 400);

    return json({ log, reading });
  } catch (e) {
    console.error("save-waste error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
