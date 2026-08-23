import { useEffect, useState } from "react";
import { apiErrorMessage, apiRequest } from "./api";
import { announcePriceUpdate } from "./price-sync";

export type AdminRequestStatus = "pending" | "approved" | "rejected";

export interface AdminPriceItem {
    id: string;
    title: string;
    unit: string;
    categoryId?: string;
    price: number;
    previousPrice: number;
    priceStep: number;
    sellPriceDifferenceToman: number;
    updatedAt: string;
    recentlyUpdated?: boolean;
    symbol?: string;
    slug?: string;
    pricingMode?: "manual" | "derived";
    priceSourceId?: number | null;
    pricingFormulaKey?: string | null;
}

export interface AdminPurchaseRequest {
    id: string;
    code: string;
    buyerName: string;
    mobile: string;
    productId: string;
    productTitle: string;
    weight: number;
    unit: string;
    unitPrice: number;
    total: number;
    createdAt: string;
    status: AdminRequestStatus;
    rejectionReason?: string;
    timeline: { at: string; label: string; kind: "info" | "success" | "error" }[];
}

export interface AdminOnlineUser {
    id: string;
    name: string;
    isGuest: boolean;
    mobile?: string;
    ipAddress: string;
    page: string;
    loginAt: string;
    lastActivityAt: string;
    device: "دسکتاپ" | "موبایل" | "تبلت";
}

export interface AdminAnnouncement {
    id?: string;
    text: string;
    active: boolean;
    kind: "info" | "warning" | "important";
    startAt: string;
    endAt: string;
}

interface ApiProduct {
    id: number;
    name: string;
    slug: string;
    symbol: string;
    unit: "gram" | "mithqal" | "count";
    pricing_mode: "manual" | "derived";
    price_source_id?: number | null;
    pricing_formula_key?: string | null;
    price_step_rial?: string;
    sell_price_difference_rial?: string;
    category: { id: number; title: string; slug: string } | null;
    current_price: { raw_price_rial: string; effective_at: string } | null;
}

interface ApiRequest {
    id: number;
    request_number: string;
    user?: { id: number; name: string; mobile: string };
    product: { id: number; name: string; symbol: string; unit: string };
    calculated_quantity: string;
    final_unit_price_rial: string;
    total_amount_rial: string;
    status: "pending" | "approved" | "rejected" | "cancelled" | "completed";
    admin_note?: string | null;
    created_at: string;
    status_history?: {
        to: string;
        note?: string | null;
        created_at: string;
    }[];
}

interface ApiAnnouncement {
    id: number;
    title?: string | null;
    body: string;
    status: "draft" | "published";
    starts_at?: string | null;
    ends_at?: string | null;
}

interface ApiPresence {
    count: number;
    users: {
        id: number;
        first_name: string;
        last_name: string;
        mobile: string;
        ip_address?: string | null;
        last_seen_at: string;
    }[];
}

type Listener = () => void;
const priceListeners = new Set<Listener>();
const requestListeners = new Set<Listener>();
const onlineListeners = new Set<Listener>();
const announcementListeners = new Set<Listener>();
let prices: AdminPriceItem[] = [];
let requests: AdminPurchaseRequest[] = [];
let onlineUsers: AdminOnlineUser[] = [];
const priceAdjustmentQueues = new Map<string, Promise<void>>();
let announcement: AdminAnnouncement = {
    text: "",
    active: false,
    kind: "info",
    startAt: "",
    endAt: "",
};

export const ADMIN_PRODUCTS: { id: string; title: string; unit: string; unitPrice: number }[] = [];

function emit(listeners: Set<Listener>) {
    listeners.forEach((listener) => listener());
}

function unitLabel(unit: string): string {
    return unit === "count" ? "عدد" : unit === "mithqal" ? "مثقال" : "گرم";
}

function unitValue(unit: string): "gram" | "mithqal" | "count" {
    return unit === "عدد" ? "count" : unit === "مثقال" ? "mithqal" : "gram";
}

