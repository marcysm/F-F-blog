"use strict";

/* ==========================================================
   FERAS E FLORES — EFEITOS E PROGRESSÃO LOCAL
   ========================================================== */

window.FFProgress = {
  key: "ff-arg-progress-v2",

  fresh() {
    return {
      player_token:
        typeof crypto?.randomUUID === "function"
          ? crypto.randomUUID()
          : String(Date.now()),
      flags: [],
      search_count: 0,
      events: {},
      codes: []
    };
  },

  get() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.key));
      return saved && typeof saved === "object" ? saved : this.fresh();
    } catch (error) {
      console.warn("Progresso local inválido. Um novo foi criado.", error);
      return this.fresh();
    }
  },

  save(value) {
    localStorage.setItem(this.key, JSON.stringify(value));
  },

  addFlags(flags) {
    const state = this.get();
    state.flags = [
      ...new Set([...(state.flags || []), ...(flags || [])])
    ];
    this.save(state);
    return state;
  }
};

window.FFEffects = {
  audio: null,

  wait(milliseconds) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, Math.max(0, Number(milliseconds) || 0));
    });
  },

  async runEvent(event) {
    if (!event) {
      return;
    }

    const probability = Number(event.probability ?? 1);

    if (Math.random() > probability) {
      return;
    }

    for (const step of event.steps || []) {
      await this.wait(step.delay_before_ms);
      await this.step(step);
    }

    this.applyFlags(event.unlock_flags);
  },

  applyFlags(flags) {
    if (!flags?.length) {
      return;
    }

    window.FFProgress?.addFlags(flags);
  },

  async step(step) {
    const duration = Number(step?.duration_ms || 1000);
    const body = document.body;
    const black = document.getElementById("fxBlack");
    const half = document.getElementById("fxHalf");
    const text = document.getElementById("fxText");
    const media = document.getElementById("fxMedia");

    switch (step?.action_type) {
      case "delay":
        await this.wait(duration);
        break;

      case "glitch":
        body.classList.add("glitch");
        await this.wait(duration);
        body.classList.remove("glitch");
        break;

      case "shake":
        body.classList.add("shake");
        await this.wait(duration);
        body.classList.remove("shake");
        break;

      case "blackout":
        black?.classList.add("on");
        await this.wait(duration);
        black?.classList.remove("on");
        break;

      case "darken_left":
        half?.classList.remove("right");
        half?.classList.add("on");
        await this.wait(duration);
        half?.classList.remove("on");
        break;

      case "darken_right":
        half?.classList.add("on", "right");
        await this.wait(duration);
        half?.classList.remove("on", "right");
        break;

      case "show_text":
      case "type_text":
        if (text) {
          text.textContent = step.text_content || "";
          text.hidden = false;
          await this.wait(duration);
          text.hidden = true;
          text.textContent = "";
        }
        break;

      case "show_image":
        if (media && step.media_url) {
          media.innerHTML = "";

          const image = document.createElement("img");
          image.src = step.media_url;
          image.alt = "";
          media.appendChild(image);

          media.hidden = false;
          await this.wait(duration);
          media.hidden = true;
          media.innerHTML = "";
        }
        break;

      case "play_audio":
        this.play(step.media_url);
        if (duration > 0) {
          await this.wait(duration);
        }
        break;

      case "redirect":
        if (step.target_url) {
          window.location.assign(step.target_url);
        }
        break;

      case "clear_effects":
        this.clear();
        break;

      default:
        break;
    }
  },

  play(url) {
    if (!url || localStorage.getItem("ff-sound") === "off") {
      return;
    }

    this.audio?.pause();

    this.audio = new Audio(url);
    this.audio.volume = 0.7;
    this.audio.play().catch(() => {
      console.warn("O navegador bloqueou a reprodução automática do áudio.");
    });
  },

  clear() {
    document.body.classList.remove("glitch", "shake");
    document.getElementById("fxBlack")?.classList.remove("on");
    document.getElementById("fxHalf")?.classList.remove("on", "right");

    const text = document.getElementById("fxText");
    const media = document.getElementById("fxMedia");

    if (text) {
      text.hidden = true;
      text.textContent = "";
    }

    if (media) {
      media.hidden = true;
      media.innerHTML = "";
    }
  }
};
