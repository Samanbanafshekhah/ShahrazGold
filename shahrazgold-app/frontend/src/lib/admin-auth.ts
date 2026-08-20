import { getCurrentUser, login, logout, useAuthReady, useCurrentUser } from "./auth";

export interface AdminLoginResult {
    ok: boolean;
    error?: string;
}

export async function adminLogin(mobile: string, password: string): Promise<AdminLoginResult> {
    const result = await login(mobile, password);
    if (!result.ok) return result;

    const user = getCurrentUser();
    if (user?.role !== "admin") {
        await logout();
        return { ok: false, error: "این حساب دسترسی مدیریت ندارد." };
    }

    return { ok: true };
}

export async function adminLogout() {
    await logout();
}

export function useAdminSession(): { authenticated: boolean; ready: boolean } {
    const user = useCurrentUser();
    const ready = useAuthReady();
    return { authenticated: user?.role === "admin", ready };
}
