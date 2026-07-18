"use strict";

/* ==========================================================
   FERAS E FLORES — SITE PÚBLICO
   ========================================================== */

const publicClient = window.ferasFloresSupabase;

const publicElements = {
  clock: document.getElementById("clock"),
  soundToggle: document.getElementById("soundToggle"),
  searchForm: document.getElementById("searchForm"),
  searchInput: document.getElementById("searchInput"),
  searchStatus: document.getElementById("searchStatus"),
  postCount: document.getElementById("postCount"),
  posts: document.getElementById("posts"),
  heroTitle: document.getElementById("heroTitle"),
  heroAccent: document.getElementById("heroAccent"),
  footerText: document.getElementById("footerText"),
  modal: document.getElementById("modal"),
  modalType: document.getElementById("modalType"),
  modalTitle: document.getElementById("modalTitle"),
  modalImage: document.getElementById("modalImage"),
  modalContent: document.getElementById("modalContent")
};

let soundEnabled = localStorage.getItem("ff-sound") !== "off";

window.addEventListener("DOMContentLoaded", initializePublicPage);

async function initializePublicPage() {
  configureClock();
  configureSound();
  configureSearch();
  configureModal();

  if (!publicClient) {
    showSearchStatus(
      "O arquivo está desconectado. Verifique config.js.",
      "error"
    );
    return;
  }

  await Promise.allSettled([
    loadPublicSettings(),
    loadPublishedPosts()
  ]);
}

function configureClock() {
  updateClock();
  window.setInterval(updateClock, 1000);
}

function updateClock() {
  if (publicElements.clock) {
    publicElements.clock.textContent =
      new Date().toLocaleTimeString("pt-BR");
  }
}

function configureSound() {
  updateSoundButton();

  publicElements.soundToggle?.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("ff-sound", soundEnabled ? "on" : "off");
    updateSoundButton();
  });
}

function updateSoundButton() {
  if (publicElements.soundToggle) {
    publicElements.soundToggle.textContent =
      `SOM: ${soundEnabled ? "LIGADO" : "DESLIGADO"}`;
  }
}

function configureSearch() {
  publicElements.searchForm?.addEventListener("submit", executeSearch);
}

function configureModal() {
  document.querySelectorAll("[data-close]").forEach((element) => {
    element.addEventListener("click", closeResultModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeResultModal();
    }
  });
}

async function loadPublicSettings() {
  const { data, error } = await publicClient
    .from("blog_settings")
    .select("setting_key, setting_value")
    .eq("is_public", true);

  if (error) {
    console.warn("Não foi possível carregar as configurações públicas.", error);
    return;
  }

  for (const setting of data || []) {
    const value = setting.setting_value || {};

    if (setting.setting_key === "site_identity") {
      if (publicElements.heroTitle?.firstChild) {
        publicElements.heroTitle.firstChild.nodeValue =
          `${value.hero_title || "PROCURE UM NOME."} `;
      }

      if (publicElements.heroAccent) {
        publicElements.heroAccent.textContent = value.hero_accent || "";
      }

      if (publicElements.footerText) {
        publicElements.footerText.textContent = value.footer || "";
      }
    }

    if (
      setting.setting_key === "search" &&
      value.placeholder &&
      publicElements.searchInput
    ) {
      publicElements.searchInput.placeholder = value.placeholder;
    }
  }
}

async function loadPublishedPosts() {
  const { data, count, error } = await publicClient
    .from("blog_posts")
    .select(
      "id, title, excerpt, published_at, author_name",
      { count: "exact" }
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(6);

  if (error) {
    console.warn("Não foi possível carregar os registros.", error);
    return;
  }

  if (publicElements.postCount) {
    publicElements.postCount.textContent = String(count ?? 0);
  }

  if (!data?.length || !publicElements.posts) {
    return;
  }

  publicElements.posts.innerHTML = data
    .map((post, index) => {
      const date = post.published_at
        ? new Date(post.published_at).toLocaleDateString("pt-BR")
        : "";

      return `
        <article>
          <small>${String(index + 1).padStart(3, "0")}</small>
          <h3>${escapeHTML(post.title)}</h3>
          <p>${escapeHTML(post.excerpt || "")}</p>
          <small>${escapeHTML(date)}</small>
        </article>
      `;
    })
    .join("");
}

async function executeSearch(event) {
  event.preventDefault();

  const query = publicElements.searchInput?.value.trim() || "";

  if (!query) {
    showSearchStatus("Digite alguma coisa.", "error");
    return;
  }

  if (!publicClient) {
    showSearchStatus("O arquivo está desconectado.", "error");
    return;
  }

  showSearchStatus("CONSULTANDO...", "loading");

  const state = window.FFProgress.get();
  state.search_count = Number(state.search_count || 0) + 1;
  window.FFProgress.save(state);

  const { data, error } = await publicClient.rpc(
    "resolve_archive_search",
    {
      p_query: query,
      p_player_state: state
    }
  );

  if (error) {
    console.error("Erro na pesquisa:", error);
    showSearchStatus("O arquivo não respondeu.", "error");
    return;
  }

  if (!data?.found) {
    showSearchStatus(
      "Nenhum registro reconheceu essa consulta.",
      "default"
    );
    return;
  }

  const entry = data.entry || {};

  window.FFProgress.addFlags(entry.unlock_flags || []);

  if (data.event) {
    window.FFEffects.runEvent(data.event);
  }

  if (data.chat?.chat_key) {
    window.location.href =
      `chat.html?chat=${encodeURIComponent(data.chat.chat_key)}`;
    return;
  }

  if (data.page?.slug) {
    window.location.href =
      `secret.html?slug=${encodeURIComponent(data.page.slug)}`;
    return;
  }

  if (entry.destination_url) {
    window.location.assign(entry.destination_url);
    return;
  }

  const item = data.character || data.post || data.resource || entry;
  openResult(entry.entry_type, item, entry);

  if (entry.response_audio_url) {
    window.FFEffects.play(entry.response_audio_url);
  }
}

function openResult(type, item = {}, entry = {}) {
  if (!publicElements.modal) {
    return;
  }

  publicElements.modalType.textContent =
    String(type || "REGISTRO").toUpperCase();

  publicElements.modalTitle.textContent =
    item.name ||
    item.title ||
    entry.response_title ||
    "REGISTRO";

  publicElements.modalContent.textContent =
    item.full_content ||
    item.public_description ||
    item.content ||
    item.excerpt ||
    item.description ||
    entry.response_message ||
    "";

  const image =
    item.portrait_url ||
    item.cover_image_url ||
    entry.response_image_url;

  if (image && publicElements.modalImage) {
    publicElements.modalImage.src = image;
    publicElements.modalImage.hidden = false;
  } else if (publicElements.modalImage) {
    publicElements.modalImage.removeAttribute("src");
    publicElements.modalImage.hidden = true;
  }

  publicElements.modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeResultModal() {
  if (!publicElements.modal || publicElements.modal.hidden) {
    return;
  }

  publicElements.modal.hidden = true;
  document.body.style.overflow = "";
}

function showSearchStatus(text, type = "default") {
  if (!publicElements.searchStatus) {
    return;
  }

  publicElements.searchStatus.textContent = text;
  publicElements.searchStatus.dataset.type = type;
  publicElements.searchStatus.hidden = false;
}

function escapeHTML(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}
