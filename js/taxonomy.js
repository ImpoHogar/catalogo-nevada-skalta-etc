// ============================================================
//  ARQUITECTURA DEL CATALOGO: DEPARTAMENTOS > CATEGORIAS > TIPOS
// ============================================================
//  products.js trae una "categoria" de origen (la que pone la
//  plantilla de carga). Aca se ubica cada producto en la estructura
//  comercial del catalogo, leyendo su categoria de origen y su nombre:
//
//    Departamento  ->  Categoria      ->  Tipo
//    Tecnologia    ->  Audio          ->  Audifonos
//    Belleza       ->  Maquillaje     ->  Labios
//
//  No se inventa nada: si un producto no calza en ningun tipo queda en
//  "Otros" dentro de su categoria. Las categorias y tipos sin productos
//  no se muestran. Para crecer: se agrega la categoria/tipo aca y las
//  palabras que la identifican en el nombre.
//
//  Cargar DESPUES de ui.js y ANTES de catalog.js.
// ============================================================

// Los cinco grandes accesos del catalogo. "tone" define la experiencia
// visual y los filtros de cada uno (care / beauty / tech / battery / home).
// "aliases": direcciones viejas que siguen funcionando (#/d/belleza).
const DEPARTMENTS = [
  { id: 'cuidado-personal', name: 'Cuidado personal', tone: 'care',    icon: 'body',    aliases: ['belleza'],
    blurb: 'Skincare, cuidado corporal, cabello y barbería.' },
  { id: 'maquillaje',       name: 'Maquillaje',       tone: 'beauty',  icon: 'makeup',
    blurb: 'Bases y cushions, labios, ojos, cejas, mejillas y polvos.' },
  { id: 'tecnologia',       name: 'Tecnología',       tone: 'tech',    icon: 'tech',
    blurb: 'Audio, cables, cargadores, computación, smart y soportes.' },
  { id: 'baterias',         name: 'Baterías',         tone: 'battery', icon: 'battery',
    blurb: 'Pilas alcalinas AA, AAA, C, D, 9V y baterías de botón.' },
  { id: 'hogar',            name: 'Hogar',            tone: 'home',    icon: 'home',
    blurb: 'Pequeños electrodomésticos para cocina y el hogar.' }
];

