// ============================================================
//  INVENTARIO EN VIVO DESDE SUPABASE
// ============================================================
//  Al abrir el catalogo se piden las existencias a Supabase (tabla
//  "nevada_inventario", fila id = 'stock', columna datos =
//  {"codigo": cantidad}). Si llegan a tiempo, reemplazan las de
//  js/stock.js; si no (sin internet, Supabase caido, tabla vacia),
//  el catalogo sigue con js/stock.js. Nunca bloquea la carga mas de
//  INVENTARIO_EN_VIVO.esperaMs.
//
//  Solo cambia cantidades: productos, nombres, fotos y marcas siguen
//  saliendo de js/products.js.
//
//  Cargar DESPUES de catalog.js y ANTES de main.js.
// ============================================================

let STOCK_FUENTE = { origen: 'stock.js', actualizado: null };

async function cargarStockEnVivo() {
  const cfg = typeof INVENTARIO_EN_VIVO !== 'undefined' ? INVENTARIO_EN_VIVO : null;
  if (!cfg || !cfg.activo || !cfg.url || !cfg.clavePublica) return false;
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctl && ctl.abort(), cfg.esperaMs || 3500);
  try {
    const resp = await fetch(`${cfg.url}/rest/v1/${cfg.tabla}?id=eq.stock&select=datos,actualizado`, {
      headers: { apikey: cfg.clavePublica, Authorization: `Bearer ${cfg.clavePublica}` },
      signal: ctl ? ctl.signal : undefined,
      cache: 'no-store'
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const filas = await resp.json();
    const fila = Array.isArray(filas) ? filas[0] : null;
    if (!fila || !fila.datos || typeof fila.datos !== 'object') throw new Error('sin datos');
    return aplicarStockEnVivo(fila.datos, fila.actualizado);
  } catch (err) {
    console.warn('Inventario en vivo no disponible, se usa stock.js:', err && err.message);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Aplica las cantidades nuevas. Si la mayoria de los codigos del
// catalogo no vienen en los datos, algo esta mal: no se toca nada.
function aplicarStockEnVivo(datos, actualizado) {
  const encontrados = PRODUCTS.filter(p => Object.prototype.hasOwnProperty.call(datos, p.code)).length;
  if (encontrados < PRODUCTS.length * 0.5) {
    console.warn(`Inventario en vivo descartado: solo ${encontrados} de ${PRODUCTS.length} codigos.`);
    return false;
  }
  PRODUCTS.forEach(p => {
    if (!Object.prototype.hasOwnProperty.call(datos, p.code)) return;   // sin dato: queda el de stock.js
    const q = Math.max(0, Math.round(Number(datos[p.code]) || 0));
    STOCK[p.code] = q;
    p.stock = String(q);
  });
  // Lo que depende del stock se vuelve a calcular: agotados al final y
  // oportunidades automaticas.
  const orden = new Map(VISIBLE_PRODUCTS_RAW.map((p, i) => [p, i]));
  const agotado = p => (parseInt(p.stock) || 0) <= 0 ? 1 : 0;
  VISIBLE_PRODUCTS.sort((a, b) => agotado(a) - agotado(b) || orden.get(a) - orden.get(b));
  if (typeof buildOpportunities === 'function') buildOpportunities();
  STOCK_FUENTE = { origen: 'supabase', actualizado: actualizado ? new Date(actualizado) : null };
  return true;
}

// "Inventario actualizado hoy 08:30" (o la fecha si no es de hoy).
function stockActualizadoTexto() {
  const d = STOCK_FUENTE.actualizado;
  if (STOCK_FUENTE.origen !== 'supabase' || !d || isNaN(d)) return '';
  const hora = d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  return `Inventario actualizado ${mismoDia ? 'hoy' : d.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })} ${hora}`;
}
