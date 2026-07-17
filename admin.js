"use strict";

/* ==========================================================
   FERAS E FLORES
   AUTENTICAÇÃO E PAINEL ADMINISTRATIVO
   ========================================================== */

const adminState = {
  client: window.ferasFloresSupabase,
  user: null,
  admin: null,
  page: document.body?.dataset?.page || ""
};

/* ==========================================================
   INICIALIZAÇÃO
   ========================================================== */

document.addEventListener("DOMContentLoaded", iniciarAreaAdministrativa);

async function iniciarAreaAdministrativa() {
  if (!adminState.client) {
    tratarSupabaseNaoConfigurado();
    return;
  }

  if (adminState.page === "login") {
    await iniciarPaginaLogin();
    return;
  }

  if (adminState.page === "admin") {
    await iniciarPainelAdmin();
  }
}

/* ==========================================================
   PÁGINA DE LOGIN
   ========================================================== */

async function iniciarPaginaLogin() {
  configurarMostrarSenha();
  configurarFormularioLogin();

  /*
    Se a pessoa já estiver autenticada e autorizada,
    não precisa fazer login novamente.
  */

  const usuarioAtual = await obterUsuarioAutenticado();

  if (!usuarioAtual) {
    return;
  }

  const administrador = await buscarAdministrador(usuarioAtual.id);

  if (administrador?.is_active) {
    window.location.replace("admin.html");
    return;
  }

  /*
    Existe uma sessão, mas não existe autorização administrativa.
    Encerramos essa sessão para não deixar o usuário preso.
  */

  await adminState.client.auth.signOut();
}

function configurarMostrarSenha() {
  const button = document.getElementById("toggle-password");
  const input = document.getElementById("login-password");

  if (!button || !input) {
    return;
  }

  button.addEventListener("click", () => {
    const estaOculta = input.type === "password";

    input.type = estaOculta ? "text" : "password";
    button.textContent = estaOculta ? "Ocultar" : "Mostrar";

    button.setAttribute(
      "aria-label",
      estaOculta ? "Ocultar senha" : "Mostrar senha"
    );
  });
}

function configurarFormularioLogin() {
  const form = document.getElementById("login-form");

  if (!form) {
    return;
  }

  form.addEventListener("submit", executarLogin);
}

async function executarLogin(event) {
  event.preventDefault();

  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");

  const email = emailInput?.value?.trim() || "";
  const password = passwordInput?.value || "";

  esconderMensagemLogin();

  if (!email || !password) {
    mostrarMensagemLogin(
      "Preencha o email e a senha para continuar."
    );

    return;
  }

  definirLoginCarregando(true);

  try {
    const { data, error } =
      await adminState.client.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    const user = data?.user;

    if (!user) {
      throw new Error(
        "O Supabase não devolveu os dados do usuário."
      );
    }

    const administrator = await buscarAdministrador(user.id);

    if (!administrator) {
      await adminState.client.auth.signOut();

      mostrarMensagemLogin(
        "Esta conta existe, mas não possui autorização administrativa."
      );

      return;
    }

    if (!administrator.is_active) {
      await adminState.client.auth.signOut();

      mostrarMensagemLogin(
        "Esta conta administrativa está desativada."
      );

      return;
    }

    mostrarMensagemLogin(
      "Acesso autorizado. Abrindo o painel...",
      "success"
    );

    window.setTimeout(() => {
      window.location.replace("admin.html");
    }, 350);
  } catch (error) {
    console.error("Erro no login:", error);

    mostrarMensagemLogin(traduzirErroLogin(error));
  } finally {
    definirLoginCarregando(false);
  }
}

function traduzirErroLogin(error) {
  const message = String(error?.message || "").toLowerCase();

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return "Email ou senha incorretos.";
  }

  if (message.includes("email not confirmed")) {
    return "Este email ainda não foi confirmado no Supabase.";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network")
  ) {
    return "Não foi possível conectar ao Supabase. Confira sua internet e o arquivo config.js.";
  }

  return "Não foi possível entrar. Confira os dados e tente novamente.";
}