// Categorias (orden = orden en menus). "types": [tipo, palabras del nombre].
// Gana el primer tipo que encuentra alguna de sus palabras.
const CATEGORIES = [
  // ---------- MAQUILLAJE ----------
  { id: 'maquillaje', name: 'Maquillaje', dept: 'maquillaje', icon: 'makeup', types: [
    ['Mejillas',      ['ILLUMIN', 'ILUMUN', 'SPARKLE PARTY', 'BLUSH', 'RUBOR', 'HIGHLIGHT', 'ILUMIN', 'CONTOUR', 'BRONZ', 'SHIMMER', 'GLOW TIME', 'HALO', 'SUNLIT', 'SCULPT', 'SHOW YOUR', 'STARCROSSED', 'FUCHSIA']],
    ['Ojos y cejas',  ['LASTING STROKES', 'LONG LASTING AND', 'BROW', 'LINER', 'MASCARA', 'EYESHAD', 'SOMBRA', 'PALET', 'LASH', 'FLICK', 'EYE']],
    ['Labios',        ['GLASSY', 'LIP', 'LABIAL', 'LABIOS', 'GLOSS', 'TINT', 'BALM', 'POUT', 'KISS', 'ROUGE', 'MARKER', 'GLOW POP', 'ENCHANTED ROSE', 'JELLY MUCH', 'PH GLOW']],
    ['Bases y cushions', ['CUSHION', 'FOUNDATION', 'FUNDATION', 'BASE', 'BB CREAM', 'MASK FIT', 'FIT RED', 'PERFECT COVER']],
    ['Correctores y polvos', ['CORRECTOR', 'POLVO', 'PRIMER', 'SELLADOR', 'SETTING', 'LOOSE', 'BLUR', 'BAKED', 'FLORA MIST']]
  ]},
  // ---------- CUIDADO PERSONAL ----------
  { id: 'skincare', name: 'Skincare', dept: 'cuidado-personal', icon: 'face', types: [
    ['Sets y kits',       [' SET ', 'KIT', 'SET DE']],
    ['Protección solar',  ['SPF', 'SUN ', 'SOLAR', 'BLOQUE', 'SUNSCREEN']],
    ['Mascarillas',       ['MASK', 'MASCARILLA', 'MASCARILLL']],
    ['Limpieza',          ['EXFOLIANTE', 'LIMPIADOR', 'LIMPIADORA', 'CLEANS', 'MICELAR', 'DESMAQUILL', 'REMOVEDOR', 'JABON', 'WIPES', 'FOAM', 'CLEANER', 'TOALLAS', 'TOLLAS']],
    ['Tónicos y pads',    ['TONER', 'TONICO', 'PADS']],
    ['Sérums y ampollas', ['SERUM', 'AMPOLLA', 'AMPOULE', 'PEPTIDES', 'HYALURONIC ACID+']],
    ['Cremas e hidratación', ['CREMA', 'CREAM', 'HIDRATANTE', 'GEL', 'CAPSULA', 'PORE', 'FACE LOTION']]
  ]},
  { id: 'cuidado-corporal', name: 'Cuidado corporal', dept: 'cuidado-personal', icon: 'body', types: [
    ['Cuidado de labios',  ['LIP SCRUB', 'LIP MASK', 'SUGAR LIPS', 'SUGARLIPS', 'LIP BUTTER']],
    ['Afeitado',           ['AFEITAR', 'SHAVE']],
    ['Brumas corporales',  ['MIST', 'COLONIA']],
    ['Desodorantes',       ['DEO ']],
    ['Exfoliantes',        ['EXFOLIANTE', 'SCRUB', 'SUNLIT GLOW MARACUJA']],
    ['Baño y ducha',       ['GEL', 'JABON', 'SHOWER', 'ESPUMOSO', 'MANOS']],
    ['Aceites corporales', ['ACEITE', 'OIL']],
    ['Cremas y mantequillas', ['CREMA', 'CREAM', 'BUTTER', 'BODY B', 'LOCION', 'LOTION', 'MTQ', 'SERUM', 'SERYM', 'BRIGHTEN', 'BALSAMO', 'BÁLSAMO', 'CRE,A', 'FIRMING', 'SMOOTH']]
  ]},
  { id: 'cabello', name: 'Cabello', dept: 'cuidado-personal', icon: 'hair', types: [
    ['Sets capilares',     ['SET ', 'KIT', 'PACK']],
    ['Shampoo y acondicionador', ['SHAMPO', 'SHP', 'ACONDICIONADOR', 'ACD ']],
    ['Peinado y definición', ['PEINAR', 'GEL', 'CERA', 'SPRAY', 'DEFINIC', 'ACTIVADORA', 'MODELADORA', 'VOLUMEN', 'ALISET']],
    ['Tratamientos',       ['TRAT', 'MASCARILLA', 'CREMA', 'CAPSULA', 'KERATINA', 'SELAGEM', 'ACEITE']],
    ['Coloración',         ['TINTE']]
  ]},
  { id: 'barberia', name: 'Barbería', dept: 'cuidado-personal', icon: 'hair', types: [
    ['Máquinas y recortadoras', ['RECORTADORA', 'CORTAR CABELLO', 'MAQUINA']],
    ['Cuidado de barba',   ['BARBA', 'BEARD']],
    ['Afeitado',           ['AFEITAR', 'AFTER SHAVE', 'SHAVE']],
    ['Ceras y peinado',    ['CERA', 'WAX', 'SPRAY', 'GEL', 'POMADA']]
  ]},
  // ---------- TECNOLOGIA ----------
  { id: 'audio', name: 'Audio', dept: 'tecnologia', icon: 'tech', types: [
    ['Parlantes',          ['PARLANTE', 'SPEAKER', 'SLAMBOX', 'SOUNDBAR', 'BOCINA']],
    ['Micrófonos',         ['MICROFONO', 'MICRÓFONO', 'MICROPHONE']],
    ['Headsets gamer',     ['HEADSET', 'GAMING HEADPHONE', 'GAMER']],
    ['Earbuds inalámbricos', ['TWS', 'EARBUD', 'BUDS', 'SKEIPOD', 'EARPOD']],
    ['Audífonos',          ['HEADPHONE', 'AUDIF', 'AUDÍF', 'AURI', 'MANOS LIBRES', 'SOUND']]
  ]},
  { id: 'cables-adaptadores', name: 'Cables y adaptadores', dept: 'tecnologia', icon: 'cable', types: [
    ['Video (HDMI / DP / VGA)', ['HDMI', 'DISPLAY', 'VGA', 'DVI']],
    ['Hubs y lectores',    ['HUB', 'MULTIPUERTO', 'CARD READER', 'ENCLOU', 'CAJA PARA DISCO', 'SPLITTER', 'SPLINTER', 'SWITCH', 'SWIRCT']],
    ['Red',                ['CAT6', 'CAT5', 'ETHERNET', 'RJ45', 'UTP', 'RED ']],
    ['Adaptadores',        ['ADAPT', 'CONECTOR', 'CONNECTOR', 'OTG']],
    ['Cables de carga y datos', ['CABLE', 'C.TRENZA', 'C. ACERO', 'CALE ']]
  ]},
  { id: 'carga-energia', name: 'Carga y energía', dept: 'tecnologia', icon: 'bolt', types: [
    ['Power banks',        ['POWER BANK', 'POWERBANK', 'BANCO DE PODER', 'PANEL SOLAR']],
    ['Regletas y protección', ['REGLETA', 'POWER STRIP', 'PROTECTOR', 'SUPRESOR', 'UPS', 'PLUG']],
    ['Cargadores inalámbricos', ['WIRELESS', 'INALAMBRIC', 'MAGNETIC', 'MAGSAFE']],
    ['Cargadores de vehículo', ['VEHICULO', 'CAR CHARGER', 'AUTO']],
    ['Cargadores de pared', ['CARGADOR', 'CHARGER', 'CUBO', 'CARGA', 'POWER']]
  ]},
  { id: 'computacion', name: 'Computación y gaming', dept: 'tecnologia', icon: 'mouse', types: [
    ['Mochilas y fundas',  ['BACKPACK', 'MOCHILA', 'BOLSO', 'FUNDA', 'SLEEVE', 'MALETIN', 'NOTEBOOK BAG']],
    ['Mouse pads',         ['PAD', 'ALMOHADILLA', 'AMOHADILLA']],
    ['Teclados y combos',  ['TECLADO', 'KEYBOARD', 'COMBO']],
    ['Mouse',              ['MOUSE', 'RATÓN', 'RATON']],
    ['Accesorios de PC',   ['WEBCAM', 'BASE', 'COOLER', 'VENTI', 'LAPTOP', 'NOTEBOOK', 'PORTATIL', 'USB']]
  ]},
  { id: 'smart', name: 'Smart y cámaras', dept: 'tecnologia', icon: 'watch', types: [
    ['Smartwatches',       ['WATCH', 'SKEIWATCH', 'SMARTBAND', 'BAND ']],
    ['Cámaras de seguridad', ['CAMARA WIFI', 'WIFI CAMERA', 'WIFI SMART', 'CAMARA INTERNA', 'CONVOY', 'DOOR BELL', 'DOORBELL', 'CAM4']],
    ['Cámaras y vlogging', ['CAMERA', 'CAMARA', 'ACTION', 'VLOGGING', 'WEB HD']],
    ['Hogar inteligente',  ['SMART', 'FEEDER', 'PLUG', 'BOMBILLO', 'BULB']]
  ]},
  { id: 'soportes-accesorios', name: 'Soportes y accesorios', dept: 'tecnologia', icon: 'stand', types: [
    ['Soportes de TV y monitor', ['TV', 'MONITOR', 'DESK MOUNT', 'WALL MOUNT']],
    ['Iluminación y selfie', ['RING LIGHT', 'LIGHT', 'SELFIE', 'TRIPOD', 'TRIPODE', 'LED']],
    ['Soportes para celular', ['SOPORTE', 'SPORTE', 'SORPORTE', 'HOLDER', 'MOUN', 'STAND', 'POUCH', 'CELL PHONE', 'CELULAR']]
  ]},
  // ---------- BATERIAS ----------
  { id: 'baterias', name: 'Baterías y pilas', dept: 'baterias', icon: 'battery', types: [
    ['Pilas AAA',          [' AAA ', 'LR03']],
    ['Pilas AA',           [' AA ', 'LR06', 'LR6']],
    ['Pilas C',            ['TIPO C', 'LR14']],
    ['Pilas D',            ['TIPO D', 'LR20']],
    ['Batería 9V',         ['9 V', ' 9V']],
    ['Botón de litio',     ['CR20', 'CR16', 'CR 16', 'CR24', 'LITHIUM', 'LITIO', 'BOTON', 'MICRO BATERIA']],
    ['Recargables',        ['RECARGABLE', 'RECHARG']]
  ]},
  // ---------- HOGAR ----------
  { id: 'cocina', name: 'Cocina', dept: 'hogar', icon: 'home', types: [
    ['Café y bebidas',     ['COFFEE', 'CAFÉ', 'CAFE', 'TETERA', 'HERVIDOR', 'GRANIZ', 'KETTLE']],
    ['Licuadoras y batidoras', ['LICUADORA', 'BATIDORA', 'MEZCLADOR', 'PROCESADOR', 'EXPRIMIDOR', 'MOLIN', 'MILINO', 'ABRIDOR', 'BLENDER']],
    ['Ollas y sartenes eléctricos', ['OLLA', 'SARTEN', 'SARTÉN', 'PARRILLA', 'VAPORERA', 'ARROCERA', 'FREIDORA', 'PRESION', 'PRESIÓN', 'PLANTILLA']],
    ['Snacks y repostería', ['HUEVOS', 'WAFFL', 'GOFRE', 'DONA', 'CUPCAKE', 'PALOMITA', 'ALGODÓN', 'ALGODON', 'HELADO', 'CAKE', 'QUESADILLA', 'OMELET', 'TOSTADORA', 'DESAYUNO', 'BUNDT', 'SANDWICH', 'PIZZA', 'CREPA']]
  ]},
  { id: 'cuidado-ropa', name: 'Cuidado de la ropa', dept: 'hogar', icon: 'iron', types: [
    ['Planchas',           ['PLANCHA']]
  ]}
];

