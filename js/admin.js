// ============================================================
//  PANEL ADMINISTRATIVO (oculto)
// ============================================================
//  Mismo panel del catalogo de perfumeria, adaptado a Nevada. Gerencia
//  y el personal tambien son clientes: quien inicia sesion en el
//  catalogo con su codigo de cliente y su contraseña, y esta marcado
//  como administrador en Supabase (nevada.admins_clientes), abre el
//  panel haciendo 3 clics seguidos sobre el logo del encabezado en
//  menos de 3 segundos. No se pide otro usuario ni otra contraseña.
//  Para cualquier otro cliente el logo funciona como siempre.
//
//  Niveles (los da la base, nevada.admins_clientes):
//    admin   = todo.
//    editor  = ve todo; edita la ficha de los productos y corrige el
//              stock a mano (hasta la siguiente sincronizacion).
//    lectura = ve todo, no cambia nada.
//  Los botones y campos que una persona no puede usar se marcan con
//  data-req="admin" o data-req="editor" y se quitan o bloquean solos.
//  La base revisa lo mismo: esconder un boton no es la proteccion.
//
//  Todo pasa por funciones public.nevada_panel_* que reciben el token
//  de la sesion del cliente y revisan en la base que sea administrador
//  (ver herramientas/panel_admin/panel_por_cliente.sql). Los cambios
//  quedan en el historial desde la propia base.
//
//  Los precios nunca se muestran aqui: solo van en el Excel del
//  pedido del cliente.
// ============================================================

let adminSession = null; // { codigo, nombre, rol: 'admin' | 'editor' | 'lectura' }
let adminTab = 'productos';
let adminEditingId = null; // id de producto, codigo de cliente o id de pedido en edicion
// Si se cambio algo que el catalogo ya armo al cargar (productos,
// vendedores, rotacion), al cerrar el panel se recarga la pagina.
let adminHuboCambios = false;

function adminCfg() {
  return CATALOGO_EN_VIVO;
}

// ---------- Gesto secreto: 3 clics en el logo en 3 segundos ----------
(function setupAdminTrigger() {
  let clicks = 0;
  let timer = null;
  cuandoListo(() => {
    const logo = document.getElementById('headerLogo');
    if (!logo) return;
    logo.addEventListener('click', (e) => {
      clicks++;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { clicks = 0; }, 3000);
      if (clicks >= 3) {
        clicks = 0;
        clearTimeout(timer);
        e.preventDefault();
        openAdminEntry();
      }
    });
  });
})();

let adminEntrando = false;
async function openAdminEntry() {
  if (adminEntrando) return;
  if (typeof SESION === 'undefined' || !SESION || !SESION.token) return;
  adminEntrando = true;
  try {
    const r = await adminRpc('nevada_panel_rol', {});
    // Un cliente que no es administrador no ve nada: el panel sigue oculto.
    if (!r || !r.rol) { adminSession = null; return; }
    adminSession = { codigo: r.codigo, nombre: r.nombre, rol: r.rol };
    openAdminPanel();
  } catch (err) {
    if (typeof notify === 'function') notify('No se pudo abrir el panel. Revisa tu internet.', true);
  } finally {
    adminEntrando = false;
  }
}

