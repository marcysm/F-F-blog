"use strict";

/* ==========================================================
   FERAS E FLORES — LOGIN E ADMIN
   Inicialização sem loop de redirecionamento.
   ========================================================== */

const adminState = {
  client: window.ferasFloresSupabase,
  page: document.body?.dataset?.page || "",
  user: null,
  admin: null,
  authorizationStarted: false
};

document.addEventListener("DOMContentLoaded", initializeAdminArea);

async function initializeAdminArea() {
  clearSensitiveQueryParameters();

  if (adminState.page === "login") {
    configurePasswordToggle();
    configureLoginForm();

    if (!adminState.client) {
      showLoginMessage(
        "O Supabase não foi configurado ou a biblioteca não foi carregada."
      );
      disableLoginButton();
      return;
    }

    await redirectAuthorizedSessionFromLogin();
    return;
  }

  if (adminState.page === "admin") {
    configureAdminInterface();

    if (!adminState.client) {
      showAuthorizationError(
        "O Supabase não foi configurado ou a biblioteca não foi carregada."
      );
      return;
    }

    await authorizeAdminOnce();
  }
}

/* ==========================================================
   LOGIN
   ========================================================== */

function configurePasswordToggle() {
  const button = document.getElementById("toggle-password");
  const input = document.getElementById("login-password");

  if (!button || !input) {
    return;
  }

  button.addEventListener("click", () => {
    const hidden = input.type === "password";

    input.type = hidden ? "text" : "password";
    button.textContent = hidden ? "OCULTAR" : "MOSTRAR";
  });
}

function configureLoginForm() {
  const form = document.getElementById("login-form");

  if (!form) {
    return;
  }

  form.addEventListener("submit", executeLogin);
}

async function executeLogin(event) {
  event.preventDefault();

  const email =
    document.getElementById("login-email")?.value?.trim() || "";

  const password =
    document.getElementById("login-password")?.value || "";

  hideLoginMessage();

  if (!email || !password) {
    showLoginMessage("Preencha o email e a senha.");
    return;
  }

  setLoginLoading(true);

  try {
    const loginResult = await withTimeout(
      adminState.client.auth.signInWithPassword({
        email,
        password
      }),
      12000,
      "O Supabase demorou demais para responder ao login."
    );

    const { data, error } = loginResult;

    if (error) {
      throw error;
    }

    const user = data?.user;

    if (!user) {
      throw new Error("A sessão não devolveu um usuário.");
    }

    const admin = await fetchAdminRecord(user.id);

    if (!admin || !admin.is_active) {
      await safeSignOut();

      showLoginMessage(
        admin
          ? "Esta conta administrativa está desativada."
          : "Esta conta existe, mas não está autorizada em blog_admins."
      );

      return;
    }

    showLoginMessage(
      "AUTORIZAÇÃO CONFIRMADA. ABRINDO O PAINEL...",
      "success"
    );

    window.setTimeout(() => {
      window.location.replace("admin.html");
    }, 350);
  } catch (error) {
    console.error("Falha no login:", error);

    showLoginMessage(translateLoginError(error));
  } finally {
    setLoginLoading(false);
  }
}

async function redirectAuthorizedSessionFromLogin() {
  try {
    const session = await getSessionWithTimeout();

    if (!session?.user) {
      return;
    }

    const admin = await fetchAdminRecord(session.user.id);

    if (admin?.is_active) {
      window.location.replace("admin.html");
      return;
    }

    await safeSignOut();
  } catch (error) {
    console.warn("Sessão anterior ignorada:", error);
  }
}

function translateLoginError(error) {
  const message = String(error?.message || "").toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Email ou senha incorretos.";
  }

  if (message.includes("email not confirmed")) {
    return "O email ainda não foi confirmado.";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network")
  ) {
    return "Não foi possível conectar ao Supabase.";
  }

  if (message.includes("demorou demais")) {
    return "O Supabase demorou demais para responder. Tente novamente.";
  }

  return "Não foi possível autenticar a conta.";
}

function setLoginLoading(loading) {
  const button = document.getElementById("login-button");
  const text = button?.querySelector(".button-text");
  const loader = button?.querySelector(".button-loader");

  if (!button) {
    return;
  }

  button.disabled = loading;

  if (text) {
    text.textContent = loading
      ? "VERIFICANDO..."
      : "AUTENTICAR";
  }

  if (loader) {
    loader.hidden = !loading;
  }
}

function disableLoginButton() {
  const button = document.getElementById("login-button");

  if (button) {
    button.disabled = true;
  }
}

