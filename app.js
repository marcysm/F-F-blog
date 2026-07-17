"use strict";

/* ==========================================================
   FERAS E FLORES
   PORTAL PÚBLICO
   ========================================================== */

const publicState = {
  client: window.ferasFloresSupabase,

  searchSettings: {
    placeholder: "O que você procura?",
    empty_message: "Você precisa escrever alguma coisa.",
    not_found_message: "Nenhum registro foi encontrado.",
    minimum_characters: 2
  },

  clockInterval: null
};

/* ==========================================================
   INICIALIZAÇÃO
   ========================================================== */

document.addEventListener("DOMContentLoaded", iniciarPortal);

async function iniciarPortal() {
  configurarMenuMobile();
  configurarPesquisa();
  configurarAtalhosDePersonagens();
  configurarEnquete();
  configurarBotoesTemporarios();
  iniciarRelogioDoJardim();

  if (!publicState.client) {
    mostrarMensagemPesquisa(
      "O portal está aberto, mas a conexão com o arquivo ainda não foi configurada.",
      "error"
    );

    console.error(
      "Supabase indisponível. Confira a URL e a chave pública no config.js."
    );

    return;
  }

  await Promise.allSettled([
    carregarConfiguracoesPublicas(),
    carregarPostagensRecentes()
  ]);
}

/* ==========================================================
   MENU MOBILE
   ========================================================== */