// ---------- Llamadas a Supabase con la sesion del cliente ----------
// Llama una funcion nevada_panel_* agregando el token de la sesion.
// Devuelve lo que responde, o lanza un error con el mensaje de la base.
async function adminRpc(fn, args) {
  if (typeof SESION === 'undefined' || !SESION || !SESION.token) {
    adminSinPermiso();
    throw new Error('Sin sesión');
  }
  const cfg = adminCfg();
  const resp = await fetch(`${cfg.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: cfg.clavePublica, 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ p_token: SESION.token }, args || {}))
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    const msg = (data && data.message) || ('HTTP ' + resp.status);
    if (/No autorizado/.test(msg)) { adminSinPermiso(); throw new Error('Sin permiso'); }
    throw new Error(msg);
  }
  if (data && data.ok === false) throw new Error(data.error || 'No se pudo completar.');
  return data;
}

// La sesion vencio, se cerro, o la cuenta dejo de ser administradora.
function adminSinPermiso() {
  const abierto = document.getElementById('adminPanelModal').classList.contains('open');
  adminSession = null;
  closeAdminPanel();
  if (abierto && typeof notify === 'function') notify('Tu sesión ya no tiene acceso al panel administrativo.', true);
}

// nivel: 'admin' (solo acceso completo) o 'editor' (completo o edicion).
function adminPuede(nivel) {
  const rol = adminSession && adminSession.rol;
  if (nivel === 'admin') return rol === 'admin';
  if (nivel === 'editor') return rol === 'admin' || rol === 'editor';
  return !!rol;
}

// Quita los botones y bloquea los campos que esta persona no puede usar.
function aplicarPermisosAdmin(root) {
  root.querySelectorAll('[data-req]').forEach(el => {
    if (adminPuede(el.dataset.req)) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.disabled = true;
    else el.remove();
  });
}
cuandoListo(() => {
  const body = document.getElementById('adminListBody');
  if (body && 'MutationObserver' in window) {
    new MutationObserver(() => aplicarPermisosAdmin(body)).observe(body, { childList: true, subtree: true });
  }
});

const ADMIN_ROL_TEXTO = { admin: 'Acceso completo', editor: 'Edición', lectura: 'Solo lectura' };

function applyAdminRoleUI() {
  const userEl = document.getElementById('adminSidebarUser');
  if (userEl && adminSession) {
    userEl.innerHTML = `Cliente ${escapeAdminHtml(adminSession.codigo)} · ${escapeAdminHtml(adminSession.nombre)}<span class="admin-role-badge">${ADMIN_ROL_TEXTO[adminSession.rol] || ''}</span>`;
  }
}

// ---------- Panel principal ----------
let adminShowPapelera = false;

const ADMIN_TAB_TITLES = {
  productos: 'Productos', clientes: 'Clientes', stock: 'Sincronización', pedidos: 'Pedidos',
  ranking: 'Ranking de más pedidos', ajustes: 'Ajustes', historial: 'Historial de cambios'
};

function openAdminPanel() {
  adminEditingId = null;
  document.getElementById('adminPanelModal').classList.add('open');
  document.body.classList.add('admin-abierto');
  applyAdminRoleUI();
  switchAdminTab('productos');
}

function closeAdminPanel() {
  const modal = document.getElementById('adminPanelModal');
  const estabaAbierto = modal.classList.contains('open');
  modal.classList.remove('open');
  document.body.classList.remove('admin-abierto');
  if (estabaAbierto && adminHuboCambios) {
    // El catalogo arma sus listas una sola vez al cargar: se recarga
    // para que los cambios se vean en la pagina.
    adminHuboCambios = false;
    location.reload();
  }
}

function switchAdminTab(tab) {
  adminTab = tab;
  adminEditingId = null;
  adminShowPapelera = false;
  ['productos', 'clientes', 'stock', 'pedidos', 'ranking', 'ajustes', 'historial'].forEach(t => {
    const id = 'adminTab' + t.charAt(0).toUpperCase() + t.slice(1);
    document.getElementById(id).classList.toggle('active', tab === t);
  });
  document.getElementById('adminPanelTitle').textContent = ADMIN_TAB_TITLES[tab] || 'Panel administrativo';
  const search = document.getElementById('adminSearchInput');
  search.value = '';
  search.style.display = (tab === 'ajustes' || tab === 'ranking' || tab === 'stock') ? 'none' : '';
  // Agregar y papelera: solo acceso completo.
  const conAlta = (tab === 'productos' || tab === 'clientes') && adminPuede('admin');
  document.getElementById('adminAddBtn').style.display = conAlta ? '' : 'none';
  const papeleraBtn = document.getElementById('adminPapeleraBtn');
  papeleraBtn.style.display = conAlta ? '' : 'none';
  papeleraBtn.textContent = 'Ver papelera';
  document.getElementById('adminPedidosFilters').style.display = tab === 'pedidos' ? 'flex' : 'none';
  document.getElementById('adminProductosFilters').style.display = tab === 'productos' ? 'flex' : 'none';
  document.getElementById('adminClientesFilters').style.display = tab === 'clientes' ? 'flex' : 'none';
  document.getElementById('adminPedidosSummary').style.display = tab === 'pedidos' ? 'grid' : 'none';
  document.getElementById('adminPedidosLoadMoreWrap').style.display = 'none';
  if (tab === 'productos') search.placeholder = 'Buscar por código, nombre o marca...';
  else if (tab === 'clientes') search.placeholder = 'Buscar por código, nombre, teléfono o correo...';
  else if (tab === 'pedidos') search.placeholder = 'Buscar por cliente, código o teléfono...';
  else if (tab === 'historial') search.placeholder = 'Buscar por acción, entidad o código...';
  document.getElementById('adminMsg').textContent = '';
  document.getElementById('adminListBody').innerHTML = '';
  if (tab === 'productos') loadProductosAdmin(true);
  else if (tab === 'clientes') loadClientesAdmin('');
  else if (tab === 'stock') loadSyncAdmin();
  else if (tab === 'pedidos') loadPedidosAdmin(true);
  else if (tab === 'ranking') loadRankingAdmin();
  else if (tab === 'ajustes') loadAjustesAdmin();
  else loadHistorialAdmin(true);
}

// Alterna entre ver los productos/clientes activos y ver la papelera
// (los que se "eliminaron" -- en realidad solo se marcan con
// eliminado_en y se pueden restaurar). Solo aplica a Productos/Clientes.
function toggleAdminPapelera() {
  adminShowPapelera = !adminShowPapelera;
  adminEditingId = null;
  document.getElementById('adminPapeleraBtn').textContent = adminShowPapelera ? 'Ver activos' : 'Ver papelera';
  document.getElementById('adminAddBtn').style.display = adminShowPapelera ? 'none' : '';
  if (adminTab === 'productos') document.getElementById('adminProductosFilters').style.display = adminShowPapelera ? 'none' : 'flex';
  if (adminTab === 'clientes') document.getElementById('adminClientesFilters').style.display = adminShowPapelera ? 'none' : 'flex';
  document.getElementById('adminSearchInput').value = '';
  if (adminTab === 'productos') renderProductosAdmin();
  else if (adminTab === 'clientes') loadClientesAdmin('');
}

function adminSetMsg(text, kind) {
  const el = document.getElementById('adminMsg');
  el.textContent = text || '';
  el.className = 'admin-msg' + (kind === 'error' ? ' is-error' : kind === 'ok' ? ' is-ok' : '');
}

let adminSearchDebounce = null;
function onAdminSearch() {
  if (adminSearchDebounce) clearTimeout(adminSearchDebounce);
  adminSearchDebounce = setTimeout(() => {
    const term = document.getElementById('adminSearchInput').value.trim();
    if (adminTab === 'productos') renderProductosAdmin();
    else if (adminTab === 'clientes') loadClientesAdmin(term);
    else if (adminTab === 'pedidos') loadPedidosAdmin(true);
    else if (adminTab === 'historial') loadHistorialAdmin(true);
  }, adminTab === 'productos' ? 120 : 350);
}

function onAdminAdd() {
  if (adminTab === 'productos') openAdminNewProduct();
  else openAdminNewClient();
}

function escapeAdminHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Para pasar un texto dentro de onclick="fn('...')" sin romper el HTML.
function adminJsArg(s) {
  return escapeAdminHtml(JSON.stringify(String(s == null ? '' : s)));
}

function fmtDateTimeAdmin(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function adminNormTexto(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function descargarExcelAdmin(wb, nombre) {
  return wb.xlsx.writeBuffer().then(buffer => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

// ============================================================
//  PRODUCTOS (tabla nevada_productos)
// ============================================================
//  Se traen todos una vez (son pocos miles) y se filtran aqui mismo.
//  El stock no se edita: lo sube el sincronizador desde Interakzion.
// ============================================================

let adminProductosCache = null; // todas las filas, incluida la papelera

async function fetchAllProductosAdmin() {
  const rows = await adminRpc('nevada_panel_productos', {});
  return Array.isArray(rows) ? rows : [];
}

function stockAdmin(code) {
  return (typeof STOCK !== 'undefined' && code in STOCK) ? (parseInt(STOCK[code]) || 0) : 0;
}

async function loadProductosAdmin(forzar) {
  if (adminProductosCache && !forzar) { renderProductosAdmin(); return; }
  adminSetMsg('Cargando...');
  document.getElementById('adminListBody').innerHTML = '';
  try {
    adminProductosCache = await fetchAllProductosAdmin();
    fillAdminProductosFacets();
    renderProductosAdmin();
  } catch (err) {
    adminSetMsg('Error al cargar productos: ' + err.message, 'error');
  }
}

function fillAdminProductosFacets() {
  const activos = (adminProductosCache || []).filter(p => !p.eliminado_en);
  const brands = [...new Set(activos.map(r => r.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const cats = CATEGORIAS.filter(c => activos.some(p => p.categoria === c));
  activos.forEach(p => { if (p.categoria && !cats.includes(p.categoria)) cats.push(p.categoria); });
  fillAdminFacetSelect(document.getElementById('adminFiltroMarca'), brands, 'Todas');
  fillAdminFacetSelect(document.getElementById('adminFiltroCategoria'), cats, 'Todas');
}

function fillAdminFacetSelect(selectEl, values, allLabel) {
  if (!selectEl) return;
  const current = selectEl.value;
  selectEl.innerHTML = `<option value="">${allLabel}</option>` +
    values.map(v => `<option value="${escapeAdminHtml(v)}">${escapeAdminHtml(v)}</option>`).join('');
  if (values.includes(current)) selectEl.value = current;
}

function adminProductosFiltrados() {
  const term = adminNormTexto(document.getElementById('adminSearchInput').value.trim());
  const rows = (adminProductosCache || []).filter(p => adminShowPapelera ? !!p.eliminado_en : !p.eliminado_en);
  let out = rows;
  if (!adminShowPapelera) {
    const marca = document.getElementById('adminFiltroMarca').value;
    const cat = document.getElementById('adminFiltroCategoria').value;
    const sinFoto = document.getElementById('adminFiltroSinFoto').checked;
    const agotados = document.getElementById('adminFiltroAgotados').checked;
    const ocultos = document.getElementById('adminFiltroOcultos').checked;
    const nuevo = document.getElementById('adminFiltroNuevo').checked;
    out = out.filter(p =>
      (!marca || p.brand === marca) &&
      (!cat || p.categoria === cat) &&
      (!sinFoto || !p.img) &&
      (!agotados || stockAdmin(p.code) <= 0) &&
      (!ocultos || p.hidden) &&
      (!nuevo || p.date_added));
  }
  if (term) {
    out = out.filter(p => adminNormTexto(p.code).includes(term) || adminNormTexto(p.name).includes(term) || adminNormTexto(p.brand).includes(term));
  }
  return out;
}

function adminHayFiltrosProductos() {
  return ['adminFiltroMarca', 'adminFiltroCategoria'].some(id => document.getElementById(id).value) ||
    ['adminFiltroSinFoto', 'adminFiltroAgotados', 'adminFiltroOcultos', 'adminFiltroNuevo'].some(id => document.getElementById(id).checked);
}

function onAdminProductosFilterChange() {
  renderProductosAdmin();
}

function clearAdminProductosFilters() {
  ['adminFiltroMarca', 'adminFiltroCategoria'].forEach(id => { document.getElementById(id).value = ''; });
  ['adminFiltroSinFoto', 'adminFiltroAgotados', 'adminFiltroOcultos', 'adminFiltroNuevo'].forEach(id => {
    document.getElementById(id).checked = false;
  });
  renderProductosAdmin();
}

const ADMIN_PRODUCTOS_MAX = 60;

function renderProductosAdmin() {
  if (!adminProductosCache) return;
  adminEditingId = null;
  const body = document.getElementById('adminListBody');
  const todos = adminProductosFiltrados();
  const term = document.getElementById('adminSearchInput').value.trim();
  const filtrando = !!term || (!adminShowPapelera && adminHayFiltrosProductos());
  // Sin busqueda: los ultimos agregados primero (igual que perfumeria).
  const ordenados = filtrando ? todos : [...todos].sort((a, b) => b.id - a.id);
  const rows = ordenados.slice(0, ADMIN_PRODUCTOS_MAX);
  const mas = todos.length > rows.length ? ` (mostrando ${rows.length}; afina la búsqueda para ver otros)` : '';
  adminSetMsg(adminShowPapelera
    ? `${todos.length} producto(s) en la papelera${mas}`
    : (filtrando ? `${todos.length} resultado(s)${mas}` : `Últimos ${rows.length} productos agregados de ${todos.length} (busca para ver otros)`));
  if (!rows.length) {
    body.innerHTML = `<p class="admin-msg">${adminShowPapelera ? 'La papelera está vacía.' : 'Sin resultados.'}</p>`;
    return;
  }
  if (adminShowPapelera) {
    body.innerHTML = `<div class="admin-list">` + rows.map(p => `
      <div class="admin-row admin-row-static admin-row-trash">
        <div class="admin-row-main">
          <div class="admin-row-title">${escapeAdminHtml(p.brand)} — ${escapeAdminHtml(p.name)}</div>
          <div class="admin-row-sub">Código ${escapeAdminHtml(p.code)} · eliminado el ${fmtDateTimeAdmin(p.eliminado_en)}</div>
        </div>
        <div class="admin-row-actions">
          <button type="button" class="btn btn-ghost" onclick="restoreAdminProducto(${p.id})">Restaurar</button>
          <button type="button" class="btn btn-danger" onclick="permanentDeleteAdminProducto(${p.id})">Eliminar definitivo</button>
        </div>
      </div>
    `).join('') + `</div>`;
    return;
  }
  body.innerHTML = rows.map(p => {
    const visible = !p.hidden;
    const pill = p.hidden ? 'Oculto' : (p.img ? 'Visible' : 'Sin foto');
    return `
    <div class="admin-list">
      <div class="admin-row" data-prod-row="${p.id}" onclick="toggleAdminProductEdit(${p.id})">
        <div class="admin-row-main">
          <div class="admin-row-title">${escapeAdminHtml(p.brand)} — ${escapeAdminHtml(p.name)}</div>
          <div class="admin-row-sub">Código ${escapeAdminHtml(p.code)} · ${escapeAdminHtml(p.categoria || '')} · Stock ${stockAdmin(p.code)}</div>
        </div>
        <div class="admin-row-pills">
          ${p.date_added ? '<span class="admin-pill admin-pill-new">Nuevo</span>' : ''}
          <span class="admin-pill ${visible && p.img ? 'admin-pill-ok' : 'admin-pill-off'}">${pill}</span>
        </div>
      </div>
      <div id="adminEditWrap-p${p.id}"></div>
    </div>
  `;
  }).join('');
}

function toggleAdminProductEdit(id) {
  const wrap = document.getElementById(`adminEditWrap-p${id}`);
  if (!wrap) return;
  if (adminEditingId === id) {
    wrap.innerHTML = '';
    adminEditingId = null;
    return;
  }
  document.querySelectorAll('[id^="adminEditWrap-p"]').forEach(w => { w.innerHTML = ''; });
  adminEditingId = id;
  const p = (adminProductosCache || []).find(x => x.id === id);
  wrap.innerHTML = p ? productEditFormHtml(p) : '<p class="admin-msg is-error">No encontrado.</p>';
}

function adminCategoriaOptions(actual) {
  const lista = CATEGORIAS.slice();
  if (actual && !lista.includes(actual)) lista.push(actual);
  return lista.map(c => `<option value="${escapeAdminHtml(c)}"${c === (actual || 'Otros') ? ' selected' : ''}>${escapeAdminHtml(c)}</option>`).join('');
}

function productEditFormHtml(p) {
  const notesStr = Array.isArray(p.notes) ? p.notes.join('\n') : '';
  return `
    <div class="admin-edit-panel">
      <div class="admin-edit-grid">
        <div>
          <label class="field-label" for="pf_brand">Marca</label>
          <input class="field-input" data-req="editor" id="pf_brand" value="${escapeAdminHtml(p.brand)}">
        </div>
        <div>
          <label class="field-label" for="pf_name">Nombre</label>
          <input class="field-input" data-req="editor" id="pf_name" value="${escapeAdminHtml(p.name)}">
        </div>
        <div>
          <label class="field-label" for="pf_code">Código de barras</label>
          <input class="field-input" data-req="editor" id="pf_code" value="${escapeAdminHtml(p.code)}">
        </div>
        <div>
          <label class="field-label" for="pf_stock">Stock (se corrige a mano solo hasta la próxima sincronización)</label>
          <input class="field-input" data-req="editor" id="pf_stock" type="number" min="0" step="1" inputmode="numeric" value="${stockAdmin(p.code)}" data-original="${stockAdmin(p.code)}">
        </div>
        <div>
          <label class="field-label" for="pf_categoria">Categoría</label>
          <select class="field-input" data-req="editor" id="pf_categoria">${adminCategoriaOptions(p.categoria)}</select>
        </div>
        <div>
          <label class="field-label" for="pf_img">Archivo de foto (img/productos/)</label>
          <input class="field-input" data-req="editor" id="pf_img" value="${escapeAdminHtml(p.img || '')}" placeholder="ej: ${escapeAdminHtml(p.code)}.webp (vacío = sin foto)">
        </div>
        <div class="field-full">
          <label class="field-label" for="pf_notes">Detalles de la ficha (uno por línea)</label>
          <textarea class="field-input admin-textarea" data-req="editor" id="pf_notes" rows="3">${escapeAdminHtml(notesStr)}</textarea>
        </div>
      </div>
      <div class="admin-checkbox-row">
        <input type="checkbox" data-req="editor" id="pf_hidden" ${p.hidden ? 'checked' : ''}>
        <label for="pf_hidden">Ocultar del catálogo</label>
      </div>
      <div class="admin-checkbox-row">
        <input type="checkbox" data-req="editor" id="pf_nuevo" data-original-date="${escapeAdminHtml(p.date_added || '')}" ${p.date_added ? 'checked' : ''}>
        <label for="pf_nuevo">Marcar como Nuevo Ingreso${p.date_added ? ` (desde ${escapeAdminHtml(p.date_added)})` : ''}</label>
      </div>
      <div class="admin-edit-actions">
        <span><button type="button" class="btn btn-danger" data-req="admin" onclick="deleteAdminProducto(${p.id})">Enviar a la papelera</button></span>
        <div class="admin-edit-actions-end">
          <button type="button" class="btn btn-ghost" onclick="toggleAdminProductEdit(${p.id})">Cancelar</button>
          <button type="button" class="btn btn-primary" data-req="editor" onclick="saveAdminProducto(${p.id})">Guardar cambios</button>
        </div>
      </div>
    </div>
  `;
}

function leerNotasAdmin(id) {
  return document.getElementById(id).value.split('\n').map(s => s.trim()).filter(Boolean);
}

function hoyAdmin() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function codigoRepetidoAdmin(code, id) {
  return (adminProductosCache || []).find(p => p.code === code && p.id !== id && !p.eliminado_en);
}

// Reemplaza la fila en la lista ya cargada (sin volver a pedir todo).
function actualizarCacheProducto(row) {
  if (!adminProductosCache || !row) return;
  const i = adminProductosCache.findIndex(p => p.id === row.id);
  if (i >= 0) adminProductosCache[i] = row; else adminProductosCache.push(row);
}

async function saveAdminProducto(id) {
  const payload = {
    brand: document.getElementById('pf_brand').value.trim(),
    name: document.getElementById('pf_name').value.trim(),
    code: document.getElementById('pf_code').value.trim(),
    categoria: document.getElementById('pf_categoria').value || 'Otros',
    img: document.getElementById('pf_img').value.trim() || null,
    notes: leerNotasAdmin('pf_notes'),
    hidden: document.getElementById('pf_hidden').checked,
    actualizado: new Date().toISOString()
  };
  const nuevoCheckbox = document.getElementById('pf_nuevo');
  // Si ya tenia fecha, se conserva (no se reinicia a hoy cada vez que
  // se guarda el producto por otro motivo); si se acaba de marcar
  // ahora, se pone la fecha de hoy. Si se desmarca, se quita del todo.
  payload.date_added = nuevoCheckbox.checked ? (nuevoCheckbox.dataset.originalDate || hoyAdmin()) : null;
  delete payload.actualizado;
  if (!payload.brand || !payload.name || !payload.code) {
    adminSetMsg('Marca, nombre y código son obligatorios.', 'error');
    return;
  }
  const otro = codigoRepetidoAdmin(payload.code, id);
  if (otro && !confirm(`El código ${payload.code} ya lo tiene "${otro.brand} — ${otro.name}". ¿Guardar de todos modos?`)) return;
  const stockEl = document.getElementById('pf_stock');
  const stockNuevo = stockEl.value.trim() === '' ? NaN : Number(stockEl.value);
  const cambiaStock = stockEl.value.trim() !== stockEl.dataset.original;
  if (cambiaStock && !(Number.isInteger(stockNuevo) && stockNuevo >= 0)) {
    adminSetMsg('El stock debe ser un número entero, 0 o más.', 'error');
    return;
  }
  try {
    const r = await adminRpc('nevada_panel_producto_guardar', { p_id: id, p_datos: payload });
    actualizarCacheProducto(r.producto);
    adminHuboCambios = true;
    if (cambiaStock) {
      await adminRpc('nevada_panel_stock_corregir', { p_code: payload.code, p_cantidad: stockNuevo });
      if (typeof STOCK !== 'undefined') STOCK[payload.code] = stockNuevo;
    }
    fillAdminProductosFacets();
    renderProductosAdmin();
    adminSetMsg(cambiaStock
      ? 'Producto y stock actualizados. El stock corregido dura hasta la próxima sincronización con Interakzion.'
      : 'Producto actualizado. Se verá en el catálogo al cerrar el panel.', 'ok');
  } catch (err) {
    adminSetMsg('Error al guardar: ' + err.message, 'error');
  }
}

async function papeleraProductoAdmin(id, papelera) {
  const r = await adminRpc('nevada_panel_producto_papelera', { p_id: id, p_papelera: papelera });
  actualizarCacheProducto(r.producto);
  adminHuboCambios = true;
}

async function deleteAdminProducto(id) {
  if (!confirm('¿Enviar este producto a la papelera? Desaparece del catálogo, pero puedes restaurarlo luego desde "Ver papelera".')) return;
  try {
    await papeleraProductoAdmin(id, true);
    fillAdminProductosFacets();
    renderProductosAdmin();
    adminSetMsg('Producto enviado a la papelera.', 'ok');
  } catch (err) {
    adminSetMsg('Error al eliminar: ' + err.message, 'error');
  }
}

async function restoreAdminProducto(id) {
  try {
    await papeleraProductoAdmin(id, false);
    fillAdminProductosFacets();
    renderProductosAdmin();
    adminSetMsg('Producto restaurado.', 'ok');
  } catch (err) {
    adminSetMsg('Error al restaurar: ' + err.message, 'error');
  }
}

async function permanentDeleteAdminProducto(id) {
  if (!confirm('¿Eliminar este producto DEFINITIVAMENTE de la base de datos? Esta acción no se puede deshacer.')) return;
  try {
    await adminRpc('nevada_panel_producto_eliminar', { p_id: id });
    adminProductosCache = adminProductosCache.filter(p => p.id !== id);
    adminHuboCambios = true;
    renderProductosAdmin();
    adminSetMsg('Producto eliminado definitivamente.', 'ok');
  } catch (err) {
    adminSetMsg('Error al eliminar: ' + err.message, 'error');
  }
}

function openAdminNewProduct() {
  document.querySelectorAll('[id^="adminEditWrap-p"]').forEach(w => { w.innerHTML = ''; });
  const viejo = document.getElementById('adminNuevoProducto');
  if (viejo) viejo.remove();
  const body = document.getElementById('adminListBody');
  const holder = document.createElement('div');
  holder.innerHTML = `
    <div class="admin-edit-panel" id="adminNuevoProducto">
      <p class="admin-msg">Marca, nombre y código de barras son obligatorios. El stock lo pone el sincronizador. La foto se sube aparte al repositorio (img/productos/) — escribe aquí el nombre del archivo cuando ya esté subida.</p>
      <div class="admin-edit-grid">
        <div><label class="field-label" for="pfn_brand">Marca</label><input class="field-input" id="pfn_brand"></div>
        <div><label class="field-label" for="pfn_name">Nombre</label><input class="field-input" id="pfn_name"></div>
        <div><label class="field-label" for="pfn_code">Código de barras</label><input class="field-input" id="pfn_code"></div>
        <div><label class="field-label" for="pfn_categoria">Categoría</label><select class="field-input" id="pfn_categoria">${adminCategoriaOptions('Otros')}</select></div>
        <div class="field-full"><label class="field-label" for="pfn_img">Archivo de foto (opcional)</label><input class="field-input" id="pfn_img" placeholder="ej: 810112886160.webp"></div>
        <div class="field-full"><label class="field-label" for="pfn_notes">Detalles de la ficha (uno por línea, opcional)</label><textarea class="field-input admin-textarea" id="pfn_notes" rows="3"></textarea></div>
      </div>
      <div class="admin-checkbox-row"><input type="checkbox" id="pfn_nuevo" checked><label for="pfn_nuevo">Marcar como Nuevo Ingreso</label></div>
      <div class="admin-edit-actions">
        <span></span>
        <div class="admin-edit-actions-end">
          <button type="button" class="btn btn-ghost" onclick="this.closest('.admin-edit-panel').remove()">Cancelar</button>
          <button type="button" class="btn btn-primary" onclick="saveAdminNewProduct()">Crear producto</button>
        </div>
      </div>
    </div>
  `;
  body.prepend(holder.firstElementChild);
  document.getElementById('pfn_brand').focus();
}

async function saveAdminNewProduct() {
  const brand = document.getElementById('pfn_brand').value.trim();
  const name = document.getElementById('pfn_name').value.trim();
  const code = document.getElementById('pfn_code').value.trim();
  if (!brand || !name || !code) {
    adminSetMsg('Marca, nombre y código son obligatorios.', 'error');
    return;
  }
  const otro = codigoRepetidoAdmin(code, null);
  if (otro && !confirm(`El código ${code} ya lo tiene "${otro.brand} — ${otro.name}". ¿Crear de todos modos?`)) return;
  try {
    const payload = {
      brand, name, code,
      categoria: document.getElementById('pfn_categoria').value || 'Otros',
      img: document.getElementById('pfn_img').value.trim() || null,
      notes: leerNotasAdmin('pfn_notes'),
      hidden: false,
      date_added: document.getElementById('pfn_nuevo').checked ? hoyAdmin() : null
    };
    const r = await adminRpc('nevada_panel_producto_guardar', { p_id: null, p_datos: payload });
    const nextId = r.producto.id;
    actualizarCacheProducto(r.producto);
    adminHuboCambios = true;
    fillAdminProductosFacets();
    renderProductosAdmin();
    adminSetMsg(`Producto creado con id ${nextId}.${payload.img ? '' : ' Recuerda subir su foto a img/productos/ y escribir el nombre del archivo.'}`, 'ok');
  } catch (err) {
    adminSetMsg('Error al crear: ' + err.message, 'error');
  }
}

async function exportAdminCatalogoExcel() {
  if (typeof ExcelJS === 'undefined') {
    adminSetMsg('Librería Excel no cargó, revisa tu conexión a internet.', 'error');
    return;
  }
  if (!adminProductosCache) return;
  adminSetMsg('Preparando el Excel del catálogo...');
  try {
    const rows = adminProductosCache.filter(p => !p.eliminado_en).sort((a, b) => a.id - b.id);
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Catálogo');
    sheet.columns = [
      { header: 'Código', key: 'code', width: 18 },
      { header: 'Marca', key: 'brand', width: 22 },
      { header: 'Nombre', key: 'name', width: 45 },
      { header: 'Categoría', key: 'categoria', width: 20 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Foto', key: 'img', width: 24 },
      { header: 'Oculto', key: 'hidden', width: 10 },
      { header: 'Nuevo ingreso desde', key: 'date_added', width: 18 }
    ];
    sheet.getRow(1).font = { bold: true };
    rows.forEach(p => {
      sheet.addRow({
        code: p.code, brand: p.brand, name: p.name, categoria: p.categoria || '',
        stock: stockAdmin(p.code), img: p.img || 'Sin foto', hidden: p.hidden ? 'Sí' : 'No',
        date_added: p.date_added || ''
      });
    });
    await descargarExcelAdmin(wb, `Catalogo_Nevada_${hoyAdmin()}.xlsx`);
    adminSetMsg(`Catálogo exportado (${rows.length} productos).`, 'ok');
  } catch (err) {
    adminSetMsg('Error al exportar: ' + err.message, 'error');
  }
}

// ============================================================
//  CLIENTES (esquema privado nevada, por funciones de la base)
// ============================================================
//  Las contraseñas nunca se ven: solo se puede generar una
//  contraseña temporal nueva (el cliente la cambia al entrar).
// ============================================================

let adminClientesRows = [];

function estadoClienteAdmin(c) {
  if (!c.activo) return { txt: 'Bloqueado', cls: 'admin-pill-off' };
  if (c.bloqueado_hasta && new Date(c.bloqueado_hasta) > new Date()) return { txt: 'Bloqueado 15 min', cls: 'admin-pill-warn' };
  if (c.debe_cambiar) return { txt: 'Pendiente', cls: 'admin-pill-warn' };
  return { txt: 'Activo', cls: 'admin-pill-ok' };
}

async function loadClientesAdmin(term) {
  adminSetMsg('Cargando...');
  adminEditingId = null;
  document.getElementById('adminListBody').innerHTML = '';
  try {
    const [rows] = await Promise.all([
      adminRpc('nevada_panel_clientes', { p_buscar: term || '', p_papelera: adminShowPapelera, p_limite: 2000 }),
      loadUbicacionesAdmin()
    ]);
    adminClientesRows = Array.isArray(rows) ? rows : [];
    renderClientesAdmin();
  } catch (err) {
    adminSetMsg('Error al cargar clientes: ' + err.message, 'error');
  }
}

function onAdminClientesFilterChange() {
  renderClientesAdmin();
}

function renderClientesAdmin() {
  adminEditingId = null;
  const body = document.getElementById('adminListBody');
  const filtro = adminShowPapelera ? '' : document.getElementById('adminFiltroEstadoCliente').value;
  const todos = adminClientesRows.filter(c => !filtro || estadoClienteAdmin(c).txt.startsWith(filtro));
  const rows = todos.slice(0, ADMIN_PRODUCTOS_MAX);
  const mas = todos.length > rows.length ? ` (mostrando ${rows.length}; busca para ver otros)` : '';
  adminSetMsg(adminShowPapelera ? `${todos.length} cliente(s) en la papelera${mas}` : `${todos.length} cliente(s)${mas}`);
  if (!rows.length) {
    body.innerHTML = `<p class="admin-msg">${adminShowPapelera ? 'La papelera está vacía.' : 'Sin resultados.'}</p>`;
    return;
  }
  if (adminShowPapelera) {
    body.innerHTML = `<div class="admin-list">` + rows.map(c => `
      <div class="admin-row admin-row-static admin-row-trash">
        <div class="admin-row-main">
          <div class="admin-row-title">${escapeAdminHtml(c.nombre)}</div>
          <div class="admin-row-sub">Código ${escapeAdminHtml(c.codigo)} · eliminado el ${fmtDateTimeAdmin(c.eliminado_en)}</div>
        </div>
        <div class="admin-row-actions">
          <button type="button" class="btn btn-ghost" onclick="restoreAdminCliente(${adminJsArg(c.codigo)})">Restaurar</button>
          <button type="button" class="btn btn-danger" onclick="permanentDeleteAdminCliente(${adminJsArg(c.codigo)})">Eliminar definitivo</button>
        </div>
      </div>
    `).join('') + `</div>`;
    return;
  }
  body.innerHTML = rows.map(c => {
    const est = estadoClienteAdmin(c);
    const sub = [`Código ${escapeAdminHtml(c.codigo)}`, escapeAdminHtml(c.tel1 || 'sin teléfono')];
    if (c.vendedor) sub.push('Vendedor ' + escapeAdminHtml(c.vendedor));
    sub.push(c.ultimo_ingreso ? 'último ingreso ' + fmtDateTimeAdmin(c.ultimo_ingreso) : 'nunca ha entrado');
    const ubic = ubicacionesClienteAdmin(c.codigo);
    return `
    <div class="admin-list">
      <div class="admin-row" onclick="toggleAdminClientEdit(${adminJsArg(c.codigo)})">
        <div class="admin-row-main">
          <div class="admin-row-title">${escapeAdminHtml(c.nombre)}</div>
          <div class="admin-row-sub">${sub.join(' · ')}</div>
          ${ubic.length ? `<div class="admin-row-sub admin-ubic-fila"><span class="admin-ubic-lugar">📍 ${ubic.length === 1 ? escapeAdminHtml(ubicLugarAdmin(ubic[0])) : ubic.length + ' ubicaciones'}</span></div>` : ''}
        </div>
        <span class="admin-pill ${est.cls}">${est.txt}</span>
      </div>
      <div id="adminEditWrap-c${cssEscapeCode(c.codigo)}"></div>
    </div>
  `;
  }).join('');
}

function cssEscapeCode(codigo) {
  return String(codigo).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function toggleAdminClientEdit(codigo) {
  const wrap = document.getElementById(`adminEditWrap-c${cssEscapeCode(codigo)}`);
  if (!wrap) return;
  if (adminEditingId === codigo) {
    wrap.innerHTML = '';
    adminEditingId = null;
    return;
  }
  document.querySelectorAll('[id^="adminEditWrap-c"]').forEach(w => { w.innerHTML = ''; });
  adminEditingId = codigo;
  const c = adminClientesRows.find(x => x.codigo === codigo);
  wrap.innerHTML = c ? clientEditFormHtml(c) : '<p class="admin-msg is-error">No encontrado.</p>';
}

function clientEditFormHtml(c) {
  const arg = adminJsArg(c.codigo);
  return `
    <div class="admin-edit-panel">
      <div class="admin-edit-grid">
        <div>
          <label class="field-label">Código (no editable, es el código del sistema)</label>
          <input class="field-input" value="${escapeAdminHtml(c.codigo)}" disabled>
        </div>
        <div>
          <label class="field-label" for="cf_vendedor">Vendedor</label>
          <input class="field-input" data-req="admin" id="cf_vendedor" value="${escapeAdminHtml(c.vendedor || '')}">
        </div>
        <div class="field-full">
          <label class="field-label" for="cf_nombre">Nombre</label>
          <input class="field-input" data-req="admin" id="cf_nombre" value="${escapeAdminHtml(c.nombre)}">
        </div>
        <div><label class="field-label" for="cf_tel1">Teléfono 1</label><input class="field-input" data-req="admin" id="cf_tel1" value="${escapeAdminHtml(c.tel1 || '')}"></div>
        <div><label class="field-label" for="cf_tel2">Teléfono 2</label><input class="field-input" data-req="admin" id="cf_tel2" value="${escapeAdminHtml(c.tel2 || '')}"></div>
        <div class="field-full"><label class="field-label" for="cf_correo">Correo</label><input class="field-input" data-req="admin" id="cf_correo" type="email" value="${escapeAdminHtml(c.correo || '')}"></div>
      </div>
      <div class="admin-checkbox-row">
        <input type="checkbox" data-req="admin" id="cf_activo" ${c.activo ? 'checked' : ''} onchange="toggleAdminClienteActivo(${arg}, this.checked)">
        <label for="cf_activo">Puede entrar al catálogo (desmarcar para bloquearlo)</label>
      </div>
      ${ubicacionesClienteHtml(c.codigo)}
      <div class="admin-clave-box" id="cf_claveBox">
        <div>
          <b>Contraseña</b>
          <span>${c.debe_cambiar ? 'Tiene una contraseña temporal pendiente de cambiar.' : 'Ya creó su propia contraseña.'} Por seguridad no se puede ver.</span>
        </div>
        <button type="button" class="btn btn-ghost" data-req="admin" onclick="nuevaClaveAdminCliente(${arg})">Generar contraseña temporal</button>
      </div>
      <div class="admin-edit-actions">
        <span><button type="button" class="btn btn-danger" data-req="admin" onclick="deleteAdminCliente(${arg})">Enviar a la papelera</button></span>
        <div class="admin-edit-actions-end">
          <button type="button" class="btn btn-ghost" onclick="toggleAdminClientEdit(${arg})">Cancelar</button>
          <button type="button" class="btn btn-primary" data-req="admin" onclick="saveAdminCliente(${arg})">Guardar cambios</button>
        </div>
      </div>
    </div>
  `;
}

function claveTemporalHtml(codigo, clave) {
  return `
    <div class="admin-clave-nueva">
      <div>Contraseña temporal de <b>${escapeAdminHtml(codigo)}</b>:</div>
      <code>${escapeAdminHtml(clave)}</code>
      <div class="admin-row-sub">Entrégasela al cliente. Al entrar con su código y esta contraseña deberá crear la suya. No se vuelve a mostrar.</div>
      <button type="button" class="btn btn-ghost" onclick="copiarClaveAdmin(${adminJsArg(codigo)}, ${adminJsArg(clave)})">Copiar</button>
    </div>
  `;
}

function copiarClaveAdmin(codigo, clave) {
  const texto = `Catálogo ImpoHogar Market\nCódigo de cliente: ${codigo}\nContraseña temporal: ${clave}\n${location.origin}${location.pathname}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(
      () => adminSetMsg('Datos de acceso copiados.', 'ok'),
      () => adminSetMsg('No se pudo copiar automáticamente.', 'error'));
  }
}

