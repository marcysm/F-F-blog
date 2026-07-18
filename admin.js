"use strict";
const A = {
  client: window.ferasFloresSupabase,
  user: null,
  admin: null,
  section: 'overview',
  cache: {}
};
const defs = {
  posts: {
    title: 'REGISTROS',
    table: 'blog_posts',
    label: 'title',
    desc: 'excerpt',
    fields: [
      ['title', 'Título', 'text', 1],
      ['slug', 'Slug', 'text'],
      ['category_id', 'Categoria', 'select:categories'],
      ['author_name', 'Autor', 'text'],
      ['excerpt', 'Resumo', 'textarea', 1],
      ['content', 'Conteúdo', 'textarea', 1],
      ['cover_image_url', 'Imagem de capa', 'text'],
      ['featured_audio_url', 'Áudio', 'text'],
      ['featured_video_url', 'Vídeo', 'text'],
      ['status', 'Status', 'select:draft|published|hidden|archived'],
      ['is_featured', 'Destaque', 'checkbox'],
      ['published_at', 'Publicar em', 'datetime-local'],
      ['tags', 'Tags (vírgulas)', 'array']
    ]
  },
  characters: {
    title: 'PERSONAGENS',
    table: 'blog_characters',
    label: 'name',
    desc: 'subtitle',
    fields: [
      ['name', 'Nome', 'text', 1],
      ['slug', 'Slug', 'text'],
      ['subtitle', 'Subtítulo', 'text'],
      ['character_type', 'Tipo', 'text'],
      ['public_description', 'Descrição pública', 'textarea', 1],
      ['full_content', 'Conteúdo completo', 'textarea', 1],
      ['portrait_url', 'Retrato', 'text'],
      ['banner_url', 'Banner', 'text'],
      ['audio_url', 'Áudio', 'text'],
      ['aliases', 'Aliases (vírgulas)', 'array', 1],
      ['status', 'Status', 'select:draft|published|hidden|archived'],
      ['is_secret', 'Secreto', 'checkbox'],
      ['reveal_message', 'Mensagem de revelação', 'textarea', 1],
      ['sort_order', 'Ordem', 'number']
    ]
  },
  search: {
    title: 'PESQUISA',
    table: 'blog_search_entries',
    label: 'search_term',
    desc: 'entry_type',
    fields: [
      ['search_term', 'Termo principal', 'text', 1],
      ['aliases', 'Aliases (vírgulas)', 'array', 1],
      ['entry_type', 'Tipo',
        'select:message|character|post|resource|chat|secret_page|redirect'
      ],
      ['match_mode', 'Correspondência', 'select:exact|contains|starts_with|approximate'],
      ['priority', 'Prioridade', 'number'],
      ['post_id', 'Registro ligado', 'select:posts'],
      ['character_id', 'Personagem ligado', 'select:characters'],
      ['resource_id', 'Recurso ligado', 'select:resources'],
      ['chat_id', 'Chat ligado', 'select:chats'],
      ['secret_page_id', 'Página secreta', 'select:pages'],
      ['secret_event_id', 'Evento ligado', 'select:events'],
      ['destination_url', 'URL de destino', 'text'],
      ['response_title', 'Título da resposta', 'text'],
      ['response_message', 'Mensagem', 'textarea', 1],
      ['response_image_url', 'Imagem', 'text'],
      ['response_audio_url', 'Áudio', 'text'],
      ['required_flags', 'Flags obrigatórias', 'array'],
      ['blocked_flags', 'Flags bloqueadas', 'array'],
      ['unlock_flags', 'Flags desbloqueadas', 'array'],
      ['min_search_count', 'Mínimo de buscas', 'number'],
      ['max_search_count', 'Máximo de buscas', 'number'],
      ['is_active', 'Ativo', 'checkbox']
    ]
  },
  resources: {
    title: 'RECURSOS',
    table: 'blog_resources',
    label: 'title',
    desc: 'resource_type',
    fields: [
      ['title', 'Título', 'text', 1],
      ['slug', 'Slug', 'text'],
      ['description', 'Descrição', 'textarea', 1],
      ['content', 'Conteúdo', 'textarea', 1],
      ['resource_type', 'Tipo', 'text'],
      ['file_url', 'Arquivo', 'text'],
      ['external_url', 'Link externo', 'text'],
      ['cover_image_url', 'Capa', 'text'],
      ['status', 'Status', 'select:draft|published|hidden|archived'],
      ['is_featured', 'Destaque', 'checkbox']
    ]
  },
  events: {
    title: 'EVENTOS',
    table: 'blog_secret_events',
    label: 'name',
    desc: 'event_key',
    fields: [
      ['name', 'Nome', 'text', 1],
      ['event_key', 'Chave', 'text'],
      ['description', 'Descrição', 'textarea', 1],
      ['status', 'Status', 'select:draft|active|archived'],
      ['activation_mode', 'Ativação', 'select:always|once|progressive|random'],
      ['max_activations', 'Máximo de ativações', 'number'],
      ['probability', 'Probabilidade 0–1', 'number'],
      ['required_event_keys', 'Eventos obrigatórios', 'array'],
      ['blocked_event_keys', 'Eventos bloqueados', 'array'],
      ['unlock_flags', 'Flags desbloqueadas', 'array'],
      ['remember_activation', 'Lembrar ativação', 'checkbox'],
      ['stop_normal_search', 'Interromper resultado normal', 'checkbox'],
      ['__steps', 'Passos do evento', 'steps', 1]
    ]
  },
  pages: {
    title: 'PÁGINAS SECRETAS',
    table: 'blog_secret_pages',
    label: 'title',
    desc: 'slug',
    fields: [
      ['title', 'Título', 'text', 1],
      ['slug', 'Slug', 'text'],
      ['subtitle', 'Subtítulo', 'text'],
      ['content', 'Conteúdo', 'textarea', 1],
      ['cover_image_url', 'Capa', 'text'],
      ['background_image_url', 'Fundo', 'text'],
      ['audio_url', 'Áudio', 'text'],
      ['theme', 'Tema', 'text'],
      ['status', 'Status', 'select:draft|published|archived'],
      ['required_flags', 'Flags obrigatórias', 'array'],
      ['blocked_flags', 'Flags bloqueadas', 'array'],
      ['unlock_flags', 'Flags desbloqueadas', 'array'],
      ['secret_event_id', 'Evento automático', 'select:events']
    ]
  },
  chats: {
    title: 'CHATS SECRETOS',
    table: 'blog_secret_chats',
    label: 'name',
    desc: 'opening_code',
    fields: [
      ['name', 'Nome do chat', 'text', 1],
      ['chat_key', 'Chave interna', 'text'],
      ['speaker_name', 'Nome de quem responde', 'text'],
      ['opening_code', 'Código de abertura', 'text'],
      ['opening_message', 'Mensagem inicial', 'textarea', 1],
      ['default_responses', 'Respostas padrão (uma por linha)', 'lines', 1],
      ['avatar_url', 'Avatar', 'text'],
      ['background_url', 'Fundo', 'text'],
      ['typing_delay_ms', 'Velocidade de digitação', 'number'],
      ['response_delay_ms', 'Atraso da resposta', 'number'],
      ['ask_name_after_min', 'Perguntar nome após (mín.)', 'number'],
      ['ask_name_after_max', 'Perguntar nome após (máx.)', 'number'],
      ['ask_name_message', 'Pergunta do nome', 'text', 1],
      ['accepted_name_message', 'Nome aceito', 'text', 1],
      ['invalid_name_message', 'Nome inválido', 'text', 1],
      ['invalid_names', 'Palavras rejeitadas', 'array', 1],
      ['status', 'Status', 'select:draft|active|archived'],
      ['__rules', 'Regras do chat', 'rules', 1]
    ]
  },
  settings: {
    title: 'CONFIGURAÇÕES',
    table: 'blog_settings',
    label: 'setting_key',
    desc: 'description',
    fields: [
      ['setting_key', 'Chave', 'text', 1],
      ['description', 'Descrição', 'text', 1],
      ['setting_value', 'JSON de configuração', 'json', 1],
      ['is_public', 'Pública', 'checkbox']
    ]
  },
  flags: {
    title: 'FLAGS DO ARG',
    table: 'blog_arg_flags',
    label: 'name',
    desc: 'flag_key',
    fields: [
      ['name', 'Nome', 'text'],
      ['flag_key', 'Chave', 'text'],
      ['description', 'Descrição', 'textarea', 1],
      ['category', 'Categoria', 'text'],
      ['is_active', 'Ativa', 'checkbox']
    ]
  }
}
const sections = ['overview', 'posts', 'characters', 'search', 'resources', 'media', 'events',
  'pages', 'chats', 'flags', 'settings'
];

