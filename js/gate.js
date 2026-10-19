// ============================================================
//  INGRESO DE CLIENTES (codigo de cliente + contrasena)
// ============================================================
//  Cada cliente entra con su codigo del sistema y su contrasena. La
//  validacion la hace Supabase (funciones public.nevada_*); aqui solo
//  se guarda en este navegador el token de la sesion (dura 30 dias).
//  La primera vez, con la contrasena temporal que le da su vendedor,
//  se le obliga a crear una propia antes de entrar.
//
//  Si el cliente ya tiene una sesion valida, entra directo sin pasar
//  por la vitrina ni por esta pantalla.
// ============================================================

const SESION_KEY = 'impohogar_nevada_sesion';
let SESION = null;            // { token, codigo, nombre }
let claveTemporalEnMemoria = '';

function accesoRpc(fn, args) {
  const cfg = ACCESO_CLIENTES;
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), cfg.esperaMs) : null;
  return fetch(`${cfg.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: cfg.clavePublica, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: ctrl ? ctrl.signal : undefined
  }).then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.status === 204 ? null : r.json();
  }).finally(() => { if (timer) clearTimeout(timer); });
}

function leerSesionGuardada() {
  try { return JSON.parse(localStorage.getItem(SESION_KEY) || 'null'); } catch (e) { return null; }
}
function guardarSesion(s) {
  SESION = s;
  try { localStorage.setItem(SESION_KEY, JSON.stringify(s)); } catch (e) {}
}
function borrarSesion() {
  SESION = null;
  try { localStorage.removeItem(SESION_KEY); } catch (e) {}
}

// Muestra el catalogo y el nombre del cliente en el encabezado.
function mostrarCatalogo() {
  const vitrina = document.getElementById('vitrina');
  if (vitrina && vitrina.style.display !== 'none') {
    vitrina.style.display = 'none';
    if (typeof vitrinaDetiene === 'function') vitrinaDetiene();
  }
  document.getElementById('gate').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
  pintarClienteEnEncabezado();
}

function pintarClienteEnEncabezado() {
  const el = document.getElementById('huCliente');
  const salir = document.getElementById('huSalir');
  if (!el || !SESION) return;
  el.textContent = `Cliente ${SESION.codigo} · ${SESION.nombre}`;
  el.title = el.textContent;
  el.hidden = false;
  if (salir) salir.hidden = false;
  if (typeof renderMobileMenu === 'function') { try { renderMobileMenu(); } catch (e) {} }
}

function mostrarPaso(paso) {
  document.getElementById('gateLogin').hidden = paso !== 'login';
  document.getElementById('gateCambio').hidden = paso !== 'cambio';
}

function mostrarCambioDeClave() {
  mostrarPaso('cambio');
  const primerNombre = (SESION && SESION.nombre) ? SESION.nombre : '';
  document.getElementById('gateCambioIntro').textContent =
    `Hola${primerNombre ? ', ' + primerNombre : ''}. Por seguridad, cambia la contraseña temporal por una tuya. Debe tener al menos 8 caracteres.`;
  document.getElementById('gateCambioUser').value = SESION ? SESION.codigo : '';
  // Si se recargo la pagina, ya no tenemos la temporal: se pide de nuevo.
  document.getElementById('gateActualWrap').hidden = !!claveTemporalEnMemoria;
  document.getElementById('gateCambioError').textContent = '';
  const foco = document.getElementById(claveTemporalEnMemoria ? 'gateNueva' : 'gateActual');
  try { foco.focus({ preventScroll: true }); } catch (e) { foco.focus(); }
}

function ocupado(btn, si, texto) {
  btn.disabled = si;
  if (si) { btn.dataset.txt = btn.innerHTML; btn.textContent = texto; }
  else if (btn.dataset.txt) btn.innerHTML = btn.dataset.txt;
}

async function ingresar(e) {
  if (e) e.preventDefault();
  const codigo = document.getElementById('gateCode').value.trim();
  const clave = document.getElementById('gatePass').value;
  const err = document.getElementById('gateError');
  err.textContent = '';
  if (!codigo || !clave) { err.textContent = 'Escribe tu código de cliente y tu contraseña.'; return; }
  const btn = document.getElementById('gateBtn');
  ocupado(btn, true, 'Verificando…');
  try {
    const r = await accesoRpc('nevada_ingresar', { p_codigo: codigo, p_clave: clave });
    if (!r || !r.ok) { err.textContent = (r && r.error) || 'Código o contraseña incorrectos.'; return; }
    guardarSesion({ token: r.token, codigo: r.codigo, nombre: r.nombre });
    document.getElementById('gatePass').value = '';
    if (r.debe_cambiar) { claveTemporalEnMemoria = clave; mostrarCambioDeClave(); }
    else mostrarCatalogo();
  } catch (ex) {
    err.textContent = 'No se pudo conectar. Revisa tu internet e intenta de nuevo.';
  } finally {
    ocupado(btn, false);
  }
}

async function cambiarClave(e) {
  if (e) e.preventDefault();
  const err = document.getElementById('gateCambioError');
  const actual = claveTemporalEnMemoria || document.getElementById('gateActual').value;
  const nueva = document.getElementById('gateNueva').value;
  const nueva2 = document.getElementById('gateNueva2').value;
  err.textContent = '';
  if (!actual) { err.textContent = 'Escribe la contraseña temporal que te dio tu vendedor.'; return; }
  if (nueva.length < 8) { err.textContent = 'La nueva contraseña debe tener al menos 8 caracteres.'; return; }
  if (nueva !== nueva2) { err.textContent = 'Las dos contraseñas no coinciden.'; return; }
  if (!SESION) { mostrarPaso('login'); return; }
  const btn = document.getElementById('gateCambioBtn');
  ocupado(btn, true, 'Guardando…');
  try {
    const r = await accesoRpc('nevada_cambiar_clave', { p_token: SESION.token, p_actual: actual, p_nueva: nueva });
    if (!r || !r.ok) {
      err.textContent = (r && r.error) || 'No se pudo cambiar la contraseña.';
      if (r && /venci/.test(r.error || '')) { borrarSesion(); setTimeout(() => mostrarPaso('login'), 1500); }
      else if (r && /actual/.test(r.error || '')) { claveTemporalEnMemoria = ''; document.getElementById('gateActualWrap').hidden = false; }
      return;
    }
    claveTemporalEnMemoria = '';
    ['gateActual', 'gateNueva', 'gateNueva2'].forEach(id => { document.getElementById(id).value = ''; });
    mostrarCatalogo();
    if (typeof notify === 'function') notify('✓ Contraseña guardada. ¡Bienvenido!');
  } catch (ex) {
    err.textContent = 'No se pudo conectar. Revisa tu internet e intenta de nuevo.';
  } finally {
    ocupado(btn, false);
  }
}

function salirDelCatalogo() {
  const s = SESION;
  borrarSesion();
  const recargar = () => { location.hash = ''; location.reload(); };
  if (s && s.token) accesoRpc('nevada_salir', { p_token: s.token }).catch(() => {}).finally(recargar);
  else recargar();
}

// Precios P4 (IVA incluido) para el Excel del pedido. Devuelve
// { datos: {codigo: precio}, actualizado } o null si no hay sesion
// valida o no hay conexion. Nunca se guardan en el navegador.
async function cargarPreciosP4() {
  if (!SESION) return null;
  try {
    const r = await accesoRpc('nevada_precios', { p_token: SESION.token });
    return r && r.ok ? { datos: r.datos || {}, actualizado: r.actualizado } : null;
  } catch (e) {
    return null;
  }
}

document.getElementById('gateLogin').addEventListener('submit', ingresar);
document.getElementById('gateCambio').addEventListener('submit', cambiarClave);

// Muestra la animacion de bienvenida por un momento y despues la
// esconde para revelar la vitrina / pantalla de ingreso de debajo.
setTimeout(() => {
  const welcome = document.getElementById('welcomeScreen');
  if (!welcome) return;
  welcome.classList.add('fade-out');
  setTimeout(() => { welcome.style.display = 'none'; }, 500);
}, 2300);

// Sesion guardada: si sigue vigente, entra directo.
(function revisarSesionGuardada() {
  const s = leerSesionGuardada();
  if (!s || !s.token) return;
  SESION = s;
  accesoRpc('nevada_sesion', { p_token: s.token }).then(r => {
    if (!r || !r.ok) { borrarSesion(); return; }
    guardarSesion({ token: s.token, codigo: r.codigo, nombre: r.nombre });
    if (r.debe_cambiar) mostrarCambioDeClave();
    else mostrarCatalogo();
  }).catch(() => {
    // Sin conexion: se deja la sesion guardada y se muestra el ingreso.
  });
})();
