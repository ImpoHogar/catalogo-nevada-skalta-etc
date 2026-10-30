// ============================================================
//  UNIVERSOS DE MARCA
// ============================================================
//  Capa visual que se monta encima del catalogo: cuando el cliente
//  entra a una marca que tiene "universo", la seccion completa (entrada,
//  indice de lineas, capitulos del listado, tarjetas y ficha del
//  producto) toma la direccion de arte de esa marca. El encabezado, el
//  buscador, "Mi pedido" y el pie siguen siendo de ImpoHogar.
//
//  No cambia datos ni funciones: los filtros, la busqueda, el pedido,
//  las fichas y los vendedores son los del catalogo. Solo agrega:
//    - un filtro "Linea" (sale del nombre real de cada producto);
//    - el orden "Por linea" (por defecto dentro de la marca);
//    - la entrada y los encabezados de capitulo de cada marca.
//
//  Las lineas se reconocen por palabras del NOMBRE del producto (el
//  mismo texto del sistema). Lo que no calza en ninguna queda en la
//  linea final de la marca: nunca se inventa una coleccion.
//
//  Para dar universo a otra marca: agregar su entrada en UNIVERSOS
//  (lineas + textos) y su bloque de estilos en css/universos.css.
//  Las marcas sin entrada se ven como siempre.
//
//  Cargar DESPUES de catalog.js y lightbox.js, y ANTES de main.js.
// ============================================================

