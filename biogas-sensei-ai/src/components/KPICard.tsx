import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  label: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  accent?: "primary" | "accent" | "success" | "warning";
  loading?: boolean;
}

const accentMap = {
  primary: "bg-primary/15 text-primary",
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
};

export const KPICard = ({ label, value, unit, icon: Icon, accent = "primary", loading }: Props) => {
  return (
    <Card className="relative overflow-hidden border-border/60 bg-gradient-card p-5 shadow-card transition hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className="mt-1 text-2xl font-bold tracking-tight">
              {value}
              {unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>}
            </p>
          )}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accentMap[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
};
