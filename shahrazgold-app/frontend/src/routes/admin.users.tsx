import { createFileRoute } from "@tanstack/react-router";
import {
    CalendarDays,
    CheckCircle2,
    Loader2,
    Mail,
    MonitorSmartphone,
    Phone,
    Plus,
    Search,
    ShieldCheck,
    UserCheck,
    UserPlus,
    Users,
    Wifi,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/admin-page";
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
import { Switch } from "@/components/ui/switch";
import { ApiError, apiErrorMessage, apiRequest } from "@/lib/api";
import { useAdminOnlineUsers } from "@/lib/admin-data";
import { formatPersianDate, formatRelativeMinutes, toPersianDigits } from "@/lib/formatters";

export const Route = createFileRoute("/admin/users")({
    component: UsersPage,
    head: () => ({ meta: [{ title: "مدیریت کاربران | شهراز‌گلد" }] }),
});

type UserRole = "admin" | "customer";

type AdminUser = {
    id: string;
    firstName: string;
    lastName: string;
    mobile: string;
    email: string;
    role: UserRole;
    active: boolean;
    mobileVerifiedAt: string | null;
    lastLoginAt: string | null;
    createdAt: string;
};

type ApiUser = {
    id: number;
    first_name: string;
    last_name: string;
    mobile: string;
    email?: string | null;
    role: UserRole;
    is_active: boolean;
    mobile_verified_at?: string | null;
    last_login_at?: string | null;
    created_at: string;
};

type UserForm = {
    firstName: string;
    lastName: string;
    mobile: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    role: UserRole;
    active: boolean;
};

type UserFormErrors = Partial<Record<keyof UserForm | "general", string>>;

const EMPTY_FORM: UserForm = {
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
    password: "",
    passwordConfirmation: "",
    role: "customer",
    active: true,
};

function mapUser(user: ApiUser): AdminUser {
    return {
        id: String(user.id),
        firstName: user.first_name,
        lastName: user.last_name,
        mobile: user.mobile,
        email: user.email ?? "",
        role: user.role,
        active: user.is_active,
        mobileVerifiedAt: user.mobile_verified_at ?? null,
        lastLoginAt: user.last_login_at ?? null,
        createdAt: user.created_at,
    };
}

function normalizeDigits(value: string): string {
    return value
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function normalizeMobile(value: string): string {
    return normalizeDigits(value).replace(/[\s-]/g, "");
}

function fullName(user: AdminUser): string {
    return `${user.firstName} ${user.lastName}`.trim();
}

function UsersPage() {
    const onlineUsers = useAdminOnlineUsers();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<UserForm>(EMPTY_FORM);
    const [errors, setErrors] = useState<UserFormErrors>({});
    const [submitting, setSubmitting] = useState(false);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            const response = await apiRequest<ApiUser[]>("admin/users?per_page=100");
            setUsers(response.data.map(mapUser));
        } catch (error) {
            setLoadError(apiErrorMessage(error, "دریافت فهرست کاربران ناموفق بود."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    const filteredUsers = useMemo(() => {
        const query = normalizeDigits(search).trim().toLocaleLowerCase("fa-IR");
        return users.filter((user) => {
            if (roleFilter !== "all" && user.role !== roleFilter) return false;
            if (statusFilter === "active" && !user.active) return false;
            if (statusFilter === "inactive" && user.active) return false;
            if (!query) return true;
            return [fullName(user), user.mobile, user.email]
                .join(" ")
                .toLocaleLowerCase("fa-IR")
                .includes(query);
        });
    }, [roleFilter, search, statusFilter, users]);

    const activeCount = users.filter((user) => user.active).length;
    const adminCount = users.filter((user) => user.role === "admin").length;

    function openCreateDialog() {
        setForm(EMPTY_FORM);
        setErrors({});
        setDialogOpen(true);
    }

    function closeDialog() {
        if (submitting) return;
        setDialogOpen(false);
        setErrors({});
    }

    function validateForm(): UserFormErrors {
        const next: UserFormErrors = {};
        if (form.firstName.trim().length < 2) next.firstName = "نام باید حداقل ۲ کاراکتر باشد.";
        if (form.lastName.trim().length < 2)
            next.lastName = "نام خانوادگی باید حداقل ۲ کاراکتر باشد.";
        const mobile = normalizeMobile(form.mobile);
        if (!/^09\d{9}$/.test(mobile)) next.mobile = "شماره موبایل باید با ۰۹ شروع و ۱۱ رقم باشد.";
        if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
            next.email = "ایمیل واردشده معتبر نیست.";
        if (form.password.length < 8) next.password = "رمز عبور باید حداقل ۸ کاراکتر باشد.";
        if (form.password !== form.passwordConfirmation)
            next.passwordConfirmation = "تکرار رمز عبور مطابقت ندارد.";
        return next;
    }

    async function submitUser(event: React.FormEvent) {
        event.preventDefault();
        const validationErrors = validateForm();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        setSubmitting(true);
        try {
            const response = await apiRequest<ApiUser>("admin/users", {
                method: "POST",
                body: JSON.stringify({
                    first_name: form.firstName.trim(),
                    last_name: form.lastName.trim(),
                    mobile: normalizeMobile(form.mobile),
                    email: form.email.trim() || null,
                    password: form.password,
                    password_confirmation: form.passwordConfirmation,
                    role: form.role,
                    is_active: form.active,
                }),
            });
            const user = mapUser(response.data);
            setUsers((current) => [user, ...current]);
            toast.success(`کاربر «${fullName(user)}» با موفقیت ایجاد شد.`);
            setDialogOpen(false);
            setForm(EMPTY_FORM);
        } catch (error) {
            const nextErrors: UserFormErrors = {
                general: apiErrorMessage(error, "ایجاد کاربر ناموفق بود."),
            };
            if (error instanceof ApiError && error.errors) {
                const fieldMap: Record<string, keyof UserForm> = {
                    first_name: "firstName",
                    last_name: "lastName",
                    mobile: "mobile",
                    email: "email",
                    password: "password",
                    role: "role",
                    is_active: "active",
                };
                for (const [field, messages] of Object.entries(error.errors)) {
                    const formField = fieldMap[field];
                    if (formField && messages[0]) nextErrors[formField] = messages[0];
                }
            }
            setErrors(nextErrors);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AdminPage title="مدیریت کاربران" subtitle="مشاهده کاربران و تعریف حساب کاربری جدید">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <UserStat icon={Users} label="همه کاربران" value={users.length} tone="gold" />
                <UserStat
                    icon={UserCheck}
                    label="کاربران فعال"
                    value={activeCount}
                    tone="positive"
                />
                <UserStat icon={ShieldCheck} label="مدیران" value={adminCount} tone="neutral" />
                <UserStat
                    icon={Wifi}
                    label="آنلاین اکنون"
                    value={onlineUsers.length}
                    tone="positive"
                />
            </div>

            <OnlineUsers users={onlineUsers} />

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
                <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="grid flex-1 gap-2 sm:grid-cols-[minmax(220px,1fr)_150px_150px]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="جستجوی نام، موبایل یا ایمیل..."
                                className="h-10 ps-10"
                            />
                        </div>
                        <Select
                            value={roleFilter}
                            onValueChange={(value) => setRoleFilter(value as "all" | UserRole)}
                        >
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="نقش" />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                                <SelectItem value="all">همه نقش‌ها</SelectItem>
                                <SelectItem value="customer">مشتری</SelectItem>
                                <SelectItem value="admin">مدیر</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={statusFilter}
                            onValueChange={(value) =>
                                setStatusFilter(value as "all" | "active" | "inactive")
                            }
                        >
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="وضعیت" />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                                <SelectItem value="active">فعال</SelectItem>
                                <SelectItem value="inactive">غیرفعال</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={openCreateDialog} className="w-full xl:w-auto">
                        <UserPlus className="me-2 h-4 w-4" />
                        تعریف کاربر جدید
                    </Button>
                </div>

                {loading ? (
                    <div className="flex min-h-64 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-[color:var(--gold-dark)]" />
                    </div>
                ) : loadError ? (
                    <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
                        <Users className="h-8 w-8 text-negative" />
                        <p className="mt-3 text-sm font-bold">{loadError}</p>
                        <Button variant="outline" size="sm" className="mt-4" onClick={loadUsers}>
                            تلاش دوباره
                        </Button>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
                        <Users className="h-9 w-9 text-muted-foreground" />
                        <h2 className="mt-3 text-sm font-bold">
                            {users.length === 0 ? "هنوز کاربری ثبت نشده است" : "کاربری پیدا نشد"}
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {users.length === 0
                                ? "برای شروع یک حساب کاربری جدید تعریف کنید."
                                : "فیلترها یا عبارت جستجو را تغییر دهید."}
                        </p>
                    </div>
                ) : (
                    <UserList users={filteredUsers} />
                )}
            </section>

            <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    if (open) setDialogOpen(true);
                    else closeDialog();
                }}
            >
                <DialogContent
                    dir="rtl"
                    className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl"
                >
                    <form onSubmit={submitUser}>
                        <DialogHeader>
                            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-gold-soft text-[color:var(--gold-dark)]">
                                <UserPlus className="h-5 w-5" />
                            </div>
                            <DialogTitle>تعریف کاربر جدید</DialogTitle>
                            <DialogDescription>
                                اطلاعات هویتی و سطح دسترسی کاربر را وارد کنید.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-5 sm:grid-cols-2">
                            <FormField
                                label="نام"
                                htmlFor="user-first-name"
                                error={errors.firstName}
                            >
                                <Input
                                    id="user-first-name"
                                    value={form.firstName}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            firstName: event.target.value,
                                        }))
                                    }
                                    autoFocus
                                    aria-invalid={Boolean(errors.firstName)}
                                />
                            </FormField>
                            <FormField
                                label="نام خانوادگی"
                                htmlFor="user-last-name"
                                error={errors.lastName}
                            >
                                <Input
                                    id="user-last-name"
                                    value={form.lastName}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            lastName: event.target.value,
                                        }))
                                    }
                                    aria-invalid={Boolean(errors.lastName)}
                                />
                            </FormField>
                            <FormField
                                label="شماره موبایل"
                                htmlFor="user-mobile"
                                error={errors.mobile}
                            >
                                <Input
                                    id="user-mobile"
                                    inputMode="numeric"
                                    dir="ltr"
                                    value={form.mobile}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            mobile: event.target.value,
                                        }))
                                    }
                                    placeholder="09123456789"
                                    className="text-left"
                                    aria-invalid={Boolean(errors.mobile)}
                                />
                            </FormField>
                            <FormField
                                label="ایمیل (اختیاری)"
                                htmlFor="user-email"
                                error={errors.email}
                            >
                                <Input
                                    id="user-email"
                                    type="email"
                                    dir="ltr"
                                    value={form.email}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            email: event.target.value,
                                        }))
                                    }
                                    placeholder="user@example.com"
                                    className="text-left"
                                    aria-invalid={Boolean(errors.email)}
                                />
                            </FormField>
                            <FormField
                                label="رمز عبور"
                                htmlFor="user-password"
                                error={errors.password}
                            >
                                <Input
                                    id="user-password"
                                    type="password"
                                    dir="ltr"
                                    value={form.password}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            password: event.target.value,
                                        }))
                                    }
                                    className="text-left"
                                    aria-invalid={Boolean(errors.password)}
                                />
                            </FormField>
                            <FormField
                                label="تکرار رمز عبور"
                                htmlFor="user-password-confirmation"
                                error={errors.passwordConfirmation}
                            >
                                <Input
                                    id="user-password-confirmation"
                                    type="password"
                                    dir="ltr"
                                    value={form.passwordConfirmation}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            passwordConfirmation: event.target.value,
                                        }))
                                    }
                                    className="text-left"
                                    aria-invalid={Boolean(errors.passwordConfirmation)}
                                />
                            </FormField>
                            <FormField label="نقش کاربر" htmlFor="user-role" error={errors.role}>
                                <Select
                                    value={form.role}
                                    onValueChange={(role) =>
                                        setForm((current) => ({
                                            ...current,
                                            role: role as UserRole,
                                        }))
                                    }
                                >
                                    <SelectTrigger id="user-role">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                        <SelectItem value="customer">مشتری</SelectItem>
                                        <SelectItem value="admin">مدیر</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                                <div>
                                    <Label htmlFor="user-active">وضعیت حساب</Label>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        کاربر فعال امکان ورود به حساب را دارد.
                                    </p>
                                </div>
                                <Switch
                                    id="user-active"
                                    checked={form.active}
                                    onCheckedChange={(active) =>
                                        setForm((current) => ({ ...current, active }))
                                    }
                                />
                            </div>
                        </div>

                        {errors.general && (
                            <p className="mb-4 rounded-xl bg-negative-soft px-3 py-2 text-xs text-negative">
                                {errors.general}
                            </p>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeDialog}
                                disabled={submitting}
                            >
                                انصراف
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? (
                                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="me-2 h-4 w-4" />
                                )}
                                ایجاد کاربر
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AdminPage>
    );
}

