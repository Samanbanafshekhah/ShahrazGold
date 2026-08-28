import { useEffect, useState } from "react";
import { ApiError, apiErrorMessage, apiRequest } from "./api";
import { subscribeToPriceUpdates, type PriceUpdatedPayload } from "./price-sync";
import type { GoldAsset, Transaction, TransactionStatus } from "./types";
import type { PurchaseMode, PurchaseProduct, TradeAction } from "./purchase";

interface ApiProduct {
    id: number;
    name: string;
    slug: string;
    symbol: string;
    unit: "gram" | "mithqal" | "count";
    category: { id: number; title: string; slug: string } | null;
    sell_price_difference_rial: string;
    trade_amount_divisor: string | null;
    price_version: number;
    price_adjustment_version: number;
    current_price: {
        id: number;
        raw_price_rial: string;
        buy_price_rial?: string | null;
        sell_price_rial?: string | null;
        effective_at: string;
    } | null;
    is_price_available: boolean;
    is_buyable: boolean;
    is_sellable: boolean;
}

interface ApiMarketPrice {
    product_id: number;
    price_id: number | null;
    price_version: number;
    price_adjustment_version: number;
    symbol: string;
    raw_price_rial: string | null;
    buy_price_rial: string | null;
    sell_price_rial: string | null;
    sell_price_difference_rial: string;
    is_price_available: boolean;
    effective_at: string | null;
}

interface ApiPurchaseRequest {
    id: number;
    request_number: string;
    product: { id: number; name: string; symbol: string; unit: string };
    trade_type: "customer_buy" | "customer_sell";
    calculated_quantity: string;
    final_unit_price_rial: string;
    total_amount_rial: string;
    status: "pending" | "approved" | "rejected" | "cancelled" | "completed";
    user_note?: string | null;
    admin_note?: string | null;
    created_at: string;
    approved_at?: string | null;
    rejected_at?: string | null;
    completed_at?: string | null;
}

interface TradePreview {
    product_price_id: number;
}

type Listener = () => void;
const assetListeners = new Set<Listener>();
const transactionListeners = new Set<Listener>();
let assets: GoldAsset[] = [];
let transactions: Transaction[] = [];
let assetsPromise: Promise<GoldAsset[]> | null = null;
let assetPricesPromise: Promise<GoldAsset[]> | null = null;
let transactionsPromise: Promise<Transaction[]> | null = null;
const ASSET_REFRESH_INTERVAL_MS = 1_000;

function notify(listeners: Set<Listener>) {
    listeners.forEach((listener) => listener());
}

function unitLabel(unit: ApiProduct["unit"] | string): string {
    return unit === "count" ? "عدد" : unit === "mithqal" ? "مثقال" : "گرم";
}

function categoryName(product: ApiProduct): GoldAsset["category"] {
    const category = product.category?.slug.toLowerCase() ?? "";
    if (category.includes("coin")) return "coin";
    if (category.includes("melt")) return "melted";
    return "gold";
}

function mapProduct(product: ApiProduct): GoldAsset {
    const rawPrice = Number(product.current_price?.raw_price_rial ?? 0);
    const sellPriceDifference = Number(product.sell_price_difference_rial ?? 0);
    const normalSellPrice = rawPrice - sellPriceDifference;
    const buyPrice = Number(product.current_price?.buy_price_rial ?? rawPrice);
    const sellPrice = Number(product.current_price?.sell_price_rial ?? normalSellPrice);
    // قیمت اصلیِ نمایش‌داده‌شده برای کاربر، قیمت خریدِ نقش اوست.
    const price = buyPrice;
    return {
        productId: product.id,
        priceId: product.current_price?.id,
        priceVersion: product.price_version,
        priceAdjustmentVersion: product.price_adjustment_version,
        symbol: product.symbol,
        title: product.name,
        category: categoryName(product),
        unit: unitLabel(product.unit),
        price,
        currency: "IRR",
        buy: product.is_buyable ? buyPrice : undefined,
        sell: product.is_sellable ? sellPrice : undefined,
        available: product.is_price_available,
        change: 0,
        changePercent: 0,
        high: price,
        low: price,
        open: price,
        updatedAt: product.current_price?.effective_at ?? new Date(0).toISOString(),
        rawPrice,
        buyPriceAdjustment: buyPrice - rawPrice,
        sellPriceAdjustment: sellPrice - normalSellPrice,
        sellPriceDifference,
        tradeAmountDivisor: Number(product.trade_amount_divisor ?? 1),
    };
}

