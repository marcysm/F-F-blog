"use strict";

/* ==========================================================
   FERAS E FLORES — CONFIGURAÇÃO DO SUPABASE
   ========================================================== */

const SUPABASE_URL = "https://gxwaqoaskyatkxcsmzne.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_zbuaw6ryalNRWrp-qHdChg_G54gG9KG";

const FF_STORAGE_BUCKET = "feras-flores-media";

function validarConfiguracaoSupabase() {
  const url = String(SUPABASE_URL || "").trim();
  const key = String(SUPABASE_ANON_KEY || "").trim();

  const urlValida =
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) &&
    !url.includes("COLE_AQUI");

  const chaveValida =
    /^(sb_publishable_|eyJ)/.test(key) &&
    !key.includes("COLE_AQUI");

  return urlValida && chaveValida;
}

let ferasFloresSupabase = null;

if (
  validarConfiguracaoSupabase() &&
  window.supabase &&
  typeof window.supabase.createClient === "function"
) {
  ferasFloresSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    }
  );
} else {
  console.error(
    "Não foi possível iniciar o Supabase. Verifique config.js e a biblioteca do Supabase."
  );
}

window.ferasFloresSupabase = ferasFloresSupabase;
window.validarConfiguracaoSupabase = validarConfiguracaoSupabase;
window.FF_STORAGE_BUCKET = FF_STORAGE_BUCKET;
