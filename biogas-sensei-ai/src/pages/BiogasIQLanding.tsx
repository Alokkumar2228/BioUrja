import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Auth from "./Auth.tsx"


interface KPICardProps {
  label: string;
  value: string;
  unit: string;
  color: string;
  index: number;
}

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  accent: string;
  index: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface ImpactStat {
  icon: string;
  value: string;
  label: string;
  color: string;
}

interface MetricItem {
  value: string;
  label: string;
  color?: string;
}

interface Step {
  num: string;
  title: string;
  desc: string;
}


const BAR_HEIGHTS: number[] = [62, 74, 58, 85, 70, 92, 78, 88, 65, 96, 80, 91, 75, 99];
const BAR_COLORS: string[] = [
  "#7F77DD","#7F77DD","#7F77DD","#7F77DD","#7F77DD","#7F77DD","#7F77DD",
  "#D4537E","#7F77DD","#7F77DD","#7F77DD","#7F77DD","#1D9E75","#1D9E75",
];

const METRICS: MetricItem[] = [
  { value: "351 m³", label: "Target daily biogas" },
  { value: "210.6 kWh", label: "Energy per day" },
  { value: "8.6 cyl", label: "LPG cylinders saved" },
  { value: "₹16,206", label: "Daily savings", color: "#D4537E" },
];

const FEATURES: Omit<FeatureCardProps, "index">[] = [
  { icon: "📊", title: "Smart waste logging", description: "Log food, garden, and paper waste with live biogas projections shown before you submit — powered by the same formula the server uses.", accent: "#7F77DD" },
  { icon: "🤖", title: "AI advisor", description: "Ask anything about digester performance, troubleshooting low yield, or sustainability targets. Backed by your last 7 real readings.", accent: "#7F77DD" },
  { icon: "🔔", title: "Automated alerts", description: "Node-cron job runs at 11 PM daily. If yield drops 15% below the 7-day average, an email alert fires to the admin automatically.", accent: "#D4537E" },
  { icon: "📄", title: "PDF reports", description: "Generate date-range reports with daily breakdowns. PDFKit streams directly — no buffering. Download with one click.", accent: "#1D9E75" },
  { icon: "⚡", title: "Live dashboard", description: "Recharts line, bar, and pie charts. KPI cards show today's biogas m³, kWh, LPG saved, and ₹ savings — updated daily.", accent: "#EF9F27" },
  { icon: "🔒", title: "Role-based access", description: "Admin and operator roles with JWT auth. Anthropic API key never reaches the browser — all Claude calls go through Express.", accent: "#D4537E" },
];

const STEPS: Step[] = [
  { num: "01", title: "Log waste", desc: "Enter food, garden, and paper kg. Live preview shows projected biogas before you hit submit." },
  { num: "02", title: "Calculate yield", desc: "Server runs anaerobic digestion formulas and saves a BiogasReading to MongoDB Atlas." },
  { num: "03", title: "Get insights", desc: "Dashboard updates, AI advisor uses fresh data, alerts fire if yield drops below threshold." },
];

const CHAT_MESSAGES: ChatMessage[] = [
  { role: "user", text: "Why is our biogas yield 18% lower than yesterday?" },
  { role: "assistant", text: "Based on your last 7 readings, today's volatile solids dropped to 480 kg vs the 540 kg target. Likely causes: food waste input was only 290 kg. Check kitchen segregation and verify digester temperature — a drop below 35°C reduces methanogenesis by up to 20%." },
  { role: "user", text: "What's the ideal pH range for our digester?" },
  { role: "assistant", text: "Optimal range is 6.8–7.2. Below 6.5 indicates acid accumulation — reduce feed rate by 20% and add lime slurry to buffer..." },
];

const IMPACT_STATS: ImpactStat[] = [
  { icon: "🌱", value: "1.1 kg", label: "CO₂ avoided per cylinder replaced", color: "#1D9E75" },
  { icon: "⚡", value: "76,869 kWh", label: "Energy generated per year", color: "#7F77DD" },
  { icon: "🔧", value: "3,139", label: "LPG cylinders replaced annually", color: "#D4537E" },
  { icon: "💰", value: "₹59.1L", label: "Annual savings for the campus", color: "#EF9F27" },
];