function isStalePrice(
    asset: GoldAsset,
    priceId: number | undefined,
    updatedAt: string,
    priceVersion?: number,
    priceAdjustmentVersion?: number,
): boolean {
    if (asset.priceVersion !== undefined && priceVersion !== undefined) {
        if (priceVersion < asset.priceVersion) return true;
        if (priceVersion > asset.priceVersion) return false;
    }
    if (asset.priceAdjustmentVersion !== undefined && priceAdjustmentVersion !== undefined) {
        if (priceAdjustmentVersion < asset.priceAdjustmentVersion) return true;
        if (priceAdjustmentVersion > asset.priceAdjustmentVersion) return false;
    }
    if (asset.priceId !== undefined && priceId !== undefined) {
        if (priceId < asset.priceId) return true;
        if (priceId > asset.priceId) return false;
    }
    return Date.parse(updatedAt) <= Date.parse(asset.updatedAt);
}

function preserveNewerPrice(snapshot: GoldAsset, current?: GoldAsset): GoldAsset {
    if (
        !current ||
        !isStalePrice(
            current,
            snapshot.priceId,
            snapshot.updatedAt,
            snapshot.priceVersion,
            snapshot.priceAdjustmentVersion,
        )
    ) {
        return snapshot;
    }

    return {
        ...snapshot,
        priceId: current.priceId,
        priceVersion: current.priceVersion,
        priceAdjustmentVersion: current.priceAdjustmentVersion,
        price: current.price,
        buy: current.buy,
        sell: current.sell,
        available: current.available,
        change: current.change,
        changePercent: current.changePercent,
        high: current.high,
        low: current.low,
        open: current.open,
        updatedAt: current.updatedAt,
        rawPrice: current.rawPrice,
        buyPriceAdjustment: current.buyPriceAdjustment,
        sellPriceAdjustment: current.sellPriceAdjustment,
        sellPriceDifference: current.sellPriceDifference,
        tradeAmountDivisor: current.tradeAmountDivisor,
    };
}

function applyPriceUpdate(update: PriceUpdatedPayload): void {
    const index = assets.findIndex((asset) => asset.productId === update.product_id);
    if (index < 0) return;

    const current = assets[index];
    if (
        isStalePrice(
            current,
            update.price_id,
            update.updated_at,
            update.price_version,
            update.price_adjustment_version ?? undefined,
        )
    ) {
        return;
    }

    const rawPrice = Number(update.raw_price_rial);
    const sellPriceDifference = Number(update.sell_price_difference_rial);
    if (!Number.isFinite(rawPrice) || !Number.isFinite(sellPriceDifference)) return;

    const normalSellPrice = rawPrice - sellPriceDifference;
    const buyPrice =
        update.buy_price_rial !== null
            ? Number(update.buy_price_rial)
            : rawPrice + (current.buyPriceAdjustment ?? 0);
    const sellPrice =
        update.sell_price_rial !== null
            ? Number(update.sell_price_rial)
            : normalSellPrice + (current.sellPriceAdjustment ?? 0);
    if (!Number.isFinite(buyPrice) || !Number.isFinite(sellPrice)) return;

    const difference = buyPrice - current.price;
    const next = {
        ...current,
        priceId: update.price_id,
        priceVersion: update.price_version,
        priceAdjustmentVersion: update.price_adjustment_version ?? current.priceAdjustmentVersion,
        price: buyPrice,
        buy: current.buy === undefined ? undefined : buyPrice,
        sell: current.sell === undefined ? undefined : sellPrice,
        available: true,
        change: difference,
        changePercent: current.price === 0 ? 0 : (difference / current.price) * 100,
        high: Math.max(current.high, buyPrice),
        low: current.low === 0 ? buyPrice : Math.min(current.low, buyPrice),
        updatedAt: update.updated_at,
        rawPrice,
        buyPriceAdjustment: buyPrice - rawPrice,
        sellPriceAdjustment: sellPrice - normalSellPrice,
        sellPriceDifference,
    };

    assets = [...assets.slice(0, index), next, ...assets.slice(index + 1)];
    notify(assetListeners);
}

function mapStatus(status: ApiPurchaseRequest["status"]): TransactionStatus {
    return status === "cancelled" ? "canceled" : status;
}

export function mapPurchaseRequest(request: ApiPurchaseRequest): Transaction {
    return {
        id: String(request.id),
        trackingCode: request.request_number,
        type: request.trade_type === "customer_buy" ? "buy" : "sell",
        assetSymbol: request.product.symbol,
        assetTitle: request.product.name,
        quantity: Number(request.calculated_quantity),
        unit: unitLabel(request.product.unit),
        unitPrice: Number(request.final_unit_price_rial),
        total: Number(request.total_amount_rial),
        status: mapStatus(request.status),
        createdAt: request.created_at,
        updatedAt:
            request.completed_at ??
            request.rejected_at ??
            request.approved_at ??
            request.created_at,
        description: request.admin_note ?? request.user_note ?? undefined,
    };
}