async function nuevaClaveAdminCliente(codigo) {
  if (!confirm(`¿Generar una contraseña temporal nueva para ${codigo}? La contraseña actual deja de servir y su sesión abierta se cierra.`)) return;
  try {
    const r = await adminRpc('nevada_panel_clave_temporal', { p_codigo: codigo });
    const box = document.getElementById('cf_claveBox');
    if (box) box.outerHTML = claveTemporalHtml(codigo, r.clave_temporal);
    const c = adminClientesRows.find(x => x.codigo === codigo);
    if (c) { c.debe_cambiar = true; c.activo = true; }
    adminSetMsg('Contraseña temporal generada.', 'ok');
  } catch (err) {
    adminSetMsg('Error al generar la contraseña: ' + err.message, 'error');
  }
}

async function toggleAdminClienteActivo(codigo, activo) {
  try {
    await adminRpc('nevada_panel_cliente_activo', { p_codigo: codigo, p_activo: activo });
    const c = adminClientesRows.find(x => x.codigo === codigo);
    if (c) c.activo = activo;
    adminSetMsg(activo ? 'Cliente activado: ya puede entrar.' : 'Cliente bloqueado: ya no puede entrar y su sesión se cerró.', 'ok');
  } catch (err) {
    const chk = document.getElementById('cf_activo');
    if (chk) chk.checked = !activo;
    adminSetMsg('Error: ' + err.message, 'error');
  }
}

