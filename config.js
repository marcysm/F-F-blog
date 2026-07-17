"use strict";

/* ==========================================================
   FERAS E FLORES
   CONFIGURAÇÃO DO SUPABASE
   ========================================================== */

const SUPABASE_URL =
  "https://gxwaqoaskyatkxcsmzne.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_zbuaw6ryalNRWrp-qHdChg_G54gG9KG";

/* ==========================================================
   VALIDAÇÃO DA CONFIGURAÇÃO
   ========================================================== */

function validarConfiguracaoSupabase() {
  const url = String(SUPABASE_URL || "").trim();
  const chave = String(SUPABASE_ANON_KEY || "").trim();

  const urlNaoConfigurada =
    !url ||
    url.includes("COLE_AQUI") ||
    url.includes("SUA_URL") ||
    !url.startsWith("https://") ||
    !url.endsWith(".supabase.co");

  const chaveNaoConfigurada =
    !chave ||
    chave.includes("COLE_AQUI") ||
    chave.includes("SUA_CHAVE") ||
    !(
      chave.startsWith("sb_publishable_") ||
      chave.startsWith("eyJ")
    );

  if (urlNaoConfigurada) {
    console.error(
      "A URL do Supabase não foi configurada corretamente."
    );
  }

  if (chaveNaoConfigurada) {
    console.error(
      "A chave pública do Supabase não foi configurada corretamente."
    );
  }

  return !urlNaoConfigurada && !chaveNaoConfigurada;
}

/* ==========================================================
   CRIAÇÃO DO CLIENTE
   ========================================================== */

let ferasFloresSupabase = null;

if (
  validarConfiguracaoSupabase() &&
  window.supabase &&
  typeof window.supabase.createClient === "function"
) {
  ferasFloresSupabase = window.supabase.createClient(
    SUPABASE_URL.trim(),
    SUPABASE_ANON_KEY.trim(),
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  console.log("Cliente Supabase criado corretamente.");
} else if (
  !window.supabase ||
  typeof window.supabase.createClient !== "function"
) {
  console.error(
    "A biblioteca JavaScript do Supabase não foi carregada."
  );
}

/* ==========================================================
   DISPONIBILIZAR PARA OS OUTROS ARQUIVOS
   ========================================================== */

window.ferasFloresSupabase = ferasFloresSupabase;
window.validarConfiguracaoSupabase =
  validarConfiguracaoSupabase;