const adminDOM = {
  loginForm: document.getElementById('loginForm'),
  loginButton: document.getElementById('loginButton'),
  loginMessage: document.getElementById('loginMessage'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  retryAuth: document.getElementById('retryAuth'),
  logout: document.getElementById('logout'),
  menuButton: document.getElementById('menuButton'),
  overlay: document.getElementById('overlay'),
  authScreen: document.getElementById('authScreen'),
  authMessage: document.getElementById('authMessage'),
  adminApp: document.getElementById('adminApp'),
  adminName: document.getElementById('adminName'),
  adminEmail: document.getElementById('adminEmail'),
  nav: document.getElementById('nav'),
  pageTitle: document.getElementById('pageTitle'),
  content: document.getElementById('content'),
  editorModal: document.getElementById('editorModal'),
  editorTitle: document.getElementById('editorTitle'),
  editorForm: document.getElementById('editorForm')
};

const {
  loginForm,
  loginButton,
  loginMessage,
  email,
  password,
  retryAuth,
  logout,
  menuButton,
  overlay,
  authScreen,
  authMessage,
  adminApp,
  adminName,
  adminEmail,
  nav,
  pageTitle,
  content,
  editorModal,
  editorTitle,
  editorForm
} = adminDOM;
document.addEventListener('DOMContentLoaded', init);
async function init() {
  if (!A.client) {
    if (document.body.dataset.page === 'login') {
      if (loginMessage) {
        loginMessage.textContent = 'O Supabase não foi configurado.';
        loginMessage.hidden = false;
      }
      if (loginButton) loginButton.disabled = true;
    } else {
      if (authMessage) authMessage.textContent = 'O Supabase não foi configurado.';
      if (retryAuth) retryAuth.hidden = false;
    }
    return;
  }

  if (document.body.dataset.page === 'login') {
    await login();
    return;
  }

  bindGlobal();
  await authorize();
}
async function login() {
  if (!loginForm) return;

  loginForm.onsubmit = async e => {
    e.preventDefault();
    loginButton.disabled = true;
    const {
      data,
      error
    } = await A.client.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value
    });
    if (error) {
      loginMessage.textContent = error.message;
      loginMessage.hidden = false;
      loginButton.disabled = false;
      return
    }
    const {
      data: adm
    } = await A.client.from('blog_admins').select('*').eq('user_id', data.user.id).eq(
      'is_active', true).maybeSingle();
    if (!adm) {
      await A.client.auth.signOut();
      loginMessage.textContent = 'Conta sem autorização.';
      loginMessage.hidden = false;
      loginButton.disabled = false;
      return
    }
    location.replace('admin.html')
  }
}

