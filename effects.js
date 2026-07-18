"use strict";

/* ==========================================================
   FERAS E FLORES — MOTOR DE EFEITOS E ÁUDIO
   ========================================================== */

window.FFEffects = {
  audio: null,
  audioContext: null,
  audioUnlocked: false,

  wait(milliseconds) {
    return new Promise((resolve) => {
      window.setTimeout(
        resolve,
        Math.max(0, Number(milliseconds || 0))
      );
    });
  },

  async unlockAudio() {
    try {
      if (!this.audioContext) {
        const AudioContextClass =
          window.AudioContext ||
          window.webkitAudioContext;

        if (AudioContextClass) {
          this.audioContext =
            new AudioContextClass();
        }
      }

      if (
        this.audioContext &&
        this.audioContext.state === "suspended"
      ) {
        await this.audioContext.resume();
      }

      if (this.audioContext) {
        const oscillator =
          this.audioContext.createOscillator();

        const gain =
          this.audioContext.createGain();

        gain.gain.value = 0.00001;

        oscillator.connect(gain);
        gain.connect(this.audioContext.destination);

        oscillator.start();
        oscillator.stop(
          this.audioContext.currentTime + 0.02
        );
      }

      this.audioUnlocked = true;
      return true;
    } catch (error) {
      console.warn(
        "Não foi possível liberar o áudio:",
        error
      );

      return false;
    }
  },

  async play(url, options = {}) {
    if (
      !url ||
      window.localStorage.getItem("ff-sound") === "off"
    ) {
      return false;
    }

    await this.unlockAudio();

    try {
      if (this.audio) {
        this.audio.pause();
        this.audio.currentTime = 0;
      }

      const audio = new Audio(url);

      audio.volume = Math.min(
        Math.max(Number(options.volume ?? 0.7), 0),
        1
      );

      this.audio = audio;

      await audio.play();

      return true;
    } catch (error) {
      console.warn(
        "O navegador não conseguiu reproduzir o áudio:",
        error
      );

      return false;
    }
  },

  async generatedTone({
    frequency = 440,
    duration = 500,
    volume = 0.2,
    type = "sine"
  } = {}) {
    if (
      window.localStorage.getItem("ff-sound") === "off"
    ) {
      return;
    }

    await this.unlockAudio();

    if (!this.audioContext) {
      return;
    }

    const context = this.audioContext;

    const oscillator =
      context.createOscillator();

    const gain =
      context.createGain();

    oscillator.type = type;

    oscillator.frequency.setValueAtTime(
      frequency,
      context.currentTime
    );

    gain.gain.setValueAtTime(
      0.0001,
      context.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.001, volume),
      context.currentTime + 0.02
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime +
        Math.max(0.05, duration / 1000)
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();

    oscillator.stop(
      context.currentTime +
        Math.max(0.08, duration / 1000) +
        0.05
    );

    await this.wait(duration);
  },

  async playShriek(duration = 1350) {
    if (
      window.localStorage.getItem("ff-sound") === "off"
    ) {
      return;
    }

    await this.unlockAudio();

    if (!this.audioContext) {
      return;
    }

    const context = this.audioContext;

    const oscillatorA =
      context.createOscillator();

    const oscillatorB =
      context.createOscillator();

    const gain =
      context.createGain();

    const filter =
      context.createBiquadFilter();

    oscillatorA.type = "sawtooth";
    oscillatorB.type = "square";

    oscillatorA.frequency.setValueAtTime(
      220,
      context.currentTime
    );

    oscillatorA.frequency.exponentialRampToValueAtTime(
      2400,
      context.currentTime + duration / 1000
    );

    oscillatorB.frequency.setValueAtTime(
      1700,
      context.currentTime
    );

    oscillatorB.frequency.exponentialRampToValueAtTime(
      350,
      context.currentTime + duration / 1000
    );

    filter.type = "bandpass";
    filter.frequency.value = 1600;
    filter.Q.value = 7;

    gain.gain.setValueAtTime(
      0.0001,
      context.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.25,
      context.currentTime + 0.04
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + duration / 1000
    );

    oscillatorA.connect(filter);
    oscillatorB.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    oscillatorA.start();
    oscillatorB.start();

    oscillatorA.stop(
      context.currentTime + duration / 1000 + 0.05
    );

    oscillatorB.stop(
      context.currentTime + duration / 1000 + 0.05
    );

    await this.wait(duration);
  },

  async runEvent(event) {
    if (
      !event ||
      Math.random() > Number(event.probability ?? 1)
    ) {
      return;
    }

    for (const step of event.steps || []) {
      await this.wait(step.delay_before_ms);
      await this.step(step);
    }

    this.applyFlags(event.unlock_flags);
  },

  applyFlags(flags) {
    if (!flags?.length || !window.FFProgress) {
      return;
    }

    const state = window.FFProgress.get();

    state.flags = [
      ...new Set([
        ...(state.flags || []),
        ...flags
      ])
    ];

    window.FFProgress.save(state);
  },

  async step(step) {
    const duration =
      Number(step.duration_ms || 1000);

    const body =
      document.body;

    const black =
      document.getElementById("fxBlack");

    const half =
      document.getElementById("fxHalf");

    const text =
      document.getElementById("fxText");

    const media =
      document.getElementById("fxMedia");

    switch (step.action_type) {
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
          text.textContent =
            step.text_content || "";

          text.hidden = false;

          await this.wait(duration);

          text.hidden = true;
          text.textContent = "";
        }
        break;

      case "show_image":
        if (media) {
          media.replaceChildren();

          const image =
            document.createElement("img");

          image.src =
            step.media_url || "";

          image.alt = "";

          media.appendChild(image);
          media.hidden = false;

          await this.wait(duration);

          media.hidden = true;
          media.replaceChildren();
        }
        break;

      case "play_audio":
        await this.play(
          step.media_url,
          {
            volume:
              step.settings?.volume ?? 0.7
          }
        );

        if (duration > 0) {
          await this.wait(duration);
        }
        break;

      case "generated_tone":
        await this.generatedTone({
          frequency:
            step.settings?.frequency ?? 440,

          duration,

          volume:
            step.settings?.volume ?? 0.2,

          type:
            step.settings?.wave_type ?? "sine"
        });
        break;

      case "shriek":
        await this.playShriek(duration);
        break;

      case "redirect":
        if (step.target_url) {
          window.location.assign(step.target_url);
        }
        break;

      case "clear_effects":
        this.clear();
        break;
    }
  },

  clear() {
    document.body.classList.remove(
      "glitch",
      "shake"
    );

    document
      .getElementById("fxBlack")
      ?.classList.remove("on");

    document
      .getElementById("fxHalf")
      ?.classList.remove("on", "right");

    const text =
      document.getElementById("fxText");

    if (text) {
      text.hidden = true;
      text.textContent = "";
    }

    const media =
      document.getElementById("fxMedia");

    if (media) {
      media.hidden = true;
      media.replaceChildren();
    }
  }
};


