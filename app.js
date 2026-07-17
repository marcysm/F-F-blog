"use strict";

/* ==========================================================
   FERAS E FLORES
   SITE PÚBLICO
   ========================================================== */

const publicState = {
  client: window.ferasFloresSupabase,
  searchSettings: {
    placeholder: "Pesquise personagens, lugares e histórias...",
    empty_message: "Digite alguma coisa para pesquisar.",
    not_found_message: "Nenhum resultado encontrado.",
    minimum_characters: 2
  }
};

/* ==========================================================
   INICIALIZAÇÃO
   ========================================================== */

document.addEventListener("DOMContentLoaded", iniciarSitePublico);

async function iniciarSitePublico() {
  configurarMenu();
  configurarPesquisa();

  if (!publicState.client) {
    mostrarMensagemPesquisa(
      "O site foi aberto, mas o Supabase ainda não está configurado.",
      "warning"
    );

    return;
  }

  await Promise.all([
    carregarConfiguracoesPublicas(),
    carregarPostagensRecentes()
  ]);
}

/* ==========================================================
   MENU
   ========================================================== */

function configurarMenu() {
  const menuButton = document.getElementById("menu-button");
  const navigation = document.getElementById("main-navigation");

  if (!menuButton || !navigation) {
    return;
  }

  menuButton.addEventListener("click", () => {
    const estaAberto = navigation.classList.toggle("is-open");

    menuButton.setAttribute(
      "aria-expanded",
      String(estaAberto)
    );
  });

  navigation.addEventListener("click", (event) => {
    if (!event.target.closest("a")) {
      return;
    }

    navigation.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
  });
}

/* ==========================================================
   CONFIGURAÇÕES PÚBLICAS
   ========================================================== */

async function carregarConfiguracoesPublicas() {
  try {
    const { data, error } = await publicState.client
      .from("blog_settings")
      .select("setting_key, setting_value")
      .eq("is_public", true)
      .in("setting_key", ["site_identity", "search"]);

    if (error) {
      throw error;
    }

    const settingsMap = Object.fromEntries(
      (data || []).map((item) => [
        item.setting_key,
        item.setting_value
      ])
    );

    aplicarIdentidade(settingsMap.site_identity);
    aplicarConfiguracoesPesquisa(settingsMap.search);
  } catch (error) {
    console.error(
      "Não foi possível carregar as configurações públicas:",
      error
    );
  }
}

function aplicarIdentidade(identity) {
  if (!identity || typeof identity !== "object") {
    return;
  }

  const siteName = document.getElementById("site-name");
  const siteSubtitle = document.getElementById("site-subtitle");

  if (siteName && identity.name) {
    siteName.textContent = identity.name;
  }

  if (siteSubtitle && identity.description) {
    siteSubtitle.textContent = identity.description;
  }

  if (identity.name) {
    document.title = identity.name;
  }
}

function aplicarConfiguracoesPesquisa(settings) {
  if (!settings || typeof settings !== "object") {
    return;
  }

  publicState.searchSettings = {
    ...publicState.searchSettings,
    ...settings
  };

  const input = document.getElementById("central-search-input");

  if (input && settings.placeholder) {
    input.placeholder = settings.placeholder;
  }
}

/* ==========================================================
   POSTAGENS RECENTES
   ========================================================== */

async function carregarPostagensRecentes() {
  const container = document.getElementById("latest-posts");

  if (!container) {
    return;
  }

  try {
    const { data, error } = await publicState.client
      .from("blog_posts")
      .select(`
        id,
        title,
        slug,
        excerpt,
        cover_image_url,
        author_name,
        published_at,
        blog_categories (
          name,
          slug
        )
      `)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return;
    }

    container.innerHTML = data
      .map(criarHTMLPostagem)
      .join("");
  } catch (error) {
    console.error(
      "Não foi possível carregar as postagens:",
      error
    );
  }
}

function criarHTMLPostagem(post) {
  const titulo = escaparHTML(post.title || "Sem título");
  const resumo = escaparHTML(
    post.excerpt || "Leia esta atualização de Feras e Flores."
  );

  const categoria = escaparHTML(
    post.blog_categories?.name || "Atualização"
  );

  const dataFormatada = formatarData(post.published_at);

  return `
    <article class="content-card">
      <span class="feature-number">${categoria}</span>
      <h3>${titulo}</h3>
      <p>${resumo}</p>
      <small>${dataFormatada}</small>
    </article>
  `;
}

