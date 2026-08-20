import { useEffect, useState } from "react";
import { apiRequest } from "./api";

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
        void apiRequest<ApiAnnouncement[]>("announcements/current", { authenticated: false })
            .then((response) => setMessage(response.data[0]?.body ?? null))
            .catch(() => setMessage(null));
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
