import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    Activity,
    RefreshCw,
    ArrowUpRight,
    Megaphone,
} from "lucide-react";
import { AdminPage } from "@/components/admin/admin-page";
import { apiRequest } from "@/lib/api";
import { StatCard } from "@/components/admin/stat-card";
import {
    useAdminRequests,
    useAdminPrices,
    useAdminAnnouncement,
    useAdminOnlineUsers,
    getTodayStats,
    getLastPriceUpdate,
} from "@/lib/admin-data";
import { formatPersianTime, formatRelativeMinutes, toPersianDigits } from "@/lib/formatters";

export const Route = createFileRoute("/admin/")({
    component: DashboardPage,
});

function DashboardPage() {
    const requests = useAdminRequests();
    const prices = useAdminPrices();
    const announcement = useAdminAnnouncement();
    const online = useAdminOnlineUsers();
    const [managerOnline, setManagerOnline] = useState<boolean | null>(null);
    const [savingManagerStatus, setSavingManagerStatus] = useState(false);

    useEffect(() => {
        void apiRequest<{ online: boolean }>("manager-status", { authenticated: false })
            .then((response) => setManagerOnline(Boolean(response.data.online)))
            .catch(() => undefined);
    }, []);

    async function toggleManagerStatus() {
        setSavingManagerStatus(true);
        try {
            const response = await apiRequest<{ online: boolean }>("admin/manager-status", {
                method: "PUT",
                body: JSON.stringify({ online: !managerOnline }),
            });
            setManagerOnline(Boolean(response.data.online));
        } finally {
            setSavingManagerStatus(false);
        }
    }

    const stats = useMemo(() => getTodayStats(), [requests]);
    const lastUpdate = useMemo(() => getLastPriceUpdate(), [prices]);

    return (
        <AdminPage title="داشبورد" subtitle="نمای کلی از وضعیت پلتفرم شهراز‌گلد">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
                <StatCard
                    label="کاربران آنلاین"
                    value={toPersianDigits(online.length)}
                    icon={Users}
                    tone="gold"
                />
                <StatCard
                    label="در انتظار بررسی"
                    value={toPersianDigits(stats.pending)}
                    icon={Clock}
                    tone="warning"
                />
                <StatCard
                    label="تایید شده امروز"
                    value={toPersianDigits(stats.approvedToday)}
                    icon={CheckCircle2}
                    tone="positive"
                />
                <StatCard
                    label="رد شده امروز"
                    value={toPersianDigits(stats.rejectedToday)}
                    icon={XCircle}
                    tone="negative"
                />
                <StatCard
                    label="مجموع درخواست‌های امروز"
                    value={toPersianDigits(stats.totalToday)}
                    icon={Activity}
                    tone="neutral"
                />
                <StatCard
                    label="آخرین بروزرسانی قیمت"
                    value={formatPersianTime(lastUpdate)}
                    hint={formatRelativeMinutes(lastUpdate)}
                    icon={RefreshCw}
                    tone="gold"
                />
            </div>

            <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-elegant sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h2 className="text-sm font-bold">وضعیت مدیر برای مشتریان</h2>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                        با روشن‌کردن این گزینه، مشتریان می‌توانند درخواست خرید و فروش ثبت کنند.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void toggleManagerStatus()}
                    disabled={savingManagerStatus || managerOnline === null}
                    aria-pressed={managerOnline === true}
                    className={
                        "inline-flex min-w-24 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:cursor-wait disabled:opacity-60 " +
                        (managerOnline === true
                            ? "bg-positive text-white"
                            : "bg-muted text-muted-foreground")
                    }
                >
                    {savingManagerStatus
                        ? "در حال ذخیره…"
                        : managerOnline === null
                          ? "در حال دریافت…"
                          : managerOnline
                            ? "روشن"
                            : "خاموش"}
                </button>
            </section>

            <section className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-elegant">
                <div className="flex min-w-0 items-center gap-2">
                    <Megaphone className="h-4 w-4 shrink-0 text-[color:var(--gold-dark)]" />
                    <h2 className="min-w-0 text-sm font-bold">اطلاعیه بازار</h2>
                    <span
                        className={
                            "ms-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold " +
                            (announcement.active
                                ? "bg-positive-soft text-positive"
                                : "bg-muted text-muted-foreground")
                        }
                    >
                        {announcement.active ? "فعال" : "غیرفعال"}
                    </span>
                </div>
                <p className="min-w-0 max-w-full whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                    {announcement.text || "اطلاعیه‌ای ثبت نشده است."}
                </p>
                <Link
                    to="/admin/announcement"
                    className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-[color:var(--gold-dark)] hover:underline"
                >
                    ویرایش اطلاعیه <ArrowUpRight className="h-3 w-3" />
                </Link>
            </section>
        </AdminPage>
    );
}