function bindGlobal() {
  if (retryAuth) retryAuth.onclick = authorize;
  if (logout) logout.onclick = async () => {
    await A.client.auth.signOut();
    location.replace('login.html')
  };
  if (menuButton) menuButton.onclick = () => {
    document.querySelector('aside')?.classList.add('open');
    overlay?.classList.add('show');
  };
  if (overlay) overlay.onclick = () => {
    document.querySelector('aside')?.classList.remove('open');
    overlay?.classList.remove('show');
  };
  document.querySelectorAll('[data-close-editor]').forEach(x => x.onclick = closeEditor);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && editorModal && !editorModal.hidden) closeEditor();
  });
}
async function authorize() {
  try {
    const {
      data: {
        session
      },
      error
    } = await A.client.auth.getSession();
    if (error || !session) return location.replace('login.html');
    A.user = session.user;
    const {
      data,
      error: ae
    } = await A.client.from('blog_admins').select('*').eq('user_id', A.user.id).eq('is_active',
      true).maybeSingle();
    if (ae || !data) return location.replace('login.html');
    A.admin = data;
    adminName.textContent = data.display_name;
    adminEmail.textContent = A.user.email;
    authScreen.hidden = true;
    adminApp.hidden = false;
    buildNav();
    show('overview')
  } catch (e) {
    authMessage.textContent = e.message;
    retryAuth.hidden = false
  }
}