const CATEGORY_BY_ID = {};
CATEGORIES.forEach(c => { CATEGORY_BY_ID[c.id] = c; });
const DEPARTMENT_BY_ID = {};
DEPARTMENTS.forEach(d => { DEPARTMENT_BY_ID[d.id] = d; });

// Palabras que mandan un producto de tecnologia a una categoria.
// Orden importa: gana la primera que coincide.
const TECH_ROUTES = [
  ['baterias',            ['BATERIA ALCALINA', 'BATERIA ALCALIN', 'LR06', 'LR03', 'CR2025', 'CR2032', 'CR2016', 'MICRO BATERIA', 'PILA ']],
  ['soportes-accesorios', ['CELL PHONE', 'SOPORTE', 'SPORTE', 'SORPORTE', 'MOUN', 'STAND', 'POUCH', 'HOLDER', 'MOUNT', 'SELFIE', 'TRIPOD', 'RING LIGHT', 'SPOTLI']],
  ['smart',               ['CAMARA', 'CAMERA', 'WATCH', 'SKEIWATCH', 'SMART', 'VLOGGING', 'DOOR BELL', 'FEEDER']],
  ['audio',               ['HEADPHONE', 'AUDIF', 'AUDÍF', 'AURI', 'HEADSET', 'EARBUD', 'PARLANTE', 'SPEAKER', 'SOUND', 'TWS', 'SKEIPOD', 'BUDS', 'MANOS LIBRES', 'SLAMBOX', 'MICROFONO']],
  ['cables-adaptadores',  ['CABLE', 'C.TRENZA', 'C. ACERO', 'CALE ', 'ADAPT', 'HUB', 'SPLITTER', 'SWITCH', 'SWIRCT', 'CONNECTOR', 'ENCLOU', 'CAJA PARA DISCO', 'CARD READER', 'MULTIPUERTO', 'CONECTOR', 'SPLINTER']],
  ['carga-energia',       ['CARGADOR', 'CHARGER', 'POWER', 'BANCO DE PODER', 'REGLETA', 'PROTECTOR', 'BATERIA', 'PANEL SOLAR', 'CUBO', 'CARGA', 'PLUG']],
  ['computacion',         ['MOUSE', 'RATÓN', 'RATON', 'TECLADO', 'KEYBOARD', 'PAD', 'ALMOHADILLA', 'AMOHADILLA', 'BACKPACK', 'BOLSO', 'NOTEBOOK', 'PORTATIL', 'FUNDA', 'LAPTOP', 'COOLER', 'VENTI', 'LIGHT']]
];