function KPICard({ label, value, unit, color, index }: KPICardProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 120 + 300);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      style={{
        background: "#0D1B2A",
        border: "0.5px solid rgba(255,255,255,0.09)",
        borderRadius: 8,
        padding: "10px 12px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color, fontFamily: "'IBM Plex Mono', monospace" }}>
        {value}
        <span style={{ fontSize: 10, marginLeft: 3, color: "rgba(255,255,255,0.4)" }}>{unit}</span>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, accent, index }: FeatureCardProps) {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 80 + 200);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.03)" : "#111D2E",
        border: `0.5px solid ${hovered ? accent + "55" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 12,
        padding: "20px 18px",
        cursor: "default",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease, background 0.25s ease, border-color 0.25s ease",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: accent + "22",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 17,
          marginBottom: 12,
          border: `0.5px solid ${accent}33`,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 6, letterSpacing: "-0.01em" }}>
        {title}
      </div>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, margin: 0 }}>
        {description}
      </p>
    </div>
  );
}

function DashboardMockup() {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        background: "#111D2E",
        border: "0.5px solid rgba(255,255,255,0.1)",
        borderRadius: 14,
        padding: 16,
        opacity: animate ? 1 : 0,
        transform: animate ? "translateX(0) scale(1)" : "translateX(20px) scale(0.97)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'IBM Plex Mono', monospace" }}>
          BioUrja / dashboard
        </span>
        <span style={{ fontSize: 9, color: "#1D9E75", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1D9E75", display: "inline-block" }} />
          Live
        </span>
      </div>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <KPICard label="Biogas" value="347.2" unit="m³" color="#7F77DD" index={0} />
        <KPICard label="Energy" value="208.3" unit="kWh" color="#1D9E75" index={1} />
        <KPICard label="LPG" value="8.5" unit="cyl" color="#EF9F27" index={2} />
        <KPICard label="Saved" value="₹16,018" unit="" color="#D4537E" index={3} />
      </div>

      {/* Chart Area */}
      <div style={{ background: "#0D1B2A", borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.05em" }}>
          BIOGAS YIELD — LAST 14 DAYS (m³)
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
          {BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                background: BAR_COLORS[i],
                borderRadius: "3px 3px 0 0",
                opacity: animate ? 0.88 : 0,
                transform: animate ? "scaleY(1)" : "scaleY(0)",
                transformOrigin: "bottom",
                transition: `opacity 0.4s ease ${i * 40}ms, transform 0.5s ease ${i * 40}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatShowcase() {
  return (
    <div style={{ background: "#111D2E", border: "0.5px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: 18, flex: 1 }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1D9E75", display: "inline-block" }} />
        AI ADVISOR — LIVE SESSION
      </div>
      {CHAT_MESSAGES.map((m, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 12, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: m.role === "assistant" ? "rgba(127,119,221,0.25)" : "rgba(212,83,126,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              flexShrink: 0,
              color: m.role === "assistant" ? "#A09AF0" : "#D4537E",
              fontWeight: 600,
            }}
          >
            {m.role === "assistant" ? "🤖" : "U"}
          </div>
          <div
            style={{
              background: "#0D1B2A",
              border: `0.5px solid rgba(255,255,255,0.07)`,
              borderLeft: m.role === "assistant" ? "2px solid #7F77DD" : "0.5px solid rgba(255,255,255,0.07)",
              borderRadius: 8,
              padding: "8px 11px",
              fontSize: 11,
              color: "rgba(255,255,255,0.8)",
              lineHeight: 1.6,
              maxWidth: "82%",
            }}
          >
            {m.text}
          </div>
        </div>
      ))}
      <div
        style={{
          background: "#0D1B2A",
          border: "0.5px solid rgba(255,255,255,0.12)",
          borderRadius: 8,
          padding: "9px 12px",
          fontSize: 11,
          color: "rgba(255,255,255,0.3)",
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Ask anything about your plant...</span>
        <span style={{ fontSize: 14, color: "#7F77DD" }}>↑</span>
      </div>
    </div>
  );
}

