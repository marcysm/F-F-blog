"use strict";

/* ==========================================================
   FERAS E FLORES
   CONFIGURAÇÃO DO SUPABASE
   ========================================================== */

/*
  IMPORTANTE:

  1. Coloque aqui a URL do seu projeto Supabase.
  2. Coloque aqui a chave pública "anon" ou "publishable".
  3. Nunca coloque a service_role ou uma secret key neste arquivo.
*/

const SUPABASE_URL = "https://gxwaqoaskyatkxcsmzne.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_zbuaw6ryalNRWrp-qHdChg_G54gG9KG";

/* ==========================================================
   VALIDAÇÃO DA CONFIGURAÇÃO
   ========================================================== */

function validarConfiguracaoSupabase() {
  const urlNaoConfigurada =
    !SUPABASE_URL ||
    SUPABASE_URL.includes("https://gxwaqoaskyatkxcsmzne.supabase.co") ||
    !SUPABASE_URL.startsWith("https://");

  const chaveNaoConfigurada =
    !SUPABASE_ANON_KEY ||
    SUPABASE_ANON_KEY.includes("COLE_AQUI");

  if (urlNaoConfigurada || chaveNaoConfigurada) {
    console.error(
      "O Supabase ainda não foi configurado no arquivo config.js."
    );

    return false;
  }

  return true;
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
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
}

/*
  Deixamos o cliente disponível para os demais arquivos.
*/

window.ferasFloresSupabase = ferasFloresSupabase;
window.validarConfiguracaoSupabase = validarConfiguracaoSupabase;