function buildNav() {
  const labels = {
    overview: 'VISÃO GERAL',
    posts: 'REGISTROS',
    characters: 'PERSONAGENS',
    search: 'PESQUISA',
    resources: 'RECURSOS',
    media: 'MÍDIA',
    events: 'EVENTOS',
    pages: 'PÁGINAS SECRETAS',
    chats: 'CHATS',
    flags: 'FLAGS / ARG',
    settings: 'CONFIGURAÇÕES'
  };
  nav.innerHTML = sections.map(s => `<button data-s="${s}">${labels[s]}</button>`).join('');
  nav.querySelectorAll('button').forEach(b => b.onclick = () => show(b.dataset.s))
}
async function show(s) {
  A.section = s;
  nav.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.s === s));
  pageTitle.textContent = s === 'overview' ? 'VISÃO GERAL' : defs[s]?.title || 'MÍDIA';
  if (s === 'overview') return overview();
  if (s === 'media') return mediaView();
  return listView(s)
}
async function overview() {
  const names = [
    ['blog_posts', 'REGISTROS'],
    ['blog_characters', 'PERSONAGENS'],
    ['blog_search_entries', 'PESQUISAS'],
    ['blog_secret_events', 'EVENTOS'],
    ['blog_secret_chats', 'CHATS'],
    ['blog_secret_pages', 'PÁGINAS']
  ];
  const counts = await Promise.all(names.map(async ([t]) => {
    const {
      count
    } = await A.client.from(t).select('*', {
      count: 'exact',
      head: true
    });
    return count ?? 0
  }));
  content.innerHTML =
    `<section class="hero-card"><p class="tag">ARQUIVO CONECTADO</p><h2>O SISTEMA ESTÁ RESPONDENDO.</h2><p>Todos os módulos principais estão prontos para configuração.</p></section><section class="stats">${names.map((n,i)=>`<article class="stat"><small>${n[1]}</small><b>${counts[i]}</b><span>${n[0]}</span></article>`).join('')}</section><div class="help"><b>Daiana-56</b><p>O código inicial do chat Algo já é criado pelo SQL. Configure o chat e suas regras no módulo CHATS.</p></div>`
}
async function listView(s) {
  const d = defs[s];
  const {
    data,
    error
  } = await A.client.from(d.table).select('*').order('created_at', {
    ascending: false
  });
  if (error) return content.innerHTML = `<p>${esc(error.message)}</p>`;
  A.cache[s] = data || [];
  content.innerHTML =
    `<div class="toolbar"><input id="filter" placeholder="Pesquisar nesta lista"><button id="newItem">+ NOVO</button></div><div id="list" class="data-list"></div>`;
  newItem.onclick = () => openEditor(s, null);
  filter.oninput = renderList;
  renderList();

  function renderList() {
    const q = (filter.value || '').toLowerCase();
    list.innerHTML = (A.cache[s] || []).filter(x => JSON.stringify(x).toLowerCase().includes(q))
      .map(x =>
        `<article class="row"><div><h3>${esc(x[d.label]||'Sem nome')}</h3><p>${esc(x[d.desc]||'')}</p><small>${esc(x.status||x.role||'')}</small></div><div class="actions"><button data-edit="${x.id}">EDITAR</button><button data-dup="${x.id}">DUPLICAR</button>${x.status?`<button data-status="${x.id}">${x.status==='published'||x.status==='active'?'OCULTAR':'PUBLICAR'}</button>`:''}<button data-del="${x.id}">EXCLUIR</button></div></article>`
      ).join('') || '<p>Nenhum item.</p>';
    list.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openEditor(s, A.cache[s]
      .find(x => x.id === b.dataset.edit)));
    list.querySelectorAll('[data-dup]').forEach(b => b.onclick = () => duplicate(s, b.dataset
      .dup));
    list.querySelectorAll('[data-del]').forEach(b => b.onclick = () => remove(s, b.dataset.del));
    list.querySelectorAll('[data-status]').forEach(b => b.onclick = () => toggleStatus(s, b
      .dataset.status))
  }
}
async function openEditor(s, item) {
  const d = defs[s];
  editorTitle.textContent = item ? `EDITAR — ${item[d.label]}` : `NOVO — ${d.title}`;
  editorForm.dataset.section = s;
  editorForm.dataset.id = item?.id || '';
  const options = await preloadOptions();
  editorForm.innerHTML = d.fields.map(f => fieldHTML(f, item || {}, options)).join('') +
    `<div class="form-actions"><button type="button" data-close-editor>CANCELAR</button><button type="submit">SALVAR</button></div>`;
  editorForm.querySelectorAll('[data-close-editor]').forEach(x => x.onclick = closeEditor);
  if (s === 'events') await loadSteps(item?.id);
  if (s === 'chats') await loadRules(item?.id);
  editorForm.onsubmit = saveEditor;
  editorModal.hidden = false
}
async function preloadOptions() {
  const out = {};
  for (const [k, t, l] of [
      ['categories', 'blog_categories', 'name'],
      ['posts', 'blog_posts', 'title'],
      ['characters', 'blog_characters', 'name'],
      ['resources', 'blog_resources', 'title'],
      ['chats', 'blog_secret_chats', 'name'],
      ['pages', 'blog_secret_pages', 'title'],
      ['events', 'blog_secret_events', 'name']
    ]) {
    const {
      data
    } = await A.client.from(t).select(`id,${l}`);
    out[k] = (data || []).map(x => ({
      id: x.id,
      label: x[l]
    }))
  }
  return out
}

