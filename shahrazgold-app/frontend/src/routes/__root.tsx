import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    Outlet,
    Link,
    createRootRouteWithContext,
    useRouter,
    HeadContent,
    Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { useAuthReady, useCurrentUser } from "@/lib/auth";
import { startPresenceHeartbeat } from "@/lib/market-api";

function NotFoundComponent() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="max-w-md text-center">
                <h1 className="text-7xl font-bold text-foreground">404</h1>
                <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <div className="mt-6">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
    console.error(error);
    const router = useRouter();
    useEffect(() => {
        reportLovableError(error, { boundary: "tanstack_root_error_component" });
    }, [error]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="max-w-md text-center">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    This page didn't load
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Something went wrong on our end. You can try refreshing or head back home.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <button
                        onClick={() => {
                            router.invalidate();
                            reset();
                        }}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        Try again
                    </button>
                    <a
                        href="/"
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                    >
                        Go home
                    </a>
                </div>
            </div>
        </div>
    );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    head: () => ({
        meta: [
            { charSet: "utf-8" },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1, viewport-fit=cover",
            },
            { title: "شهراز‌گلد | مرجع شفاف قیمت طلا و سکه" },
            {
                name: "description",
                content:
                    "شهراز‌گلد پلتفرمی حرفه‌ای برای مشاهده لحظه‌ای قیمت طلا و سکه، مدیریت حساب و پیگیری تراکنش‌ها.",
            },
            { name: "author", content: "ShahrayGold" },
            { property: "og:title", content: "شهراز‌گلد | مرجع شفاف قیمت طلا و سکه" },
            {
                property: "og:description",
                content:
                    "مشاهده قیمت طلا و سکه، سابقه تراکنش‌ها و مدیریت حساب کاربری در بستری امن.",
            },
            { property: "og:type", content: "website" },
            { property: "og:image", content: "/ShahrazGoldLogo2.png" },
            { property: "og:image:alt", content: "لوگوی شهراز‌گلد" },
            { name: "twitter:card", content: "summary_large_image" },
            { name: "twitter:image", content: "/ShahrazGoldLogo2.png" },
            {
                "script:ld+json": {
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    name: "شهراز‌گلد",
                    url: "/",
                    logo: "/ShahrazGoldLogo2.png",
                },
            },
        ],
        links: [
            {
                rel: "stylesheet",
                href: appCss,
            },
            { rel: "icon", href: "/ShahrazGoldLogo2.png", type: "image/png" },
            { rel: "image_src", href: "/ShahrazGoldLogo2.png" },
            { rel: "apple-touch-icon", href: "/ShahrazGoldLogo2.png" },
            { rel: "preconnect", href: "https://fonts.googleapis.com" },
            { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
            {
                rel: "stylesheet",
                href: "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap",
            },
        ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
    return (
        <html lang="fa" dir="rtl">
            <head>
                <HeadContent />
            </head>
            <body>
                {children}
                <Scripts />
            </body>
        </html>
    );
}

function PresenceTracker() {
    const ready = useAuthReady();
    const user = useCurrentUser();

    useEffect(() => {
        if (!ready || !user) return;
        return startPresenceHeartbeat();
    }, [ready, user]);

    return null;
}

function RootComponent() {
    const { queryClient } = Route.useRouteContext();

    return (
        <QueryClientProvider client={queryClient}>
            <PresenceTracker />
            <Outlet />
            <Toaster position="top-center" richColors closeButton />
        </QueryClientProvider>
    );
}
