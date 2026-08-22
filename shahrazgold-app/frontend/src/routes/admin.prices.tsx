import { createFileRoute, Link } from "@tanstack/react-router";
import {
    ArrowDown,
    ArrowUp,
    ListPlus,
    Minus,
    PackagePlus,
    Pencil,
    Plus,
    RefreshCw,
    Save,
    Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/admin-page";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAdminCategories } from "@/lib/admin-categories";
import {
    addAdminProduct,
    adjustAdminPrice,
    deleteAdminProduct,
    refreshAllAdminPrices,
    updateAdminProduct,
    updateAdminPriceStep,
    useAdminPrices,
    type AdminPriceItem,
} from "@/lib/admin-data";
import { formatNumber, formatPersianTime, toPersianDigits } from "@/lib/formatters";

export const Route = createFileRoute("/admin/prices")({
    component: PricesPage,
});

type ProductForm = {
    title: string;
    unit: string;
    categoryId: string;
    price: string;
    sellPriceDifferenceToman: string;
};

type ProductFormErrors = Partial<Record<keyof ProductForm, string>>;

const BASE_PRICE_STEP = 1_000;

const EMPTY_PRODUCT_FORM: ProductForm = {
    title: "",
    unit: "گرم",
    categoryId: "",
    price: "",
    sellPriceDifferenceToman: "",
};

function parsePersianNumber(raw: string): number {
    const normalized = raw
        .trim()
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
        .replace(/[,،\s]/g, "");
    return Number(normalized);
}

function currentSellPriceDifference(item: AdminPriceItem): string {
    return item.sellPriceDifferenceToman ? String(item.sellPriceDifferenceToman) : "";
}

function PricesPage() {
    const prices = useAdminPrices();
    const categories = useAdminCategories();
    const priceSections = useMemo(() => {
        const knownCategoryIds = new Set(categories.map((category) => category.id));
        const sections = categories
            .map((category) => ({
                id: category.id,
                title: category.name,
                description:
                    category.description || `مدیریت قیمت محصولات دسته‌بندی ${category.name}`,
                items: prices.filter((item) => item.categoryId === category.id),
            }))
            .filter((section) => section.items.length > 0);
        const uncategorizedItems = prices.filter(
            (item) => !item.categoryId || !knownCategoryIds.has(item.categoryId),
        );

        if (uncategorizedItems.length > 0) {
            sections.push({
                id: "uncategorized",
                title: "سایر محصولات",
                description: "محصولات بدون دسته‌بندی یا متعلق به دسته‌بندی حذف‌شده",
                items: uncategorizedItems,
            });
        }

        return sections;
    }, [categories, prices]);

    const [productDialogOpen, setProductDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<AdminPriceItem | null>(null);
    const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT_FORM);
    const [productErrors, setProductErrors] = useState<ProductFormErrors>({});
    const [deleteTarget, setDeleteTarget] = useState<AdminPriceItem | null>(null);
    const [adjustTarget, setAdjustTarget] = useState<AdminPriceItem | null>(null);
    const [adjustmentSteps, setAdjustmentSteps] = useState("1");

    function openCreateProduct() {
        const defaultCategory =
            categories.find((category) => category.active)?.id ?? categories[0]?.id ?? "";
        setEditingProduct(null);
        setProductForm({ ...EMPTY_PRODUCT_FORM, categoryId: defaultCategory });
        setProductErrors({});
        setProductDialogOpen(true);
    }

    function openEditProduct(item: AdminPriceItem) {
        setEditingProduct(item);
        setProductForm({
            title: item.title,
            unit: item.unit,
            categoryId: item.categoryId ?? "",
            price: String(item.price),
            sellPriceDifferenceToman: currentSellPriceDifference(item),
        });
        setProductErrors({});
        setProductDialogOpen(true);
    }

    function closeProductDialog() {
        setProductDialogOpen(false);
        setProductErrors({});
    }

    async function submitProduct(event: React.FormEvent) {
        event.preventDefault();

        const errors: ProductFormErrors = {};
        const title = productForm.title.trim();
        const unit = productForm.unit.trim();
        const price = parsePersianNumber(productForm.price);
        const sellPriceDifferenceToman =
            productForm.sellPriceDifferenceToman.trim() === ""
                ? 0
                : parsePersianNumber(productForm.sellPriceDifferenceToman);

        if (title.length < 2) errors.title = "نام محصول باید حداقل ۲ کاراکتر باشد.";
        if (!unit) errors.unit = "واحد محصول را وارد کنید.";
        if (
            !productForm.categoryId ||
            !categories.some((item) => item.id === productForm.categoryId)
        ) {
            errors.categoryId = "یک دسته‌بندی معتبر انتخاب کنید.";
        }
        if (!Number.isFinite(price) || price <= 0) {
            errors.price = "قیمت باید عددی و بزرگ‌تر از صفر باشد.";
        }
        if (
            !Number.isFinite(sellPriceDifferenceToman) ||
            sellPriceDifferenceToman < 0 ||
            sellPriceDifferenceToman >= price
        ) {
            errors.sellPriceDifferenceToman = "اختلاف باید عددی نامنفی و کمتر از قیمت خرید باشد.";
        }

        setProductErrors(errors);
        if (Object.keys(errors).length > 0) return;

        const input = {
            title,
            unit,
            categoryId: productForm.categoryId,
            price,
            sellPriceDifferenceToman,
        };
        const result = editingProduct
            ? await updateAdminProduct(editingProduct.id, input)
            : await addAdminProduct(input);

        if (!result.ok) {
            setProductErrors({ title: result.error });
            return;
        }

        toast.success(
            editingProduct
                ? `محصول «${result.item.title}» ویرایش شد.`
                : `محصول «${result.item.title}» اضافه شد.`,
        );
        closeProductDialog();
    }

    async function adjustPrice(item: AdminPriceItem, direction: 1 | -1) {
        try {
            await adjustAdminPrice(item.id, direction * item.priceStep);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "به‌روزرسانی قیمت ناموفق بود.");
        }
    }

    function openPriceStepSetting(item: AdminPriceItem) {
        setAdjustTarget(item);
        setAdjustmentSteps(String(Math.max(1, Math.round(item.priceStep / BASE_PRICE_STEP))));
    }

    async function savePriceStep() {
        if (!adjustTarget) return;
        const steps = Math.floor(parsePersianNumber(adjustmentSteps));
        if (!Number.isFinite(steps) || steps < 1) {
            toast.error("تعداد گام باید عددی بزرگ‌تر از صفر باشد.");
            return;
        }

        const priceStep = BASE_PRICE_STEP * steps;
        try {
            await updateAdminPriceStep(adjustTarget.id, priceStep);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "ذخیره گام قیمت ناموفق بود.");
            return;
        }
        toast.success(
            "گام قیمت «" +
                adjustTarget.title +
                "» روی " +
                formatNumber(priceStep) +
                " تومان تنظیم شد.",
        );
        setAdjustTarget(null);
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        const deleted = await deleteAdminProduct(deleteTarget.id);
        if (deleted) toast.success(`محصول «${deleteTarget.title}» حذف شد.`);
        else toast.error("حذف محصول انجام نشد.");
        setDeleteTarget(null);
    }

    return (
        <AdminPage
            title="مدیریت محصولات و قیمت‌ها"
            subtitle="افزودن، دسته‌بندی و بروزرسانی محصولات"
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                    قیمت سبز، قیمت خرید و قیمت قرمز، قیمت فروش مشتری است؛ با کلیک روی آن‌ها قیمت
                    پایه یک گام افزایش یا کاهش پیدا می‌کند.
                </p>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <Button size="sm" onClick={openCreateProduct} className="flex-1 sm:flex-none">
                        <Plus className="me-2 h-4 w-4" />
                        افزودن محصول
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                        onClick={async () => {
                            await refreshAllAdminPrices();
                            toast.success("همه قیمت‌ها بروزرسانی شد.");
                        }}
                    >
                        <RefreshCw className="me-2 h-4 w-4" />
                        بروزرسانی همه
                    </Button>
                </div>
            </div>

            {priceSections.length > 0 ? (
                <div className="space-y-5 sm:space-y-6">
                    {priceSections.map((section) => (
                        <AdminPriceSection
                            key={section.id}
                            title={section.title}
                            description={section.description}
                            items={section.items}
                            onIncrease={(item) => adjustPrice(item, 1)}
                            onDecrease={(item) => adjustPrice(item, -1)}
                            onEdit={openEditProduct}
                            onPriceStepSetting={openPriceStepSetting}
                            onDelete={setDeleteTarget}
                        />
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-12 text-center">
                    <PackagePlus className="mx-auto h-8 w-8 text-muted-foreground" />
                    <h2 className="mt-3 text-sm font-bold">هنوز محصولی ثبت نشده است</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                        برای شروع، اولین محصول و قیمت آن را اضافه کنید.
                    </p>
                    <Button size="sm" className="mt-4" onClick={openCreateProduct}>
                        <Plus className="me-2 h-4 w-4" />
                        افزودن محصول
                    </Button>
                </div>
            )}

            <Dialog
                open={productDialogOpen}
                onOpenChange={(open) => {
                    if (!open) closeProductDialog();
                    else setProductDialogOpen(true);
                }}
            >
                <DialogContent
                    dir="rtl"
                    className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl"
                >
                    <form onSubmit={submitProduct}>
                        <DialogHeader>
                            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-gold-soft text-[color:var(--gold-dark)]">
                                <PackagePlus className="h-5 w-5" />
                            </div>
                            <DialogTitle>
                                {editingProduct ? "ویرایش محصول" : "افزودن محصول جدید"}
                            </DialogTitle>
                            <DialogDescription>
                                مشخصات، دسته‌بندی و قیمت محصول را وارد کنید.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-5">
                            <div>
                                <Label htmlFor="product-title">نام محصول</Label>
                                <Input
                                    id="product-title"
                                    value={productForm.title}
                                    onChange={(event) =>
                                        setProductForm((current) => ({
                                            ...current,
                                            title: event.target.value,
                                        }))
                                    }
                                    placeholder="مثلاً شمش طلای یک گرمی"
                                    className="mt-1.5 h-11"
                                    aria-invalid={Boolean(productErrors.title)}
                                    autoFocus
                                />
                                {productErrors.title && (
                                    <p className="mt-1.5 text-xs text-negative">
                                        {productErrors.title}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="product-category">دسته‌بندی</Label>
                                {categories.length > 0 ? (
                                    <Select
                                        value={productForm.categoryId}
                                        onValueChange={(categoryId) =>
                                            setProductForm((current) => ({
                                                ...current,
                                                categoryId,
                                            }))
                                        }
                                    >
                                        <SelectTrigger
                                            id="product-category"
                                            className="mt-1.5 h-11"
                                            aria-invalid={Boolean(productErrors.categoryId)}
                                        >
                                            <SelectValue placeholder="انتخاب دسته‌بندی" />
                                        </SelectTrigger>
                                        <SelectContent dir="rtl">
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name}
                                                    {!category.active ? " — غیرفعال" : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="mt-1.5 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                                        هنوز دسته‌بندی ثبت نشده است.{" "}
                                        <Link
                                            to="/admin/categories"
                                            className="font-bold text-[color:var(--gold-dark)] hover:underline"
                                        >
                                            افزودن دسته‌بندی
                                        </Link>
                                    </div>
                                )}
                                {productErrors.categoryId && (
                                    <p className="mt-1.5 text-xs text-negative">
                                        {productErrors.categoryId}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="product-unit">واحد</Label>
                                <Input
                                    id="product-unit"
                                    value={productForm.unit}
                                    onChange={(event) =>
                                        setProductForm((current) => ({
                                            ...current,
                                            unit: event.target.value,
                                        }))
                                    }
                                    placeholder="گرم، عدد، مثقال و..."
                                    className="mt-1.5 h-11"
                                    aria-invalid={Boolean(productErrors.unit)}
                                />
                                {productErrors.unit && (
                                    <p className="mt-1.5 text-xs text-negative">
                                        {productErrors.unit}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="product-price">قیمت (تومان)</Label>
                                <Input
                                    id="product-price"
                                    inputMode="numeric"
                                    dir="ltr"
                                    value={productForm.price}
                                    onChange={(event) =>
                                        setProductForm((current) => ({
                                            ...current,
                                            price: event.target.value,
                                        }))
                                    }
                                    placeholder="7800000"
                                    className="mt-1.5 h-11 text-left"
                                    aria-invalid={Boolean(productErrors.price)}
                                />
                                {productErrors.price && (
                                    <p className="mt-1.5 text-xs text-negative">
                                        {productErrors.price}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="product-difference">
                                    اختلاف قیمت خرید و فروش (تومان){" "}
                                    <span className="font-normal text-muted-foreground">
                                        (اختیاری)
                                    </span>
                                </Label>
                                <Input
                                    id="product-difference"
                                    inputMode="numeric"
                                    dir="ltr"
                                    value={productForm.sellPriceDifferenceToman}
                                    onChange={(event) =>
                                        setProductForm((current) => ({
                                            ...current,
                                            sellPriceDifferenceToman: event.target.value,
                                        }))
                                    }
                                    placeholder="مثلاً 50000"
                                    className="mt-1.5 h-11 text-left"
                                    aria-invalid={Boolean(productErrors.sellPriceDifferenceToman)}
                                />
                                <p className="mt-1.5 text-[11px] text-muted-foreground">
                                    این مبلغ از قیمت خرید کم می‌شود تا قیمت فروش به مشتری محاسبه
                                    شود.
                                </p>
                                {productErrors.sellPriceDifferenceToman && (
                                    <p className="mt-1.5 text-xs text-negative">
                                        {productErrors.sellPriceDifferenceToman}
                                    </p>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={closeProductDialog}>
                                انصراف
                            </Button>
                            <Button type="submit">
                                {editingProduct ? (
                                    <>
                                        <Save className="me-2 h-4 w-4" />
                                        ذخیره تغییرات
                                    </>
                                ) : (
                                    <>
                                        <Plus className="me-2 h-4 w-4" />
                                        افزودن محصول
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(adjustTarget)}
                onOpenChange={(open) => !open && setAdjustTarget(null)}
            >
                <DialogContent dir="rtl" className="w-[calc(100%-2rem)] max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>تنظیم گام قیمت</DialogTitle>
                        <DialogDescription>
                            {adjustTarget
                                ? `مقدار تغییر دکمه‌های مثبت و منفی «${adjustTarget.title}» را مشخص کنید.`
                                : ""}
                        </DialogDescription>
                    </DialogHeader>

                    {adjustTarget && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3">
                                <div>
                                    <span className="text-[11px] text-muted-foreground">
                                        گام فعلی
                                    </span>
                                    <strong className="mt-1 block text-base font-extrabold tabular-nums">
                                        {formatNumber(adjustTarget.priceStep)} تومان
                                    </strong>
                                </div>
                                <div>
                                    <span className="text-[11px] text-muted-foreground">
                                        گام جدید
                                    </span>
                                    <strong className="mt-1 block text-base font-extrabold tabular-nums text-[color:var(--gold-dark)]">
                                        {formatNumber(
                                            Math.max(
                                                0,
                                                Math.floor(
                                                    parsePersianNumber(adjustmentSteps) || 0,
                                                ),
                                            ) * BASE_PRICE_STEP,
                                        )}{" "}
                                        تومان
                                    </strong>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="price-adjustment-steps">تعداد گام</Label>
                                <Input
                                    id="price-adjustment-steps"
                                    inputMode="numeric"
                                    value={adjustmentSteps}
                                    onChange={(event) => setAdjustmentSteps(event.target.value)}
                                    className="mt-1.5 h-11 text-center text-base font-bold tabular-nums"
                                    autoFocus
                                />
                                <p className="mt-1.5 text-[11px] text-muted-foreground">
                                    هر گام پایه {formatNumber(BASE_PRICE_STEP)} تومان است؛ برای مثال
                                    عدد ۵۰، تغییر قیمت را روی ۵۰٬۰۰۰ تومان تنظیم می‌کند.
                                </p>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setAdjustTarget(null)}
                                >
                                    انصراف
                                </Button>
                                <Button type="button" onClick={savePriceStep}>
                                    <Save className="me-2 h-4 w-4" />
                                    ذخیره گام قیمت
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <AlertDialogContent dir="rtl" className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>حذف محصول</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget && (
                                <>
                                    آیا از حذف محصول{" "}
                                    <span className="font-bold text-foreground">
                                        «{deleteTarget.title}»
                                    </span>{" "}
                                    مطمئن هستید؟ این عملیات قابل بازگشت نیست.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>انصراف</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            حذف محصول
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminPage>
    );
}

function AdminPriceSection({
    title,
    description,
    items,
    onIncrease,
    onDecrease,
    onEdit,
    onPriceStepSetting,
    onDelete,
}: {
    title: string;
    description: string;
    items: AdminPriceItem[];
    onIncrease: (item: AdminPriceItem) => void;
    onDecrease: (item: AdminPriceItem) => void;
    onEdit: (item: AdminPriceItem) => void;
    onPriceStepSetting: (item: AdminPriceItem) => void;
    onDelete: (item: AdminPriceItem) => void;
}) {
    return (
        <section className="overflow-hidden border-y border-border bg-card sm:rounded-2xl sm:border sm:shadow-elegant">
            <header className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.15fr)] items-end gap-1.5 border-b border-border bg-muted/35 px-3 py-3 sm:px-5 sm:py-4 xl:flex xl:items-center xl:justify-between xl:gap-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-extrabold sm:text-base">{title}</h2>
                    <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
                        {description}
                    </p>
                </div>
                <span className="text-center text-[10px] font-bold text-muted-foreground xl:hidden">
                    خرید
                </span>
                <span className="text-center text-[10px] font-bold text-muted-foreground xl:hidden">
                    فروش
                </span>
                <span className="hidden shrink-0 rounded-full bg-gold-soft px-2.5 py-1 text-[10px] font-bold text-[color:var(--gold-dark)] sm:text-[11px] xl:inline-flex">
                    {toPersianDigits(items.length)} محصول
                </span>
            </header>

            <div className="admin-price-header-grid hidden grid-cols-[minmax(170px,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)_90px_120px] gap-3 border-b border-border px-5 py-2.5 text-[11px] text-muted-foreground xl:grid">
                <span>محصول</span>
                <span>خرید</span>
                <span>فروش</span>
                <span>تغییر</span>
                <span>عملیات</span>
            </div>

            <div className="divide-y divide-border/80">
                {items.map((item) => (
                    <AdminPriceRow
                        key={item.id}
                        item={item}
                        onIncrease={onIncrease}
                        onDecrease={onDecrease}
                        onEdit={onEdit}
                        onPriceStepSetting={onPriceStepSetting}
                        onDelete={onDelete}
                    />
                ))}
            </div>
        </section>
    );
}

function AdminPriceRow({
    item,
    onIncrease,
    onDecrease,
    onEdit,
    onPriceStepSetting,
    onDelete,
}: {
    item: AdminPriceItem;
    onIncrease: (item: AdminPriceItem) => void;
    onDecrease: (item: AdminPriceItem) => void;
    onEdit: (item: AdminPriceItem) => void;
    onPriceStepSetting: (item: AdminPriceItem) => void;
    onDelete: (item: AdminPriceItem) => void;
}) {
    const meta = getPriceMeta(item);
    const decreaseDisabled = item.price <= item.priceStep;

    return (
        <article className="px-3 py-3 transition-colors hover:bg-muted/25 sm:px-5 sm:py-4">
            <div className="admin-price-row-grid grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.15fr)] items-center gap-1.5 xl:grid-cols-[minmax(170px,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)_90px_120px] xl:gap-3">
                <div className="group min-w-0">
                    <h3 className="truncate text-[12.5px] font-bold transition-colors group-hover:text-[color:var(--gold-dark)] sm:text-sm">
                        {item.title}
                    </h3>
                    <p className="mt-0.5 text-[9.5px] text-muted-foreground sm:text-[10px]">
                        هر {item.unit} · گام {formatNumber(item.priceStep)}
                    </p>
                </div>
                <PriceActionButton
                    tone="increase"
                    label={`قیمت خرید ${item.title}: ${formatNumber(item.price)} تومان؛ افزایش یک گام`}
                    value={item.price}
                    onClick={() => onIncrease(item)}
                />
                <PriceActionButton
                    tone="decrease"
                    label={`قیمت فروش ${item.title}: ${formatNumber(Math.max(0, item.price - item.sellPriceDifferenceToman))} تومان؛ کاهش یک گام`}
                    value={Math.max(0, item.price - item.sellPriceDifferenceToman)}
                    disabled={decreaseDisabled}
                    onClick={() => onDecrease(item)}
                />
                <div className="hidden xl:block">
                    <PriceDifference meta={meta} />
                </div>
                <div className="hidden items-center gap-1 xl:flex">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onPriceStepSetting(item)}
                        className="h-8 w-full min-w-0 px-0 text-[color:var(--gold-dark)] hover:bg-gold-soft hover:text-[color:var(--gold-dark)]"
                        aria-label={`تنظیم گام قیمت ${item.title}`}
                        title="تنظیم گام قیمت"
                    >
                        <ListPlus className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(item)}
                        className="h-8 w-full min-w-0 px-0 text-[9px]"
                        aria-label={`تنظیم اختلاف خرید و فروش ${item.title}`}
                        title="تنظیم اختلاف خرید و فروش"
                    >
                        اختلاف
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(item)}
                        aria-label={`ویرایش ${item.title}`}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(item)}
                        className="text-negative hover:bg-negative-soft hover:text-negative"
                        aria-label={`حذف ${item.title}`}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/50 pt-2 xl:hidden">
                <div className="flex min-w-0 items-center gap-2">
                    <PriceDifference meta={meta} compact />
                    <span className="truncate text-[10px] text-muted-foreground">
                        {formatPersianTime(item.updatedAt)}
                    </span>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onPriceStepSetting(item)}
                        className="h-8 w-8 text-[color:var(--gold-dark)] hover:bg-gold-soft hover:text-[color:var(--gold-dark)]"
                        aria-label={`تنظیم گام قیمت ${item.title}`}
                    >
                        <ListPlus className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onEdit(item)}
                        className="h-8 px-1.5 text-[9px]"
                        aria-label={`تنظیم اختلاف خرید و فروش ${item.title}`}
                    >
                        اختلاف
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(item)}
                        className="h-8 w-8 text-muted-foreground"
                        aria-label={`ویرایش ${item.title}`}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(item)}
                        className="h-8 w-8 text-muted-foreground hover:bg-negative-soft hover:text-negative"
                        aria-label={`حذف ${item.title}`}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </article>
    );
}

function PriceActionButton({
    tone,
    label,
    value,
    disabled,
    onClick,
}: {
    tone: "increase" | "decrease";
    label: string;
    value: number;
    disabled?: boolean;
    onClick: () => void;
}) {
    const increase = tone === "increase";
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            aria-label={label}
            title={label}
            className={
                "min-w-0 rounded-lg px-1 py-2 text-center transition-colors enabled:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed sm:px-2 xl:text-start " +
                (increase ? "bg-positive-soft" : "bg-negative-soft disabled:bg-muted/55")
            }
        >
            <span className="sr-only">{increase ? "قیمت خرید" : "قیمت فروش"}</span>
            <strong
                className={
                    "block whitespace-nowrap text-sm font-black tracking-tight tabular-nums sm:text-base lg:text-lg " +
                    (increase ? "text-positive" : "text-negative")
                }
            >
                {formatNumber(value)}
            </strong>
        </button>
    );
}

function getPriceMeta(item: AdminPriceItem) {
    const difference = item.price - item.previousPrice;
    const percent = item.previousPrice ? (difference / item.previousPrice) * 100 : 0;
    return {
        percent,
        Arrow: difference > 0 ? ArrowUp : difference < 0 ? ArrowDown : Minus,
        tone:
            difference > 0
                ? "text-positive bg-positive-soft"
                : difference < 0
                  ? "text-negative bg-negative-soft"
                  : "text-muted-foreground bg-muted",
    };
}

function PriceDifference({
    meta,
    compact = false,
}: {
    meta: ReturnType<typeof getPriceMeta>;
    compact?: boolean;
}) {
    const { Arrow, percent, tone } = meta;
    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-md font-bold ${
                compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
            } ${tone}`}
        >
            <Arrow className="h-3 w-3" />
            {toPersianDigits(Math.abs(percent).toFixed(2))}٪
        </span>
    );
}
