import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateIranianMobile } from "@/lib/theme";
import { Loader2, MailCheck } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({ meta: [{ title: "بازیابی رمز عبور" }] }),
});

function ForgotPasswordPage() {
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateIranianMobile(mobile)) {
      setError("شماره موبایل باید در قالب 09xxxxxxxxx باشد.");
      return;
    }
    setError(undefined);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setSent(true);
    toast.success("لینک بازیابی رمز عبور ارسال شد.");
  }

  return (
    <AuthShell
      title="بازیابی رمز عبور"
      description="شماره موبایل حساب خود را وارد کنید تا لینک بازیابی برای شما ارسال شود."
      footer={
        <Link to="/login" className="font-bold text-[color:var(--gold-dark)] hover:underline">
          بازگشت به صفحه ورود
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-positive-soft text-positive">
            <MailCheck className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold">پیامک ارسال شد</h2>
          <p className="text-xs text-muted-foreground">
            کد بازیابی به شماره موبایل شما ارسال شد. لطفاً پیامک‌های خود را بررسی کنید.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="mobile">شماره موبایل</Label>
            <Input
              id="mobile"
              dir="ltr"
              inputMode="tel"
              placeholder="09xxxxxxxxx"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="mt-1.5 h-11"
            />
            {error && <p className="mt-1 text-xs text-negative">{error}</p>}
          </div>
          <Button disabled={loading} className="h-11 w-full bg-gold text-primary-foreground hover:opacity-90">
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            ارسال لینک بازیابی
          </Button>
        </form>
      )}
    </AuthShell>
  );
}