function showLoginMessage(message, type = "error") {
  const element = document.getElementById("login-message");

  if (!element) {
    return;
  }

  element.hidden = false;
  element.dataset.type = type;
  element.textContent = message;
}

function hideLoginMessage() {
  const element = document.getElementById("login-message");

  if (!element) {
    return;
  }

  element.hidden = true;
  element.textContent = "";
  delete element.dataset.type;
}

/* ==========================================================
   AUTORIZAÇÃO DO PAINEL
   ========================================================== */

async function authorizeAdminOnce() {
  if (adminState.authorizationStarted) {
    return;
  }

  adminState.authorizationStarted = true;

  resetAuthorizationScreen();
  updateAuthorizationMessage("Lendo a sessão administrativa...");

  try {
    const session = await getSessionWithTimeout();

    if (!session?.user) {
      window.location.replace("login.html?reason=session");
      return;
    }

    adminState.user = session.user;

    updateAuthorizationMessage(
      "Consultando a autorização em blog_admins..."
    );

    const admin = await fetchAdminRecord(session.user.id);

    if (!admin || !admin.is_active) {
      await safeSignOut();
      window.location.replace("login.html?reason=unauthorized");
      return;
    }

    adminState.admin = admin;

    populateAdminIdentity();
    revealAdminApp();

    await loadDashboardCounts();
  } catch (error) {
    console.error("Falha de autorização:", error);

    showAuthorizationError(
      String(error?.message || "").includes("demorou demais")
        ? "A verificação demorou demais. A conexão pode estar instável."
        : "Não foi possível confirmar a autorização administrativa."
    );
  }
}

async function getSessionWithTimeout() {
  const result = await withTimeout(
    adminState.client.auth.getSession(),
    10000,
    "A leitura da sessão demorou demais."
  );

  if (result.error) {
    throw result.error;
  }

  return result.data?.session || null;
}

async function fetchAdminRecord(userId) {
  if (!userId) {
    return null;
  }

  const result = await withTimeout(
    adminState.client
      .from("blog_admins")
      .select(`
        id,
        user_id,
        display_name,
        role,
        is_active
      `)
      .eq("user_id", userId)
      .maybeSingle(),
    10000,
    "A consulta de autorização demorou demais."
  );

  if (result.error) {
    throw result.error;
  }

  return result.data || null;
}

function revealAdminApp() {
  const screen = document.getElementById("authorization-screen");
  const app = document.getElementById("admin-app");

  if (screen) {
    screen.hidden = true;
  }

  if (app) {
    app.hidden = false;
  }
}

function populateAdminIdentity() {
  const displayName =
    adminState.admin?.display_name ||
    adminState.user?.email?.split("@")[0] ||
    "ADMINISTRADOR";

  const email =
    adminState.user?.email ||
    "EMAIL NÃO INFORMADO";

  const role =
    adminState.admin?.role ||
    "admin";

  const nameElement = document.getElementById("admin-display-name");
  const emailElement = document.getElementById("admin-email");
  const roleElement = document.getElementById("admin-role");

  if (nameElement) {
    nameElement.textContent = displayName.toUpperCase();
  }

  if (emailElement) {
    emailElement.textContent = email;
  }

  if (roleElement) {
    roleElement.textContent = role.toUpperCase();
  }
}

function updateAuthorizationMessage(message) {
  const element =
    document.getElementById("authorization-message");

  if (element) {
    element.textContent = message;
  }
}

function resetAuthorizationScreen() {
  const loader =
    document.querySelector("#authorization-screen .large-loader");

  const retry =
    document.getElementById("authorization-retry");

  const loginLink =
    document.getElementById("authorization-login-link");

  if (loader) {
    loader.hidden = false;
  }

  if (retry) {
    retry.hidden = true;
  }

  if (loginLink) {
    loginLink.hidden = true;
  }
}

function showAuthorizationError(message) {
  adminState.authorizationStarted = false;

  updateAuthorizationMessage(message);

  const loader =
    document.querySelector("#authorization-screen .large-loader");

  const retry =
    document.getElementById("authorization-retry");

  const loginLink =
    document.getElementById("authorization-login-link");

  if (loader) {
    loader.hidden = true;
  }

  if (retry) {
    retry.hidden = false;
  }

  if (loginLink) {
    loginLink.hidden = false;
  }
}

/* ==========================================================
   PAINEL
   ========================================================== */

function configureAdminInterface() {
  configureSidebar();
  configureNavigation();
  configureLogout();

  document
    .getElementById("authorization-retry")
    ?.addEventListener("click", authorizeAdminOnce);
}

