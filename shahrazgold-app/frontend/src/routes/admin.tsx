import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminRequestCenter } from "@/components/admin/admin-request-center";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { useAdminSession } from "@/lib/admin-auth";
import { refreshAdminRequests, useAdminRequests } from "@/lib/admin-data";
import { toPersianDigits } from "@/lib/formatters";

interface AdminOutletContextValue {
    openMenu: () => void;
    openRequests: () => void;
    pendingRequests: number;
    requestSignal: number;
}

export const AdminOutletContext = createContext<AdminOutletContextValue>({
    openMenu: () => {},
    openRequests: () => {},
    pendingRequests: 0,
    requestSignal: 0,
});
export function useAdminMenu() {
    return useContext(AdminOutletContext);
}

export const Route = createFileRoute("/admin")({
    head: () => ({
        meta: [
            { title: "پنل مدیریت | شهراز‌گلد" },
            { name: "description", content: "پنل مدیریت داخلی شهراز‌گلد" },
            { name: "robots", content: "noindex" },
        ],
    }),
    component: AdminLayout,
});

function AdminLayout() {
    const navigate = useNavigate();
    const { authenticated, ready: authReady } = useAdminSession();

    useEffect(() => {
        if (!authReady) return;

        if (!authenticated) {
            navigate({ to: "/admin-login", replace: true });
        }
    }, [authReady, authenticated, navigate]);

    if (!authReady || !authenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2
                    className="h-6 w-6 animate-spin text-[color:var(--gold-dark)]"
                    aria-label="در حال بررسی دسترسی"
                />
            </div>
        );
    }

    return <AuthenticatedAdminLayout />;
}

function AuthenticatedAdminLayout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [requestCenterOpen, setRequestCenterOpen] = useState(false);
    const [requestSignal, setRequestSignal] = useState(0);
    const requests = useAdminRequests();
    const knownRequestIds = useRef<Set<string> | null>(null);
    const polling = useRef(false);

    useEffect(() => {
        let cancelled = false;

        async function checkForNewRequests(initial = false) {
            if (polling.current) return;
            polling.current = true;

            try {
                const nextRequests = await refreshAdminRequests();
                if (cancelled) return;

                if (initial || knownRequestIds.current === null) {
                    knownRequestIds.current = new Set(nextRequests.map((request) => request.id));
                    return;
                }

                const incoming = nextRequests.filter(
                    (request) =>
                        request.status === "pending" && !knownRequestIds.current?.has(request.id),
                );
                knownRequestIds.current = new Set(nextRequests.map((request) => request.id));

                if (incoming.length > 0) {
                    setRequestSignal((signal) => signal + 1);
                    const message =
                        incoming.length === 1
                            ? "درخواست خرید جدید از " + incoming[0].buyerName
                            : toPersianDigits(incoming.length) + " درخواست خرید جدید";
                    toast.success(message, {
                        description:
                            "لیست درخواست‌ها را باز کنید؛ سایر درخواست‌ها نیز زیر هم قابل مشاهده‌اند.",
                        duration: 10_000,
                        action: {
                            label: "مشاهده همه",
                            onClick: () => setRequestCenterOpen(true),
                        },
                    });
                }
            } catch {
                // A temporary polling failure must not interrupt the admin workflow.
            } finally {
                polling.current = false;
            }
        }

        void checkForNewRequests(true);
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") void checkForNewRequests();
        }, 10_000);
        const handleVisibility = () => {
            if (document.visibilityState === "visible") void checkForNewRequests();
        };
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, []);

    const pendingRequests = requests.filter((request) => request.status === "pending").length;

    return (
        <div dir="rtl" className="flex min-h-screen w-full bg-background text-foreground">
            <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
            <div className="flex min-w-0 flex-1 flex-col">
                <AdminOutletContext.Provider
                    value={{
                        openMenu: () => setMobileOpen(true),
                        openRequests: () => setRequestCenterOpen(true),
                        pendingRequests,
                        requestSignal,
                    }}
                >
                    <Outlet />
                    <AdminRequestCenter
                        open={requestCenterOpen}
                        onOpenChange={setRequestCenterOpen}
                        requests={requests}
                    />
                </AdminOutletContext.Provider>
            </div>
        </div>
    );
}
