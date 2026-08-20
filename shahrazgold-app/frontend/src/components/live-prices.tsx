import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAssets } from "@/lib/api-data";
import { apiRequest } from "@/lib/api";
import type { GoldAsset } from "@/lib/types";
import { AlertCircle, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PurchaseRequestForm } from "@/components/purchase-request-form";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatNumber, formatPercent } from "@/lib/formatters";
import {
    priceCategories,
    type LivePriceAsset,
    type LivePriceCategory,
} from "@/lib/live-price-data";
import type { PurchaseProduct } from "@/lib/purchase";

type PageState = "ready" | "loading" | "empty" | "error";

export function GoldPricePage({
    showHeader = true,
    loginRequiredTrade = false,
}: {
    showHeader?: boolean;
    loginRequiredTrade?: boolean;
}) {
    const [category, setCategory] = useState<LivePriceCategory>("all");
    const [selectedAsset, setSelectedAsset] = useState<LivePriceAsset | null>(null);
    const { items: products, loading, error } = useAssets();
    const [managerOnline, setManagerOnline] = useState<boolean | null>(null);
    const assets = useMemo(() => products.map(toLivePriceAsset), [products]);
    useEffect(() => {
        setSelectedAsset((current) =>
            current ? (assets.find((asset) => asset.id === current.id) ?? null) : null,
        );
    }, [assets]);
    useEffect(() => {
        let active = true;
        const checkManagerStatus = () => {
            void apiRequest<{ online: boolean }>("manager-status", { authenticated: false })
                .then((response) => {
                    if (active) setManagerOnline(Boolean(response.data.online));
                })
                .catch(() => undefined);
        };
        checkManagerStatus();
        const timer = window.setInterval(checkManagerStatus, 3000);
        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, []);
    const pageState: PageState = error
        ? "error"
        : loading
          ? "loading"
          : assets.length
            ? "ready"
            : "empty";
    const filteredAssets = useMemo(
        () => assets.filter((asset) => category === "all" || asset.category === category),
        [assets, category],
    );

    return (
        <div className="space-y-6">
            {showHeader && <PricePageHeader />}
            <ManagerStatusBar online={managerOnline} />
            <div className="rounded-2xl border border-border bg-card p-4 shadow-elegant">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-sm font-extrabold">قیمت لحظه ای بازار ارز</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            دسته دارایی مورد نظر را انتخاب کنید.
                        </p>
                    </div>
                    <span className="w-fit rounded-full bg-gold-soft px-3 py-1 text-xs font-bold text-[color:var(--gold-dark)]">
                        {formatNumber(filteredAssets.length)} دارایی
                    </span>
                </div>
                <PriceCategoryFilters selected={category} onSelect={setCategory} />
            </div>

            <PriceContentState state={pageState} hasData={filteredAssets.length > 0}>
                {selectedAsset && (
                    <BuyOrderPanel asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
                )}
                <div className="hidden lg:block">
                    <PriceTableView
                        assets={filteredAssets}
                        loginRequiredTrade={loginRequiredTrade}
                        onTrade={setSelectedAsset}
                    />
                </div>
                <div className="grid gap-3 lg:hidden">
                    <PriceCardGrid
                        assets={filteredAssets}
                        loginRequiredTrade={loginRequiredTrade}
                        onTrade={setSelectedAsset}
                    />
                </div>
            </PriceContentState>
        </div>
    );
}

function ManagerStatusBar({ online }: { online: boolean | null }) {
    const isOnline = online === true;
    return (
        <div
            className={
                "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold " +
                (isOnline
                    ? "border-positive/30 bg-positive-soft text-positive"
                    : "border-negative/30 bg-negative-soft text-negative")
            }
            role="status"
            aria-live="polite"
        >
            <span className="inline-flex items-center gap-2">
                <span
                    className={"h-2 w-2 rounded-full " + (isOnline ? "bg-positive" : "bg-negative")}
                />
                {isOnline ? "مدیر آنلاین است" : "مدیر آفلاین است"}
            </span>
            {!isOnline && (
                <span className="text-[11px] font-medium">
                    ثبت درخواست خرید موقتاً غیرفعال است.
                </span>
            )}
        </div>
    );
}

function PricePageHeader() {
    return (
        <section className="rounded-3xl border border-border bg-card px-5 py-6 shadow-elegant sm:px-7 sm:py-8">
            <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold bg-gold-soft px-3 py-1 text-xs font-bold text-[color:var(--gold-dark)]">
                    بازار طلا و سکه
                </div>
                <h1 className="text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
                    قیمت لحظه‌ای طلا و سکه
                </h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                    آخرین تغییرات قیمت طلا و انواع سکه را به‌صورت لحظه‌ای مشاهده کنید.
                </p>
            </div>
        </section>
    );
}

function PriceCategoryFilters({
    selected,
    onSelect,
}: {
    selected: LivePriceCategory;
    onSelect: (category: LivePriceCategory) => void;
}) {
    return (
        <div
            className="flex gap-2 overflow-x-auto pb-1 lg:pb-0"
            aria-label="فیلتر دسته‌بندی قیمت‌ها"
        >
            {priceCategories.map((item) => {
                const active = selected === item.key;
                return (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => onSelect(item.key)}
                        className={
                            "h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                            (active
                                ? "border-[color:var(--gold)] bg-gold-soft text-[color:var(--gold-dark)]"
                                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground")
                        }
                        aria-pressed={active}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}

function PriceContentState({
    state,
    hasData,
    children,
}: {
    state: PageState;
    hasData: boolean;
    children: React.ReactNode;
}) {
    if (state === "loading") {
        return (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-border bg-card">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (state === "error") {
        return (
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-elegant">
                <AlertCircle className="mx-auto h-8 w-8 text-negative" />
                <h2 className="mt-3 text-base font-extrabold">دریافت قیمت‌ها با خطا روبه‌رو شد</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    لطفاً چند لحظه دیگر دوباره صفحه را بررسی کنید.
                </p>
            </div>
        );
    }

    if (state === "empty" || !hasData) {
        return (
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-elegant">
                <h2 className="text-base font-extrabold">دارایی‌ای برای نمایش وجود ندارد</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    دسته‌بندی دیگری را انتخاب کنید یا بعداً دوباره بررسی کنید.
                </p>
            </div>
        );
    }

    return <>{children}</>;
}

function PriceTableView({
    assets,
    loginRequiredTrade,
    onTrade,
}: {
    assets: LivePriceAsset[];
    loginRequiredTrade: boolean;
    onTrade: (asset: LivePriceAsset) => void;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/70 hover:bg-muted/70">
                        <TableHead className="h-12 text-start">نام دارایی</TableHead>
                        <TableHead className="h-12 text-start">قیمت لحظه‌ای</TableHead>
                        <TableHead className="h-12 text-start">تغییر روزانه</TableHead>
                        <TableHead className="h-12 text-start">قیمت خرید</TableHead>
                        <TableHead className="h-12 text-start">عملیات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {assets.map((asset, index) => (
                        <TableRow
                            key={asset.id}
                            className={
                                "border-border transition hover:bg-gold-soft/40 " +
                                (index % 2 === 0 ? "bg-card" : "bg-muted/30")
                            }
                        >
                            <TableCell className="min-w-52 py-4">
                                <PriceAssetInfo asset={asset} />
                            </TableCell>
                            <TableCell className="min-w-40 py-4 text-sm font-extrabold tabular-nums">
                                {formatToman(asset.currentPrice)}
                            </TableCell>
                            <TableCell className="py-4">
                                <PriceChangeBadge value={asset.dailyChange} />
                            </TableCell>
                            <TableCell className="min-w-36 py-4 text-sm tabular-nums text-muted-foreground">
                                {formatToman(asset.buyPrice)}
                            </TableCell>
                            <TableCell className="py-4">
                                <TradeButton
                                    asset={asset}
                                    loginRequired={loginRequiredTrade}
                                    onTrade={onTrade}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function PriceCardGrid({
    assets,
    loginRequiredTrade,
    onTrade,
}: {
    assets: LivePriceAsset[];
    loginRequiredTrade: boolean;
    onTrade: (asset: LivePriceAsset) => void;
}) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
                <article
                    key={asset.id}
                    className="rounded-2xl border border-border bg-card p-4 shadow-elegant transition hover:border-[color:var(--gold)]"
                >
                    <div className="flex items-start justify-between gap-3">
                        <PriceAssetInfo asset={asset} />
                        <PriceChangeBadge value={asset.dailyChange} />
                    </div>
                    <div className="mt-5">
                        <div className="text-xs text-muted-foreground">قیمت لحظه‌ای</div>
                        <div className="mt-1 text-2xl font-extrabold tabular-nums">
                            {formatToman(asset.currentPrice)}
                        </div>
                    </div>
                    <div className="mt-4 text-sm">
                        <PriceMiniMetric label="قیمت خرید" value={formatToman(asset.buyPrice)} />
                    </div>
                    <TradeButton
                        asset={asset}
                        className="mt-4 w-full"
                        loginRequired={loginRequiredTrade}
                        onTrade={onTrade}
                    />
                </article>
            ))}
        </div>
    );
}

function PriceAssetInfo({ asset }: { asset: LivePriceAsset }) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <span
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-xs font-extrabold text-[color:var(--gold-dark)]"
                aria-hidden
            >
                {asset.icon}
            </span>
            <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold">{asset.name}</span>
                {asset.symbol && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                        {asset.symbol}
                    </span>
                )}
            </span>
        </div>
    );
}

function PriceMiniMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-border bg-background p-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 font-bold tabular-nums">{value}</div>
        </div>
    );
}

function PriceChangeBadge({ value }: { value: number }) {
    const tone =
        value > 0
            ? "bg-positive-soft text-positive"
            : value < 0
              ? "bg-negative-soft text-negative"
              : "bg-muted text-muted-foreground";

    return (
        <span
            className={`inline-flex h-8 items-center rounded-full px-2.5 text-xs font-extrabold ${tone}`}
        >
            {formatPercent(value)}
        </span>
    );
}

function TradeButton({
    asset,
    className = "",
    loginRequired = false,
    onTrade,
}: {
    asset: LivePriceAsset;
    className?: string;
    loginRequired?: boolean;
    onTrade: (asset: LivePriceAsset) => void;
}) {
    if (loginRequired) {
        return (
            <Button
                asChild
                className={`h-10 rounded-xl bg-gold px-4 text-xs font-extrabold text-primary-foreground hover:opacity-90 ${className}`}
            >
                <Link to="/login">
                    <ShoppingBag className="h-4 w-4" />
                    برای خرید ابتدا وارد شوید
                </Link>
            </Button>
        );
    }

    return (
        <Button
            type="button"
            onClick={() => onTrade(asset)}
            className={`h-10 rounded-xl bg-gold px-4 text-xs font-extrabold text-primary-foreground hover:opacity-90 ${className}`}
        >
            <ShoppingBag className="h-4 w-4" />
            خرید
        </Button>
    );
}

function BuyOrderPanel({ asset, onClose }: { asset: LivePriceAsset; onClose: () => void }) {
    const unit = getTradeUnit(asset);
    const product = useMemo<PurchaseProduct>(
        () => ({
            id: asset.id,
            productId: asset.productId,
            symbol: asset.symbol ?? asset.id,
            title: asset.name,
            unit: asset.unit ?? unit,
            unitPrice: asset.buyPrice,
            priceUnit: "تومان",
            updatedAt: asset.updatedAt ?? new Date(0).toISOString(),
            change: asset.dailyChange,
            changePercent: asset.dailyChange,
            available: asset.buyPrice > 0,
        }),
        [asset, unit],
    );

    return (
        <section className="rounded-2xl border border-gold/50 bg-card p-4 shadow-elegant sm:p-5">
            <div className="mb-4">
                <h3 className="text-base font-extrabold">ثبت درخواست خرید {asset.name}</h3>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    محصول و قیمت خرید انتخاب شده‌اند؛ روش محاسبه را مشخص کنید.
                </p>
            </div>
            <PurchaseRequestForm product={product} onCancel={onClose} onSuccess={onClose} />
        </section>
    );
}

function toLivePriceAsset(asset: GoldAsset): LivePriceAsset {
    return {
        id: String(asset.productId ?? asset.symbol),
        productId: asset.productId,
        name: asset.title,
        symbol: asset.symbol,
        category: asset.category,
        currentPrice: asset.price / 10,
        buyPrice: (asset.buy ?? asset.price) / 10,
        dailyChange: asset.changePercent,
        icon: asset.symbol.slice(0, 2),
        unit: asset.unit,
        updatedAt: asset.updatedAt,
    };
}

function formatToman(value: number): string {
    return `${formatNumber(value)} تومان`;
}

function getTradeUnit(asset: LivePriceAsset): string {
    if (asset.category === "coin") return "عدد";
    if (asset.category === "currency") return "واحد";
    return "گرم";
}
