import { useEffect, useState } from "react";
import { apiErrorMessage, apiRequest, getAccessToken, setAccessToken } from "./api";
import type { User } from "./types";

const AUTH_KEY = "shg_auth_user";

interface ApiUser {
    id: number;
    first_name: string;
    last_name: string;
    mobile: string;
    email?: string | null;
    role: "customer" | "admin";
    is_active: boolean;
    mobile_verified_at?: string | null;
    created_at?: string | null;
}

interface AuthPayload {
    user: ApiUser;
    access_token: string;
    token_type: "Bearer";
}

type Listener = () => void;
const listeners = new Set<Listener>();
let sessionChecked = false;

function emit() {
    listeners.forEach((listener) => listener());
}

function mapUser(user: ApiUser): User {
    return {
        id: String(user.id),
        firstName: user.first_name,
        lastName: user.last_name,
        mobile: user.mobile,
        email: user.email ?? undefined,
        verified: Boolean(user.mobile_verified_at),
        createdAt: user.created_at ?? new Date().toISOString(),
        role: user.role,
        isActive: user.is_active,
    };
}

function readUser(): User | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(AUTH_KEY);
        return raw ? (JSON.parse(raw) as User) : null;
    } catch {
        return null;
    }
}

function writeUser(user: User | null) {
    if (typeof window === "undefined") return;
    if (user) window.localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(AUTH_KEY);
    emit();
}

function storeAuth(payload: AuthPayload) {
    setAccessToken(payload.access_token);
    writeUser(mapUser(payload.user));
}

async function validateSession() {
    if (sessionChecked || !getAccessToken()) return;
    sessionChecked = true;
    try {
        const response = await apiRequest<ApiUser>("auth/me");
        writeUser(mapUser(response.data));
    } catch {
        setAccessToken(null);
        writeUser(null);
    }
}

export function subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getCurrentUser(): User | null {
    return readUser();
}

export function useCurrentUser(): User | null {
    const [user, setUser] = useState<User | null>(() => readUser());
    useEffect(() => {
        const unsubscribe = subscribe(() => setUser(readUser()));
        void validateSession();
        return unsubscribe;
    }, []);
    return user;
}

export function useAuthReady(): boolean {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        void validateSession().finally(() => setReady(true));
    }, []);
    return ready;
}

export interface LoginResult {
    ok: boolean;
    error?: string;
}

export async function login(mobile: string, password: string): Promise<LoginResult> {
    try {
        const response = await apiRequest<AuthPayload>("auth/login", {
            method: "POST",
            authenticated: false,
            body: JSON.stringify({ mobile, password, device_name: "web" }),
        });
        storeAuth(response.data);
        return { ok: true };
    } catch (error) {
        return { ok: false, error: apiErrorMessage(error, "ورود ناموفق بود.") };
    }
}

export interface RegisterInput {
    firstName: string;
    lastName: string;
    mobile: string;
    password: string;
}

export async function startRegistration(input: RegisterInput): Promise<LoginResult> {
    try {
        const response = await apiRequest<AuthPayload>("auth/register", {
            method: "POST",
            authenticated: false,
            body: JSON.stringify({
                first_name: input.firstName,
                last_name: input.lastName,
                mobile: input.mobile,
                password: input.password,
                password_confirmation: input.password,
                device_name: "web",
            }),
        });
        storeAuth(response.data);
        return { ok: true };
    } catch (error) {
        return { ok: false, error: apiErrorMessage(error, "ثبت‌نام ناموفق بود.") };
    }
}

export function getPendingRegistration(): RegisterInput | null {
    return null;
}

export async function verifyOtp(): Promise<LoginResult> {
    return getCurrentUser()
        ? { ok: true }
        : { ok: false, error: "ثبت‌نام را از ابتدا انجام دهید." };
}

export async function logout() {
    try {
        if (getAccessToken()) await apiRequest<null>("auth/logout", { method: "POST" });
    } catch {
        // The local session still needs to be cleared when the server is unavailable.
    } finally {
        setAccessToken(null);
        writeUser(null);
    }
}

export async function updateProfile(patch: Partial<User>): Promise<LoginResult> {
    const current = readUser();
    if (!current) return { ok: false, error: "ابتدا وارد حساب کاربری شوید." };
    try {
        const response = await apiRequest<ApiUser>("auth/profile", {
            method: "PUT",
            body: JSON.stringify({
                first_name: patch.firstName ?? current.firstName,
                last_name: patch.lastName ?? current.lastName,
                mobile: patch.mobile ?? current.mobile,
                email: patch.email ?? current.email ?? null,
            }),
        });
        writeUser(mapUser(response.data));
        return { ok: true };
    } catch (error) {
        return { ok: false, error: apiErrorMessage(error, "به‌روزرسانی پروفایل ناموفق بود.") };
    }
}