async function saveAdminCliente(codigo) {
  const datos = {
    p_codigo: codigo,
    p_nombre: document.getElementById('cf_nombre').value.trim(),
    p_vendedor: document.getElementById('cf_vendedor').value.trim(),
    p_tel1: document.getElementById('cf_tel1').value.trim(),
    p_tel2: document.getElementById('cf_tel2').value.trim(),
    p_correo: document.getElementById('cf_correo').value.trim()
  };
  if (!datos.p_nombre) {
    adminSetMsg('El nombre es obligatorio.', 'error');
    return;
  }
  try {
    await adminRpc('nevada_panel_cliente_guardar', datos);
    const c = adminClientesRows.find(x => x.codigo === codigo);
    if (c) Object.assign(c, { nombre: datos.p_nombre, vendedor: datos.p_vendedor || null, tel1: datos.p_tel1 || null, tel2: datos.p_tel2 || null, correo: datos.p_correo || null });
    renderClientesAdmin();
    adminSetMsg('Cliente actualizado.', 'ok');
  } catch (err) {
    adminSetMsg('Error al guardar: ' + err.message, 'error');
  }
}

async function deleteAdminCliente(codigo) {
  if (!confirm('¿Enviar este cliente a la papelera? Ya no podrá entrar al catálogo. Puedes restaurarlo luego desde "Ver papelera".')) return;
  try {
    await adminRpc('nevada_panel_cliente_papelera', { p_codigo: codigo, p_papelera: true });
    adminClientesRows = adminClientesRows.filter(c => c.codigo !== codigo);
    renderClientesAdmin();
    adminSetMsg('Cliente enviado a la papelera.', 'ok');
  } catch (err) {
    adminSetMsg('Error al eliminar: ' + err.message, 'error');
  }
}

async function restoreAdminCliente(codigo) {
  try {
    await adminRpc('nevada_panel_cliente_papelera', { p_codigo: codigo, p_papelera: false });
    adminClientesRows = adminClientesRows.filter(c => c.codigo !== codigo);
    renderClientesAdmin();
    adminSetMsg('Cliente restaurado: ya puede volver a entrar con su contraseña.', 'ok');
  } catch (err) {
    adminSetMsg('Error al restaurar: ' + err.message, 'error');
  }
}

