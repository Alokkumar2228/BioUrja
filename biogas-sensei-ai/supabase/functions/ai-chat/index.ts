/// <reference lib="dom" />
// @ts-expect-error Deno URL import is resolved at runtime in Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("PROJECT_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
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
      .limit(3);

    const systemPrompt = `You are BiogasIQ, a biogas plant advisor.
Plant targets: 720 kg/day input, 351 m3/day biogas, 60% methane, 210.6 kWh/day, 8.6 LPG/day, Rs 16206/day savings.
Last 3 days readings: ${JSON.stringify(recent ?? [])}
Respond concisely with practical troubleshooting and performance advice. Use markdown.`;

    // Save user message
    const userMsg = messages[messages.length - 1];
    if (userMsg?.role === "user" && typeof userMsg.content === "string") {
      await supabase.from("chat_history").insert({
        user_id: user.id, role: "user", content: userMsg.content,
      });
    } 

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);
    const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash";

    const geminiContents = (messages as ChatMessage[])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
    const aiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: geminiContents,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "Rate limited" }, 429);
      if (aiResp.status === 402) return json({ error: "Credits exhausted" }, 402);
      const t = await aiResp.text();
      console.error("Gemini API", aiResp.status, t);
      return json({ error: "Gemini API error" }, 500);
    }

    // Convert Gemini SSE chunks to OpenAI-like SSE format expected by frontend.
    let assistantText = "";
    const stream = new ReadableStream({
      async start(controller) {
        const reader = aiResp.body!.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buf = "";
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let nl;
            while ((nl = buf.indexOf("\n")) !== -1) {
              let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const jsonChunk = line.slice(6).trim();
              if (!jsonChunk || jsonChunk === "[DONE]") continue;
              try {
                const p = JSON.parse(jsonChunk);
                const c = p.candidates?.[0]?.content?.parts?.[0]?.text;
                if (typeof c === "string" && c.length > 0) {
                  assistantText += c;
                  const out = `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`;
                  controller.enqueue(encoder.encode(out));
                }
              } catch { /* partial */ }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
