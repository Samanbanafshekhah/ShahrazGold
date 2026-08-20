import { useEffect, useState } from "react";
import { Bell, Menu, LogOut, Moon, Sun, User as UserIcon } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/lib/theme";
import { formatPersianDateLong, formatPersianTime, toPersianDigits } from "@/lib/formatters";
import { useNavigate } from "@tanstack/react-router";
import { adminLogout } from "@/lib/admin-auth";
import { toast } from "sonner";

export function AdminHeader({
    title,
    subtitle,
    onOpenMenu,
    onOpenRequests,
    pendingRequests,
    requestSignal,
}: {
    title: string;
    subtitle?: string;
    onOpenMenu: () => void;
    onOpenRequests: () => void;
    pendingRequests: number;
    requestSignal: number;
}) {
    const [now, setNow] = useState(() => new Date());
    const [theme, setTheme] = useTheme();
    const isDark = theme === "dark";
    const navigate = useNavigate();

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(id);
    }, []);

    const pendingLabel = pendingRequests > 99 ? "۹۹+" : toPersianDigits(pendingRequests);

    return (
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
            <div className="flex min-h-16 items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={onOpenMenu}
                        className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted lg:hidden"
                        aria-label="باز کردن منو"
                    >
                        <Menu className="h-4 w-4" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="truncate text-sm font-bold sm:text-lg">{title}</h1>
                        {subtitle && (
                            <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                    <div className="hidden text-left text-xs text-muted-foreground md:block">
                        <div className="font-medium text-foreground">
                            {formatPersianDateLong(now)}
                        </div>
                        <div>ساعت {formatPersianTime(now)}</div>
                    </div>
                    <button
                        type="button"
                        aria-label={isDark ? "حالت روز" : "حالت شب"}
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                        className="hidden h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted sm:inline-flex"
                    >
                        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={onOpenRequests}
                        aria-label={
                            pendingRequests > 0
                                ? pendingLabel + " درخواست خرید در انتظار بررسی"
                                : "مرکز درخواست‌های خرید"
                        }
                        aria-haspopup="dialog"
                        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-[color:var(--gold)] hover:bg-gold-soft hover:text-[color:var(--gold-dark)] sm:h-10 sm:w-10"
                    >
                        <span
                            key={requestSignal}
                            className={
                                "relative inline-flex items-center justify-center " +
                                (requestSignal > 0 ? "admin-request-bell-new" : "")
                            }
                        >
                            <Bell className="h-4 w-4" />
                            {requestSignal > 0 ? (
                                <span
                                    className="admin-request-ripple absolute inset-0 rounded-full"
                                    aria-hidden
                                />
                            ) : null}
                        </span>
                        {pendingRequests > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--warning)] px-1 text-[10px] font-bold text-white">
                                {pendingLabel}
                            </span>
                        )}
                    </button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-full border border-border p-1 hover:bg-muted sm:pe-3"
                                aria-label="منوی ادمین"
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-gold-soft text-[color:var(--gold-dark)] text-xs font-bold">
                                        ادمین
                                    </AvatarFallback>
                                </Avatar>
                                <span className="hidden text-xs font-bold sm:inline">
                                    مدیر سامانه
                                </span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-52">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                                admin@shahraygold.ir
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => navigate({ to: "/admin/settings" })}>
                                <UserIcon className="me-2 h-4 w-4" /> تنظیمات پنل
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onSelect={() => {
                                    void adminLogout().then(() => {
                                        toast.success("از پنل ادمین خارج شدید.");
                                        navigate({ to: "/" });
                                    });
                                }}
                                className="text-[color:var(--negative)]"
                            >
                                <LogOut className="me-2 h-4 w-4" /> خروج از حساب
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