function mapProduct(product: ApiProduct): AdminPriceItem {
    const price = Number(product.current_price?.raw_price_rial ?? 0) / 10;
    return {
        id: String(product.id),
        title: product.name,
        unit: unitLabel(product.unit),
        categoryId: product.category ? String(product.category.id) : undefined,
        price,
        previousPrice: price,
        priceStep: Number(product.price_step_rial ?? 10_000) / 10,
        sellPriceDifferenceToman: Number(product.sell_price_difference_rial ?? 0) / 10,
        updatedAt: product.current_price?.effective_at ?? new Date(0).toISOString(),
        symbol: product.symbol,
        slug: product.slug,
        pricingMode: product.pricing_mode,
        priceSourceId: product.price_source_id,
        pricingFormulaKey: product.pricing_formula_key,
    };
}

function syncProducts(next: AdminPriceItem[]) {
    prices = next;
    ADMIN_PRODUCTS.splice(
        0,
        ADMIN_PRODUCTS.length,
        ...next.map((item) => ({
            id: item.id,
            title: item.title,
            unit: item.unit,
            unitPrice: item.price,
        })),
    );
    emit(priceListeners);
}

function mapRequest(request: ApiRequest): AdminPurchaseRequest {
    const status: AdminRequestStatus =
        request.status === "pending"
            ? "pending"
            : request.status === "rejected" || request.status === "cancelled"
              ? "rejected"
              : "approved";
    const history =
        request.status_history?.map((item) => ({
            at: item.created_at,
            label: item.note || `وضعیت به ${item.to} تغییر کرد`,
            kind:
                item.to === "rejected" || item.to === "cancelled"
                    ? ("error" as const)
                    : ("success" as const),
        })) ?? [];
    return {
        id: String(request.id),
        code: request.request_number,
        buyerName: request.user?.name ?? "کاربر",
        mobile: request.user?.mobile ?? "",
        productId: String(request.product.id),
        productTitle: request.product.name,
        weight: Number(request.calculated_quantity),
        unit: unitLabel(request.product.unit),
        unitPrice: Number(request.final_unit_price_rial) / 10,
        total: Number(request.total_amount_rial) / 10,
        createdAt: request.created_at,
        status,
        rejectionReason:
            request.status === "rejected" ? (request.admin_note ?? undefined) : undefined,
        timeline: [{ at: request.created_at, label: "درخواست ثبت شد", kind: "info" }, ...history],
    };
}

async function refreshPrices(): Promise<void> {
    const response = await apiRequest<ApiProduct[]>("admin/products?per_page=100", {
        cache: "no-store",
    });
    syncProducts(response.data.map(mapProduct));
}

export async function refreshAdminRequests(): Promise<AdminPurchaseRequest[]> {
    const response = await apiRequest<ApiRequest[]>("admin/purchase-requests?per_page=100", {
        cache: "no-store",
    });
    requests = response.data.map(mapRequest);
    emit(requestListeners);
    return [...requests];
}

async function refreshOnline(): Promise<void> {
    const response = await apiRequest<ApiPresence>("admin/presence");
    onlineUsers = response.data.users.map((user) => ({
        id: String(user.id),
        name: `${user.first_name} ${user.last_name}`.trim(),
        isGuest: false,
        mobile: user.mobile,
        ipAddress: user.ip_address ?? "نامشخص",
        page: "—",
        loginAt: user.last_seen_at,
        lastActivityAt: user.last_seen_at,
        device: "دسکتاپ",
    }));
    emit(onlineListeners);
}

async function refreshAnnouncement(): Promise<void> {
    const response = await apiRequest<ApiAnnouncement[]>("admin/announcements?per_page=100");
    const item = response.data[0];
    announcement = item
        ? {
              id: String(item.id),
              text: item.body,
              active: item.status === "published",
              kind:
                  item.title === "warning"
                      ? "warning"
                      : item.title === "important"
                        ? "important"
                        : "info",
              startAt: item.starts_at?.slice(0, 16) ?? "",
              endAt: item.ends_at?.slice(0, 16) ?? "",
          }
        : { text: "", active: false, kind: "info", startAt: "", endAt: "" };
    emit(announcementListeners);
}