function upperName(p) {
  return ' ' + String(p.name).toUpperCase().replace(/\s+/g, ' ') + ' ';
}
function hasAny(n, words) { return words.some(w => n.includes(w)); }

// Categoria de catalogo de cada producto.
function placeCategory(p) {
  const n = upperName(p);
  switch (p.categoria) {
    case 'Maquillaje': return 'maquillaje';
    case 'Cuidado facial': return 'skincare';
    case 'Cuidado corporal': return 'cuidado-corporal';
    case 'Cabello y barbería':
      if (String(p.brand).toUpperCase() === 'IMMORTAL' || hasAny(n, ['BARBA', 'BARBER', 'AFTER SHAVE', 'AFEITAR'])) return 'barberia';
      return 'cabello';
    case 'Electrodomésticos':
      if (hasAny(n, ['RECORTADORA', 'CORTAR CABELLO', 'BARBA'])) return 'barberia';
      if (hasAny(n, ['PLANCHA PARA ROPA', 'PLANCHA DE ROPA', 'PLANCHA DE VAPOR'])) return 'cuidado-ropa';
      return 'cocina';
    case 'Tecnología':
      for (const [cat, words] of TECH_ROUTES) if (hasAny(n, words)) return cat;
      return 'computacion';
    default: return null;
  }
}

function placeType(p, catId) {
  const cat = CATEGORY_BY_ID[catId];
  if (!cat) return 'Otros';
  const n = upperName(p);
  for (const [label, words] of cat.types) if (hasAny(n, words)) return label;
  return 'Otros';
}

PRODUCTS.forEach(p => {
  const c = placeCategory(p);
  p.cat = c || 'otros';
  p.dept = c ? CATEGORY_BY_ID[c].dept : 'otros';
  p.tipo = c ? placeType(p, c) : 'Otros';
});

