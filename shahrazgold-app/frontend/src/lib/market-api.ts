import { useEffect, useState } from "react";
import { apiRequest } from "./api";
import { subscribeToAnnouncementUpdates } from "./price-sync";

interface ApiAnnouncement {
    id: number;
    title?: string | null;
    body: string;
    starts_at?: string | null;
    ends_at?: string | null;
    published_at?: string | null;
}

export function useMarketAnnouncement(): string | null {
    const [message, setMessage] = useState<string | null>(null);
    useEffect(() => {
        let active = true;
        let requestVersion = 0;
        const refresh = () => {
            const version = ++requestVersion;
            void apiRequest<ApiAnnouncement[]>("announcements/current", {
                authenticated: false,
                cache: "no-store",
            })
                .then((response) => {
                    if (active && version === requestVersion) {
                        setMessage(response.data[0]?.body ?? null);
                    }
                })
                .catch(() => {
                    if (active && version === requestVersion) setMessage(null);
                });
        };

        refresh();
        const unsubscribe = subscribeToAnnouncementUpdates(refresh, refresh);
        const refreshWhenVisible = () => {
            if (document.visibilityState === "visible") refresh();
        };
        const pollTimer = import.meta.env.VITE_REVERB_APP_KEY
            ? null
            : window.setInterval(refreshWhenVisible, 3_000);
        window.addEventListener("focus", refreshWhenVisible);
        window.addEventListener("online", refreshWhenVisible);
        document.addEventListener("visibilitychange", refreshWhenVisible);

        return () => {
            active = false;
            unsubscribe();
            if (pollTimer !== null) window.clearInterval(pollTimer);
            window.removeEventListener("focus", refreshWhenVisible);
            window.removeEventListener("online", refreshWhenVisible);
            document.removeEventListener("visibilitychange", refreshWhenVisible);
        };
    }, []);
    return message;
}

export function startPresenceHeartbeat(): () => void {
    let active = true;
    const heartbeat = () => {
        if (!active || document.visibilityState === "hidden") return;
        void apiRequest("presence/heartbeat", { method: "POST" }).catch(() => undefined);
    };
    heartbeat();
    const timer = window.setInterval(heartbeat, 30_000);
    const onVisibility = () => heartbeat();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
        active = false;
        window.clearInterval(timer);
        document.removeEventListener("visibilitychange", onVisibility);
    };
}
