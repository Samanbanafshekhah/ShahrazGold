import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { MarketPriceBoard, PriceUpdateStatus } from "@/components/market-price-board";
import { PurchaseRequestModal } from "@/components/purchase-request-modal";
import { refreshAssets, refreshTransactions, useAssets, useTransactions } from "@/lib/api-data";
import { apiRequest } from "@/lib/api";
import { useCurrentUser } from "@/lib/auth";
import { purchaseProductFromAsset, type TradeAction } from "@/lib/purchase";
import { Info } from "lucide-react";
import { useMarketAnnouncement } from "@/lib/market-api";

export const Route = createFileRoute("/dashboard")({
    component: DashboardPage,
    head: () => ({ meta: [{ title: "قیمت لحظه‌ای طلا و سکه | شهراز‌گلد" }] }),
});

function DashboardPage() {
    const navigate = useNavigate();
    const { items: assets } = useAssets();
    const { items: transactions } = useTransactions();
    const [refreshing, setRefreshing] = useState(false);
    const [managerOnline, setManagerOnline] = useState<boolean | null>(null);
    const [selectedTrade, setSelectedTrade] = useState<{
        assetSymbol: string;
        action: TradeAction;
    } | null>(null);
    const purchaseTriggerRef = useRef<HTMLElement | null>(null);
    const knownRequestStatuses = useRef<Map<string, string> | null>(null);
    const user = useCurrentUser();
    const announcement = useMarketAnnouncement();
    const selectedAsset = selectedTrade
        ? (assets.find((asset) => asset.symbol === selectedTrade.assetSymbol) ?? null)
        : null;
    const latestUpdatedAt = useMemo(
        () =>
            assets.reduce<string | undefined>((latest, asset) => {
                if (!latest || new Date(asset.updatedAt) > new Date(latest)) return asset.updatedAt;
                return latest;
            }, undefined),
        [assets],
    );

    async function onRefresh() {
        setRefreshing(true);
        try {
            await refreshAssets();
        } finally {
            setRefreshing(false);
        }
    }

    useEffect(() => {
        const id = window.setInterval(async () => {
            await refreshAssets();
        }, 45_000);
        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        let active = true;
        const checkManagerStatus = () => {
            void apiRequest<{ online: boolean }>("manager-status", { authenticated: false })
                .then((response) => {
                    if (active) setManagerOnline(Boolean(response.data.online));
                })
                .catch(() => undefined);
        };
        checkManagerStatus();
        const id = window.setInterval(checkManagerStatus, 3_000);
        return () => {
            active = false;
            window.clearInterval(id);
        };
    }, []);

    useEffect(() => {
        if (knownRequestStatuses.current === null) {
            knownRequestStatuses.current = new Map(
                transactions.map((transaction) => [transaction.id, transaction.status]),
            );
            return;
        }

        const previousStatuses = knownRequestStatuses.current;
        const changedRequests = transactions.filter((transaction) => {
            const previousStatus = previousStatuses.get(transaction.id);
            return (
                previousStatus === "pending" &&
                (transaction.status === "approved" || transaction.status === "rejected")
            );
        });

        knownRequestStatuses.current = new Map(
            transactions.map((transaction) => [transaction.id, transaction.status]),
        );

        changedRequests.forEach((transaction) => {
            const approved = transaction.status === "approved";
            const message = approved
                ? `درخواست ${transaction.trackingCode} تأیید شد.`
                : `درخواست ${transaction.trackingCode} رد شد.`;
            const options = {
                description:
                    !approved && transaction.description
                        ? `علت رد: ${transaction.description}`
                        : `${transaction.assetTitle} — برای مشاهده جزئیات کلیک کنید.`,
                duration: 10_000,
                action: {
                    label: "مشاهده",
                    onClick: () =>
                        navigate({
                            to: "/transactions/$id",
                            params: { id: transaction.id },
                        }),
                },
            };

            if (approved) toast.success(message, options);
            else toast.error(message, options);
        });
    }, [navigate, transactions]);

    useEffect(() => {
        const refreshWhenVisible = () => {
            if (document.visibilityState === "visible") {
                void refreshTransactions().catch(() => undefined);
            }
        };

        const timer = window.setInterval(refreshWhenVisible, 10_000);
        window.addEventListener("focus", refreshWhenVisible);
        document.addEventListener("visibilitychange", refreshWhenVisible);

        return () => {
            window.clearInterval(timer);
            window.removeEventListener("focus", refreshWhenVisible);
            document.removeEventListener("visibilitychange", refreshWhenVisible);
        };
    }, []);

    return (
        <AppShell onRefresh={onRefresh} refreshing={refreshing} pageTitle="قیمت لحظه‌ای طلا و سکه">
            <div className="mx-auto max-w-6xl">
                <header className="mb-4 sm:mb-6">
                    <p className="text-[11px] text-muted-foreground sm:text-xs">
                        {user
                            ? `${user.firstName} عزیز، به بازار شهراز‌گلد خوش آمدید`
                            : "بازار شهراز‌گلد"}
                    </p>
                    <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl lg:text-3xl">
                        قیمت لحظه‌ای طلا و سکه
                    </h1>
                </header>

                {announcement && (
                    <aside className="mb-3 flex items-start gap-2.5 rounded-xl border border-[color:var(--gold)]/20 bg-gold-soft/60 px-3 py-3 sm:mb-4 sm:px-4">
                        <Info
                            className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--gold-dark)]"
                            aria-hidden
                        />
                        <div>
                            <h2 className="text-[11px] font-bold sm:text-xs">اطلاعیه بازار</h2>
                            <p className="mt-1 text-[10px] leading-5 text-muted-foreground sm:text-xs sm:leading-6">
                                {announcement}
                            </p>
                        </div>
                    </aside>
                )}

                <PriceUpdateStatus
                    updatedAt={latestUpdatedAt}
                    refreshing={refreshing}
                    managerOnline={managerOnline}
                />

                <div className="mt-5 sm:mt-6">
                    <p className="px-3 text-xs font-bold text-muted-foreground sm:px-0">
                        قیمت‌ها به تومان است
                    </p>
                    <div className="mt-2">
                        <MarketPriceBoard
                            assets={assets}
                            onTrade={(asset, action, trigger) => {
                                purchaseTriggerRef.current = trigger;
                                setSelectedTrade({ assetSymbol: asset.symbol, action });
                            }}
                        />
                    </div>
                </div>
            </div>

            <PurchaseRequestModal
                product={
                    selectedTrade && selectedAsset
                        ? purchaseProductFromAsset(selectedAsset, selectedTrade.action)
                        : null
                }
                action={selectedTrade?.action}
                returnFocusRef={purchaseTriggerRef}
                onClose={() => setSelectedTrade(null)}
                onSuccess={() => setSelectedTrade(null)}
            />
        </AppShell>
    );
}
