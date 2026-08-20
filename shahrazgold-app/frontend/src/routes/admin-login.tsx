import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLogin, useAdminSession } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin-login")({
    component: AdminLoginPage,
    head: () => ({
        meta: [{ title: "ورود مدیر | شهراز‌گلد" }, { name: "robots", content: "noindex" }],
    }),
});

function AdminLoginPage() {
    const navigate = useNavigate();
    const adminSession = useAdminSession();
    const [mobile, setMobile] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ mobile?: string; password?: string }>({});

    useEffect(() => {
        if (adminSession.ready && adminSession.authenticated) {
            navigate({ to: "/admin", replace: true });
        }
    }, [adminSession, navigate]);

    async function onSubmit(event: React.FormEvent) {
        event.preventDefault();

        const nextErrors: typeof errors = {};
        if (!/^09\d{9}$/.test(mobile.trim())) {
            nextErrors.mobile = "شماره موبایل مدیر را در قالب 09xxxxxxxxx وارد کنید.";
        }
        if (password.length < 8) {
            nextErrors.password = "رمز عبور باید حداقل ۸ کاراکتر باشد.";
        }

        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setLoading(true);
        const result = await adminLogin(mobile, password);
        setLoading(false);

        if (result.ok) {
            toast.success("با موفقیت وارد پنل مدیریت شدید.");
            navigate({ to: "/admin", replace: true });
            return;
        }

        toast.error(result.error ?? "ورود به پنل مدیریت ناموفق بود.");
    }

    if (adminSession.authenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2
                    className="h-6 w-6 animate-spin text-[color:var(--gold-dark)]"
                    aria-label="در حال بررسی دسترسی"
                />
            </div>
        );
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-background">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold-soft blur-3xl" />
                <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-gold-soft/70 blur-3xl" />
            </div>

            <header className="relative border-b border-border/60 bg-background/80 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                    <Brand />
                    <Link
                        to="/"
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                        بازگشت به سایت
                    </Link>
                </div>
            </header>

            <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-16">
                <section className="mx-auto w-full max-w-md">
                    <div className="mb-7">
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-soft text-[color:var(--gold-dark)]">
                            <LockKeyhole className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl font-extrabold">ورود به پنل مدیریت</h1>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            برای دسترسی به داشبورد، اطلاعات حساب مدیر را وارد کنید.
                        </p>
                    </div>

                    <form
                        onSubmit={onSubmit}
                        noValidate
                        className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8"
                    >
                        <div>
                            <Label htmlFor="admin-mobile">شماره موبایل مدیر</Label>
                            <Input
                                id="admin-mobile"
                                type="tel"
                                inputMode="tel"
                                autoComplete="username"
                                dir="ltr"
                                placeholder="09xxxxxxxxx"
                                value={mobile}
                                onChange={(event) => setMobile(event.target.value)}
                                className="mt-1.5 h-11 text-left"
                                aria-invalid={Boolean(errors.mobile)}
                                autoFocus
                            />
                            {errors.mobile && (
                                <p className="mt-1.5 text-xs text-negative">{errors.mobile}</p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="admin-password">رمز عبور</Label>
                            <div className="relative mt-1.5">
                                <Input
                                    id="admin-password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    dir="ltr"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="h-11 pe-11 text-left"
                                    aria-invalid={Boolean(errors.password)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((visible) => !visible)}
                                    className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted-foreground"
                                    aria-label={
                                        showPassword ? "پنهان‌کردن رمز عبور" : "نمایش رمز عبور"
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1.5 text-xs text-negative">{errors.password}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-11 w-full bg-gold text-primary-foreground hover:opacity-90"
                        >
                            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            ورود به پنل مدیریت
                        </Button>
                    </form>
                </section>

                <aside className="hidden rounded-3xl border border-border bg-card/80 p-10 shadow-elegant backdrop-blur lg:block">
                    <div className="inline-flex items-center gap-2 rounded-full border border-gold bg-gold-soft px-3 py-1.5 text-xs font-bold text-[color:var(--gold-dark)]">
                        <ShieldCheck className="h-4 w-4" />
                        دسترسی ویژه مدیران
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold leading-snug">
                        مدیریت یکپارچهٔ پلتفرم شهراز‌گلد
                    </h2>
                    <p className="mt-4 max-w-md text-sm leading-8 text-muted-foreground">
                        قیمت‌ها، درخواست‌های خرید، اطلاعیه‌های بازار و تنظیمات سامانه را از یک
                        داشبورد متمرکز مدیریت کنید.
                    </p>
                    <div className="mt-8 grid grid-cols-2 gap-3">
                        {[
                            "مدیریت قیمت‌ها",
                            "بررسی درخواست‌ها",
                            "انتشار اطلاعیه",
                            "تنظیمات سامانه",
                        ].map((item) => (
                            <div
                                key={item}
                                className="rounded-2xl border border-border bg-background p-4 text-xs font-medium"
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </main>
    );
}
