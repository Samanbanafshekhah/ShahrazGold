import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowUp, GripVertical, Minus, Radio } from "lucide-react";
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
    canReorder = false,
    onReorder,
}: {
    assets: GoldAsset[];
    onTrade: (asset: GoldAsset, action: TradeAction, trigger: HTMLButtonElement) => void;
    canReorder?: boolean;
    onReorder?: (productIds: number[]) => Promise<void>;
}) {
    const [orderedAssets, setOrderedAssets] = useState(assets);
    const [savingOrder, setSavingOrder] = useState(false);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    useEffect(() => {
        if (!savingOrder) setOrderedAssets(assets);
    }, [assets, savingOrder]);

    const displayedAssets = canReorder ? orderedAssets : assets;
    const sections = consecutiveSections(displayedAssets);

    async function handleDragEnd(event: DragEndEvent) {
        if (savingOrder || !event.over || event.active.id === event.over.id || !onReorder) return;

        const previousOrder = orderedAssets;
        const oldIndex = previousOrder.findIndex((asset) => sortableId(asset) === event.active.id);
        const newIndex = previousOrder.findIndex((asset) => sortableId(asset) === event.over?.id);
        if (oldIndex < 0 || newIndex < 0) return;

        const nextOrder = arrayMove(previousOrder, oldIndex, newIndex);
        const productIds = nextOrder.flatMap((asset) =>
            asset.productId === undefined ? [] : [asset.productId],
        );
        if (productIds.length !== nextOrder.length) return;

        setOrderedAssets(nextOrder);
        setSavingOrder(true);
        try {
            await onReorder(productIds);
        } catch {
            setOrderedAssets(previousOrder);
        } finally {
            setSavingOrder(false);
        }
    }

    const content = (
        <div className="space-y-5 sm:space-y-6">
            {sections.map(({ key, section, items }) => (
                <PriceSection
                    key={key}
                    sectionId={key}
                    title={section.title}
                    description={section.description}
                    assets={items}
                    prominent={section.category === "melted"}
                    sortable={canReorder}
                    sortingDisabled={savingOrder}
                    onTrade={onTrade}
                />
            ))}
        </div>
    );

    if (!canReorder) return content;

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
                items={displayedAssets.map(sortableId)}
                strategy={verticalListSortingStrategy}
            >
                {content}
            </SortableContext>
        </DndContext>
    );
}

function consecutiveSections(assets: GoldAsset[]) {
    return assets.reduce<{ key: string; section: (typeof SECTIONS)[number]; items: GoldAsset[] }[]>(
        (groups, asset, index) => {
            const section = SECTIONS.find((candidate) => candidate.category === asset.category);
            if (!section) return groups;
            const previous = groups.at(-1);
            if (previous?.section.category === section.category) {
                previous.items.push(asset);
            } else {
                groups.push({ key: `${section.category}-${index}`, section, items: [asset] });
            }
            return groups;
        },
        [],
    );
}

function sortableId(asset: GoldAsset): string {
    return `product-${asset.productId ?? asset.symbol}`;
}

function PriceSection({
    sectionId,
    title,
    description,
    assets,
    prominent = false,
    sortable = false,
    sortingDisabled = false,
    onTrade,
}: {
    sectionId: string;
    title: string;
    description: string;
    assets: GoldAsset[];
    prominent?: boolean;
    sortable?: boolean;
    sortingDisabled?: boolean;
    onTrade: (asset: GoldAsset, action: TradeAction, trigger: HTMLButtonElement) => void;
}) {
    return (
        <section
            aria-labelledby={`price-section-${sectionId}`}
            className={
                "overflow-hidden border-y border-border bg-card sm:rounded-2xl sm:border sm:shadow-elegant " +
                (prominent ? "sm:ring-1 sm:ring-[color:var(--gold)]/25" : "")
            }
        >
            <header className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.15fr)] items-end gap-1.5 border-b border-border bg-muted/35 px-3 py-3 sm:px-5 sm:py-4 md:flex md:items-center md:justify-between md:gap-3">
                <div className="min-w-0">
                    <h2
                        id={`price-section-${sectionId}`}
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
                {assets.map((asset) =>
                    sortable ? (
                        <SortablePriceRow
                            key={asset.symbol}
                            asset={asset}
                            disabled={sortingDisabled}
                            onTrade={onTrade}
                        />
                    ) : (
                        <PriceRow key={asset.symbol} asset={asset} onTrade={onTrade} />
                    ),
                )}
            </div>
        </section>
    );
}