function NavBar({ onLoginClick }: { onLoginClick: () => void }) {

  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 40px",
        background: scrolled ? "rgba(13,27,42,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "0.5px solid rgba(255,255,255,0.08)" : "none",
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <img
          src="/biourja.png"
          alt="BioUrja"
          style={{
            height: 32, 
            width: "auto",
            maxWidth: 140,
            display: "block",
            objectFit: "contain",
            flexShrink: 0,
          }}
        />
        <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
          BioUrja
        </span>
      </div>
      <div style={{ display: "flex", gap: 28 }}>
        {["Features", "How it works", "AI advisor", "Reports"].map((link) => (
          <a
            key={link}
            href="#"
            style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
          >
            {link}
          </a>
        ))}
      </div>
      <button
        onClick={()=> {navigate("/auth")}}
        style={{
          background: "#7F77DD",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "8px 18px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 0.2s, transform 0.15s",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#9990E8"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#7F77DD"; }}
      >
        Sign in →
      </button>
    </nav>
  );
}

function HeroSection() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <section style={{ display: "flex", gap: 48, padding: "64px 40px 56px", alignItems: "center" }}>
      <div
        style={{
          flex: 1,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: "rgba(127,119,221,0.12)",
            border: "0.5px solid rgba(127,119,221,0.35)",
            borderRadius: 20,
            padding: "5px 14px",
            marginBottom: 20,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7F77DD", display: "inline-block" }} />
          <span style={{ fontSize: 12, color: "#A09AF0", fontFamily: "'IBM Plex Mono', monospace" }}>
            Now with AI-powered yield forecasting
          </span>
        </div>
        <h1
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 40,
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#fff",
            marginBottom: 16,
            letterSpacing: "-0.03em",
          }}
        >
          Turn campus waste<br />
          into{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #7F77DD 0%, #D4537E 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            clean energy
          </span>
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 28, maxWidth: 380 }}>
          AI-powered biogas monitoring for 1,800 students. Log waste, track yield, get instant insights — all in one dashboard.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            style={{
              background: "#7F77DD",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.2s, transform 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#9990E8"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#7F77DD"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            Get started free
          </button>
          <button
            style={{
              background: "transparent",
              color: "rgba(255,255,255,0.75)",
              border: "0.5px solid rgba(255,255,255,0.2)",
              borderRadius: 10,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
          >
            ▶ Watch demo
          </button>
        </div>
      </div>
      <div style={{ flex: 1, opacity: visible ? 1 : 0, transition: "opacity 0.7s ease 0.2s" }}>
        <DashboardMockup />
      </div>
    </section>
  );
}

function MetricsBand() {
  return (
    <div
      style={{
        background: "#0A1624",
        borderTop: "0.5px solid rgba(255,255,255,0.07)",
        borderBottom: "0.5px solid rgba(255,255,255,0.07)",
        display: "flex",
        padding: "22px 40px",
      }}
    >
      {METRICS.map((m, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            textAlign: "center",
            borderRight: i < METRICS.length - 1 ? "0.5px solid rgba(255,255,255,0.08)" : "none",
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 22,
              fontWeight: 700,
              color: m.color ?? "#7F77DD",
              letterSpacing: "-0.02em",
            }}
          >
            {m.value}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
            {m.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeaturesSection() {  
  return (
    <section style={{ padding: "64px 40px" }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, color: "#7F77DD", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 8 }}>
          Features
        </div>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 }}>
          Everything your plant operator needs
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
          From waste input to AI insights — all in one place.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {FEATURES.map((f, i) => (
          <FeatureCard key={i} {...f} index={i} />
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section style={{ padding: "64px 40px", background: "#0A1624", borderTop: "0.5px solid rgba(255,255,255,0.06)", borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, color: "#7F77DD", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 8 }}>
          How it works
        </div>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
          Three steps from waste to insight
        </h2>
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
        {STEPS.map((step, i) => (
          <>
            <div key={step.num} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(127,119,221,0.12)",
                  border: "1.5px solid rgba(127,119,221,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#A09AF0",
                }}
              >
                {step.num}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 8, fontFamily: "'Sora', sans-serif" }}>
                {step.title}
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, maxWidth: 200, margin: "0 auto" }}>
                {step.desc}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div key={`arrow-${i}`} style={{ flex: "0 0 60px", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 20, color: "rgba(127,119,221,0.4)", fontSize: 22 }}>
                →
              </div>
            )}
          </>
        ))}
      </div>
    </section>
  );
}

