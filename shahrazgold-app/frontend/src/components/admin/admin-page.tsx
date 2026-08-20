import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Power } from "lucide-react";
import { AdminHeader } from "./admin-header";
import { useAdminMenu } from "@/routes/admin";
import { apiRequest } from "@/lib/api";

export function AdminPage({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: ReactNode;
}) {
    const { openMenu, openRequests, pendingRequests, requestSignal } = useAdminMenu();
    const [managerOnline, setManagerOnline] = useState<boolean | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    useEffect(() => {
        let active = true;
        const refreshStatus = () => {
            void apiRequest<{ online: boolean }>("manager-status", { authenticated: false })
                .then((response) => {
                    if (active) setManagerOnline(Boolean(response.data.online));
                })
                .catch(() => undefined);
        };
        refreshStatus();
        const timer = window.setInterval(refreshStatus, 30_000);
        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, []);

    async function bringManagerOnline() {
        setUpdatingStatus(true);
        try {
            const response = await apiRequest<{ online: boolean }>("admin/manager-status", {
                method: "PUT",
                body: JSON.stringify({ online: true }),
            });
            setManagerOnline(Boolean(response.data.online));
        } finally {
            setUpdatingStatus(false);
        }
    }
    return (
        <>
            <AdminHeader
                title={title}
                subtitle={subtitle}
                onOpenMenu={openMenu}
                onOpenRequests={openRequests}
                pendingRequests={pendingRequests}
                requestSignal={requestSignal}
            />
            <main className="flex-1 space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-8">
                {managerOnline === false && (
                    <section
                        role="alert"
                        className="flex flex-col gap-3 rounded-2xl border border-negative/30 bg-negative-soft p-4 text-negative shadow-elegant sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                            <div>
                                <h2 className="text-sm font-extrabold">مدیر آفلاین است</h2>
                                <p className="mt-1 text-xs leading-5">
                                    ثبت درخواست خرید و فروش برای مشتریان متوقف شده است.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => void bringManagerOnline()}
                            disabled={updatingStatus}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-negative px-4 py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                        >
                            <Power className="h-4 w-4" />
                            {updatingStatus ? "در حال تغییر وضعیت…" : "فعال کردن مدیر"}
                        </button>
                    </section>
                )}
                {children}
            </main>
        </>
    );
}