function SortablePriceRow({
    asset,
    disabled,
    onTrade,
}: {
    asset: GoldAsset;
    disabled: boolean;
    onTrade: (asset: GoldAsset, action: TradeAction, trigger: HTMLButtonElement) => void;
}) {
    const {
        attributes,
        listeners,
        setActivatorNodeRef,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: sortableId(asset), disabled });
    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        position: "relative",
        zIndex: isDragging ? 20 : undefined,
    };
    const dragHandle = (
        <button
            ref={setActivatorNodeRef}
            type="button"
            disabled={disabled}
            aria-label={`تغییر ترتیب ${asset.title}`}
            className="inline-flex h-9 w-8 shrink-0 touch-none items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground enabled:cursor-grab active:cursor-grabbing disabled:cursor-wait"
            {...attributes}
            {...listeners}
        >
            <GripVertical className="h-4 w-4" aria-hidden />
        </button>
    );

    return (
        <PriceRow
            asset={asset}
            articleRef={setNodeRef}
            articleStyle={style}
            dragging={isDragging}
            dragHandle={dragHandle}
            onTrade={onTrade}
        />
    );
}

function PriceRow({
    asset,
    articleRef,
    articleStyle,
    dragging = false,
    dragHandle,
    onTrade,
}: {
    asset: GoldAsset;
    articleRef?: (node: HTMLElement | null) => void;
    articleStyle?: CSSProperties;
    dragging?: boolean;
    dragHandle?: ReactNode;
    onTrade: (asset: GoldAsset, action: TradeAction, trigger: HTMLButtonElement) => void;
}) {
    const unavailable = asset.available === false;
    return (
        <article
            ref={articleRef}
            style={articleStyle}
            className={
                "px-3 py-3 transition-[background-color,box-shadow,opacity] hover:bg-muted/25 sm:px-5 sm:py-4 " +
                (dragging ? "bg-card opacity-90 shadow-xl ring-1 ring-[color:var(--gold)]/40" : "")
            }
        >
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.15fr)] items-center gap-1.5 md:grid-cols-[minmax(170px,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)_110px] md:gap-3">
                <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                    {dragHandle}
                    <div className="group min-w-0">
                        <h3 className="truncate text-[12.5px] font-bold transition-colors group-hover:text-[color:var(--gold-dark)] sm:text-sm">
                            {asset.title}
                        </h3>
                        <p className="mt-0.5 text-[9.5px] text-muted-foreground sm:text-[10px]">
                            هر {asset.unit}
                        </p>
                    </div>
                </div>

                <PriceCell
                    label="خرید"
                    value={unavailable ? undefined : asset.buy}
                    currency={asset.currency}
                    tone="buy"
                    assetTitle={asset.title}
                    tradeDisabled={asset.buyDisabled === true}
                    onClick={(trigger) => onTrade(asset, "buy", trigger)}
                />
                <PriceCell
                    label="فروش"
                    value={unavailable ? undefined : asset.sell}
                    currency={asset.currency}
                    tone="sell"
                    assetTitle={asset.title}
                    tradeDisabled={asset.sellDisabled === true}
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
    tradeDisabled,
    onClick,
}: {
    label: "خرید" | "فروش";
    value?: number;
    currency: GoldAsset["currency"];
    tone: "buy" | "sell";
    assetTitle: string;
    tradeDisabled: boolean;
    onClick: (trigger: HTMLButtonElement) => void;
}) {
    const formatted =
        tradeDisabled
            ? `${label} بسته است`
            : value === undefined
            ? "—"
            : currency === "IRR"
              ? formatToman(value).replace(" تومان", "")
              : formatMoney(value, currency);
    return (
        <button
            type="button"
            disabled={value === undefined || tradeDisabled}
            onClick={(event) => onClick(event.currentTarget)}
            aria-label={
                tradeDisabled
                    ? `${label} ${assetTitle} بسته است`
                    : value === undefined
                    ? `قیمت ${label} ${assetTitle} موجود نیست`
                    : `ثبت درخواست ${label} ${assetTitle}`
            }
            className={
                "min-w-0 rounded-[2px] px-1 py-2 text-center transition-colors enabled:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed sm:px-2 md:text-start " +
                (value === undefined || tradeDisabled
                    ? "bg-muted/55"
                    : tone === "buy"
                      ? "bg-positive-soft"
                      : "bg-negative-soft")
            }
        >
            <span className="sr-only">{label}</span>
            <strong
                className={
                    "block whitespace-nowrap text-[15.5px] font-black leading-none tracking-tight tabular-nums sm:text-[17px] lg:text-[19px] " +
                    (value === undefined || tradeDisabled
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
            className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-black tabular-nums sm:text-sm ${tone}`}
            aria-label={`تغییر قیمت ${formatPercent(percentage)}`}
        >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {formatPercent(percentage)}
        </span>
    );
}
