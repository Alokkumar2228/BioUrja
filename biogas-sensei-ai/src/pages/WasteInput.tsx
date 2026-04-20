import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Sprout, Flame, Zap, Cylinder, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calculate, formatINR, fmt } from "@/lib/calculator";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const WasteInput = () => {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [foodKg, setFoodKg] = useState("");
  const [gardenKg, setGardenKg] = useState("");
  const [paperKg, setPaperKg] = useState("");
  const [busy, setBusy] = useState(false);

  const preview = useMemo(
    () => calculate({
      foodKg: Number(foodKg) || 0,
      gardenKg: Number(gardenKg) || 0,
      paperKg: Number(paperKg) || 0,
    }),
    [foodKg, gardenKg, paperKg],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = Number(foodKg), g = Number(gardenKg), p = Number(paperKg);
    if ([f, g, p].some((v) => isNaN(v) || v < 0)) {
      toast.error("Enter valid non-negative numbers");
      return;
    }
    if (f + g + p === 0) {
      toast.error("Total waste must be greater than zero");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("save-waste", {
      body: { date, foodKg: f, gardenKg: g, paperKg: p },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Failed to save");
      return;
    }
    const r = (data as any).reading;
    toast.success(`Logged: ${fmt(r.biogas_m3)} m³ biogas, ${formatINR(r.rupee_savings)} saved`);
    setFoodKg(""); setGardenKg(""); setPaperKg("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
          <Sprout className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log daily waste</h1>
          <p className="text-sm text-muted-foreground">Live preview updates as you type. Submit to save.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-gradient-card p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Food waste (kg)" value={foodKg} onChange={setFoodKg} />
              <Field label="Garden waste (kg)" value={gardenKg} onChange={setGardenKg} />
              <Field label="Paper waste (kg)" value={paperKg} onChange={setPaperKg} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-primary hover:opacity-90">
              {busy ? "Saving…" : "Save reading"}
            </Button>
          </form>
        </Card>

        <Card className="border-border/60 bg-gradient-card p-6">
          <h2 className="mb-4 font-semibold">Live projection</h2>
          <div className="grid grid-cols-2 gap-3">
            <Pill icon={Flame} label="Biogas" value={`${fmt(preview.biogasM3)} m³`} accent="primary" />
            <Pill icon={Zap} label="Energy" value={`${fmt(preview.kWh)} kWh`} accent="warning" />
            <Pill icon={Cylinder} label="LPG saved" value={`${fmt(preview.lpgCylinders)} cyl`} accent="accent" />
            <Pill icon={IndianRupee} label="Money saved" value={formatINR(preview.rupeeSavings)} accent="success" />
          </div>
          <div className="mt-5 space-y-2 border-t border-border/40 pt-4 text-sm">
            <Row label="Total waste" value={`${fmt(preview.totalWaste)} kg`} />
            <Row label="Volatile solids" value={`${fmt(preview.volatileSolids)} kg`} />
            <Row label="Methane" value={`${fmt(preview.methaneM3)} m³`} />
            <Row label="CO₂ avoided" value={`${fmt(preview.co2Avoided)} t`} />
          </div>
        </Card>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Input type="number" min="0" step="0.1" placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const accentBg = {
  primary: "bg-primary/15 text-primary",
  warning: "bg-warning/15 text-warning",
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
};
const Pill = ({ icon: Icon, label, value, accent }: any) => (
  <div className="rounded-lg border border-border/40 bg-background/40 p-3">
    <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-md ${accentBg[accent as keyof typeof accentBg]}`}>
      <Icon className="h-4 w-4" />
    </div>
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-lg font-bold">{value}</p>
  </div>
);
const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-muted-foreground">
    <span>{label}</span><span className="font-medium text-foreground">{value}</span>
  </div>
);

export default WasteInput;