function configurarMenuMobile() {
  const button = document.getElementById(
    "mobile-menu-button"
  );

  const menu = document.getElementById("main-menu");

  if (!button || !menu) {
    return;
  }

  button.addEventListener("click", () => {
    const aberto = menu.classList.toggle("is-open");

    button.setAttribute(
      "aria-expanded",
      String(aberto)
    );

    button.textContent = aberto ? "×" : "☰";
  });

  menu.addEventListener("click", (event) => {
    if (!event.target.closest("a")) {
      return;
    }

    menu.classList.remove("is-open");

    button.setAttribute(
      "aria-expanded",
      "false"
    );

    button.textContent = "☰";
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      menu.classList.remove("is-open");

      button.setAttribute(
        "aria-expanded",
        "false"
      );

      button.textContent = "☰";
    }
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
      .in("setting_key", [
        "site_identity",
        "search"
      ]);

    if (error) {
      throw error;
    }

    const settings = Object.fromEntries(
      (data || []).map((item) => [
        item.setting_key,
        item.setting_value
      ])
    );

    aplicarIdentidade(settings.site_identity);
    aplicarConfiguracoesPesquisa(settings.search);
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

  const nameElement =
    document.getElementById("site-name");

  if (nameElement && identity.name) {
    nameElement.textContent = identity.name;
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

  const input =
    document.getElementById("central-search-input");

  if (input && settings.placeholder) {
    input.placeholder = settings.placeholder;
  }
}

/* ==========================================================
   POSTAGENS
   ========================================================== */

async function carregarPostagensRecentes() {
  const container =
    document.getElementById("latest-posts");

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
      .order("published_at", {
        ascending: false
      })
      .limit(4);

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
  const title = escaparHTML(
    post.title || "Sem título"
  );

  const excerpt = escaparHTML(
    post.excerpt ||
    "Uma nova atualização foi encontrada no Jardim."
  );

  const category = escaparHTML(
    post.blog_categories?.name ||
    "Atualização"
  );

  const author = escaparHTML(
    post.author_name ||
    "Equipe Feras e Flores"
  );

  const date = formatarData(post.published_at);

  const image = post.cover_image_url
    ? `
      <img
        src="${escaparAtributo(post.cover_image_url)}"
        alt=""
        loading="lazy"
      >
    `
    : `<span>✿</span>`;

  return `
    <article class="news-item">
      <div class="news-thumbnail">
        ${image}
      </div>

      <div class="news-copy">
        <span class="news-category">
          ${category}
        </span>

        <h3>${title}</h3>

        <p>${excerpt}</p>

        <div class="news-meta">
          <span>${date}</span>
          <span>por ${author}</span>
        </div>
      </div>
    </article>
  `;
}

/* ==========================================================
   PESQUISA
   ========================================================== */

function configurarPesquisa() {
  const form =
    document.getElementById("central-search-form");

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    executarPesquisa
  );
}

async function executarPesquisa(event) {
  event.preventDefault();

  const input =
    document.getElementById("central-search-input");

  const originalTerm =
    input?.value?.trim() || "";

  await pesquisarTermo(originalTerm);
}

async function pesquisarTermo(originalTerm) {
  const input =
    document.getElementById("central-search-input");

  const minimum = Number(
    publicState.searchSettings.minimum_characters || 2
  );

  if (!originalTerm) {
    mostrarMensagemPesquisa(
      publicState.searchSettings.empty_message,
      "error"
    );

    input?.focus();
    return;
  }

  if (originalTerm.length < minimum) {
    mostrarMensagemPesquisa(
      `Digite pelo menos ${minimum} caracteres.`,
      "error"
    );

    return;
  }

  if (!publicState.client) {
    mostrarMensagemPesquisa(
      "O arquivo do Jardim ainda não está conectado.",
      "error"
    );

    return;
  }

  const normalizedTerm =
    normalizarTexto(originalTerm);

  mostrarMensagemPesquisa(
    "Procurando nos registros...",
    "loading"
  );

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
        priority,
        secret_event_id,
        character_id,
        post_id,
        resource_id
      `)
      .eq("is_active", true)
      .order("priority", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    const result = encontrarResultado(
      data || [],
      normalizedTerm
    );

    if (!result) {
      mostrarMensagemPesquisa(
        publicState.searchSettings.not_found_message,
        "default"
      );

      return;
    }

    await processarResultado(result);
  } catch (error) {
    console.error(
      "Erro durante a pesquisa:",
      error
    );

    mostrarMensagemPesquisa(
      "O arquivo não respondeu. Tente novamente.",
      "error"
    );
  }
}

function encontrarResultado(
  entries,
  normalizedTerm
) {
  return entries.find((entry) => {
    const candidates = [
      entry.normalized_term,
      entry.search_term,
      ...(
        Array.isArray(entry.aliases)
          ? entry.aliases
          : []
      )
    ]
      .filter(Boolean)
      .map(normalizarTexto);

    return candidates.some((candidate) => {
      switch (entry.match_mode) {
        case "contains":
          return normalizedTerm.includes(candidate);

        case "starts_with":
          return normalizedTerm.startsWith(candidate);

        case "approximate":
          return (
            normalizedTerm.includes(candidate) ||
            candidate.includes(normalizedTerm)
          );

        case "exact":
        default:
          return normalizedTerm === candidate;
      }
    });
  });
}

async function processarResultado(result) {
  if (
    result.entry_type === "redirect" &&
    result.destination_url
  ) {
    window.location.href = result.destination_url;
    return;
  }

  if (
    result.entry_type === "secret_page" &&
    result.destination_url
  ) {
    window.location.href = result.destination_url;
    return;
  }

  const title =
    result.response_title ||
    result.search_term ||
    "Registro encontrado";

  const message =
    result.response_message ||
    "Existe um registro relacionado a esta pesquisa.";

  const imageHTML = result.response_image_url
    ? `
      <img
        src="${escaparAtributo(result.response_image_url)}"
        alt=""
        style="
          width: 100%;
          max-height: 180px;
          margin-top: 9px;
          object-fit: cover;
          border: 2px solid white;
          border-radius: 7px;
        "
      >
    `
    : "";

  mostrarMensagemPesquisa(
    `
      <strong>${escaparHTML(title)}</strong>
      <br>
      ${escaparHTML(message)}
      ${imageHTML}
    `,
    "success",
    true
  );

  if (result.response_audio_url) {
    reproduzirAudioResultado(
      result.response_audio_url
    );
  }

  /*
    O motor completo de eventos será ligado em outra etapa.
    Por enquanto, esta verificação já deixa o local preparado.
  */

  if (result.secret_event_id) {
    console.info(
      "Esta pesquisa possui um evento secreto associado:",
      result.secret_event_id
    );
  }
}

function mostrarMensagemPesquisa(
  message,
  type = "default",
  allowHTML = false
) {
  const container =
    document.getElementById("search-message");

  if (!container) {
    return;
  }

  container.hidden = false;
  container.dataset.type = type;

  if (allowHTML) {
    container.innerHTML = message;
  } else {
    container.textContent = message;
  }
}

function reproduzirAudioResultado(url) {
  if (!url) {
    return;
  }

  try {
    const audio = new Audio(url);

    audio.volume = 0.65;

    audio.play().catch((error) => {
      console.warn(
        "O navegador bloqueou a reprodução automática:",
        error
      );
    });
  } catch (error) {
    console.error(
      "Não foi possível preparar o áudio:",
      error
    );
  }
}

/* ==========================================================
   ATALHOS DE PERSONAGENS
   ========================================================== */

function configurarAtalhosDePersonagens() {
  const buttons = document.querySelectorAll(
    "[data-character-search]"
  );

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const term =
        button.dataset.characterSearch?.trim();

      if (!term) {
        return;
      }

      const input =
        document.getElementById(
          "central-search-input"
        );

      if (input) {
        input.value = term;
      }

      document
        .getElementById("pesquisa")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

      window.setTimeout(() => {
        pesquisarTermo(term);
      }, 450);
    });
  });
}

/* ==========================================================
   ENQUETE LOCAL
   ========================================================== */

function configurarEnquete() {
  const form =
    document.getElementById("garden-poll-form");

  if (!form) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const selected = form.querySelector(
      'input[name="garden-poll"]:checked'
    );

    const message =
      document.getElementById("poll-message");

    if (!message) {
      return;
    }

    if (!selected) {
      message.hidden = false;
      message.textContent =
        "Escolha uma opção antes de votar.";

      return;
    }

    localStorage.setItem(
      "feras-flores-poll",
      selected.value
    );

    message.hidden = false;
    message.textContent =
      "Seu voto foi guardado no Jardim!";
  });
}

/* ==========================================================
   RELÓGIO FICTÍCIO
   ========================================================== */

function iniciarRelogioDoJardim() {
  atualizarRelogioDoJardim();

  publicState.clockInterval = window.setInterval(
    atualizarRelogioDoJardim,
    1000
  );
}

function atualizarRelogioDoJardim() {
  const timeElement =
    document.getElementById("garden-clock-time");

  const periodElement =
    document.getElementById("garden-clock-period");

  const weatherElement =
    document.getElementById("garden-weather-text");

  if (!timeElement || !periodElement) {
    return;
  }

  const now = new Date();

  timeElement.textContent =
    new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(now);

  const hour = now.getHours();

  if (hour >= 5 && hour < 12) {
    periodElement.textContent =
      "Manhã no Jardim";

    if (weatherElement) {
      weatherElement.textContent =
        "Orvalho brilhante";
    }

    return;
  }

  if (hour >= 12 && hour < 18) {
    periodElement.textContent =
      "Tarde no Jardim";

    if (weatherElement) {
      weatherElement.textContent =
        "Flores abertas";
    }

    return;
  }

  if (hour >= 18 && hour < 23) {
    periodElement.textContent =
      "Noite no Jardim";

    if (weatherElement) {
      weatherElement.textContent =
        "Névoa rosada";
    }

    return;
  }

  periodElement.textContent =
    "Horário silencioso";

  if (weatherElement) {
    weatherElement.textContent =
      "Algo está acordado";
  }
}

/* ==========================================================
   BOTÕES AINDA NÃO LIGADOS
   ========================================================== */

function configurarBotoesTemporarios() {
  const temporaryButtons = document.querySelectorAll(
    ".resource-links button, .help-box button, #show-all-posts-button"
  );

  temporaryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      window.alert(
        "Este recurso será liberado em uma próxima atualização do Jardim."
      );
    });
  });
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

function escaparAtributo(value) {
  return escaparHTML(value)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
