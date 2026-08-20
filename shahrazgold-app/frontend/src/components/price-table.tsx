import { Link } from "@tanstack/react-router";
import type { GoldAsset } from "@/lib/types";
import { formatMoney, formatRelativeMinutes } from "@/lib/formatters";
import { PriceChange } from "./price-change";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft } from "lucide-react";

export function PriceTable({ assets }: { assets: GoldAsset[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-elegant">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-start">دارایی</TableHead>
            <TableHead className="text-start">قیمت لحظه‌ای</TableHead>
            <TableHead className="text-start">خرید</TableHead>
            <TableHead className="text-start">تغییر روزانه</TableHead>
            <TableHead className="text-start">آخرین به‌روزرسانی</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((a) => (
            <TableRow key={a.symbol} className="cursor-pointer">
              <TableCell>
                <Link
                  to="/prices/$symbol"
                  params={{ symbol: a.symbol }}
                  className="flex items-center gap-2"
                >
                  <span
                    className={
                      "inline-flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold " +
                      (a.category === "gold" || a.category === "melted"
                        ? "bg-gold-soft text-[color:var(--gold-dark)]"
                        : "bg-muted")
                    }
                    aria-hidden
                  >
                    {a.category === "gold" ? "طلا" : a.category === "melted" ? "آب" : "سکه"}
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{a.title}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {a.symbol} · هر {a.unit}
                    </span>
                  </span>
                </Link>
              </TableCell>
              <TableCell className="tabular-nums font-bold">
                {formatMoney(a.price, a.currency)}
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {a.buy ? formatMoney(a.buy, a.currency) : "—"}
              </TableCell>
              <TableCell>
                <PriceChange
                  change={a.change}
                  changePercent={a.changePercent}
                  currency={a.currency}
                />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatRelativeMinutes(a.updatedAt)}
              </TableCell>
              <TableCell>
                <Link
                  to="/prices/$symbol"
                  params={{ symbol: a.symbol }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                  aria-label={`جزئیات ${a.title}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
