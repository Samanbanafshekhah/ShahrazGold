import { ArrowDown, ArrowUp, Minus, Radio } from "lucide-react";
import type { AssetCategory, GoldAsset } from "@/lib/types";
import type { TradeAction } from "@/lib/purchase";
import { formatMoney, formatPercent, formatRelativeMinutes, formatToman } from "@/lib/formatters";

const SECTIONS: { category: AssetCategory; title: string; description: string }[] = [
    { category: "melted", title: "آبشده", description: "نرخ خرید و فروش طلای آبشده" },
    { category: "gold", title: "طلا", description: "قیمت روز انواع طلا" },
    { category: "coin", title: "سکه", description: "قیمت روز انواع سکه" },
];

export function PriceUpdateStatus({
    updatedAt,
    refreshing,
    managerOnline,
}: {
    updatedAt?: string;
    refreshing?: boolean;
    managerOnline?: boolean | null;
}) {
    return (
        <div
            className="flex flex-wrap items-center justify-between gap-2 border-y border-border bg-card px-3 py-2.5 sm:rounded-xl sm:border sm:px-4"
            role="status"
            aria-live="polite"
        >
            <p className="text-[11px] text-muted-foreground sm:text-xs">
                آخرین به‌روزرسانی قیمت: {updatedAt ? formatRelativeMinutes(updatedAt) : "—"}
            </p>
            <div className="flex flex-wrap items-center gap-3">
                {managerOnline !== undefined && (
                    <span
                        className={
                            "inline-flex items-center gap-1.5 text-[11px] font-bold sm:text-xs " +
                            (managerOnline ? "text-positive" : "text-negative")
                        }
                    >
                        <span
                            className={
                                "h-2 w-2 rounded-full " +
                                (managerOnline ? "bg-positive" : "bg-negative")
                            }
                        />
                        {managerOnline ? "مدیر آنلاین است" : "مدیر آفلاین است"}
                    </span>
                )}
            </div>
        </div>
    );
}

export function MarketPriceBoard({
    assets,
    onTrade,
}: {
    assets: GoldAsset[];
    onTrade: (asset: GoldAsset, action: TradeAction, trigger: HTMLButtonElement) => void;
}) {
    return (
        <div className="space-y-5 sm:space-y-6">
            {SECTIONS.map((section) => {
                const items = assets.filter((asset) => asset.category === section.category);
                if (!items.length) return null;
                return (
                    <PriceSection
                        key={section.category}
                        title={section.title}
                        description={section.description}
                        assets={items}
                        prominent={section.category === "melted"}
                        onTrade={onTrade}
                    />
                );
            })}
        </div>
    );
}

function PriceSection({
    title,
    description,
    assets,
    prominent = false,
    onTrade,
}: {
    title: string;
    description: string;
    assets: GoldAsset[];
    prominent?: boolean;
    onTrade: (asset: GoldAsset, action: TradeAction, trigger: HTMLButtonElement) => void;
}) {
    return (
        <section
            aria-labelledby={`price-section-${assets[0].category}`}
            className={
                "overflow-hidden border-y border-border bg-card sm:rounded-2xl sm:border sm:shadow-elegant " +
                (prominent ? "sm:ring-1 sm:ring-[color:var(--gold)]/25" : "")
            }
        >
            <header className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.15fr)] items-end gap-1.5 border-b border-border bg-muted/35 px-3 py-3 sm:px-5 sm:py-4 md:flex md:items-center md:justify-between md:gap-3">
                <div className="min-w-0">
                    <h2
                        id={`price-section-${assets[0].category}`}
                        className="text-sm font-extrabold sm:text-base"
                    >
                        {title}
                    </h2>
                    <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
                        {description}
                    </p>
                </div>
                <span className="text-center text-[10px] font-bold text-muted-foreground md:hidden">
                    خرید
                </span>
                <span className="text-center text-[10px] font-bold text-muted-foreground md:hidden">
                    فروش
                </span>
                {prominent && (
                    <span className="hidden items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-[10px] font-bold text-[color:var(--gold-dark)] sm:text-[11px] md:inline-flex">
                        <Radio className="h-3 w-3" /> بازار آبشده
                    </span>
                )}
            </header>

            <div className="hidden grid-cols-[minmax(170px,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)_110px] gap-3 border-b border-border px-5 py-2.5 text-[11px] text-muted-foreground md:grid">
                <span>محصول</span>
                <span>خرید</span>
                <span>فروش</span>
                <span>تغییر</span>
            </div>

            <div className="divide-y divide-border/80">
                {assets.map((asset) => (
                    <PriceRow key={asset.symbol} asset={asset} onTrade={onTrade} />
                ))}
            </div>
        </section>
    );
}

