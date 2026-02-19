/**
 * api.ts — Central API client for SCIS backend (FastAPI)
 * All calls go through here. JWT is injected automatically.
 */

const BASE_URL = (() => {
    const url = import.meta.env.VITE_API_URL;
    if (!url) {
        // This will appear in Vercel function logs and browser console
        console.error(
            "[SCIS] VITE_API_URL is not set!\n" +
            "  → All authentication API calls will fail.\n" +
            "  → Set this in Vercel: Dashboard → Project → Settings → Environment Variables"
        );
    }
    return url || "http://localhost:8003"; // localhost is dev-only
})();

// ─── Token Storage ─────────────────────────────────────────────────────────

export function getToken(): string | null {
    return localStorage.getItem("scis_token");
}

export function setToken(token: string): void {
    localStorage.setItem("scis_token", token);
}

export function removeToken(): void {
    localStorage.removeItem("scis_token");
    localStorage.removeItem("scis_user");
}

export function getStoredUser(): User | null {
    const raw = localStorage.getItem("scis_user");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function setStoredUser(user: User): void {
    localStorage.setItem("scis_user", JSON.stringify(user));
}

// ─── Types ────────────────────────────────────────────────────────────────

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: "citizen" | "admin";
    created_at: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

export interface ComplaintCreate {
    title: string;
    description: string;
    category: string;
    location: string;
    priority: "low" | "medium" | "high";
    image_urls?: string[];
}

export interface ComplaintOut {
    id: string;
    reference_id: string;
    title: string;
    description: string;
    category: string;
    location: string;
    priority: string;
    status: string;
    image_urls: string[];
    user_id: string;
    submitter_name?: string;
    submitter_email?: string;
    created_at: string;
    updated_at: string;
    comments?: Array<{
        id: string;
        content: string;
        author_name?: string;
        created_at: string;
    }>;
}

export interface ComplaintListOut {
    id: string;
    reference_id: string;
    title: string;
    category: string;
    location: string;
    priority: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface DuplicateMatch {
    complaint_id: string;
    reference_id: string;
    title: string;
    category: string;
    location: string;
    status: string;
    created_at: string;
    similarity_score: number;
    reasoning: string;
    factor_scores: {
        text_similarity: number;
        location_match: number;
        category_match: number;
    };
}

export interface AnalysisResult {
    is_duplicate: boolean;
    message: string;
    complaint?: ComplaintOut;
    duplicate_match?: DuplicateMatch;
}

export interface AdminStats {
    total: number;
    resolved: number;
    pending: number;
    in_progress: number;
    duplicates_caught: number;
    avg_resolution_days?: number;
    by_category: Record<string, number>;
    by_priority: Record<string, number>;
}

// ─── Core Fetch Wrapper ────────────────────────────────────────────────────

async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

    if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            errorMsg = body.detail || body.message || errorMsg;
        } catch {
            // ignore parse errors
        }
        throw new Error(errorMsg);
    }

    // Handle 204 No Content
    if (res.status === 204) return undefined as unknown as T;

    return res.json() as Promise<T>;
}

// ─── Auth API ─────────────────────────────────────────────────────────────

export const authApi = {
    register: (data: {
        full_name: string;
        email: string;
        password: string;
    }): Promise<AuthResponse> =>
        apiFetch<AuthResponse>("/auth/register", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    login: (data: {
        email: string;
        password: string;
    }): Promise<AuthResponse> =>
        apiFetch<AuthResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    me: (): Promise<User> => apiFetch<User>("/auth/me"),
};

// ─── Complaints API ───────────────────────────────────────────────────────

export const complaintsApi = {
    submit: (data: ComplaintCreate): Promise<AnalysisResult> =>
        apiFetch<AnalysisResult>("/complaints/submit", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    track: (referenceId: string): Promise<ComplaintOut> =>
        apiFetch<ComplaintOut>(`/complaints/track/${referenceId}`),

    myComplaints: (): Promise<ComplaintListOut[]> =>
        apiFetch<ComplaintListOut[]>("/complaints/my"),

    getComments: (complaintId: string): Promise<any[]> =>
        apiFetch<any[]>(`/complaints/${complaintId}/comments`),
};

// ─── Admin API ────────────────────────────────────────────────────────────

export const adminApi = {
    stats: (): Promise<AdminStats> => apiFetch<AdminStats>("/admin/stats"),

    listComplaints: (params?: {
        status?: string;
        priority?: string;
        category?: string;
        page?: number;
        limit?: number;
    }): Promise<ComplaintListOut[]> => {
        const qs = new URLSearchParams();
        if (params?.status) qs.set("status", params.status);
        if (params?.priority) qs.set("priority", params.priority);
        if (params?.category) qs.set("category", params.category);
        if (params?.page) qs.set("page", String(params.page));
        if (params?.limit) qs.set("limit", String(params.limit));
        const query = qs.toString() ? `?${qs.toString()}` : "";
        return apiFetch<ComplaintListOut[]>(`/admin/complaints${query}`);
    },

    getComplaint: (id: string): Promise<ComplaintOut> =>
        apiFetch<ComplaintOut>(`/admin/complaints/${id}`),

    updateStatus: (
        complaintId: string,
        status: string,
        note?: string
    ): Promise<{ message: string }> =>
        apiFetch<{ message: string }>(
            `/admin/complaints/${complaintId}/status`,
            {
                method: "PATCH",
                body: JSON.stringify({ status, note }),
            }
        ),

    addComment: (
        complaintId: string,
        content: string
    ): Promise<any> =>
        apiFetch<any>(`/admin/complaints/${complaintId}/comments`, {
            method: "POST",
            body: JSON.stringify({ content }),
        }),

    listDuplicates: (page?: number): Promise<any[]> =>
        apiFetch<any[]>(`/admin/duplicates?page=${page ?? 1}`),
};
