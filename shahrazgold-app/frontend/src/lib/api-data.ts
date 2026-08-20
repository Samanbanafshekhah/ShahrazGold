import { useEffect, useState } from "react";
import { ApiError, apiErrorMessage, apiRequest } from "./api";
import { subscribeToPriceUpdates } from "./price-sync";
import type { GoldAsset, Transaction, TransactionStatus } from "./types";
import type { PurchaseMode, PurchaseProduct, TradeAction } from "./purchase";

interface ApiProduct {
    id: number;
    name: string;
    slug: string;
    symbol: string;
    unit: "gram" | "mithqal" | "count";
    category: { id: number; title: string; slug: string } | null;
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
let transactionsPromise: Promise<Transaction[]> | null = null;
const ASSET_REFRESH_INTERVAL_MS = 5_000;

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
    const normalPrice = Number(product.current_price?.raw_price_rial ?? 0);
    const buyPrice = Number(product.current_price?.buy_price_rial ?? normalPrice);
    const sellPrice = Number(product.current_price?.sell_price_rial ?? normalPrice);
    // قیمت اصلیِ نمایش‌داده‌شده برای کاربر، قیمت خریدِ نقش اوست.
    const price = buyPrice;
    return {
        productId: product.id,
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
    };
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
            assets = response.data.map(mapProduct);
            notify(assetListeners);
            return getAssets();
        })
        .finally(() => {
            assetsPromise = null;
        });
    return assetsPromise;
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
        const update = () => setState({ items: getAssets(), loading: false });
        const refreshSilently = () => void refreshAssets().catch(() => undefined);
        const refreshWhenVisible = () => {
            if (document.visibilityState === "visible") refreshSilently();
        };

        assetListeners.add(update);
        void refreshAssets().catch((error) =>
            setState({
                items: getAssets(),
                loading: false,
                error: apiErrorMessage(error, "دریافت قیمت‌ها ناموفق بود."),
            }),
        );

        const timer = window.setInterval(refreshWhenVisible, ASSET_REFRESH_INTERVAL_MS);
        const unsubscribePriceUpdates = subscribeToPriceUpdates(refreshSilently);
        window.addEventListener("focus", refreshSilently);
        document.addEventListener("visibilitychange", refreshWhenVisible);

        return () => {
            assetListeners.delete(update);
            window.clearInterval(timer);
            unsubscribePriceUpdates();
            window.removeEventListener("focus", refreshSilently);
            document.removeEventListener("visibilitychange", refreshWhenVisible);
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