function PriceRow({
    asset,
    onTrade,
}: {
    asset: GoldAsset;
    onTrade: (asset: GoldAsset, action: TradeAction, trigger: HTMLButtonElement) => void;
}) {
    const unavailable = asset.available === false;
    return (
        <article className="px-3 py-3 transition-colors hover:bg-muted/25 sm:px-5 sm:py-4">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.15fr)] items-center gap-1.5 md:grid-cols-[minmax(170px,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)_110px] md:gap-3">
                <div className="group min-w-0">
                    <h3 className="truncate text-[12.5px] font-bold transition-colors group-hover:text-[color:var(--gold-dark)] sm:text-sm">
                        {asset.title}
                    </h3>
                    <p className="mt-0.5 text-[9.5px] text-muted-foreground sm:text-[10px]">
                        هر {asset.unit} · {asset.currency === "IRR" ? "تومان" : "دلار"}
                    </p>
                </div>

                <PriceCell
                    label="خرید"
                    value={unavailable ? undefined : asset.buy}
                    currency={asset.currency}
                    tone="buy"
                    assetTitle={asset.title}
                    onClick={(trigger) => onTrade(asset, "buy", trigger)}
                />
                <PriceCell
                    label="فروش"
                    value={unavailable ? undefined : asset.sell}
                    currency={asset.currency}
                    tone="sell"
                    assetTitle={asset.title}
                    onClick={(trigger) => onTrade(asset, "sell", trigger)}
                />
                <div className="hidden md:block">
                    <TrendIndicator change={asset.change} percentage={asset.changePercent} />
                </div>
            </div>
        </article>
    );
}

function PriceCell({
    label,
    value,
    currency,
    tone,
    assetTitle,
    onClick,
}: {
    label: "خرید" | "فروش";
    value?: number;
    currency: GoldAsset["currency"];
    tone: "buy" | "sell";
    assetTitle: string;
    onClick: (trigger: HTMLButtonElement) => void;
}) {
    const formatted =
        value === undefined
            ? "—"
            : currency === "IRR"
              ? formatToman(value)
              : formatMoney(value, currency);
    return (
        <button
            type="button"
            disabled={value === undefined}
            onClick={(event) => onClick(event.currentTarget)}
            aria-label={
                value === undefined
                    ? `قیمت ${label} ${assetTitle} موجود نیست`
                    : `ثبت درخواست ${label} ${assetTitle}`
            }
            className={
                "min-w-0 rounded-lg px-1 py-2 text-center transition-colors enabled:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed sm:px-2 md:text-start " +
                (value === undefined
                    ? "bg-muted/55"
                    : tone === "buy"
                      ? "bg-positive-soft"
                      : "bg-negative-soft")
            }
        >
            <span className="sr-only">{label}</span>
            <strong
                className={
                    "block whitespace-nowrap text-[12.5px] font-extrabold tabular-nums sm:text-sm lg:text-base " +
                    (value === undefined
                        ? "text-muted-foreground"
                        : tone === "buy"
                          ? "text-positive"
                          : "text-negative")
                }
            >
                {formatted}
            </strong>
        </button>
    );
}

function TrendIndicator({ change, percentage }: { change: number; percentage: number }) {
    const Icon = change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;
    const tone =
        change > 0 ? "text-positive" : change < 0 ? "text-negative" : "text-muted-foreground";
    return (
        <span
            className={`inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-bold tabular-nums sm:text-[11px] ${tone}`}
            aria-label={`تغییر قیمت ${formatPercent(percentage)}`}
        >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {formatPercent(percentage)}
        </span>
    );
}
