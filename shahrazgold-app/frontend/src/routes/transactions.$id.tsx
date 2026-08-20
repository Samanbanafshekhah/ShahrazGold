import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { TRANSACTION_TYPE_LABELS, useTransaction } from "@/lib/api-data";
import {
    formatCoinCount,
    formatPersianDate,
    formatPersianTime,
    formatRial,
    formatToman,
    formatWeight,
} from "@/lib/formatters";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/transactions/$id")({
    component: TransactionDetailPage,
});

function TransactionDetailPage() {
    const { id } = useParams({ from: "/transactions/$id" });
    const { item: t, loading } = useTransaction(id);
    if (loading) {
        return (
            <AppShell>
                <div className="py-16 text-center text-sm text-muted-foreground">
                    در حال دریافت تراکنش…
                </div>
            </AppShell>
        );
    }
    if (!t) {
        return (
            <AppShell>
                <EmptyState
                    title="تراکنش یافت نشد"
                    action={
                        <Link
                            to="/transactions"
                            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-muted"
                        >
                            بازگشت به لیست
                        </Link>
                    }
                />
            </AppShell>
        );
    }
    const qty = t.unit === "عدد" ? formatCoinCount(t.quantity) : formatWeight(t.quantity);
    return (
        <AppShell>
            <Link
                to="/transactions"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
                <ArrowRight className="h-3.5 w-3.5" /> بازگشت به تراکنش‌ها
            </Link>
            <section className="mt-4 rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground font-mono">{t.trackingCode}</p>
                        <h1 className="mt-1 text-2xl font-extrabold">
                            {TRANSACTION_TYPE_LABELS[t.type]} {t.assetTitle}
                        </h1>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {formatPersianDate(t.createdAt)} · ساعت {formatPersianTime(t.createdAt)}
                        </p>
                    </div>
                    <StatusBadge status={t.status} />
                </div>
                <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                    <Row label="مقدار" value={qty} />
                    <Row label="قیمت واحد" value={formatRial(t.unitPrice)} />
                    <Row label="مبلغ کل (ریال)" value={formatRial(t.total)} />
                    <Row label="مبلغ کل (تومان)" value={formatToman(t.total)} />
                    <Row label="نماد" value={t.assetSymbol} />
                    <Row
                        label="آخرین به‌روزرسانی"
                        value={`${formatPersianDate(t.updatedAt)} · ${formatPersianTime(t.updatedAt)}`}
                    />
                </dl>
                {t.description && (
                    <div className="mt-6 rounded-2xl border border-border bg-background p-4 text-sm">
                        <div className="text-xs text-muted-foreground">توضیحات</div>
                        <p className="mt-1">{t.description}</p>
                    </div>
                )}
            </section>
        </AppShell>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-bold tabular-nums">{value}</dd>
        </div>
    );
}
