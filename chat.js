"use strict";

/* ==========================================================
   FERAS E FLORES — CHAT SECRETO
   Persistência local + Supabase
   ========================================================== */

const chatState = {
  client: window.ferasFloresSupabase,
  chatKey: new URLSearchParams(window.location.search).get("chat") || "algo",
  localStorageKey: "",
  playerTokenKey: "ff-anonymous-player-token-v1",
  config: null,
  memory: null,
  isSending: false
};

const chatElements = {};

document.addEventListener("DOMContentLoaded", initializeChat);

/* ==========================================================
   INICIALIZAÇÃO
   ========================================================== */

async function initializeChat() {
  mapChatElements();

  chatState.localStorageKey =
    `ff-chat-${chatState.chatKey}-memory-v3`;

  configureChatForm();
  configureSoundToggle();

  if (!chatState.client) {
    showFatalError(
      "A conexão com o Supabase não foi iniciada."
    );
    return;
  }

  try {
    await window.FFAudio.loadSettings(
      chatState.client,
      "chat"
    );

    window.FFAudio
      .startAmbient()
      .catch(() => {});

    const playerToken = getOrCreatePlayerToken();

    const remoteData = await loadRemoteChatState(
      playerToken,
      chatState.chatKey
    );

    if (!remoteData?.found || !remoteData?.chat) {
      showFatalError(
        "Este canal não existe ou está desativado."
      );
      return;
    }

    chatState.config = remoteData.chat;
    chatState.memory = mergeMemories(
      createFreshMemory(),
      loadLocalMemory(),
      remoteData.state,
      remoteData.history
    );

    applyChatIdentity();
    renderHistory();

    if (!chatState.memory.opened) {
      const openingMessage =
        chatState.config.opening_message ||
        "...Você conseguiu abrir o canal.";

      await addBotMessage(openingMessage);

      chatState.memory.opened = true;

      await persistMemory();
    }

    focusInput();
  } catch (error) {
    console.error("Falha ao iniciar o chat:", error);

    showFatalError(
      "Não foi possível restaurar esta conversa."
    );
  }
}

function mapChatElements() {
  chatElements.shell =
    document.getElementById("chat-shell");

  chatElements.speaker =
    document.getElementById("chat-speaker");

  chatElements.channelLabel =
    document.getElementById("chat-channel-label");

  chatElements.messages =
    document.getElementById("chat-messages");

  chatElements.typing =
    document.getElementById("chat-typing");

  chatElements.form =
    document.getElementById("chat-form");

  chatElements.input =
    document.getElementById("chat-input");

  chatElements.sendButton =
    document.getElementById("chat-send-button");

  chatElements.soundToggle =
    document.getElementById("chat-sound-toggle");

  chatElements.error =
    document.getElementById("chat-error");

  chatElements.errorMessage =
    document.getElementById("chat-error-message");
}

function configureChatForm() {
  if (!chatElements.form) {
    return;
  }

  chatElements.form.addEventListener(
    "submit",
    handlePlayerMessage
  );
}

/* ==========================================================
   IDENTIDADE ANÔNIMA
   ========================================================== */

function getOrCreatePlayerToken() {
  let token =
    window.localStorage.getItem(
      chatState.playerTokenKey
    );

  if (isValidUUID(token)) {
    return token;
  }

  token =
    window.crypto?.randomUUID?.() ||
    createFallbackUUID();

  window.localStorage.setItem(
    chatState.playerTokenKey,
    token
  );

  return token;
}

function createFallbackUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
    .replace(/[xy]/g, (character) => {
      const random = Math.random() * 16 | 0;

      const value =
        character === "x"
          ? random
          : (random & 0x3) | 0x8;

      return value.toString(16);
    });
}

function isValidUUID(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(String(value || ""));
}

/* ==========================================================
   MEMÓRIA
   ========================================================== */

function createFreshMemory() {
  return {
    player_name: null,
    total_messages: 0,
    irritation: 0,
    flags: [],
    message_counts: {},
    rule_uses: {},
    history: [],
    opened: false,
    asked_name: false,
    awaiting_name: false,
    ask_name_at: null
  };
}

function loadLocalMemory() {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(
        chatState.localStorageKey
      ) || "null"
    );

    return parsed && typeof parsed === "object"
      ? parsed
      : null;
  } catch (error) {
    console.warn(
      "Memória local inválida:",
      error
    );

    return null;
  }
}

