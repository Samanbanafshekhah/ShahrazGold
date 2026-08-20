import { Link } from "@tanstack/react-router";
import type { Transaction } from "@/lib/types";
import {
  formatCoinCount,
  formatPersianDate,
  formatPersianTime,
  formatRial,
  formatWeight,
} from "@/lib/formatters";
import { StatusBadge } from "./status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TYPE_TONE } from "@/lib/status";
import { ChevronLeft } from "lucide-react";

function qty(t: Transaction) {
  return t.unit === "عدد" ? formatCoinCount(t.quantity) : formatWeight(t.quantity);
}

export function TransactionTable({ items }: { items: Transaction[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-elegant">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-start">کد پیگیری</TableHead>
            <TableHead className="text-start">نوع</TableHead>
            <TableHead className="text-start">دارایی</TableHead>
            <TableHead className="text-start">مقدار</TableHead>
            <TableHead className="text-start">مبلغ کل</TableHead>
            <TableHead className="text-start">تاریخ</TableHead>
            <TableHead className="text-start">وضعیت</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((t) => {
            const tone = TYPE_TONE[t.type];
            return (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-sm">{t.trackingCode}</TableCell>
                <TableCell>
                  <span className={`font-bold ${tone.className}`}>{tone.label}</span>
                </TableCell>
                <TableCell>{t.assetTitle}</TableCell>
                <TableCell className="text-[15px] font-semibold tabular-nums">{qty(t)}</TableCell>
                <TableCell className="text-base font-bold tabular-nums">
                  {formatRial(t.total)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div>{formatPersianDate(t.createdAt)}</div>
                  <div>{formatPersianTime(t.createdAt)}</div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell>
                  <Link
                    to="/transactions/$id"
                    params={{ id: t.id }}
                    className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-[color:var(--gold-dark)] hover:bg-gold-soft"
                  >
                    جزئیات <ChevronLeft className="h-3.5 w-3.5" />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function TransactionCard({ t }: { t: Transaction }) {
  const tone = TYPE_TONE[t.type];
  return (
    <Link
      to="/transactions/$id"
      params={{ id: t.id }}
      className="block rounded-2xl border border-border bg-card p-4 shadow-elegant transition hover:border-[color:var(--gold)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${tone.className}`}>{tone.label}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="truncate text-sm font-bold">{t.assetTitle}</span>
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">{t.trackingCode}</div>
        </div>
        <StatusBadge status={t.status} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
        <div>
          <div className="text-muted-foreground">مقدار</div>
          <div className="mt-0.5 text-sm font-bold tabular-nums">{qty(t)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">مبلغ کل</div>
          <div className="mt-0.5 text-sm font-bold tabular-nums">{formatRial(t.total)}</div>
        </div>
        <div className="col-span-2 text-xs text-muted-foreground">
          {formatPersianDate(t.createdAt)} · {formatPersianTime(t.createdAt)}
        </div>
      </div>
    </Link>
  );
}
