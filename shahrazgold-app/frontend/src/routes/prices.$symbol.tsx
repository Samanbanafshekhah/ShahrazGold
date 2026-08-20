import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PriceChange } from "@/components/price-change";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { PurchaseRequestForm } from "@/components/purchase-request-form";
import { refreshAssets, useAsset } from "@/lib/api-data";
import { formatMoney, formatRelativeMinutes } from "@/lib/formatters";
import { purchaseProductFromAsset } from "@/lib/purchase";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/prices/$symbol")({
    component: PriceDetailPage,
});

function PriceDetailPage() {
    const { symbol } = useParams({ from: "/prices/$symbol" });
    const { item: asset, loading } = useAsset(symbol);
    const [refreshing, setRefreshing] = useState(false);
    const [showBuyForm, setShowBuyForm] = useState(false);

    useEffect(() => setShowBuyForm(false), [symbol]);

    async function onRefresh() {
        setRefreshing(true);
        await refreshAssets();
        setRefreshing(false);
    }

    if (!asset && loading) {
        return (
            <AppShell>
                <div className="py-16 text-center text-sm text-muted-foreground">
                    در حال دریافت قیمت…
                </div>
            </AppShell>
        );
    }

    if (!asset) {
        return (
            <AppShell>
                <EmptyState
                    title="دارایی یافت نشد"
                    description="نماد درخواستی در بازار موجود نیست."
                    action={
                        <Link
                            to="/dashboard"
                            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-muted"
                        >
                            بازگشت به داشبورد
                        </Link>
                    }
                />
            </AppShell>
        );
    }

    return (
        <AppShell onRefresh={onRefresh} refreshing={refreshing}>
            <Link
                to="/dashboard"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground sm:text-xs"
            >
                <ArrowRight className="h-3.5 w-3.5" /> بازگشت به داشبورد
            </Link>
            <section className="mt-3 bg-card py-4 sm:mt-4 sm:rounded-3xl sm:border sm:border-border sm:p-8 sm:shadow-elegant">
                <div className="grid gap-4 sm:gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                                {asset.category === "gold"
                                    ? "طلا"
                                    : asset.category === "melted"
                                      ? "آبشده"
                                      : "سکه"}
                            </span>
                            <span>·</span>
                            <span>{asset.symbol}</span>
                        </div>
                        <h1 className="mt-1 text-xl font-extrabold leading-8 sm:text-3xl">
                            {asset.title}
                        </h1>
                        <p className="mt-0.5 text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">
                            آخرین به‌روزرسانی: {formatRelativeMinutes(asset.updatedAt)}
                        </p>
                    </div>
                    <div className="text-start md:text-end">
                        <div className="text-2xl font-extrabold leading-9 tabular-nums sm:text-3xl">
                            {formatMoney(asset.price, asset.currency)}
                        </div>
                        <div className="mt-2 flex md:justify-end">
                            <PriceChange
                                change={asset.change}
                                changePercent={asset.changePercent}
                                currency={asset.currency}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 border-y border-border sm:mt-6 sm:grid-cols-4 sm:gap-3 sm:border-0">
                    <Metric label="بازگشایی" value={formatMoney(asset.open, asset.currency)} />
                    <Metric label="بالاترین" value={formatMoney(asset.high, asset.currency)} />
                    <Metric label="پایین‌ترین" value={formatMoney(asset.low, asset.currency)} />
                    <Metric label="واحد" value={`هر ${asset.unit}`} />
                </div>

                {asset.buy && (
                    <div className="mt-4 sm:mt-6">
                        <div className="border-y border-border bg-background py-3 sm:rounded-2xl sm:border sm:p-4">
                            <div className="text-[11px] text-muted-foreground sm:text-xs">
                                قیمت خرید
                            </div>
                            <div className="mt-1 text-lg font-extrabold tabular-nums text-positive sm:text-xl">
                                {asset.buy ? formatMoney(asset.buy, asset.currency) : "—"}
                            </div>
                            <Button
                                type="button"
                                onClick={() => setShowBuyForm(true)}
                                className="mt-3 h-10 w-full rounded-xl bg-gold text-xs font-bold text-primary-foreground hover:opacity-90 sm:text-sm"
                            >
                                درخواست خرید
                            </Button>
                        </div>
                    </div>
                )}

                {asset.buy && showBuyForm && (
                    <div className="mt-4 border-y border-gold/50 bg-background py-3 sm:mt-6 sm:rounded-2xl sm:border sm:p-4 sm:shadow-elegant">
                        <div className="mb-4">
                            <h2 className="text-sm font-extrabold leading-6 sm:text-base">
                                ثبت درخواست خرید {asset.title}
                            </h2>
                            <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground sm:text-xs">
                                محصول و قیمت خرید انتخاب شده‌اند؛ روش محاسبه را مشخص کنید.
                            </p>
                        </div>
                        <PurchaseRequestForm
                            product={purchaseProductFromAsset(asset)}
                            onCancel={() => setShowBuyForm(false)}
                            onSuccess={() => setShowBuyForm(false)}
                        />
                    </div>
                )}
            </section>
        </AppShell>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 border-b border-border p-2.5 odd:border-e last:border-b-0 sm:rounded-2xl sm:border sm:bg-background sm:p-3 sm:odd:border-e">
            <div className="text-[10px] text-muted-foreground sm:text-[11px]">{label}</div>
            <div className="mt-1 truncate text-xs font-bold tabular-nums sm:text-sm">{value}</div>
        </div>
    );
}
