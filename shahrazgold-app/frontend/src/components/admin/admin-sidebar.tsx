import { Link, useRouterState } from "@tanstack/react-router";
import {
    LayoutDashboard,
    Coins,
    FolderTree,
    ShoppingBag,
    Megaphone,
    Users,
    Settings,
    ShieldCheck,
    X,
} from "lucide-react";
import { Brand } from "@/components/brand";

type NavItem = {
    to:
        | "/admin"
        | "/admin/prices"
        | "/admin/categories"
        | "/admin/requests"
        | "/admin/announcement"
        | "/admin/users"
        | "/admin/settings"
        | "/admin/roles";
    label: string;
    icon: typeof LayoutDashboard;
    exact?: boolean;
};
const NAV: NavItem[] = [
    { to: "/admin", label: "داشبورد", icon: LayoutDashboard, exact: true },
    { to: "/admin/prices", label: "مدیریت قیمت‌ها", icon: Coins },
    { to: "/admin/categories", label: "مدیریت دسته‌بندی‌ها", icon: FolderTree },
    { to: "/admin/requests", label: "درخواست‌های خرید و فروش", icon: ShoppingBag },
    { to: "/admin/users", label: "مدیریت کاربران", icon: Users },
    { to: "/admin/roles", label: "مدیریت نقش‌ها", icon: ShieldCheck },
    { to: "/admin/announcement", label: "اطلاعیه بازار", icon: Megaphone },
    { to: "/admin/settings", label: "تنظیمات", icon: Settings },
];

export function AdminSidebar({
    mobileOpen,
    onClose,
}: {
    mobileOpen: boolean;
    onClose: () => void;
}) {
    const pathname = useRouterState({ select: (s) => s.location.pathname });

    const content = (
        <div className="flex h-full flex-col gap-2 p-4">
            <div className="flex items-center justify-between px-2 pb-2">
                <Brand to="/admin" />
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
                    aria-label="بستن منو"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="mb-2 rounded-xl bg-gold-soft px-3 py-2 text-xs font-bold text-[color:var(--gold-dark)]">
                پنل مدیریت شهراز‌گلد
            </div>
            <nav className="flex flex-1 flex-col gap-1">
                {NAV.map(({ to, label, icon: Icon, exact }) => {
                    const active = exact
                        ? pathname === to
                        : pathname === to || pathname.startsWith(to + "/");
                    const className =
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors " +
                        (active
                            ? "bg-gold-soft text-[color:var(--gold-dark)] font-bold shadow-elegant"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground");

                    return (
                        <Link key={to} to={to} onClick={onClose} className={className}>
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );

    return (
        <>
            {/* desktop */}
            <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-l border-border bg-card lg:block">
                {content}
            </aside>
            {/* mobile drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
                    <div className="absolute inset-y-0 right-0 w-72 max-w-[85%] border-l border-border bg-card shadow-elegant">
                        {content}
                    </div>
                </div>
            )}
        </>
    );
}
