import { Link } from "@tanstack/react-router";
import type { GoldAsset } from "@/lib/types";
import { formatMoney, formatRelativeMinutes } from "@/lib/formatters";
import { PriceChange } from "./price-change";
import { ChevronLeft } from "lucide-react";

export function PriceCard({ asset }: { asset: GoldAsset }) {
  return (
    <Link
      to="/prices/$symbol"
      params={{ symbol: asset.symbol }}
      className="group block rounded-2xl border border-border bg-card p-4 shadow-elegant transition hover:border-[color:var(--gold)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={
                "inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold " +
                (asset.category === "gold" || asset.category === "melted"
                  ? "bg-gold-soft text-[color:var(--gold-dark)]"
                  : "bg-muted text-foreground")
              }
              aria-hidden
            >
              {asset.category === "gold" ? "طلا" : asset.category === "melted" ? "آب" : "سکه"}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold">{asset.title}</h3>
              <p className="text-[11px] text-muted-foreground">
                {asset.symbol} · هر {asset.unit}
              </p>
            </div>
          </div>
        </div>
        <ChevronLeft
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-[color:var(--gold-dark)]"
          aria-hidden
        />
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <div className="text-lg font-extrabold tabular-nums">
            {formatMoney(asset.price, asset.currency)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            آخرین تغییر: {formatRelativeMinutes(asset.updatedAt)}
          </div>
        </div>
        <PriceChange
          change={asset.change}
          changePercent={asset.changePercent}
          currency={asset.currency}
          compact
        />
      </div>
      {asset.buy && (
        <div className="mt-4 border-t border-border pt-3 text-[11px]">
          <div className="text-muted-foreground">
            خرید:{" "}
            <span className="font-bold tabular-nums text-foreground">
              {asset.buy ? formatMoney(asset.buy, asset.currency) : "—"}
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}
