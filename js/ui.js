// ============================================================
//  PRESENTACION DE PRODUCTOS
// ============================================================
//  Todo lo que se muestra "mas bonito" sale de los datos reales de
//  products.js: no se inventa nada. Aca vive:
//    - CATEGORY_META: nombre corto, grupo, tono e icono de cada categoria
//    - prettyName(): nombres legibles (el Excel del pedido sigue
//      usando el nombre original)
//    - p.subtipo: tipo de producto, deducido de palabras del nombre
//    - productSpecs(): datos tecnicos / tono / tamano que ya vienen
//      escritos en el nombre
//    - stockLevel(): disponible / ultimas unidades / agotado
//  Cargar DESPUES de data.js y utils.js, ANTES de catalog.js.
// ============================================================

const ICONS = {
  tech: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10l-1.5 9h-7z"/><path d="M8.5 12h7l1 3H7.5z"/><rect x="6.5" y="15" width="11" height="6" rx="1.5"/></svg>',
  makeup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21h6v-8H9z"/><path d="M10 13V9.5L14 6v7"/><path d="M8 21h8"/></svg>',
  face: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 3h5v3h-5z"/><path d="M10.5 6v2.5M13.5 6v2.5"/><rect x="7" y="8.5" width="10" height="12.5" rx="2.5"/><path d="M10 13.5c0 1.5 1 2.5 2 2.5s2-1 2-2.5"/></svg>',
  body: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3h4M12 3v3M12 4h4"/><path d="M10 6h4v2h-4z"/><rect x="7" y="8" width="10" height="13" rx="2.5"/><path d="M9.5 13h5"/></svg>',
  hair: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="6.5" cy="6.5" r="2.5"/><path d="M8.6 7.9 20 17M8.6 16.1 20 7"/></svg>',
  other: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/></svg>',
  spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
  grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
  cable: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v4M12 3v4M6.5 7h7v4a3.5 3.5 0 0 1-7 0z"/><path d="M10 14.5V17a4 4 0 0 0 8 0V9"/><path d="M16 5h4v4h-4z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/></svg>',
  battery: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="4" width="10" height="17" rx="2"/><path d="M10 2.5h4M12 9v5M9.5 11.5h5"/></svg>',
  mouse: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="3" width="11" height="18" rx="5.5"/><path d="M12 3v6"/></svg>',
  watch: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="3"/><path d="M9 6.5 9.5 3h5l.5 3.5M9 17.5l.5 3.5h5l.5-3.5M12 10v2.5l1.5 1"/></svg>',
  stand: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="12" rx="1.5"/><path d="M12 15v4M7 21h10"/></svg>',
  iron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17h15a3 3 0 0 0 3-3v-1H8a5 5 0 0 0-5 4z"/><path d="M8 13l1.5-5H18a3 3 0 0 1 3 3v2"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  chevR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  chevL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  chevD: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
  tag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z"/><circle cx="8.5" cy="8.5" r="1.4"/></svg>',
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.3-5.4 3.6-7.8.4 2 1.4 3.2 2.6 3.7C11.4 7.6 12.6 5 15 3c-.2 3 1 4.6 2.2 6.3 1 1.5 1.3 3 1.3 4.5C18.5 18.4 15.9 21 12 21z"/></svg>',
  box: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9M7.8 5.3l8.4 4.5"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5h15v10h-8l-4.5 3.5v-3.5H4.5z"/></svg>',
  file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
  store: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5 12v8h14v-8M10 20v-5h4v5"/></svg>',
  home2: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11 12 4l8 7M6 9.5V20h12V9.5"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
  calc: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7h7M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.7M12 17h.01"/></svg>',
  dots: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12h.01M12 12h.01M18.5 12h.01" stroke-width="3"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.2M12 17h.01"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a7.5 7.5 0 0 1 13-5.1L19.5 9.5M19.5 4.5v5h-5M20 12a7.5 7.5 0 0 1-13 5.1L4.5 14.5M4.5 19.5v-5h5"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ic-fill"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2zm4.5 12.1c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8.9-.1.2-.3.2-.5.1-.2-.1-1.1-.4-2-1.3-.7-.7-1.2-1.5-1.4-1.7-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4.1-.1 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.4 1 2.5c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3z"/></svg>'
};

