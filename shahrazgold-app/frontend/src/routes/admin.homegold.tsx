import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Save, Eye, PlugZap, AlertTriangle, Clock3, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiErrorMessage, apiRequest } from "@/lib/api";

export const Route = createFileRoute("/admin/homegold")({
    component: HomeGoldPage,
    head: () => ({ meta: [{ title: "اتصال هوم‌گلد | شهرازگلد" }] }),
});

type Commodity = { CommodityId: string; name: string; buyPrice: number; sellPrice: number };
type Preview = {
    buy_price_rial: string;
    sell_price_rial: string;
    quote: Commodity;
    fetched_at: string;
};
type Settings = {
    commodity_id: string;
    mode: "disabled" | "auto";
    currency_multiplier: string;
};
type Binding = Settings & {
    last_success_at: string | null;
    last_attempt_at: string | null;
    last_error: string | null;
    last_quote: Preview | null;
};
type Product = {
    id: number;
    name: string;
    unit: string;
    pricing_mode: string;
    is_active: boolean;
    current_buy_rial: string | null;
    current_sell_rial: string | null;
    binding: Binding | null;
    stale: boolean;
};
type PanelData = {
    configured: boolean;
    feed: { commodities: Commodity[]; fetched_at: string } | null;
    products: Product[];
};
const emptySettings: Settings = {
    commodity_id: "",
    mode: "disabled",
    currency_multiplier: "",
};
function settingsFor(product: Product): Settings {
    if (!product.binding) return { ...emptySettings };
    return {
        commodity_id: product.binding.commodity_id,
        mode: product.binding.mode === "auto" ? "auto" : "disabled",
        currency_multiplier: String(product.binding.currency_multiplier),
    };
}
const money = (value: string | number | null | undefined) =>
    value == null ? "—" : `${Number(value).toLocaleString("fa-IR")} ریال`;
const time = (value?: string | null) =>
    value ? new Date(value).toLocaleString("fa-IR") : "هنوز دریافت نشده";
const unit = (value: string) => (value === "count" ? "عدد" : value === "mithqal" ? "مثقال" : "گرم");
const modeLabel = (value?: string) => (value === "auto" ? "خودکار" : "دستی");
const selectClass =
    "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm transition focus:border-[color:var(--gold-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--gold-dark)]/15 disabled:opacity-60";

