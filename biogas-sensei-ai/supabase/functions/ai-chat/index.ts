/// <reference lib="dom" />
// @ts-expect-error Deno URL import is resolved at runtime in Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) return json({ error: "messages required" }, 400);

    const { data: recent } = await supabase
      .from("biogas_readings")
      .select("date, biogas_m3, methane_m3, kwh, lpg_cylinders, rupee_savings, co2_avoided")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(7);

    const systemPrompt = `You are BiogasIQ, an expert biogas plant advisor
     embedded in a campus waste-to-energy management system. The plant serves 
     1,800 students and processes 
    organic waste via anaerobic digestion.

Plant targets:
- Daily input: 720 kg/day
- Volatile solids: 540 kg VS/day
- Biogas yield: 351 m³/day
- Methane: 210.6 m³/day (60% content)
- Energy: 210.6 kWh/day
- LPG equivalent: 8.6 cylinders/day
- Daily savings: ₹16,206

Last 7 days actual readings:
${JSON.stringify(recent ?? [], null, 2)}

Answer questions about plant performance, troubleshooting low yield, optimizing digester conditions, sustainability impact, and cost savings. Be concise, technical, and practical. Use markdown for formatting.`;

    // Save user message
    const userMsg = messages[messages.length - 1];
    if (userMsg?.role === "user" && typeof userMsg.content === "string") {
      await supabase.from("chat_history").insert({
        user_id: user.id, role: "user", content: userMsg.content,
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);
    const aiGatewayUrl = Deno.env.get("AI_GATEWAY_URL");
    if (!aiGatewayUrl) return json({ error: "AI gateway URL not configured" }, 500);

    const aiResp = await fetch(aiGatewayUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "Rate limited" }, 429);
      if (aiResp.status === 402) return json({ error: "Credits exhausted" }, 402);
      const t = await aiResp.text();
      console.error("AI gateway", aiResp.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    // Tee the stream: forward to client + accumulate to save assistant reply
    let assistantText = "";
    const stream = new ReadableStream({
      async start(controller) {
        const reader = aiResp.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            controller.enqueue(value);
            buf += decoder.decode(value, { stream: true });
            let nl;
            while ((nl = buf.indexOf("\n")) !== -1) {
              let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6).trim();
              if (json === "[DONE]") continue;
              try {
                const p = JSON.parse(json);
                const c = p.choices?.[0]?.delta?.content;
                if (c) assistantText += c;
              } catch { /* partial */ }
            }
          }
        } finally {
          controller.close();
          if (assistantText) {
            await supabase.from("chat_history").insert({
              user_id: user.id, role: "assistant", content: assistantText,
            });
          }
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