async function permanentDeleteAdminCliente(codigo) {
  if (!confirm('¿Eliminar este cliente DEFINITIVAMENTE? Esta acción no se puede deshacer.')) return;
  try {
    await adminRpc('nevada_panel_cliente_eliminar', { p_codigo: codigo });
    adminClientesRows = adminClientesRows.filter(c => c.codigo !== codigo);
    renderClientesAdmin();
    adminSetMsg('Cliente eliminado definitivamente.', 'ok');
  } catch (err) {
    adminSetMsg('Error al eliminar: ' + err.message, 'error');
  }
}

function openAdminNewClient() {
  document.querySelectorAll('[id^="adminEditWrap-c"]').forEach(w => { w.innerHTML = ''; });
  const viejo = document.getElementById('adminNuevoCliente');
  if (viejo) viejo.remove();
  const body = document.getElementById('adminListBody');
  const holder = document.createElement('div');
  holder.innerHTML = `
    <div class="admin-edit-panel" id="adminNuevoCliente">
      <p class="admin-msg">Escribe el código que tiene el cliente en el sistema de la empresa. Si no lo tienes, déjalo en blanco y se genera uno provisional. Al crearlo se muestra su contraseña temporal.</p>
      <div class="admin-edit-grid">
        <div><label class="field-label" for="cfn_codigo">Código (opcional)</label><input class="field-input" id="cfn_codigo" placeholder="Se genera automático si se deja vacío"></div>
        <div><label class="field-label" for="cfn_vendedor">Vendedor</label><input class="field-input" id="cfn_vendedor"></div>
        <div class="field-full"><label class="field-label" for="cfn_nombre">Nombre</label><input class="field-input" id="cfn_nombre"></div>
        <div><label class="field-label" for="cfn_tel1">Teléfono 1</label><input class="field-input" id="cfn_tel1"></div>
        <div><label class="field-label" for="cfn_tel2">Teléfono 2</label><input class="field-input" id="cfn_tel2"></div>
        <div class="field-full"><label class="field-label" for="cfn_correo">Correo</label><input class="field-input" id="cfn_correo" type="email"></div>
      </div>
      <div id="cfn_resultado"></div>
      <div class="admin-edit-actions">
        <span></span>
        <div class="admin-edit-actions-end">
          <button type="button" class="btn btn-ghost" onclick="this.closest('.admin-edit-panel').remove()">Cerrar</button>
          <button type="button" class="btn btn-primary" id="cfn_crearBtn" onclick="saveAdminNewClient()">Crear cliente</button>
        </div>
      </div>
    </div>
  `;
  body.prepend(holder.firstElementChild);
  document.getElementById('cfn_codigo').focus();
}

async function saveAdminNewClient() {
  const datos = {
    p_codigo: document.getElementById('cfn_codigo').value.trim(),
    p_nombre: document.getElementById('cfn_nombre').value.trim(),
    p_vendedor: document.getElementById('cfn_vendedor').value.trim(),
    p_tel1: document.getElementById('cfn_tel1').value.trim(),
    p_tel2: document.getElementById('cfn_tel2').value.trim(),
    p_correo: document.getElementById('cfn_correo').value.trim()
  };
  if (!datos.p_nombre) {
    adminSetMsg('El nombre es obligatorio.', 'error');
    return;
  }
  const btn = document.getElementById('cfn_crearBtn');
  btn.disabled = true;
  try {
    const r = await adminRpc('nevada_panel_cliente_crear', datos);
    document.getElementById('cfn_resultado').innerHTML = claveTemporalHtml(r.codigo, r.clave_temporal);
    btn.remove();
    adminSetMsg(`Cliente creado con código ${r.codigo}.`, 'ok');
  } catch (err) {
    btn.disabled = false;
    adminSetMsg('Error al crear: ' + err.message, 'error');
  }
}

// ============================================================
//  SINCRONIZACION (estado del inventario y precios que sube el
//  sincronizador desde Interakzion)
// ============================================================
//  En perfumeria esta pestaña sube el stock desde un Excel. En Nevada
//  el stock y los precios P4 los sube solo el sincronizador
//  (herramientas/sincronizar_inventario), asi que aqui se muestra si
//  esta funcionando y cuando fue la ultima vez.
// ============================================================

const ADMIN_SYNC_ALERTA_MIN = 45;

function haceCuantoAdmin(iso) {
  if (!iso) return { txt: 'nunca', min: Infinity };
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  let txt;
  if (min < 1) txt = 'hace menos de un minuto';
  else if (min < 60) txt = `hace ${min} min`;
  else if (min < 48 * 60) txt = `hace ${Math.round(min / 60)} h`;
  else txt = `hace ${Math.round(min / 1440)} días`;
  return { txt, min };
}

async function loadSyncAdmin() {
  adminSetMsg('Cargando...');
  const body = document.getElementById('adminListBody');
  body.innerHTML = '';
  try {
    const r = await adminRpc('nevada_panel_estado_sync', {});
    const inv = r.inventario || {};
    const pre = r.precios || {};
    const cli = r.clientes || {};
    const pro = r.productos || {};
    const hInv = haceCuantoAdmin(inv.actualizado);
    const hPre = haceCuantoAdmin(pre.actualizado);
    const invTarde = hInv.min > ADMIN_SYNC_ALERTA_MIN;
    const preTarde = hPre.min > ADMIN_SYNC_ALERTA_MIN;
    const enCatalogo = typeof STOCK_FUENTE !== 'undefined' && STOCK_FUENTE.origen === 'supabase'
      ? 'El catálogo abierto ahora está usando el inventario en vivo.'
      : 'El catálogo abierto ahora está usando el respaldo (js/stock.js): el inventario en vivo no respondió al cargar.';
    body.innerHTML = `
      <div class="admin-ajustes-card">
        <div class="admin-ajustes-title">Sincronizador de Interakzion</div>
        <div class="admin-sync-estado ${invTarde || preTarde ? 'is-warn' : 'is-ok'}">
          ${invTarde || preTarde
            ? `La última subida fue ${escapeAdminHtml(hInv.txt)}. Revisa que la computadora del sincronizador esté encendida y con internet (la tarea programada corre cada 30 minutos).`
            : 'Funcionando: los datos llegaron hace poco.'}
        </div>
        <div class="admin-summary">
          <div class="admin-stat"><div class="admin-stat-n ${invTarde ? 'is-warn' : ''}">${escapeAdminHtml(hInv.txt)}</div><div class="admin-stat-l">Inventario · ${fmtDateTimeAdmin(inv.actualizado) || 'sin datos'}</div></div>
          <div class="admin-stat"><div class="admin-stat-n">${(inv.total || 0).toLocaleString('es-CR')}</div><div class="admin-stat-l">Códigos con cantidad (bodega principal)</div></div>
          <div class="admin-stat"><div class="admin-stat-n ${preTarde ? 'is-warn' : ''}">${escapeAdminHtml(hPre.txt)}</div><div class="admin-stat-l">Precios P4 · ${fmtDateTimeAdmin(pre.actualizado) || 'sin datos'}</div></div>
          <div class="admin-stat"><div class="admin-stat-n">${(pre.total || 0).toLocaleString('es-CR')}</div><div class="admin-stat-l">Precios P4 (solo van en el Excel del pedido)</div></div>
        </div>
        <p class="admin-row-sub" style="margin:0;">${escapeAdminHtml(enCatalogo)}</p>
      </div>
      <div class="admin-ajustes-card">
        <div class="admin-ajustes-title">Productos del catálogo</div>
        <div class="admin-summary">
          <div class="admin-stat"><div class="admin-stat-n">${pro.total || 0}</div><div class="admin-stat-l">Productos</div></div>
          <div class="admin-stat"><div class="admin-stat-n ${pro.sin_foto ? 'is-warn' : ''}">${pro.sin_foto || 0}</div><div class="admin-stat-l">Sin foto</div></div>
          <div class="admin-stat"><div class="admin-stat-n">${pro.ocultos || 0}</div><div class="admin-stat-l">Ocultos</div></div>
          <div class="admin-stat"><div class="admin-stat-n">${pro.papelera || 0}</div><div class="admin-stat-l">En la papelera</div></div>
        </div>
      </div>
      <div class="admin-ajustes-card">
        <div class="admin-ajustes-title">Acceso de clientes</div>
        <div class="admin-summary">
          <div class="admin-stat"><div class="admin-stat-n">${cli.activos || 0}</div><div class="admin-stat-l">Clientes activos de ${cli.total || 0}</div></div>
          <div class="admin-stat"><div class="admin-stat-n">${cli.ingresaron || 0}</div><div class="admin-stat-l">Ya entraron alguna vez</div></div>
          <div class="admin-stat"><div class="admin-stat-n">${cli.ingresaron_7d || 0}</div><div class="admin-stat-l">Entraron en los últimos 7 días</div></div>
          <div class="admin-stat"><div class="admin-stat-n">${cli.con_temporal || 0}</div><div class="admin-stat-l">Con contraseña temporal pendiente</div></div>
        </div>
      </div>
      <div style="text-align:right;"><button type="button" class="btn btn-ghost" onclick="loadSyncAdmin()">Actualizar</button></div>
    `;
    adminSetMsg('');
  } catch (err) {
    adminSetMsg('Error al leer el estado: ' + err.message, 'error');
  }
}

// ============================================================
//  PEDIDOS (tabla nevada_pedidos)
// ============================================================
//  Cada vez que un cliente genera su Excel se guarda el pedido con su
//  codigo de cliente (sale de su sesion) y, si lo envia por WhatsApp,
//  el vendedor que eligio. Nunca se guardan precios.
// ============================================================

const ADMIN_PEDIDOS_PAGE_SIZE = 50;
let adminPedidosOffset = 0;
let adminPedidosRows = [];
let adminClientesCache = [];
let adminClientesByCodigo = new Map();
let adminClientesCacheLoaded = false;

function normPhoneAdmin(s) { return (s || '').replace(/\D/g, ''); }
function normNameAdmin(s) { return (s || '').trim().toUpperCase().replace(/\s+/g, ' '); }

async function loadAllClientesForMatching() {
  try {
    const rows = await adminRpc('nevada_panel_clientes_todos', {});
    adminClientesCache = Array.isArray(rows) ? rows : [];
    adminClientesByCodigo = new Map(adminClientesCache.map(c => [c.codigo, c]));
    adminClientesCacheLoaded = true;
    const list = document.getElementById('adminClientesDatalist');
    if (list) {
      list.innerHTML = adminClientesCache.map(c => `<option value="${escapeAdminHtml(c.nombre)} — #${escapeAdminHtml(c.codigo)}"></option>`).join('');
    }
  } catch (err) {
    adminClientesCache = [];
    adminClientesByCodigo = new Map();
  }
}

function matchClienteAdmin(p) {
  if (p.cliente_codigo && adminClientesByCodigo.has(p.cliente_codigo)) {
    return adminClientesByCodigo.get(p.cliente_codigo);
  }
  const phone = normPhoneAdmin(p.cliente_telefono);
  if (phone) {
    const byPhone = adminClientesCache.find(c => normPhoneAdmin(c.tel1) === phone || normPhoneAdmin(c.tel2) === phone);
    if (byPhone) return byPhone;
  }
  const name = normNameAdmin(p.cliente_nombre);
  if (name) {
    const byName = adminClientesCache.find(c => normNameAdmin(c.nombre) === name);
    if (byName) return byName;
  }
  return null;
}

function onAdminPedidosFilterChange() {
  loadPedidosAdmin(true);
}