function catName(id) { return CATEGORY_BY_ID[id] ? CATEGORY_BY_ID[id].name : 'Otros'; }
function deptName(id) { return DEPARTMENT_BY_ID[id] ? DEPARTMENT_BY_ID[id].name : 'Otros'; }
function deptTone(id) { return DEPARTMENT_BY_ID[id] ? DEPARTMENT_BY_ID[id].tone : 'beauty'; }
// Direcciones viejas (#/d/belleza) -> departamento actual.
const DEPT_ALIAS = {};
DEPARTMENTS.forEach(d => (d.aliases || []).forEach(a => { DEPT_ALIAS[a] = d.id; }));

// Conteos (solo productos visibles) para menus y filtros.
const TAXO_COUNTS = { dept: {}, cat: {}, tipo: {} };
VISIBLE_PRODUCTS.forEach(p => {
  TAXO_COUNTS.dept[p.dept] = (TAXO_COUNTS.dept[p.dept] || 0) + 1;
  TAXO_COUNTS.cat[p.cat] = (TAXO_COUNTS.cat[p.cat] || 0) + 1;
  const k = p.cat + '|' + p.tipo;
  TAXO_COUNTS.tipo[k] = (TAXO_COUNTS.tipo[k] || 0) + 1;
});

function deptsWithProducts() { return DEPARTMENTS.filter(d => TAXO_COUNTS.dept[d.id]); }
function catsOfDept(deptId) { return CATEGORIES.filter(c => c.dept === deptId && TAXO_COUNTS.cat[c.id]); }
function typesOfCat(catId) {
  const cat = CATEGORY_BY_ID[catId];
  if (!cat) return [];
  return cat.types.map(t => t[0]).concat(['Otros'])
    .filter(t => TAXO_COUNTS.tipo[catId + '|' + t])
    .map(t => ({ label: t, count: TAXO_COUNTS.tipo[catId + '|' + t] }));
}

// "Audifonos inalambricos" -> "audifonos-inalambricos" (para la direccion).
function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ------------------------------------------------------------
//  Atributos para filtros (salen del nombre, no se inventan)
// ------------------------------------------------------------
//  Presentacion (tamano) para belleza y cuidado personal.
function sizeBucket(p) {
  const n = String(p.name).toUpperCase();
  const m = n.match(/(\d+(?:[.,]\d+)?)\s?(ML|GR|G|OZ|KG|L)\b/);
  if (!m) return '';
  let v = parseFloat(m[1].replace(',', '.'));
  const u = m[2];
  if (u === 'KG' || u === 'L') v *= 1000;
  if (u === 'OZ') v *= 29.6;
  if (v <= 30) return 'Mini y viaje (hasta 30 ml/g)';
  if (v <= 250) return 'Regular (31–250 ml/g)';
  if (v < 900) return 'Grande (251–899 ml/g)';
  return 'Familiar (1 kg/L o más)';
}
const SIZE_ORDER = ['Mini y viaje (hasta 30 ml/g)', 'Regular (31–250 ml/g)', 'Grande (251–899 ml/g)', 'Familiar (1 kg/L o más)'];

// Beneficio principal (belleza / cuidado personal), por palabras del nombre.
const BENEFIT_RULES = [
  ['Hidratación',          ['HIDRAT', 'HYDRA', 'MOIST', 'HIALUR', 'HYALUR', 'ALOE', 'AQUA', 'WATER', 'DEWY']],
  ['Calmante',             ['CALM', 'CENTELLA', 'CICA', 'MATCHA', 'SOOTH', 'SOS']],
  ['Iluminador / glow',    ['GLOW', 'ILUMIN', 'BRIGHT', 'VITAMIN C', 'VITAMINA C', 'VIT C', 'WHITENING', 'BLANQUE']],
  ['Antimanchas',          ['ANTIMANCH', 'MANCHAS', 'NIACINAM', 'AZELA', 'DARK SPOT']],
  ['Anti-edad / firmeza',  ['COLAGEN', 'COLLAGEN', 'RETINOL', 'PEPTIDE', 'FIRM', 'ANTI-EDAD', 'ANTIEDAD', 'CELULAS MADRE', 'STEM CELL', 'PDRN', 'CAVIAR']],
  ['Control de grasa / acné', ['ACNE', 'ACNÉ', 'PORE', 'OIL CONTROL', 'GRASA', 'CARBON', 'CARBÓN', 'BARRO', 'MUD', 'TEA TREE', 'TE VERDE', 'GREEN TEA']],
  ['Exfoliación',          ['EXFOLI', 'SCRUB', 'PEEL', 'PHA', 'AHA', 'BHA']],
  ['Protección solar',     ['SPF', 'SUNSCREEN', 'BLOQUEADOR', 'PROTECTOR SOLAR', 'SOLAR']],
  ['Definición de rizos',  ['CACHOS', 'CRESPO', 'RIZO', 'CURL', 'ONDULAD', 'DEFINIC']],
  ['Reparación capilar',   ['REPARA', 'RESTAUR', 'KERATIN', 'BOMBA', 'S.O.S', 'BIOTINA', 'SELAGEM', 'NUTRI']],
  ['Alisado',              ['LISO', 'ALISA', 'LISOS']],
  ['Cobertura',            ['COVER', 'CUSHION', 'FOUNDATION', 'CORRECTOR', 'BASE']],
  ['Larga duración',       ['LASTING', 'LONG WEAR', 'LOCK', '24H', '72H']]
];
function productBenefits(p) {
  const g = deptTone(p.dept);
  if (g !== 'beauty' && g !== 'care') return [];
  const n = upperName(p);
  return BENEFIT_RULES.filter(([, w]) => hasAny(n, w)).map(r => r[0]).slice(0, 3);
}