function fieldHTML(f, item, o) {
  const [n, l, t, full] = f, v = item[n] ?? '', cls = `field${full?' full':''}`;
  if (t === 'checkbox')
    return `<div class="${cls}"><label><input name="${n}" type="checkbox" ${v?'checked':''}> ${l}</label></div>`;
  if (t === 'textarea')
    return `<div class="${cls}"><label>${l}</label><textarea name="${n}">${esc(v)}</textarea></div>`;
  if (t === 'array')
    return `<div class="${cls}"><label>${l}</label><input name="${n}" value="${esc((v||[]).join(', '))}"></div>`;
  if (t === 'lines')
    return `<div class="${cls}"><label>${l}</label><textarea name="${n}">${esc((v||[]).join('\n'))}</textarea></div>`;
  if (t === 'json')
    return `<div class="${cls}"><label>${l}</label><textarea name="${n}">${esc(JSON.stringify(v||{},null,2))}</textarea></div>`;
  if (t === 'steps')
    return `<div class="${cls}"><label>${l}</label><div id="stepList" class="step-list"></div><button type="button" id="addStep">+ PASSO</button></div>`;
  if (t === 'rules')
    return `<div class="${cls}"><label>${l}</label><div id="ruleList" class="step-list"></div><button type="button" id="addRule">+ REGRA</button></div>`;
  if (t.startsWith('select:')) {
    const spec = t.slice(7);
    const opts = spec.includes('|') ? spec.split('|').map(x => ({
      id: x,
      label: x
    })) : o[spec] || [];
    return `<div class="${cls}"><label>${l}</label><select name="${n}"><option value="">—</option>${opts.map(x=>`<option value="${x.id}" ${String(v)===String(x.id)?'selected':''}>${esc(x.label)}</option>`).join('')}</select></div>`
  }
  return `<div class="${cls}"><label>${l}</label><input name="${n}" type="${t}" value="${esc(formatInput(v,t))}"></div>`
}
async function saveEditor(e) {
  e.preventDefault();
  const s = e.target.dataset.section,
    d = defs[s],
    id = e.target.dataset.id,
    fd = new FormData(e.target),
    payload = {};
  for (const [n, , t] of d.fields) {
    if (n.startsWith('__')) continue;
    const el = e.target.elements[n];
    if (t === 'checkbox') payload[n] = !!el?.checked;
    else if (t === 'array') payload[n] = String(fd.get(n) || '').split(',').map(x => x.trim())
      .filter(Boolean);
    else if (t === 'lines') payload[n] = String(fd.get(n) || '').split('\n').map(x => x.trim())
      .filter(Boolean);
    else if (t === 'json') {
      try {
        payload[n] = JSON.parse(fd.get(n) || '{}')
      } catch {
        return alert('JSON inválido em ' + n)
      }
    } else if (t === 'number') payload[n] = fd.get(n) === '' ? null : Number(fd.get(n));
    else payload[n] = fd.get(n) || null
  }
  if (s === 'search') {
    payload.normalized_term = normalize(payload.search_term);
    payload.entry_type = payload.entry_type || 'message'
  }
  if ((s === 'posts' || s === 'characters' || s === 'resources' || s === 'pages') && !payload
    .slug) payload.slug = slug(payload[d.label]);
  if (['posts', 'characters', 'resources'].includes(s) && !payload.status) payload.status =
    'draft';
  if (s === 'events' && !payload.status) payload.status = 'draft';
  if (s === 'chats' && !payload.status) payload.status = 'draft';
  payload.created_by = id ? undefined : A.user.id;
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
  const q = id ? A.client.from(d.table).update(payload).eq('id', id) : A.client.from(d.table)
    .insert(payload).select().single();
  const {
    data,
    error
  } = await q;
  if (error) return alert(error.message);
  const saved = id ? {
    id
  } : data;
  if (s === 'events') await saveSteps(saved.id || id);
  if (s === 'chats') await saveRules(saved.id || id);
  closeEditor();
  show(s)
}
async function duplicate(s, id) {
  const d = defs[s],
    x = {
      ...A.cache[s].find(a => a.id === id)
    };
  delete x.id;
  delete x.created_at;
  delete x.updated_at;
  if (x.slug) x.slug = x.slug + '-copia-' + Date.now();
  if (x[d.label]) x[d.label] += ' (cópia)';
  x.status = x.status === 'active' ? 'draft' : x.status === 'published' ? 'draft' : x.status;
  const {
    error
  } = await A.client.from(d.table).insert(x);
  if (error) alert(error.message);
  else show(s)
}
async function remove(s, id) {
  if (!confirm('Excluir definitivamente?')) return;
  const {
    error
  } = await A.client.from(defs[s].table).delete().eq('id', id);
  if (error) alert(error.message);
  else show(s)
}
async function toggleStatus(s, id) {
  const x = A.cache[s].find(a => a.id === id);
  let status = x.status === 'active' ? 'draft' : x.status === 'published' ? 'hidden' : (s ===
    'events' || s === 'chats' ? 'active' : 'published');
  const {
    error
  } = await A.client.from(defs[s].table).update({
    status,
    published_at: s === 'posts' && status === 'published' ? new Date().toISOString() : x
      .published_at
  }).eq('id', id);
  if (error) alert(error.message);
  else show(s)
}
async function mediaView() {
  const {
    data
  } = await A.client.from('blog_media').select('*').order('created_at', {
    ascending: false
  });
  content.innerHTML =
    `<div class="toolbar"><div><input id="mediaFile" type="file"><input id="mediaFolder" placeholder="pasta" value="geral"></div><button id="uploadMedia">ENVIAR MÍDIA</button></div><div class="media-grid">${(data||[]).map(m=>`<article class="media-card">${m.media_type==='image'?`<img src="${m.public_url}" alt="">`:''}<b>${esc(m.title||m.file_name)}</b><p>${esc(m.folder)}</p><div class="actions"><button data-copy="${m.public_url}">COPIAR URL</button><button data-mdel="${m.id}" data-path="${m.storage_path}">EXCLUIR</button></div></article>`).join('')}</div>`;
  uploadMedia.onclick = upload;
  content.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => navigator.clipboard
    .writeText(b.dataset.copy));
  content.querySelectorAll('[data-mdel]').forEach(b => b.onclick = () => deleteMedia(b.dataset
    .mdel, b.dataset.path))
}
async function upload() {
  const f = mediaFile.files[0];
  if (!f) return alert('Escolha um arquivo.');
  const folder = slug(mediaFolder.value || 'geral'),
    path = `${folder}/${Date.now()}-${slug(f.name)}`;
  const {
    error
  } = await A.client.storage.from(FF_STORAGE_BUCKET).upload(path, f);
  if (error) return alert(error.message);
  const {
    data: u
  } = A.client.storage.from(FF_STORAGE_BUCKET).getPublicUrl(path);
  const type = f.type.startsWith('image/') ? 'image' : f.type.startsWith('audio/') ? 'audio' : f
    .type.startsWith('video/') ? 'video' : f.type === 'application/pdf' ? 'document' : 'other';
  const {
    error: e
  } = await A.client.from('blog_media').insert({
    title: f.name,
    file_name: f.name,
    storage_path: path,
    public_url: u.publicUrl,
    media_type: type,
    mime_type: f.type,
    file_size: f.size,
    folder,
    uploaded_by: A.user.id
  });
  if (e) alert(e.message);
  else mediaView()
}
async function deleteMedia(id, path) {
  if (!confirm('Excluir mídia?')) return;
  await A.client.storage.from(FF_STORAGE_BUCKET).remove([path]);
  await A.client.from('blog_media').delete().eq('id', id);
  mediaView()
}
let stepData = [];
async function loadSteps(eventId) {
  stepData = [];
  if (eventId) {
    const {
      data
    } = await A.client.from('blog_event_steps').select('*').eq('event_id', eventId).order(
      'step_order');
    stepData = data || []
  }
  renderSteps();
  addStep.onclick = () => {
    stepData.push({
      action_type: 'delay',
      duration_ms: 1000,
      delay_before_ms: 0,
      text_content: '',
      media_url: '',
      target_url: ''
    });
    renderSteps()
  }
}

