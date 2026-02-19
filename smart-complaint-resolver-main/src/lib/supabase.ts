import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// createClient throws if called with empty strings, so we guard against it.
// When env vars are missing, Google Auth buttons will be visible but non-functional
// until the user sets VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in their .env file.
let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.warn(
        "[SCIS] Supabase env vars not set. Google Auth disabled.\n" +
        "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file."
    );
    // Create a minimal stub so imports don't crash the app
    supabase = {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signInWithOAuth: async () => ({ data: null, error: new Error("Supabase not configured") }),
        },
    } as unknown as SupabaseClient;
}

export { supabase };

