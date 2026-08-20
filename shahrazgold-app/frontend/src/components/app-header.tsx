import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Brand } from "./brand";
import { LogOut, Moon, RefreshCw, Sun, User as UserIcon } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCurrentUser, logout } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";

const NAV = [
    { label: "خانه", to: "/dashboard" as const },
    { label: "معاملات", to: "/transactions" as const },
    { label: "پروفایل", to: "/profile" as const },
];

function isNavActive(pathname: string, to: (typeof NAV)[number]["to"]) {
    if (to === "/dashboard") return pathname === to || pathname.startsWith("/prices");
    return pathname === to || pathname.startsWith(to + "/");
}

export function AppHeader({
    onRefresh,
    refreshing,
    title,
}: {
    onRefresh?: () => void;
    refreshing?: boolean;
    title?: string;
}) {
    const user = useCurrentUser();
    const navigate = useNavigate();
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    const [theme, setTheme] = useTheme();
    const isDark = theme === "dark";

    const initials = user ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}` : "؟";

    return (
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-4 lg:gap-6">
                    <Brand to="/dashboard" />
                    {title && (
                        <span className="hidden truncate border-s border-border ps-4 text-sm font-bold lg:block">
                            {title}
                        </span>
                    )}
                    <nav className="hidden items-center gap-1 md:flex">
                        {NAV.map((n) => {
                            const active = isNavActive(pathname, n.to);
                            return (
                                <Link
                                    key={n.to}
                                    to={n.to}
                                    className={
                                        "rounded-lg px-3 py-2 text-sm transition-colors " +
                                        (active
                                            ? "bg-gold-soft text-[color:var(--gold-dark)] font-bold"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground")
                                    }
                                >
                                    {n.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {onRefresh && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onRefresh}
                            disabled={refreshing}
                            className="hidden sm:inline-flex"
                        >
                            <RefreshCw
                                className={"me-2 h-4 w-4 " + (refreshing ? "animate-spin" : "")}
                            />
                            به‌روزرسانی قیمت‌ها
                        </Button>
                    )}
                    {onRefresh && (
                        <button
                            type="button"
                            aria-label="به‌روزرسانی قیمت‌ها"
                            onClick={onRefresh}
                            disabled={refreshing}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted sm:hidden"
                        >
                            <RefreshCw
                                className={"h-4 w-4 " + (refreshing ? "animate-spin" : "")}
                            />
                        </button>
                    )}
                    <button
                        type="button"
                        aria-label={isDark ? "تغییر به حالت روز" : "تغییر به حالت شب"}
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                        className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline-flex"
                    >
                        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label="منوی کاربر"
                                className="inline-flex items-center gap-2 rounded-full p-0.5 hover:bg-muted sm:pe-2"
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-gold-soft text-[color:var(--gold-dark)] text-xs font-bold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="hidden text-xs font-medium sm:inline">
                                    {user ? `${user.firstName}` : "کاربر"}
                                </span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-48">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                                {user ? `${user.firstName} ${user.lastName}` : "حساب کاربری"}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => navigate({ to: "/profile" })}>
                                <UserIcon className="me-2 h-4 w-4" /> پروفایل
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onSelect={() => {
                                    void logout().then(() => {
                                        toast.success("با موفقیت خارج شدید.");
                                        navigate({ to: "/login" });
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
