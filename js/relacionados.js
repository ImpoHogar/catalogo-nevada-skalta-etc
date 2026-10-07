// ============================================================
//  PRODUCTOS RELACIONADOS ("TAMBIEN TE PUEDE INTERESAR")
// ============================================================
//  La ficha de cada producto muestra "Tambien te puede interesar".
//  Sale de dos fuentes, en este orden:
//
//  1. RELACIONES (a mano): productos que conviene ofrecer juntos o que
//     se reemplazan entre si. Cada entrada cubre las dos direcciones y
//     se escribe con los CODIGOS DE BARRAS exactos:
//
//       { a: "886540006029", b: "886540006623", tipo: 'complemento' },
//
//     tipos:  'complemento'  -> se usa junto con (cable + cargador,
//                               limpiador + tonico, etc.)
//             'alternativa'  -> reemplaza a (otro modelo, otro tono)
//     Estas relaciones tambien activan el boton "Relacionados" de la
//     tarjeta.
//
//  2. RELACION_POR_TIPO (automatica): para cada tipo de producto
//     ("categoria|tipo", como en js/taxonomy.js) los tipos que lo
//     complementan. Ej.: un cargador muestra cables y power banks; una
//     pila AA muestra otras presentaciones AA y luego otros tamanos.
//     Dentro de cada tipo se prefieren: misma linea/marca, mismo
//     conector, con stock y con foto. Nunca es al azar.
//     "categoria|*" vale para todos los tipos de esa categoria.
// ============================================================

const RELACIONES = [
];

