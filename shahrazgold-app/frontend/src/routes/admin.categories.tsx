import { createFileRoute } from "@tanstack/react-router";
import {
    CheckCircle2,
    CircleOff,
    FolderTree,
    Layers3,
    Pencil,
    Plus,
    Search,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    createAdminCategory,
    deleteAdminCategory,
    setAdminCategoryActive,
    updateAdminCategory,
    useAdminCategories,
    type AdminCategory,
} from "@/lib/admin-categories";
import { formatPersianDate, toPersianDigits } from "@/lib/formatters";

export const Route = createFileRoute("/admin/categories")({
    component: CategoriesPage,
    head: () => ({ meta: [{ title: "مدیریت دسته‌بندی‌ها | شهراز‌گلد" }] }),
});

type CategoryForm = {
    name: string;
    description: string;
    active: boolean;
};

const EMPTY_FORM: CategoryForm = {
    name: "",
    description: "",
    active: true,
};

function CategoriesPage() {
    const categories = useAdminCategories();
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
    const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
    const [errors, setErrors] = useState<{
        name?: string;
        general?: string;
    }>({});

    const filteredCategories = useMemo(() => {
        const query = search.trim().toLocaleLowerCase("fa-IR");
        if (!query) return categories;
        return categories.filter(
            (category) =>
                category.name.toLocaleLowerCase("fa-IR").includes(query) ||
                category.description.toLocaleLowerCase("fa-IR").includes(query),
        );
    }, [categories, search]);

    const activeCount = categories.filter((category) => category.active).length;

    function openCreateDialog() {
        setEditingCategory(null);
        setForm(EMPTY_FORM);
        setErrors({});
        setDialogOpen(true);
    }

    function openEditDialog(category: AdminCategory) {
        setEditingCategory(category);
        setForm({
            name: category.name,
            description: category.description,
            active: category.active,
        });
        setErrors({});
        setDialogOpen(true);
    }

    function closeDialog() {
        setDialogOpen(false);
        setErrors({});
    }

    async function submitCategory(event: React.FormEvent) {
        event.preventDefault();
        setErrors({});

        const result = editingCategory
            ? await updateAdminCategory(editingCategory.id, form)
            : await createAdminCategory(form);

        if (!result.ok) {
            setErrors({ [result.field]: result.error });
            return;
        }

        toast.success(
            editingCategory
                ? `دسته‌بندی «${result.category.name}» ویرایش شد.`
                : `دسته‌بندی «${result.category.name}» اضافه شد.`,
        );
        closeDialog();
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        const deleted = await deleteAdminCategory(deleteTarget.id);
        if (deleted) toast.success(`دسته‌بندی «${deleteTarget.name}» حذف شد.`);
        else toast.error("حذف دسته‌بندی انجام نشد.");
        setDeleteTarget(null);
    }

    async function toggleActive(category: AdminCategory, active: boolean) {
        const updated = await setAdminCategoryActive(category.id, active);
        if (updated)
            toast.success(`دسته‌بندی «${category.name}» ${active ? "فعال" : "غیرفعال"} شد.`);
        else toast.error("تغییر وضعیت دسته‌بندی انجام نشد.");
    }

    return (
        <AdminPage title="مدیریت دسته‌بندی‌ها" subtitle="ایجاد و مدیریت دسته‌بندی محصولات">
            <div className="grid grid-cols-3 gap-3">
                <CategoryStat
                    icon={Layers3}
                    label="همه"
                    value={categories.length}
                    className="text-[color:var(--gold-dark)]"
                />
                <CategoryStat
                    icon={CheckCircle2}
                    label="فعال"
                    value={activeCount}
                    className="text-positive"
                />
                <CategoryStat
                    icon={CircleOff}
                    label="غیرفعال"
                    value={categories.length - activeCount}
                    className="text-muted-foreground"
                />
            </div>

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
                <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="جستجوی نام یا توضیحات..."
                            className="h-10 ps-10"
                        />
                    </div>
                    <Button onClick={openCreateDialog} className="w-full sm:w-auto">
                        <Plus className="me-2 h-4 w-4" />
                        افزودن دسته‌بندی
                    </Button>
                </div>

                {filteredCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                            <FolderTree className="h-6 w-6" />
                        </div>
                        <h2 className="mt-4 text-sm font-bold">
                            {search ? "دسته‌بندی پیدا نشد" : "هنوز دسته‌بندی ثبت نشده است"}
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {search
                                ? "عبارت دیگری را برای جستجو امتحان کنید."
                                : "برای شروع اولین دسته‌بندی را ایجاد کنید."}
                        </p>
                        {!search && (
                            <Button size="sm" onClick={openCreateDialog} className="mt-4">
                                <Plus className="me-2 h-4 w-4" />
                                افزودن دسته‌بندی
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full min-w-[760px] text-right text-sm">
                                <thead className="bg-muted/40 text-xs text-muted-foreground">
                                    <tr>
                                        <th className="p-3 font-medium">نام دسته‌بندی</th>
                                        <th className="p-3 font-medium">توضیحات</th>
                                        <th className="p-3 font-medium">تاریخ ایجاد</th>
                                        <th className="p-3 font-medium">وضعیت</th>
                                        <th className="p-3 font-medium">عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCategories.map((category) => (
                                        <tr key={category.id} className="border-t border-border">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-[color:var(--gold-dark)]">
                                                        <FolderTree className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-bold">
                                                        {category.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="max-w-64 p-3 text-xs leading-6 text-muted-foreground">
                                                <span className="line-clamp-2 break-words [overflow-wrap:anywhere]">
                                                    {category.description || "بدون توضیحات"}
                                                </span>
                                            </td>
                                            <td className="p-3 text-xs text-muted-foreground">
                                                {formatPersianDate(category.createdAt)}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={category.active}
                                                        onCheckedChange={(checked) =>
                                                            toggleActive(category, checked)
                                                        }
                                                        aria-label={`تغییر وضعیت ${category.name}`}
                                                    />
                                                    <span
                                                        className={
                                                            "text-xs font-bold " +
                                                            (category.active
                                                                ? "text-positive"
                                                                : "text-muted-foreground")
                                                        }
                                                    >
                                                        {category.active ? "فعال" : "غیرفعال"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditDialog(category)}
                                                        aria-label={`ویرایش ${category.name}`}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeleteTarget(category)}
                                                        className="text-negative hover:bg-negative-soft hover:text-negative"
                                                        aria-label={`حذف ${category.name}`}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="divide-y divide-border md:hidden">
                            {filteredCategories.map((category) => (
                                <article key={category.id} className="min-w-0 space-y-3 p-4">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-[color:var(--gold-dark)]">
                                            <FolderTree className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="truncate text-sm font-bold">
                                                {category.name}
                                            </h2>
                                            <p className="mt-1 text-[11px] text-muted-foreground">
                                                ایجاد: {formatPersianDate(category.createdAt)}
                                            </p>
                                        </div>
                                        <span
                                            className={
                                                "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold " +
                                                (category.active
                                                    ? "bg-positive-soft text-positive"
                                                    : "bg-muted text-muted-foreground")
                                            }
                                        >
                                            {category.active ? "فعال" : "غیرفعال"}
                                        </span>
                                    </div>

                                    <p className="max-w-full whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                                        {category.description || "بدون توضیحات"}
                                    </p>

                                    <div className="flex items-center justify-between border-t border-border/60 pt-3">
                                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Switch
                                                checked={category.active}
                                                onCheckedChange={(checked) =>
                                                    toggleActive(category, checked)
                                                }
                                            />
                                            نمایش دسته‌بندی
                                        </label>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(category)}
                                                aria-label={`ویرایش ${category.name}`}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteTarget(category)}
                                                className="text-negative hover:bg-negative-soft hover:text-negative"
                                                aria-label={`حذف ${category.name}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </>
                )}
            </section>

            <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    if (!open) closeDialog();
                    else setDialogOpen(true);
                }}
            >
                <DialogContent
                    dir="rtl"
                    className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl"
                >
                    <form onSubmit={submitCategory}>
                        <DialogHeader>
                            <DialogTitle>
                                {editingCategory ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی"}
                            </DialogTitle>
                            <DialogDescription>
                                اطلاعات دسته‌بندی محصولات را وارد کنید.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-5">
                            {errors.general && (
                                <div className="rounded-lg bg-negative-soft p-3 text-xs text-negative">
                                    {errors.general}
                                </div>
                            )}

                            <div>
                                <Label htmlFor="category-name">نام دسته‌بندی</Label>
                                <Input
                                    id="category-name"
                                    value={form.name}
                                    onChange={(event) => {
                                        const name = event.target.value;
                                        setForm((current) => ({ ...current, name }));
                                    }}
                                    placeholder="مثلاً سکه‌های بانکی"
                                    className="mt-1.5 h-11"
                                    aria-invalid={Boolean(errors.name)}
                                    autoFocus
                                />
                                {errors.name && (
                                    <p className="mt-1.5 text-xs text-negative">{errors.name}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="category-description">توضیحات</Label>
                                <Textarea
                                    id="category-description"
                                    value={form.description}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            description: event.target.value,
                                        }))
                                    }
                                    placeholder="توضیح کوتاهی درباره این دسته‌بندی..."
                                    className="mt-1.5 min-h-24 resize-y"
                                    maxLength={500}
                                />
                                <p className="mt-1 text-left text-[10px] text-muted-foreground">
                                    {toPersianDigits(form.description.length)} / ۵۰۰
                                </p>
                            </div>

                            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-3">
                                <div>
                                    <div className="text-sm font-bold">دسته‌بندی فعال باشد</div>
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                        دسته‌بندی‌های غیرفعال برای مشتریان نمایش داده نمی‌شوند.
                                    </div>
                                </div>
                                <Switch
                                    checked={form.active}
                                    onCheckedChange={(active) =>
                                        setForm((current) => ({ ...current, active }))
                                    }
                                />
                            </label>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={closeDialog}>
                                انصراف
                            </Button>
                            <Button type="submit">
                                {editingCategory ? "ذخیره تغییرات" : "افزودن دسته‌بندی"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <AlertDialogContent dir="rtl" className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>حذف دسته‌بندی</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget && (
                                <>
                                    آیا از حذف دسته‌بندی{" "}
                                    <span className="font-bold text-foreground">
                                        «{deleteTarget.name}»
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
                            حذف دسته‌بندی
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminPage>
    );
}

function CategoryStat({
    icon: Icon,
    label,
    value,
    className,
}: {
    icon: typeof Layers3;
    label: string;
    value: number;
    className: string;
}) {
    return (
        <div className="min-w-0 rounded-2xl border border-border bg-card p-3 shadow-elegant sm:p-4">
            <Icon className={`h-4 w-4 ${className}`} />
            <div className="mt-3 text-lg font-extrabold sm:text-2xl">{toPersianDigits(value)}</div>
            <div className="mt-1 truncate text-[10px] text-muted-foreground sm:text-xs">
                {label}
            </div>
        </div>
    );
}
