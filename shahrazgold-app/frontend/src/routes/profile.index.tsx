import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { logout, useCurrentUser } from "@/lib/auth";
import { formatPersianDate, toPersianDigits } from "@/lib/formatters";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, Pencil } from "lucide-react";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "پروفایل | شهراز‌گلد" }] }),
});

function ProfilePage() {
  const user = useCurrentUser();
  const nav = useNavigate();
  if (!user)
    return (
      <AppShell>
        <div />
      </AppShell>
    );
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;

  function onLogout() {
    logout();
    nav({ to: "/" });
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-4 shadow-elegant sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gold-soft text-lg font-black text-[color:var(--gold-dark)]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h1 className="truncate text-xl font-extrabold">
              {user.firstName} {user.lastName}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link
              to="/profile/edit"
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-bold hover:bg-muted"
            >
              <Pencil className="h-3.5 w-3.5" /> ویرایش پروفایل
            </Link>
          </div>
        </div>
        <dl className="mt-5 grid gap-2 sm:grid-cols-2">
          <Row label="نام" value={user.firstName} />
          <Row label="نام خانوادگی" value={user.lastName} />
          <Row label="شماره موبایل" value={toPersianDigits(user.mobile)} />
          <Row label="ایمیل" value={user.email ?? "—"} />
          <Row label="تاریخ عضویت" value={formatPersianDate(user.createdAt)} />
          <div className="flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-3 py-2">
            <Button
              type="button"
              variant="outline"
              onClick={onLogout}
              className="h-9 w-full rounded-lg px-3 text-xs font-bold text-destructive hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
              خروج
            </Button>
          </div>
        </dl>
      </section>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-bold">{value}</dd>
    </div>
  );
}
