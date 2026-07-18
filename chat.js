"use strict";
const client = window.ferasFloresSupabase;
const key = new URLSearchParams(location.search).get("chat") || "algo";
const storeKey = `ff-chat-${key}-v2`;
let cfg, state;
document.addEventListener("DOMContentLoaded", init);
async function init() {
  const { data, error } = await client.rpc("get_secret_chat", {
    p_chat_key: key,
  });
  if (error || !data?.found) {
    document.body.textContent = "Canal inexistente.";
    return;
  }
  cfg = data;
  speaker.textContent = cfg.speaker_name;
  state = load();
  render();
  if (!state.opened) {
    await bot(cfg.opening_message);
    state.opened = true;
    save();
  }
  chatForm.onsubmit = send;
    if (confirm("Apagar a memória deste chat neste navegador?")) {
      localStorage.removeItem(storeKey);
      location.reload();
    }
  };
}
function fresh() {
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
  };
}
function load() {
  try {
    return Object.assign(
      fresh(),
      JSON.parse(localStorage.getItem(storeKey)) || {},
    );
  } catch {
    return fresh();
  }
}
function save() {
  localStorage.setItem(storeKey, JSON.stringify(state));
}
function render() {
  messages.innerHTML = "";
  for (const m of state.history) add(m.role, m.text, m.media, false);
  messages.scrollTop = messages.scrollHeight;
}
async function send(e) {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg) return;
  chatInput.value = "";
  add("player", msg);
  state.history.push({ role: "player", text: msg });
  const n = norm(msg);
  state.total_messages++;
  state.message_counts[n] = (state.message_counts[n] || 0) + 1;
  save();
  typing.hidden = false;
  chatInput.disabled = true;
  const { data, error } = await client.rpc("resolve_chat_message", {
    p_chat_key: key,
    p_message: msg,
    p_state: state,
  });
  const delay =
    data?.updates?.response_delay_ms ?? cfg.response_delay_ms ?? 600;
  await new Promise((r) => setTimeout(r, delay));
  typing.hidden = true;
  chatInput.disabled = false;
  chatInput.focus();
  if (error || !data?.found) {
    await bot("...");
    return;
  }
  merge(data.updates || {});
  await bot(data.response || "...", data.updates?.typing_delay_ms);
  for (const a of data.actions || []) await runAction(a);
  save();
}
function merge(u) {
  if (u.player_name) state.player_name = u.player_name;
  if (u.awaiting_name !== undefined) state.awaiting_name = u.awaiting_name;
  if (u.asked_name !== undefined) state.asked_name = u.asked_name;
  if (u.ask_name_at) state.ask_name_at = u.ask_name_at;
  if (u.irritation !== undefined) state.irritation = u.irritation;
  if (u.unlock_flags)
    state.flags = [...new Set([...(state.flags || []), ...u.unlock_flags])];
  if (u.remove_flags)
    state.flags = state.flags.filter((x) => !u.remove_flags.includes(x));
  if (u.rule_id)
    state.rule_uses[u.rule_id] = (state.rule_uses[u.rule_id] || 0) + 1;
}
async function bot(text, typingDelay = 28) {
  const final = String(text || "");
  const el = add("algo", "");
  for (const ch of final) {
    el.textContent += ch;
    messages.scrollTop = messages.scrollHeight;
    await new Promise((r) => setTimeout(r, Math.min(typingDelay || 28, 60)));
  }
  state.history.push({ role: "algo", text: final });
  save();
}
function add(role, text, media, scroll = true) {
  const el = document.createElement("div");
  el.className = `message ${role}`;
  el.textContent = text || "";
  if (media) {
    const img = document.createElement("img");
    img.src = media;
    el.appendChild(img);
  }
  messages.appendChild(el);
  if (scroll) messages.scrollTop = messages.scrollHeight;
  return el;
}
async function runAction(a) {
  if (a.action_type === "unlock_flag") {
    state.flags = [...new Set([...state.flags, a.value_text])];
    return;
  }
  if (a.action_type === "remove_flag") {
    state.flags = state.flags.filter((x) => x !== a.value_text);
    return;
  }
  if (a.action_type === "change_irritation") {
    state.irritation += Number(a.value_number || 0);
    return;
  }
  if (a.action_type === "set_name") {
    state.player_name = a.value_text;
    return;
  }
  if (a.action_type === "close_chat") {
    location.href = "index.html";
    return;
  }
  await FFEffects.step({
    action_type: a.action_type,
    duration_ms: a.duration_ms,
    text_content: a.text_content,
    media_url: a.media_url,
    target_url: a.target_url,
    settings: a.settings,
  });
}
function norm(v) {
  return String(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
