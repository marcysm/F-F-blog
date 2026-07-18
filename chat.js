"use strict";

/* ==========================================================
   FERAS E FLORES — CHAT SECRETO
   ========================================================== */

const chatClient = window.ferasFloresSupabase;
const chatKey =
  new URLSearchParams(window.location.search).get("chat") || "algo";
const chatStoreKey = `ff-chat-${chatKey}-v2`;

const chatElements = {
  shell: document.getElementById("chatShell"),
  speaker: document.getElementById("speaker"),
  messages: document.getElementById("messages"),
  typing: document.getElementById("typing"),
  form: document.getElementById("chatForm"),
  input: document.getElementById("chatInput"),
  reset: document.getElementById("resetChat")
};

let chatConfig = null;
let chatState = null;
let sending = false;

window.addEventListener("DOMContentLoaded", initializeChat);

async function initializeChat() {
  if (!chatClient) {
    showFatalChatError("O canal não conseguiu se conectar ao arquivo.");
    return;
  }

  const { data, error } = await chatClient.rpc("get_secret_chat", {
    p_chat_key: chatKey
  });

  if (error || !data?.found) {
    console.error("Canal não encontrado:", error);
    showFatalChatError("Canal inexistente.");
    return;
  }

  chatConfig = data;
  chatState = loadChatState();

  if (chatElements.speaker) {
    chatElements.speaker.textContent =
      chatConfig.speaker_name || "Algo";
  }

  renderChatHistory();
  configureChatEvents();

  if (!chatState.opened) {
    await sendBotMessage(chatConfig.opening_message || "...");
    chatState.opened = true;
    saveChatState();
  }

  chatElements.input?.focus();
}

function configureChatEvents() {
  chatElements.form?.addEventListener("submit", handlePlayerMessage);

  chatElements.reset?.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Apagar a memória deste chat neste navegador?"
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(chatStoreKey);
    window.location.reload();
  });
}

function createFreshChatState() {
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
    awaiting_name: false
  };
}

function loadChatState() {
  try {
    const saved = JSON.parse(localStorage.getItem(chatStoreKey));
    return Object.assign(createFreshChatState(), saved || {});
  } catch (error) {
    console.warn("Memória do chat inválida.", error);
    return createFreshChatState();
  }
}

function saveChatState() {
  localStorage.setItem(chatStoreKey, JSON.stringify(chatState));
}

function renderChatHistory() {
  if (!chatElements.messages) {
    return;
  }

  chatElements.messages.innerHTML = "";

  for (const message of chatState.history || []) {
    addMessageElement(
      message.role,
      message.text,
      message.media,
      false
    );
  }

  scrollChatToBottom();
}

async function handlePlayerMessage(event) {
  event.preventDefault();

  if (sending) {
    return;
  }

  const message = chatElements.input?.value.trim() || "";

  if (!message) {
    return;
  }

  sending = true;
  setChatBusy(true);

  try {
    chatElements.input.value = "";

    addMessageElement("player", message);
    chatState.history.push({ role: "player", text: message });

    const normalizedMessage = normalizeText(message);
    chatState.total_messages = Number(chatState.total_messages || 0) + 1;
    chatState.message_counts[normalizedMessage] =
      Number(chatState.message_counts[normalizedMessage] || 0) + 1;

    saveChatState();

    const { data, error } = await chatClient.rpc(
      "resolve_chat_message",
      {
        p_chat_key: chatKey,
        p_message: message,
        p_state: chatState
      }
    );

    const responseDelay = Number(
      data?.updates?.response_delay_ms ??
      chatConfig.response_delay_ms ??
      600
    );

    await window.FFEffects.wait(responseDelay);

    if (error || !data?.found) {
      console.error("Resposta do chat indisponível:", error);
      await sendBotMessage("...");
      return;
    }

    mergeChatUpdates(data.updates || {});

    await sendBotMessage(
      data.response || "...",
      data.updates?.typing_delay_ms
    );

    for (const action of data.actions || []) {
      await runChatAction(action);
    }

    saveChatState();
  } finally {
    sending = false;
    setChatBusy(false);
    chatElements.input?.focus();
  }
}

function mergeChatUpdates(updates) {
  if (updates.player_name) {
    chatState.player_name = updates.player_name;
  }

  if (updates.awaiting_name !== undefined) {
    chatState.awaiting_name = updates.awaiting_name;
  }

  if (updates.asked_name !== undefined) {
    chatState.asked_name = updates.asked_name;
  }

  if (updates.ask_name_at !== undefined) {
    chatState.ask_name_at = updates.ask_name_at;
  }

  if (updates.irritation !== undefined) {
    chatState.irritation = updates.irritation;
  }

  if (updates.unlock_flags) {
    chatState.flags = [
      ...new Set([
        ...(chatState.flags || []),
        ...updates.unlock_flags
      ])
    ];
  }

  if (updates.remove_flags) {
    chatState.flags = (chatState.flags || []).filter(
      (flag) => !updates.remove_flags.includes(flag)
    );
  }

  if (updates.rule_id) {
    chatState.rule_uses[updates.rule_id] =
      Number(chatState.rule_uses[updates.rule_id] || 0) + 1;
  }
}

async function sendBotMessage(text, typingDelay = 28) {
  const finalText = String(text || "");
  const element = addMessageElement("algo", "");
  const delay = Math.min(Number(typingDelay || 28), 60);

  for (const character of finalText) {
    element.textContent += character;
    scrollChatToBottom();
    await window.FFEffects.wait(delay);
  }

  chatState.history.push({ role: "algo", text: finalText });
  saveChatState();
}

function addMessageElement(role, text, media, scroll = true) {
  const element = document.createElement("div");
  element.className = `message ${role}`;
  element.textContent = text || "";

  if (media) {
    const image = document.createElement("img");
    image.src = media;
    image.alt = "";
    element.appendChild(image);
  }

  chatElements.messages?.appendChild(element);

  if (scroll) {
    scrollChatToBottom();
  }

  return element;
}

function scrollChatToBottom() {
  if (chatElements.messages) {
    chatElements.messages.scrollTop =
      chatElements.messages.scrollHeight;
  }
}

function setChatBusy(busy) {
  if (chatElements.typing) {
    chatElements.typing.hidden = !busy;
  }

  if (chatElements.input) {
    chatElements.input.disabled = busy;
  }

  const submitButton = chatElements.form?.querySelector(
    'button[type="submit"]'
  );

  if (submitButton) {
    submitButton.disabled = busy;
  }
}

async function runChatAction(action) {
  switch (action.action_type) {
    case "unlock_flag":
      chatState.flags = [
        ...new Set([...(chatState.flags || []), action.value_text])
      ];
      return;

    case "remove_flag":
      chatState.flags = (chatState.flags || []).filter(
        (flag) => flag !== action.value_text
      );
      return;

    case "change_irritation":
      chatState.irritation =
        Number(chatState.irritation || 0) +
        Number(action.value_number || 0);
      return;

    case "set_name":
      chatState.player_name = action.value_text;
      return;

    case "close_chat":
      window.location.href = "index.html";
      return;

    default:
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

function showFatalChatError(message) {
  document.body.innerHTML = `
    <main class="chat-error">
      <p>${escapeHTML(message)}</p>
      <a href="index.html">VOLTAR AO ARQUIVO</a>
    </main>
  `;
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
