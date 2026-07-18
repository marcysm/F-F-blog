"use strict";
const SUPABASE_URL = "https://gxwaqoaskyatkxcsmzne.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zbuaw6ryalNRWrp-qHdChg_G54gG9KG";
function validarConfiguracaoSupabase() {
  return (
    /^https:\/\/.+\.supabase\.co$/.test(SUPABASE_URL) &&
    /^(sb_publishable_|eyJ)/.test(SUPABASE_ANON_KEY)
  );
}
window.ferasFloresSupabase =
  validarConfiguracaoSupabase() && window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;
window.validarConfiguracaoSupabase = validarConfiguracaoSupabase;
window.FF_STORAGE_BUCKET = "feras-flores-media";
