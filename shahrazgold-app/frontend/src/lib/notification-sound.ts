const NOTIFICATION_SOUND_URL = "/audio/notification.mp3";

let notificationAudio: HTMLAudioElement | null = null;

function getNotificationAudio(): HTMLAudioElement {
    notificationAudio ??= new Audio(NOTIFICATION_SOUND_URL);
    notificationAudio.preload = "auto";

    return notificationAudio;
}

export function prepareNotificationSound(): () => void {
    if (typeof window === "undefined" || typeof Audio === "undefined") return () => undefined;

    const unlock = () => {
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);

        const audio = getNotificationAudio();
        audio.muted = true;
        void audio
            .play()
            .then(() => {
                audio.pause();
                audio.currentTime = 0;
            })
            .catch(() => undefined)
            .finally(() => {
                audio.muted = false;
            });
    };

    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
    };
}

export function playNotificationSound(): void {
    if (typeof window === "undefined" || typeof Audio === "undefined") return;

    const audio = getNotificationAudio();
    audio.muted = false;
    audio.currentTime = 0;

    void audio.play().catch(() => {
        // Browsers may block audio until the user has interacted with the page.
    });
}
