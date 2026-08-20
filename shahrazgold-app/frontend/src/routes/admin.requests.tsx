import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ChevronRight, ChevronLeft, CheckCircle2, XCircle } from "lucide-react";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PersianDatePicker } from "@/components/ui/persian-date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { RequestStatusBadge } from "@/components/admin/request-status-badge";
import { EmptyState } from "@/components/empty-state";
import {
    useAdminRequests,
    approveRequest,
    rejectRequest,
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
import { toast } from "sonner";

export const Route = createFileRoute("/admin/requests")({
    component: RequestsPage,
});

const PAGE_SIZE = 8;

function RequestsPage() {
    const requests = useAdminRequests();
    const [q, setQ] = useState("");
    const [status, setStatus] = useState<"all" | AdminRequestStatus>("all");
    const [product, setProduct] = useState<string>("all");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<AdminPurchaseRequest | null>(null);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const filtered = useMemo(() => {
        return requests.filter((r) => {
            if (status !== "all" && r.status !== status) return false;
            if (product !== "all" && r.productId !== product) return false;
            if (q.trim()) {
                const s = q.trim().toLowerCase();
                if (
                    !r.buyerName.toLowerCase().includes(s) &&
                    !r.mobile.includes(s) &&
                    !r.code.toLowerCase().includes(s)
                )
                    return false;
            }
            if (from) {
                if (new Date(r.createdAt).getTime() < new Date(from).getTime()) return false;
            }
            if (to) {
                if (new Date(r.createdAt).getTime() > new Date(to).getTime() + 86_400_000)
                    return false;
            }
            return true;
        });
    }, [requests, q, status, product, from, to]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    function openDetail(r: AdminPurchaseRequest) {
        setSelected(r);
    }

    async function doApprove(r: AdminPurchaseRequest) {
        try {
            await approveRequest(r.id);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "تأیید درخواست ناموفق بود.");
            return;
        }
        toast.success(`درخواست ${r.code} تایید شد.`);
        setSelected((cur) => (cur ? { ...cur, status: "approved" } : cur));
    }
    async function doReject() {
        if (!selected) return;
        if (rejectReason.trim().length < 3) {
            toast.error("علت رد درخواست را وارد کنید.");
            return;
        }
        try {
            await rejectRequest(selected.id, rejectReason.trim());
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "رد درخواست ناموفق بود.");
            return;
        }
        toast.success(`درخواست ${selected.code} رد شد.`);
        setSelected((cur) =>
            cur ? { ...cur, status: "rejected", rejectionReason: rejectReason.trim() } : cur,
        );
        setRejectOpen(false);
        setRejectReason("");
    }

    return (
        <AdminPage title="درخواست‌های خرید" subtitle="بررسی و مدیریت درخواست‌های ثبت‌شده">
            {/* filters */}
            <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-elegant md:grid-cols-4">
                <div className="relative md:col-span-2">
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="جستجو بر اساس نام، موبایل یا شماره درخواست..."
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setPage(1);
                        }}
                        className="pe-9"
                    />
                </div>
                <Select
                    value={status}
                    onValueChange={(v) => {
                        setStatus(v as typeof status);
                        setPage(1);
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="وضعیت" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                        <SelectItem value="pending">در انتظار بررسی</SelectItem>
                        <SelectItem value="approved">تایید شده</SelectItem>
                        <SelectItem value="rejected">رد شده</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={product}
                    onValueChange={(v) => {
                        setProduct(v);
                        setPage(1);
                    }}
                >
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
                <div className="flex min-w-0 gap-2 md:col-span-2">
                    <label className="min-w-0 flex-1 text-xs">
                        <span className="mb-1 block text-muted-foreground">از تاریخ</span>
                        <PersianDatePicker
                            value={from}
                            max={to || undefined}
                            onChange={(value) => {
                                setFrom(value);
                                setPage(1);
                            }}
                            className="min-w-0"
                        />
                    </label>
                    <label className="min-w-0 flex-1 text-xs">
                        <span className="mb-1 block text-muted-foreground">تا تاریخ</span>
                        <PersianDatePicker
                            value={to}
                            min={from || undefined}
                            onChange={(value) => {
                                setTo(value);
                                setPage(1);
                            }}
                            className="min-w-0"
                        />
                    </label>
                </div>
            </div>

            {filtered.length === 0 ? (
                <EmptyState
                    title="درخواستی یافت نشد"
                    description="با فیلترهای فعلی هیچ درخواستی مطابقت نداشت."
                />
            ) : (
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[900px] text-right text-sm">
                            <thead className="bg-muted/40 text-xs text-muted-foreground">
                                <tr>
                                    <th className="p-3 font-medium">شماره</th>
                                    <th className="p-3 font-medium">خریدار</th>
                                    <th className="p-3 font-medium">موبایل</th>
                                    <th className="p-3 font-medium">محصول</th>
                                    <th className="p-3 font-medium">مقدار</th>
                                    <th className="p-3 font-medium">مبلغ کل</th>
                                    <th className="p-3 font-medium">قیمت لحظه ثبت</th>
                                    <th className="p-3 font-medium">تاریخ</th>
                                    <th className="p-3 font-medium">وضعیت</th>
                                    <th className="p-3 font-medium">عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageItems.map((r) => (
                                    <tr
                                        key={r.id}
                                        className="border-t border-border hover:bg-muted/30"
                                    >
                                        <td className="p-3 font-mono text-xs">{r.code}</td>
                                        <td className="p-3 font-bold">{r.buyerName}</td>
                                        <td className="p-3 text-muted-foreground">
                                            {toPersianDigits(r.mobile)}
                                        </td>
                                        <td className="p-3">{r.productTitle}</td>
                                        <td className="p-3">
                                            {toPersianDigits(r.weight)} {r.unit}
                                        </td>
                                        <td className="p-3 font-bold">{formatNumber(r.total)}</td>
                                        <td className="p-3 text-muted-foreground">
                                            {formatNumber(r.unitPrice)}
                                        </td>
                                        <td className="p-3 text-xs text-muted-foreground">
                                            {formatPersianDate(r.createdAt)}
                                            <div>{formatPersianTime(r.createdAt)}</div>
                                        </td>
                                        <td className="p-3">
                                            <RequestStatusBadge status={r.status} />
                                        </td>
                                        <td className="p-3">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openDetail(r)}
                                            >
                                                جزئیات
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="divide-y divide-border md:hidden">
                        {pageItems.map((r) => (
                            <article key={r.id} className="min-w-0 space-y-3 p-4">
                                <div className="flex min-w-0 items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-bold">
                                            {r.buyerName}
                                        </div>
                                        <div
                                            className="mt-1 font-mono text-[11px] text-muted-foreground"
                                            dir="ltr"
                                        >
                                            {r.code}
                                        </div>
                                    </div>
                                    <RequestStatusBadge status={r.status} />
                                </div>

                                <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/35 p-3 text-xs">
                                    <div className="min-w-0">
                                        <div className="text-[10px] text-muted-foreground">
                                            محصول
                                        </div>
                                        <div className="mt-1 truncate font-bold">
                                            {r.productTitle}
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] text-muted-foreground">
                                            مقدار
                                        </div>
                                        <div className="mt-1 font-bold">
                                            {toPersianDigits(r.weight)} {r.unit}
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] text-muted-foreground">
                                            مبلغ کل
                                        </div>
                                        <div className="mt-1 truncate font-bold tabular-nums">
                                            {formatNumber(r.total)}
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] text-muted-foreground">
                                            قیمت ثبت
                                        </div>
                                        <div className="mt-1 truncate tabular-nums">
                                            {formatNumber(r.unitPrice)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex min-w-0 items-center justify-between gap-3">
                                    <div className="min-w-0 text-[11px] leading-5 text-muted-foreground">
                                        <div dir="ltr" className="text-right">
                                            {toPersianDigits(r.mobile)}
                                        </div>
                                        <div>
                                            {formatPersianDate(r.createdAt)}،{" "}
                                            {formatPersianTime(r.createdAt)}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="shrink-0"
                                        onClick={() => openDetail(r)}
                                    >
                                        جزئیات
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                    {/* pagination */}
                    <div className="flex flex-col gap-3 border-t border-border p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">
                            نمایش {toPersianDigits((page - 1) * PAGE_SIZE + 1)} تا{" "}
                            {toPersianDigits(Math.min(page * PAGE_SIZE, filtered.length))} از{" "}
                            {toPersianDigits(filtered.length)}
                        </span>
                        <div className="flex items-center justify-between gap-1 sm:justify-start">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                <ChevronRight className="h-3 w-3" />
                                قبلی
                            </Button>
                            <span className="px-2 font-bold">
                                {toPersianDigits(page)} / {toPersianDigits(totalPages)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                            >
                                بعدی
                                <ChevronLeft className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* detail drawer */}
            <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
                <SheetContent
                    side="left"
                    className="w-full overflow-y-auto px-4 sm:max-w-lg sm:px-6"
                    dir="rtl"
                >
                    {selected && (
                        <>
                            <SheetHeader>
                                <SheetTitle className="text-right">
                                    جزئیات درخواست {selected.code}
                                </SheetTitle>
                                <SheetDescription className="text-right">
                                    ثبت‌شده در {formatPersianDate(selected.createdAt)} ساعت{" "}
                                    {formatPersianTime(selected.createdAt)}
                                </SheetDescription>
                            </SheetHeader>
                            <div className="mt-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                        وضعیت فعلی
                                    </span>
                                    <RequestStatusBadge status={selected.status} />
                                </div>
                                <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs">
                                    <div className="mb-2 font-bold text-foreground">
                                        اطلاعات خریدار
                                    </div>
                                    <Row label="نام و نام خانوادگی" value={selected.buyerName} />
                                    <Row
                                        label="شماره موبایل"
                                        value={toPersianDigits(selected.mobile)}
                                    />
                                </div>
                                <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs">
                                    <div className="mb-2 font-bold text-foreground">
                                        جزئیات خرید
                                    </div>
                                    <Row label="محصول" value={selected.productTitle} />
                                    <Row
                                        label="مقدار"
                                        value={`${toPersianDigits(selected.weight)} ${selected.unit}`}
                                    />
                                    <Row
                                        label="قیمت واحد در لحظه ثبت"
                                        value={`${formatNumber(selected.unitPrice)} تومان`}
                                    />
                                    <Row
                                        label="مبلغ کل"
                                        value={`${formatNumber(selected.total)} تومان`}
                                        strong
                                    />
                                </div>
                                {selected.rejectionReason && (
                                    <div className="rounded-xl border border-[color:var(--negative)]/40 bg-negative-soft p-3 text-xs text-negative">
                                        <div className="mb-1 font-bold">علت رد</div>
                                        {selected.rejectionReason}
                                    </div>
                                )}
                                <div className="rounded-xl border border-border bg-card p-3 text-xs">
                                    <div className="mb-2 font-bold text-foreground">
                                        تاریخچه وضعیت
                                    </div>
                                    <ol className="space-y-2">
                                        {selected.timeline.map((t, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span
                                                    className={
                                                        "mt-1.5 h-2 w-2 rounded-full " +
                                                        (t.kind === "success"
                                                            ? "bg-[color:var(--positive)]"
                                                            : t.kind === "error"
                                                              ? "bg-[color:var(--negative)]"
                                                              : "bg-[color:var(--gold-dark)]")
                                                    }
                                                />
                                                <div className="flex-1">
                                                    <div className="text-foreground">{t.label}</div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {formatPersianDate(t.at)} —{" "}
                                                        {formatPersianTime(t.at)}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:flex-wrap">
                                    <Button
                                        onClick={() => doApprove(selected)}
                                        disabled={selected.status !== "pending"}
                                        className="w-full bg-[color:var(--positive)] text-white hover:opacity-90 sm:w-auto"
                                    >
                                        <CheckCircle2 className="me-1 h-4 w-4" />
                                        تایید درخواست
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setRejectOpen(true)}
                                        disabled={selected.status !== "pending"}
                                        className="w-full border-[color:var(--negative)]/50 text-negative hover:bg-negative-soft sm:w-auto"
                                    >
                                        <XCircle className="me-1 h-4 w-4" />
                                        رد درخواست
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="col-span-2 w-full sm:w-auto"
                                        onClick={() => setSelected(null)}
                                    >
                                        بستن
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* reject reason dialog */}
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-right">علت رد درخواست</DialogTitle>
                        <DialogDescription className="text-right">
                            لطفاً علت رد این درخواست را برای ثبت در تاریخچه وارد کنید.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        rows={4}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="مثلاً مغایرت در اطلاعات، ظرفیت پر شده، ..."
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectOpen(false)}>
                            انصراف
                        </Button>
                        <Button
                            onClick={doReject}
                            className="bg-[color:var(--negative)] text-white hover:opacity-90"
                        >
                            ثبت رد
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminPage>
    );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className="grid grid-cols-2 items-start gap-3 py-1">
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
