// @ts-expect-error Deno URL import is resolved at runtime in Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// @ts-expect-error Deno URL import is resolved at runtime in Supabase Edge Functions
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const inr = (n: unknown) => `Rs. ${Math.round(Number(n ?? 0)).toLocaleString("en-IN")}`;
const fmt = (n: unknown, d = 2) => Number(n ?? 0).toFixed(d);
type ReadingRow = {
  date: string;
  biogas_m3: number | string | null;
  methane_m3: number | string | null;
  kwh: number | string | null;
  lpg_cylinders: number | string | null;
  rupee_savings: number | string | null;
  co2_avoided: number | string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const url = new URL(req.url);
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    if (!from || !to) return new Response("from/to required", { status: 400, headers: corsHeaders });

    const { data: rows } = await supabase
      .from("biogas_readings")
      .select("date, biogas_m3, methane_m3, kwh, lpg_cylinders, rupee_savings, co2_avoided")
      .eq("user_id", user.id)
      .gte("date", from).lte("date", to)
      .order("date", { ascending: true });

    const safeRows: ReadingRow[] = (rows ?? []) as ReadingRow[];

    const totals = safeRows.reduce(
      (a, r) => ({
        biogas: a.biogas + Number(r.biogas_m3),
        kwh: a.kwh + Number(r.kwh),
        lpg: a.lpg + Number(r.lpg_cylinders),
        savings: a.savings + Number(r.rupee_savings),
        co2: a.co2 + Number(r.co2_avoided),
      }),
      { biogas: 0, kwh: 0, lpg: 0, savings: 0, co2: 0 },
    );

    const pdf = await PDFDocument.create();
    const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([595, 842]); // A4 in points
    const pageHeight = page.getHeight();
    const margin = 50;
    let y = pageHeight - margin;

    const line = (text: string, size = 10, color = rgb(0, 0, 0), bold = false) => {
      const activeFont = bold ? fontBold : fontRegular;
      if (y < margin + 20) {
        page = pdf.addPage([595, 842]);
        y = pageHeight - margin;
      }
      page.drawText(text, { x: margin, y, size, font: activeFont, color });
      y -= size + 6;
    };

    // Header
    line("BiogasIQ Monthly Report", 22, rgb(0.50, 0.47, 0.87), true);
    line(`Period: ${from} to ${to}`, 11, rgb(0.40, 0.40, 0.40));
    y -= 8;

    // Plant specs
    line("Plant Specifications", 13, rgb(0, 0, 0), true);
    line("- Capacity: 720 kg/day organic waste, serves 1,800 students");
    line("- Target biogas yield: 351 m3/day, methane content 60%");
    line("- Target daily energy: 210.6 kWh, LPG equivalent: 8.6 cylinders");
    y -= 8;

    // Summary
    line("Summary Totals", 13, rgb(0, 0, 0), true);
    const sumRows: [string, string][] = [
      ["Total biogas", `${fmt(totals.biogas)} m³`],
      ["Total energy", `${fmt(totals.kwh)} kWh`],
      ["LPG cylinders saved", `${fmt(totals.lpg)} cyl`],
      ["Total savings", inr(totals.savings)],
      ["CO2 avoided", `${fmt(totals.co2)} t`],
    ];
    sumRows.forEach(([l, v]) => {
      line(`${l}: ${v}`, 11, rgb(0.20, 0.20, 0.20));
    });
    y -= 8;

    // Daily breakdown
    line("Daily Breakdown", 13, rgb(0, 0, 0), true);
    line("Date | Biogas m3 | kWh | LPG | Saved (Rs) | CO2 (t)", 9, rgb(0.50, 0.50, 0.50), true);
    safeRows.forEach((r) => {
      line(
        `${String(r.date)} | ${fmt(r.biogas_m3)} | ${fmt(r.kwh)} | ${fmt(r.lpg_cylinders)} | ${inr(r.rupee_savings)} | ${fmt(r.co2_avoided)}`,
        9,
      );
    });

    if (!safeRows.length) {
      line("No readings logged in this period.", 11, rgb(0.60, 0.60, 0.60));
    }

    // Footer
    page.drawText(`Generated ${new Date().toISOString()} · BiogasIQ`, {
      x: margin,
      y: 24,
      size: 8,
      font: fontRegular,
      color: rgb(0.60, 0.60, 0.60),
    });

    const out = await pdf.save();

    return new Response(out, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="BiogasIQ-${from}-to-${to}.pdf"`,
      },
    });
  } catch (e) {
    console.error("reports-pdf error", e);
    return new Response(`Error: ${e instanceof Error ? e.message : "Unknown"}`, { status: 500, headers: corsHeaders });
  }
});
