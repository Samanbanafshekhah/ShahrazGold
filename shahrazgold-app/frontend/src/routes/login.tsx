import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { login, useCurrentUser } from "@/lib/auth";
import { validateIranianMobile } from "@/lib/theme";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
    component: LoginPage,
    head: () => ({ meta: [{ title: "ورود به شهراز‌گلد" }] }),
});

function LoginPage() {
    const nav = useNavigate();
    const user = useCurrentUser();
    useEffect(() => {
        if (user) nav({ to: "/dashboard", replace: true });
    }, [user, nav]);

    const [mobile, setMobile] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [show, setShow] = useState(false);
    const [errors, setErrors] = useState<{ mobile?: string; password?: string }>({});
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const errs: typeof errors = {};
        if (!validateIranianMobile(mobile))
            errs.mobile = "شماره موبایل باید در قالب 09xxxxxxxxx باشد.";
        if (password.length < 8) errs.password = "رمز عبور باید حداقل ۸ کاراکتر باشد.";
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setLoading(true);
        const res = await login(mobile.trim(), password);
        setLoading(false);
        if (res.ok) {
            toast.success("ورود با موفقیت انجام شد.");
            nav({ to: "/dashboard" });
        } else {
            toast.error(res.error ?? "ورود ناموفق بود.");
        }
    }

    return (
        <AuthShell
            title="ورود به حساب کاربری"
            description="برای مشاهده قیمت‌ها و تراکنش‌ها وارد شوید."
            footer={
                <span className="text-muted-foreground">
                    حساب کاربری ندارید؟{" "}
                    <Link
                        to="/register"
                        className="font-bold text-[color:var(--gold-dark)] hover:underline"
                    >
                        ثبت‌نام کنید
                    </Link>
                </span>
            }
        >
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div>
                    <Label htmlFor="mobile">شماره موبایل</Label>
                    <Input
                        id="mobile"
                        inputMode="tel"
                        dir="ltr"
                        placeholder="09xxxxxxxxx"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className="mt-1.5 h-11"
                        aria-invalid={!!errors.mobile}
                    />
                    {errors.mobile && <p className="mt-1 text-xs text-negative">{errors.mobile}</p>}
                </div>
                <div>
                    <Label htmlFor="password">رمز عبور</Label>
                    <div className="relative mt-1.5">
                        <Input
                            id="password"
                            type={show ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-11 pe-11"
                            aria-invalid={!!errors.password}
                        />
                        <button
                            type="button"
                            onClick={() => setShow((v) => !v)}
                            aria-label={show ? "پنهان‌سازی رمز عبور" : "نمایش رمز عبور"}
                            className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted-foreground"
                        >
                            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="mt-1 text-xs text-negative">{errors.password}</p>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                            checked={remember}
                            onCheckedChange={(v) => setRemember(!!v)}
                            id="remember"
                        />
                        <span>مرا به خاطر بسپار</span>
                    </label>
                    <Link
                        to="/forgot-password"
                        className="text-xs text-[color:var(--gold-dark)] hover:underline"
                    >
                        فراموشی رمز عبور؟
                    </Link>
                </div>
                <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full bg-gold text-primary-foreground hover:opacity-90"
                >
                    {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    ورود
                </Button>
            </form>
        </AuthShell>
    );
}
