import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/admin/admin-page";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/lib/theme";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [theme, setTheme] = useTheme();
  const [notify, setNotify] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [adminEmail, setAdminEmail] = useState("admin@shahraygold.ir");

  return (
    <AdminPage title="تنظیمات" subtitle="پیکربندی پنل ادمین">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-elegant sm:p-5">
          <h2 className="text-sm font-bold">ظاهر</h2>
          <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0">
              <div className="text-sm font-bold">حالت شب</div>
              <div className="text-[11px] text-muted-foreground">تغییر تم پنل ادمین</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground">
                {theme === "dark" ? "روشن" : "خاموش"}
              </span>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
                aria-label="فعال‌کردن حالت شب"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-elegant sm:p-5">
          <h2 className="text-sm font-bold">اعلان‌ها</h2>
          <ToggleRow
            label="نمایش اعلان‌های پنل"
            hint="نوتیفیکیشن‌های داخل داشبورد"
            value={notify}
            onChange={setNotify}
          />
          <ToggleRow
            label="بروزرسانی خودکار قیمت‌ها"
            hint="هر ۶۰ ثانیه"
            value={autoRefresh}
            onChange={setAutoRefresh}
          />
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-elegant sm:p-5 lg:col-span-2">
          <h2 className="text-sm font-bold">اطلاعات ادمین</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">نام نمایشی</Label>
              <Input defaultValue="مدیر سامانه" />
            </div>
            <div>
              <Label className="mb-1.5 block">ایمیل</Label>
              <Input
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="w-full sm:w-auto" onClick={() => toast.success("تنظیمات ذخیره شد.")}>
              ذخیره تغییرات
            </Button>
          </div>
        </section>
      </div>
    </AdminPage>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <div className="text-sm font-bold leading-6">{label}</div>
        {hint && <div className="text-[11px] leading-5 text-muted-foreground">{hint}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={"text-[10px] font-bold " + (value ? "text-positive" : "text-muted-foreground")}
        >
          {value ? "روشن" : "خاموش"}
        </span>
        <Switch checked={value} onCheckedChange={onChange} aria-label={label} />
      </div>
    </div>
  );
}
