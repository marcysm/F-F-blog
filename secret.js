"use strict";

/* ==========================================================
   FERAS E FLORES — PÁGINAS SECRETAS
   ========================================================== */

window.addEventListener("DOMContentLoaded", initializeSecretPage);

async function initializeSecretPage() {
  const client = window.ferasFloresSupabase;
  const pageElement = document.getElementById("page");
  const slug = new URLSearchParams(window.location.search).get("slug");

  if (!pageElement) {
    return;
  }

  if (!client || !slug) {
    renderUnavailable(pageElement);
    return;
  }

  const playerState = window.FFProgress.get();

  const { data, error } = await client.rpc("get_secret_page", {
    p_slug: slug,
    p_player_state: playerState
  });

  if (error || !data?.found) {
    console.error("Página secreta indisponível:", error);
    renderUnavailable(pageElement);
    return;
  }

  const page = data.page || {};

  document.title = page.title || "Registro oculto";

  if (page.background_image_url) {
    pageElement.style.backgroundImage =
      `linear-gradient(#080608dd, #080608dd), ` +
      `url("${page.background_image_url}")`;
  }

  pageElement.innerHTML = "";

  if (page.cover_image_url) {
    const image = document.createElement("img");
    image.src = page.cover_image_url;
    image.alt = "";
    pageElement.appendChild(image);
  }

  const subtitle = document.createElement("p");
  subtitle.textContent = page.subtitle || "REGISTRO OCULTO";

  const title = document.createElement("h1");
  title.textContent = page.title || "REGISTRO OCULTO";

  const content = document.createElement("div");
  content.className = "content";
  content.textContent = page.content || "";

  pageElement.append(subtitle, title, content);

  window.FFProgress.addFlags(page.unlock_flags || []);

  if (page.audio_url) {
    window.FFEffects.play(page.audio_url);
  }

  if (data.event) {
    await window.FFEffects.runEvent(data.event);
  }
}

function renderUnavailable(element) {
  element.innerHTML = `
    <h1>REGISTRO INDISPONÍVEL</h1>
    <p>O arquivo não reconheceu esta página.</p>
    <a href="index.html">VOLTAR AO ARQUIVO</a>
  `;
}