function AIShowcaseSection() {
  return (
    <section style={{ display: "flex", gap: 40, padding: "64px 40px", alignItems: "stretch" }}>
      <ChatShowcase />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 11, color: "#7F77DD", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10 }}>
          AI advisor
        </div>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 12 }}>
          Your plant's expert,<br />always on
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, marginBottom: 24 }}>
          The BioUrja bot receives your last 7 days of real readings and full plant specs before every reply — not generic advice.
        </p>
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "Diagnoses low yield with actual plant data",
            "Recommends digester condition adjustments",
            "Answers sustainability and CO₂ impact questions",
            "Full chat history stored per operator",
            "Powered by Claude — API key never reaches the browser",
          ].map((item, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  background: "rgba(127,119,221,0.18)",
                  border: "0.5px solid rgba(127,119,221,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color: "#A09AF0",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                ✓
              </div>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ImpactSection() {
  return (
    <section
      style={{
        padding: "64px 40px",
        background: "#0A1624",
        borderTop: "0.5px solid rgba(255,255,255,0.06)",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 11, color: "#1D9E75", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10 }}>
        Sustainability impact
      </div>
      <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 }}>
        Every kg logged is a step toward net-zero
      </h2>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 36 }}>
        Real numbers from a 720 kg/day anaerobic digestion plant serving 1,800 students.
      </p>
      <div style={{ display: "flex", gap: 14 }}>
        {IMPACT_STATS.map((stat, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: "#0D1B2A",
              border: "0.5px solid rgba(255,255,255,0.07)",
              borderRadius: 14,
              padding: "24px 16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>{stat.icon}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 700, color: stat.color, marginBottom: 6 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTASection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (email.trim()) setSubmitted(true);
  };

  return (
    <section style={{ padding: "80px 40px", textAlign: "center" }}>
      <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 12 }}>
        Ready to optimize your plant?
      </h2>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 28 }}>
        Join campus sustainability teams already tracking waste-to-energy performance.
      </p>
      {submitted ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(29,158,117,0.15)",
            border: "0.5px solid rgba(29,158,117,0.4)",
            borderRadius: 10,
            padding: "12px 24px",
            fontSize: 14,
            color: "#1D9E75",
            marginBottom: 28,
          }}
        >
          ✓ Access request sent — we'll be in touch shortly.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, maxWidth: 420, margin: "0 auto 28px", justifyContent: "center" }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="admin@college.edu"
            style={{
              flex: 1,
              background: "#111D2E",
              border: "0.5px solid rgba(255,255,255,0.15)",
              borderRadius: 10,
              padding: "11px 16px",
              fontSize: 13,
              color: "#fff",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            onClick={handleSubmit}
            style={{
              background: "#7F77DD",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "11px 20px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#9990E8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#7F77DD"; }}
          >
            Request access
          </button>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 40 }}>
        {["GitHub", "Documentation", "Contact", "Privacy"].map((link) => (
          <a
            key={link}
            href="#"
            style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
          >
            {link}
          </a>
        ))}
      </div>
      <div
        style={{
          borderTop: "0.5px solid rgba(255,255,255,0.06)",
          paddingTop: 20,
          fontSize: 11,
          color: "rgba(255,255,255,0.2)",
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        © 2026 BioUrja · Built with MERN + Claude API · All monetary values in Indian rupees (₹)
      </div>
    </section>
  );
}

// ── Login Modal ──────────────────────────────────────────────────────────────
function LoginModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#0D1B2A",
    border: "0.5px solid rgba(255,255,255,0.15)",
    borderRadius: 9,
    padding: "11px 14px",
    fontSize: 13,
    color: "#fff",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          background: "#111D2E",
          border: "0.5px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: 32,
          width: 360,
          animation: "fadeUp 0.25s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
          <div style={{ width: 26, height: 26, background: "linear-gradient(135deg,#7F77DD,#D4537E)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
            🌿
          </div>
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: "#fff" }}>BioUrja</span>
        </div>
        <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Sign in</h3>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 22 }}>Enter your operator credentials to continue.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
          <input style={inputStyle} type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button
          style={{
            width: "100%",
            background: "#7F77DD",
            color: "#fff",
            border: "none",
            borderRadius: 9,
            padding: "12px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            marginBottom: 14,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#9990E8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#7F77DD"; }}
        >
          Sign in → 
        </button>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          No account?{" "}
          <a href="#" style={{ color: "#7F77DD", textDecoration: "none" }}>Create account</a>
        </p>
      </div>
    </div>
  );
}

// ── Root Component ───────────────────────────────────────────────────────────
export default function BioUrjaLanding() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D1B2A; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0D1B2A; }
        ::-webkit-scrollbar-thumb { background: rgba(127,119,221,0.4); border-radius: 3px; }
      `}</style>
      <div style={{ background: "#0D1B2A", color: "#fff", minHeight: "100vh", fontFamily: "'Sora', sans-serif" }}>
        <NavBar onLoginClick={() => setShowLogin(true)} />
        <HeroSection />
        <MetricsBand />
        <FeaturesSection />
        <HowItWorksSection />
        <AIShowcaseSection />
        <ImpactSection />
        <CTASection />
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </div> 
    </>
  );
}