const RELACION_POR_TIPO = {
  // ---- Tecnologia ----
  'carga-energia|Cargadores de pared':       ['cables-adaptadores|Cables de carga y datos', 'carga-energia|Power banks', 'carga-energia|Cargadores de vehículo'],
  'carga-energia|Cargadores de vehículo':    ['cables-adaptadores|Cables de carga y datos', 'soportes-accesorios|Soportes para celular', 'carga-energia|Cargadores de pared'],
  'carga-energia|Cargadores inalámbricos':   ['carga-energia|Cargadores de pared', 'cables-adaptadores|Cables de carga y datos'],
  'carga-energia|Power banks':               ['cables-adaptadores|Cables de carga y datos', 'carga-energia|Cargadores de pared'],
  'carga-energia|Regletas y protección':     ['carga-energia|Cargadores de pared', 'cables-adaptadores|Adaptadores'],
  'cables-adaptadores|Cables de carga y datos': ['carga-energia|Cargadores de pared', 'carga-energia|Cargadores de vehículo', 'carga-energia|Power banks', 'cables-adaptadores|Adaptadores'],
  'cables-adaptadores|Adaptadores':          ['cables-adaptadores|Cables de carga y datos', 'cables-adaptadores|Hubs y lectores'],
  'cables-adaptadores|Video (HDMI / DP / VGA)': ['cables-adaptadores|Hubs y lectores', 'cables-adaptadores|Adaptadores', 'soportes-accesorios|Soportes de TV y monitor'],
  'cables-adaptadores|Hubs y lectores':      ['cables-adaptadores|Video (HDMI / DP / VGA)', 'cables-adaptadores|Adaptadores', 'computacion|Accesorios de PC'],
  'cables-adaptadores|Red':                  ['cables-adaptadores|Adaptadores', 'cables-adaptadores|Hubs y lectores'],
  'audio|Audífonos':                         ['audio|Earbuds inalámbricos', 'audio|Headsets gamer', 'cables-adaptadores|Adaptadores'],
  'audio|Earbuds inalámbricos':              ['audio|Audífonos', 'carga-energia|Power banks', 'cables-adaptadores|Cables de carga y datos'],
  'audio|Headsets gamer':                    ['computacion|Mouse', 'computacion|Teclados y combos', 'computacion|Mouse pads'],
  'audio|Parlantes':                         ['audio|Micrófonos', 'carga-energia|Power banks', 'cables-adaptadores|Cables de carga y datos'],
  'audio|Micrófonos':                        ['audio|Parlantes', 'soportes-accesorios|Iluminación y selfie'],
  'computacion|Mouse':                       ['computacion|Mouse pads', 'computacion|Teclados y combos', 'audio|Headsets gamer'],
  'computacion|Teclados y combos':           ['computacion|Mouse', 'computacion|Mouse pads'],
  'computacion|Mouse pads':                  ['computacion|Mouse', 'computacion|Teclados y combos'],
  'computacion|Mochilas y fundas':           ['computacion|Accesorios de PC', 'computacion|Mouse', 'carga-energia|Power banks'],
  'computacion|Accesorios de PC':            ['computacion|Mouse', 'computacion|Teclados y combos', 'cables-adaptadores|Hubs y lectores'],
  'smart|Smartwatches':                      ['carga-energia|Cargadores de pared', 'audio|Earbuds inalámbricos'],
  'smart|Cámaras de seguridad':              ['smart|Hogar inteligente', 'carga-energia|Cargadores de pared'],
  'smart|Cámaras y vlogging':                ['soportes-accesorios|Iluminación y selfie', 'audio|Micrófonos'],
  'soportes-accesorios|Soportes para celular': ['carga-energia|Cargadores de vehículo', 'soportes-accesorios|Iluminación y selfie'],
  'soportes-accesorios|Iluminación y selfie':  ['soportes-accesorios|Soportes para celular', 'audio|Micrófonos'],
  'soportes-accesorios|Soportes de TV y monitor': ['cables-adaptadores|Video (HDMI / DP / VGA)', 'carga-energia|Regletas y protección'],
  // ---- Baterias: primero las otras presentaciones del mismo tamano ----
  'baterias|*':                              ['baterias|*'],
  // ---- Cuidado personal ----
  'cabello|Shampoo y acondicionador':        ['cabello|Tratamientos', 'cabello|Peinado y definición', 'cabello|Sets capilares'],
  'cabello|Tratamientos':                    ['cabello|Shampoo y acondicionador', 'cabello|Peinado y definición', 'cabello|Sets capilares'],
  'cabello|Peinado y definición':            ['cabello|Tratamientos', 'cabello|Shampoo y acondicionador'],
  'cabello|Sets capilares':                  ['cabello|Tratamientos', 'cabello|Peinado y definición'],
  'barberia|*':                              ['barberia|*'],
  'skincare|Limpieza':                       ['skincare|Tónicos y pads', 'skincare|Sérums y ampollas', 'skincare|Cremas e hidratación'],
  'skincare|Tónicos y pads':                 ['skincare|Sérums y ampollas', 'skincare|Cremas e hidratación', 'skincare|Limpieza'],
  'skincare|Sérums y ampollas':              ['skincare|Cremas e hidratación', 'skincare|Tónicos y pads', 'skincare|Protección solar'],
  'skincare|Cremas e hidratación':           ['skincare|Sérums y ampollas', 'skincare|Protección solar', 'skincare|Limpieza'],
  'skincare|Mascarillas':                    ['skincare|Sérums y ampollas', 'skincare|Cremas e hidratación'],
  'skincare|Protección solar':               ['skincare|Cremas e hidratación', 'skincare|Limpieza'],
  'skincare|Sets y kits':                    ['skincare|Sérums y ampollas', 'skincare|Cremas e hidratación'],
  'maquillaje|Bases y cushions':             ['maquillaje|Correctores y polvos', 'maquillaje|Mejillas', 'skincare|Protección solar'],
  'maquillaje|Correctores y polvos':         ['maquillaje|Bases y cushions', 'maquillaje|Mejillas'],
  'maquillaje|Mejillas':                     ['maquillaje|Labios', 'maquillaje|Bases y cushions'],
  'maquillaje|Labios':                       ['maquillaje|Mejillas', 'maquillaje|Ojos y cejas'],
  'maquillaje|Ojos y cejas':                 ['maquillaje|Labios', 'maquillaje|Bases y cushions'],
  'cuidado-corporal|Exfoliantes':            ['cuidado-corporal|Cremas y mantequillas', 'cuidado-corporal|Baño y ducha', 'cuidado-corporal|Brumas corporales'],
  'cuidado-corporal|Cremas y mantequillas':  ['cuidado-corporal|Exfoliantes', 'cuidado-corporal|Aceites corporales', 'cuidado-corporal|Brumas corporales'],
  'cuidado-corporal|Baño y ducha':           ['cuidado-corporal|Exfoliantes', 'cuidado-corporal|Cremas y mantequillas'],
  'cuidado-corporal|Brumas corporales':      ['cuidado-corporal|Cremas y mantequillas', 'cuidado-corporal|Exfoliantes'],
  'cuidado-corporal|Aceites corporales':     ['cuidado-corporal|Cremas y mantequillas', 'cuidado-corporal|Exfoliantes'],
  'cuidado-corporal|Cuidado de labios':      ['maquillaje|Labios', 'cuidado-corporal|Exfoliantes'],
  // ---- Hogar ----
  'cocina|*':                                ['cocina|*'],
  'cuidado-ropa|*':                          ['cocina|*']
};

function relacionEtiqueta(tipo) {
  return tipo === 'alternativa' ? 'Alternativa'
       : tipo === 'complemento' ? 'Complemento'
       : 'Relacionado';
}

PRODUCTS.forEach(p => { PRODUCTS_BY_ID[p.id] = p; });

const PRODUCTS_BY_CODE = {};
PRODUCTS.forEach(p => { PRODUCTS_BY_CODE[p.code] = p; });

function getRelatedProducts(pid) {
  const rels = [];
  const p = PRODUCTS_BY_ID[pid];
  if (!p) return rels;
  RELACIONES.forEach(r => {
    const a = PRODUCTS_BY_CODE[r.a];
    const b = PRODUCTS_BY_CODE[r.b];
    if (!a || !b) return;
    if (a.id === pid) rels.push({ product: b, tipo: r.tipo });
    else if (b.id === pid) rels.push({ product: a, tipo: r.tipo });
  });
  return rels;
}

