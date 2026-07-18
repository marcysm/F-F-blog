"use strict";

document.addEventListener(
  "DOMContentLoaded",
  initializeSecretPage
);

async function initializeSecretPage() {
  const client =
    window.ferasFloresSupabase;

  const pageElement =
    document.getElementById("page");

  const slug =
    new URLSearchParams(
      location.search
    ).get("slug");

  if (!client || !slug || !pageElement) {
    showUnavailable(pageElement);
    return;
  }

  await window.FFAudio.loadSettings(
    client,
    "secret"
  );

  window.FFAudio
    .startAmbient()
    .catch(() => {});

  const state =
    window.FFProgress.get();

  const { data, error } = await client.rpc(
    "get_secret_page",
    {
      p_slug: slug,
      p_player_state: state
    }
  );

  if (error || !data?.found) {
    showUnavailable(pageElement);
    return;
  }

  const page = data.page;

  document.title =
    page.title || "Registro oculto";

  if (page.background_image_url) {
    pageElement.style.backgroundImage = `
      linear-gradient(
        rgba(8, 6, 8, 0.86),
        rgba(8, 6, 8, 0.9)
      ),
      url("${escapeCSSURL(
        page.background_image_url
      )}")
    `;
  }

  pageElement.replaceChildren();

  if (page.cover_image_url) {
    const image =
      document.createElement("img");

    image.src = page.cover_image_url;
    image.alt = "";

    pageElement.appendChild(image);
  }

  const subtitle =
    document.createElement("p");

  subtitle.textContent =
    page.subtitle ||
    "REGISTRO OCULTO";

  const title =
    document.createElement("h1");

  title.textContent =
    page.title ||
    "REGISTRO";

  const content =
    document.createElement("div");

  content.className = "content";
  content.textContent =
    page.content || "";

  pageElement.append(
    subtitle,
    title,
    content
  );

  window.FFProgress.addFlags(
    page.unlock_flags || []
  );

  if (page.audio_url) {
    window.FFEffects.play(
      page.audio_url
    );
  }

  if (data.event) {
    window.FFEffects.runEvent(
      data.event
    );
  }
}

function showUnavailable(element) {
  if (element) {
    element.innerHTML =
      "<h1>REGISTRO INDISPONÍVEL</h1>";
  }
}

function escapeCSSURL(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "");
}
