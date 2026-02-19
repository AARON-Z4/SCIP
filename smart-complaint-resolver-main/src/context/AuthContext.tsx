/**
 * AuthContext — Global authentication state and helpers.
 * Wrap the app with <AuthProvider> and use useAuth() anywhere.
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import {
    User,
    authApi,
    getToken,
    setToken,
    setStoredUser,
    getStoredUser,
    removeToken,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (full_name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(getStoredUser());
    const [token, setTokenState] = useState<string | null>(getToken());
    const [isLoading, setIsLoading] = useState(!!getToken() && !getStoredUser());

    // On mount: check Supabase session & existing token
    useEffect(() => {
        const initAuth = async () => {
            console.log("[AuthContext] initAuth starting...");
            // 1. Check if we have a Supabase session (e.g. after Google redirect)
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error("[AuthContext] getSession error:", error);
            }

            if (session?.access_token) {
                console.log("[AuthContext] Found Supabase session token. Syncing with backend...");
                setToken(session.access_token);
                setTokenState(session.access_token);
                try {
                    const u = await authApi.me();
                    setUser(u);
                    setStoredUser(u);
                    console.log("[AuthContext] Sync successful. User:", u.email);
                } catch (e) {
                    console.error("[AuthContext] Sync failed during initAuth:", e);
                    // Don't log out immediately, might be a transient network error
                } finally {
                    setIsLoading(false);
                }
                return; // session handled
            }

            // 2. Validate existing token with backend if no new session
            const currentToken = getToken();
            if (currentToken && !getStoredUser()) {
                console.log("[AuthContext] Found existing token but no user. Fetching profile...");
                setIsLoading(true);
                try {
                    const u = await authApi.me();
                    setUser(u);
                    setStoredUser(u);
                } catch (e) {
                    console.error("[AuthContext] Token validation failed:", e);
                    removeToken();
                    setUser(null);
                    setTokenState(null);
                } finally {
                    setIsLoading(false);
                }
            } else {
                console.log("[AuthContext] No session or token found.");
                setIsLoading(false);
            }
        };

        initAuth();

        // 3. Listen for Supabase auth changes (e.g. login/logout in other tabs or redirect)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("[AuthContext] Auth State Change:", event, !!session);

            if (event === 'SIGNED_IN' && session) {
                console.log("[AuthContext] SIGNED_IN event. Syncing...");
                setToken(session.access_token);
                setTokenState(session.access_token);
                try {
                    const u = await authApi.me();
                    setUser(u);
                    setStoredUser(u);
                    console.log("[AuthContext] Auth State Change sync successful.");
                } catch (e) {
                    console.error("[AuthContext] Sync failed during onAuthStateChange:", e);
                }
            } else if (event === 'SIGNED_OUT') {
                console.log("[AuthContext] SIGNED_OUT event.");
                // Call actions directly instead of `logout()` to avoid stale closure
                removeToken();
                setUser(null);
                setTokenState(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        const res = await authApi.login({ email, password });
        setToken(res.access_token);
        setStoredUser(res.user);
        setTokenState(res.access_token);
        setUser(res.user);
    };

    const register = async (full_name: string, email: string, password: string) => {
        const res = await authApi.register({ full_name, email, password });
        setToken(res.access_token);
        setStoredUser(res.user);
        setTokenState(res.access_token);
        setUser(res.user);
    };

    const logout = () => {
        removeToken();
        setUser(null);
        setTokenState(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                isAuthenticated: !!user,
                isAdmin: user?.role === "admin",
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}
