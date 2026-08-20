import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { getPendingRegistration, verifyOtp } from "@/lib/auth";
import { toPersianDigits } from "@/lib/formatters";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/verify-otp")({
  component: OtpPage,
  head: () => ({ meta: [{ title: "تأیید شماره موبایل" }] }),
});

function OtpPage() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(90);
  const [mobile, setMobile] = useState<string | null>(null);

  useEffect(() => {
    setMobile(getPendingRegistration()?.mobile ?? null);
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("کد ۶ رقمی را کامل وارد کنید.");
      return;
    }
    setLoading(true);
    const res = await verifyOtp(code);
    setLoading(false);
    if (res.ok) {
      toast.success("حساب شما با موفقیت فعال شد.");
      nav({ to: "/dashboard" });
    } else {
      toast.error(res.error ?? "کد نامعتبر است.");
    }
  }

  return (
    <AuthShell
      title="تأیید شماره موبایل"
      description={
        mobile
          ? `کد ۶ رقمی ارسال‌شده به شماره ${toPersianDigits(mobile)} را وارد کنید.`
          : "کد ۶ رقمی ارسال‌شده به موبایل خود را وارد کنید."
      }
      footer={
        <Link to="/register" className="text-xs text-muted-foreground hover:text-foreground">
          تغییر شماره موبایل
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <div dir="ltr" className="flex justify-center">
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
        <div className="text-center text-xs text-muted-foreground">
          {seconds > 0 ? (
            <>ارسال مجدد کد تا {toPersianDigits(seconds)} ثانیه دیگر</>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSeconds(90);
                toast.success("کد جدید ارسال شد.");
              }}
              className="font-bold text-[color:var(--gold-dark)] hover:underline"
            >
              ارسال مجدد کد
            </button>
          )}
        </div>
        <Button disabled={loading} className="h-11 w-full bg-gold text-primary-foreground hover:opacity-90">
          {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          تأیید و ورود
        </Button>
        <div className="rounded-lg bg-muted p-3 text-center text-[11px] text-muted-foreground">
          کد تست: <span dir="ltr" className="font-bold">123456</span>
        </div>
      </form>
    </AuthShell>
  );
}