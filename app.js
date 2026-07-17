"use strict";

/* ==========================================================
   FERAS E FLORES — SITE PÚBLICO
   ========================================================== */

const publicState = {
  client: window.ferasFloresSupabase,
  soundEnabled: true,
  audio: null,
  searchSettings: {
    empty_message: "Digite alguma coisa para consultar o arquivo.",
    not_found_message: "Nenhum registro reconheceu essa consulta.",
    minimum_characters: 2
  }
};

document.addEventListener("DOMContentLoaded", initializePublicSite);

async function initializePublicSite() {
  configureClock();
  configureSoundToggle();
  configureSearch();
  configureModal();

  if (!publicState.client) {
    showSearchMessage(
      "A conexão com o arquivo não foi iniciada. Verifique config.js.",
      "error"
    );
    return;
  }

  await Promise.allSettled([
    loadPublicSettings(),
    loadRecentPosts()
  ]);
}

function configureClock() {
  updateClock();
  window.setInterval(updateClock, 1000);
}

function updateClock() {
  const element = document.getElementById("archive-clock");

  if (!element) {
    return;
  }

  element.textContent = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}

function configureSoundToggle() {
  const button = document.getElementById("sound-toggle");

  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    publicState.soundEnabled = !publicState.soundEnabled;

    button.textContent = publicState.soundEnabled
      ? "SOM: LIGADO"
      : "SOM: DESLIGADO";

    if (!publicState.soundEnabled && publicState.audio) {
      publicState.audio.pause();
      publicState.audio = null;
    }
  });
}

async function loadPublicSettings() {
  try {
    const { data, error } = await publicState.client
      .from("blog_settings")
      .select("setting_key, setting_value")
      .eq("is_public", true)
      .eq("setting_key", "search")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.setting_value) {
      publicState.searchSettings = {
        ...publicState.searchSettings,
        ...data.setting_value
      };

      const input = document.getElementById("central-search-input");

      if (input && data.setting_value.placeholder) {
        input.placeholder = data.setting_value.placeholder;
      }
    }
  } catch (error) {
    console.warn("Configurações públicas não carregadas:", error);
  }
}

