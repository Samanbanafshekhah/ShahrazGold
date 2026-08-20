const PRICE_UPDATE_EVENT = "shahrazgold:price-updated";
const PRICE_UPDATE_STORAGE_KEY = "shahrazgold_price_updated_at";
const PRICE_UPDATE_CHANNEL = "shahrazgold-prices";

export function announcePriceUpdate(): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(PRICE_UPDATE_EVENT));

    try {
        window.localStorage.setItem(PRICE_UPDATE_STORAGE_KEY, String(Date.now()));
    } catch {
        // The in-page event and polling still keep prices current when storage is unavailable.
    }

    try {
        if ("BroadcastChannel" in window) {
            const channel = new BroadcastChannel(PRICE_UPDATE_CHANNEL);
            channel.postMessage("updated");
            channel.close();
        }
    } catch {
        // Cross-tab localStorage events remain available as a fallback.
    }
}

export function subscribeToPriceUpdates(listener: () => void): () => void {
    if (typeof window === "undefined") return () => undefined;

    const handleLocalUpdate = () => listener();
    const handleStorageUpdate = (event: StorageEvent) => {
        if (event.key === PRICE_UPDATE_STORAGE_KEY) listener();
    };
    let channel: BroadcastChannel | null = null;
    try {
        channel = "BroadcastChannel" in window ? new BroadcastChannel(PRICE_UPDATE_CHANNEL) : null;
    } catch {
        channel = null;
    }

    window.addEventListener(PRICE_UPDATE_EVENT, handleLocalUpdate);
    window.addEventListener("storage", handleStorageUpdate);
    channel?.addEventListener("message", listener);

    return () => {
        window.removeEventListener(PRICE_UPDATE_EVENT, handleLocalUpdate);
        window.removeEventListener("storage", handleStorageUpdate);
        channel?.removeEventListener("message", listener);
        channel?.close();
    };
}
