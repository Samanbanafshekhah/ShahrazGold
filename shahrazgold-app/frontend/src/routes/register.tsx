import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { startRegistration, useCurrentUser } from "@/lib/auth";
import { validateIranianMobile } from "@/lib/theme";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/register")({
    component: RegisterPage,
    head: () => ({ meta: [{ title: "ثبت‌نام در شهراز‌گلد" }] }),
});

interface Errors {
    firstName?: string;
    lastName?: string;
    mobile?: string;
    password?: string;
    confirm?: string;
    terms?: string;
}

function RegisterPage() {
    const nav = useNavigate();
    const user = useCurrentUser();
    useEffect(() => {
        if (user) nav({ to: "/dashboard", replace: true });
    }, [user, nav]);

    const [firstName, setFirst] = useState("");
    const [lastName, setLast] = useState("");
    const [mobile, setMobile] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [terms, setTerms] = useState(false);
    const [errors, setErrors] = useState<Errors>({});
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const errs: Errors = {};
        if (firstName.trim().length < 2) errs.firstName = "نام معتبر وارد کنید.";
        if (lastName.trim().length < 2) errs.lastName = "نام خانوادگی معتبر وارد کنید.";
        if (!validateIranianMobile(mobile))
            errs.mobile = "شماره موبایل باید در قالب 09xxxxxxxxx باشد.";
        if (password.length < 8) errs.password = "رمز عبور باید حداقل ۸ کاراکتر باشد.";
        if (confirm !== password) errs.confirm = "تکرار رمز عبور مطابقت ندارد.";
        if (!terms) errs.terms = "پذیرش قوانین الزامی است.";
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setLoading(true);
        const res = await startRegistration({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            mobile: mobile.trim(),
            password,
        });
        setLoading(false);
        if (res.ok) {
            toast.success("حساب شما با موفقیت ساخته شد.");
            nav({ to: "/dashboard" });
        } else {
            toast.error(res.error ?? "ثبت‌نام ناموفق بود.");
        }
    }

    return (
        <AuthShell
            title="ایجاد حساب کاربری"
            description="با ایجاد حساب، به تمام امکانات شهراز‌گلد دسترسی پیدا کنید."
            footer={
                <span className="text-muted-foreground">
                    حساب دارید؟{" "}
                    <Link
                        to="/login"
                        className="font-bold text-[color:var(--gold-dark)] hover:underline"
                    >
                        وارد شوید
                    </Link>
                </span>
            }
        >
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="first">نام</Label>
                        <Input
                            id="first"
                            value={firstName}
                            onChange={(e) => setFirst(e.target.value)}
                            className="mt-1.5 h-11"
                        />
                        {errors.firstName && (
                            <p className="mt-1 text-xs text-negative">{errors.firstName}</p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="last">نام خانوادگی</Label>
                        <Input
                            id="last"
                            value={lastName}
                            onChange={(e) => setLast(e.target.value)}
                            className="mt-1.5 h-11"
                        />
                        {errors.lastName && (
                            <p className="mt-1 text-xs text-negative">{errors.lastName}</p>
                        )}
                    </div>
                </div>
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
                    />
                    {errors.mobile && <p className="mt-1 text-xs text-negative">{errors.mobile}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="password">رمز عبور</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1.5 h-11"
                        />
                        {errors.password && (
                            <p className="mt-1 text-xs text-negative">{errors.password}</p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="confirm">تکرار رمز عبور</Label>
                        <Input
                            id="confirm"
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="mt-1.5 h-11"
                        />
                        {errors.confirm && (
                            <p className="mt-1 text-xs text-negative">{errors.confirm}</p>
                        )}
                    </div>
                </div>
                <label className="flex items-start gap-2 text-xs">
                    <Checkbox
                        id="terms"
                        checked={terms}
                        onCheckedChange={(v) => setTerms(!!v)}
                        className="mt-0.5"
                    />
                    <span>
                        <a href="#" className="text-[color:var(--gold-dark)] hover:underline">
                            قوانین و مقررات
                        </a>{" "}
                        شهراز‌گلد را می‌پذیرم.
                    </span>
                </label>
                {errors.terms && <p className="text-xs text-negative">{errors.terms}</p>}
                <Button
                    disabled={loading}
                    className="h-11 w-full bg-gold text-primary-foreground hover:opacity-90"
                >
                    {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    ثبت‌نام
                </Button>
            </form>
        </AuthShell>
    );
}
