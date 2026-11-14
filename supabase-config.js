const SUPABASE_URL = "https://rrdawxemozylpxrkwqgr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_B44ozvhf_9phRyftCGFTxg_ODWUy0hU";
let goodLuckSupabaseClient = null;

const createGoodLuckSupabaseClient = () => {
  if (!window.supabase) {
    throw new Error("Supabase browser client has not loaded.");
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Add your Supabase URL and anon key in supabase-config.js.");
  }

  if (!goodLuckSupabaseClient) {
    goodLuckSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return goodLuckSupabaseClient;
};
