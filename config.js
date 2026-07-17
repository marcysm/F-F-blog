"use strict";

/* ==========================================================
   FERAS E FLORES — CONFIGURAÇÃO
   Chave publishable: pode ficar no navegador.
   Nunca use service_role ou secret key aqui.
   ========================================================== */

const SUPABASE_URL =
  "https://gxwaqoaskyatkxcsmzne.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_zbuaw6ryalNRWrp-qHdChg_G54gG9KG";

function validarConfiguracaoSupabase() {
  const url = String(SUPABASE_URL || "").trim();
  const key = String(SUPABASE_ANON_KEY || "").trim();

  const urlValida =
    url.startsWith("https://") &&
    url.endsWith(".supabase.co") &&
    !url.includes("COLE_AQUI");

  const chaveValida =
    (key.startsWith("sb_publishable_") || key.startsWith("eyJ")) &&
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
        detectSessionInUrl: false,
        flowType: "pkce"
      }
    }
  );
}

window.ferasFloresSupabase = ferasFloresSupabase;
window.validarConfiguracaoSupabase = validarConfiguracaoSupabase;