function useRemoteList<T>(
    current: () => T,
    listeners: Set<Listener>,
    refresh: () => Promise<void>,
): T {
    const [state, setState] = useState(current);
    useEffect(() => {
        const update = () => setState(current());
        listeners.add(update);
        void refresh().catch(() => update());
        return () => listeners.delete(update);
    }, [current, listeners, refresh]);
    return state;
}

function priceSnapshot() {
    return [...prices];
}

function requestSnapshot() {
    return [...requests];
}

function onlineSnapshot() {
    return [...onlineUsers];
}

function announcementSnapshot() {
    return { ...announcement };
}

export function useAdminPrices(): AdminPriceItem[] {
    return useRemoteList(priceSnapshot, priceListeners, refreshPrices);
}

export interface AdminProductInput {
    title: string;
    unit: string;
    categoryId: string;
    price: number;
    sellPriceDifferenceToman: number;
}

export type AdminProductMutationResult =
    { ok: true; item: AdminPriceItem } | { ok: false; error: string };

function productPayload(input: AdminProductInput, current?: AdminPriceItem) {
    const pricingMode = current?.pricingMode ?? "manual";
    const payload: Record<string, unknown> = {
        product_category_id: Number(input.categoryId),
        name: input.title.trim(),
        symbol: current?.symbol ?? `PRODUCT_${Date.now()}`,
        unit: unitValue(input.unit),
        pricing_mode: pricingMode,
        is_active: true,
        is_buyable: true,
        is_sellable: true,
        trade_adjustment_enabled: input.sellPriceDifferenceToman > 0,
        trade_adjustment_percent: "0",
        sell_price_difference_rial: Math.round(Math.max(0, input.sellPriceDifferenceToman) * 10),
    };
    if (pricingMode === "derived") {
        payload.price_source_id = current?.priceSourceId;
        payload.pricing_formula_key = current?.pricingFormulaKey;
    }
    return payload;
}

async function writePrice(productId: string, priceToman: number): Promise<void> {
    await apiRequest(`admin/products/${productId}/prices`, {
        method: "POST",
        body: JSON.stringify({ raw_price_rial: String(Math.round(priceToman * 10)) }),
    });
    announcePriceUpdate();
}

export async function addAdminProduct(
    input: AdminProductInput,
): Promise<AdminProductMutationResult> {
    try {
        const response = await apiRequest<ApiProduct>("admin/products", {
            method: "POST",
            body: JSON.stringify(productPayload(input)),
        });
        await writePrice(String(response.data.id), input.price);
        await refreshPrices();
        const item = prices.find((product) => product.id === String(response.data.id));
        return item ? { ok: true, item } : { ok: false, error: "محصول ساخته شد اما بازخوانی نشد." };
    } catch (error) {
        return { ok: false, error: apiErrorMessage(error, "ایجاد محصول ناموفق بود.") };
    }
}

export async function updateAdminProduct(
    id: string,
    input: AdminProductInput,
): Promise<AdminProductMutationResult> {
    const current = prices.find((item) => item.id === id);
    if (!current) return { ok: false, error: "محصول موردنظر پیدا نشد." };
    const priceDifferenceChanged =
        current.sellPriceDifferenceToman !== input.sellPriceDifferenceToman;
    try {
        await apiRequest<ApiProduct>(`admin/products/${id}`, {
            method: "PUT",
            body: JSON.stringify(productPayload(input, current)),
        });
        if (current.pricingMode === "manual" && current.price !== input.price) {
            await writePrice(id, input.price);
        }
        await refreshPrices();
        if (priceDifferenceChanged) announcePriceUpdate();
        const item = prices.find((product) => product.id === id);
        return item ? { ok: true, item } : { ok: false, error: "محصول بازخوانی نشد." };
    } catch (error) {
        return { ok: false, error: apiErrorMessage(error, "ویرایش محصول ناموفق بود.") };
    }
}

export async function deleteAdminProduct(id: string): Promise<boolean> {
    try {
        await apiRequest<null>(`admin/products/${id}`, { method: "DELETE" });
        syncProducts(prices.filter((item) => item.id !== id));
        return true;
    } catch {
        return false;
    }
}