function OnlineUsers({ users }: { users: ReturnType<typeof useAdminOnlineUsers> }) {
    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-positive" />
                        </span>
                        <h2 className="text-sm font-extrabold">کاربران آنلاین</h2>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        کاربران واردشده‌ای که در ۹۰ ثانیه اخیر در سایت فعال بوده‌اند
                    </p>
                </div>
                <span className="shrink-0 rounded-full bg-positive-soft px-3 py-1 text-xs font-bold text-positive">
                    {toPersianDigits(users.length)} نفر
                </span>
            </div>

            {users.length === 0 ? (
                <div className="flex min-h-32 flex-col items-center justify-center p-5 text-center">
                    <Wifi className="h-7 w-7 text-muted-foreground" />
                    <p className="mt-2 text-sm font-bold">در حال حاضر کاربری آنلاین نیست</p>
                </div>
            ) : (
                <div className="grid gap-3 p-4 lg:grid-cols-2">
                    {users.map((user) => (
                        <article
                            key={user.id}
                            className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-positive" />
                                    <strong className="truncate text-sm">
                                        {user.name || "کاربر"}
                                    </strong>
                                </div>
                                {user.mobile && (
                                    <div className="mt-1 text-xs text-muted-foreground" dir="ltr">
                                        {toPersianDigits(user.mobile)}
                                    </div>
                                )}
                            </div>
                            <div className="grid shrink-0 gap-1.5 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5" dir="ltr">
                                    <MonitorSmartphone className="h-3.5 w-3.5" />
                                    <span>IP: {user.ipAddress}</span>
                                </div>
                                <div className="text-[11px]" dir="rtl">
                                    آخرین فعالیت: {formatRelativeMinutes(user.lastActivityAt)}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

function UserList({ users }: { users: AdminUser[] }) {
    return (
        <>
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-right text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                            <th className="p-3 font-medium">کاربر</th>
                            <th className="p-3 font-medium">اطلاعات تماس</th>
                            <th className="p-3 font-medium">نقش</th>
                            <th className="p-3 font-medium">وضعیت</th>
                            <th className="p-3 font-medium">آخرین ورود</th>
                            <th className="p-3 font-medium">تاریخ عضویت</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-t border-border hover:bg-muted/25">
                                <td className="p-3">
                                    <UserIdentity user={user} />
                                </td>
                                <td className="p-3">
                                    <ContactInfo user={user} />
                                </td>
                                <td className="p-3">
                                    <RoleBadge role={user.role} />
                                </td>
                                <td className="p-3">
                                    <StatusBadge active={user.active} />
                                </td>
                                <td className="p-3 text-xs text-muted-foreground">
                                    {user.lastLoginAt
                                        ? formatPersianDate(user.lastLoginAt)
                                        : "هنوز وارد نشده"}
                                </td>
                                <td className="p-3 text-xs text-muted-foreground">
                                    {formatPersianDate(user.createdAt)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="divide-y divide-border md:hidden">
                {users.map((user) => (
                    <article key={user.id} className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <UserIdentity user={user} />
                            <StatusBadge active={user.active} />
                        </div>
                        <ContactInfo user={user} />
                        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                            <RoleBadge role={user.role} />
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <CalendarDays className="h-3.5 w-3.5" />
                                عضویت {formatPersianDate(user.createdAt)}
                            </span>
                        </div>
                    </article>
                ))}
            </div>
        </>
    );
}

function UserIdentity({ user }: { user: AdminUser }) {
    const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    return (
        <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-xs font-extrabold text-[color:var(--gold-dark)]">
                {initials || "ک"}
            </div>
            <div className="min-w-0">
                <div className="truncate font-bold">{fullName(user)}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                    شناسه {toPersianDigits(user.id)}
                </div>
            </div>
        </div>
    );
}

function ContactInfo({ user }: { user: AdminUser }) {
    return (
        <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5" dir="ltr">
                <Phone className="h-3.5 w-3.5" />
                <span>{toPersianDigits(user.mobile)}</span>
                {user.mobileVerifiedAt && <CheckCircle2 className="h-3.5 w-3.5 text-positive" />}
            </div>
            {user.email && (
                <div className="flex items-center gap-1.5" dir="ltr">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="max-w-56 truncate">{user.email}</span>
                </div>
            )}
        </div>
    );
}

function RoleBadge({ role }: { role: UserRole }) {
    return (
        <span
            className={
                "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold " +
                (role === "admin"
                    ? "bg-gold-soft text-[color:var(--gold-dark)]"
                    : "bg-muted text-muted-foreground")
            }
        >
            {role === "admin" ? "مدیر" : "مشتری"}
        </span>
    );
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={
                "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold " +
                (active ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative")
            }
        >
            {active ? "فعال" : "غیرفعال"}
        </span>
    );
}

function UserStat({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: typeof Users;
    label: string;
    value: number;
    tone: "gold" | "positive" | "neutral";
}) {
    const toneClass =
        tone === "gold"
            ? "bg-gold-soft text-[color:var(--gold-dark)]"
            : tone === "positive"
              ? "bg-positive-soft text-positive"
              : "bg-muted text-muted-foreground";
    return (
        <div className="rounded-2xl border border-border bg-card p-3 shadow-elegant sm:p-4">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
                <Icon className="h-4 w-4" />
            </div>
            <strong className="mt-3 block text-xl font-extrabold sm:text-2xl">
                {toPersianDigits(value)}
            </strong>
            <span className="mt-0.5 block truncate text-[10px] text-muted-foreground sm:text-xs">
                {label}
            </span>
        </div>
    );
}

function FormField({
    label,
    htmlFor,
    error,
    children,
}: {
    label: string;
    htmlFor: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <Label htmlFor={htmlFor}>{label}</Label>
            <div className="mt-1.5">{children}</div>
            {error && <p className="mt-1.5 text-xs text-negative">{error}</p>}
        </div>
    );
}