function clearAdminPedidosFilters() {
  document.getElementById('adminSearchInput').value = '';
  document.getElementById('adminPedidosFrom').value = '';
  document.getElementById('adminPedidosTo').value = '';
  document.getElementById('adminPedidosSoloSinVincular').checked = false;
  loadPedidosAdmin(true);
}

// Fechas del filtro (dia completo, hora local) en ISO, o null.
function adminRangoFechas(idDesde, idHasta) {
  const from = document.getElementById(idDesde).value;
  const to = document.getElementById(idHasta).value;
  return {
    p_desde: from ? new Date(from + 'T00:00:00').toISOString() : null,
    p_hasta: to ? new Date(to + 'T23:59:59.999').toISOString() : null
  };
}

async function fetchPedidosAdmin(buscar, rango, limite, offset) {
  const rows = await adminRpc('nevada_panel_pedidos', Object.assign({ p_buscar: buscar || '', p_limite: limite, p_offset: offset }, rango));
  return Array.isArray(rows) ? rows : [];
}

async function loadPedidosAdmin(reset) {
  if (reset) {
    adminPedidosOffset = 0;
    adminPedidosRows = [];
    adminEditingId = null;
    document.getElementById('adminListBody').innerHTML = '';
  }
  adminSetMsg('Cargando...');
  try {
    if (!adminClientesCacheLoaded) await loadAllClientesForMatching();
    const data = await fetchPedidosAdmin(document.getElementById('adminSearchInput').value.trim(),
      adminRangoFechas('adminPedidosFrom', 'adminPedidosTo'), ADMIN_PEDIDOS_PAGE_SIZE, adminPedidosOffset);
    adminPedidosRows = adminPedidosRows.concat(data);
    renderPedidosRows();
    document.getElementById('adminPedidosLoadMoreWrap').style.display = data.length < ADMIN_PEDIDOS_PAGE_SIZE ? 'none' : 'block';
    adminPedidosOffset += data.length;
    renderPedidosSummary();
    adminSetMsg(adminPedidosRows.length ? `${adminPedidosRows.length} pedido(s) cargado(s)` : '');
  } catch (err) {
    adminSetMsg('Error al cargar pedidos: ' + err.message, 'error');
  }
}

function pedidoProductsPreview(items) {
  if (!items.length) return '<span class="admin-muted">Sin detalle</span>';
  const preview = items.slice(0, 2).map(it => escapeAdminHtml(it.name || it.code || '')).join(', ');
  const restCount = items.length - 2;
  return `${preview}${restCount > 0 ? ` <span class="admin-accent">+${restCount} más</span>` : ''}`;
}

function pedidoClientePill(p) {
  const match = matchClienteAdmin(p);
  if (match) {
    return `<span class="admin-pill admin-pill-ok">#${escapeAdminHtml(match.codigo)}</span>`;
  }
  return `<span class="admin-pill admin-pill-off">Sin vincular</span>`;
}

function renderPedidosRows() {
  adminEditingId = null;
  const body = document.getElementById('adminListBody');
  const soloSinVincular = document.getElementById('adminPedidosSoloSinVincular').checked;
  const rows = adminPedidosRows.filter(p => !soloSinVincular || !matchClienteAdmin(p));
  if (!rows.length) {
    body.innerHTML = '<p class="admin-msg">Sin pedidos con estos filtros.</p>';
    return;
  }
  body.innerHTML = rows.map(p => {
    const items = Array.isArray(p.items) ? p.items : [];
    const quien = [escapeAdminHtml(p.cliente_telefono || ''), p.vendedor ? 'enviado a ' + escapeAdminHtml(p.vendedor) : ''].filter(Boolean).join(' · ');
    return `
    <div class="admin-list">
      <div class="admin-row" onclick="toggleAdminPedidoDetail(${adminJsArg(p.id)})">
        <div class="admin-row-main">
          <div class="admin-row-title">${escapeAdminHtml(p.cliente_nombre)} <span class="admin-muted" style="font-weight:400;">· ${fmtDateTimeAdmin(p.creado_en)}</span></div>
          <div class="admin-row-sub">${quien ? quien + ' · ' : ''}${pedidoProductsPreview(items)} · ${p.total_unidades} uds</div>
          <div class="admin-row-sub admin-ubic-fila">${pedidoUbicacionHtml(p)}</div>
        </div>
        ${pedidoClientePill(p)}
      </div>
      <div id="adminEditWrap-o${escapeAdminHtml(p.id)}"></div>
    </div>
  `;
  }).join('');
}

function toggleAdminPedidoDetail(id) {
  const wrap = document.getElementById(`adminEditWrap-o${id}`);
  if (!wrap) return;
  if (adminEditingId === id) {
    wrap.innerHTML = '';
    adminEditingId = null;
    return;
  }
  document.querySelectorAll('[id^="adminEditWrap-o"]').forEach(w => { w.innerHTML = ''; });
  adminEditingId = id;
  const p = adminPedidosRows.find(x => x.id === id);
  if (!p) return;
  const items = Array.isArray(p.items) ? p.items : [];
  const match = matchClienteAdmin(p);
  const cab = `<div class="admin-row-sub" style="margin-bottom:6px;">${match ? `Cliente del sistema: #${escapeAdminHtml(match.codigo)} · ${escapeAdminHtml(match.nombre)}` : 'Pedido sin cliente vinculado'}${p.vendedor ? ` · Enviado por WhatsApp a ${escapeAdminHtml(p.vendedor)}` : ''}</div>`;
  const itemsHtml = items.length
    ? items.map(it => `
        <div class="admin-pedido-item">
          <span>${escapeAdminHtml(it.brand || '')} — ${escapeAdminHtml(it.name || '')} <span class="admin-muted">(${escapeAdminHtml(it.code || '')})</span></span>
          <b>${escapeAdminHtml(it.qty)}</b>
        </div>`).join('')
    : '<span class="admin-muted">Sin detalle de productos</span>';
  const linkHtml = match ? '' : `
    <div class="admin-link-form" data-req="admin">
      <input type="text" class="field-input" id="adminVincularInput-${escapeAdminHtml(id)}" list="adminClientesDatalist" placeholder="Buscar cliente del sistema (nombre)...">
      <button type="button" class="btn btn-primary" onclick="vincularPedidoAdmin(${adminJsArg(id)})">Vincular</button>
    </div>
  `;
  const ubic = p.ubic_provincia || p.ubic_equipo ? `
    <div class="admin-ubic-detalle">
      <b>Ubicación aproximada del pedido</b>
      <div>${pedidoUbicacionHtml(p)}</div>
      <div class="admin-muted">${[p.ubic_proveedor, p.ubic_equipo].filter(Boolean).map(escapeAdminHtml).join(' · ')}</div>
    </div>` : '';
  wrap.innerHTML = `<div class="admin-pedido-detail">${ubic}${cab}${itemsHtml}${linkHtml}</div>`;
}

// ---------- Ubicacion aproximada de los pedidos ----------
// Se calcula en Supabase con la conexion a internet del cliente al
// guardar el pedido (lista de DB-IP Lite) y se borra a los 6 meses.
// Con datos moviles suele salir San Jose aunque la persona este en otra
// provincia: esos pedidos llevan la marca "datos moviles".
const ADMIN_MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
let adminUbicaciones = new Map(); // codigo -> [{ lugar, provincia, pedidos, movil, desde, hasta }]

async function loadUbicacionesAdmin() {
  try {
    const rows = await adminRpc('nevada_panel_ubicaciones', {});
    adminUbicaciones = new Map();
    (Array.isArray(rows) ? rows : []).forEach(r => {
      if (!adminUbicaciones.has(r.cliente_codigo)) adminUbicaciones.set(r.cliente_codigo, []);
      adminUbicaciones.get(r.cliente_codigo).push(r);
    });
    adminUbicaciones.forEach(l => l.sort((a, b) => String(b.hasta).localeCompare(String(a.hasta))));
  } catch (err) {
    adminUbicaciones = new Map();
  }
}

function ubicacionesClienteAdmin(codigo) {
  return adminUbicaciones.get(codigo) || [];
}

function ubicLugarAdmin(u) {
  const lugar = u.lugar || u.ubic_lugar, prov = u.provincia || u.ubic_provincia;
  return lugar && lugar !== prov ? `${lugar}, ${prov}` : (lugar || prov || '');
}

function ubicMovilAdminHtml() {
  return '<span class="admin-ubic-movil" title="Con datos móviles la ubicación suele salir como San José aunque la persona esté en otra provincia.">datos móviles · puede ser inexacta</span>';
}

function mesAnioAdmin(d) { return `${ADMIN_MESES[d.getMonth()]} ${d.getFullYear()}`; }
function rangoMesesAdmin(desde, hasta) {
  const a = new Date(desde), b = new Date(hasta);
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return mesAnioAdmin(a);
  return a.getFullYear() === b.getFullYear() ? `${ADMIN_MESES[a.getMonth()]} – ${mesAnioAdmin(b)}` : `${mesAnioAdmin(a)} – ${mesAnioAdmin(b)}`;
}

function pedidoUbicacionHtml(p) {
  if (!p.ubic_provincia) {
    const viejo = new Date(p.creado_en) < new Date(Date.now() - 183 * 864e5);
    return `<span class="admin-muted">📍 ${viejo ? 'Sin ubicación (más de 6 meses)' : p.ubic_equipo ? 'Ubicación no identificada' : 'Sin ubicación'}</span>`;
  }
  return `<span class="admin-ubic-lugar">📍 ${escapeAdminHtml(ubicLugarAdmin(p))}</span>${p.ubic_movil ? ' ' + ubicMovilAdminHtml() : ''}`;
}

function ubicacionesClienteHtml(codigo) {
  const lista = ubicacionesClienteAdmin(codigo);
  const items = lista.map((u, i) => `
        <div class="admin-ubic-item${i === 0 ? ' es-reciente' : ''}">
          <span class="admin-ubic-pin" aria-hidden="true">📍</span>
          <div><b>${escapeAdminHtml(ubicLugarAdmin(u))}</b>${i === 0 && lista.length > 1 ? ' <span class="admin-ubic-ultima">la más reciente</span>' : ''}
            <small>${u.pedidos} ${u.pedidos === 1 ? 'pedido' : 'pedidos'} · ${rangoMesesAdmin(u.desde, u.hasta)}</small>
            ${u.movil === u.pedidos ? ubicMovilAdminHtml() : ''}</div>
        </div>`).join('');
  return `
      <div class="admin-ubic-cliente">
        <div class="admin-ubic-titulo"><b>Ubicaciones de sus pedidos</b><span>Aproximadas, según la conexión a internet · últimos 6 meses · datos de <a href="https://db-ip.com" target="_blank" rel="noopener">DB-IP</a></span></div>
        ${items || '<div class="admin-muted">Sin pedidos con ubicación en los últimos 6 meses.</div>'}
      </div>`;
}

async function vincularPedidoAdmin(id) {
  const input = document.getElementById(`adminVincularInput-${id}`);
  const raw = input ? input.value : '';
  const m = /—\s*#(\S+)\s*$/.exec(raw);
  if (!m) {
    adminSetMsg('Elige un cliente de la lista (empieza a escribir el nombre).', 'error');
    return;
  }
  const codigo = m[1];
  try {
    await adminRpc('nevada_panel_pedido_vincular', { p_id: id, p_codigo: codigo });
    const p = adminPedidosRows.find(x => x.id === id);
    if (p) p.cliente_codigo = codigo;
    adminEditingId = null;
    renderPedidosRows();
    renderPedidosSummary();
    adminSetMsg('Pedido vinculado.', 'ok');
  } catch (err) {
    adminSetMsg('Error al vincular: ' + err.message, 'error');
  }
}

