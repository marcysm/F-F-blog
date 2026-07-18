"use strict";

/* ==========================================================
   FERAS E FLORES — PÁGINA PÚBLICA
   ========================================================== */

const client = window.ferasFloresSupabase;

let sound =
  window.FFAudio?.isEnabled() ?? true;

const elements = {};

document.addEventListener(
  "DOMContentLoaded",
  initializePublicPage
);

async function initializePublicPage() {
  mapElements();
  configureClock();
  configureSoundButton();
  configureSearch();
  configureModal();

  if (!client) {
    showSearchStatus(
      "O arquivo está desconectado."
    );
    return;
  }

  await Promise.allSettled([
    loadSettings(),
    loadPosts(),
    initializeAmbientSound()
  ]);
}

function mapElements() {
  elements.clock =
    document.getElementById("clock");

  elements.soundToggle =
    document.getElementById("soundToggle");

  elements.searchForm =
    document.getElementById("searchForm");

  elements.searchInput =
    document.getElementById("searchInput");

  elements.searchStatus =
    document.getElementById("searchStatus");

  elements.postCount =
    document.getElementById("postCount");

  elements.posts =
    document.getElementById("posts");

  elements.heroTitle =
    document.getElementById("heroTitle");

  elements.heroAccent =
    document.getElementById("heroAccent");

  elements.footerText =
    document.getElementById("footerText");

  elements.modal =
    document.getElementById("modal");

  elements.modalType =
    document.getElementById("modalType");

  elements.modalTitle =
    document.getElementById("modalTitle");

  elements.modalImage =
    document.getElementById("modalImage");

  elements.modalContent =
    document.getElementById("modalContent");
}

function configureClock() {
  const update = () => {
    if (elements.clock) {
      elements.clock.textContent =
        new Date().toLocaleTimeString("pt-BR");
    }
  };

  update();
  setInterval(update, 1000);
}

function configureSoundButton() {
  updateSoundButton();

  elements.soundToggle?.addEventListener(
    "click",
    async () => {
      sound = !window.FFAudio.isEnabled();

      window.FFAudio.setEnabled(sound);

      updateSoundButton();
    }
  );

  window.addEventListener(
    "ff-sound-change",
    updateSoundButton
  );
}

function updateSoundButton() {
  sound =
    window.FFAudio?.isEnabled() ?? true;

  if (elements.soundToggle) {
    elements.soundToggle.textContent =
      `SOM: ${sound ? "LIGADO" : "DESLIGADO"}`;
  }
}

async function initializeAmbientSound() {
  await window.FFAudio.loadSettings(
    client,
    "site"
  );

  if (window.FFAudio.isEnabled()) {
    window.FFAudio.startAmbient().catch(() => {
      // A primeira interação do usuário tentará novamente.
    });
  }
}

function configureSearch() {
  elements.searchForm?.addEventListener(
    "submit",
    search
  );
}

function configureModal() {
  document
    .querySelectorAll("[data-close]")
    .forEach((element) => {
      element.addEventListener(
        "click",
        closeModal
      );
    });

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    }
  );
}

function closeModal() {
  if (elements.modal) {
    elements.modal.hidden = true;
  }
}

async function loadSettings() {
  const { data, error } = await client
    .from("blog_settings")
    .select("setting_key, setting_value")
    .eq("is_public", true);

  if (error) {
    console.warn(error);
    return;
  }

  for (const setting of data || []) {
    if (setting.setting_key === "site_identity") {
      const value = setting.setting_value || {};

      if (elements.heroTitle?.firstChild) {
        elements.heroTitle.firstChild.nodeValue =
          `${value.hero_title || "PROCURE UM NOME."} `;
      }

      if (elements.heroAccent) {
        elements.heroAccent.textContent =
          value.hero_accent || "";
      }

      if (elements.footerText) {
        elements.footerText.textContent =
          value.footer || "";
      }
    }

    if (
      setting.setting_key === "search" &&
      setting.setting_value?.placeholder &&
      elements.searchInput
    ) {
      elements.searchInput.placeholder =
        setting.setting_value.placeholder;
    }
  }
}