function renderSteps() {
  if (!window.stepList) return;
  stepList.innerHTML = stepData.map((s, i) =>
    `<div class="step-card"><b>PASSO ${i+1}</b><select data-step="${i}" data-k="action_type">${['delay','glitch','shake','blackout','flash','darken_left','darken_right','show_text','show_image','play_audio','redirect','clear_effects'].map(x=>`<option ${s.action_type===x?'selected':''}>${x}</option>`).join('')}</select><input data-step="${i}" data-k="duration_ms" type="number" value="${s.duration_ms||1000}" placeholder="duração"><input data-step="${i}" data-k="text_content" value="${esc(s.text_content||'')}" placeholder="texto"><input data-step="${i}" data-k="media_url" value="${esc(s.media_url||'')}" placeholder="mídia"><input data-step="${i}" data-k="target_url" value="${esc(s.target_url||'')}" placeholder="destino"><button type="button" data-stepdel="${i}">EXCLUIR</button></div>`
  ).join('');
  stepList.querySelectorAll('[data-step]').forEach(el => el.oninput = () => {
    stepData[el.dataset.step][el.dataset.k] = el.type === 'number' ? Number(el.value) : el.value
  });
  stepList.querySelectorAll('[data-stepdel]').forEach(b => b.onclick = () => {
    stepData.splice(b.dataset.stepdel, 1);
    renderSteps()
  })
}
async function saveSteps(eventId) {
  await A.client.from('blog_event_steps').delete().eq('event_id', eventId);
  if (stepData.length) await A.client.from('blog_event_steps').insert(stepData.map((s, i) => ({
    ...s,
    event_id: eventId,
    step_order: i + 1,
    settings: {}
  })))
}
let ruleData = [];
async function loadRules(chatId) {
  ruleData = [];
  if (chatId) {
    const {
      data
    } = await A.client.from('blog_chat_rules').select('*').eq('chat_id', chatId).order(
      'priority', {
        ascending: false
      });
    ruleData = data || []
  }
  renderRules();
  addRule.onclick = () => {
    ruleData.push({
      name: 'Nova regra',
      match_mode: 'keyword',
      keywords: [],
      synonyms: [],
      phrases: [],
      required_terms: [],
      forbidden_terms: [],
      priority: 0,
      response_text: '',
      response_variants: [],
      required_flags: [],
      blocked_flags: [],
      unlock_flags: [],
      remove_flags: [],
      is_active: true
    });
    renderRules()
  }
}

