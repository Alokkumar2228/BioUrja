import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Bot, User as UserIcon, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Msg { role: "user" | "assistant"; content: string }

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const Advisor = () => {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("chat_history")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => setMessages((data as Msg[]) ?? []));
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setStreaming(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ messages: newMsgs.slice(-10) }),
      });
      if (!resp.ok || !resp.body) {
        if (resp.status === 429) throw new Error("Rate limit reached. Try again in a moment.");
        if (resp.status === 402) throw new Error("AI credits exhausted. Add funds in Settings → Workspace → Usage.");
        throw new Error("Failed to start stream");
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e: any) {
      toast.error(e.message ?? "Chat failed");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Advisor</h1>
          <p className="text-sm text-muted-foreground">Your expert assistant for plant performance, troubleshooting, and savings.</p>
        </div>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden border-border/60 bg-gradient-card">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <Bot className="mb-2 h-10 w-10 text-primary" />
              <p className="font-medium text-foreground">Ask me anything about your plant</p>
              <p className="mt-1 max-w-md text-sm">Try: "How can I increase methane yield?" or "Why was today's output low?"</p>
            </div>
          )}
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} />
          ))}
          {streaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="flex gap-1 rounded-2xl bg-secondary px-4 py-3">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-current" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-current" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-current" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/60 p-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask about yield, troubleshooting, savings…"
              rows={1}
              className="min-h-11 resize-none"
              disabled={streaming}
            />
            <Button onClick={send} disabled={streaming || !input.trim()} className="bg-gradient-primary px-4 hover:opacity-90">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

const Bubble = ({ msg }: { msg: Msg }) => {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-accent/20 text-accent" : "bg-primary/15 text-primary"}`}>
        {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`prose prose-invert max-w-[80%] rounded-2xl px-4 py-3 text-sm ${isUser ? "bg-gradient-primary text-primary-foreground" : "bg-secondary"}`}>
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>
    </div>
  );
};

export default Advisor;