function HomeGoldPage() {
    const [data, setData] = useState<PanelData | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [draft, setDraft] = useState<Settings>({ ...emptySettings });
    const [preview, setPreview] = useState<Preview | null>(null);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const selected = data?.products.find((product) => product.id === selectedId);
    const commodities = data?.feed?.commodities ?? [];
    const visibleCommodities = [...commodities].sort(
        (a, b) =>
            Number(b.CommodityId === draft.commodity_id) -
            Number(a.CommodityId === draft.commodity_id),
    );
    const feedFresh = Boolean(
        data?.feed && Date.now() - new Date(data.feed.fetched_at).getTime() < 30_000,
    );

    useEffect(() => {
        let active = true;
        let fetching = false;
        async function loadPanel() {
            let response = await apiRequest<PanelData>("admin/homegold");
            const feed = response.data.feed;
            if (
                response.data.configured &&
                (!feed || Date.now() - new Date(feed.fetched_at).getTime() >= 15_000)
            ) {
                try {
                    await apiRequest("admin/homegold/refresh", { method: "POST" });
                    response = await apiRequest<PanelData>("admin/homegold");
                } catch {
                    // Keep the last received prices visible with their original timestamp.
                }
            }
            return response;
        }
        fetching = true;
        loadPanel()
            .then(({ data: next }) => {
                if (!active) return;
                setData(next);
                if (next.products[0]) {
                    setSelectedId(next.products[0].id);
                    setDraft(settingsFor(next.products[0]));
                }
            })
            .catch((cause) => {
                if (active) setError(apiErrorMessage(cause, "دریافت تنظیمات ناموفق بود."));
            })
            .finally(() => {
                fetching = false;
            });
        const interval = window.setInterval(() => {
            if (fetching) return;
            fetching = true;
            loadPanel()
                .then(({ data: next }) => {
                    if (active) setData(next);
                })
                .catch(() => undefined)
                .finally(() => {
                    fetching = false;
                });
        }, 10_000);
        return () => {
            active = false;
            window.clearInterval(interval);
        };
    }, []);

    async function reload() {
        const response = await apiRequest<PanelData>("admin/homegold");
        setData(response.data);
    }
    function selectProduct(id: number) {
        const product = data?.products.find((item) => item.id === id);
        if (!product) return;
        setSelectedId(id);
        setDraft(settingsFor(product));
        setPreview(null);
        setError("");
    }
    function change<K extends keyof Settings>(key: K, value: Settings[K]) {
        setDraft((current) => ({ ...current, [key]: value }));
        setPreview(null);
    }
    async function perform(action: string) {
        setBusy(action);
        setError("");
        try {
            if (action === "refresh") {
                const result = await apiRequest<Array<{ error?: string }>>(
                    "admin/homegold/refresh",
                    { method: "POST" },
                );
                const failures = result.data.filter((item) => item.error);
                if (failures.length)
                    toast.warning(
                        "قیمت‌ها دریافت شدند؛ بعضی محصولات خطا دارند. وضعیت هر محصول را بررسی کنید.",
                    );
                else toast.success("قیمت‌های تازه دریافت شدند.");
                setPreview(null);
                await reload();
            } else if (action === "reload") {
                await reload();
            } else if (selected) {
                if (!draft.commodity_id || !draft.currency_multiplier)
                    throw new Error("محصول هوم‌گلد و واحد پول را انتخاب کنید.");
                const body = JSON.stringify(draft);
                if (action === "preview") {
                    const result = await apiRequest<Preview>(
                        `admin/homegold/products/${selected.id}/preview`,
                        { method: "POST", body },
                    );
                    setPreview(result.data);
                } else if (action === "save") {
                    const saved = await apiRequest<Binding>(
                        `admin/homegold/products/${selected.id}`,
                        {
                            method: "PUT",
                            body,
                        },
                    );
                    setDraft(settingsFor({ ...selected, binding: saved.data }));
                    setPreview(null);
                    await reload();
                    toast.success(
                        draft.mode === "auto"
                            ? "حالت خودکار ذخیره شد؛ قیمت هر ۱۰ ثانیه به‌روز می‌شود."
                            : "تنظیمات ذخیره شد.",
                    );
                } else if (action === "apply") {
                    const result = await apiRequest<Array<{ error?: string; changed?: boolean }>>(
                        `admin/homegold/products/${selected.id}/apply`,
                        { method: "POST" },
                    );
                    const failure = result.data.find((item) => item.error);
                    await reload();
                    if (failure?.error) throw new Error(failure.error);
                    toast.success(
                        result.data.some((item) => item.changed)
                            ? "قیمت جدید روی سایت اعمال شد."
                            : "قیمت بررسی شد و تغییری نداشت.",
                    );
                }
            }
        } catch (cause) {
            const message =
                cause instanceof Error && !("status" in cause)
                    ? cause.message
                    : apiErrorMessage(cause, "انجام عملیات ناموفق بود.");
            setError(message);
            toast.error(message);
            if (data) await reload().catch(() => undefined);
        } finally {
            setBusy("");
        }
    }
    const disabled = Boolean(busy);
    const sameSettings =
        selected?.binding && JSON.stringify(settingsFor(selected)) === JSON.stringify(draft);
    return (
        <AdminPage
            title="اتصال هوم‌گلد"
            subtitle="محصول هوم‌گلد را انتخاب کنید و روش استفاده را روی خودکار یا دستی بگذارید"
        >
            <div className="space-y-4">
                <section className="overflow-hidden rounded-2xl border border-[color:var(--gold-dark)]/20 bg-card shadow-elegant">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--gold-dark)]/10 bg-gradient-to-l from-gold-soft to-card px-4 py-3 sm:px-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--gold-dark)]/10 text-[color:var(--gold-dark)]">
                                <PlugZap className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-extrabold sm:text-base">
                                    قیمت‌های هوم‌گلد
                                </h2>
                                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    آخرین دریافت: {time(data?.feed?.fetched_at)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span
                                    className={`h-2 w-2 rounded-full ${feedFresh ? "bg-emerald-500" : "bg-amber-500"}`}
                                />
                                {feedFresh ? "دریافت تازه" : "منتظر دریافت تازه"}
                            </span>
                            <Button
                                size="sm"
                                className="rounded-xl"
                                disabled={disabled || !data?.configured}
                                onClick={() => void perform("refresh")}
                            >
                                <RefreshCw
                                    className={`h-4 w-4 ${busy === "refresh" ? "animate-spin" : ""}`}
                                />
                                دریافت قیمت
                            </Button>
                        </div>
                    </div>
                    <div className="grid gap-2.5 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
                        {visibleCommodities.map((item) => {
                            const chosen = draft.commodity_id === item.CommodityId;
                            return (
                                <button
                                    key={item.CommodityId}
                                    type="button"
                                    disabled={disabled || !selected}
                                    onClick={() => change("commodity_id", item.CommodityId)}
                                    aria-pressed={chosen}
                                    className={`min-w-0 rounded-xl border p-3 text-right transition disabled:cursor-default ${chosen ? "border-[color:var(--gold-dark)]/50 bg-gold-soft shadow-sm" : "border-border/70 bg-background hover:border-[color:var(--gold-dark)]/40 hover:bg-gold-soft/40"}`}
                                >
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <h3 className="text-sm font-bold">{item.name}</h3>
                                        {chosen && (
                                            <Check className="h-4 w-4 shrink-0 text-[color:var(--gold-dark)]" />
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[11px] text-muted-foreground">
                                                قیمت خرید
                                            </p>
                                            <p className="mt-1 break-all text-lg font-extrabold tabular-nums tracking-tight text-emerald-700 sm:text-xl dark:text-emerald-400">
                                                {item.buyPrice.toLocaleString("fa-IR")}
                                            </p>
                                        </div>
                                        <div className="border-r border-border/70 pr-3">
                                            <p className="text-[11px] text-muted-foreground">
                                                قیمت فروش
                                            </p>
                                            <p className="mt-1 break-all text-lg font-extrabold tabular-nums tracking-tight text-[color:var(--gold-dark)] sm:text-xl">
                                                {item.sellPrice.toLocaleString("fa-IR")}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                        {commodities.length === 0 && (
                            <p className="py-4 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
                                {data
                                    ? "برای نمایش قیمت‌ها، «دریافت قیمت» را بزنید."
                                    : "در حال دریافت قیمت‌ها…"}
                            </p>
                        )}
                    </div>
                    <p className="px-4 pb-3 text-[11px] text-muted-foreground">
                        اعداد در واحد پول دریافتی هوم‌گلد نمایش داده می‌شوند. برای انتخاب محصول
                        متناظر، روی کارت آن بزنید.
                    </p>
                </section>
                {error && (
                    <div
                        role="alert"
                        className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
                    >
                        {error}
                        <Button
                            variant="outline"
                            size="sm"
                            className="mr-3"
                            disabled={disabled}
                            onClick={() => void perform("reload")}
                        >
                            تلاش مجدد
                        </Button>
                    </div>
                )}
                {data && !data.configured && (
                    <div className="rounded-xl border p-4 text-sm">
                        اطلاعات اتصال هوم‌گلد هنوز در تنظیمات سرور وارد نشده است.
                    </div>
                )}
                {!data && !error && (
                    <p className="p-6 text-muted-foreground">در حال دریافت تنظیمات…</p>
                )}
                {data && (
                    <>
                        <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                            <section className="rounded-2xl border bg-card p-4 shadow-elegant">
                                <h2 className="mb-3 text-sm font-extrabold">محصولات شهرازگلد</h2>
                                {data.products.length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        ابتدا در مدیریت قیمت‌ها محصول بسازید.
                                    </p>
                                )}
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                                    {data.products.map((product) => (
                                        <button
                                            key={product.id}
                                            type="button"
                                            disabled={disabled}
                                            aria-pressed={selectedId === product.id}
                                            onClick={() => selectProduct(product.id)}
                                            className={`min-w-0 rounded-xl border p-3 text-right transition ${selectedId === product.id ? "border-[color:var(--gold-dark)]/50 bg-gold-soft shadow-sm" : "border-border/70 hover:bg-muted"}`}
                                        >
                                            <div className="flex justify-between gap-2">
                                                <span className="font-semibold">
                                                    {product.name}
                                                </span>
                                                <span
                                                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${product.binding?.mode === "auto" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
                                                >
                                                    {modeLabel(product.binding?.mode)}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                خرید مشتری: {money(product.current_buy_rial)}
                                            </p>
                                            {product.stale && (
                                                <p className="mt-1 text-xs text-destructive">
                                                    قیمت منقضی؛ سفارش متوقف
                                                </p>
                                            )}
                                            {product.binding?.last_error && (
                                                <p className="mt-1 text-xs text-destructive">
                                                    {product.binding.last_error}
                                                </p>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </section>
                            {selected && (
                                <section className="min-w-0 space-y-4 rounded-2xl border bg-card p-4 shadow-elegant sm:p-5">
                                    <div className="border-b pb-3">
                                        <h2 className="font-extrabold">
                                            تنظیم اتصال {selected.name}
                                        </h2>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            واحد محصول: {unit(selected.unit)} · آخرین دریافت موفق:{" "}
                                            {time(selected.binding?.last_success_at)}
                                        </p>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="hg-commodity">
                                                محصول متناظر در هوم‌گلد
                                            </Label>
                                            <select
                                                id="hg-commodity"
                                                className={selectClass}
                                                value={draft.commodity_id}
                                                disabled={disabled}
                                                onChange={(event) =>
                                                    change("commodity_id", event.target.value)
                                                }
                                            >
                                                <option value="">انتخاب محصول</option>
                                                {commodities.map((item) => (
                                                    <option
                                                        key={item.CommodityId}
                                                        value={item.CommodityId}
                                                    >
                                                        {item.name}
                                                    </option>
                                                ))}
                                                {draft.commodity_id &&
                                                    !commodities.some(
                                                        (item) =>
                                                            item.CommodityId === draft.commodity_id,
                                                    ) && (
                                                        <option value={draft.commodity_id}>
                                                            محصول ذخیره‌شده (دریافت قیمت لازم است)
                                                        </option>
                                                    )}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="hg-mode">روش استفاده</Label>
                                            <select
                                                id="hg-mode"
                                                className={selectClass}
                                                value={draft.mode}
                                                disabled={disabled}
                                                onChange={(event) =>
                                                    change(
                                                        "mode",
                                                        event.target.value as Settings["mode"],
                                                    )
                                                }
                                            >
                                                <option
                                                    value="auto"
                                                    disabled={
                                                        selected.pricing_mode !== "manual" ||
                                                        !selected.is_active
                                                    }
                                                >
                                                    خودکار
                                                </option>
                                                <option value="disabled">دستی</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="hg-currency">
                                                واحد پول قیمت دریافتی
                                            </Label>
                                            <select
                                                id="hg-currency"
                                                className={selectClass}
                                                value={draft.currency_multiplier}
                                                disabled={disabled}
                                                onChange={(event) =>
                                                    change(
                                                        "currency_multiplier",
                                                        event.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">واحد پول را مشخص کنید</option>
                                                <option value="1">ریال (بدون تبدیل)</option>
                                                <option value="10">
                                                    تومان (تبدیل به ریال ×۱۰)
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        قیمت هوم‌گلد با تبدیل واحد پول استفاده می‌شود. تعدیل نقش
                                        کاربران جداگانه اعمال می‌شود.
                                    </p>
                                    {selected.pricing_mode !== "manual" && (
                                        <p className="text-sm text-muted-foreground">
                                            این محصول قیمت فرمولی دارد؛ برای اعمال خودکار، ابتدا در
                                            تنظیمات محصول حالت دستی را انتخاب کنید.
                                        </p>
                                    )}
                                    {draft.mode === "auto" && (
                                        <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                                            <AlertTriangle className="h-5 w-5 shrink-0" />
                                            <p>
                                                در حالت خودکار، قیمت روی سایت اعمال می‌شود. تا
                                                دریافت موفق قیمت یا پس از پایان اعتبار آن، سفارش این
                                                محصول متوقف است. واحد پول را پیش از فعال‌سازی بررسی
                                                کنید.
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            disabled={
                                                disabled ||
                                                !draft.commodity_id ||
                                                !draft.currency_multiplier
                                            }
                                            onClick={() => void perform("preview")}
                                        >
                                            <Eye className="h-4 w-4" />
                                            محاسبهٔ پیش‌نمایش
                                        </Button>
                                        <Button
                                            disabled={
                                                disabled ||
                                                !draft.commodity_id ||
                                                !draft.currency_multiplier
                                            }
                                            onClick={() => void perform("save")}
                                        >
                                            <Save className="h-4 w-4" />
                                            ذخیره تنظیمات
                                        </Button>
                                        <Button
                                            variant="outline"
                                            disabled={
                                                disabled ||
                                                !sameSettings ||
                                                selected.binding?.mode !== "auto"
                                            }
                                            onClick={() => void perform("apply")}
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                            دریافت و اعمال الآن
                                        </Button>
                                    </div>
                                    {preview && (
                                        <div className="space-y-3 rounded-xl border border-[color:var(--gold-dark)] bg-gold-soft p-4">
                                            <h3 className="font-bold">
                                                پیش‌نمایش {preview.quote.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                براساس دریافت {time(preview.fetched_at)}؛ برای قیمت
                                                جدید، «دریافت قیمت‌های تازه» را بزنید.
                                            </p>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p>خرید مشتری</p>
                                                    <p className="mt-1 font-bold">
                                                        {money(preview.buy_price_rial)}
                                                    </p>
                                                    <p className="mt-1 text-xs">
                                                        فعلی: {money(selected.current_buy_rial)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p>فروش مشتری</p>
                                                    <p className="mt-1 font-bold">
                                                        {money(preview.sell_price_rial)}
                                                    </p>
                                                    <p className="mt-1 text-xs">
                                                        فعلی: {money(selected.current_sell_rial)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {selected.binding?.last_error && (
                                        <p className="text-sm text-destructive">
                                            آخرین خطا: {selected.binding.last_error}
                                        </p>
                                    )}
                                </section>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            به‌روزرسانی خودکار هر ۱۰ ثانیه انجام می‌شود و به باز بودن این صفحه
                            وابسته نیست. انتخاب حالت دستی اتصال را متوقف می‌کند؛ آخرین قیمت تا ثبت
                            قیمت دستی جدید حفظ می‌شود.
                        </p>
                    </>
                )}
            </div>
        </AdminPage>
    );
}