// Compatibilidad (tecnologia)
function productCompat(p) {
  if (p.dept !== 'tecnologia') return [];
  const n = upperName(p);
  const out = [];
  if (/IPHONE|LIGHTNING|IPAD|APPLE/.test(n)) out.push('iPhone / Apple');
  if (/ANDROID|SAMSUNG|TIPO[- ]?C|TYPE[- ]?C|USB[- ]?C\b|MICRO USB/.test(n)) out.push('Android / USB-C');
  if (/LAPTOP|NOTEBOOK|PORTATIL|PC\b|COMPUTADOR|MONITOR/.test(n)) out.push('Laptop / PC');
  if (/\bTV\b|TELEVIS|SMART TV/.test(n)) out.push('TV');
  if (/GAMING|GAMER|PS4|PS5|XBOX|NINTENDO/.test(n)) out.push('Gaming');
  if (/VEHICULO|VEHÍCULO|CARRO|AUTO\b|CAR /.test(n)) out.push('Vehículo');
  return out;
}

// Baterias: tamano, quimica, presentacion y voltaje. Solo lo que dice
// el nombre del producto (si no lo dice, queda vacio: no se inventa).
function batterySize(p) {
  if (p.dept !== 'baterias') return '';
  const n = upperName(p);
  const cr = n.match(/CR\s?(\d{4})/); if (cr) return 'CR' + cr[1];
  if (/ AAA |LR03/.test(n)) return 'AAA';
  if (/ AA |LR06|LR6\b/.test(n)) return 'AA';
  if (/TIPO C|LR14/.test(n)) return 'C';
  if (/TIPO D|LR20/.test(n)) return 'D';
  if (/9 ?V\b/.test(n)) return '9V';
  return '';
}
function batteryChem(p) {
  if (p.dept !== 'baterias') return '';
  const n = upperName(p);
  if (/RECARG|RECHARG/.test(n)) return 'Recargable';
  if (/LITHIUM|LITIO|CR\s?\d{4}/.test(n)) return 'Litio';
  if (/ALCALIN|ALC\b/.test(n)) return 'Alcalina';
  return '';
}
function batteryPack(p) {
  if (p.dept !== 'baterias') return '';
  const n = upperName(p);
  const caja = /^ CAJA /.test(n) ? 'Caja de ' : '';
  const m = n.match(/(\d+)\+(\d+)\s?PK/);
  if (m) return `${caja}${m[1]}+${m[2]} unidades`;
  const k = n.match(/(\d+)\s?PK\b/);
  if (k) return caja ? `Caja de blísteres de ${k[1]}` : `${k[1]} ${k[1] === '1' ? 'unidad' : 'unidades'}`;
  return caja ? 'Caja' : '';
}
function batteryVolt(p) {
  if (p.dept !== 'baterias') return '';
  const m = upperName(p).match(/(\d+(?:[.,]\d+)?)\s?V\b/);
  return m ? m[1].replace(',', '.') + ' V' : '';
}

// Ficha "Conector" / "Conexion" ya las calcula productSpecs(); se reusan.
function specValue(p, label) {
  if (!p._specs) p._specs = productSpecs(p);
  const s = p._specs.find(x => x.label === label);
  return s ? s.value : '';
}

