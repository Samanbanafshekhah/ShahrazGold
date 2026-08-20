import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage, apiRequest } from "@/lib/api";

export const Route = createFileRoute("/admin/roles")({
    component: RolesPage,
    head: () => ({ meta: [{ title: "مدیریت نقش‌ها | شهراز‌گلد" }] }),
});

type Product = { id: number; name: string; is_buyable: boolean };
type Permission = { product_id: number; can_access: boolean; can_buy: boolean };
type Role = {
    id: number;
    name: string;
    slug: string;
    description?: string;
    is_active: boolean;
    users_count?: number;
    permissions?: Permission[];
};
type PriceAdjustment = {
    product_id: number;
    name: string;
    symbol: string;
    unit: string;
    normal_buy_price_rial: string | null;
    normal_sell_price_rial: string | null;
    buy_price_adjustment_rial: string;
    sell_price_adjustment_rial: string;
    role_buy_price_rial: string | null;
    role_sell_price_rial: string | null;
};
type PriceAdjustmentData = { products: PriceAdjustment[] };

type AdjustmentInput = { buy: string; sell: string };

function toman(value: string | null | undefined) {
    if (!value) return "—";
    return new Intl.NumberFormat("fa-IR").format(Math.round(Number(value) / 10));
}

function rialToTomanInput(value: string) {
    const amount = Number(value) / 10;
    return amount === 0 ? "" : String(amount);
}

