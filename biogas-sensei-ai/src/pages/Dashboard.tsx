import { useEffect, useMemo, useState } from "react";
import { Flame, Zap, Cylinder, IndianRupee, AlertTriangle, Leaf } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/KPICard";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, fmt } from "@/lib/calculator";

interface Reading {
  date: string;
  biogas_m3: number;
  kwh: number;
  lpg_cylinders: number;
  rupee_savings: number;
  co2_avoided: number;
  methane_m3: number;
}

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning))"];

const Dashboard = () => {
  const { user } = useAuth();
  const [readings, setReadings] = useState<Reading[] | null>(null);

  useEffect(() => {
    if (!user) return;
    const from = format(subDays(new Date(), 29), "yyyy-MM-dd");
    supabase
      .from("biogas_readings")
      .select("date, biogas_m3, kwh, lpg_cylinders, rupee_savings, co2_avoided, methane_m3")
      .eq("user_id", user.id)
      .gte("date", from)
      .order("date", { ascending: true })
      .then(({ data }) => setReadings((data as Reading[]) ?? []));
  }, [user]);

  const today = useMemo(() => {
    if (!readings?.length) return null;
    const t = format(new Date(), "yyyy-MM-dd");
    return readings.find((r) => r.date === t) ?? readings[readings.length - 1];
  }, [readings]);

  const monthly = useMemo(() => {
    if (!readings) return null;
    const acc = readings.reduce(
      (a, r) => ({
        biogas: a.biogas + Number(r.biogas_m3),
        kwh: a.kwh + Number(r.kwh),
        lpg: a.lpg + Number(r.lpg_cylinders),
        savings: a.savings + Number(r.rupee_savings),
        co2: a.co2 + Number(r.co2_avoided),
      }),
      { biogas: 0, kwh: 0, lpg: 0, savings: 0, co2: 0 },
    );
    return { ...acc, annual: acc.biogas * (365 / Math.max(readings.length, 1)) };
  }, [readings]);

  // Low-yield warning: today vs 7-day avg
  const lowYield = useMemo(() => {
    if (!readings || readings.length < 2 || !today) return null;
    const last7 = readings.slice(-8, -1);
    if (!last7.length) return null;
    const avg = last7.reduce((s, r) => s + Number(r.biogas_m3), 0) / last7.length;
    if (avg > 0 && Number(today.biogas_m3) < avg * 0.85) {
      const drop = ((avg - Number(today.biogas_m3)) / avg) * 100;
      return { drop, avg };
    }
    return null;
  }, [readings, today]);

  const chartData = readings?.map((r) => ({
    date: format(new Date(r.date), "MMM d"),
    biogas: Number(Number(r.biogas_m3).toFixed(2)),
    savings: Math.round(Number(r.rupee_savings)),
  }));

  const wasteMix = [
    { name: "Food", value: 60 },
    { name: "Garden", value: 25 },
    { name: "Paper", value: 15 },
  ];

  const loading = readings === null;
  const empty = readings?.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your campus biogas plant at a glance.</p>
      </div>

      {lowYield && (
        <Card className="flex items-start gap-3 border-warning/40 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-warning">Yield dropped {lowYield.drop.toFixed(1)}% below 7-day average</p>
            <p className="text-sm text-muted-foreground">
              Today: {fmt(Number(today!.biogas_m3))} m³ vs avg {fmt(lowYield.avg)} m³. Check digester pH, temperature, and feedstock mix.
            </p>
          </div>
        </Card>
      )}

      {empty ? (
        <Card className="bg-gradient-card p-10 text-center">
          <Leaf className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 text-lg font-semibold">No readings yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Log your first day of waste in <strong>Waste Input</strong> to populate your dashboard.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard label="Today's biogas" value={fmt(today?.biogas_m3 ?? 0)} unit="m³" icon={Flame} accent="primary" loading={loading} />
            <KPICard label="Today's energy" value={fmt(today?.kwh ?? 0)} unit="kWh" icon={Zap} accent="warning" loading={loading} />
            <KPICard label="LPG saved today" value={fmt(today?.lpg_cylinders ?? 0)} unit="cyl" icon={Cylinder} accent="accent" loading={loading} />
            <KPICard label="Saved today" value={today ? formatINR(today.rupee_savings) : "₹0"} icon={IndianRupee} accent="success" loading={loading} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="border-border/60 bg-gradient-card p-5">
              <h3 className="mb-4 font-semibold">Biogas production — last 30 days</h3>
              <div className="h-64">
                {loading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Line type="monotone" dataKey="biogas" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="border-border/60 bg-gradient-card p-5">
              <h3 className="mb-4 font-semibold">Daily savings — last 30 days</h3>
              <div className="h-64">
                {loading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        formatter={(v: number) => formatINR(v)}
                      />
                      <Bar dataKey="savings" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border-border/60 bg-gradient-card p-5 lg:col-span-1">
              <h3 className="mb-4 font-semibold">Typical waste mix</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={wasteMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {wasteMix.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="border-border/60 bg-gradient-card p-5 lg:col-span-2">
              <h3 className="mb-4 font-semibold">Period summary</h3>
              {loading || !monthly ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Stat label="Total biogas" value={`${fmt(monthly.biogas)} m³`} />
                  <Stat label="Total energy" value={`${fmt(monthly.kwh)} kWh`} />
                  <Stat label="LPG saved" value={`${fmt(monthly.lpg)} cyl`} />
                  <Stat label="Total savings" value={formatINR(monthly.savings)} />
                  <Stat label="CO₂ avoided" value={`${fmt(monthly.co2)} t`} />
                  <Stat label="Annual projection" value={`${fmt(monthly.annual)} m³`} />
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border/40 bg-background/40 p-3">
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 text-lg font-semibold">{value}</p>
  </div>
);

export default Dashboard;
