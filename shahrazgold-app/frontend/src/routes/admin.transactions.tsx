import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AdminPage } from "@/components/admin/admin-page";
import { Input } from "@/components/ui/input";
import { PersianDatePicker } from "@/components/ui/persian-date-picker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RequestStatusBadge } from "@/components/admin/request-status-badge";
import { EmptyState } from "@/components/empty-state";
import {
  useAdminRequests,
  ADMIN_PRODUCTS,
  type AdminPurchaseRequest,
  type AdminRequestStatus,
} from "@/lib/admin-data";
import {
  formatNumber,
  formatPersianDate,
  formatPersianTime,
  toPersianDigits,
} from "@/lib/formatters";

export const Route = createFileRoute("/admin/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const requests = useAdminRequests();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | AdminRequestStatus>("all");
  const [product, setProduct] = useState("all");
  const [date, setDate] = useState("");
  const [sort, setSort] = useState<"new" | "old">("new");
  const [selected, setSelected] = useState<AdminPurchaseRequest | null>(null);

  const list = useMemo(() => {
    const out = requests.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (product !== "all" && r.productId !== product) return false;
      if (date && !r.createdAt.startsWith(date)) return false;
      if (q.trim()) {
        const s = q.trim().toLowerCase();
        if (
          !r.buyerName.toLowerCase().includes(s) &&
          !r.mobile.includes(s) &&
          !r.code.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
    out.sort((a, b) =>
      sort === "new" ? (a.createdAt < b.createdAt ? 1 : -1) : a.createdAt > b.createdAt ? 1 : -1,
    );
    return out;
  }, [requests, q, status, product, date, sort]);

  return (
    <AdminPage title="گزارش معاملات" subtitle="تاریخچه کامل فعالیت مشتریان">
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-elegant md:grid-cols-5">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="جستجو..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pe-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger>
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            <SelectItem value="pending">در انتظار</SelectItem>
            <SelectItem value="approved">تایید شده</SelectItem>
            <SelectItem value="rejected">رد شده</SelectItem>
          </SelectContent>
        </Select>
        <Select value={product} onValueChange={setProduct}>
          <SelectTrigger>
            <SelectValue placeholder="محصول" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه محصولات</SelectItem>
            {ADMIN_PRODUCTS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <PersianDatePicker value={date} onChange={setDate} placeholder="تاریخ معامله" />
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">جدیدترین</SelectItem>
            <SelectItem value="old">قدیمی‌ترین</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {list.length === 0 ? (
        <EmptyState title="نتیجه‌ای یافت نشد" description="فیلترها را تغییر دهید." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-right text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">مشتری</th>
                  <th className="p-3 font-medium">موبایل</th>
                  <th className="p-3 font-medium">نوع عملیات</th>
                  <th className="p-3 font-medium">محصول</th>
                  <th className="p-3 font-medium">مقدار</th>
                  <th className="p-3 font-medium">مبلغ</th>
                  <th className="p-3 font-medium">تاریخ و ساعت</th>
                  <th className="p-3 font-medium">وضعیت نهایی</th>
                  <th className="p-3 font-medium">اقدام ادمین</th>
                  <th className="p-3 font-medium">علت رد</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const lastAdmin = [...r.timeline].reverse().find((t) => t.kind !== "info");
                  return (
                    <tr
                      key={r.id}
                      className="cursor-pointer border-t border-border hover:bg-muted/30"
                      onClick={() => setSelected(r)}
                    >
                      <td className="p-3 font-bold">{r.buyerName}</td>
                      <td className="p-3 text-muted-foreground">{toPersianDigits(r.mobile)}</td>
                      <td className="p-3">درخواست خرید</td>
                      <td className="p-3">{r.productTitle}</td>
                      <td className="p-3">
                        {toPersianDigits(r.weight)} {r.unit}
                      </td>
                      <td className="p-3 font-bold">{formatNumber(r.total)}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {formatPersianDate(r.createdAt)} — {formatPersianTime(r.createdAt)}
                      </td>
                      <td className="p-3">
                        <RequestStatusBadge status={r.status} />
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {lastAdmin ? lastAdmin.label : "—"}
                      </td>
                      <td className="p-3 text-xs text-negative">{r.rejectionReason ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-border md:hidden">
            {list.map((r) => {
              const lastAdmin = [...r.timeline].reverse().find((t) => t.kind !== "info");
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(r)}
                  className="block w-full min-w-0 space-y-3 p-4 text-right transition-colors hover:bg-muted/30"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{r.buyerName}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground" dir="ltr">
                        {toPersianDigits(r.mobile)}
                      </div>
                    </div>
                    <RequestStatusBadge status={r.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/35 p-3 text-xs">
                    <div className="min-w-0">
                      <div className="text-[10px] text-muted-foreground">محصول</div>
                      <div className="mt-1 truncate font-bold">{r.productTitle}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-muted-foreground">مقدار</div>
                      <div className="mt-1 font-bold">
                        {toPersianDigits(r.weight)} {r.unit}
                      </div>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <div className="text-[10px] text-muted-foreground">مبلغ معامله</div>
                      <div className="mt-1 truncate text-sm font-bold tabular-nums">
                        {formatNumber(r.total)} تومان
                      </div>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-end justify-between gap-3 text-[11px] text-muted-foreground">
                    <div className="min-w-0">
                      <div>
                        {formatPersianDate(r.createdAt)}، {formatPersianTime(r.createdAt)}
                      </div>
                      <div className="mt-1 truncate">
                        اقدام ادمین: {lastAdmin ? lastAdmin.label : "—"}
                      </div>
                    </div>
                    <span className="shrink-0 font-bold text-[color:var(--gold-dark)]">
                      مشاهده جزئیات
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent
          dir="rtl"
          className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl"
        >
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-right">جزئیات معامله {selected.code}</DialogTitle>
                <DialogDescription className="text-right">
                  {formatPersianDate(selected.createdAt)} — {formatPersianTime(selected.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <Row label="مشتری" value={selected.buyerName} />
                <Row label="موبایل" value={toPersianDigits(selected.mobile)} />
                <Row label="محصول" value={selected.productTitle} />
                <Row label="مقدار" value={`${toPersianDigits(selected.weight)} ${selected.unit}`} />
                <Row label="قیمت واحد" value={`${formatNumber(selected.unitPrice)} تومان`} />
                <Row label="مبلغ کل" value={`${formatNumber(selected.total)} تومان`} strong />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">وضعیت</span>
                  <RequestStatusBadge status={selected.status} />
                </div>
                {selected.rejectionReason && (
                  <div className="rounded-lg bg-negative-soft p-3 text-xs text-negative">
                    <div className="font-bold">علت رد:</div> {selected.rejectionReason}
                  </div>
                )}
                <div className="mt-3 border-t border-border pt-3 text-xs">
                  <div className="mb-2 font-bold">تاریخچه</div>
                  {selected.timeline.map((t, i) => (
                    <div
                      key={i}
                      className="flex min-w-0 items-start justify-between gap-3 py-1 text-muted-foreground"
                    >
                      <span className="min-w-0 break-words">{t.label}</span>
                      <span className="shrink-0">{formatPersianTime(t.at)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  بستن
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-2 items-start gap-3">
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <span
        className={
          "min-w-0 break-words text-left [overflow-wrap:anywhere] " +
          (strong ? "font-bold text-[color:var(--gold-dark)]" : "text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}