function configureSidebar() {
  const sidebar = document.getElementById("admin-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const openButton = document.getElementById("sidebar-open");

  if (!sidebar || !overlay || !openButton) {
    return;
  }

  function openSidebar() {
    sidebar.classList.add("is-open");
    overlay.classList.add("is-visible");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-visible");
    document.body.style.overflow = "";
  }

  openButton.addEventListener("click", openSidebar);
  overlay.addEventListener("click", closeSidebar);

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", closeSidebar);
  });
}

function configureNavigation() {
  const metadata = {
    overview: {
      title: "VISÃO GERAL",
      kicker: "PAINEL ADMINISTRATIVO"
    },
    posts: {
      title: "REGISTROS",
      description:
        "O editor completo de registros será conectado na próxima etapa."
    },
    characters: {
      title: "PERSONAGENS",
      description:
        "O cadastro completo de personagens será conectado na próxima etapa."
    },
    search: {
      title: "PESQUISA",
      description:
        "O editor de palavras, aliases, códigos e resultados será conectado na próxima etapa."
    },
    events: {
      title: "EVENTOS",
      description:
        "O editor de glitches, apagões, sons e sequências será conectado na próxima etapa."
    },
    media: {
      title: "MÍDIA",
      description:
        "O gerenciador de imagens, sons e animações será conectado na próxima etapa."
    },
    settings: {
      title: "CONFIGURAÇÕES",
      description:
        "As configurações gerais do arquivo serão conectadas na próxima etapa."
    }
  };

  function openSection(section) {
    const overview =
      document.getElementById("overview-section");

    const placeholder =
      document.getElementById("placeholder-section");

    const pageTitle =
      document.getElementById("admin-page-title");

    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.section === section
      );
    });

    if (section === "overview") {
      overview.hidden = false;
      placeholder.hidden = true;

      if (pageTitle) {
        pageTitle.textContent = "VISÃO GERAL";
      }

      return;
    }

    const item = metadata[section] || metadata.settings;

    overview.hidden = true;
    placeholder.hidden = false;

    document.getElementById("placeholder-kicker").textContent =
      "MÓDULO DO ARQUIVO";

    document.getElementById("placeholder-title").textContent =
      item.title;

    document.getElementById("placeholder-description").textContent =
      item.description;

    if (pageTitle) {
      pageTitle.textContent = item.title;
    }
  }

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      openSection(button.dataset.section || "overview");
    });
  });

  document.querySelectorAll("[data-open-section]").forEach((button) => {
    button.addEventListener("click", () => {
      openSection(button.dataset.openSection || "overview");
    });
  });

  document
    .getElementById("back-overview-button")
    ?.addEventListener("click", () => {
      openSection("overview");
    });
}

async function loadDashboardCounts() {
  await Promise.allSettled([
    loadCount("blog_posts", "posts-count"),
    loadCount("blog_characters", "characters-count"),
    loadCount("blog_search_entries", "search-count"),
    loadCount(
      "blog_secret_events",
      "events-count",
      (query) => query.eq("status", "active")
    )
  ]);
}

async function loadCount(table, elementId, modify = null) {
  const element = document.getElementById(elementId);

  try {
    let query = adminState.client
      .from(table)
      .select("*", {
        count: "exact",
        head: true
      });

    if (typeof modify === "function") {
      query = modify(query);
    }

    const result = await withTimeout(
      query,
      10000,
      `A contagem de ${table} demorou demais.`
    );

    if (result.error) {
      throw result.error;
    }

    if (element) {
      element.textContent = String(result.count ?? 0);
    }
  } catch (error) {
    console.warn(`Contador ${table}:`, error);

    if (element) {
      element.textContent = "!";
    }
  }
}

function configureLogout() {
  document
    .getElementById("logout-button")
    ?.addEventListener("click", async () => {
      await safeSignOut();
      window.location.replace("login.html");
    });
}

async function safeSignOut() {
  try {
    await withTimeout(
      adminState.client.auth.signOut({ scope: "local" }),
      7000,
      "O encerramento da sessão demorou demais."
    );
  } catch (error) {
    console.warn("Falha ao encerrar sessão:", error);
  }
}

/* ==========================================================
   UTILITÁRIOS
   ========================================================== */

function clearSensitiveQueryParameters() {
  const url = new URL(window.location.href);

  const sensitiveKeys = ["email", "password"];

  let changed = false;

  sensitiveKeys.forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  });

  if (!changed) {
    return;
  }

  const clean =
    url.pathname +
    (url.search ? url.search : "") +
    url.hash;

  window.history.replaceState({}, document.title, clean);
}

function withTimeout(promise, milliseconds, timeoutMessage) {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, milliseconds);
  });

  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timeoutId);
  });
}