// Palabras "de linea" del nombre (ej. "Mais Cachos", "Aguacate"):
// sirven para preferir productos de la misma linea.
const REL_STOP = new Set(['para', 'con', 'del', 'los', 'las', 'set', 'capilar', 'crema', 'gel', 'cable', 'tipo', 'unid', 'pack', 'skala', 'nevada', 'argom', 'unno', 'tekno', 'tirtir', 'kara', 'beauty', 'tree', 'hut']);
function relWords(p) {
  if (p._relw) return p._relw;
  return (p._relw = new Set(normText(prettyName(p)).split(/[^a-z0-9]+/).filter(w => w.length > 3 && !REL_STOP.has(w) && !/^\d+$/.test(w))));
}

// Puntaje de cercania entre dos productos (no al azar).
function relScore(p, x) {
  let s = 0;
  if (x.brand === p.brand) s += 30;
  const w = relWords(p);
  relWords(x).forEach(t => { if (w.has(t)) s += 12; });
  const cp = specValue(p, 'Conector'), cx = specValue(x, 'Conector');
  if (cp && cx) s += cp === cx ? 25 : -15;
  if (p.cat === 'baterias') { if (batterySize(x) === batterySize(p)) s += 60; }
  const st = parseInt(x.stock) || 0;
  if (st > 0) s += 20;
  if (x.img) s += 8;
  return s;
}

// "Tambien te puede interesar": manuales primero, luego por tipo.
function suggestedProducts(p, n) {
  const out = [];
  const seen = new Set([p.id]);
  const push = x => { if (x && !seen.has(x.id) && !x.hidden) { seen.add(x.id); out.push(x); } };
  getRelatedProducts(p.id).forEach(r => push(r.product));
  const rules = RELACION_POR_TIPO[p.cat + '|' + p.tipo] || RELACION_POR_TIPO[p.cat + '|*'] || [];
  rules.forEach((key, i) => {
    const [c, t] = key.split('|');
    const pool = VISIBLE_PRODUCTS.filter(x => !seen.has(x.id) && x.cat === c && (t === '*' || x.tipo === t) && (parseInt(x.stock) || 0) > 0);
    const per = Math.max(3, Math.ceil((n - out.length) / Math.max(1, rules.length - i)));
    pool.sort((a, b) => relScore(p, b) - relScore(p, a) || a.id - b.id).slice(0, per).forEach(push);
  });
  return out.slice(0, n);
}

function dupePanelHTML(pid) {
  const rels = getRelatedProducts(pid);
  if (!rels.length) return '';
  const items = rels.map(r => {
    const rp = r.product;
    const imgSrc = productImgSrc(rp);
    const label = relacionEtiqueta(r.tipo);
    const stockNum = parseInt(rp.stock) || 0;
    const agotado = stockNum <= 0;
    const qty = qtyMap[rp.id] || 0;
    const qtyControls = agotado
      ? `<span class="dupe-item-agotado">Sin stock</span>`
      : `<button type="button" onclick="event.stopPropagation(); dupeChangeQty(${rp.id}, -1)" aria-label="Quitar una unidad">−</button>
         <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" value="${qty}" id="dupe-qty-${rp.id}"
                onclick="event.stopPropagation()" onfocus="this.select()"
                onchange="event.stopPropagation(); dupeSetQty(${rp.id}, this.value)">
         <button type="button" onclick="event.stopPropagation(); dupeChangeQty(${rp.id}, 1)" aria-label="Agregar una unidad">+</button>`;
    return `<div class="dupe-item">
      <img src="${imgSrc}" alt="" onclick="event.stopPropagation(); jumpToProduct(${rp.id})">
      <div class="dupe-item-text" onclick="event.stopPropagation(); jumpToProduct(${rp.id})" title="Ir a este producto"><div class="dupe-item-brand">${escapeHtml(rp.brand)} · ${label}</div><div class="dupe-item-name">${escapeHtml(prettyName(rp))}</div></div>
      <div class="dupe-item-qty">${qtyControls}</div>
    </div>`;
  }).join('');
  return `
    <button type="button" class="dupe-btn" onclick="event.stopPropagation(); toggleDupePanel(${pid})" aria-controls="dupe-panel-${pid}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/></svg>
      Relacionados
      <span class="dupe-count">${rels.length}</span>
      <svg class="dupe-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <div class="dupe-panel" id="dupe-panel-${pid}">
      <div class="dupe-label">Relacionado con:</div>
      ${items}
    </div>`;
}

function dupeSetQty(id, val) {
  setQty(id, val);
  const dInput = document.getElementById('dupe-qty-' + id);
  if (dInput) dInput.value = qtyMap[id] || 0;
}

function dupeChangeQty(id, delta) {
  const newVal = Math.max(0, (qtyMap[id] || 0) + delta);
  dupeSetQty(id, newVal);
}

function toggleDupePanel(pid) {
  const panel = document.getElementById('dupe-panel-' + pid);
  if (panel) panel.classList.toggle('open');
}

function jumpToProduct(pid) {
  const card = document.getElementById('card-' + pid);
  if (!card) { setStatus('Ese producto no está visible con los filtros actuales.', true); return; }
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.classList.add('dupe-highlight');
  setTimeout(() => card.classList.remove('dupe-highlight'), 1600);
}