function renderPedidosSummary() {
  const el = document.getElementById('adminPedidosSummary');
  const totalPedidos = adminPedidosRows.length;
  const totalUnidades = adminPedidosRows.reduce((s, p) => s + (p.total_unidades || 0), 0);
  const vinculados = adminPedidosRows.filter(p => matchClienteAdmin(p)).length;
  const sinVincular = totalPedidos - vinculados;
  const clientes = new Set(adminPedidosRows.map(p => p.cliente_codigo).filter(Boolean)).size;
  el.innerHTML = `
    <div class="admin-stat"><div class="admin-stat-n">${totalPedidos}</div><div class="admin-stat-l">Pedidos cargados</div></div>
    <div class="admin-stat"><div class="admin-stat-n">${totalUnidades}</div><div class="admin-stat-l">Unidades pedidas</div></div>
    <div class="admin-stat"><div class="admin-stat-n">${clientes}</div><div class="admin-stat-l">Clientes distintos</div></div>
    <div class="admin-stat"><div class="admin-stat-n ${sinVincular ? 'is-warn' : ''}">${sinVincular}</div><div class="admin-stat-l">Sin vincular</div></div>
  `;
}

async function exportAdminPedidosExcel() {
  if (typeof ExcelJS === 'undefined') {
    adminSetMsg('Librería Excel no cargó, revisa tu conexión a internet.', 'error');
    return;
  }
  if (!adminPedidosRows.length) {
    adminSetMsg('No hay pedidos cargados para exportar.', 'error');
    return;
  }
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Pedidos');
  sheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 20 },
    { header: 'Código cliente', key: 'codigoCliente', width: 16 },
    { header: 'Cliente (sistema)', key: 'clienteSistema', width: 30 },
    { header: 'Cliente (como se escribió)', key: 'clienteEscrito', width: 30 },
    { header: 'Teléfono', key: 'telefono', width: 16 },
    { header: 'Vendedor', key: 'vendedor', width: 18 },
    { header: 'Código producto', key: 'codigo', width: 16 },
    { header: 'Producto', key: 'producto', width: 45 },
    { header: 'Marca', key: 'marca', width: 20 },
    { header: 'Cantidad', key: 'cantidad', width: 12 }
  ];
  sheet.getRow(1).font = { bold: true };
  adminPedidosRows.forEach(p => {
    const match = matchClienteAdmin(p);
    const items = Array.isArray(p.items) && p.items.length ? p.items : [{}];
    items.forEach(it => {
      sheet.addRow({
        fecha: fmtDateTimeAdmin(p.creado_en),
        codigoCliente: match ? match.codigo : (p.cliente_codigo || ''),
        clienteSistema: match ? match.nombre : 'Sin vincular',
        clienteEscrito: p.cliente_nombre,
        telefono: p.cliente_telefono,
        vendedor: p.vendedor || '',
        codigo: it.code || '',
        producto: it.name || '',
        marca: it.brand || '',
        cantidad: it.qty || ''
      });
    });
  });
  await descargarExcelAdmin(wb, `Reporte_Pedidos_Nevada_${hoyAdmin()}.xlsx`);
}

// ============================================================
//  RANKING DE MAS PEDIDOS
// ============================================================
//  Suma las cantidades pedidas por producto y por marca a partir de
//  los pedidos guardados, para ayudar a decidir que reponer primero.
//  Se calcula en el navegador sobre hasta 2000 pedidos del rango.
// ============================================================

let adminRankingLoading = false;

function loadRankingAdmin() {
  const body = document.getElementById('adminListBody');
  body.innerHTML = `
    <div class="admin-toolbar" style="margin-bottom:18px;">
      <div>
        <label class="field-label" for="adminRankingFrom">Desde</label>
        <input id="adminRankingFrom" class="field-input admin-date" type="date">
      </div>
      <div>
        <label class="field-label" for="adminRankingTo">Hasta</label>
        <input id="adminRankingTo" class="field-input admin-date" type="date">
      </div>
      <button type="button" class="btn btn-primary admin-toolbar-btn" onclick="calcularRankingAdmin()">Calcular</button>
    </div>
    <div id="adminRankingResult"></div>
  `;
  calcularRankingAdmin();
}