function RolesPage() {
    const [openDialog, setOpenDialog] = useState(false);
    const [roles, setRoles] = useState<Role[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [editing, setEditing] = useState<Role | null>(null);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [permissions, setPermissions] = useState<Record<number, Permission>>({});
    const [loading, setLoading] = useState(true);
    const [priceRole, setPriceRole] = useState<Role | null>(null);
    const [priceData, setPriceData] = useState<PriceAdjustmentData | null>(null);
    const [adjustments, setAdjustments] = useState<Record<number, AdjustmentInput>>({});
    const [savingAdjustments, setSavingAdjustments] = useState(false);

    async function load() {
        try {
            const [rolesResponse, productsResponse] = await Promise.all([
                apiRequest<Role[]>("admin/roles"),
                apiRequest<Product[]>("admin/products?per_page=100"),
            ]);
            setRoles(rolesResponse.data);
            setProducts(productsResponse.data);
        } catch (error) {
            toast.error(apiErrorMessage(error, "دریافت نقش‌ها ناموفق بود."));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    function open(role?: Role) {
        setOpenDialog(true);
        setEditing(role ?? null);
        setName(role?.name ?? "");
        setSlug(role?.slug ?? "");
        setDescription(role?.description ?? "");
        const next: Record<number, Permission> = {};
        (role?.permissions ?? []).forEach((permission) => {
            next[permission.product_id] = permission;
        });
        setPermissions(next);
    }

    async function save() {
        try {
            const body = { name, slug, description, permissions: Object.values(permissions) };
            const response = await apiRequest<Role>(
                editing ? `admin/roles/${editing.id}` : "admin/roles",
                { method: editing ? "PUT" : "POST", body: JSON.stringify(body) },
            );
            setRoles((current) =>
                editing
                    ? current.map((role) => (role.id === response.data.id ? response.data : role))
                    : [...current, response.data],
            );
            toast.success("نقش ذخیره شد.");
            setEditing(null);
            setOpenDialog(false);
        } catch (error) {
            toast.error(apiErrorMessage(error, "ذخیره نقش ناموفق بود."));
        }
    }

    async function remove(role: Role) {
        if (!confirm(`حذف نقش ${role.name}؟`)) return;
        try {
            await apiRequest(`admin/roles/${role.id}`, { method: "DELETE" });
            setRoles((current) => current.filter((item) => item.id !== role.id));
        } catch (error) {
            toast.error(apiErrorMessage(error, "حذف نقش ممکن نیست."));
        }
    }

    async function openPriceAdjustments(role: Role) {
        setPriceRole(role);
        setPriceData(null);
        try {
            const response = await apiRequest<PriceAdjustmentData>(
                `admin/roles/${role.id}/price-adjustments`,
            );
            setPriceData(response.data);
            setAdjustments(
                Object.fromEntries(
                    response.data.products.map((product) => [
                        product.product_id,
                        {
                            buy: rialToTomanInput(product.buy_price_adjustment_rial),
                            sell: rialToTomanInput(product.sell_price_adjustment_rial),
                        },
                    ]),
                ),
            );
        } catch (error) {
            toast.error(apiErrorMessage(error, "دریافت اختلاف قیمت نقش ناموفق بود."));
            setPriceRole(null);
        }
    }

    async function savePriceAdjustments() {
        if (!priceRole || !priceData) return;
        const parsed = priceData.products.map((product) => {
            const input = adjustments[product.product_id] ?? { buy: "", sell: "" };
            return {
                product_id: product.product_id,
                buy_price_adjustment_rial: Math.round((Number(input.buy) || 0) * 10),
                sell_price_adjustment_rial: Math.round((Number(input.sell) || 0) * 10),
            };
        });
        if (parsed.some((item) => !Number.isSafeInteger(item.buy_price_adjustment_rial) || !Number.isSafeInteger(item.sell_price_adjustment_rial))) {
            toast.error("مقادیر اختلاف قیمت معتبر نیستند.");
            return;
        }

        setSavingAdjustments(true);
        try {
            const response = await apiRequest<PriceAdjustmentData>(
                `admin/roles/${priceRole.id}/price-adjustments`,
                { method: "PUT", body: JSON.stringify({ adjustments: parsed }) },
            );
            setPriceData(response.data);
            toast.success("اختلاف قیمت‌های نقش ذخیره شد.");
        } catch (error) {
            toast.error(apiErrorMessage(error, "ذخیره اختلاف قیمت ناموفق بود."));
        } finally {
            setSavingAdjustments(false);
        }
    }

    return (
        <AdminPage title="مدیریت نقش‌ها" subtitle="تعریف نقش، دسترسی محصولات و اختلاف قیمت اختصاصی">
            <div className="flex justify-end">
                <Button onClick={() => open()}>نقش جدید</Button>
            </div>
            {loading ? (
                <p>در حال دریافت…</p>
            ) : (
                <div className="grid gap-3">
                    {roles.map((role) => (
                        <div key={role.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="font-bold">
                                    {role.name} <span className="text-xs text-muted-foreground">({role.slug})</span>
                                </div>
                                <div className="text-sm text-muted-foreground">{role.users_count ?? 0} کاربر</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => void openPriceAdjustments(role)}>اختلاف قیمت</Button>
                                <Button variant="outline" onClick={() => open(role)}>ویرایش و دسترسی‌ها</Button>
                                <Button variant="destructive" onClick={() => void remove(role)}>حذف</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {openDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-card p-6">
                        <h2 className="mb-4 text-xl font-bold">{editing ? "ویرایش نقش" : "نقش جدید"}</h2>
                        <div className="grid gap-3">
                            <Label>نام نقش<Input value={name} onChange={(event) => setName(event.target.value)} /></Label>
                            <Label>شناسه انگلیسی<Input value={slug} onChange={(event) => setSlug(event.target.value)} /></Label>
                            <Label>توضیحات<Textarea value={description} onChange={(event) => setDescription(event.target.value)} /></Label>
                            <div className="mt-2 font-bold">دسترسی محصولات</div>
                            {products.map((product) => {
                                const permission = permissions[product.id] ?? { product_id: product.id, can_access: false, can_buy: false };
                                return (
                                    <div key={product.id} className="flex items-center justify-between rounded-lg border p-3">
                                        <span>{product.name}</span>
                                        <div className="flex gap-4 text-sm">
                                            <label><input type="checkbox" checked={permission.can_access} onChange={(event) => setPermissions((current) => ({ ...current, [product.id]: { ...permission, can_access: event.target.checked, can_buy: event.target.checked && permission.can_buy } }))} /> مشاهده</label>
                                            <label><input type="checkbox" disabled={!permission.can_access || !product.is_buyable} checked={permission.can_buy} onChange={(event) => setPermissions((current) => ({ ...current, [product.id]: { ...permission, can_buy: event.target.checked } }))} /> خرید</label>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => { setEditing(null); setOpenDialog(false); }}>انصراف</Button>
                            <Button onClick={() => void save()}>ذخیره</Button>
                        </div>
                    </div>
                </div>
            )}

            {priceRole && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <section className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl bg-card p-5 sm:p-6" aria-label="اختلاف قیمت نقش">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-extrabold">اختلاف قیمت نقش «{priceRole.name}»</h2>
                                <p className="mt-1 text-xs text-muted-foreground">مبلغ مثبت یا منفی را به تومان وارد کنید.</p>
                            </div>
                            <Button variant="ghost" size="icon" disabled={savingAdjustments} onClick={() => setPriceRole(null)} aria-label="بستن"><X className="h-5 w-5" /></Button>
                        </div>
                        {!priceData ? (
                            <p className="py-10 text-center text-sm text-muted-foreground">در حال دریافت قیمت‌ها…</p>
                        ) : (
                            <div className="space-y-3">
                                {priceData.products.map((product) => (
                                    <div key={product.product_id} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1.1fr_1fr_1fr] sm:items-end sm:p-4">
                                        <div>
                                            <h3 className="text-sm font-bold">{product.name}</h3>
                                            <p className="mt-1 text-xs text-muted-foreground">خرید عادی: {toman(product.normal_buy_price_rial)} · فروش عادی: {toman(product.normal_sell_price_rial)} تومان</p>
                                        </div>
                                        <Label>اختلاف خرید (تومان)<Input inputMode="numeric" value={adjustments[product.product_id]?.buy ?? ""} onChange={(event) => setAdjustments((current) => ({ ...current, [product.product_id]: { ...(current[product.product_id] ?? { buy: "", sell: "" }), buy: event.target.value } }))} /></Label>
                                        <Label>اختلاف فروش (تومان)<Input inputMode="numeric" value={adjustments[product.product_id]?.sell ?? ""} onChange={(event) => setAdjustments((current) => ({ ...current, [product.product_id]: { ...(current[product.product_id] ?? { buy: "", sell: "" }), sell: event.target.value } }))} /></Label>
                                    </div>
                                ))}
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" disabled={savingAdjustments} onClick={() => setPriceRole(null)}>انصراف</Button>
                                    <Button disabled={savingAdjustments} onClick={() => void savePriceAdjustments()}>{savingAdjustments ? "در حال ذخیره…" : "ذخیره اختلاف قیمت‌ها"}</Button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </AdminPage>
    );
}
