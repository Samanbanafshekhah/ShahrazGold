import { useNavigate } from "@tanstack/react-router";
import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    Loader2,
    Phone,
    ShoppingBag,
    XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RequestStatusBadge } from "@/components/admin/request-status-badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { approveRequest, rejectRequest, type AdminPurchaseRequest } from "@/lib/admin-data";
import {
    formatNumber,
    formatPersianDate,
    formatPersianTime,
    formatRelativeMinutes,
    toPersianDigits,
} from "@/lib/formatters";

type RequestFilter = "pending" | "all";

interface AdminRequestCenterProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requests: AdminPurchaseRequest[];
}

export function AdminRequestCenter({ open, onOpenChange, requests }: AdminRequestCenterProps) {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<RequestFilter>("pending");
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<AdminPurchaseRequest | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    const sortedRequests = useMemo(
        () =>
            [...requests]
                .filter((request) => filter === "all" || request.status === "pending")
                .sort(
                    (first, second) =>
                        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
                ),
        [filter, requests],
    );
    const pendingCount = requests.filter((request) => request.status === "pending").length;

    async function handleApprove(request: AdminPurchaseRequest) {
        setBusyId(request.id);
        try {
            await approveRequest(request.id);
            toast.success("درخواست " + request.code + " تأیید شد.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "تأیید درخواست ناموفق بود.");
        } finally {
            setBusyId(null);
        }
    }

    function openRejectDialog(request: AdminPurchaseRequest) {
        setRejectReason("");
        setRejectTarget(request);
    }

    function closeRejectDialog() {
        setRejectTarget(null);
        setRejectReason("");
    }

    async function handleReject() {
        if (!rejectTarget) return;
        const reason = rejectReason.trim();
        if (reason.length < 3) {
            toast.error("علت رد درخواست را وارد کنید.");
            return;
        }

        setBusyId(rejectTarget.id);
        try {
            await rejectRequest(rejectTarget.id, reason);
            toast.success("درخواست " + rejectTarget.code + " رد شد.");
            closeRejectDialog();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "رد درخواست ناموفق بود.");
        } finally {
            setBusyId(null);
        }
    }

    function openFullPage() {
        onOpenChange(false);
        navigate({ to: "/admin/requests" });
    }

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="left"
                    dir="rtl"
                    className="flex h-dvh max-h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
                >
                    <SheetHeader className="shrink-0 border-b border-border px-5 pb-4 pt-5 text-right">
                        <div className="flex items-center gap-3 pe-8">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gold-soft text-[color:var(--gold-dark)]">
                                <ShoppingBag className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                                <SheetTitle className="text-right text-base">
                                    مرکز درخواست‌های خرید و فروش
                                </SheetTitle>
                                <SheetDescription className="mt-1 text-right text-xs">
                                    بررسی و تصمیم‌گیری بدون خروج از صفحه فعلی
                                </SheetDescription>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 rounded-xl bg-muted p-1">
                            <button
                                type="button"
                                onClick={() => setFilter("pending")}
                                className={
                                    "rounded-lg px-3 py-2 text-xs font-bold transition " +
                                    (filter === "pending"
                                        ? "bg-card text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground")
                                }
                            >
                                در انتظار
                                <span className="ms-1.5 rounded-full bg-[color:var(--warning)] px-1.5 py-0.5 text-[10px] text-white">
                                    {toPersianDigits(pendingCount)}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilter("all")}
                                className={
                                    "rounded-lg px-3 py-2 text-xs font-bold transition " +
                                    (filter === "all"
                                        ? "bg-card text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground")
                                }
                            >
                                همه درخواست‌ها
                            </button>
                        </div>
                    </SheetHeader>

                    <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                        <div className="space-y-3 p-4">
                            {sortedRequests.length === 0 ? (
                                <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 text-center">
                                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                        <ShoppingBag className="h-6 w-6" />
                                    </span>
                                    <p className="text-sm font-bold">
                                        {filter === "pending"
                                            ? "درخواست منتظری وجود ندارد"
                                            : "هنوز درخواستی ثبت نشده"}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                        درخواست‌های جدید به‌صورت خودکار در همین بخش نمایش داده
                                        می‌شوند.
                                    </p>
                                </div>
                            ) : (
                                sortedRequests.map((request) => (
                                    <RequestCard
                                        key={request.id}
                                        request={request}
                                        busy={busyId === request.id}
                                        onApprove={() => void handleApprove(request)}
                                        onReject={() => openRejectDialog(request)}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    <div className="shrink-0 border-t border-border bg-background px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                        <Button variant="outline" className="w-full" onClick={openFullPage}>
                            مشاهده صفحه کامل درخواست‌ها
                            <ArrowLeft className="ms-2 h-4 w-4" />
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            <Dialog
                open={Boolean(rejectTarget)}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen && !busyId) closeRejectDialog();
                }}
            >
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-right">
                            رد درخواست {rejectTarget?.tradeType === "sell" ? "فروش" : "خرید"}
                        </DialogTitle>
                        <DialogDescription className="text-right">
                            علت رد درخواست {rejectTarget?.code} در سوابق ثبت می‌شود.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        rows={4}
                        autoFocus
                        value={rejectReason}
                        disabled={Boolean(busyId)}
                        onChange={(event) => setRejectReason(event.target.value)}
                        placeholder="علت رد درخواست را بنویسید..."
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            disabled={Boolean(busyId)}
                            onClick={closeRejectDialog}
                        >
                            انصراف
                        </Button>
                        <Button
                            disabled={Boolean(busyId)}
                            onClick={() => void handleReject()}
                            className="bg-[color:var(--negative)] text-white hover:opacity-90"
                        >
                            {busyId ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                            ثبت رد درخواست
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function RequestCard({
    request,
    busy,
    onApprove,
    onReject,
}: {
    request: AdminPurchaseRequest;
    busy: boolean;
    onApprove: () => void;
    onReject: () => void;
}) {
    return (
        <article
            className={
                "rounded-2xl border p-4 shadow-elegant transition-colors " +
                (request.tradeType === "sell"
                    ? "border-[color:var(--negative)]/45 bg-trade-sell"
                    : "border-[color:var(--positive)]/45 bg-trade-buy")
            }
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{request.buyerName}</div>
                    <div
                        className={
                            "mt-1 text-xs font-bold " +
                            (request.tradeType === "sell" ? "text-negative" : "text-positive")
                        }
                    >
                        درخواست {request.tradeType === "sell" ? "فروش" : "خرید"}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-muted-foreground" dir="ltr">
                        {request.code}
                    </div>
                </div>
                <RequestStatusBadge status={request.status} />
            </div>

            <div className="mt-3 rounded-xl bg-muted/45 p-3">
                <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate font-bold">{request.productTitle}</span>
                    <span className="shrink-0 text-muted-foreground">
                        {toPersianDigits(request.weight)} {request.unit}
                    </span>
                </div>
                <div className="mt-2 flex items-end justify-between gap-3 border-t border-border/70 pt-2">
                    <span className="text-[11px] text-muted-foreground">مبلغ کل</span>
                    <span className="text-sm font-black text-[color:var(--gold-dark)]">
                        {formatNumber(request.total)}
                        <span className="ms-1 text-[10px] font-medium">تومان</span>
                    </span>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1" dir="ltr">
                    <Phone className="h-3 w-3" />
                    {toPersianDigits(request.mobile)}
                </span>
                <span
                    className="inline-flex items-center gap-1"
                    title={
                        formatPersianDate(request.createdAt) +
                        "، " +
                        formatPersianTime(request.createdAt)
                    }
                >
                    <Clock3 className="h-3 w-3" />
                    {formatRelativeMinutes(request.createdAt)}
                </span>
            </div>

            {request.status === "pending" ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                        size="sm"
                        disabled={busy}
                        onClick={onApprove}
                        className="bg-[color:var(--positive)] text-white hover:opacity-90"
                    >
                        {busy ? (
                            <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="me-1.5 h-4 w-4" />
                        )}
                        تأیید
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={onReject}
                        className="border-[color:var(--negative)]/40 text-negative hover:bg-negative-soft"
                    >
                        <XCircle className="me-1.5 h-4 w-4" />
                        رد
                    </Button>
                </div>
            ) : null}
        </article>
    );
}