async function loadPosts() {
  const { data, count, error } = await client
    .from("blog_posts")
    .select(
      "id,title,excerpt,published_at,author_name",
      {
        count: "exact"
      }
    )
    .eq("status", "published")
    .order("published_at", {
      ascending: false
    })
    .limit(6);

  if (error) {
    console.warn(error);
    return;
  }

  if (elements.postCount) {
    elements.postCount.textContent =
      String(count ?? 0);
  }

  if (!data?.length || !elements.posts) {
    return;
  }

  elements.posts.innerHTML = data
    .map(
      (post, index) => `
        <article>
          <small>
            ${String(index + 1).padStart(3, "0")}
          </small>

          <h3>${escapeHTML(post.title)}</h3>

          <p>${escapeHTML(post.excerpt || "")}</p>

          <small>
            ${
              post.published_at
                ? new Date(
                    post.published_at
                  ).toLocaleDateString("pt-BR")
                : ""
            }
          </small>
        </article>
      `
    )
    .join("");
}

async function search(event) {
  event.preventDefault();

  const query =
    elements.searchInput?.value?.trim() || "";

  if (!query) {
    showSearchStatus(
      "Digite alguma coisa."
    );
    return;
  }

  if (!client) {
    showSearchStatus(
      "Arquivo desconectado."
    );
    return;
  }

  window.FFAudio?.startAmbient().catch(() => {});

  showSearchStatus("CONSULTANDO...");

  const state = window.FFProgress.get();

  state.search_count =
    Number(state.search_count || 0) + 1;

  window.FFProgress.save(state);

  const { data, error } = await client.rpc(
    "resolve_archive_search",
    {
      p_query: query,
      p_player_state: state
    }
  );

  if (error) {
    showSearchStatus(
      "O arquivo não respondeu."
    );
    console.error(error);
    return;
  }

  if (!data?.found) {
    showSearchStatus(
      "Nenhum registro reconheceu essa consulta."
    );
    return;
  }

  const entry = data.entry || {};

  window.FFProgress.addFlags(
    entry.unlock_flags || []
  );

  if (data.event) {
    window.FFEffects.runEvent(data.event);
  }

  if (data.chat) {
    location.href =
      `chat.html?chat=${encodeURIComponent(
        data.chat.chat_key
      )}`;
    return;
  }

  if (data.page) {
    location.href =
      `secret.html?slug=${encodeURIComponent(
        data.page.slug
      )}`;
    return;
  }

  if (entry.destination_url) {
    location.assign(entry.destination_url);
    return;
  }

  const item =
    data.character ||
    data.post ||
    data.resource ||
    entry;

  openResult(
    entry.entry_type,
    item,
    entry
  );

  if (entry.response_audio_url) {
    window.FFEffects.play(
      entry.response_audio_url
    );
  }
}

function openResult(type, item, entry) {
  if (!elements.modal) {
    return;
  }

  elements.modalType.textContent =
    String(type || "REGISTRO").toUpperCase();

  elements.modalTitle.textContent =
    item.name ||
    item.title ||
    entry.response_title ||
    "REGISTRO";

  elements.modalContent.textContent =
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

  if (image) {
    elements.modalImage.src = image;
    elements.modalImage.hidden = false;
  } else {
    elements.modalImage.hidden = true;
    elements.modalImage.removeAttribute("src");
  }

  elements.modal.hidden = false;
}

function showSearchStatus(text) {
  if (!elements.searchStatus) {
    return;
  }

  elements.searchStatus.textContent = text;
  elements.searchStatus.hidden = false;
}

function escapeHTML(value) {
  const element =
    document.createElement("div");

  element.textContent =
    String(value || "");

  return element.innerHTML;
}
