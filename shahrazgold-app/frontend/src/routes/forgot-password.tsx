import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
    clearPendingPasswordReset,
    getPendingPasswordReset,
    resendPasswordResetOtp,
    resetForgottenPassword,
    startPasswordReset,
} from "@/lib/auth";
import { toPersianDigits } from "@/lib/formatters";
import { validateIranianMobile } from "@/lib/theme";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
    component: ForgotPasswordPage,
    head: () => ({ meta: [{ title: "بازیابی رمز عبور" }] }),
});

function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<"mobile" | "reset">("mobile");
    const [mobile, setMobile] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [seconds, setSeconds] = useState(0);
    const [error, setError] = useState<string>();
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        const pending = getPendingPasswordReset();
        if (!pending) return;
        setMobile(pending.mobile);
        setSeconds(pending.resendAfter);
        setStep("reset");
    }, []);

    useEffect(() => {
        if (seconds <= 0) return;
        const id = window.setInterval(() => setSeconds((current) => current - 1), 1000);
        return () => window.clearInterval(id);
    }, [seconds]);

    async function requestCode(event: React.FormEvent) {
        event.preventDefault();
        if (!validateIranianMobile(mobile)) {
            setError("شماره موبایل باید در قالب 09xxxxxxxxx باشد.");
            return;
        }

        setError(undefined);
        setLoading(true);
        const result = await startPasswordReset(mobile);
        setLoading(false);
        if (!result.ok || !result.pending) {
            setError(result.error ?? "ارسال کد بازیابی ناموفق بود.");
            return;
        }

        setSeconds(result.pending.resendAfter);
        setStep("reset");
        toast.success("اگر این شماره حساب فعال داشته باشد، کد بازیابی ارسال شده است.");
    }

    async function submitNewPassword(event: React.FormEvent) {
        event.preventDefault();
        if (code.length !== 6) {
            setError("کد ۶ رقمی را کامل وارد کنید.");
            return;
        }
        if (password.length < 8) {
            setError("رمز عبور باید حداقل ۸ کاراکتر باشد.");
            return;
        }
        if (password !== confirmation) {
            setError("تکرار رمز عبور مطابقت ندارد.");
            return;
        }

        setError(undefined);
        setLoading(true);
        const result = await resetForgottenPassword(code, password);
        setLoading(false);
        if (!result.ok) {
            setError(result.error ?? "تغییر رمز عبور ناموفق بود.");
            return;
        }

        toast.success("رمز عبور با موفقیت تغییر کرد.");
        navigate({ to: "/login", replace: true });
    }

    async function resendCode() {
        setError(undefined);
        setResending(true);
        const result = await resendPasswordResetOtp();
        setResending(false);
        if (!result.ok) {
            setError(result.error ?? "ارسال مجدد کد ناموفق بود.");
            return;
        }

        setCode("");
        setSeconds(result.resendAfter ?? 90);
        toast.success("کد بازیابی جدید ارسال شد.");
    }

    function changeMobile() {
        clearPendingPasswordReset();
        setStep("mobile");
        setCode("");
        setPassword("");
        setConfirmation("");
        setError(undefined);
        setSeconds(0);
    }

    return (
        <AuthShell
            title="بازیابی رمز عبور"
            description={
                step === "mobile"
                    ? "شماره موبایل حساب خود را وارد کنید تا کد بازیابی برای شما پیامک شود."
                    : `کد پیامک‌شده به ${toPersianDigits(mobile)} و رمز عبور جدید را وارد کنید.`
            }
            footer={
                <Link
                    to="/login"
                    className="font-bold text-[color:var(--gold-dark)] hover:underline"
                >
                    بازگشت به صفحه ورود
                </Link>
            }
        >
            {step === "mobile" ? (
                <form onSubmit={requestCode} className="space-y-4" noValidate>
                    <div>
                        <Label htmlFor="mobile">شماره موبایل</Label>
                        <Input
                            id="mobile"
                            dir="ltr"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="09xxxxxxxxx"
                            value={mobile}
                            onChange={(event) => setMobile(event.target.value)}
                            className="mt-1.5 h-11"
                        />
                    </div>
                    {error && <p className="text-xs text-negative">{error}</p>}
                    <Button
                        disabled={loading}
                        className="h-11 w-full bg-gold text-primary-foreground hover:opacity-90"
                    >
                        {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        ارسال کد بازیابی
                    </Button>
                </form>
            ) : (
                <form onSubmit={submitNewPassword} className="space-y-4" noValidate>
                    <div>
                        <Label>کد بازیابی</Label>
                        <div dir="ltr" className="mt-1.5 flex justify-center">
                            <InputOTP maxLength={6} value={code} onChange={setCode}>
                                <InputOTPGroup>
                                    <InputOTPSlot index={0} />
                                    <InputOTPSlot index={1} />
                                    <InputOTPSlot index={2} />
                                    <InputOTPSlot index={3} />
                                    <InputOTPSlot index={4} />
                                    <InputOTPSlot index={5} />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="new-password">رمز عبور جدید</Label>
                        <Input
                            id="new-password"
                            dir="ltr"
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="mt-1.5 h-11"
                        />
                    </div>
                    <div>
                        <Label htmlFor="password-confirmation">تکرار رمز عبور جدید</Label>
                        <Input
                            id="password-confirmation"
                            dir="ltr"
                            type="password"
                            autoComplete="new-password"
                            value={confirmation}
                            onChange={(event) => setConfirmation(event.target.value)}
                            className="mt-1.5 h-11"
                        />
                    </div>
                    {error && <p className="text-xs text-negative">{error}</p>}
                    <div className="text-center text-xs text-muted-foreground">
                        {seconds > 0 ? (
                            <>ارسال مجدد کد تا {toPersianDigits(seconds)} ثانیه دیگر</>
                        ) : (
                            <button
                                type="button"
                                disabled={resending}
                                onClick={resendCode}
                                className="font-bold text-[color:var(--gold-dark)] hover:underline disabled:opacity-50"
                            >
                                {resending ? "در حال ارسال..." : "ارسال مجدد کد"}
                            </button>
                        )}
                    </div>
                    <Button
                        disabled={loading}
                        className="h-11 w-full bg-gold text-primary-foreground hover:opacity-90"
                    >
                        {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        ثبت رمز عبور جدید
                    </Button>
                    <button
                        type="button"
                        onClick={changeMobile}
                        className="w-full text-xs text-muted-foreground hover:text-foreground"
                    >
                        تغییر شماره موبایل
                    </button>
                </form>
            )}
        </AuthShell>
    );
}
