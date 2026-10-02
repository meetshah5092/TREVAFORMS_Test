/**
 * TrevaForms - Supabase Connection Setup
 * Uses the same public Supabase project credentials as the shared sign-in page.
 */

const SUPABASE_URL = "https://xhmpdhousonsdasolyzc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GnvX1KDInNAm0Ip6OSynJg_PomHcyVp";

let supabaseClient = null;

function getSupabase() {
    if (supabaseClient) return supabaseClient;

    if (window.supabase && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("⚡ Supabase Database connected successfully!");
    }
    return supabaseClient;
}
