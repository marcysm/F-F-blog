"use strict";
document.addEventListener("DOMContentLoaded", async () => {
  const slug = new URLSearchParams(location.search).get("slug");
  const st = FFProgress.get();
  const { data, error } = await ferasFloresSupabase.rpc("get_secret_page", {
    p_slug: slug,
    p_player_state: st,
  });
  if (error || !data?.found) {
    page.innerHTML = "<h1>REGISTRO INDISPONÍVEL</h1>";
    return;
  }
  const p = data.page;
  document.title = p.title;
  page.style.backgroundImage = p.background_image_url
    ? `linear-gradient(#080608dd,#080608dd),url(${p.background_image_url})`
    : "";
  page.innerHTML = `${p.cover_image_url ? `<img src="${p.cover_image_url}" alt="">` : ""}<p>${p.subtitle || "REGISTRO OCULTO"}</p><h1>${p.title}</h1><div class="content"></div>`;
  page.querySelector(".content").textContent = p.content || "";
  FFProgress.addFlags(p.unlock_flags || []);
  if (p.audio_url) FFEffects.play(p.audio_url);
  if (data.event) FFEffects.runEvent(data.event);
});
