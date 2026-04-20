import { useState } from "react";
import { format, subDays } from "date-fns";
import { Download, FileText, Flame, Zap, Cylinder, IndianRupee, Cloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KPICard } from "@/components/KPICard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { formatINR, fmt } from "@/lib/calculator";

interface Row {
  date: string;
  biogas_m3: number; kwh: number; lpg_cylinders: number;
  rupee_savings: number; co2_avoided: number;
}

const Reports = () => {
  const { user, session } = useAuth();
  const [from, setFrom] = useState(format(subDays(new Date(), 29), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("biogas_readings")
      .select("date, biogas_m3, kwh, lpg_cylinders, rupee_savings, co2_avoided")
      .eq("user_id", user.id)
      .gte("date", from).lte("date", to)
      .order("date", { ascending: true });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setRows((data as Row[]) ?? []);
  };

  const totals = rows?.reduce(
    (a, r) => ({
      biogas: a.biogas + Number(r.biogas_m3),
      kwh: a.kwh + Number(r.kwh),
      lpg: a.lpg + Number(r.lpg_cylinders),
      savings: a.savings + Number(r.rupee_savings),
      co2: a.co2 + Number(r.co2_avoided),
    }),
    { biogas: 0, kwh: 0, lpg: 0, savings: 0, co2: 0 },
  );

  const downloadPdf = async () => {
    if (!session) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reports-pdf?from=${from}&to=${to}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!resp.ok) { toast.error("Failed to generate PDF"); return; }
    const blob = await resp.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `BiogasIQ-Report-${from}-to-${to}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
          <FileText className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Aggregate plant performance and download PDF summaries.</p>
        </div>
      </div>

      <Card className="border-border/60 bg-gradient-card p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:items-end">
          <div className="space-y-2">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={load} disabled={busy} className="bg-gradient-primary hover:opacity-90">
            {busy ? "Loading…" : "Generate report"}
          </Button>
          <Button onClick={downloadPdf} disabled={!rows?.length} variant="secondary">
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </Card>

      {rows && totals && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KPICard label="Total biogas" value={fmt(totals.biogas)} unit="m³" icon={Flame} accent="primary" />
            <KPICard label="Total energy" value={fmt(totals.kwh)} unit="kWh" icon={Zap} accent="warning" />
            <KPICard label="LPG saved" value={fmt(totals.lpg)} unit="cyl" icon={Cylinder} accent="accent" />
            <KPICard label="Total savings" value={formatINR(totals.savings)} icon={IndianRupee} accent="success" />
            <KPICard label="CO₂ avoided" value={fmt(totals.co2)} unit="t" icon={Cloud} accent="primary" />
          </div>

          <Card className="border-border/60 bg-gradient-card p-1">
            {rows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No readings in this range.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Biogas (m³)</TableHead>
                    <TableHead className="text-right">Energy (kWh)</TableHead>
                    <TableHead className="text-right">LPG (cyl)</TableHead>
                    <TableHead className="text-right">Savings</TableHead>
                    <TableHead className="text-right">CO₂ (t)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.date}>
                      <TableCell>{format(new Date(r.date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">{fmt(r.biogas_m3)}</TableCell>
                      <TableCell className="text-right">{fmt(r.kwh)}</TableCell>
                      <TableCell className="text-right">{fmt(r.lpg_cylinders)}</TableCell>
                      <TableCell className="text-right">{formatINR(r.rupee_savings)}</TableCell>
                      <TableCell className="text-right">{fmt(r.co2_avoided)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default Reports;
