const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(/\/$/, "");
const TOKEN_STORAGE_KEY = "shg_access_token";

export interface ApiEnvelope<T> {
    success: boolean;
    message: string;
    data: T;
    meta: Record<string, unknown>;
    errors?: Record<string, string[]> | null;
}

export class ApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly errors?: Record<string, string[]> | null,
        readonly data?: unknown,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export function getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAccessToken(token: string | null) {
    if (typeof window === "undefined") return;
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function apiRequest<T>(
    path: string,
    options: RequestInit & { authenticated?: boolean } = {},
): Promise<ApiEnvelope<T>> {
    const { authenticated = true, headers: customHeaders, ...requestOptions } = options;
    const headers = new Headers(customHeaders);
    headers.set("Accept", "application/json");
    if (requestOptions.body && !(requestOptions.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    const token = authenticated ? getAccessToken() : null;
    if (token) headers.set("Authorization", `Bearer ${token}`);

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}/${path.replace(/^\//, "")}`, {
            ...requestOptions,
            headers,
        });
    } catch {
        throw new ApiError(
            "ارتباط با سرور برقرار نشد. اتصال اینترنت یا تنظیمات سرور را بررسی کنید.",
            0,
        );
    }

    let payload: ApiEnvelope<T>;
    try {
        payload = (await response.json()) as ApiEnvelope<T>;
    } catch {
        throw new ApiError("پاسخ نامعتبر از سرور دریافت شد.", response.status);
    }

    if (!response.ok || !payload.success) {
        if (response.status === 401 && authenticated) setAccessToken(null);
        const validationMessage = payload.errors
            ? Object.values(payload.errors).flat().find(Boolean)
            : undefined;
        throw new ApiError(
            validationMessage ??
                translateApiMessage(payload.message) ??
                "درخواست با خطا روبه‌رو شد.",
            response.status,
            payload.errors,
            payload.data,
        );
    }

    return payload;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
    return error instanceof ApiError ? error.message : fallback;
}

function translateApiMessage(message?: string): string | undefined {
    const messages: Record<string, string> = {
        "Invalid credentials.": "شماره موبایل یا رمز عبور نادرست است.",
        "Unauthenticated.": "نشست شما منقضی شده است؛ دوباره وارد شوید.",
        "Forbidden.": "اجازه انجام این عملیات را ندارید.",
        "Validation failed.": "اطلاعات واردشده معتبر نیست.",
        "Not found.": "اطلاعات موردنظر پیدا نشد.",
        "Too many requests.": "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.",
        MANAGER_OFFLINE: "مدیر آفلاین است؛ در حال حاضر امکان ثبت درخواست خرید یا فروش وجود ندارد.",
    };
    return message ? (messages[message] ?? message) : undefined;
}