/* ==========================================================
   PROGRESSO GERAL DO ARG
   ========================================================== */

window.FFProgress = {
  key: "ff-arg-progress-v2",

  get() {
    try {
      return (
        JSON.parse(
          window.localStorage.getItem(this.key)
        ) ||
        this.fresh()
      );
    } catch {
      return this.fresh();
    }
  },

  fresh() {
    return {
      player_token:
        window.crypto?.randomUUID?.() ||
        String(Date.now()),

      flags: [],
      search_count: 0,
      events: {},
      codes: []
    };
  },

  save(value) {
    window.localStorage.setItem(
      this.key,
      JSON.stringify(value)
    );
  },

  addFlags(flags) {
    const state = this.get();

    state.flags = [
      ...new Set([
        ...(state.flags || []),
        ...(flags || [])
      ])
    ];

    this.save(state);

    return state;
  }
};


/* ==========================================================
   LIBERAÇÃO DE ÁUDIO POR INTERAÇÃO
   ========================================================== */

const unlockAudioOnce = async () => {
  await window.FFEffects.unlockAudio();

  document.removeEventListener(
    "pointerdown",
    unlockAudioOnce
  );

  document.removeEventListener(
    "keydown",
    unlockAudioOnce
  );
};

document.addEventListener(
  "pointerdown",
  unlockAudioOnce,
  { once: true }
);

document.addEventListener(
  "keydown",
  unlockAudioOnce,
  { once: true }
);
