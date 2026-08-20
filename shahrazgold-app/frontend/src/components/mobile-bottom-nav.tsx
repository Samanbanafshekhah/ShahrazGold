import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Repeat, User } from "lucide-react";

const ITEMS = [
  { label: "خانه", to: "/dashboard" as const, Icon: Home },
  { label: "معاملات", to: "/transactions" as const, Icon: Repeat },
  { label: "پروفایل", to: "/profile" as const, Icon: User },
];

function isNavActive(pathname: string, to: (typeof ITEMS)[number]["to"]) {
  if (to === "/dashboard") return pathname === to || pathname.startsWith("/prices");
  return pathname === to || pathname.startsWith(to + "/");
}

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="ناوبری اصلی"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] md:hidden"
      style={{
        paddingBottom: "max(0.5rem, calc(env(safe-area-inset-bottom, 0px) - 0.5rem))",
      }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {ITEMS.map(({ label, to, Icon }) => {
          const active = isNavActive(pathname, to);
          return (
            <li key={to}>
              <Link
                to={to}
                className={
                  "flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] transition-colors " +
                  (active ? "text-[color:var(--gold-dark)] font-bold" : "text-neutral-500")
                }
              >
                <Icon className={"h-5 w-5 " + (active ? "text-[color:var(--gold-dark)]" : "")} />
                <span>{label}</span>
                {active && (
                  <span className="h-0.5 w-6 rounded-full bg-[color:var(--gold)]" aria-hidden />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
