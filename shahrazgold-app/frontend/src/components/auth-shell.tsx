import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Brand } from "./brand";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <Brand />
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            بازگشت به سایت
          </Link>
        </div>
      </header>
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1440px] px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-elegant">
            {children}
          </div>
          {footer && <div className="mt-5 text-center text-sm">{footer}</div>}
        </div>
        <aside className="hidden overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[color:var(--gold-soft)] via-card to-card p-10 shadow-elegant lg:block">
          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold bg-card px-3 py-1 text-xs font-bold text-[color:var(--gold-dark)]">
              پلتفرم حرفه‌ای قیمت طلا
            </div>
            <h2 className="mt-5 text-3xl font-extrabold leading-snug">
              شفافیت بازار طلا و سکه، در دستان شما.
            </h2>
            <p className="mt-4 text-sm leading-8 text-muted-foreground">
              با ورود به حساب کاربری، به قیمت‌های لحظه‌ای و سابقه تراکنش‌ها دسترسی خواهید داشت.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {["به‌روزرسانی سریع", "امنیت داده‌ها", "پشتیبانی فارسی", "طراحی واکنش‌گرا"].map(
                (t) => (
                  <div key={t} className="rounded-2xl border border-border bg-card p-3 text-xs">
                    {t}
                  </div>
                ),
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
