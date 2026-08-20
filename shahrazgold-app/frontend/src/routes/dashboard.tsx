import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MarketPriceBoard, PriceUpdateStatus } from "@/components/market-price-board";
import { PurchaseRequestModal } from "@/components/purchase-request-modal";
import { refreshAssets, useAssets } from "@/lib/api-data";
import { apiRequest } from "@/lib/api";
import type { GoldAsset } from "@/lib/types";
import { useCurrentUser } from "@/lib/auth";
import { purchaseProductFromAsset, type TradeAction } from "@/lib/purchase";
import { Info } from "lucide-react";
import { useMarketAnnouncement } from "@/lib/market-api";

export const Route = createFileRoute("/dashboard")({
    component: DashboardPage,
    head: () => ({ meta: [{ title: "قیمت لحظه‌ای طلا و سکه | شهراز‌گلد" }] }),
});

function DashboardPage() {
    const { items: assets } = useAssets();
    const [refreshing, setRefreshing] = useState(false);
    const [managerOnline, setManagerOnline] = useState<boolean | null>(null);
    const [selectedTrade, setSelectedTrade] = useState<{
        asset: GoldAsset;
        action: TradeAction;
    } | null>(null);
    const purchaseTriggerRef = useRef<HTMLElement | null>(null);
    const user = useCurrentUser();
    const announcement = useMarketAnnouncement();
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
                    <MarketPriceBoard
                        assets={assets}
                        onTrade={(asset, action, trigger) => {
                            purchaseTriggerRef.current = trigger;
                            setSelectedTrade({ asset, action });
                        }}
                    />
                </div>
            </div>

            <PurchaseRequestModal
                product={
                    selectedTrade
                        ? purchaseProductFromAsset(selectedTrade.asset, selectedTrade.action)
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