function definirLoginCarregando(carregando) {
  const button = document.getElementById("login-button");
  const text = button?.querySelector(".button-text");
  const loader = button?.querySelector(".button-loader");

  if (!button) {
    return;
  }

  button.disabled = carregando;

  if (text) {
    text.textContent = carregando
      ? "Verificando..."
      : "Entrar";
  }

  if (loader) {
    loader.hidden = !carregando;
  }
}

function mostrarMensagemLogin(message, type = "error") {
  const container = document.getElementById("login-message");

  if (!container) {
    return;
  }

  container.hidden = false;
  container.dataset.type = type;
  container.textContent = message;
}

function esconderMensagemLogin() {
  const container = document.getElementById("login-message");

  if (!container) {
    return;
  }

  container.hidden = true;
  container.textContent = "";
  delete container.dataset.type;
}

/* ==========================================================
   PAINEL ADMINISTRATIVO
   ========================================================== */

async function iniciarPainelAdmin() {
  configurarSidebar();
  configurarLogout();

  atualizarMensagemAutorizacao(
    "Confirmando a identidade da conta..."
  );

  try {
    const user = await obterUsuarioAutenticado();

    if (!user) {
      redirecionarParaLogin();
      return;
    }

    adminState.user = user;

    atualizarMensagemAutorizacao(
      "Verificando a autorização administrativa..."
    );

    const administrator = await buscarAdministrador(user.id);

    if (!administrator || !administrator.is_active) {
      await adminState.client.auth.signOut();
      redirecionarParaLogin("unauthorized");
      return;
    }

    adminState.admin = administrator;

    preencherDadosAdministrador();
    exibirPainel();

    await carregarContadores();

    observarMudancasDeAutenticacao();
  } catch (error) {
    console.error(
      "Falha durante a autorização do painel:",
      error
    );

    mostrarErroAutorizacao(
      "Não foi possível confirmar sua autorização. Atualize a página ou volte ao login."
    );
  }
}

async function obterUsuarioAutenticado() {
  /*
    getUser realiza uma consulta ao servidor de autenticação,
    evitando confiar somente em dados locais.
  */

  try {
    const {
      data: { user },
      error
    } = await adminState.client.auth.getUser();

    if (error) {
      return null;
    }

    return user || null;
  } catch (error) {
    console.error("Erro ao consultar o usuário:", error);
    return null;
  }
}

async function buscarAdministrador(userId) {
  if (!userId) {
    return null;
  }

  try {
    const { data, error } = await adminState.client
      .from("blog_admins")
      .select(`
        id,
        user_id,
        display_name,
        role,
        is_active,
        created_at,
        updated_at
      `)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error(
      "Erro ao verificar a tabela blog_admins:",
      error
    );

    throw error;
  }
}

function preencherDadosAdministrador() {
  const displayName =
    adminState.admin?.display_name ||
    adminState.user?.email?.split("@")[0] ||
    "Administrador";

  const email =
    adminState.user?.email ||
    "Email não informado";

  const role =
    adminState.admin?.role ||
    "admin";

  const nameElement =
    document.getElementById("admin-display-name");

  const emailElement =
    document.getElementById("admin-email");

  const avatarElement =
    document.getElementById("admin-avatar");

  const roleElement =
    document.getElementById("admin-role");

  if (nameElement) {
    nameElement.textContent = displayName;
  }

  if (emailElement) {
    emailElement.textContent = email;
  }

  if (avatarElement) {
    avatarElement.textContent =
      displayName.charAt(0).toUpperCase();
  }

  if (roleElement) {
    roleElement.textContent = role;
  }
}

function exibirPainel() {
  const authorizationScreen =
    document.getElementById("authorization-screen");

  const app =
    document.getElementById("admin-app");

  if (authorizationScreen) {
    authorizationScreen.hidden = true;
  }

  if (app) {
    app.hidden = false;
  }
}