function mergeMemories(
  fresh,
  localMemory,
  remoteState,
  remoteHistory
) {
  const remoteMemory =
    normalizeRemoteState(remoteState);

  const merged = {
    ...fresh,
    ...(localMemory || {}),
    ...(remoteMemory || {})
  };

  merged.flags = uniqueStrings([
    ...(fresh.flags || []),
    ...(localMemory?.flags || []),
    ...(remoteMemory?.flags || [])
  ]);

  merged.message_counts = {
    ...(localMemory?.message_counts || {}),
    ...(remoteMemory?.message_counts || {})
  };

  merged.rule_uses = {
    ...(localMemory?.rule_uses || {}),
    ...(remoteMemory?.rule_uses || {})
  };

  const serverHistory = Array.isArray(remoteHistory)
    ? remoteHistory
    : [];

  if (serverHistory.length) {
    merged.history = serverHistory.map((message) => ({
      role: message.role,
      text: message.text || "",
      media: message.media || null,
      created_at: message.created_at || null
    }));
  } else {
    merged.history = Array.isArray(localMemory?.history)
      ? localMemory.history
      : [];
  }

  return merged;
}

function normalizeRemoteState(remoteState) {
  if (!remoteState || typeof remoteState !== "object") {
    return null;
  }

  const stateData =
    remoteState.state_data &&
    typeof remoteState.state_data === "object"
      ? remoteState.state_data
      : {};

  return {
    ...stateData,
    player_name:
      remoteState.player_name ??
      stateData.player_name ??
      null,

    total_messages:
      remoteState.total_messages ??
      stateData.total_messages ??
      0,

    irritation:
      remoteState.irritation ??
      stateData.irritation ??
      0,

    flags:
      Array.isArray(remoteState.flags)
        ? remoteState.flags
        : stateData.flags || [],

    message_counts:
      remoteState.message_counts ||
      stateData.message_counts ||
      {},

    rule_uses:
      remoteState.rule_uses ||
      stateData.rule_uses ||
      {},

    asked_name:
      remoteState.asked_name ??
      stateData.asked_name ??
      false,

    awaiting_name:
      remoteState.awaiting_name ??
      stateData.awaiting_name ??
      false,

    ask_name_at:
      remoteState.ask_name_at ??
      stateData.ask_name_at ??
      null,

    opened:
      remoteState.opened ??
      stateData.opened ??
      false
  };
}

function saveLocalMemory() {
  window.localStorage.setItem(
    chatState.localStorageKey,
    JSON.stringify(chatState.memory)
  );
}

async function persistMemory(
  messageRole = null,
  messageText = null,
  mediaUrl = null
) {
  saveLocalMemory();

  const playerToken =
    getOrCreatePlayerToken();

  const { error } = await chatState.client.rpc(
    "save_anonymous_chat_state",
    {
      p_player_token: playerToken,
      p_chat_key: chatState.chatKey,
      p_state: chatState.memory,
      p_role: messageRole,
      p_message: messageText,
      p_media_url: mediaUrl
    }
  );

  if (error) {
    console.warn(
      "Não foi possível salvar a memória remota:",
      error
    );
  }
}

