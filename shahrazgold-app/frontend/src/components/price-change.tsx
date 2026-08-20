import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { formatPercent, formatSignedNumber } from "@/lib/formatters";

export function PriceChange({
  change,
  changePercent,
  currency,
  compact = false,
}: {
  change: number;
  changePercent: number;
  currency: "IRR" | "USD";
  compact?: boolean;
}) {
  const tone =
    change > 0
      ? "text-positive bg-positive-soft"
      : change < 0
        ? "text-negative bg-negative-soft"
        : "text-muted-foreground bg-muted";
  const Icon = change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;
  const label = change > 0 ? "افزایش" : change < 0 ? "کاهش" : "بدون تغییر";
  return (
    <span
      role="status"
      aria-label={`${label} ${formatPercent(changePercent)}`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${tone}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{formatPercent(changePercent)}</span>
      {!compact && (
        <span className="text-[10px] font-medium opacity-80">
          ({formatSignedNumber(change)} {currency === "USD" ? "$" : ""})
        </span>
      )}
    </span>
  );
}