export async function updateAdminPriceStep(id: string, priceStepToman: number): Promise<void> {
    await apiRequest(`admin/products/${id}/price-step`, {
        method: "PATCH",
        body: JSON.stringify({ price_step_rial: Math.round(priceStepToman * 10) }),
    });
    await refreshPrices();
}

export async function updateAdminPrice(id: string, newPrice: number): Promise<void> {
    await writePrice(id, newPrice);
    await refreshPrices();
}

export function adjustAdminPrice(id: string, amount: number): Promise<void> {
    const previousAdjustment = priceAdjustmentQueues.get(id) ?? Promise.resolve();
    const adjustment = previousAdjustment
        .catch(() => undefined)
        .then(async () => {
            const item = prices.find((product) => product.id === id);
            if (!item) throw new Error("محصول پیدا نشد.");
            if (item.pricingMode !== "manual") {
                throw new Error("قیمت محصول مشتق‌شده باید از طریق منبع مظنه به‌روزرسانی شود.");
            }
            await updateAdminPrice(id, item.price + amount);
        });

    priceAdjustmentQueues.set(id, adjustment);
    const cleanup = () => {
        if (priceAdjustmentQueues.get(id) === adjustment) priceAdjustmentQueues.delete(id);
    };
    void adjustment.then(cleanup, cleanup);
    return adjustment;
}

export async function refreshAllAdminPrices(): Promise<void> {
    await refreshPrices();
}

export function getLastPriceUpdate(): string {
    return prices.reduce(
        (latest, item) => (item.updatedAt > latest ? item.updatedAt : latest),
        prices[0]?.updatedAt ?? new Date(0).toISOString(),
    );
}

export function useAdminRequests(): AdminPurchaseRequest[] {
    return useRemoteList(requestSnapshot, requestListeners, refreshAdminRequests);
}

export async function approveRequest(id: string): Promise<void> {
    await apiRequest(`admin/purchase-requests/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ note: "تأیید از پنل مدیریت" }),
    });
    await refreshAdminRequests();
}

export async function rejectRequest(id: string, reason: string): Promise<void> {
    await apiRequest(`admin/purchase-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ note: reason }),
    });
    await refreshAdminRequests();
}

export function useAdminOnlineUsers(): AdminOnlineUser[] {
    const users = useRemoteList(onlineSnapshot, onlineListeners, refreshOnline);
    useEffect(() => {
        const timer = window.setInterval(() => void refreshOnline().catch(() => undefined), 30_000);
        return () => window.clearInterval(timer);
    }, []);
    return users;
}

export function useAdminAnnouncement(): AdminAnnouncement {
    return useRemoteList(announcementSnapshot, announcementListeners, refreshAnnouncement);
}

export async function saveAnnouncement(value: AdminAnnouncement): Promise<void> {
    const response = await apiRequest<ApiAnnouncement>(
        value.id ? `admin/announcements/${value.id}` : "admin/announcements",
        {
            method: value.id ? "PUT" : "POST",
            body: JSON.stringify({
                title: value.kind,
                body: value.text,
                starts_at: value.startAt || null,
                ends_at: value.endAt || null,
            }),
        },
    );
    const id = String(response.data.id);
    await apiRequest(`admin/announcements/${id}/${value.active ? "publish" : "unpublish"}`, {
        method: "POST",
    });
    await refreshAnnouncement();
}

export async function clearAnnouncement(): Promise<void> {
    if (announcement.id) {
        await apiRequest<null>(`admin/announcements/${announcement.id}`, { method: "DELETE" });
    }
    announcement = { text: "", active: false, kind: "info", startAt: "", endAt: "" };
    emit(announcementListeners);
}

export function getTodayStats() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const today = requests.filter((request) => new Date(request.createdAt) >= start);
    return {
        pending: requests.filter((request) => request.status === "pending").length,
        approvedToday: today.filter((request) => request.status === "approved").length,
        rejectedToday: today.filter((request) => request.status === "rejected").length,
        totalToday: today.length,
    };
}
