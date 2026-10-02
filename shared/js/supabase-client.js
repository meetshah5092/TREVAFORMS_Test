/**
 * TrevaForms — Shared Supabase Client
 * ─────────────────────────────────────
 * Used by BOTH the teacher app and the student portal.
 *
 * HOW TO CONFIGURE:
 *   1. Go to supabase.com → Your Project → Project Settings → API
 *   2. Copy "Project URL" and "anon / public" key
 *   3. Paste them below
 *
 * SECURITY:
 *   - Only the anon key is used here (safe for frontend)
 *   - NEVER paste the service_role key in frontend code
 *   - Row Level Security (RLS) in Supabase enforces all data access rules
 */

const SUPABASE_URL      = "https://xhmpdhousonsdasolyzc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GnvX1KDInNAm0Ip6OSynJg_PomHcyVp";

// ─── Singleton client ────────────────────────────────────────────────────────

let _supabaseClient = null;

/**
 * Returns the shared Supabase client instance.
 * Safe to call multiple times — only one client is created.
 * Returns null if credentials are not yet configured.
 */
function getSupabaseClient() {
    if (_supabaseClient) return _supabaseClient;

    if (!window.supabase) {
        console.warn("[TrevaForms] Supabase JS SDK not loaded.");
        return null;
    }

    if (
        SUPABASE_URL === "YOUR_SUPABASE_PROJECT_URL" ||
        SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY"
    ) {
        console.warn(
            "[TrevaForms] Supabase credentials not configured.\n" +
            "Edit shared/js/supabase-client.js and paste your Project URL and anon key."
        );
        return null;
    }

    try {
        _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        });
        console.log("[TrevaForms] ✅ Supabase connected.");
    } catch (err) {
        console.error("[TrevaForms] Failed to create Supabase client:", err);
        return null;
    }

    return _supabaseClient;
}

/**
 * Returns the current authenticated Supabase user, or null.
 */
async function getAuthUser() {
    const sb = getSupabaseClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    return user || null;
}

/**
 * Returns the current Supabase session, or null.
 */
async function getAuthSession() {
    const sb = getSupabaseClient();
    if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session || null;
}

// ─── Expose for module-less scripts ──────────────────────────────────────────
window.TrevaSupabase = {
    getClient: getSupabaseClient,
    getAuthUser,
    getAuthSession
};