async function loadRecentPosts() {
  const container = document.getElementById("latest-posts");
  const countElement = document.getElementById("archive-count-number");

  try {
    const { data, error, count } = await publicState.client
      .from("blog_posts")
      .select(
        "id, title, excerpt, published_at, author_name",
        { count: "exact" }
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(6);

    if (error) {
      throw error;
    }

    if (countElement) {
      countElement.textContent = String(count ?? data?.length ?? 0);
    }

    if (!container || !data?.length) {
      return;
    }

    container.innerHTML = data.map((post, index) => {
      const number = String(index + 1).padStart(3, "0");

      return `
        <article class="record-card">
          <span class="record-number">${number}</span>

          <div>
            <h3>${escapeHTML(post.title || "SEM TÍTULO")}</h3>

            <p>
              ${escapeHTML(
                post.excerpt ||
                "Um novo registro foi adicionado ao arquivo."
              )}
            </p>

            <small>
              ${formatDate(post.published_at)}
              ${post.author_name
                ? ` // ${escapeHTML(post.author_name)}`
                : ""}
            </small>
          </div>
        </article>
      `;
    }).join("");
  } catch (error) {
    console.error("Falha ao carregar registros:", error);

    if (countElement) {
      countElement.textContent = "!";
    }
  }
}

function configureSearch() {
  const form = document.getElementById("central-search-form");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const input = document.getElementById("central-search-input");
    const term = input?.value?.trim() || "";

    await executeSearch(term);
  });
}

async function executeSearch(originalTerm) {
  const minimum = Number(
    publicState.searchSettings.minimum_characters || 2
  );

  if (!originalTerm) {
    showSearchMessage(
      publicState.searchSettings.empty_message,
      "error"
    );
    return;
  }

  if (originalTerm.length < minimum) {
    showSearchMessage(
      `Digite pelo menos ${minimum} caracteres.`,
      "error"
    );
    return;
  }

  if (!publicState.client) {
    showSearchMessage(
      "O arquivo está desconectado.",
      "error"
    );
    return;
  }

  showSearchMessage("CONSULTANDO O ARQUIVO...", "loading");

  try {
    const { data, error } = await publicState.client
      .from("blog_search_entries")
      .select(`
        id,
        search_term,
        normalized_term,
        aliases,
        entry_type,
        post_id,
        character_id,
        resource_id,
        secret_event_id,
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

    const normalized = normalizeText(originalTerm);
    const result = findResult(data || [], normalized);

    if (!result) {
      showSearchMessage(
        publicState.searchSettings.not_found_message,
        "default"
      );
      return;
    }

    await processSearchResult(result);
  } catch (error) {
    console.error("Erro de pesquisa:", error);

    showSearchMessage(
      "O arquivo não respondeu à consulta.",
      "error"
    );
  }
}

function findResult(entries, normalizedTerm) {
  return entries.find((entry) => {
    const candidates = [
      entry.normalized_term,
      entry.search_term,
      ...(Array.isArray(entry.aliases) ? entry.aliases : [])
    ]
      .filter(Boolean)
      .map(normalizeText);

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

async function processSearchResult(result) {
  showSearchMessage("REGISTRO ENCONTRADO.", "success");

  if (
    ["redirect", "secret_page"].includes(result.entry_type) &&
    result.destination_url
  ) {
    window.location.assign(result.destination_url);
    return;
  }

  let title =
    result.response_title ||
    result.search_term ||
    "REGISTRO ENCONTRADO";

  let content =
    result.response_message ||
    "O arquivo reconheceu a consulta.";

  let image = result.response_image_url || "";

  if (result.entry_type === "character" && result.character_id) {
    const character = await loadCharacter(result.character_id);

    if (character) {
      title = character.name || title;
      content =
        character.full_content ||
        character.public_description ||
        content;
      image = character.portrait_url || image;
    }
  }

  if (result.entry_type === "post" && result.post_id) {
    const post = await loadPost(result.post_id);

    if (post) {
      title = post.title || title;
      content = post.content || post.excerpt || content;
      image = post.cover_image_url || image;
    }
  }

  openResultModal({
    type: getResultTypeLabel(result.entry_type),
    title,
    content,
    image
  });

  if (result.response_audio_url) {
    playAudio(result.response_audio_url);
  }

  if (result.secret_event_id) {
    await runSecretEvent(result.secret_event_id);
  }
}

async function loadCharacter(id) {
  try {
    const { data, error } = await publicState.client
      .from("blog_characters")
      .select(`
        name,
        public_description,
        full_content,
        portrait_url,
        banner_url
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Personagem não carregado:", error);
    return null;
  }
}

async function loadPost(id) {
  try {
    const { data, error } = await publicState.client
      .from("blog_posts")
      .select("title, excerpt, content, cover_image_url")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Postagem não carregada:", error);
    return null;
  }
}

async function runSecretEvent(eventId) {
  try {
    const { data: event, error: eventError } = await publicState.client
      .from("blog_secret_events")
      .select("id, event_key, status, probability")
      .eq("id", eventId)
      .eq("status", "active")
      .maybeSingle();

    if (eventError || !event) {
      return;
    }

    if (Math.random() > Number(event.probability ?? 1)) {
      return;
    }

    const { data: steps, error: stepsError } = await publicState.client
      .from("blog_event_steps")
      .select(`
        action_type,
        duration_ms,
        delay_before_ms,
        text_content,
        media_url,
        target_url,
        intensity,
        settings,
        step_order
      `)
      .eq("event_id", event.id)
      .order("step_order", { ascending: true });

    if (stepsError || !steps?.length) {
      return;
    }

    for (const step of steps) {
      await wait(Number(step.delay_before_ms || 0));
      await runEventStep(step);
    }
  } catch (error) {
    console.error("Evento secreto interrompido:", error);
    clearEffects();
  }
}

async function runEventStep(step) {
  const duration = Number(step.duration_ms || 0);

  switch (step.action_type) {
    case "delay":
      await wait(duration);
      break;

    case "blackout":
      await temporaryClass(
        document.getElementById("blackout-layer"),
        "is-visible",
        duration
      );
      break;

    case "glitch":
      await temporaryClass(document.body, "effect-glitch", duration);
      break;

    case "shake":
      await temporaryClass(document.body, "effect-shake", duration);
      break;

    case "darken_left":
      await temporaryClass(
        document.getElementById("half-dark-layer"),
        "is-left",
        duration
      );
      break;

    case "darken_right":
      await temporaryClass(
        document.getElementById("half-dark-layer"),
        "is-right",
        duration
      );
      break;

    case "show_text":
    case "type_text":
      await showEventText(step.text_content || "", duration);
      break;

    case "play_audio":
      playAudio(step.media_url);
      if (duration > 0) {
        await wait(duration);
      }
      break;

    case "redirect":
      if (step.target_url) {
        window.location.assign(step.target_url);
      }
      break;

    case "clear_effects":
      clearEffects();
      break;

    default:
      if (duration > 0) {
        await wait(duration);
      }
      break;
  }
}

async function temporaryClass(element, className, duration) {
  if (!element) {
    return;
  }

  element.classList.add(className);
  await wait(Math.max(duration, 100));
  element.classList.remove(className);
}

async function showEventText(text, duration) {
  const layer = document.getElementById("event-text-layer");

  if (!layer) {
    return;
  }

  layer.textContent = text;
  layer.hidden = false;

  await wait(Math.max(duration, 1200));

  layer.hidden = true;
  layer.textContent = "";
}

function clearEffects() {
  document.body.classList.remove("effect-glitch", "effect-shake");

  document
    .getElementById("blackout-layer")
    ?.classList.remove("is-visible");

  document
    .getElementById("half-dark-layer")
    ?.classList.remove("is-left", "is-right");

  const textLayer = document.getElementById("event-text-layer");

  if (textLayer) {
    textLayer.hidden = true;
    textLayer.textContent = "";
  }
}

function playAudio(url) {
  if (!url || !publicState.soundEnabled) {
    return;
  }

  if (publicState.audio) {
    publicState.audio.pause();
  }

  const audio = new Audio(url);
  audio.volume = 0.7;

  publicState.audio = audio;

  audio.play().catch((error) => {
    console.warn("Áudio bloqueado pelo navegador:", error);
  });
}

function configureModal() {
  document
    .getElementById("result-modal-close")
    ?.addEventListener("click", closeResultModal);

  document
    .getElementById("result-modal-backdrop")
    ?.addEventListener("click", closeResultModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeResultModal();
    }
  });
}

function openResultModal({ type, title, content, image }) {
  const modal = document.getElementById("result-modal");
  const typeElement = document.getElementById("result-modal-type");
  const titleElement = document.getElementById("result-modal-title");
  const contentElement = document.getElementById("result-modal-content");
  const imageElement = document.getElementById("result-modal-image");

  if (!modal) {
    return;
  }

  typeElement.textContent = type;
  titleElement.textContent = title;
  contentElement.textContent = content;

  if (image) {
    imageElement.src = image;
    imageElement.hidden = false;
  } else {
    imageElement.removeAttribute("src");
    imageElement.hidden = true;
  }

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeResultModal() {
  const modal = document.getElementById("result-modal");

  if (!modal || modal.hidden) {
    return;
  }

  modal.hidden = true;
  document.body.style.overflow = "";
}

function showSearchMessage(message, type = "default") {
  const element = document.getElementById("search-message");

  if (!element) {
    return;
  }

  element.hidden = false;
  element.dataset.type = type;
  element.textContent = message;
}

function getResultTypeLabel(type) {
  const labels = {
    character: "PERSONAGEM",
    post: "REGISTRO",
    resource: "ARQUIVO",
    secret_event: "EVENTO",
    secret_page: "PÁGINA OCULTA",
    message: "MENSAGEM",
    redirect: "REDIRECIONAMENTO"
  };

  return labels[type] || "REGISTRO";
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function escapeHTML(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function formatDate(value) {
  if (!value) {
    return "DATA NÃO INFORMADA";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "DATA NÃO INFORMADA";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, milliseconds));
  });
}
