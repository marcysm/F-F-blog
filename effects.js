"use strict";

/* ==========================================================
   FERAS E FLORES — ÁUDIO, PROGRESSÃO E EFEITOS
   ========================================================== */

const FF_AUDIO_STORAGE_KEY = "ff-sound";
const FF_AUDIO_CONTEXTS = new Map();

window.FFAudio = {
  contextName: "site",
  settings: null,
  ambientAudio: null,
  fadeTimer: null,
  started: false,
  interactionBound: false,

  isEnabled() {
    return localStorage.getItem(FF_AUDIO_STORAGE_KEY) !== "off";
  },

  setEnabled(enabled) {
    localStorage.setItem(
      FF_AUDIO_STORAGE_KEY,
      enabled ? "on" : "off"
    );

    if (enabled) {
      this.startAmbient().catch(() => {});
    } else {
      this.stopAmbient();
      window.FFEffects?.stopAllAudio();
    }

    window.dispatchEvent(
      new CustomEvent("ff-sound-change", {
        detail: { enabled }
      })
    );
  },

  async loadSettings(client, contextName = "site") {
    this.contextName = contextName;

    if (!client) {
      return null;
    }

    const { data, error } = await client
      .from("blog_settings")
      .select("setting_value")
      .eq("setting_key", "audio")
      .eq("is_public", true)
      .maybeSingle();

    if (error) {
      console.warn("Áudio do site não carregado:", error);
      return null;
    }

    this.settings = {
      enabled: true,
      ambient_url: "",
      volume: 0.18,
      loop: true,
      fade_in_ms: 2500,
      fade_out_ms: 900,
      play_on_site: true,
      play_on_chat: true,
      play_on_secret: true,
      ...data?.setting_value
    };

    this.bindFirstInteraction();

    return this.settings;
  },

  shouldPlayHere() {
    if (!this.settings?.enabled || !this.isEnabled()) {
      return false;
    }

    const field = {
      site: "play_on_site",
      chat: "play_on_chat",
      secret: "play_on_secret"
    }[this.contextName] || "play_on_site";

    return this.settings[field] !== false;
  },

  bindFirstInteraction() {
    if (this.interactionBound) {
      return;
    }

    this.interactionBound = true;

    const start = () => {
      this.startAmbient().catch(() => {});

      ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
        document.removeEventListener(eventName, start);
      });
    };

    ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
      document.addEventListener(eventName, start, {
        once: true,
        passive: true
      });
    });
  },

  async startAmbient() {
    if (
      !this.shouldPlayHere() ||
      !this.settings?.ambient_url
    ) {
      return;
    }

    if (
      this.ambientAudio &&
      this.ambientAudio.src ===
        new URL(this.settings.ambient_url, location.href).href
    ) {
      if (this.ambientAudio.paused) {
        await this.ambientAudio.play();
      }

      this.fadeTo(
        Number(this.settings.volume ?? 0.18),
        Number(this.settings.fade_in_ms ?? 2500)
      );

      this.started = true;
      return;
    }

    this.stopAmbient(true);

    const audio = new Audio(this.settings.ambient_url);

    audio.loop = this.settings.loop !== false;
    audio.preload = "auto";
    audio.volume = 0;

    this.ambientAudio = audio;

    await audio.play();

    this.fadeTo(
      Number(this.settings.volume ?? 0.18),
      Number(this.settings.fade_in_ms ?? 2500)
    );

    this.started = true;
  },

  stopAmbient(immediate = false) {
    if (!this.ambientAudio) {
      return;
    }

    if (immediate) {
      this.ambientAudio.pause();
      this.ambientAudio.currentTime = 0;
      this.ambientAudio = null;
      return;
    }

    const audio = this.ambientAudio;
    const duration = Number(
      this.settings?.fade_out_ms ?? 900
    );

    this.fadeTo(0, duration, () => {
      audio.pause();
      audio.currentTime = 0;

      if (this.ambientAudio === audio) {
        this.ambientAudio = null;
      }
    });
  },

  fadeTo(targetVolume, duration, done = null) {
    if (!this.ambientAudio) {
      done?.();
      return;
    }

    clearInterval(this.fadeTimer);

    const audio = this.ambientAudio;
    const startVolume = audio.volume;
    const safeTarget = Math.min(
      1,
      Math.max(0, Number(targetVolume || 0))
    );

    const startedAt = performance.now();

    if (duration <= 0) {
      audio.volume = safeTarget;
      done?.();
      return;
    }

    this.fadeTimer = window.setInterval(() => {
      const progress = Math.min(
        1,
        (performance.now() - startedAt) / duration
      );

      audio.volume =
        startVolume +
        (safeTarget - startVolume) * progress;

      if (progress >= 1) {
        clearInterval(this.fadeTimer);
        done?.();
      }
    }, 40);
  }
};