// Grupo = "mundo" visual al que pertenece la categoria:
//   beauty -> editorial, blanco, suave     tech -> tecnico, oscuro
//   care   -> limpio, fresco
const CATEGORY_META = {
  'Maquillaje':         { short: 'Maquillaje',        group: 'beauty', icon: 'makeup', blurb: 'Bases, labios, rubores y cejas' },
  'Cuidado facial':     { short: 'Skincare',          group: 'beauty', icon: 'face',   blurb: 'Limpieza, sérums y K-beauty' },
  'Cuidado corporal':   { short: 'Cuidado corporal',  group: 'care',   icon: 'body',   blurb: 'Exfoliantes, cremas y baño' },
  'Cabello y barbería': { short: 'Cabello',           group: 'care',   icon: 'hair',   blurb: 'Tratamientos, peinado y barbería' },
  'Tecnología':         { short: 'Tecnología',        group: 'tech',   icon: 'tech',   blurb: 'Audio, carga, cables y accesorios' },
  'Electrodomésticos':  { short: 'Hogar y cocina',    group: 'tech',   icon: 'home',   blurb: 'Pequeños electrodomésticos' },
  'Otros':              { short: 'Otros',             group: 'care',   icon: 'other',  blurb: '' }
};

function catMeta(cat) { return CATEGORY_META[cat] || CATEGORY_META['Otros']; }
function iconSVG(name) { return ICONS[name] || ICONS.other; }

// ------------------------------------------------------------
//  Nombres legibles
// ------------------------------------------------------------
const KEEP_UPPER = new Set(['IA','USB','HDMI','TWS','LED','VGA','AUX','BT','RGB','SPF','UV','PD','QC','TV','PC','DJ','AI','BB','CC','SOS','PHA','NAD+','PDRN','II','III','XL','XXL','LCD','SD','GPS','DC','AC','CAT6','CAT5E','UTP','TH','KB','NYC','LOL','PJ','VGA','DP','OTG','AAA','AA','ML','4K','3D','2D']);
const KEEP_LOWER = new Set(['de','del','la','el','y','con','para','en','a','por','the','and','of','to','with','for','in','x']);