function renderRules() {
  if (!window.ruleList) return;
  ruleList.innerHTML = ruleData.map((r, i) =>
    `<div class="step-card"><b>REGRA ${i+1}</b><input data-rule="${i}" data-k="name" value="${esc(r.name||'')}" placeholder="nome"><select data-rule="${i}" data-k="match_mode">${['exact','keyword','any_synonym','all_keywords','contains','approximate','fallback'].map(x=>`<option ${r.match_mode===x?'selected':''}>${x}</option>`).join('')}</select><input data-rule="${i}" data-k="phrases" value="${esc((r.phrases||[]).join(', '))}" placeholder="frases"><input data-rule="${i}" data-k="keywords" value="${esc((r.keywords||[]).join(', '))}" placeholder="palavras-chave"><input data-rule="${i}" data-k="synonyms" value="${esc((r.synonyms||[]).join(', '))}" placeholder="sinônimos"><input data-rule="${i}" data-k="required_terms" value="${esc((r.required_terms||[]).join(', '))}" placeholder="todas obrigatórias"><textarea data-rule="${i}" data-k="response_text" placeholder="resposta">${esc(r.response_text||'')}</textarea><input data-rule="${i}" data-k="response_variants" value="${esc((r.response_variants||[]).join(' | '))}" placeholder="variantes separadas por |"><input data-rule="${i}" data-k="unlock_flags" value="${esc((r.unlock_flags||[]).join(', '))}" placeholder="flags liberadas"><input data-rule="${i}" data-k="required_flags" value="${esc((r.required_flags||[]).join(', '))}" placeholder="flags necessárias"><input data-rule="${i}" data-k="priority" type="number" value="${r.priority||0}"><button type="button" data-ruledel="${i}">EXCLUIR</button></div>`
  ).join('');
  ruleList.querySelectorAll('[data-rule]').forEach(el => el.oninput = () => {
    const k = el.dataset.k;
    let v = el.value;
    if (['phrases', 'keywords', 'synonyms', 'required_terms', 'unlock_flags', 'required_flags']
      .includes(k)) v = v.split(',').map(x => x.trim()).filter(Boolean);
    if (k === 'response_variants') v = v.split('|').map(x => x.trim()).filter(Boolean);
    if (k === 'priority') v = Number(v);
    ruleData[el.dataset.rule][k] = v
  });
  ruleList.querySelectorAll('[data-ruledel]').forEach(b => b.onclick = () => {
    ruleData.splice(b.dataset.ruledel, 1);
    renderRules()
  })
}
async function saveRules(chatId) {
  const old = await A.client.from('blog_chat_rules').select('id').eq('chat_id', chatId);
  if (old.data?.length) await A.client.from('blog_chat_rules').delete().eq('chat_id', chatId);
  if (ruleData.length) await A.client.from('blog_chat_rules').insert(ruleData.map(r => {
    const x = {
      ...r,
      chat_id: chatId
    };
    delete x.id;
    delete x.created_at;
    delete x.updated_at;
    return x
  }))
}

function closeEditor() {
  editorModal.hidden = true;
  editorForm.innerHTML = ''
}

function formatInput(v, t) {
  if (t === 'datetime-local' && v) return new Date(v).toISOString().slice(0, 16);
  return v ?? ''
}

function normalize(v) {
  return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    .replace(/\s+/g, ' ')
}

function slug(v) {
  return normalize(v).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function esc(v) {
  const d = document.createElement('div');
  d.textContent = String(v ?? '');
  return d.innerHTML
}