import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppHeader } from "./app-header";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { useAuthReady, useCurrentUser } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export function AppShell({
    children,
    onRefresh,
    refreshing,
    pageTitle,
}: {
    children: ReactNode;
    onRefresh?: () => void;
    refreshing?: boolean;
    pageTitle?: string;
}) {
    const nav = useNavigate();
    const ready = useAuthReady();
    const user = useCurrentUser();

    useEffect(() => {
        if (ready && !user) nav({ to: "/login", replace: true });
    }, [ready, user, nav]);

    if (!ready || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="mobile-app-shell min-h-screen bg-background md:pb-0">
            <AppHeader onRefresh={onRefresh} refreshing={refreshing} title={pageTitle} />
            <main className="mx-auto max-w-[1440px] px-3.5 py-4 sm:px-6 sm:py-8">{children}</main>
            <MobileBottomNav />
        </div>
    );
}
