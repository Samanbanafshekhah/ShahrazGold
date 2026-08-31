import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { getAccessToken } from "./api";
import { getCurrentUser, subscribe as subscribeToAuth } from "./auth";

export interface PriceUpdatedPayload {
    product_id: number;
    price_id: number;
    price_version: number;
    price_adjustment_version: number | null;
    raw_price_rial: string;
    sell_price_difference_rial: string;
    buy_price_rial: string | null;
    sell_price_rial: string | null;
    effective_at: string;
    updated_at: string;
}

interface PriceSubscriber {
    onUpdate: (payload: PriceUpdatedPayload) => void;
    onReconnect: () => void;
}

interface AnnouncementSubscriber {
    onChange: () => void;
    onReconnect: () => void;
}

type ReverbEcho = Echo<"reverb">;
type PusherStateChange = { previous: string; current: string };

const subscribers = new Set<PriceSubscriber>();
const announcementSubscribers = new Set<AnnouncementSubscriber>();
let echo: ReverbEcho | null = null;
let subscribedChannel: string | null = null;
let activeToken: string | null = null;
let hasConnected = false;
let disconnectTimer: number | null = null;
let unsubscribeAuth: (() => void) | null = null;

function websocketChannel(): string | null {
    const user = getCurrentUser();
    if (!user || user.isActive === false) return null;
    if (user.role === "admin") return "prices.admin";
    return user.roleId ? `prices.role.${user.roleId}` : null;
}

function websocketOptions(token: string) {
    const scheme = (import.meta.env.VITE_REVERB_SCHEME || window.location.protocol.slice(0, -1)) as
        "http" | "https";
    const forceTLS = scheme === "https";
    const port = Number(
        import.meta.env.VITE_REVERB_PORT || window.location.port || (forceTLS ? 443 : 80),
    );

    return {
        broadcaster: "reverb" as const,
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
        wsPort: port,
        wssPort: port,
        forceTLS,
        enabledTransports: ["ws", "wss"] as ("ws" | "wss")[],
        authEndpoint: import.meta.env.VITE_BROADCAST_AUTH_ENDPOINT ?? "/api/broadcasting/auth",
        auth: { headers: { Authorization: `Bearer ${token}` } },
        client: Pusher,
    };
}

function disconnect(): void {
    if (echo && subscribedChannel) echo.leave(subscribedChannel);
    echo?.leave("announcements");
    echo?.disconnect();
    echo = null;
    subscribedChannel = null;
    activeToken = null;
    hasConnected = false;
}

function connect(): void {
    if (typeof window === "undefined") return;
    const token = getAccessToken();
    const channelName = websocketChannel();
    const appKey = import.meta.env.VITE_REVERB_APP_KEY;
    if (!token || (!channelName && announcementSubscribers.size === 0) || !appKey) {
        disconnect();
        return;
    }

    if (echo && activeToken === token && subscribedChannel === channelName) return;
    disconnect();

    activeToken = token;
    subscribedChannel = channelName;
    echo = new Echo(websocketOptions(token));

    echo.connector.pusher.connection.bind("state_change", ({ current }: PusherStateChange) => {
        if (current !== "connected") return;
        if (hasConnected) {
            subscribers.forEach(({ onReconnect }) => onReconnect());
            announcementSubscribers.forEach(({ onReconnect }) => onReconnect());
        }
        hasConnected = true;
    });

    if (channelName) {
        echo.private(channelName)
            .listen(".price.updated", (payload: PriceUpdatedPayload) => {
                subscribers.forEach(({ onUpdate }) => onUpdate(payload));
            })
            .error((error: unknown) => {
                if (import.meta.env.DEV) console.warn("Price channel subscription failed", error);
            });
    }

    echo.private("announcements")
        .listen(".announcement.changed", () => {
            announcementSubscribers.forEach(({ onChange }) => onChange());
        })
        .error((error: unknown) => {
            if (import.meta.env.DEV)
                console.warn("Announcement channel subscription failed", error);
        });
}

function hasSubscribers(): boolean {
    return subscribers.size > 0 || announcementSubscribers.size > 0;
}

function prepareConnection(): void {
    if (disconnectTimer !== null) {
        window.clearTimeout(disconnectTimer);
        disconnectTimer = null;
    }
    unsubscribeAuth ??= subscribeToAuth(connect);
    connect();
}

function disconnectWhenUnused(): void {
    if (hasSubscribers()) return;
    disconnectTimer = window.setTimeout(() => {
        disconnectTimer = null;
        if (hasSubscribers()) return;
        unsubscribeAuth?.();
        unsubscribeAuth = null;
        disconnect();
    }, 0);
}

export function subscribeToPriceUpdates(
    onUpdate: (payload: PriceUpdatedPayload) => void,
    onReconnect: () => void,
): () => void {
    if (typeof window === "undefined") return () => undefined;

    const subscriber = { onUpdate, onReconnect };
    subscribers.add(subscriber);
    prepareConnection();

    return () => {
        subscribers.delete(subscriber);
        disconnectWhenUnused();
    };
}

export function subscribeToAnnouncementUpdates(
    onChange: () => void,
    onReconnect: () => void,
): () => void {
    if (typeof window === "undefined") return () => undefined;

    const subscriber = { onChange, onReconnect };
    announcementSubscribers.add(subscriber);
    prepareConnection();

    return () => {
        announcementSubscribers.delete(subscriber);
        disconnectWhenUnused();
    };
}