/* ==========================================================
   PESQUISA INICIAL
   ========================================================== */

function configurarPesquisa() {
  const form = document.getElementById("central-search-form");

  if (!form) {
    return;
  }

  form.addEventListener("submit", executarPesquisaInicial);
}

async function executarPesquisaInicial(event) {
  event.preventDefault();

  const input = document.getElementById("central-search-input");
  const termoOriginal = input?.value?.trim() || "";

  const quantidadeMinima = Number(
    publicState.searchSettings.minimum_characters || 2
  );

  if (!termoOriginal) {
    mostrarMensagemPesquisa(
      publicState.searchSettings.empty_message,
      "warning"
    );

    input?.focus();
    return;
  }

  if (termoOriginal.length < quantidadeMinima) {
    mostrarMensagemPesquisa(
      `Digite pelo menos ${quantidadeMinima} caracteres.`,
      "warning"
    );

    return;
  }

  if (!publicState.client) {
    mostrarMensagemPesquisa(
      "A pesquisa ainda não conseguiu se conectar ao arquivo.",
      "error"
    );

    return;
  }

  const termoNormalizado = normalizarTexto(termoOriginal);

  mostrarMensagemPesquisa("Consultando o arquivo...", "loading");

  try {
    const { data, error } = await publicState.client
      .from("blog_search_entries")
      .select(`
        id,
        search_term,
        normalized_term,
        aliases,
        entry_type,
        destination_url,
        response_title,
        response_message,
        response_image_url,
        response_audio_url,
        match_mode,
        priority
      `)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (error) {
      throw error;
    }

    const resultado = encontrarResultado(
      data || [],
      termoNormalizado
    );

    if (!resultado) {
      mostrarMensagemPesquisa(
        publicState.searchSettings.not_found_message,
        "not-found"
      );

      return;
    }

    processarResultadoInicial(resultado);
  } catch (error) {
    console.error("Erro durante a pesquisa:", error);

    mostrarMensagemPesquisa(
      "O arquivo não respondeu. Tente novamente.",
      "error"
    );
  }
}

function encontrarResultado(entries, termoNormalizado) {
  return entries.find((entry) => {
    const termosPossiveis = [
      entry.normalized_term,
      entry.search_term,
      ...(Array.isArray(entry.aliases) ? entry.aliases : [])
    ]
      .filter(Boolean)
      .map(normalizarTexto);

    return termosPossiveis.some((candidate) => {
      switch (entry.match_mode) {
        case "contains":
          return termoNormalizado.includes(candidate);

        case "starts_with":
          return termoNormalizado.startsWith(candidate);

        case "approximate":
          return (
            termoNormalizado.includes(candidate) ||
            candidate.includes(termoNormalizado)
          );

        case "exact":
        default:
          return termoNormalizado === candidate;
      }
    });
  });
}

function processarResultadoInicial(resultado) {
  if (
    resultado.entry_type === "redirect" &&
    resultado.destination_url
  ) {
    window.location.href = resultado.destination_url;
    return;
  }

  if (
    resultado.entry_type === "secret_page" &&
    resultado.destination_url
  ) {
    window.location.href = resultado.destination_url;
    return;
  }

  const titulo =
    resultado.response_title ||
    resultado.search_term ||
    "Resultado encontrado";

  const mensagem =
    resultado.response_message ||
    "Existe um registro relacionado a esta pesquisa.";

  mostrarMensagemPesquisa(
    `<strong>${escaparHTML(titulo)}</strong><br>${escaparHTML(mensagem)}`,
    "success",
    true
  );
}

function mostrarMensagemPesquisa(
  mensagem,
  tipo = "default",
  permitirHTML = false
) {
  const container = document.getElementById("search-message");

  if (!container) {
    return;
  }

  container.hidden = false;
  container.dataset.type = tipo;

  if (permitirHTML) {
    container.innerHTML = mensagem;
  } else {
    container.textContent = mensagem;
  }
}

/* ==========================================================
   UTILITÁRIOS
   ========================================================== */

function normalizarTexto(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function escaparHTML(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function formatarData(value) {
  if (!value) {
    return "Data não informada";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data não informada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}