async function calcularRankingAdmin() {
  if (adminRankingLoading) return;
  adminRankingLoading = true;
  adminSetMsg('Calculando...');
  const resultEl = document.getElementById('adminRankingResult');
  if (resultEl) resultEl.innerHTML = '';
  try {
    const rows = await fetchPedidosAdmin('', adminRangoFechas('adminRankingFrom', 'adminRankingTo'), 2000, 0);
    const porProducto = new Map(); // code -> { code, name, brand, qty, pedidos }
    const porMarca = new Map();    // brand -> qty
    rows.forEach(p => {
      const items = Array.isArray(p.items) ? p.items : [];
      items.forEach(it => {
        const code = it.code || it.name || '?';
        const qty = parseInt(it.qty) || 0;
        if (!porProducto.has(code)) {
          porProducto.set(code, { code: it.code || '', name: it.name || code, brand: it.brand || '', qty: 0, pedidos: 0 });
        }
        const entry = porProducto.get(code);
        entry.qty += qty;
        entry.pedidos += 1;
        if (it.brand) porMarca.set(it.brand, (porMarca.get(it.brand) || 0) + qty);
      });
    });
    const topProductos = Array.from(porProducto.values()).sort((a, b) => b.qty - a.qty).slice(0, 25);
    const topMarcas = Array.from(porMarca.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
    renderRankingAdmin(rows.length, topProductos, topMarcas);
    adminSetMsg(`Calculado sobre ${rows.length} pedido(s).`);
  } catch (err) {
    adminSetMsg('Error al calcular el ranking: ' + err.message, 'error');
  } finally {
    adminRankingLoading = false;
  }
}

function renderRankingAdmin(totalPedidos, topProductos, topMarcas) {
  const resultEl = document.getElementById('adminRankingResult');
  if (!resultEl) return;
  if (!totalPedidos) {
    resultEl.innerHTML = '<p class="admin-msg">No hay pedidos en ese rango.</p>';
    return;
  }
  const maxProdQty = (topProductos.length && topProductos[0].qty) || 1;
  const maxMarcaQty = (topMarcas.length && topMarcas[0][1]) || 1;
  resultEl.innerHTML = `
    <div class="admin-ajustes-card">
      <h3 class="admin-ajustes-title">Productos más pedidos</h3>
      <div class="admin-table-wrap">
      <table class="admin-ranking-table">
        <thead><tr><th>Producto</th><th>Código</th><th>Pedidos</th><th>Unidades</th></tr></thead>
        <tbody>
          ${topProductos.map(p => `
            <tr>
              <td>${escapeAdminHtml(p.brand)}${p.brand ? ' — ' : ''}${escapeAdminHtml(p.name)}<div class="admin-ranking-bar"><div class="admin-ranking-bar-fill" style="width:${Math.round(p.qty / maxProdQty * 100)}%"></div></div></td>
              <td>${escapeAdminHtml(p.code)}</td>
              <td class="num">${p.pedidos}</td>
              <td class="num">${p.qty}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </div>
    </div>
    <div class="admin-ajustes-card">
      <h3 class="admin-ajustes-title">Marcas más pedidas</h3>
      <table class="admin-ranking-table">
        <thead><tr><th>Marca</th><th>Unidades</th></tr></thead>
        <tbody>
          ${topMarcas.map(([brand, qty]) => `
            <tr>
              <td>${escapeAdminHtml(brand)}<div class="admin-ranking-bar"><div class="admin-ranking-bar-fill" style="width:${Math.round(qty / maxMarcaQty * 100)}%"></div></div></td>
              <td class="num">${qty}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================================
//  AJUSTES (rotacion de Nuevos Ingresos + vendedores)
// ============================================================
//  Viven en la tabla nevada_ajustes (filas "low_rotation" y
//  "vendedores"). El catalogo los lee al cargar (js/arranque.js); al
//  cerrar el panel se recarga la pagina para aplicarlos.
//  (Perfumeria tiene ademas "Marcas del carrusel"; Nevada no usa
//  carrusel de marcas, por eso no esta.)
// ============================================================

let adminAjustesLowRotation = null; // { start_date, batches: [[codigo,...], ...] }
let adminAjustesVendedores = null;  // [{ name, role, phone, img }, ...]

async function loadAjustesAdmin() {
  adminSetMsg('Cargando...');
  document.getElementById('adminListBody').innerHTML = '';
  try {
    // Los ajustes son de lectura publica (el catalogo los usa al cargar).
    const cfg = adminCfg();
    const resp = await fetch(`${cfg.url}/rest/v1/nevada_ajustes?select=clave,valor`, { headers: { apikey: cfg.clavePublica }, cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const rows = await resp.json();
    const lr = rows.find(r => r.clave === 'low_rotation');
    const vd = rows.find(r => r.clave === 'vendedores');
    adminAjustesLowRotation = (lr && lr.valor) ? lr.valor
      : { start_date: LOW_ROTATION_START_DATE || '', batches: (LOW_ROTATION_BATCHES || []).map(b => b.slice()) };
    if (!Array.isArray(adminAjustesLowRotation.batches)) adminAjustesLowRotation.batches = [];
    const fuenteVend = (vd && vd.valor && typeof vd.valor === 'object') ? vd.valor : SELLERS;
    adminAjustesVendedores = Object.keys(fuenteVend).map(k => ({
      name: fuenteVend[k].name || '', role: fuenteVend[k].role || '', phone: fuenteVend[k].phone || '', img: fuenteVend[k].img || ''
    }));
    renderAjustesAdmin();
    adminSetMsg('');
  } catch (err) {
    adminSetMsg('Error al cargar ajustes: ' + err.message, 'error');
  }
}

function renderAjustesAdmin() {
  const body = document.getElementById('adminListBody');
  const lr = adminAjustesLowRotation;
  const batchesHtml = lr.batches.map((batch, i) => `
    <div class="admin-batch-row" data-batch-idx="${i}">
      <span class="admin-batch-n">Lote ${i + 1}</span>
      <input class="field-input" data-req="admin" data-batch-codes value="${escapeAdminHtml(batch.join(', '))}" placeholder="Códigos de barras separados por coma">
      <button type="button" class="btn btn-ghost" data-req="admin" onclick="removeAjusteBatchRow(${i})" title="Eliminar lote" aria-label="Eliminar lote">✕</button>
    </div>
  `).join('');
  const vendedoresHtml = adminAjustesVendedores.map((v, i) => `
    <div class="admin-marca-row admin-vendedor-row" data-vendedor-idx="${i}">
      <input class="field-input" data-req="admin" data-vendedor-nombre value="${escapeAdminHtml(v.name)}" placeholder="Nombre" aria-label="Nombre del vendedor">
      <input class="field-input" data-req="admin" data-vendedor-rol value="${escapeAdminHtml(v.role)}" placeholder="Cargo, ej: Ejecutiva de ventas" aria-label="Cargo">
      <input class="field-input" data-req="admin" data-vendedor-tel value="${escapeAdminHtml(v.phone)}" placeholder="WhatsApp, ej: 50687203737" aria-label="WhatsApp">
      <input class="field-input" data-req="admin" data-vendedor-img value="${escapeAdminHtml(v.img)}" placeholder="Foto, ej: img/vendedores/ana.webp" aria-label="Foto">
      <button type="button" class="btn btn-ghost" data-req="admin" onclick="removeAjusteVendedorRow(${i})" title="Eliminar vendedor" aria-label="Eliminar vendedor">✕</button>
    </div>
  `).join('');
  body.innerHTML = `
    <div class="admin-ajustes-card">
      <h3 class="admin-ajustes-title">Baja rotación / Nuevos Ingresos</h3>
      <p class="admin-msg">Cada semana se muestra un lote distinto de estos productos en "Nuevos Ingresos", rotando en el orden en que aparecen aquí. Escribe los códigos de barras de cada lote separados por coma. Sin lotes, solo se muestran los productos marcados como Nuevo Ingreso.</p>
      <div class="admin-edit-grid" style="margin-bottom:12px;">
        <div>
          <label class="field-label" for="ajLowRotationStart">Fecha de inicio de la rotación</label>
          <input class="field-input" data-req="admin" id="ajLowRotationStart" type="date" value="${escapeAdminHtml(lr.start_date || '')}">
        </div>
      </div>
      <div id="ajBatchesWrap">${batchesHtml || '<p class="admin-msg">Sin lotes todavía.</p>'}</div>
      <div class="admin-edit-actions">
        <button type="button" class="btn btn-ghost" data-req="admin" onclick="addAjusteBatchRow()">+ Agregar lote</button>
        <button type="button" class="btn btn-primary" data-req="admin" onclick="saveAjustesLowRotation()">Guardar rotación</button>
      </div>
    </div>
    <div class="admin-ajustes-card">
      <h3 class="admin-ajustes-title">Vendedores (WhatsApp)</h3>
      <p class="admin-msg">Son las opciones que ve el cliente al enviar su pedido por WhatsApp y en "Contactar vendedor". El teléfono debe llevar código de país sin espacios ni signos (ej: 50687203737). La foto se sube aparte al repositorio; si se deja vacía, se muestra una tarjeta con el nombre.</p>
      <div id="ajVendedoresWrap">${vendedoresHtml || '<p class="admin-msg">Sin vendedores todavía.</p>'}</div>
      <div class="admin-edit-actions">
        <button type="button" class="btn btn-ghost" data-req="admin" onclick="addAjusteVendedorRow()">+ Agregar vendedor</button>
        <button type="button" class="btn btn-primary" data-req="admin" onclick="saveAjustesVendedores()">Guardar vendedores</button>
      </div>
    </div>
  `;
}

function readAjustesBatchesFromDom(dejarVacios) {
  const rows = document.querySelectorAll('#ajBatchesWrap [data-batch-codes]');
  return Array.from(rows)
    .map(inp => inp.value.split(/[,\s]+/).map(s => s.trim()).filter(Boolean))
    .filter(batch => dejarVacios || batch.length);
}

function addAjusteBatchRow() {
  adminAjustesLowRotation.start_date = document.getElementById('ajLowRotationStart').value;
  adminAjustesLowRotation.batches = readAjustesBatchesFromDom(true);
  adminAjustesLowRotation.batches.push([]);
  renderAjustesAdmin();
}

function removeAjusteBatchRow(i) {
  const batches = readAjustesBatchesFromDom(true);
  batches.splice(i, 1);
  adminAjustesLowRotation.start_date = document.getElementById('ajLowRotationStart').value;
  adminAjustesLowRotation.batches = batches;
  renderAjustesAdmin();
}

function readAjustesVendedoresFromDom(dejarVacios) {
  const rows = document.querySelectorAll('#ajVendedoresWrap [data-vendedor-idx]');
  return Array.from(rows)
    .map(row => ({
      name: row.querySelector('[data-vendedor-nombre]').value.trim(),
      role: row.querySelector('[data-vendedor-rol]').value.trim(),
      phone: row.querySelector('[data-vendedor-tel]').value.replace(/\D/g, ''),
      img: row.querySelector('[data-vendedor-img]').value.trim()
    }))
    .filter(v => dejarVacios || (v.name && v.phone));
}

function addAjusteVendedorRow() {
  adminAjustesVendedores = readAjustesVendedoresFromDom(true);
  adminAjustesVendedores.push({ name: '', role: '', phone: '', img: '' });
  renderAjustesAdmin();
}

function removeAjusteVendedorRow(i) {
  const vs = readAjustesVendedoresFromDom(true);
  vs.splice(i, 1);
  adminAjustesVendedores = vs;
  renderAjustesAdmin();
}

// Genera una llave corta y unica (sin tildes ni espacios) a partir
// del nombre del vendedor, para usar como clave del objeto SELLERS
// (ej. "Roy Chacón" -> "roy-chacon"). Si dos vendedores comparten
// nombre, se numeran (roy-chacon-2).
function sellerKeyFromName(name, usedKeys) {
  const base = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'vendedor';
  let key = base, n = 2;
  while (usedKeys.has(key)) { key = `${base}-${n}`; n++; }
  usedKeys.add(key);
  return key;
}

async function upsertAjusteRow(clave, valor) {
  await adminRpc('nevada_panel_ajuste_guardar', { p_clave: clave, p_valor: valor });
}

async function saveAjustesLowRotation() {
  const startDate = document.getElementById('ajLowRotationStart').value;
  const batches = readAjustesBatchesFromDom(false);
  if (batches.length && !startDate) {
    adminSetMsg('Elige una fecha de inicio.', 'error');
    return;
  }
  const valor = { start_date: startDate || '', batches };
  try {
    await upsertAjusteRow('low_rotation', valor);
    adminAjustesLowRotation = valor;
    adminHuboCambios = true;
    renderAjustesAdmin();
    adminSetMsg('Rotación guardada. Se aplica al catálogo al cerrar el panel.', 'ok');
  } catch (err) {
    adminSetMsg('Error al guardar: ' + err.message, 'error');
  }
}

async function saveAjustesVendedores() {
  const todos = readAjustesVendedoresFromDom(true);
  const incompletos = todos.filter(v => (v.name || v.phone || v.role || v.img) && !(v.name && v.phone));
  if (incompletos.length) {
    adminSetMsg('Cada vendedor necesita nombre y WhatsApp.', 'error');
    return;
  }
  const vendedores = todos.filter(v => v.name && v.phone);
  if (!vendedores.length) {
    adminSetMsg('Agrega al menos un vendedor.', 'error');
    return;
  }
  const usedKeys = new Set();
  const valor = {};
  vendedores.forEach(v => {
    const s = { name: v.name, role: v.role, phone: v.phone };
    if (v.img) s.img = v.img;
    valor[sellerKeyFromName(v.name, usedKeys)] = s;
  });
  try {
    await upsertAjusteRow('vendedores', valor);
    adminAjustesVendedores = vendedores;
    adminHuboCambios = true;
    renderAjustesAdmin();
    adminSetMsg('Vendedores guardados. Se aplican al catálogo al cerrar el panel.', 'ok');
  } catch (err) {
    adminSetMsg('Error al guardar: ' + err.message, 'error');
  }
}

// ============================================================
//  HISTORIAL DE CAMBIOS (nevada_auditoria)
// ============================================================

const ADMIN_HISTORIAL_PAGE_SIZE = 50;
let adminHistorialOffset = 0;
let adminHistorialRows = [];

const ADMIN_ACCION_LABELS = {
  crear: 'Creó', editar: 'Editó', eliminar: 'Eliminó', vincular: 'Vinculó',
  papelera: 'Envió a la papelera', restaurar: 'Restauró', eliminar_definitivo: 'Eliminó definitivamente',
  clave_temporal: 'Generó contraseña temporal para', activar: 'Activó', bloquear: 'Bloqueó',
  corregir_stock: 'Corrigió a mano el stock de'
};
const ADMIN_ENTIDAD_LABELS = {
  producto: 'un producto', cliente: 'un cliente', pedido: 'un pedido',
  low_rotation: 'la rotación de Nuevos Ingresos', vendedores: 'los vendedores'
};

function historialDetalleTexto(row) {
  const d = row.detalle;
  if (!d || typeof d !== 'object') return '';
  const parts = [];
  if (d.code && !('despues' in d)) parts.push(`código ${d.code}`);
  if (d.name) parts.push(d.name);
  if (d.nombre) parts.push(d.nombre);
  if (d.cliente_codigo) parts.push(`cliente #${d.cliente_codigo}`);
  if ('despues' in d) parts.push(`stock ${d.antes == null ? '—' : d.antes} → ${d.despues}`);
  if (d.start_date) parts.push(`inicio ${d.start_date}`);
  if (typeof d.lotes === 'number') parts.push(`${d.lotes} lote(s)`);
  if (typeof d.total === 'number') parts.push(`${d.total} vendedor(es)`);
  return parts.join(' · ');
}


async function loadHistorialAdmin(reset) {
  if (reset) {
    adminHistorialOffset = 0;
    adminHistorialRows = [];
    document.getElementById('adminListBody').innerHTML = '';
  }
  adminSetMsg('Cargando...');
  try {
    const res = await adminRpc('nevada_panel_historial', {
      p_buscar: document.getElementById('adminSearchInput').value.trim(), p_limite: ADMIN_HISTORIAL_PAGE_SIZE, p_offset: adminHistorialOffset
    });
    const data = Array.isArray(res) ? res : [];
    adminHistorialRows = adminHistorialRows.concat(data);
    renderHistorialAdmin();
    document.getElementById('adminPedidosLoadMoreWrap').style.display = data.length < ADMIN_HISTORIAL_PAGE_SIZE ? 'none' : 'block';
    adminHistorialOffset += data.length;
    adminSetMsg(adminHistorialRows.length ? `${adminHistorialRows.length} registro(s) cargado(s)` : 'Sin registros todavía.');
  } catch (err) {
    adminSetMsg('Error al cargar el historial: ' + err.message, 'error');
  }
}

function renderHistorialAdmin() {
  const body = document.getElementById('adminListBody');
  if (!adminHistorialRows.length) {
    body.innerHTML = '<p class="admin-msg">Sin registros todavía.</p>';
    return;
  }
  body.innerHTML = `<div class="admin-list">` + adminHistorialRows.map(row => {
    const accionLbl = ADMIN_ACCION_LABELS[row.accion] || row.accion;
    const entidadLbl = ADMIN_ENTIDAD_LABELS[row.entidad] || row.entidad;
    const detalle = historialDetalleTexto(row);
    return `
      <div class="admin-row admin-row-static">
        <div class="admin-row-main">
          <div class="admin-row-title">${escapeAdminHtml(accionLbl)} ${escapeAdminHtml(entidadLbl)}${row.entidad_id ? ` <span class="admin-muted">(${escapeAdminHtml(row.entidad_id)})</span>` : ''}</div>
          <div class="admin-row-sub">${escapeAdminHtml(row.admin_cliente ? 'Cliente ' + row.admin_cliente : (row.admin_email || 'admin'))} · ${fmtDateTimeAdmin(row.creado_en)}${detalle ? ' · ' + escapeAdminHtml(detalle) : ''}</div>
        </div>
      </div>
    `;
  }).join('') + `</div>`;
}

function loadMoreAdmin() {
  if (adminTab === 'historial') loadHistorialAdmin(false);
  else loadPedidosAdmin(false);
}

// Escape cierra el panel como las demas ventanas.
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.getElementById('adminPanelModal').classList.contains('open')) closeAdminPanel();
});
