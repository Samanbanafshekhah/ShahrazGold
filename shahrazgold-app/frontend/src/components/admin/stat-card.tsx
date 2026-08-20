import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "gold",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: "gold" | "positive" | "negative" | "warning" | "neutral";
}) {
  const tones: Record<string, string> = {
    gold: "bg-gold-soft text-[color:var(--gold-dark)]",
    positive: "bg-positive-soft text-positive",
    negative: "bg-negative-soft text-negative",
    warning: "bg-[color-mix(in_oklab,var(--warning)_14%,transparent)] text-[color:var(--warning)]",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-3 shadow-elegant transition hover:shadow-md sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] leading-5 text-muted-foreground sm:text-xs">{label}</div>
          <div className="mt-1.5 text-lg font-bold tracking-tight sm:mt-2 sm:text-2xl">{value}</div>
          {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${tones[tone]}`}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