const UNIVERSOS = {
  'NEVADA': {
    id: 'nevada',
    estilo: 'revista',
    titular: 'Cuidado de la piel, <em>por ingrediente</em>',
    eyebrow: 'Skincare por ingrediente',
    // Solo describe lo que hay en el catalogo; las cifras se calculan.
    lead: n => `${n} productos de cuidado facial, corporal y capilar, ordenados por su ingrediente principal.`,
    indiceTitulo: 'Índice de ingredientes',
    indiceSub: 'Cada línea reúne los formatos que comparten un mismo activo. Toca una para ver solo esa línea.',
    lineas: [
      { k: 'Ki', nombre: 'Infantil con licencia', color: '#E9A321', alFinal: 3, re: /DISNEY|HASBRO|MATTHEL|MATTEL|\bMGA\b|FROZEN|MINNIE|MICKEY|SPIDER|AVERGERS|AVENGERS|TOY STORY|PEPPA|TRANSFORMERS|PONY|PRINCESS|\bCARS\b|PJMASKS|\bLOL\b|BARBIE/ },
      { k: 'Fps', nombre: 'Protección solar', color: '#D9852B', alFinal: 1, re: /\bSPF|SUNSCREEN|BLOQUEADOR|BLOQUEDOR/ },
      { k: 'Hm', nombre: 'Hombre', color: '#1F2B4A', alFinal: 2, re: /HOMBRE|\bMEN'?S\b/ },
      { k: 'Vc', nombre: 'Vitamina C', color: '#F0641E', re: /\bVIT(AMINA?|A)?[\s\-+]*C\b|\bVITC\b|\bVITAC\b/ },
      { k: 'Ha', nombre: 'Ácido hialurónico', color: '#2C5AA8', re: /HIALUR|HYALUR/ },
      { k: 'Rc', nombre: 'Retinol y ceramidas', color: '#A7864D', re: /RETINOL|CERAMID/ },
      { k: 'Rh', nombre: 'Rosa y hamamelis', color: '#E07C9C', re: /HAMAMEL|\bROSAS?\b|\bROSE\b/ },
      { k: 'Al', nombre: 'Aloe vera', color: '#2F9A5A', re: /\bALOE\b|\bALO\b/ },
      { k: 'Cm', nombre: 'Células madre', color: '#5B97BD', re: /CELULAS MAD|STEM CELL/ },
      { k: 'Bi', nombre: 'Bisabolol', color: '#B79A66', re: /BISABOLOL/ },
      { k: 'Ce', nombre: 'Centella asiática', color: '#5E8F4E', re: /CENTELLA/ },
      { k: 'Co', nombre: 'Colágeno y elastina', color: '#C2443B', re: /COLAGENO|ELASTINA/ },
      { k: 'Ms', nombre: 'Marshmallow', color: '#9C86C9', re: /MARSHMALLOW/ },
      { k: 'Pe', nombre: 'Péptidos y vitaminas', color: '#2D7F86', re: /PEPTID|NIACINAMIDE|OMEGA|BOTULIN|CAVIAR|\bNNP\b|VIT-?B5|VITA-?E|ARNICA|\bB-?5\b/ },
      { k: 'Ac', nombre: 'Antiacné y tono', color: '#1E9F9A', re: /ACNE|ANTIMANCHAS|WHITENI|BLANQUEADORA|ARBUTINA/ },
      { k: 'Fb', nombre: 'Frutas y botánicos', color: '#D95547', re: /PEPINO|CUCUMBER|PAPAYA|FRESA|STRAWBERRY|NARANJA|FRUTOS|BERRIES|YOGHURT|TE VERDE|BARRO|CARBON|VOLCANIC|MUD|LIMON|LEMON|AGUACATE|AVOCADO|AGUAC|\bCOCO\b|JAZM|CALENDULA|CHAMOMILE|SHEA/ },
      { k: 'Cp', nombre: 'Cabello y pestañas', color: '#6D4FB0', re: /CAPILAR|PESTA|TINTE|BIOTIN/ }
    ],
    resto: { k: 'Nv', nombre: 'Más de Nevada', color: '#111111' }
  },

  'SKALA': {
    id: 'skala',
    estilo: 'cartel',
    eyebrow: 'Cuidado capilar de Brasil',
    lead: n => `${n} productos para el cabello: cremas de tratamiento, cremas para peinar, sets de shampoo y acondicionador, geles y la línea infantil Skalinha.`,
    indiceTitulo: 'Elige por tipo de cabello y línea',
    indiceSub: 'Las líneas salen del nombre de cada producto. Toca una para ver solo esa.',
    destacarFormato: /1000\s?G|1\s?KG|1000ML/,
    lineas: [
      { k: 'Kids', nombre: 'Kids y Skalinha', color: '#F4D63D', alFinal: 1, re: /KIDS|SKALINHA|POTINHO|CRESPINHO|CACHINHOS|\bBB\b/ },
      { k: 'Cachos', nombre: 'Mais Cachos y rizos', color: '#1E6038', re: /CACHOS|ACACHONADOS|ACACHADOS|CRESPOS?\b|MAIS CRESPO/ },
      { k: 'Lisos', nombre: 'Mais Lisos', color: '#2E8C8A', re: /\bLISOS?\b|LISO1000/ },
      { k: 'Divino', nombre: 'Divino Potão y Divina Cor', color: '#C9541A', re: /POTAO|POTÃO|DIVIN|\bDONA\b|POTENCIA DESMAYADA|AMOR PODEROSO/ },
      { k: 'S.O.S', nombre: 'Tratamiento y reparación', color: '#143D24', re: /BOMBA|BOMA|S\.O\.S|RESTAURACI|12EN1|CERAMIDAS|BIOTINA|VITAMINA|GENETI|MATIZADOR|ALMIDON/ },
      { k: 'Brasil', nombre: 'Frutas de Brasil', color: '#E9A21B', re: /BANANA|CACAU|COCTEL|MELANCIA|MANGA|MANGO|MORANGO|CEREZA|\bUVA\b|MARACU|ACAI|\bCOCO\b|AGUACATE|FRUTAS/ },
      { k: 'Botânica', nombre: 'Botánica', color: '#399447', re: /BABOSA|JABORANDI|VINAGRE|LAMA|ARCILLA|CAFE VERDE|ROSEMARY|RAIZES|LECHE VEGETAL|ARGAN|OLEO/ }
    ],
    resto: { k: 'Skala', nombre: 'Más de Skala', color: '#5E8F3E' }
  },

  'TREE HUT': {
    id: 'treehut',
    estilo: 'aromas',
    eyebrow: 'Cuidado corporal por aroma',
    lead: n => `${n} productos corporales: exfoliantes de azúcar, mantecas, geles de baño, afeitado, mists y labios, cada uno en varios aromas.`,
    indiceTitulo: 'Por formato',
    indiceSub: 'El mismo aroma aparece en varios formatos. Elige primero qué buscas o explora por aroma.',
    aromas: ['COCO COLADA', 'MOROCCAN ROSE', 'VANILLA', 'WATERMELON', 'TROPIC GLOW', 'MOONLIGHT GLOW', 'PINK HIBISCUS', 'TANGERINE', 'OCEAN GLOW', 'LOTUS WATER', 'PINEAPPLE', 'SANTAL HAZE', 'PASSIONFRUIT SOL', 'PALM GROVE', 'PUMPKIN POP', 'VIOLET VICTORY', 'CHERRY RAVE', 'DEWY DAISY'],
    lineas: [
      { k: 'Azúcar', nombre: 'Exfoliantes de azúcar', color: '#E8618C', re: /EXFOLIANTE|SUGAR SCRUB|POLISH|SMOOTH \+ TONE/ },
      { k: 'Manteca', nombre: 'Body butter', color: '#E79A3C', re: /\bMTQ\b|BODY B\.|BODY BUTTER|WIPPED|FIRMING|HYDRAGLOW|BRIGHTEN/ },
      { k: 'Baño', nombre: 'Geles de baño y jabones', color: '#2FA7A0', re: /\bGEL\b|WASH|JABON|SET2/ },
      { k: 'Afeitado', nombre: 'Afeitado', color: '#7E6BC4', re: /AFEITAR|SHAVE/ },
      { k: 'Crema', nombre: 'Cremas, aceites y sérums', color: '#D9A441', re: /CREMA CORPORAL|ACEITE CORPORAL|SERYM|SERUM/ },
      { k: 'Mist', nombre: 'Mists', color: '#5E8FD6', re: /\bMIST\b/ },
      { k: 'Labios', nombre: 'Labios', color: '#D14B6A', re: /\bLIP\b|SUGARLIPS|SUGAR LIPS|BALSAMO|BÁLSAMO/ }
    ],
    resto: { k: 'Tree Hut', nombre: 'Más de Tree Hut', color: '#245B43' }
  },

  'MAXELL': {
    id: 'maxell',
    estilo: 'ficha',
    eyebrow: 'Energía y accesorios',
    lead: n => `${n} productos: pilas alcalinas AA, AAA, C, D y 9V en varios empaques, baterías de botón, audífonos, carga y teclado.`,
    indiceTitulo: 'Busca por medida',
    indiceSub: 'La medida va primero, como en el empaque. El código del sistema y la cantidad disponible se ven en cada producto.',
    lineas: [
      { k: 'AA', nombre: 'Pilas AA', color: '#E31B34', re: /\bAA\b(?!A)|LR06/ },
      { k: 'AAA', nombre: 'Pilas AAA', color: '#B0121F', re: /\bAAA\b|LR03/ },
      { k: 'C·D', nombre: 'Pilas C y D', color: '#7D0C16', re: /ALCALINA TIPO [CD]\b|LR20/ },
      { k: '9V', nombre: 'Pila 9V', color: '#3B3F45', re: /\b9 ?V\b/ },
      { k: 'CR', nombre: 'Baterías de botón', color: '#6B7178', re: /\bCR ?\d{4}|LR-?44|MICRO BATERIA/ },
      { k: 'Audio', nombre: 'Audífonos', color: '#1D1F22', re: /AUDIFONO/ },
      { k: 'Carga', nombre: 'Carga y cables', color: '#4A4E54', re: /CABLE|CUBO|CARGA/ }
    ],
    resto: { k: '+', nombre: 'Más de Maxell', color: '#8A9097' }
  },

  // ---------- Tecnologia: lineas = categorias del catalogo ----------
  'ARGOM': {
    id: 'argom', estilo: 'vitrina',
    eyebrow: 'Argom Tech · tecnología',
    lead: n => `${n} productos de tecnología: cables y adaptadores, audio, carga, computación y gaming, smart y soportes.`,
    indiceTitulo: 'Elige una categoría', indiceSub: 'Las categorías son las mismas del catálogo. Toca una para ver solo esa.',
    por: 'cat', paleta: ['#1769FF', '#101B33', '#4D8DFF', '#2B4C8C', '#0E4BC2', '#7A8BA8'],
    claves: { 'Cables y adaptadores': 'Cab', 'Audio': 'Aud', 'Carga y energía': 'Car', 'Computación y gaming': 'PC', 'Smart y cámaras': 'Sm', 'Soportes y accesorios': 'Sop' },
    resto: { k: '+', nombre: 'Más de Argom', color: '#7A8BA8' }
  },
  'UNNO TEKNO': {
    id: 'unno', estilo: 'vitrina',
    eyebrow: 'Unno Tekno · tecnología y gaming',
    lead: n => `${n} productos de tecnología: audio, cables y adaptadores, computación y gaming, soportes, carga y cámaras.`,
    indiceTitulo: 'Elige una categoría', indiceSub: 'Las categorías son las mismas del catálogo. Toca una para ver solo esa.',
    por: 'cat', paleta: ['#236BFE', '#17191D', '#5C93FF', '#4A505C', '#1546B5', '#8A93A3'],
    claves: { 'Cables y adaptadores': 'CBL', 'Audio': 'AUD', 'Carga y energía': 'PWR', 'Computación y gaming': 'GMR', 'Smart y cámaras': 'CAM', 'Soportes y accesorios': 'MNT' },
    resto: { k: '+', nombre: 'Más de Unno Tekno', color: '#94A3B8' }
  },

  // ---------- Cocina ----------
  'BRENTWOOD': {
    id: 'brentwood', estilo: 'estante',
    eyebrow: 'Pequeños electrodomésticos',
    lead: n => `${n} electrodomésticos para la cocina y el hogar: licuadoras y batidoras, snacks y repostería, café y bebidas, ollas eléctricas y planchas.`,
    indiceTitulo: 'Para cada momento de la cocina', indiceSub: 'Las categorías son las del catálogo. Toca una para ver solo esa.',
    por: 'tipo', paleta: ['#174A78', '#3E7CB1', '#343A40', '#6FA3CF', '#8C96A0'],
    claves: { 'Licuadoras y batidoras': 'Lic', 'Snacks y repostería': 'Snk', 'Café y bebidas': 'Caf', 'Ollas y sartenes eléctricos': 'Oll', 'Planchas': 'Pla' },
    resto: { k: '+', nombre: 'Más de Brentwood', color: '#8C8C8C' }
  },
  'NOSTALGIA': {
    id: 'nostalgia', estilo: 'estante',
    eyebrow: 'Electrodomésticos retro',
    lead: n => `${n} electrodomésticos de estilo retro: máquinas de palomitas, de algodón de azúcar y de granizados, mini parrilla, set de desayuno y mini bundt.`,
    indiceTitulo: 'La colección', indiceSub: 'Toca una categoría para ver solo esa.',
    por: 'tipo', paleta: ['#D9282D', '#62C6C7', '#292929', '#E9A23B'],
    claves: { 'Snacks y repostería': 'Snk', 'Café y bebidas': 'Caf', 'Ollas y sartenes eléctricos': 'Grill' },
    resto: { k: '+', nombre: 'Más de Nostalgia', color: '#62C6C7' }
  },

  // ---------- Belleza coreana ----------
  'TIRTIR': {
    id: 'tirtir', estilo: 'lujo',
    eyebrow: 'Maquillaje y skincare coreano',
    lead: n => `${n} productos: cushions Mask Fit en sus colecciones Red, AI Filter, All-Cover, Aura y Tinted Skin Glow, labios Glow Tint y skincare de matcha y leche.`,
    indiceTitulo: 'Colecciones', indiceSub: 'Cada colección agrupa sus tonos. Toca una para ver solo esa.',
    lineas: [
      { k: 'Red', nombre: 'Mask Fit Red', color: '#D92735', re: /FIT RED|MASK FIT RED|KIT RED|\bR\. ?CUSHION|R\.FUNDATION/ },
      { k: 'AI', nombre: 'AI Filter', color: '#8D96A0', re: /FILTRO IA|AI FILTER/ },
      { k: 'All', nombre: 'All-Cover', color: '#232325', re: /ALL-COVER|ALL COVER/ },
      { k: 'Aura', nombre: 'Aura', color: '#C9A9A6', re: /\bAURA\b/ },
      { k: 'Glow', nombre: 'Tinted Skin Glow', color: '#E87A3C', re: /TINTED SKIN GLOW/ },
      { k: 'Fit', nombre: 'Mask Fit', color: '#8E2433', re: /MASK FIT/ },
      { k: 'Corr', nombre: 'Correctores', color: '#B08968', re: /CORRECTOR/ },
      { k: 'Lips', nombre: 'Glow Tint y labios', color: '#E8455B', re: /GLOW TINT|GLOW POP|\bLIP\b|WATERISM|MELTING BALM|MELLOW|RUBOR Y LABIAL|PLUMPER/ },
      { k: 'Mt', nombre: 'Matcha', color: '#6E8F3A', re: /MATCHA/ },
      { k: 'Mk', nombre: 'Milk Skin', color: '#B9A58A', re: /LECHE|\bMILK\b/ },
      { k: 'Sk', nombre: 'Skincare y tratamiento', color: '#5A6774', re: /SERUM|AMPOLLA|CREMA|TONICO|LIMPIADOR|BALSAM|PADS|POLVO|PRIMER|SELLADOR|BLOQUEADOR|CONTORNO|PORE|ACTIVES/ }
    ],
    resto: { k: '+', nombre: 'Más de TirTir', color: '#7A2030' }
  },
  'EQQUALBERRY': {
    id: 'eqqualberry', estilo: 'paleta',
    eyebrow: 'Skincare coreano por color',
    lead: n => `${n} productos de skincare: tónicos, sérums, ampollas, pads y cremas en sus líneas Swimming Pool, Vitamin, Bakuchiol, Aloe PDRN, Hyaltoin y NAD+.`,
    indiceTitulo: 'Una línea, un color', indiceSub: 'Cada línea tiene el color de su frasco. Toca una para ver solo esa.',
    lineas: [
      { k: 'Pool', nombre: 'Swimming Pool', color: '#36B3E6', re: /SWIMMING POOL/ },
      { k: 'Vit', nombre: 'Vitamin', color: '#F2BE00', re: /VITAMIN/ },
      { k: 'Bak', nombre: 'Bakuchiol', color: '#8A55C8', re: /BAKUCHIOL/ },
      { k: 'Aloe', nombre: 'Aloe PDRN', color: '#4DB33D', re: /ALOE/ },
      { k: 'Hya', nombre: 'Hyaltoin', color: '#2E7FD9', re: /HYALTOIN/ },
      { k: 'NAD+', nombre: 'NAD+ Peptide', color: '#E3568C', re: /NAD\+|PEPTIDE/ },
      { k: 'Kit', nombre: 'Kits', color: '#7C7C86', re: /KIT/ }
    ],
    resto: { k: '+', nombre: 'Más de Eqqualberry', color: '#7C7C86' }
  },
  'KARA BEAUTY': {
    id: 'kara', estilo: 'paleta',
    eyebrow: 'Maquillaje',
    lead: n => `${n} productos de maquillaje: labios, mejillas, ojos y cejas, bases, correctores y polvos, y algo de skincare.`,
    indiceTitulo: '¿Qué vas a surtir?', indiceSub: 'Las categorías son las del catálogo. Toca una para ver solo esa.',
    por: 'tipo', paleta: ['#E83E8C', '#202020', '#F28AB8', '#C2306F', '#D9A0B8', '#7A5966'],
    claves: { 'Labios': 'Lips', 'Mejillas': 'Blush', 'Ojos y cejas': 'Eyes', 'Bases y cushions': 'Base', 'Correctores y polvos': 'Set' },
    minimo: 5,   // los tipos con menos productos van juntos al final
    resto: { k: '+', nombre: 'Skincare y más', color: '#7A5966' }
  },

  // ---------- Cabello y barberia ----------
  'ORIGEM': {
    id: 'origem', estilo: 'estante',
    eyebrow: 'Cuidado capilar y corporal de Brasil',
    lead: n => `${n} productos: tratamientos de 1 kg, Potão, geles, cremas para rizos, selagem y keratina, línea infantil y cremas corporales.`,
    indiceTitulo: 'Elige por necesidad', indiceSub: 'Las líneas salen del nombre de cada producto. Toca una para ver solo esa.',
    lineas: [
      { k: 'Corp', nombre: 'Cremas corporales', color: '#B0806A', alFinal: 2, re: /CREMA CORP|CRE,A CORP/ },
      { k: 'Kids', nombre: 'Kids', color: '#7FA8A0', alFinal: 1, re: /KIDS|NINO|ACQUA|GRUPY|ALGODON DE AZUCAR|ALGODON AZUCARADO/ },
      { k: 'Potão', nombre: 'Potão', color: '#795C46', re: /POTAO/ },
      { k: 'Rizos', nombre: 'Cachos y rizos', color: '#C29A4A', re: /CACHOS|RIZADO|CRESP|ONDULAD|ROLA ENROLA|VOLUMEN/ },
      { k: 'Gel', nombre: 'Geles', color: '#607D50', re: /\bGEL\b|SUPER DEFINICAO|SUPER FIXACAO/ },
      { k: 'Liso', nombre: 'Selagem y keratina', color: '#9C7A54', re: /SELAGEM|KERA|ALISET/ },
      { k: 'Nat', nombre: 'Tratamientos naturales', color: '#4F6B42', re: /ABACATE|BABOSA|AMIDO|BAMBU|AGUACATE|\bCOCO\b|ARGA|CERAMIDAS|HORTELA/ }
    ],
    resto: { k: '+', nombre: 'Más de Origem', color: '#4F6B42' }
  },
  'IMMORTAL': {
    id: 'immortal', estilo: 'lujo',
    eyebrow: 'Barbería · NYC',
    lead: n => `${n} productos de barbería: ceras capilares, colonias para barba, after shave, gel de afeitar y spray para barbero.`,
    indiceTitulo: 'En la barbería', indiceSub: 'Las categorías son las del catálogo. Toca una para ver solo esa.',
    por: 'tipo', paleta: ['#C5A15A', '#777777', '#111111'],
    claves: { 'Ceras y peinado': 'Wax', 'Cuidado de barba': 'Beard', 'Afeitado': 'Shave' },
    resto: { k: '+', nombre: 'Más de Immortal', color: '#8C8C8C' }
  },
  'PATRICIA DE LEÓN': {
    id: 'pdl', estilo: 'lujo',
    eyebrow: 'Maquillaje',
    lead: n => `${n} productos: labiales, lip gloss y sombras.`,
    indiceTitulo: 'La colección', indiceSub: 'Toca una línea para ver solo esa.',
    lineas: [
      { k: 'Lip', nombre: 'Lipsticks', color: '#8E1B2C', re: /LIPSTICK/ },
      { k: 'Gloss', nombre: 'Lip gloss', color: '#C9A189', re: /GLOSS/ },
      { k: 'Eye', nombre: 'Sombras', color: '#171717', re: /SOMBRAS|EYESHADOW/ }
    ],
    resto: { k: '+', nombre: 'Más de Patricia de León', color: '#D6BE95' }
  },
  'INOAR': {
    id: 'inoar', estilo: 'lujo',
    eyebrow: 'Cuidado capilar profesional',
    lead: n => `${n} productos: shampoo, acondicionador y crema para peinar Revolution Smooth, y set capilar post progresiva.`,
    indiceTitulo: 'La línea', indiceSub: 'Toca una categoría para ver solo esa.',
    por: 'tipo', paleta: ['#C6A76B', '#171717', '#9C9A94'],
    claves: { 'Shampoo y acondicionador': 'Shp', 'Peinado y definición': 'Crm', 'Sets capilares': 'Set' },
    resto: { k: '+', nombre: 'Más de Inoar', color: '#C6A76B' }
  }
};

// ---------- Utilidades ----------
function uvNorm(s) {
  return ' ' + String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ') + ' ';
}
// Interruptor general: con true el catalogo vuelve a verse sin temas de
// marca (mismos productos, filtros y pedido de siempre).
let UV_APAGADO = false;
function universoDe(brand) {
  if (UV_APAGADO) return null;
  return UNIVERSOS[String(brand || '').toUpperCase()] || null;
}
// Colores claros (amarillo, arena...) llevan texto oscuro encima.
function uvClaro(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (isNaN(n)) return false;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.66;
}
function uvClsClaro(l) { return l && uvClaro(l.color) ? ' uv-claro' : ''; }
// Linea de un producto (la primera que calza; si no, la final de la marca).
function lineaDe(p) {
  if (!p) return null;
  if (p._uvl !== undefined) return p._uvl;
  const u = universoDe(p.brand);
  if (!u) return (p._uvl = null);
  if (u.por) return (p._uvl = uvLineasPorCatalogo(u)[uvClaveCatalogo(u, p)] || u.resto);
  const n = uvNorm(p.name);
  return (p._uvl = u.lineas.find(l => l.re.test(n)) || u.resto);
}
// Marcas sin colecciones en el nombre: las lineas son las categorias o
// los tipos que el catalogo ya le asigna a cada producto (taxonomy.js).
function uvClaveCatalogo(u, p) {
  if (u.por === 'cat') return catName(p.cat);
  return p.tipo && p.tipo !== 'Otros' ? p.tipo : catName(p.cat);
}
function uvLineasPorCatalogo(u) {
  if (u._porMapa) return u._porMapa;
  const marca = Object.keys(UNIVERSOS).find(k => UNIVERSOS[k] === u);
  const cuenta = {};
  PRODUCTS.filter(p => p.brand === marca).forEach(p => { const k = uvClaveCatalogo(u, p); cuenta[k] = (cuenta[k] || 0) + 1; });
  const claves = Object.keys(cuenta).filter(k => cuenta[k] >= (u.minimo || 1)).sort((a, b) => cuenta[b] - cuenta[a]);
  u.lineas = claves.map((k, i) => ({
    k: (u.claves && u.claves[k]) || k.slice(0, 3), nombre: k, color: u.paleta[i % u.paleta.length], re: null
  }));
  u._porMapa = {};
  u.lineas.forEach(l => { u._porMapa[l.nombre] = l; });
  return u._porMapa;
}
// Orden en pantalla: las lineas con "alFinal" (1, 2, 3...) van despues
// de las propias de la marca, en ese orden. Reconocer un producto sigue
// usando el orden de la lista (las mas especificas primero).
function uvOrden(u) {
  if (u.por) uvLineasPorCatalogo(u);
  return u._orden || (u._orden = u.lineas.filter(l => !l.alFinal)
    .concat(u.lineas.filter(l => l.alFinal).sort((a, b) => a.alFinal - b.alFinal), [u.resto]));
}
function lineasConProductos(u, list) {
  const todas = uvOrden(u);
  return todas.map((l, i) => ({ l, i, items: list.filter(p => lineaDe(p) === l) })).filter(x => x.items.length);
}
function uvConStock(list) { return list.filter(p => stockNum(p) > 0); }
function uvAttr(s) { return escapeHtml(String(s)); }
// Formatos que existen en una linea (de la clasificacion del catalogo).
function uvFormatos(items, max) {
  const c = {};
  items.forEach(p => { const t = p.tipo && p.tipo !== 'Otros' ? p.tipo : catName(p.cat); c[t] = (c[t] || 0) + 1; });
  return Object.keys(c).sort((a, b) => c[b] - c[a]).slice(0, max || 4);
}
// La mejor foto para representar un grupo: con foto y con stock primero.
function uvFoto(items, salto) {
  const ok = items.filter(p => p.img).sort((a, b) => (stockNum(b) > 0) - (stockNum(a) > 0) || stockNum(b) - stockNum(a));
  return ok[salto || 0] || ok[0] || items[0];
}
function uvImg(p, cls, eager) {
  return `<img class="${cls || ''}" src="${productImgSrc(p)}" alt="${uvAttr(prettyName(p))}"${eager ? '' : ' loading="lazy"'} decoding="async">`;
}
function uvLista(brand) { return VISIBLE_PRODUCTS.filter(p => p.brand === brand); }
function uvLogo(brand, cls) {
  const info = brandInfo(brand);
  return info.logo ? `<img class="${cls}" src="${info.logo}" alt="${uvAttr(brand)}">` : `<span class="${cls} is-word">${escapeHtml(brand)}</span>`;
}

// ---------- Navegacion dentro del universo ----------
function uvSoloLinea(nombre) {
  listingState.facets = {};
  if (nombre) listingState.facets.linea = new Set([nombre]);
  renderListing(false, true);
  uvIrAlListado();
}
function uvVerTodo() {
  listingState.facets = {};
  renderListing(false, true);
  uvIrAlListado();
}
function uvIrAlListado() {
  const bar = document.querySelector('.plp-bar');
  const hdr = document.getElementById('siteHeader');
  if (!bar) return;
  const y = bar.getBoundingClientRect().top + window.scrollY - (hdr ? hdr.offsetHeight : 0) - 12;
  window.scrollTo({ top: Math.max(0, y), behavior: uvMovimiento() ? 'smooth' : 'auto' });
}
function uvIrA(id) {
  const el = document.getElementById(id);
  const hdr = document.getElementById('siteHeader');
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (hdr ? hdr.offsetHeight : 0) - 8, behavior: uvMovimiento() ? 'smooth' : 'auto' });
}
// Desde la ficha: ir a la marca con la linea ya filtrada.
let uvLineaPendiente = null;
function uvIrALinea(brand, nombre) {
  uvLineaPendiente = nombre;
  const h = brandHash(brand);
  if (location.hash === h) { uvLineaPendiente = null; uvSoloLinea(nombre); }
  else location.hash = h;
}
function uvMovimiento() {
  return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
// Aroma (Tree Hut): busqueda real dentro de la marca.
function uvAroma(a) {
  listingState.facets = { aroma: new Set([a]) };
  renderListing(false, true);
  uvIrAlListado();
}

// ---------- Filtros nuevos: Linea y Aroma ----------
FACETS.push({ id: 'linea', label: 'Línea', get: p => { const l = lineaDe(p); return l ? l.nombre : ''; }, when: r => r.kind === 'brand' && !!universoDe(r.brand) });
FACETS.push({ id: 'aroma', label: 'Aroma', get: p => { const u = universoDe(p.brand); if (!u || !u.aromas) return ''; const n = uvNorm(p.name); return u.aromas.filter(a => n.includes(' ' + a) || n.includes(a + ' ')).map(a => uvTitulo(a)); }, when: r => r.kind === 'brand' && !!(universoDe(r.brand) || {}).aromas });
FACET_BY_ID.linea = FACETS[FACETS.length - 2];
FACET_BY_ID.aroma = FACETS[FACETS.length - 1];
Object.keys(FACET_ORDER).forEach(t => { FACET_ORDER[t] = ['linea', 'aroma'].concat(FACET_ORDER[t]); });
function uvTitulo(s) { return String(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }

// ---------- Orden "Por linea" (por defecto dentro de una marca con universo) ----------
SORT_OPTIONS.unshift(['linea', 'Por línea', r => r.kind === 'brand' && !!universoDe(r.brand)]);
const _uvSortList = sortList;
sortList = function (list, sort) {
  if (sort !== 'linea') return _uvSortList(list, sort);
  const u = universoDe(currentRoute.brand);
  const orden = l => { const i = u ? uvOrden(u).indexOf(l) : -1; return i < 0 ? 999 : i; };
  // Dentro de cada linea: primero lo que tiene mas disponible.
  return list.slice().sort((a, b) => orden(lineaDe(a)) - orden(lineaDe(b)) ||
    stockNum(b) - stockNum(a) || TEXT_ORDER.compare(prettyName(a), prettyName(b)));
};
const _uvDefaultSort = defaultSort;
defaultSort = function (r) {
  if (r.kind === 'brand' && universoDe(r.brand)) return 'linea';
  return _uvDefaultSort(r);
};

// ---------- Capitulos del listado ----------
let uvUltimaLinea = null;
const _uvGroupHeaders = groupHeadersHTML;
groupHeadersHTML = function (p) {
  const u = currentRoute.kind === 'brand' ? universoDe(currentRoute.brand) : null;
  if (!u || listingState.sort !== 'linea' || viewMode === 'list') return _uvGroupHeaders(p);
  const l = lineaDe(p);
  if (renderedCount === 0 && uvPrimero(p)) uvUltimaLinea = null;
  if (l === uvUltimaLinea) return '';
  uvUltimaLinea = l;
  const items = filteredProducts.filter(x => lineaDe(x) === l);
  const disp = uvConStock(items).length;
  return `
    <div class="uv-ch${uvClsClaro(l)}" style="--lc:${l.color}" data-k="${uvAttr(l.k)}">
      <span class="uv-ch-k" aria-hidden="true">${escapeHtml(l.k)}</span>
      <div class="uv-ch-t">
        <h3>${escapeHtml(l.nombre)}</h3>
        <p>${uvFormatos(items, 5).map(escapeHtml).join(' · ')}</p>
      </div>
      <span class="uv-ch-n"><b>${fmt(items.length)}</b> ${items.length === 1 ? 'producto' : 'productos'}<small>${fmt(disp)} con stock</small></span>
    </div>`;
};
function uvPrimero(p) { return filteredProducts[0] === p; }

// ---------- Tarjetas dentro del universo ----------
const _uvCardHTML = cardHTML;
cardHTML = function (p) {
  const html = _uvCardHTML(p);
  const u = currentRoute.kind === 'brand' ? universoDe(currentRoute.brand) : null;
  if (!u || universoDe(p.brand) !== u) return html;
  const l = lineaDe(p);
  // La primera de cada capitulo va mas grande (solo con orden por linea).
  const lider = listingState.sort === 'linea' && viewMode === 'grid' && filteredProducts.find(x => lineaDe(x) === l) === p && p.img;
  return html
    .replace('<article class="pc ', `<article style="--lc:${l.color}" data-linea="${uvAttr(l.nombre)}" class="pc uv-card${lider ? ' uv-lead' : ''}${uvClsClaro(l)} `)
    .replace('<a class="pc-brand"', `<span class="uv-tag"><i></i>${escapeHtml(l.nombre)}</span><a class="pc-brand"`);
};

// ---------- Entrada de la marca ----------
const _uvBrandHead = brandHeadHTML;
brandHeadHTML = function (r) {
  const u = universoDe(r.brand);
  if (!u) return _uvBrandHead(r);
  const list = uvLista(r.brand);
  const grupos = lineasConProductos(u, list);
  const disp = uvConStock(list).length;
  const hero = ({
    botica: uvHeroBotica, revista: uvHeroRevista, cartel: uvHeroCartel, aromas: uvHeroAromas, ficha: uvHeroFicha,
    vitrina: uvHeroVitrina, estante: uvHeroEstante, lujo: uvHeroLujo, paleta: uvHeroPaleta
  }[u.estilo] || uvHeroBotica)(r.brand, u, list, grupos, disp);
  return `
    <div class="uv uv-${u.id} uv-e-${u.estilo}">
      ${hero}
      ${uvIndiceHTML(u, grupos)}
      ${u.aromas ? uvAromasHTML(u, list) : ''}
    </div>
    <div class="bh-stats" id="brandStats"></div>`;
};

function uvStatsHTML(list, grupos, disp) {
  return `
    <dl class="uvh-stats">
      <div><dt>Productos</dt><dd>${fmt(list.length)}</dd></div>
      <div><dt>Con stock hoy</dt><dd>${fmt(disp)}</dd></div>
      <div><dt>Líneas</dt><dd>${fmt(grupos.length)}</dd></div>
    </dl>`;
}
function uvCtaHTML(list, textoIndice) {
  return `
    <div class="uvh-cta">
      <button type="button" class="uv-btn" onclick="uvIrA('uvIndice')">${escapeHtml(textoIndice)}</button>
      <button type="button" class="uv-btn uv-btn-ghost" onclick="uvVerTodo()">Ver los ${fmt(list.length)} productos</button>
    </div>`;
}

// NEVADA: tablero blanco de laboratorio. Cada foto lleva la clave y el
// color de su ingrediente, como el empaque.
function uvHeroBotica(brand, u, list, grupos, disp) {
  const top = grupos.filter(g => g.l !== u.resto && g.l.k !== 'Ki').sort((a, b) => b.items.length - a.items.length).slice(0, 5);
  return `
    <section class="uv-hero">
      <div class="uvh-copy">
        <span class="uv-eyebrow">${escapeHtml(u.eyebrow)}</span>
        <h1 class="uvh-logo-wrap">${uvLogo(brand, 'uvh-logo')}</h1>
        <p class="uvh-lead">${escapeHtml(u.lead(fmt(list.length)))}</p>
        ${uvStatsHTML(list, grupos, disp)}
        ${uvCtaHTML(list, 'Ver por ingrediente')}
      </div>
      <div class="uvh-board" aria-label="Algunas líneas">
        ${top.map((g, i) => { const p = uvFoto(g.items); return `
          <button type="button" class="uvb-tile uvb-${i}" style="--lc:${g.l.color}" onclick="uvSoloLinea('${uvAttr(g.l.nombre)}')" aria-label="Ver la línea ${uvAttr(g.l.nombre)}">
            ${uvImg(p, '', i < 2)}
            <span class="uvb-cap"><b>${escapeHtml(g.l.k)}</b><span>${escapeHtml(g.l.nombre)}</span><small>${fmt(g.items.length)}</small></span>
          </button>`; }).join('')}
      </div>
    </section>`;
}

// NEVADA: portada de revista. Titular, foto en arco sobre arena y el
// sumario de sus lineas mas grandes (cada una filtra el listado).
function uvHeroRevista(brand, u, list, grupos, disp) {
  const top = grupos.filter(g => g.l !== u.resto && !g.l.alFinal).sort((a, b) => b.items.length - a.items.length).slice(0, 5);
  const p = top.length ? uvFoto(top[0].items) : uvFoto(list);
  return `
    <section class="uv-hero">
      <div class="uvh-copy">
        <span class="uv-eyebrow">${escapeHtml(u.eyebrow)}</span>
        <h1 class="uvh-logo-wrap">${uvLogo(brand, 'uvh-logo')}</h1>
        <p class="uvh-titular">${u.titular}</p>
        <p class="uvh-lead">${escapeHtml(u.lead(fmt(list.length)))}</p>
        ${uvStatsHTML(list, grupos, disp)}
        ${uvCtaHTML(list, 'Ver el índice completo')}
      </div>
      <div class="uvh-revista">
        <figure class="uvr-foto" style="--lc:${top.length ? top[0].l.color : u.resto.color}">
          ${p ? uvImg(p, '', true) : ''}
          ${top.length ? `<figcaption>${escapeHtml(top[0].l.nombre)}</figcaption>` : ''}
        </figure>
        <nav class="uvr-sumario" aria-label="Líneas principales">
          <h2>En esta edición</h2>
          ${top.map(g => `<button type="button" style="--lc:${g.l.color}" onclick="uvSoloLinea('${uvAttr(g.l.nombre)}')"><b>${escapeHtml(g.l.nombre)}</b><small>${fmt(g.items.length)}</small></button>`).join('')}
        </nav>
      </div>
    </section>`;
}

// SKALA: cartel de color, potes grandes y etiquetas de formato.
function uvHeroCartel(brand, u, list, grupos, disp) {
  const grandes = list.filter(p => u.destacarFormato.test(uvNorm(p.name)));
  const fotos = grupos.filter(g => g.l !== u.resto).map(g => uvFoto(g.items)).filter(Boolean).slice(0, 5);
  return `
    <section class="uv-hero">
      <div class="uvh-copy">
        <span class="uv-eyebrow">${escapeHtml(u.eyebrow)}</span>
        <h1 class="uvh-logo-wrap">${uvLogo(brand, 'uvh-logo')}</h1>
        <p class="uvh-lead">${escapeHtml(u.lead(fmt(list.length)))}</p>
        ${uvStatsHTML(list, grupos, disp)}
        ${uvCtaHTML(list, 'Elegir por tipo de cabello')}
      </div>
      <div class="uvh-poster" aria-hidden="true">
        ${fotos.map((p, i) => `<span class="uvp-pot uvp-${i}" style="--lc:${lineaDe(p).color}">${uvImg(p, '', i < 2)}</span>`).join('')}
        ${grandes.length ? `<span class="uvp-sticker"><b>${fmt(grandes.length)}</b>productos en formato de 1 kg</span>` : ''}
      </div>
    </section>`;
}

// TREE HUT: el aroma manda. Se elige un aroma y la entrada lo muestra en sus
// formatos (exfoliante, manteca, gel...) con su color; los nombres de los
// aromas pasan en una cinta aparte, sin tapar el texto.
// Color de cada aroma, tomado de lo que nombra (fruta, flor, tono).
const TH_COLOR = {
  'COCO COLADA': '#F2B33D', 'MOROCCAN ROSE': '#E8798F', 'VANILLA': '#D99A4E', 'WATERMELON': '#EF5A6F',
  'TROPIC GLOW': '#F08A3C', 'MOONLIGHT GLOW': '#8E83C9', 'PINK HIBISCUS': '#E2559A', 'TANGERINE': '#F37B2D',
  'OCEAN GLOW': '#3BA7C4', 'LOTUS WATER': '#6FB7CF', 'PINEAPPLE': '#E5B92E', 'SANTAL HAZE': '#B98C67',
  'PASSIONFRUIT SOL': '#B05AA8', 'PALM GROVE': '#4E9B63', 'PUMPKIN POP': '#E07A2C', 'VIOLET VICTORY': '#8060C0',
  'CHERRY RAVE': '#C9304A', 'DEWY DAISY': '#E9BE3F'
};

// Cada aroma con sus productos, agrupados por formato (linea).
function thAromas(u, list) {
  return u.aromas.map(a => {
    const items = list.filter(p => uvNorm(p.name).includes(a));
    const porLinea = new Map();
    items.forEach(p => { const l = lineaDe(p); if (!porLinea.has(l)) porLinea.set(l, []); porLinea.get(l).push(p); });
    const formatos = [...porLinea.entries()].map(([l, its]) => ({ l, foto: uvFoto(its) })).filter(f => f.foto && f.foto.img)
      .sort((x, y) => (stockNum(y.foto) > 0) - (stockNum(x.foto) > 0) || porLinea.get(y.l).length - porLinea.get(x.l).length);
    return { a, nombre: uvTitulo(a), color: TH_COLOR[a] || '#F28BA3', items, formatos, nLineas: porLinea.size };
  }).filter(x => x.items.length >= 2 && x.formatos.length).sort((x, y) => y.items.length - x.items.length);
}

function thEscena(x) {
  const [f0, f1, f2] = x.formatos;
  const pieza = (f, cls, eager) => f ? `
      <figure class="th-pieza ${cls}">
        ${uvImg(f.foto, '', eager)}
        <figcaption>${escapeHtml(f.l.nombre)}</figcaption>
      </figure>` : '';
  return `
    <div class="th-escena" style="--ac:${x.color}">
      ${pieza(f0, 'th-p0', true)}${pieza(f1, 'th-p1', true)}${pieza(f2, 'th-p2', false)}
    </div>
    <div class="th-ficha">
      <span class="th-k">Aroma</span>
      <b class="th-nombre">${escapeHtml(x.nombre)}</b>
      <span class="th-n">${fmt(x.items.length)} productos en ${fmt(x.nLineas)} ${x.nLineas === 1 ? 'formato' : 'formatos'}</span>
      <button type="button" class="th-ver" onclick="uvAroma('${uvAttr(x.nombre)}')">Ver ${escapeHtml(x.nombre)} <span aria-hidden="true">→</span></button>
    </div>`;
}

function uvHeroAromas(brand, u, list, grupos, disp) {
  const aromas = thAromas(u, list);
  if (!aromas.length) return uvHeroBotica(brand, u, list, grupos, disp);
  const x = aromas[0];
  const cinta = aromas.map(a => `<span style="--ac:${a.color}">${escapeHtml(a.nombre)}</span>`).join('<i>✦</i>');
  return `
    <section class="uv-hero th-hero" style="--ac:${x.color}">
      <div class="uvh-copy th-copy">
        <span class="uv-eyebrow">${escapeHtml(u.eyebrow)}</span>
        <h1 class="uvh-logo-wrap th-logo">${uvLogo(brand, 'uvh-logo')}</h1>
        <p class="uvh-lead">${escapeHtml(u.lead(fmt(list.length)))}</p>
        ${uvStatsHTML(list, grupos, disp)}
        ${uvCtaHTML(list, 'Ver por formato')}
      </div>
      <div class="th-vitrina">
        <div class="th-elegido" id="thElegido" aria-live="polite">${thEscena(x)}</div>
        <div class="th-elige" role="group" aria-label="Elige un aroma">
          ${aromas.slice(0, 8).map((a, i) => `<button type="button" class="th-chip" style="--ac:${a.color}" aria-pressed="${i === 0}" data-i="${i}">${escapeHtml(a.nombre)}</button>`).join('')}
        </div>
      </div>
      <div class="th-cinta" aria-hidden="true"><div class="th-cinta-in">${cinta}<i>✦</i>${cinta}<i>✦</i></div></div>
    </section>`;
}

// Interaccion: elegir aroma y rotacion suave hasta que la persona elige.
function thActivar() {
  document.querySelectorAll('.th-hero:not([data-listo])').forEach(thActivarUna);
}
function thActivarUna(hero) {
  hero.dataset.listo = '1';
  const u = universoDe('TREE HUT');
  const aromas = thAromas(u, uvLista('TREE HUT')).slice(0, 8);
  const caja = hero.querySelector('#thElegido');
  const chips = [...hero.querySelectorAll('.th-chip')];
  let actual = 0, timer = null;
  const mostrar = i => {
    if (i === actual) return;
    actual = i;
    const x = aromas[i];
    hero.style.setProperty('--ac', x.color);
    chips.forEach((c, j) => c.setAttribute('aria-pressed', String(j === i)));
    caja.classList.remove('th-entra'); void caja.offsetWidth;
    caja.innerHTML = thEscena(x);
    caja.classList.add('th-entra');
  };
  const parar = () => { clearInterval(timer); timer = null; };
  chips.forEach(c => c.addEventListener('click', () => { parar(); mostrar(+c.dataset.i); }));
  const quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!quieto && aromas.length > 1) {
    timer = setInterval(() => {
      if (!document.body.contains(hero)) return parar();
      if (!hero.offsetParent || hero.matches(':hover') || hero.contains(document.activeElement) || document.hidden) return;
      mostrar((actual + 1) % aromas.length);
    }, 4200);
  }
}
new MutationObserver(thActivar).observe(document.documentElement, { childList: true, subtree: true });

// MAXELL: hoja tecnica. La medida es el titular.
function uvHeroFicha(brand, u, list, grupos, disp) {
  const p = uvFoto(list.filter(x => /LR06|LR03/.test(uvNorm(x.name))));
  const unidades = list.reduce((s, x) => s + Math.max(0, stockNum(x)), 0);
  return `
    <section class="uv-hero">
      <div class="uvh-copy">
        <span class="uv-eyebrow">${escapeHtml(u.eyebrow)}</span>
        <h1 class="uvh-logo-wrap">${uvLogo(brand, 'uvh-logo')}</h1>
        <p class="uvh-lead">${escapeHtml(u.lead(fmt(list.length)))}</p>
        <dl class="uvh-stats">
          <div><dt>Productos</dt><dd>${fmt(list.length)}</dd></div>
          <div><dt>Con stock hoy</dt><dd>${fmt(disp)}</dd></div>
          <div><dt>Unidades en bodega</dt><dd>${fmt(unidades)}</dd></div>
        </dl>
        ${uvCtaHTML(list, 'Buscar por medida')}
      </div>
      <figure class="uvh-spec">
        ${p ? uvImg(p, '', true) : ''}
        <figcaption><span>Código</span><b>${escapeHtml(p ? p.code : '')}</b><span>${escapeHtml(p ? prettyName(p) : '')}</span></figcaption>
      </figure>
    </section>`;
}

// Las entradas de las demas marcas comparten 4 composiciones; cada marca
// les pone su propio color, letra y fondo en css/universos.css.
function uvHeroCopy(brand, u, list, grupos, disp, textoIndice) {
  return `
      <div class="uvh-copy">
        <span class="uv-eyebrow">${escapeHtml(u.eyebrow)}</span>
        <h1 class="uvh-logo-wrap">${uvLogo(brand, 'uvh-logo')}</h1>
        <p class="uvh-lead">${escapeHtml(u.lead(fmt(list.length)))}</p>
        ${uvStatsHTML(list, grupos, disp)}
        ${uvCtaHTML(list, textoIndice)}
      </div>`;
}
function uvTopGrupos(u, grupos, n) {
  const propios = grupos.filter(g => g.l !== u.resto);
  return (propios.length ? propios : grupos).slice().sort((a, b) => b.items.length - a.items.length).slice(0, n);
}

// VITRINA (Argom, Unno Tekno): showroom oscuro, cada categoria en su
// pantalla con la foto del producto.
function uvHeroVitrina(brand, u, list, grupos, disp) {
  const top = uvTopGrupos(u, grupos, 4);
  return `
    <section class="uv-hero">
      ${uvHeroCopy(brand, u, list, grupos, disp, 'Ver por categoría')}
      <div class="uvh-vitrina">
        ${top.map((g, i) => { const p = uvFoto(g.items); return `
          <button type="button" class="uvv uvv-${i}" style="--lc:${g.l.color}" onclick="uvSoloLinea('${uvAttr(g.l.nombre)}')" aria-label="Ver ${uvAttr(g.l.nombre)}">
            <span class="uvv-pic">${uvImg(p, '', i < 2)}</span>
            <span class="uvv-cap"><b>${escapeHtml(g.l.k)}</b><span>${escapeHtml(g.l.nombre)}</span><small>${fmt(g.items.length)}</small></span>
          </button>`; }).join('')}
      </div>
    </section>`;
}

// ESTANTE (Brentwood, Nostalgia, Origem): los productos de pie sobre una
// repisa, como en la tienda.
function uvHeroEstante(brand, u, list, grupos, disp) {
  const top = uvTopGrupos(u, grupos, 5);
  const fotos = top.map(g => uvFoto(g.items));
  if (fotos.length < 5) { const extra = uvConStock(list).filter(p => p.img && !fotos.includes(p)); while (fotos.length < 5 && extra.length) fotos.push(extra.shift()); }
  return `
    <section class="uv-hero">
      ${uvHeroCopy(brand, u, list, grupos, disp, 'Ver por categoría')}
      <div class="uvh-estante" aria-hidden="true">
        <div class="uve-fila">${fotos.map((p, i) => `<span class="uve uve-${i}" style="--lc:${lineaDe(p).color}">${uvImg(p, '', i < 3)}</span>`).join('')}</div>
        <span class="uve-repisa"></span>
      </div>
    </section>`;
}

// LUJO (TirTir, Patricia de Leon, Immortal, Inoar): un solo producto
// grande en un marco, con su linea al pie.
function uvHeroLujo(brand, u, list, grupos, disp) {
  const g = uvTopGrupos(u, grupos, 1)[0];
  const p = g ? uvFoto(g.items) : null;
  const sec = uvTopGrupos(u, grupos, 3).slice(1).map(x => uvFoto(x.items)).filter(x => x && x !== p);
  return `
    <section class="uv-hero">
      ${uvHeroCopy(brand, u, list, grupos, disp, 'Ver las líneas')}
      <figure class="uvh-lujo">
        <span class="uvl-marco">${p ? uvImg(p, '', true) : ''}</span>
        ${sec.map((x, i) => `<span class="uvl-sec uvl-sec-${i}" aria-hidden="true">${uvImg(x)}</span>`).join('')}
        ${g ? `<figcaption><span>${escapeHtml(g.l.nombre)}</span><b>${escapeHtml(prettyName(p))}</b></figcaption>` : ''}
      </figure>
    </section>`;
}

// PALETA (Kara Beauty, Eqqualberry): cada linea es un circulo de su color.
function uvHeroPaleta(brand, u, list, grupos, disp) {
  const top = uvTopGrupos(u, grupos, 6);
  const fin = grupos.find(g => g.l === u.resto);
  if (top.length < 6 && fin) top.push(fin);
  return `
    <section class="uv-hero">
      ${uvHeroCopy(brand, u, list, grupos, disp, 'Ver por línea')}
      <div class="uvh-paleta">
        ${top.map((g, i) => { const p = uvFoto(g.items); return `
          <button type="button" class="uvc uvc-${i}" style="--lc:${g.l.color}" onclick="uvSoloLinea('${uvAttr(g.l.nombre)}')" aria-label="Ver ${uvAttr(g.l.nombre)}">
            <span class="uvc-dot">${uvImg(p, '', i < 3)}</span>
            <span class="uvc-cap">${escapeHtml(g.l.nombre)}<small>${fmt(g.items.length)}</small></span>
          </button>`; }).join('')}
      </div>
    </section>`;
}

function uvIndiceHTML(u, grupos) {
  return `
    <section class="uv-index" id="uvIndice" aria-labelledby="uvIndiceT">
      <header class="uvi-head">
        <h2 id="uvIndiceT">${escapeHtml(u.indiceTitulo)}</h2>
        <p>${escapeHtml(u.indiceSub)}</p>
      </header>
      <div class="uvi-grid">
        ${grupos.map(g => { const p = uvFoto(g.items); const disp = uvConStock(g.items).length; return `
          <button type="button" class="uvi${uvClsClaro(g.l)}" style="--lc:${g.l.color}" onclick="uvSoloLinea('${uvAttr(g.l.nombre)}')">
            <span class="uvi-k">${escapeHtml(g.l.k)}</span>
            <span class="uvi-t"><b>${escapeHtml(g.l.nombre)}</b><small>${uvFormatos(g.items, 3).map(escapeHtml).join(' · ')}</small></span>
            <span class="uvi-n">${fmt(g.items.length)}<small>${fmt(disp)} con stock</small></span>
            ${p && p.img ? `<span class="uvi-pic">${uvImg(p)}</span>` : ''}
          </button>`; }).join('')}
      </div>
    </section>`;
}

function uvAromasHTML(u, list) {
  const presentes = u.aromas.map(a => ({ a, n: list.filter(p => uvNorm(p.name).includes(a)).length })).filter(x => x.n >= 2).sort((x, y) => y.n - x.n);
  if (!presentes.length) return '';
  return `
    <section class="uv-aromas" aria-labelledby="uvAromasT">
      <h2 id="uvAromasT">Explora por aroma</h2>
      <div class="uva-row">${presentes.map(x => `<button type="button" class="uva" onclick="uvAroma('${uvAttr(uvTitulo(x.a))}')">${escapeHtml(uvTitulo(x.a))}<small>${x.n}</small></button>`).join('')}</div>
    </section>`;
}

// ---------- Ficha del producto ----------
const _uvRenderProductPage = renderProductPage;
renderProductPage = function (pid) {
  _uvRenderProductPage(pid);
  const p = PRODUCTS_BY_ID[pid];
  const u = p ? universoDe(p.brand) : null;
  const pdp = document.querySelector('#productView .pdp');
  if (!u || !pdp) return;
  const l = lineaDe(p);
  const n = uvLista(p.brand).filter(x => lineaDe(x) === l).length;
  pdp.classList.add('uv-pdp', 'uv-' + u.id);
  pdp.style.setProperty('--lc', l.color);
  const brandEl = pdp.querySelector('.pdp-brand');
  if (brandEl) {
    brandEl.insertAdjacentHTML('afterend', `
      <button type="button" class="uv-pdp-line" onclick="uvIrALinea('${uvAttr(p.brand)}', '${uvAttr(l.nombre)}')">
        <span class="uv-ch-k">${escapeHtml(l.k)}</span><span>Línea <b>${escapeHtml(l.nombre)}</b></span><small>Ver sus ${fmt(n)} productos ${ICONS.arrow}</small>
      </button>`);
  }
};

// ---------- Marca activa en el <body> (para los estilos) ----------
const _uvRouter = router;
router = function () {
  _uvRouter.apply(this, arguments);
  const r = currentRoute;
  let u = null;
  if (r.view === 'listing' && r.kind === 'brand') u = universoDe(r.brand);
  else if (r.view === 'product' && PRODUCTS_BY_ID[r.id]) u = universoDe(PRODUCTS_BY_ID[r.id].brand);
  document.body.dataset.uv = u ? u.id : '';
  if (u && r.view === 'listing' && uvLineaPendiente) {
    const nombre = uvLineaPendiente;
    uvLineaPendiente = null;
    uvSoloLinea(nombre);
  }
};

// Tarjetas de marca (inicio y directorio): llevan el color del universo.
function uvMarcarTarjetas(root) {
  (root || document).querySelectorAll('a.brand-tile[href^="#/marca/"], a.bw-item[href^="#/marca/"]').forEach(a => {
    const slug = a.getAttribute('href').slice('#/marca/'.length);
    const brand = BRAND_BY_SLUG[slug];
    const u = universoDe(brand);
    if (u && !a.dataset.uvBrand) a.dataset.uvBrand = u.id;
  });
}
if ('MutationObserver' in window) {
  cuandoListo(() => {
    uvMarcarTarjetas();
    new MutationObserver(() => uvMarcarTarjetas()).observe(document.body, { childList: true, subtree: true });
  });
}