export async function refreshAssets(): Promise<GoldAsset[]> {
    if (assetsPromise) return assetsPromise;
    assetsPromise = apiRequest<ApiProduct[]>("products?per_page=100", {
        cache: "no-store",
    })
        .then((response) => {
            const currentByProduct = new Map(assets.map((asset) => [asset.productId, asset]));
            assets = response.data.map((product) => {
                const snapshot = mapProduct(product);
                return preserveNewerPrice(snapshot, currentByProduct.get(snapshot.productId));
            });
            notify(assetListeners);
            return getAssets();
        })
        .finally(() => {
            assetsPromise = null;
        });
    return assetsPromise;
}

export async function refreshAssetPrices(): Promise<GoldAsset[]> {
    if (assets.length === 0) return refreshAssets();
    if (assetPricesPromise) return assetPricesPromise;

    assetPricesPromise = apiRequest<ApiMarketPrice[]>("market/prices", {
        cache: "no-store",
    })
        .then((response) => {
            const pricesByProduct = new Map(
                response.data.map((price) => [price.product_id, price]),
            );
            let changed = false;

            const nextAssets = assets.map((asset) => {
                const marketPrice = asset.productId
                    ? pricesByProduct.get(asset.productId)
                    : response.data.find((price) => price.symbol === asset.symbol);
                if (!marketPrice) return asset;

                const rawPrice = Number(marketPrice.raw_price_rial ?? 0);
                const buyPrice = Number(marketPrice.buy_price_rial ?? rawPrice);
                const sellPriceDifference = Number(marketPrice.sell_price_difference_rial ?? 0);
                const normalSellPrice = rawPrice - sellPriceDifference;
                const sellPrice = Number(marketPrice.sell_price_rial ?? normalSellPrice);
                const updatedAt = marketPrice.effective_at ?? new Date(0).toISOString();
                const priceId = marketPrice.price_id ?? undefined;
                if (
                    isStalePrice(
                        asset,
                        priceId,
                        updatedAt,
                        marketPrice.price_version,
                        marketPrice.price_adjustment_version,
                    )
                ) {
                    return asset;
                }
                const priceChanged =
                    asset.price !== buyPrice ||
                    asset.buy !== buyPrice ||
                    asset.sell !== sellPrice ||
                    asset.available !== marketPrice.is_price_available ||
                    asset.updatedAt !== updatedAt;

                if (!priceChanged) return asset;
                changed = true;
                const previousPrice = asset.price;
                const difference = buyPrice - previousPrice;

                return {
                    ...asset,
                    priceId,
                    priceVersion: marketPrice.price_version,
                    priceAdjustmentVersion: marketPrice.price_adjustment_version,
                    price: buyPrice,
                    buy: buyPrice,
                    sell: sellPrice,
                    available: marketPrice.is_price_available,
                    change: difference,
                    changePercent: previousPrice === 0 ? 0 : (difference / previousPrice) * 100,
                    high: Math.max(asset.high, buyPrice),
                    low: asset.low === 0 ? buyPrice : Math.min(asset.low, buyPrice),
                    updatedAt,
                    rawPrice,
                    buyPriceAdjustment: buyPrice - rawPrice,
                    sellPriceAdjustment: sellPrice - normalSellPrice,
                    sellPriceDifference,
                };
            });

            if (changed) {
                assets = nextAssets;
                notify(assetListeners);
            }
            return getAssets();
        })
        .finally(() => {
            assetPricesPromise = null;
        });

    return assetPricesPromise;
}

export function getAssets(): GoldAsset[] {
    return assets.map((asset) => ({ ...asset }));
}

export function getAsset(symbol: string): GoldAsset | undefined {
    const asset = assets.find((item) => item.symbol.toLowerCase() === symbol.toLowerCase());
    return asset ? { ...asset } : undefined;
}

export function useAssets(): { items: GoldAsset[]; loading: boolean; error?: string } {
    const [state, setState] = useState(() => ({
        items: getAssets(),
        loading: assets.length === 0,
    }));
    useEffect(() => {
        let active = true;
        let unsubscribePriceUpdates = () => undefined;
        const update = () => setState({ items: getAssets(), loading: false });
        const synchronizeAfterReconnect = () => void refreshAssetPrices().catch(() => undefined);
        const refreshWhenVisible = () => {
            if (document.visibilityState === "visible") {
                void refreshAssetPrices().catch(() => undefined);
            }
        };

        assetListeners.add(update);
        void refreshAssets()
            .then(() => {
                if (active) {
                    unsubscribePriceUpdates = subscribeToPriceUpdates(
                        applyPriceUpdate,
                        synchronizeAfterReconnect,
                    );
                }
            })
            .catch((error) =>
                setState({
                    items: getAssets(),
                    loading: false,
                    error: apiErrorMessage(error, "دریافت قیمت‌ها ناموفق بود."),
                }),
            );

        const timer = window.setInterval(refreshWhenVisible, ASSET_REFRESH_INTERVAL_MS);
        window.addEventListener("focus", refreshWhenVisible);
        window.addEventListener("online", refreshWhenVisible);
        document.addEventListener("visibilitychange", refreshWhenVisible);

        return () => {
            active = false;
            assetListeners.delete(update);
            window.clearInterval(timer);
            window.removeEventListener("focus", refreshWhenVisible);
            window.removeEventListener("online", refreshWhenVisible);
            document.removeEventListener("visibilitychange", refreshWhenVisible);
            unsubscribePriceUpdates();
        };
    }, []);
    return state;
}