// ------------------------------------------------------------
//  Busqueda: indice, sinonimos y relevancia
// ------------------------------------------------------------
function normText(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Frases que se unen en una sola "palabra" para buscar (en el texto del
// producto y en lo que escribe el cliente).
const SEARCH_PHRASES = [
  [/\b(tipo|type|usb)[\s-]?c\b/g, ' usbc '],
  [/\bmicro[\s-]?usb\b/g, ' microusb '],
  [/\bpower[\s-]?bank\b|\bbanco de poder\b/g, ' powerbank '],
  [/\bprotector solar\b|\bbloqueador solar\b/g, ' bloqueador '],
  [/\bsmart[\s-]?watch\b/g, ' smartwatch '],
  [/\bmanos libres\b/g, ' manoslibres ']
];
function searchNorm(s) {
  let t = ' ' + normText(s).replace(/[^a-z0-9+#.\/\- ]/g, ' ') + ' ';
  SEARCH_PHRASES.forEach(([re, rep]) => { t = t.replace(re, rep); });
  return t.replace(/\s+/g, ' ');
}

// Grupos de palabras equivalentes (espanol / ingles / como se escribe en
// el inventario). Buscar cualquiera encuentra las demas.
const SYNONYMS = [
  ['audifono', 'audifonos', 'auricular', 'auriculares', 'headphone', 'headphones', 'headset', 'earbud', 'earbuds', 'buds', 'auri', 'manoslibres', 'tws'],
  ['parlante', 'parlantes', 'bocina', 'bocinas', 'speaker', 'speakers'],
  ['cargador', 'cargadores', 'charger', 'cubo'],
  ['cable', 'cables', 'cord'],
  ['bateria', 'baterias', 'pila', 'pilas', 'battery', 'alcalina', 'alcalinas'],
  ['powerbank', 'powerbanks'],
  ['mouse', 'raton'],
  ['teclado', 'keyboard'],
  ['reloj', 'smartwatch', 'watch', 'skeiwatch'],
  ['camara', 'camaras', 'camera', 'cam', 'webcam'],
  ['soporte', 'soportes', 'holder', 'mount', 'stand', 'base'],
  ['mochila', 'backpack', 'bolso'],
  ['regleta', 'regletas', 'strip'],
  ['adaptador', 'adapter', 'adaptadores'],
  ['iphone', 'lightning', 'apple'],
  ['labial', 'labiales', 'lip', 'lipstick', 'tint', 'gloss', 'labios'],
  ['base', 'foundation', 'cushion', 'fundation'],
  ['rubor', 'blush', 'colorete'],
  ['iluminador', 'highlight', 'highlighter', 'illuminator'],
  ['cejas', 'ceja', 'brow', 'brows'],
  ['delineador', 'liner', 'eyeliner'],
  ['rimel', 'mascara', 'pestanas', 'lash'],
  ['sombra', 'sombras', 'eyeshadow', 'paleta', 'palette'],
  ['polvo', 'polvos', 'powder', 'setting'],
  ['bloqueador', 'spf', 'sunscreen'],
  ['vitamina', 'vitamin', 'vit'],
  ['serum', 'serums', 'ampolla', 'ampoule'],
  ['tonico', 'toner', 'tonicos'],
  ['limpiador', 'cleanser', 'cleansing', 'foam', 'limpiadora', 'micelar'],
  ['mascarilla', 'mascarillas', 'mask', 'masks'],
  ['exfoliante', 'exfoliantes', 'scrub'],
  ['crema', 'cremas', 'cream', 'locion', 'lotion', 'butter', 'mtq', 'mantequilla'],
  ['shampoo', 'champu', 'shp', 'shampu'],
  ['acondicionador', 'acd', 'conditioner'],
  ['jabon', 'soap', 'wash'],
  ['afeitar', 'shave', 'afeitado', 'rasurar'],
  ['barba', 'beard', 'barberia'],
  ['bruma', 'mist', 'splash'],
  ['licuadora', 'blender', 'batidora'],
  ['cafetera', 'coffee', 'cafe'],
  ['plancha', 'iron'],
  ['olla', 'pot', 'arrocera'],
  ['sarten', 'pan', 'parrilla'],
  ['palomitas', 'popcorn', 'palomitera'],
  ['nino', 'ninos', 'nina', 'ninas', 'kids', 'kid', 'infantil', 'junior', 'disney', 'hasbro', 'bebe', 'baby'],
  ['vainilla', 'vanilla'], ['fresa', 'strawberry'], ['sandia', 'watermelon'], ['coco', 'coconut'],
  ['rosa', 'rose'], ['pina', 'pineapple'], ['aguacate', 'avocado', 'abacate'], ['cereza', 'cherry', 'cereja'],
  ['negro', 'black', 'bk'], ['blanco', 'white', 'wt'], ['rosado', 'pink'], ['azul', 'blue'], ['rojo', 'red'], ['gris', 'gray', 'grey']
];
const SYN_MAP = {};
SYNONYMS.forEach(group => group.forEach(w => { SYN_MAP[w] = group; }));

function expandToken(t) {
  const alts = new Set([t]);
  if (SYN_MAP[t]) SYN_MAP[t].forEach(w => alts.add(w));
  // plural sencillo: "cremas" -> "crema", "cargadores" -> "cargador"
  if (t.length > 4 && t.endsWith('es') && SYN_MAP[t.slice(0, -2)]) SYN_MAP[t.slice(0, -2)].forEach(w => alts.add(w));
  if (t.length > 3 && t.endsWith('s') && SYN_MAP[t.slice(0, -1)]) SYN_MAP[t.slice(0, -1)].forEach(w => alts.add(w));
  return [...alts];
}

function productHaystack(p) {
  if (p._hay2) return p._hay2;
  const specs = (p._specs || (p._specs = productSpecs(p))).map(s => s.value).join(' ');
  p._hayName = searchNorm(prettyName(p) + ' ' + p.name);
  p._hay2 = searchNorm([p.name, prettyName(p), p.brand, p.code, catName(p.cat), deptName(p.dept), p.tipo, specs,
    productCompat(p).join(' '), productBenefits(p).join(' '), batterySize(p), batteryChem(p),
    Array.isArray(p.tags) ? p.tags.join(' ') : (p.tags || '')].join(' '));
  return p._hay2;
}

// Las letras sueltas ("vitamina c", "tipo d") no filtran: casi todo las
// contiene y dejarian la busqueda vacia o rara. Los numeros si cuentan.
function queryTokensOf(q) {
  return searchNorm(q).trim().split(' ').filter(t => t && t !== '-' && (t.length > 1 || /\d/.test(t)));
}

// Puntaje de relevancia (0 = no coincide).
function searchScore(p, tokens) {
  if (!tokens.length) return 1;
  const hay = productHaystack(p);
  const name = p._hayName;
  const code = String(p.code);
  let score = 0;
  for (const t of tokens) {
    if (/^\d{4,}$/.test(t)) {                       // codigo de barras
      if (code === t) { score += 1000; continue; }
      if (code.startsWith(t)) { score += 400; continue; }
      if (code.includes(t)) { score += 200; continue; }
    }
    const alts = expandToken(t);
    let best = 0;
    for (const a of alts) {
      if (!hay.includes(a)) continue;
      let s = 10;
      if (name.includes(' ' + a)) s += 20;                 // inicio de palabra en el nombre
      if (normText(p.brand) === a || normText(p.brand).split(' ').includes(a)) s += 30;
      if (normText(p.tipo).includes(a) || normText(catName(p.cat)).includes(a)) s += 15;
      if (a !== t) s -= 4;                                  // sinonimo: un poco menos
      if (s > best) best = s;
    }
    if (!best) return 0;                                    // todas las palabras deben estar
    score += best;
  }
  const st = parseInt(p.stock) || 0;
  if (st > 0) score += 6;
  if (p.img) score += 3;
  return score;
}

// ------------------------------------------------------------
//  Correccion de escritura
// ------------------------------------------------------------
// Si una palabra no aparece en ningun producto se busca la palabra del
// catalogo mas parecida: 1 letra de diferencia (2 en palabras largas).
// Ej. "skalla" -> "skala", "audifnos" -> "audifonos", "licudora" ->
// "licuadora". Solo se usa cuando la busqueda no encuentra nada.
let _searchVocab = null;
function searchVocab() {
  if (_searchVocab) return _searchVocab;
  const freq = {};
  VISIBLE_PRODUCTS.forEach(p => productHaystack(p).split(' ').forEach(w => {
    if (w.length >= 3 && !/\d/.test(w)) freq[w] = (freq[w] || 0) + 1;
  }));
  return (_searchVocab = freq);
}
// Distancia entre dos palabras (cambios, letras de mas o de menos y dos
// letras al reves). Se corta en cuanto supera "max".
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null, prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev; prev = cur;
  }
  return prev[b.length];
}
function tokenHasHits(t) { return VISIBLE_PRODUCTS.some(p => searchScore(p, [t]) > 0); }
function correctToken(t) {
  if (t.length < 4 || /\d/.test(t)) return t;
  const vocab = searchVocab();
  const max = t.length >= 7 ? 2 : 1;
  let best = '', bestD = max + 1, bestF = 0;
  for (const w in vocab) {
    const d = editDistance(t, w, max);
    if (d < bestD || (d === bestD && d <= max && vocab[w] > bestF)) { best = w; bestD = d; bestF = vocab[w]; }
  }
  return bestD <= max ? best : t;
}
// Devuelve la busqueda corregida (solo si encuentra productos) o ''.
function correctedQuery(q) {
  const tokens = queryTokensOf(q);
  if (!tokens.length) return '';
  const fixed = tokens.map(t => tokenHasHits(t) ? t : correctToken(t));
  if (fixed.every((t, i) => t === tokens[i])) return '';
  if (!VISIBLE_PRODUCTS.some(p => searchScore(p, fixed) > 0)) return '';
  // Se corrige sobre lo que escribio el cliente ("cargadr tipo c" ->
  // "cargador tipo c"), no sobre la forma interna.
  let out = normText(q).trim();
  tokens.forEach((t, i) => { if (fixed[i] !== t) out = out.replace(new RegExp('\\b' + t + '\\b'), fixed[i]); });
  return out;
}