function prettyWord(w, i) {
  if (!w) return w;
  if (/[\/(]/.test(w) && w.length > 2) {
    return w.split(/([\/(])/).map((seg, k) => /[\/(]/.test(seg) ? seg : prettyWord(seg, k === 0 ? i : 1)).join('');
  }
  const bare = w.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü0-9+]/g, '');
  if (/\d/.test(w)) return w.toUpperCase();              // 21N, 65W, 30ML, 1.5M
  if (KEEP_UPPER.has(bare.toUpperCase())) return w.toUpperCase();
  const low = w.toLowerCase();
  if (i > 0 && KEEP_LOWER.has(bare.toLowerCase())) return low;
  return low.replace(/^([^a-záéíóúñü]*)([a-záéíóúñü])/, (m, pre, c) => pre + c.toUpperCase());
}

// Codigo de modelo al inicio del nombre (tecnologia): "AC-0104", "CB4073BL",
// "ARG-CB-0071BK", "TS-292R". Se muestra aparte como especificacion.
const MODEL_RE = /^((?:ARG-)?[A-Z]{1,4}[- ]?\d{2,5}[A-Z]{0,4}(?:-\d{1,3}[A-Z]{0,3})?)\s+/;
// Codigos cortos sin guion, con letras y numeros mezclados ("IS2AQ",
// "BST3RR", "MBNDCK5MG"): solo cuentan si tienen al menos 5 caracteres y
// no son una medida (ML, MAH, W, GB...).
const MODEL_RE_2 = /^([A-Z]{1,6}\d{1,4}[A-Z]{1,5}\d{0,2}[A-Z]{0,3})\s+/;
const NOT_MODEL = /^\d*(ML|MAH|MM|CM|GB|TB|W|V|L|G|KG|OZ|PK|PCS|PZA)$/;
function matchModel(name) {
  const n = String(name);
  const m = n.match(MODEL_RE);
  if (m) return m;
  const m2 = n.match(MODEL_RE_2);
  if (m2 && m2[1].length >= 5 && !NOT_MODEL.test(m2[1])) return m2;
  return null;
}

function modelCode(p) {
  if (!p || catMeta(p.categoria).group !== 'tech') return '';
  const m = matchModel(p.name);
  return m ? m[1].replace(/\s+/, '-') : '';
}

function prettyName(p) {
  if (!p) return '';
  if (p._pretty) return p._pretty;
  let n = String(p.name).replace(/\s+/g, ' ').trim();
  const model = modelCode(p);
  if (model) {
    n = n.slice(matchModel(n)[0].length);
    // a veces el modelo viene repetido: "AC-0122BK AC0122BLK CARGADOR"
    // a veces el modelo viene repetido ("AC-1242 AC-1242 ...", "AC-0122BK AC0122BLK ...")
    const compact = model.replace(/[- ]/g, '').slice(0, 5);
    const first = n.split(' ')[0] || '';
    if (first.replace(/[- ]/g, '').toUpperCase().startsWith(compact)) n = n.slice(first.length).trim();
  }
  n = n.replace(/^\d{5,}\s+/, '');                              // SKU numerico al inicio ("723410 LR06-10PK ...")
  n = stripBrand(n, p.brand);
  n = n.replace(/\bCRE,A\b/gi, 'CREMA');
  n = n.replace(/\s+-\s+-\s+/g, ' - ').replace(/^\s*-\s*/, '').replace(/\s*-\s*$/, '');
  p._pretty = n.split(' ').map(prettyWord).map(fixAccents).join(' ');
  return p._pretty;
}

// La marca ya se muestra arriba del nombre: se quita del nombre para no
// repetirla ("TIRTIR · Tirtir Glow Tint" -> "TIRTIR · Glow Tint").
const BRAND_TOKENS = {
  'TIRTIR': ['TIRTIR'], 'NEVADA': ['NEVADA'], 'ORIGEM': ['ORIGEM', 'ORIGM'], 'IMMORTAL': ['IMMORTAL'],
  'SKALA': ['SKALA'], 'ARGOM': ['ARGOM'], 'MAXELL': ['MAXELL'], 'UNNO TEKNO': ['UNNO TEKNO', 'UNNO'],
  'EQQUALBERRY': ['EQQUALB.', 'EQQUALBERRY'], 'PATRICIA DE LEÓN': ['PATRICIA DE LEÓN', 'PATRICIA DE LEON'],
  'TREE HUT': ['TREE HUT', 'TH'], 'KARA BEAUTY': ['KARA BEAUTY', 'KB'], 'NIVEA': ['NIVEA'], 'INOAR': ['INOAR'],
  'BRENTWOOD': ['BRENTWOOD'], 'NOSTALGIA': ['NOSTALGIA'], 'WAHL': ['WAHL'], 'SALON LINE': ['SALON LINE']
};
function stripBrand(n, brand) {
  const toks = BRAND_TOKENS[String(brand).toUpperCase()];
  if (!toks) return n;
  let out = n;
  toks.forEach(t => {
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // palabra completa; tambien "NEVADA-SERUM" -> "SERUM"
    out = out.replace(new RegExp('(^|\\s)' + esc + '(?:-|(?=\\s|$))', 'gi'), '$1');
  });
  out = out.replace(/\s+/g, ' ').trim();
  return out.length >= 4 ? out : n;
}

// Tildes que faltan en palabras en espanol del inventario.
const ACCENTS = {
  bateria: 'batería', baterias: 'baterías', tonico: 'tónico', colageno: 'colágeno', azucar: 'azúcar',
  jabon: 'jabón', balsamo: 'bálsamo', numerico: 'numérico', vehiculo: 'vehículo', acido: 'ácido',
  hialuronico: 'hialurónico', ferulico: 'ferúlico', electrico: 'eléctrico', electrica: 'eléctrica',
  magnetico: 'magnético', magnetica: 'magnética', inalambrico: 'inalámbrico', inalambrica: 'inalámbrica',
  audifono: 'audífono', audifonos: 'audífonos', microfono: 'micrófono', portatil: 'portátil',
  capsula: 'cápsula', capsulas: 'cápsulas', algodon: 'algodón', limon: 'limón', celulas: 'células',
  proteina: 'proteína', proteinas: 'proteínas', cafe: 'café', cafetera: 'cafetera', telefono: 'teléfono',
  camara: 'cámara', proteccion: 'protección', hidratacion: 'hidratación', nutricion: 'nutrición',
  reparacion: 'reparación', definicion: 'definición', extension: 'extensión', presion: 'presión',
  vitaminico: 'vitamínico', organico: 'orgánico', antimanchas: 'antimanchas', pestanas: 'pestañas',
  sarten: 'sartén', maquina: 'máquina', parrilla: 'parrilla', facil: 'fácil', rapido: 'rápido', rapida: 'rápida',
  carbon: 'carbón', limpiador: 'limpiador', aloe: 'aloe', melon: 'melón', platano: 'plátano'
};
function fixAccents(w) {
  const m = w.match(/^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/);
  if (!m) return w;
  const rep = ACCENTS[m[2].toLowerCase()];
  if (!rep || rep === m[2].toLowerCase()) return w;
  const cased = m[2][0] === m[2][0].toUpperCase() ? rep[0].toUpperCase() + rep.slice(1) : rep;
  return m[1] + cased + m[3];
}

// ------------------------------------------------------------
//  Tipo de producto (deducido del nombre real)
// ------------------------------------------------------------
//  Cada categoria tiene una lista ordenada: gana la primera regla que
//  encuentra alguna de sus palabras en el nombre.
const SUBTYPE_RULES = {
  'Maquillaje': [
    ['Mejillas',      ['ILLUMIN', 'ILUMUN', 'SPARKLE PARTY', 'BLUSH', 'RUBOR', 'HIGHLIGHT', 'ILUMIN', 'CONTOUR', 'BRONZ', 'SHIMMER', 'GLOW TIME', 'HALO', 'SUNLIT', 'SCULPT', 'SHOW YOUR', 'STARCROSSED', 'FUCHSIA']],
    ['Ojos y cejas',  ['LASTING STROKES', 'LONG LASTING AND', 'BROW', 'LINER', 'MASCARA', 'EYESHAD', 'SOMBRA', 'PALET', 'LASH', 'FLICK', 'EYE']],
    ['Labios',        ['GLASSY', 'LIP', 'LABIAL', 'LABIOS', 'GLOSS', 'TINT', 'BALM', 'POUT', 'KISS', 'ROUGE', 'MARKER', 'GLOW POP']],
    ['Rostro',        ['CUSHION', 'FOUNDATION', 'FUNDATION', 'BASE', 'CORRECTOR', 'POLVO', 'PRIMER', 'SELLADOR', 'SETTING', 'BB CREAM', 'MASK FIT', 'PERFECT COVER', 'LOOSE', 'BLUR', 'FIT RED', 'BAKED', 'FLORA MIST']]
  ],
  'Cuidado facial': [
    ['Sets y kits',       [' SET ', 'KIT', 'SET DE']],
    ['Protección solar',  ['SPF', 'SUN ', 'SOLAR', 'BLOQUE', 'SUNSCREEN']],
    ['Mascarillas',       ['MASK', 'MASCARILLA']],
    ['Limpieza',          ['EXFOLIANTE', 'LIMPIADOR', 'LIMPIADORA', 'CLEANS', 'MICELAR', 'DESMAQUILL', 'REMOVEDOR', 'JABON', 'WIPES', 'FOAM']],
    ['Tónicos',           ['TONER', 'TONICO', 'PADS']],
    ['Sérums',            ['SERUM', 'AMPOLLA', 'AMPOULE']],
    ['Hidratación',       ['CREMA', 'CREAM', 'HIDRATANTE', 'GEL', 'CAPSULA', 'PORE']]
  ],
  'Cuidado corporal': [
    ['Afeitado',          ['AFEITAR', 'SHAVE']],
    ['Mists y colonias',  ['MIST', 'COLONIA']],
    ['Desodorantes',      ['DEO ']],
    ['Exfoliantes',       ['EXFOLIANTE', 'SCRUB']],
    ['Baño',              ['GEL', 'JABON', 'SHOWER', 'ESPUMOSO', 'MANOS']],
    ['Cremas y aceites',  ['CREMA', 'CREAM', 'BUTTER', 'BODY B', 'LOCION', 'LOTION', 'MTQ', 'ACEITE', 'OIL', 'SERUM', 'SERYM', 'BRIGHTEN', 'BALSAMO', 'BÁLSAMO', 'CRE,A', 'FIRMING', 'SMOOTH', 'LIP MASK']]
  ],
  'Cabello y barbería': [
    ['Barbería',          ['BARBA', 'AFEITAR', 'AFTER SHAVE', 'BARBER']],
    ['Sets',              ['SET ', 'KIT', 'PACK']],
    ['Shampoo y acond.',  ['SHAMPO', 'SHP', 'ACONDICIONADOR', 'ACD ']],
    ['Peinado',           ['PEINAR', 'GEL', 'CERA', 'SPRAY', 'DEFINIC', 'ACTIVADORA', 'MODELADORA', 'VOLUMEN', 'ALISET']],
    ['Tratamientos',      ['TRAT', 'MASCARILLA', 'CREMA', 'CAPSULA', 'KERATINA', 'SELAGEM', 'ACEITE']]
  ],
  'Tecnología': [
    ['Soportes',              ['SOPORTE', 'SPORTE', 'SORPORTE', 'MOUN', 'STAND', 'POUCH', 'HOLDER', 'MOUNT', 'SELFIE', 'TRIPOD']],
    ['Cables y adaptadores',  ['CABLE', 'C.TRENZA', 'C. ACERO', 'CALE ', 'ADAPT', 'HUB', 'SPLITTER', 'SWITCH', 'SWIRCT', 'CONNECTOR', 'ENCLOU', 'CAJA PARA DISCO', 'CARD READER', 'MULTIPUERTO', 'CONECTOR', 'SPLINTER']],
    ['Audio',                 ['HEADPHONE', 'AUDIF', 'AUDÍF', 'AURI', 'HEADSET', 'EARBUD', 'PARLANTE', 'SPEAKER', 'SOUND', 'TWS', 'SKEIPOD', 'BUDS', 'MANOS LIBRES', 'SLAMBOX', 'MICROFONO']],
    ['Carga y energía',       ['CARGADOR', 'CHARGER', 'POWER', 'BANCO DE PODER', 'REGLETA', 'PROTECTOR', 'BATERIA', 'PANEL SOLAR', 'CUBO', 'CARGA']],
    ['Computación',           ['MOUSE', 'RATÓN', 'RATON', 'TECLADO', 'KEYBOARD', 'PAD', 'ALMOHADILLA', 'AMOHADILLA', 'BACKPACK', 'BOLSO', 'NOTEBOOK', 'PORTATIL', 'FUNDA', 'LAPTOP']],
    ['Cámaras y smart',       ['CAMARA', 'CAMERA', 'CAM', 'WATCH', 'SMART', 'LIGHT', 'SKEIWATCH', 'VLOGGING']]
  ],
  'Electrodomésticos': [
    ['Cocina y snacks',   ['HUEVOS', 'WAFFL', 'GOFRE', 'DONA', 'CUPCAKE', 'PALOMITA', 'ALGODÓN', 'ALGODON', 'HELADO', 'CAKE', 'QUESADILLA', 'OMELET', 'SARTEN', 'SARTÉN', 'PARRILLA', 'TOSTADORA', 'DESAYUNO', 'OLLA', 'VAPORERA', 'BUNDT']],
    ['Licuar y batir',    ['LICUADORA', 'BATIDORA', 'MEZCLADOR', 'PROCESADOR', 'EXPRIMIDOR', 'MOLIN', 'MILINO', 'ABRIDOR']],
    ['Café y bebidas',    ['COFFEE', 'CAFÉ', 'CAFE', 'TETERA', 'HERVIDOR', 'GRANIZ']],
    ['Planchas y cuidado', ['PLANCHA', 'RECORTADORA', 'CORTAR CABELLO']]
  ]
};

function computeSubtipo(p) {
  const rules = SUBTYPE_RULES[p.categoria];
  if (!rules) return '';
  const n = ' ' + String(p.name).toUpperCase().replace(/\s+/g, ' ') + ' ';
  for (const [label, words] of rules) {
    if (words.some(w => n.includes(w))) return label;
  }
  return 'Otros';
}

PRODUCTS.forEach(p => { p.subtipo = computeSubtipo(p); });


// ------------------------------------------------------------
//  Especificaciones / tono / tamano (salen del nombre)
// ------------------------------------------------------------
function productSpecs(p) {
  // El codigo de modelo del inicio (ej. "PC-486W") no es una especificacion:
  // se quita antes de leer potencia, largo, etc.
  let n = String(p.name).toUpperCase();
  const model = modelCode(p);
  if (model) {
    n = n.slice(matchModel(n)[0].length);
    const compact = model.replace(/[- ]/g, '').slice(0, 5);
    const first = n.split(' ')[0] || '';
    if (first.replace(/[- ]/g, '').startsWith(compact)) n = n.slice(first.length).trim();
  }
  const g = catMeta(p.categoria).group;
  const specs = [];
  const add = (label, value) => { if (value && !specs.some(s => s.value === value)) specs.push({ label, value }); };

  if (g === 'tech') {
    const w = n.match(/(\d{1,3}(?:\.\d)?)\s?W\b/); if (w) add('Potencia', w[1] + 'W');
    const mah = n.match(/(\d{3,6})\s?MAH/); if (mah) add('Batería', Number(mah[1]).toLocaleString('es-CR') + ' mAh');
    if (/TIPO[- ]?C|TYPE[- ]?C|USB[- ]?C\b|\bC A C\b/.test(n)) add('Conector', 'USB-C');
    else if (/LIGHTNING|IPHONE/.test(n)) add('Conector', 'Lightning');
    else if (/MICRO USB/.test(n)) add('Conector', 'Micro USB');
    if (/HDMI/.test(n)) add('Video', /4K/.test(n) ? 'HDMI 4K' : 'HDMI');
    if (/3[.,]5\s?MM/.test(n)) add('Audio', '3.5 mm');
    if (/BLUETOOTH|\bBT\b|INALAMBR|INALÁMBR|WIRELESS|TWS/.test(n)) add('Conexión', 'Inalámbrico');
    const m = n.match(/(\d+(?:\.\d+)?)\s?M(?:\/\d+FT)?\b(?!AH)/); if (m && !/MAH/.test(m[0])) add('Largo', m[1] + ' m');
    const l = n.match(/(\d+(?:\.\d+)?)\s?L\b/); if (l && p.categoria === 'Electrodomésticos') add('Capacidad', l[1] + ' L');
    const v = n.match(/(\d+)\s?VEL\b|(\d+)V\b/); if (v && p.categoria === 'Electrodomésticos') add('Velocidades', (v[1] || v[2]) + (v[1] ? ' vel.' : 'V'));
    const pk = n.match(/(\d+)\s?PK\b|(\d+)PK-|X(\d+)\b/); if (pk) add('Empaque', (pk[1] || pk[2] || pk[3]) + ' unid.');
  } else {
    const tone = n.match(/\b(\d{2}(?:\.\d)?[CNW])\b/) || n.match(/SHADE\s?(\d{1,2})/) || n.match(/#\s?(\d{2})\b/);
    if (tone) add('Tono', tone[1]);
    const size = n.match(/(\d+(?:[.,]\d+)?)\s?(ML|GR|G|OZ|KG)\b/);
    if (size) add('Tamaño', size[1].replace(',', '.') + ' ' + size[2].toLowerCase().replace('gr', 'g'));
    const pz = n.match(/(\d+)\s?(PZA|PZAS|PCS|PIEZAS|EA)\b/); if (pz) add('Contenido', pz[1] + ' piezas');
    const spf = n.match(/SPF\s?(\d+)/); if (spf) add('Protección', 'SPF ' + spf[1]);
  }
  return specs;
}

// ------------------------------------------------------------
//  Disponibilidad
// ------------------------------------------------------------
// Estados: Disponible (verde), Pocas unidades (amarillo, LOW_STOCK o
// menos) y Agotado (rojo). La cantidad sale de stock.js: exacta, o
// aproximada hacia abajo por encima de STOCK_TOPE_VISIBLE (STOCK_MODO en
// config.js): 5.312 -> "+5.300 disponibles".
const LOW_STOCK = 12;
function stockApprox(s) {
  const tope = typeof STOCK_TOPE_VISIBLE !== 'undefined' ? STOCK_TOPE_VISIBLE : 100;
  const modo = typeof STOCK_MODO !== 'undefined' ? STOCK_MODO : 'aproximado';
  if (modo === 'exacto' || s <= tope) return s;
  const paso = Math.pow(10, Math.max(0, String(Math.floor(s)).length - 2));
  return Math.floor(s / paso) * paso;
}
function stockQtyText(s) {
  if (s <= 0) return '';
  const n = stockApprox(s);
  const txt = n.toLocaleString('es-CR');
  if (n < s) return `+${txt} disponibles`;
  return `${txt} ${s === 1 ? 'disponible' : 'disponibles'}`;
}
function stockLevel(p) {
  const s = parseInt(p.stock) || 0;
  if (s <= 0) return { key: 'out', label: 'Agotado', qty: '', short: 'Agotado' };
  const qty = stockQtyText(s);
  if (s <= LOW_STOCK) return { key: 'low', label: 'Pocas unidades', qty, short: s === 1 ? 'Queda 1' : `Quedan ${s}` };
  return { key: 'ok', label: 'Disponible', qty, short: qty.replace('disponibles', 'disp.') };
}

// Orden "destacado": con stock primero, luego con foto, luego mas stock.
function featuredScore(p) {
  const s = parseInt(p.stock) || 0;
  return (s > 0 ? 2e7 : 0) + (p.img ? 1e7 : 0) + Math.min(s, 9e6);
}