async function loadRemoteChatState(
  playerToken,
  chatKey
) {
  const { data, error } = await chatState.client.rpc(
    "load_anonymous_chat_state",
    {
      p_player_token: playerToken,
      p_chat_key: chatKey
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

/* ==========================================================
   INTERFACE
   ========================================================== */

function applyChatIdentity() {
  if (chatElements.speaker) {
    chatElements.speaker.textContent =
      chatState.config.speaker_name ||
      "Algo";
  }

  if (chatElements.channelLabel) {
    chatElements.channelLabel.textContent =
      chatState.config.name
        ? String(chatState.config.name).toUpperCase()
        : "CANAL NÃO IDENTIFICADO";
  }

  if (chatState.config.background_url) {
    document.body.style.backgroundImage = `
      linear-gradient(
        rgba(8, 6, 8, 0.82),
        rgba(8, 6, 8, 0.92)
      ),
      url("${escapeCSSURL(
        chatState.config.background_url
      )}")
    `;
  }
}

function renderHistory() {
  if (!chatElements.messages) {
    return;
  }

  chatElements.messages.innerHTML = "";

  for (const message of chatState.memory.history) {
    appendMessageToInterface(
      message.role,
      message.text,
      message.media,
      false
    );
  }

  scrollMessagesToBottom();
}

function appendMessageToInterface(
  role,
  text,
  mediaUrl = null,
  shouldScroll = true
) {
  const element = document.createElement("article");

  element.className = `message ${role}`;
  element.textContent = String(text || "");

  if (mediaUrl) {
    const image = document.createElement("img");

    image.src = mediaUrl;
    image.alt = "";
    image.loading = "lazy";

    element.appendChild(image);
  }

  chatElements.messages.appendChild(element);

  if (shouldScroll) {
    scrollMessagesToBottom();
  }

  return element;
}

function scrollMessagesToBottom() {
  if (!chatElements.messages) {
    return;
  }

  chatElements.messages.scrollTop =
    chatElements.messages.scrollHeight;
}

function setTypingVisible(visible) {
  if (chatElements.typing) {
    chatElements.typing.hidden = !visible;
  }
}

function setInputEnabled(enabled) {
  if (chatElements.input) {
    chatElements.input.disabled = !enabled;
  }

  if (chatElements.sendButton) {
    chatElements.sendButton.disabled = !enabled;
  }
}

function focusInput() {
  window.setTimeout(() => {
    chatElements.input?.focus();
  }, 50);
}

function showFatalError(message) {
  if (chatElements.shell) {
    chatElements.shell.hidden = true;
  }

  if (chatElements.error) {
    chatElements.error.hidden = false;
  }

  if (chatElements.errorMessage) {
    chatElements.errorMessage.textContent = message;
  }
}

/* ==========================================================
   ENVIO DE MENSAGENS
   ========================================================== */

async function handlePlayerMessage(event) {
  event.preventDefault();

  if (chatState.isSending) {
    return;
  }

  const message =
    chatElements.input?.value?.trim() || "";

  if (!message) {
    return;
  }

  chatState.isSending = true;
  setInputEnabled(false);

  try {
    chatElements.input.value = "";

    await addPlayerMessage(message);

    setTypingVisible(true);

    const { data, error } = await chatState.client.rpc(
      "resolve_chat_message",
      {
        p_chat_key: chatState.chatKey,
        p_message: message,
        p_state: chatState.memory
      }
    );

    if (error) {
      throw error;
    }

    const responseDelay =
      Number(
        data?.updates?.response_delay_ms ??
        chatState.config.response_delay_ms ??
        600
      );

    await wait(responseDelay);

    mergeChatUpdates(data?.updates || {});

    const responseText =
      data?.response ||
      chooseDefaultResponse();

    await addBotMessage(
      responseText,
      data?.updates?.typing_delay_ms
    );

    for (const action of data?.actions || []) {
      await executeChatAction(action);
    }

    await persistMemory();
  } catch (error) {
    console.error(
      "Falha ao responder:",
      error
    );

    await addBotMessage(
      "..."
    );
  } finally {
    setTypingVisible(false);
    setInputEnabled(true);
    chatState.isSending = false;
    focusInput();
  }
}

async function addPlayerMessage(message) {
  appendMessageToInterface(
    "player",
    message
  );

  chatState.memory.history.push({
    role: "player",
    text: message,
    media: null,
    created_at: new Date().toISOString()
  });

  const normalized = normalizeText(message);

  chatState.memory.total_messages =
    Number(chatState.memory.total_messages || 0) + 1;

  chatState.memory.message_counts[normalized] =
    Number(
      chatState.memory.message_counts[normalized] || 0
    ) + 1;

  await persistMemory(
    "player",
    message,
    null
  );
}

async function addBotMessage(
  text,
  typingDelay
) {
  const finalText = applyMessageVariables(
    String(text || "...")
  );

  const messageElement =
    appendMessageToInterface(
      "algo",
      "",
      null,
      false
    );

  const delay = Math.min(
    Math.max(
      Number(
        typingDelay ??
        chatState.config?.typing_delay_ms ??
        28
      ),
      0
    ),
    80
  );

  for (const character of finalText) {
    messageElement.textContent += character;
    scrollMessagesToBottom();

    if (delay > 0) {
      await wait(delay);
    }
  }

  chatState.memory.history.push({
    role: "algo",
    text: finalText,
    media: null,
    created_at: new Date().toISOString()
  });

  await persistMemory(
    "algo",
    finalText,
    null
  );
}

function chooseDefaultResponse() {
  const responses =
    chatState.config?.default_responses;

  if (!Array.isArray(responses) || !responses.length) {
    return "Não entendi.";
  }

  return responses[
    Math.floor(Math.random() * responses.length)
  ];
}

/* ==========================================================
   ATUALIZAÇÕES E AÇÕES
   ========================================================== */

function mergeChatUpdates(updates) {
  if (
    updates.player_name !== undefined &&
    updates.player_name !== null
  ) {
    chatState.memory.player_name =
      updates.player_name;
  }

  if (updates.awaiting_name !== undefined) {
    chatState.memory.awaiting_name =
      Boolean(updates.awaiting_name);
  }

  if (updates.asked_name !== undefined) {
    chatState.memory.asked_name =
      Boolean(updates.asked_name);
  }

  if (updates.ask_name_at !== undefined) {
    chatState.memory.ask_name_at =
      updates.ask_name_at;
  }

  if (updates.irritation !== undefined) {
    chatState.memory.irritation =
      Number(updates.irritation || 0);
  }

  if (Array.isArray(updates.unlock_flags)) {
    chatState.memory.flags = uniqueStrings([
      ...(chatState.memory.flags || []),
      ...updates.unlock_flags
    ]);
  }

  if (Array.isArray(updates.remove_flags)) {
    chatState.memory.flags =
      chatState.memory.flags.filter(
        (flag) =>
          !updates.remove_flags.includes(flag)
      );
  }

  if (updates.rule_id) {
    const currentUses =
      Number(
        chatState.memory.rule_uses[
          updates.rule_id
        ] || 0
      );

    chatState.memory.rule_uses[
      updates.rule_id
    ] = currentUses + 1;
  }
}

async function executeChatAction(action) {
  switch (action.action_type) {
    case "unlock_flag":
      chatState.memory.flags =
        uniqueStrings([
          ...(chatState.memory.flags || []),
          action.value_text
        ]);
      return;

    case "remove_flag":
      chatState.memory.flags =
        chatState.memory.flags.filter(
          (flag) => flag !== action.value_text
        );
      return;

    case "change_irritation":
      chatState.memory.irritation =
        Number(chatState.memory.irritation || 0) +
        Number(action.value_number || 0);
      return;

    case "set_name":
      chatState.memory.player_name =
        action.value_text || null;
      return;

    case "close_chat":
      window.location.assign("index.html");
      return;

    default:
      if (
        window.FFEffects &&
        typeof window.FFEffects.step === "function"
      ) {
        await window.FFEffects.step({
          action_type: action.action_type,
          duration_ms: action.duration_ms,
          text_content: action.text_content,
          media_url: action.media_url,
          target_url: action.target_url,
          settings: action.settings
        });
      }
  }
}

function configureSoundToggle() {
  updateChatSoundButton();

  chatElements.soundToggle?.addEventListener(
    "click",
    () => {
      const enabled =
        !window.FFAudio.isEnabled();

      window.FFAudio.setEnabled(enabled);

      updateChatSoundButton();
    }
  );

  window.addEventListener(
    "ff-sound-change",
    updateChatSoundButton
  );
}

function updateChatSoundButton() {
  if (!chatElements.soundToggle) {
    return;
  }

  chatElements.soundToggle.textContent =
    `SOM: ${
      window.FFAudio?.isEnabled()
        ? "LIGADO"
        : "DESLIGADO"
    }`;
}

function applyMessageVariables(text) {
  const messageCounts =
    chatState.memory?.message_counts || {};

  const lastPlayerMessage =
    [...(chatState.memory?.history || [])]
      .reverse()
      .find((message) => message.role === "player")
      ?.text || "";

  const normalizedLast =
    normalizeText(lastPlayerMessage);

  const variables = {
    "{nome}":
      chatState.memory?.player_name ||
      "você",

    "{name}":
      chatState.memory?.player_name ||
      "você",

    "{mensagens}":
      String(
        chatState.memory?.total_messages || 0
      ),

    "{irritacao}":
      String(
        chatState.memory?.irritation || 0
      ),

    "{ultima_mensagem}":
      lastPlayerMessage,

    "{repeticoes}":
      String(
        messageCounts[normalizedLast] || 0
      )
  };

  let result = text;

  for (const [token, value] of Object.entries(variables)) {
    result = result
      .split(token)
      .join(value);
  }

  return result;
}

/* ==========================================================
   UTILITÁRIOS
   ========================================================== */

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function uniqueStrings(values) {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map((value) => String(value))
    )
  ];
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(
      resolve,
      Math.max(0, Number(milliseconds || 0))
    );
  });
}

function escapeCSSURL(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "");
}