export function useAsset(symbol: string): { item?: GoldAsset; loading: boolean; error?: string } {
    const { items, loading, error } = useAssets();
    return {
        item: items.find((asset) => asset.symbol.toLowerCase() === symbol.toLowerCase()),
        loading,
        error,
    };
}

export async function refreshTransactions(): Promise<Transaction[]> {
    if (transactionsPromise) return transactionsPromise;
    transactionsPromise = apiRequest<ApiPurchaseRequest[]>("purchase-requests?per_page=100")
        .then((response) => {
            transactions = response.data.map(mapPurchaseRequest);
            notify(transactionListeners);
            return getTransactions();
        })
        .finally(() => {
            transactionsPromise = null;
        });
    return transactionsPromise;
}

export function getTransactions(): Transaction[] {
    return transactions.map((transaction) => ({ ...transaction }));
}

export function getTransaction(id: string): Transaction | undefined {
    const transaction = transactions.find(
        (item) => item.id === id || item.trackingCode.toUpperCase() === id.toUpperCase(),
    );
    return transaction ? { ...transaction } : undefined;
}

export function useTransactions(): {
    items: Transaction[];
    loading: boolean;
    error?: string;
} {
    const [state, setState] = useState(() => ({
        items: getTransactions(),
        loading: transactions.length === 0,
    }));
    useEffect(() => {
        const update = () => setState({ items: getTransactions(), loading: false });
        transactionListeners.add(update);
        void refreshTransactions().catch((error) =>
            setState({
                items: getTransactions(),
                loading: false,
                error: apiErrorMessage(error, "دریافت تراکنش‌ها ناموفق بود."),
            }),
        );
        return () => transactionListeners.delete(update);
    }, []);
    return state;
}

export function useTransaction(id: string): {
    item?: Transaction;
    loading: boolean;
    error?: string;
} {
    const state = useTransactions();
    return {
        ...state,
        item: state.items.find((item) => item.id === id || item.trackingCode === id),
    };
}

export async function submitPurchase(input: {
    product: PurchaseProduct;
    action: TradeAction;
    mode: PurchaseMode;
    amount: string;
    quantity: string;
}): Promise<Transaction> {
    if (!input.product.productId) {
        throw new Error("شناسه محصول از API دریافت نشده است.");
    }

    const tradePayload: Record<string, string | number> = {
        product_id: input.product.productId,
        trade_type: input.action === "buy" ? "customer_buy" : "customer_sell",
        entry_mode: input.mode,
    };
    if (input.mode === "amount") {
        tradePayload.amount_rial = String(Math.round(Number(input.amount) * 10));
    } else {
        tradePayload.quantity = input.quantity;
    }

    const preview = await apiRequest<TradePreview>("trade/preview", {
        method: "POST",
        body: JSON.stringify(tradePayload),
    });
    const requestPayload = {
        ...tradePayload,
        client_reference: crypto.randomUUID(),
        expected_product_price_id: preview.data.product_price_id,
    };

    try {
        const response = await apiRequest<ApiPurchaseRequest>("purchase-requests", {
            method: "POST",
            body: JSON.stringify(requestPayload),
        });
        const transaction = mapPurchaseRequest(response.data);
        transactions = [transaction, ...transactions.filter((item) => item.id !== transaction.id)];
        notify(transactionListeners);
        return transaction;
    } catch (error) {
        if (
            error instanceof ApiError &&
            (error.message === "MANAGER_OFFLINE" || error.message.includes("مدیر آفلاین"))
        ) {
            throw new Error("مدیر آفلاین است؛ در حال حاضر امکان ثبت درخواست خرید وجود ندارد.");
        }
        if (error instanceof ApiError && error.status === 409) {
            throw new Error("قیمت تغییر کرده است؛ قیمت‌ها را به‌روزرسانی و دوباره تأیید کنید.");
        }
        throw error;
    }
}

export const TRANSACTION_STATUS_LABELS: Record<Transaction["status"], string> = {
    pending: "در انتظار بررسی",
    approved: "تأییدشده",
    completed: "تکمیل‌شده",
    rejected: "ردشده",
    canceled: "لغوشده",
};

export const TRANSACTION_TYPE_LABELS: Record<Transaction["type"], string> = {
    buy: "خرید",
    sell: "فروش",
};