function atualizarMensagemAutorizacao(message) {
  const element =
    document.getElementById("authorization-message");

  if (element) {
    element.textContent = message;
  }
}

function mostrarErroAutorizacao(message) {
  atualizarMensagemAutorizacao(message);

  const loader = document.querySelector(
    "#authorization-screen .large-loader"
  );

  if (loader) {
    loader.hidden = true;
  }
}

/* ==========================================================
   CONTADORES DO PAINEL
   ========================================================== */

async function carregarContadores() {
  const queries = [
    contarTabela("blog_posts", "posts-count"),
    contarTabela("blog_characters", "characters-count"),
    contarTabela("blog_resources", "resources-count"),
    contarTabela(
      "blog_secret_events",
      "events-count",
      (query) => query.eq("status", "active")
    )
  ];

  await Promise.allSettled(queries);
}

async function contarTabela(
  tableName,
  elementId,
  modificarConsulta = null
) {
  const element = document.getElementById(elementId);

  try {
    let query = adminState.client
      .from(tableName)
      .select("*", {
        count: "exact",
        head: true
      });

    if (typeof modificarConsulta === "function") {
      query = modificarConsulta(query);
    }

    const { count, error } = await query;

    if (error) {
      throw error;
    }

    if (element) {
      element.textContent = String(count ?? 0);
    }
  } catch (error) {
    console.error(
      `Não foi possível contar ${tableName}:`,
      error
    );

    if (element) {
      element.textContent = "!";
      element.title = "Não foi possível carregar este contador.";
    }
  }
}

/* ==========================================================
   LOGOUT
   ========================================================== */

function configurarLogout() {
  const button = document.getElementById("logout-button");

  if (!button) {
    return;
  }

  button.addEventListener("click", executarLogout);
}

async function executarLogout() {
  const button = document.getElementById("logout-button");

  if (button) {
    button.disabled = true;
    button.textContent = "Saindo...";
  }

  try {
    await adminState.client.auth.signOut({
      scope: "local"
    });
  } catch (error) {
    console.error("Erro ao sair:", error);
  } finally {
    window.location.replace("login.html");
  }
}

/* ==========================================================
   OBSERVAR ALTERAÇÕES DE SESSÃO
   ========================================================== */

function observarMudancasDeAutenticacao() {
  adminState.client.auth.onAuthStateChange((event, session) => {
    if (
      event === "SIGNED_OUT" ||
      !session
    ) {
      redirecionarParaLogin();
    }
  });
}

/* ==========================================================
   SIDEBAR
   ========================================================== */

function configurarSidebar() {
  const sidebar = document.getElementById("admin-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const openButton = document.getElementById("open-sidebar");
  const closeButton = document.getElementById("close-sidebar");

  if (!sidebar || !overlay) {
    return;
  }

  function abrirSidebar() {
    sidebar.classList.add("is-open");
    overlay.classList.add("is-visible");
    document.body.style.overflow = "hidden";
  }

  function fecharSidebar() {
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-visible");
    document.body.style.overflow = "";
  }

  openButton?.addEventListener("click", abrirSidebar);
  closeButton?.addEventListener("click", fecharSidebar);
  overlay.addEventListener("click", fecharSidebar);

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      fecharSidebar();
    }
  });
}

/* ==========================================================
   REDIRECIONAMENTOS E ERROS
   ========================================================== */

function redirecionarParaLogin(reason = "") {
  const suffix = reason
    ? `?reason=${encodeURIComponent(reason)}`
    : "";

  window.location.replace(`login.html${suffix}`);
}

function tratarSupabaseNaoConfigurado() {
  const message =
    "O Supabase não foi configurado. Abra config.js e coloque a URL e a chave pública do projeto.";

  if (adminState.page === "login") {
    mostrarMensagemLogin(message);
    return;
  }

  mostrarErroAutorizacao(message);
}