window.FFEffects = {
  audio: null,
  audioContext: null,
  generatedNodes: new Set(),

  async unlockAudio() {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    if (
      !this.audioContext ||
      this.audioContext.state === "closed"
    ) {
      this.audioContext =
        new AudioContextClass();
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    return this.audioContext;
  },

  wait(milliseconds) {
    return new Promise((resolve) => {
      setTimeout(
        resolve,
        Math.max(0, Number(milliseconds || 0))
      );
    });
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

    const body = document.body;
    const black =
      document.querySelector("#fxBlack");
    const half =
      document.querySelector("#fxHalf");
    const text =
      document.querySelector("#fxText");
    const media =
      document.querySelector("#fxMedia");

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

      case "flash":
        black?.classList.add("on", "flash");
        await this.wait(
          Math.min(duration, 220)
        );
        black?.classList.remove("on", "flash");
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
          const image =
            document.createElement("img");

          image.src = step.media_url || "";
          image.alt = "";

          media.replaceChildren(image);
          media.hidden = false;

          await this.wait(duration);

          media.hidden = true;
          media.replaceChildren();
        }
        break;

      case "play_audio":
        this.play(step.media_url, step.settings);
        if (duration > 0) {
          await this.wait(duration);
        }
        break;

      case "generated_tone":
        await this.generatedTone(
          step.settings || {},
          duration
        );
        break;

      case "redirect":
        if (step.target_url) {
          location.assign(step.target_url);
        }
        break;

      case "clear_effects":
        this.clear();
        break;
    }
  },

  play(url, settings = {}) {
    const forceAudio =
      settings.force_audio === true;

    if (
      !url ||
      (
        !forceAudio &&
        !window.FFAudio?.isEnabled()
      )
    ) {
      return;
    }

    this.audio?.pause();

    this.audio = new Audio(url);

    this.audio.volume = Math.min(
      1,
      Math.max(
        0,
        Number(settings.volume ?? 0.7)
      )
    );

    this.audio.play().catch((error) => {
      console.warn(
        "Áudio bloqueado pelo navegador:",
        error
      );
    });
  },

  async generatedTone(settings = {}, duration = 1800) {
    const forceAudio =
      settings.force_audio === true;

    if (
      !forceAudio &&
      !window.FFAudio?.isEnabled()
    ) {
      return;
    }

    const context =
      await this.unlockAudio();

    if (!context) {
      return;
    }

    const now = context.currentTime;
    const seconds =
      Math.max(0.08, duration / 1000);

    const startFrequency = Number(
      settings.start_frequency ??
      settings.frequency ??
      62
    );

    const endFrequency = Number(
      settings.end_frequency ??
      34
    );

    const volume = Math.min(
      0.6,
      Math.max(
        0.001,
        Number(settings.volume ?? 0.18)
      )
    );

    const attack = Math.min(
      seconds * 0.45,
      Number(settings.attack_ms ?? 240) / 1000
    );

    const release = Math.min(
      seconds * 0.75,
      Number(settings.release_ms ?? 1000) / 1000
    );

    const oscillator = context.createOscillator();
    const subOscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const distortion = context.createWaveShaper();

    oscillator.type =
      settings.wave_type || "sawtooth";

    subOscillator.type =
      settings.sub_wave_type || "sine";

    oscillator.frequency.setValueAtTime(
      startFrequency,
      now
    );

    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      now + seconds
    );

    subOscillator.frequency.setValueAtTime(
      Math.max(1, startFrequency / 2),
      now
    );

    subOscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency / 2),
      now + seconds
    );

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(
      Number(settings.filter_frequency ?? 240),
      now
    );

    filter.Q.value =
      Number(settings.filter_q ?? 3);

    distortion.curve = createDistortionCurve(
      Number(settings.distortion ?? 28)
    );

    gain.gain.setValueAtTime(0.0001, now);

    gain.gain.exponentialRampToValueAtTime(
      volume,
      now + Math.max(0.01, attack)
    );

    gain.gain.setValueAtTime(
      volume,
      Math.max(
        now + attack,
        now + seconds - release
      )
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + seconds
    );

    oscillator.connect(distortion);
    subOscillator.connect(distortion);
    distortion.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    subOscillator.start(now);

    oscillator.stop(now + seconds);
    subOscillator.stop(now + seconds);

    this.generatedNodes.add(context);

    await this.wait(duration + 80);

    this.generatedNodes.delete(context);
  },

  stopAllAudio() {
    this.audio?.pause();
    this.audio = null;

    this.generatedNodes.clear();

    if (
      this.audioContext &&
      this.audioContext.state === "running"
    ) {
      this.audioContext.suspend().catch(() => {});
    }
  },

  clear() {
    document.body.classList.remove(
      "glitch",
      "shake"
    );

    document
      .querySelector("#fxBlack")
      ?.classList.remove("on", "flash");

    document
      .querySelector("#fxHalf")
      ?.classList.remove("on", "right");

    const text =
      document.querySelector("#fxText");

    const media =
      document.querySelector("#fxMedia");

    if (text) {
      text.hidden = true;
      text.textContent = "";
    }

    if (media) {
      media.hidden = true;
      media.replaceChildren();
    }
  }
};

function createDistortionCurve(amount = 20) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const degree = Math.PI / 180;

  for (let index = 0; index < samples; index += 1) {
    const value =
      index * 2 / samples - 1;

    curve[index] =
      (
        (3 + amount) *
        value *
        20 *
        degree
      ) /
      (
        Math.PI +
        amount *
        Math.abs(value)
      );
  }

  return curve;
}

window.FFProgress = {
  key: "ff-arg-progress-v2",

  get() {
    try {
      return (
        JSON.parse(
          localStorage.getItem(this.key)
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
        crypto.randomUUID?.() ||
        String(Date.now()),

      flags: [],
      search_count: 0,
      events: {},
      codes: []
    };
  },

  save(value) {
    localStorage.setItem(
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
