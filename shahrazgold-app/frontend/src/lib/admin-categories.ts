import { useEffect, useState } from "react";
import { apiErrorMessage, apiRequest } from "./api";

export interface AdminCategory {
    id: string;
    name: string;
    description: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AdminCategoryInput {
    name: string;
    description?: string;
    active: boolean;
}

export type CategoryMutationResult =
    { ok: true; category: AdminCategory } | { ok: false; field: "name" | "general"; error: string };

interface ApiCategory {
    id: number;
    title: string;
    description?: string | null;
    is_active: boolean;
    created_at: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let categories: AdminCategory[] = [];
let loadingPromise: Promise<AdminCategory[]> | null = null;

function mapCategory(category: ApiCategory): AdminCategory {
    return {
        id: String(category.id),
        name: category.title,
        description: category.description ?? "",
        active: category.is_active,
        createdAt: category.created_at,
        updatedAt: category.created_at,
    };
}

function setCategories(next: AdminCategory[]) {
    categories = next;
    listeners.forEach((listener) => listener());
}

async function refreshCategories(): Promise<AdminCategory[]> {
    if (loadingPromise) return loadingPromise;
    loadingPromise = apiRequest<ApiCategory[]>("admin/categories?per_page=100")
        .then((response) => {
            setCategories(response.data.map(mapCategory));
            return categories;
        })
        .finally(() => {
            loadingPromise = null;
        });
    return loadingPromise;
}

export function useAdminCategories(): AdminCategory[] {
    const [state, setState] = useState(categories);
    useEffect(() => {
        const update = () => setState([...categories]);
        listeners.add(update);
        void refreshCategories().catch(() => setState([...categories]));
        return () => listeners.delete(update);
    }, []);
    return state;
}

export async function createAdminCategory(
    input: AdminCategoryInput,
): Promise<CategoryMutationResult> {
    try {
        const response = await apiRequest<ApiCategory>("admin/categories", {
            method: "POST",
            body: JSON.stringify({
                title: input.name.trim(),
                description: input.description?.trim() || null,
                is_active: input.active,
            }),
        });
        const category = mapCategory(response.data);
        setCategories([category, ...categories]);
        return { ok: true, category };
    } catch (error) {
        return {
            ok: false,
            field: "name",
            error: apiErrorMessage(error, "ایجاد دسته‌بندی ناموفق بود."),
        };
    }
}

export async function updateAdminCategory(
    id: string,
    input: AdminCategoryInput,
): Promise<CategoryMutationResult> {
    try {
        const response = await apiRequest<ApiCategory>(`admin/categories/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                title: input.name.trim(),
                description: input.description?.trim() || null,
                is_active: input.active,
            }),
        });
        const category = mapCategory(response.data);
        setCategories(categories.map((item) => (item.id === id ? category : item)));
        return { ok: true, category };
    } catch (error) {
        return {
            ok: false,
            field: "general",
            error: apiErrorMessage(error, "ویرایش دسته‌بندی ناموفق بود."),
        };
    }
}

export async function setAdminCategoryActive(id: string, active: boolean): Promise<boolean> {
    const category = categories.find((item) => item.id === id);
    if (!category) return false;
    const result = await updateAdminCategory(id, {
        name: category.name,
        description: category.description,
        active,
    });
    return result.ok;
}

export async function deleteAdminCategory(id: string): Promise<boolean> {
    try {
        await apiRequest<null>(`admin/categories/${id}`, { method: "DELETE" });
        setCategories(categories.filter((category) => category.id !== id));
        return true;
    } catch {
        return false;
    }
}
