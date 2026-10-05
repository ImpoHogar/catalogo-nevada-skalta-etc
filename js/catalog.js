// ============================================================
//  CATALOGO: NAVEGACION, INICIO, LISTADOS, FILTROS Y BUSCADOR
// ============================================================
//  El catalogo funciona como una tienda con secciones, cada una con su
//  direccion (se puede volver atras con el boton del navegador y
//  compartir el enlace):
//
//    #/                      Inicio ("¿Que quieres comprar hoy?")
//    #/todo                  Catalogo completo (buscar, filtrar, ordenar)
//    #/d/<departamento>      Cuidado personal, Tecnologia, Baterias, Hogar
//    #/c/<categoria>[/<tipo>]  Ej. #/c/audio/parlantes
//    #/marca/<marca>         Pagina de una marca
//    #/marcas                Directorio de marcas
//    #/buscar/<texto>        Resultados de busqueda
//    #/col/<coleccion>       nuevos, oportunidades, volumen[/<minimo>],
//                            ultimas, mas-vendidos, dia-nino
//    #/p/<id>                Ficha del producto (lightbox.js)
//
//  Todo sale de products.js / stock.js, de config.js y de la
//  estructura de taxonomy.js: no se inventa ningun dato.
// ============================================================

// ---------- Estado ----------
let filteredProducts = [];
let renderedCount = 0;
let currentRoute = { view: 'home' };
let lastListingHash = '#/todo';
const listingState = { key: '', facets: {}, sort: '', q: '', minStock: 0 };
let viewMode = 'grid';
try { viewMode = localStorage.getItem('impohogar_tec_view') === 'list' ? 'list' : 'grid'; } catch (e) {}

// Compatibilidad con codigo anterior (vitrina, main.js)
let diaNinoMode = false;
let nuevosIngresosMode = false;
let selectedCategoria = new Set();

const NUEVOS_SET = new Set(typeof NUEVOS_INGRESOS !== 'undefined' ? NUEVOS_INGRESOS : []);
const MAS_VENDIDOS_LIST = (typeof MAS_VENDIDOS !== 'undefined' ? MAS_VENDIDOS : []);
const MAS_VENDIDOS_RANK = {};
MAS_VENDIDOS_LIST.forEach((c, i) => { MAS_VENDIDOS_RANK[c] = i + 1; });
const VOLUMEN_MIN = typeof STOCK_VOLUMEN !== 'undefined' ? STOCK_VOLUMEN : 500;
const VOL_LEVELS = (typeof VOLUMEN_NIVELES !== 'undefined' && VOLUMEN_NIVELES.length) ? VOLUMEN_NIVELES.slice().sort((a, b) => a - b) : [5, 10, 25, 50];
const VOL_LEVEL_START = typeof VOLUMEN_NIVEL_INICIAL !== 'undefined' ? VOLUMEN_NIVEL_INICIAL : VOL_LEVELS[VOL_LEVELS.length - 1];

function stockNum(p) { return parseInt(p.stock) || 0; }
function fmt(n) { return Number(n).toLocaleString('es-CR'); }

// ------------------------------------------------------------
//  Marcas comerciales de cada producto (salen de los datos)
// ------------------------------------------------------------
function isProductNew(p) {
  if (NUEVOS_SET.has(p.code) || p.nuevo === true) return true;
  if (!MOSTRAR_ETIQUETA_NUEVO) return false;
  if (!p.dateAdded) return false;
  const added = new Date(p.dateAdded + 'T00:00:00');
  if (isNaN(added.getTime())) return false;
  const diffDays = (Date.now() - added.getTime()) / 86400000;
  return diffDays >= 0 && diffDays <= NEW_PRODUCT_DAYS;
}

// Nuevo ingreso (dateAdded, "nuevo":true o lista) O lote de baja rotacion activo.
function isInNuevosIngresosView(p) {
  return isProductNew(p) || (typeof isLowRotationActive === 'function' && isLowRotationActive(p));
}
function isBestSeller(p) { return !!MAS_VENDIDOS_RANK[p.code]; }

// Oportunidades: lista de config.js / "oportunidad":true. Si no hay ninguna
// y OPORTUNIDADES_AUTO esta encendido, los productos con mas unidades en
// bodega de cada categoria (stock real).
const OPORT_RANK = {};
const OPORT_NOTE = {};
let OPORT_IS_AUTO = false;
(function buildOpportunities() {
  const entries = typeof OPORTUNIDADES !== 'undefined' ? OPORTUNIDADES : [];
  let list = [];
  entries.forEach(e => {
    const code = typeof e === 'string' ? e : (e && (e.codigo || e.code));
    const p = code && VISIBLE_PRODUCTS.find(x => x.code === String(code));
    if (!p || list.includes(p)) return;
    list.push(p);
    if (e && e.nota) OPORT_NOTE[p.id] = String(e.nota);
  });
  VISIBLE_PRODUCTS.forEach(p => { if (p.oportunidad === true && !list.includes(p)) list.push(p); });
  if (!list.length && typeof OPORTUNIDADES_AUTO !== 'undefined' && OPORTUNIDADES_AUTO) {
    OPORT_IS_AUTO = true;
    const n = typeof OPORTUNIDADES_AUTO_CANTIDAD !== 'undefined' ? OPORTUNIDADES_AUTO_CANTIDAD : 24;
    const byCat = CATEGORIES.map(c => VISIBLE_PRODUCTS.filter(p => p.cat === c.id && p.img && stockNum(p) > LOW_STOCK)
      .sort((a, b) => stockNum(b) - stockNum(a)).slice(0, 4)).filter(g => g.length);
    list = [];
    while (list.length < n && byCat.some(g => g.length)) byCat.forEach(g => { if (g.length && list.length < n) list.push(g.shift()); });
  }
  list.forEach((p, i) => { OPORT_RANK[p.id] = i + 1; });
})();
function isOpportunity(p) { return !!OPORT_RANK[p.id]; }
function isVolume(p) { return stockNum(p) >= VOLUMEN_MIN; }
function isLowStock(p) { const s = stockNum(p); return s > 0 && s <= LOW_STOCK; }

// Etiquetas automaticas (badge corto + nombre en filtros)
const FLAG_DEFS = [
  { key: 'new',  badge: 'Nuevo',            facet: 'Nuevo ingreso',      icon: 'spark', test: isProductNew },
  { key: 'opp',  badge: 'Oportunidad',      facet: 'Oportunidad',        icon: 'flame', test: isOpportunity },
  { key: 'low',  badge: 'Últimas unidades', facet: 'Últimas unidades',   icon: 'bolt',  test: isLowStock },
  { key: 'vol',  badge: 'Volumen',          facet: 'Compra por volumen', icon: 'box',   test: isVolume }
];
function productFlags(p) { return FLAG_DEFS.filter(f => f.test(p)); }

function productImgSrc(p) {
  return p.img ? `img/productos/${encodeURIComponent(p.img)}?v=${IMG_VERSION}` : placeholderImg(p.brand, p.categoria);
}

// Usadas por la vitrina de entrada (showcase.js), que sigue con las
// categorias de origen.
function getCategoria(p) { return p.categoria || null; }
function normalizeText(s) { return normText(s); }
function categoriesWithCounts() {
  const counts = {};
  VISIBLE_PRODUCTS.forEach(p => { counts[p.categoria] = (counts[p.categoria] || 0) + 1; });
  return CATEGORIAS.filter(c => counts[c]).map(c => ({ name: c, count: counts[c] }));
}
function topWithPhoto(list, n) {
  return list.slice().sort((a, b) => featuredScore(b) - featuredScore(a)).slice(0, n);
}

// Orden interno para elegir fotos de portada: con stock, con foto, mas
// vendido, nuevo, oportunidad y luego mas stock.
function rankScore(p) {
  const s = stockNum(p);
  return (s > 0 ? 4e7 : 0) + (p.img ? 2e7 : 0) + (isBestSeller(p) ? 1e7 - MAS_VENDIDOS_RANK[p.code] : 0) +
    (isProductNew(p) ? 5e6 : 0) + (isOpportunity(p) ? 4e6 : 0) + Math.min(s, 3e6);
}

// Marcas
const BRAND_BY_SLUG = {};
BRANDS.forEach(b => { BRAND_BY_SLUG[slugify(b)] = b; });
function brandHash(b) { return '#/marca/' + slugify(b); }
function brandInfo(b) {
  const info = (typeof MARCAS_INFO !== 'undefined' && (MARCAS_INFO[b] || MARCAS_INFO[String(b).toUpperCase()])) || {};
  return { logo: info.logo ? 'img/marcas/' + info.logo : '', text: info.descripcion || '' };
}
function brandMarkHTML(b, cls) {
  const info = brandInfo(b);
  return info.logo
    ? `<span class="${cls} has-logo"><img src="${escapeHtml(info.logo)}" alt="${escapeHtml(b)}" loading="lazy"></span>`
    : `<span class="${cls}">${escapeHtml(b)}</span>`;
}

// ---------- Colecciones comerciales ----------
const COLLECTIONS = {
  'nuevos':        { title: 'Nuevos ingresos', eyebrow: 'Recién llegados', sub: 'Productos recién incorporados al catálogo.', icon: 'spark', filter: isInNuevosIngresosView, sort: 'recent', always: true,
                     empty: 'Por ahora no hay nuevos ingresos marcados. En cuanto entren productos nuevos a bodega aparecerán aquí.' },
  'oportunidades': { title: 'Oportunidades', eyebrow: 'Selección ImpoHogar', sub: 'Productos que te recomendamos tener en tu negocio: buena disponibilidad y listos para mover.', icon: 'flame', filter: isOpportunity, sort: 'opp', always: true,
                     empty: 'Pronto vas a encontrar aquí nuestras oportunidades comerciales.' },
  'volumen':       { title: 'Stock para volumen', eyebrow: 'Pedidos grandes', sub: 'Encuentra rápido los productos con inventario suficiente para pedidos grandes.', icon: 'box', filter: p => stockNum(p) >= VOL_LEVELS[0], sort: 'stock', always: true },
  'ultimas':       { title: 'Últimas unidades', eyebrow: 'Quedan pocas', sub: `Productos con ${LOW_STOCK} unidades o menos: asegúralos antes de que se agoten.`, icon: 'bolt', filter: isLowStock, sort: 'stock-asc' },
  'mas-vendidos':  { title: 'Más vendidos', eyebrow: 'Alta rotación', sub: 'Los productos que más piden nuestros clientes.', icon: 'tag', filter: isBestSeller, sort: 'bestseller' },
  'dia-nino':      { title: 'Día del Niño', eyebrow: 'Temporada', sub: 'Productos seleccionados para la temporada.', icon: 'spark', filter: p => DIA_DEL_NINO_CATEGORIES.includes(p.brand), sort: 'brand' }
};
function collectionActive(id) {
  if (id === 'dia-nino') {
    const lim = new Date(DIA_DEL_NINO_FECHA_LIMITE + 'T23:59:59');
    if (new Date() > lim) return false;
  }
  return VISIBLE_PRODUCTS.some(COLLECTIONS[id].filter);
}
function collectionCount(id) { return VISIBLE_PRODUCTS.filter(COLLECTIONS[id].filter).length; }

// ============================================================
//  NAVEGACION (direcciones con #)
// ============================================================
function navigate(hash) {
  if (location.hash === hash) router(); else location.hash = hash;
}

function parseHash(hashStr) {
  const raw = String(hashStr === undefined ? location.hash : hashStr).replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean).map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
  const [a, b, c] = parts;
  if (!a) return { view: 'home' };
  if (a === 'todo') return { view: 'listing', kind: 'all' };
  if (a === 'd') {
    const id = DEPARTMENT_BY_ID[b] ? b : DEPT_ALIAS[b];
    if (id) return { view: 'listing', kind: 'dept', dept: id };
  }
  if (a === 'c' && CATEGORY_BY_ID[b]) {
    const type = c ? (typesOfCat(b).find(t => slugify(t.label) === c) || {}).label : '';
    return { view: 'listing', kind: 'cat', cat: b, type: type || '' };
  }
  if (a === 'marca' && BRAND_BY_SLUG[b]) return { view: 'listing', kind: 'brand', brand: BRAND_BY_SLUG[b] };
  if (a === 'marcas') return { view: 'brands' };
  if (a === 'buscar') return { view: 'listing', kind: 'search', q: parts.slice(1).join('/') };
  if (a === 'col' && COLLECTIONS[b]) return { view: 'listing', kind: 'col', col: b, min: parseInt(c) || 0 };
  if (a === 'p' && PRODUCTS_BY_ID[b]) return { view: 'product', id: Number(b) };
  return { view: 'home' };
}

const VIEW_IDS = { home: 'homeView', listing: 'catalogo', brands: 'brandsView', product: 'productView' };

function showView(view) {
  Object.entries(VIEW_IDS).forEach(([v, id]) => {
    const el = document.getElementById(id);
    if (el) el.hidden = v !== view;
  });
  document.body.dataset.view = view;
}

const scrollMemory = {};
function router() {
  window.__appNav = (window.__appNav || 0) + 1;
  const prevHash = currentRoute.hash;
  if (prevHash) scrollMemory[prevHash] = window.scrollY;
  const r = parseHash();
  r.hash = location.hash || '#/';
  const prev = currentRoute;
  currentRoute = r;
  closeMegaMenu(); closeAllSearchResults(); closeMobileMenu(); toggleFilterSheet(false); closeMoreMenu();
  document.body.classList.remove('search-open');

  if (r.view !== 'product' && typeof onProductViewLeave === 'function') onProductViewLeave();

  if (r.view === 'home') {
    showView('home');
    document.title = 'ImpoHogar Market · Catálogo mayorista';
    window.scrollTo(0, scrollMemory[r.hash] || 0);
  } else if (r.view === 'brands') {
    renderBrandsDirectory();
    showView('brands');
    document.title = 'Marcas · ImpoHogar Market';
    window.scrollTo(0, 0);
  } else if (r.view === 'listing') {
    const key = r.hash;
    const same = listingState.key === key;
    lastListingHash = key;
    if (!same) {
      listingState.key = key;
      listingState.facets = {};
      listingState.q = r.q || '';
      listingState.sort = defaultSort(r);
      listingState.minStock = (r.kind === 'col' && r.col === 'volumen') ? (r.min || VOL_LEVEL_START) : 0;
      renderListing(true);
    }
    showView('listing');
    document.title = listingMeta(r).title.replace(/[“”]/g, '') + ' · ImpoHogar Market';
    // Al volver desde una ficha se recupera la posicion.
    window.scrollTo(0, same && prev.view === 'product' ? (scrollMemory[key] || 0) : 0);
  } else if (r.view === 'product') {
    showView('product');
    renderProductPage(r.id);
    window.scrollTo(0, 0);
  }
  const input = document.getElementById('search');
  if (input && r.view === 'listing' && r.kind === 'search') { input.value = r.q; syncSearchBox(); }
  else if (input && r.view !== 'product' && document.activeElement !== input) { input.value = ''; syncSearchBox(); }
  updateNavActive();
  updateMobileTabs();
}

function goHome() { navigate('#/'); }

// Boton grande para volver al inicio (arriba y al final de cada seccion).
function homeBackHTML(extra) {
  return `<a class="home-back${extra ? ' ' + extra : ''}" href="#/">${ICONS.home2}<span>Volver a la página principal</span></a>`;
}

// Compatibilidad con llamadas anteriores
function selectBrand(b) { navigate(brandHash(b)); }
function selectCategoria(cat) { navigate('#/todo'); }
function showNuevosIngresos() { navigate('#/col/nuevos'); }
function showDiaDelNino() { navigate('#/col/dia-nino'); }
function clearAllFilters() {
  listingState.facets = {};
  if (currentRoute.view === 'listing' && currentRoute.kind === 'search') { navigate('#/todo'); return; }
  renderListing(true);
}

// ============================================================
//  ENCABEZADO: menu principal, departamentos y navegacion movil
// ============================================================
function renderNav() {
  const nav = document.getElementById('deptNav');
  if (nav) {
    const nino = collectionActive('dia-nino') ? `<a class="dn-link dn-col" href="#/col/dia-nino">Día del Niño</a>` : '';
    nav.innerHTML = `
      <button type="button" class="dn-all" id="megaBtn" onclick="toggleMegaMenu()" aria-expanded="false" aria-controls="megaMenu">${ICONS.menu}<span>Departamentos</span></button>
      <a class="dn-link" href="#/" data-route="home">Inicio</a>
      <a class="dn-link" href="#/todo" data-route="all">Catálogo</a>
      <a class="dn-link" href="#/marcas" data-route="brands">Marcas</a>
      <a class="dn-link dn-nuevos" href="#/col/nuevos" data-route="col-nuevos">${ICONS.spark}Nuevos ingresos</a>
      <a class="dn-link dn-opp" href="#/col/oportunidades" data-route="col-oportunidades">${ICONS.flame}Oportunidades</a>
      <a class="dn-link dn-low" href="#/col/ultimas" data-route="col-ultimas">${ICONS.bolt}<span class="dn-long">Últimas unidades</span><span class="dn-short">Últimas</span></a>
      <a class="dn-link dn-vol" href="#/col/volumen" data-route="col-volumen">${ICONS.box}<span class="dn-long">Stock para volumen</span><span class="dn-short">Volumen</span></a>
      ${nino}
      <span class="dn-spacer"></span>
      <button type="button" class="dn-tool dn-calc" onclick="openCalculator()">${ICONS.calc}<span>Calculadora</span></button>
      <div class="dn-more">
        <button type="button" class="dn-tool" id="moreBtn" onclick="toggleMoreMenu(event)" aria-expanded="false" aria-controls="moreMenu">${ICONS.dots}<span>Más</span>${ICONS.chevD}</button>
        <div class="more-menu" id="moreMenu" role="menu">${toolsMenuHTML()}</div>
      </div>`;
  }
  renderMegaMenu();
  renderMobileMenu();
}

// Herramientas secundarias (menu "Mas" y menu movil). La calculadora
// tiene su propio boton visible y no se esconde aqui.
function toolsMenuHTML() {
  return `
    <button type="button" role="menuitem" onclick="closeMoreMenu();closeMobileMenu();openOrderHistory()">${ICONS.clock}<span>Historial de pedidos<small>Ver y repetir pedidos anteriores</small></span></button>
    <button type="button" role="menuitem" onclick="closeMoreMenu();closeMobileMenu();downloadCartPhotos()">${ICONS.download}<span>Descargar fotos<small>Las fotos de los productos de tu pedido</small></span></button>
    <button type="button" role="menuitem" onclick="closeMoreMenu();closeMobileMenu();openHelp()">${ICONS.help}<span>Ayuda<small>Cómo armar y enviar tu pedido</small></span></button>
    <button type="button" role="menuitem" onclick="closeMoreMenu();closeMobileMenu();openSellerModal('contacto')">${ICONS.chat}<span>Contactar vendedor<small>Escríbenos por WhatsApp</small></span></button>
    <button type="button" role="menuitem" onclick="toggleTheme()">${ICONS.spark}<span>Modo claro / oscuro</span></button>`;
}
function toggleMoreMenu(e) {
  if (e) e.stopPropagation();
  const open = !document.body.classList.contains('more-open');
  document.body.classList.toggle('more-open', open);
  const b = document.getElementById('moreBtn');
  if (b) b.setAttribute('aria-expanded', String(open));
  if (open) closeMegaMenu();
}
function closeMoreMenu() {
  document.body.classList.remove('more-open');
  const b = document.getElementById('moreBtn');
  if (b) b.setAttribute('aria-expanded', 'false');
}

function megaColumnHTML(d) {
  const cats = catsOfDept(d.id);
  return `
    <div class="mm-col tone-${d.tone}" data-dept="${d.id}">
      <a class="mm-dept" href="#/d/${d.id}">${iconSVG(d.icon)}<span>${escapeHtml(d.name)}</span><small>${TAXO_COUNTS.dept[d.id]}</small></a>
      ${cats.map(c => `
        <div class="mm-cat">
          <a class="mm-cat-link" href="#/c/${c.id}">${escapeHtml(c.name)}</a>
          <ul>${typesOfCat(c.id).filter(t => t.label !== 'Otros').slice(0, 7).map(t =>
            `<li><a href="#/c/${c.id}/${slugify(t.label)}">${escapeHtml(t.label)}</a></li>`).join('')}</ul>
        </div>`).join('')}
    </div>`;
}

function renderMegaMenu() {
  const mm = document.getElementById('megaMenu');
  if (!mm) return;
  const colLinks = ['nuevos', 'oportunidades', 'volumen', 'ultimas', 'mas-vendidos'].filter(id => COLLECTIONS[id].always || collectionActive(id)).map(id =>
    `<a href="#/col/${id}" class="mm-pill">${iconSVG(COLLECTIONS[id].icon)}${escapeHtml(COLLECTIONS[id].title)}<small>${collectionCount(id)}</small></a>`).join('');
  mm.innerHTML = `
    <div class="mm-inner">
      <div class="mm-cols">${deptsWithProducts().map(megaColumnHTML).join('')}</div>
      <div class="mm-foot">
        <div class="mm-pills">${colLinks}<a href="#/marcas" class="mm-pill">${ICONS.tag}Todas las marcas<small>${BRANDS.length}</small></a></div>
        <a href="#/todo" class="mm-all">Ver todo el catálogo · ${fmt(VISIBLE_PRODUCTS.length)} productos ${ICONS.arrow}</a>
      </div>
    </div>`;
}

let megaTimer = null;
function openMegaMenu(deptId, fromHover) {
  if (window.matchMedia('(max-width: 1023px)').matches) return;
  if (fromHover && !document.body.classList.contains('mega-open')) {
    clearTimeout(megaTimer);
    megaTimer = setTimeout(() => openMegaMenu(deptId, false), 160);
    return;
  }
  closeMoreMenu();
  document.body.classList.add('mega-open');
  const btn = document.getElementById('megaBtn');
  if (btn) btn.setAttribute('aria-expanded', 'true');
  document.querySelectorAll('#megaMenu .mm-col').forEach(c => c.classList.toggle('is-focus', !!deptId && c.dataset.dept === deptId));
}
function closeMegaMenu() {
  clearTimeout(megaTimer);
  document.body.classList.remove('mega-open');
  const btn = document.getElementById('megaBtn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
function toggleMegaMenu() {
  if (window.matchMedia('(max-width: 1023px)').matches) { openMobileMenu(); return; }
  if (document.body.classList.contains('mega-open')) closeMegaMenu(); else openMegaMenu('', false);
}

function renderMobileMenu() {
  const el = document.getElementById('mobileMenuBody');
  if (!el) return;
  const cols = ['nuevos', 'oportunidades', 'volumen', 'ultimas', 'mas-vendidos', 'dia-nino'].filter(id => (COLLECTIONS[id].always && id !== 'dia-nino') || collectionActive(id)).map(id =>
    `<a class="mmb-col mmb-${id}" href="#/col/${id}">${iconSVG(COLLECTIONS[id].icon)}<span>${escapeHtml(COLLECTIONS[id].title)}</span><small>${collectionCount(id)} productos</small></a>`).join('');
  el.innerHTML = `
    <div class="mmb-main">
      <a class="mmb-row" href="#/">${ICONS.home2}<span>Inicio</span></a>
      <a class="mmb-row" href="#/todo">${ICONS.grid}<span>Catálogo completo</span><small>${fmt(VISIBLE_PRODUCTS.length)}</small></a>
      <a class="mmb-row" href="#/marcas">${ICONS.tag}<span>Marcas</span><small>${BRANDS.length}</small></a>
      <button type="button" class="mmb-row" onclick="closeMobileMenu();openCalculator()">${ICONS.calc}<span>Calculadora</span></button>
    </div>
    <div class="mmb-cols">${cols}</div>
    <div class="mmb-label">Departamentos</div>
    ${deptsWithProducts().map(d => `
      <details class="mmb-dept tone-${d.tone}">
        <summary>${iconSVG(d.icon)}<span>${escapeHtml(d.name)}</span><small>${TAXO_COUNTS.dept[d.id]}</small>${ICONS.chevD}</summary>
        <a class="mmb-seeall" href="#/d/${d.id}">Ver todo ${escapeHtml(d.name)}</a>
        ${catsOfDept(d.id).map(c => `
          <div class="mmb-cat">
            <a class="mmb-cat-link" href="#/c/${c.id}">${escapeHtml(c.name)}<small>${TAXO_COUNTS.cat[c.id]}</small></a>
            <div class="mmb-types">${typesOfCat(c.id).filter(t => t.label !== 'Otros').map(t =>
              `<a href="#/c/${c.id}/${slugify(t.label)}">${escapeHtml(t.label)}</a>`).join('')}</div>
          </div>`).join('')}
      </details>`).join('')}
    <div class="mmb-label">Herramientas</div>
    <div class="mmb-tools">${toolsMenuHTML()}</div>`;
}
function openMobileMenu() { closeMoreMenu(); document.body.classList.add('menu-open'); }
function closeMobileMenu() { document.body.classList.remove('menu-open'); }

function routeKey(r) {
  if (r.view === 'home') return 'home';
  if (r.view === 'brands' || r.kind === 'brand') return 'brands';
  if (r.kind === 'all') return 'all';
  if (r.kind === 'col') return 'col-' + r.col;
  return '';
}
function updateNavActive() {
  const r = currentRoute;
  const key = routeKey(r);
  document.querySelectorAll('#deptNav .dn-link').forEach(a => a.classList.toggle('active', !!key && a.dataset.route === key));
}

function updateMobileTabs() {
  const r = currentRoute;
  document.querySelectorAll('.tabbar a, .tabbar button').forEach(t => t.classList.remove('active'));
  let id = '';
  if (r.view === 'home') id = 'tabHome';
  else if (r.view === 'brands' || r.kind === 'brand') id = 'tabBrands';
  else if (r.view === 'listing' || r.view === 'brands' || r.view === 'product') id = 'tabCatalog';
  const el = id && document.getElementById(id);
  if (el) el.classList.add('active');
}

// ============================================================
//  TARJETAS
// ============================================================
function cardBadges(p) {
  const out = productFlags(p).slice(0, 2).map(f => `<span class="badge badge-${f.key}">${ICONS[f.icon]}${f.badge}</span>`);
  if (stockLevel(p).key === 'out') out.unshift('<span class="badge badge-out">Agotado</span>');
  return out.slice(0, 2).join('');
}

// Datos clave de la tarjeta segun el departamento: cada uno muestra lo
// que importa para decidir (nunca datos inventados).
function keySpec(p) {
  const specs = p._specs || (p._specs = productSpecs(p));
  const tone = deptTone(p.dept);
  const get = l => (specs.find(s => s.label === l) || {}).value;
  if (tone === 'battery') return [batterySize(p) && 'Tamaño ' + batterySize(p), batteryPack(p), batteryVolt(p)].filter(Boolean).slice(0, 2);
  if (tone === 'tech') return [get('Conector'), get('Conexión'), get('Potencia'), get('Batería'), get('Video'), get('Largo')].filter(Boolean).slice(0, 2);
  if (tone === 'home') return [get('Capacidad'), get('Potencia'), get('Velocidades'), get('Conexión')].filter(Boolean).slice(0, 2);
  const size = sizeOf(p);
  return [get('Tono') && 'Tono ' + get('Tono'), size, get('Protección'), get('Contenido')].filter(Boolean).slice(0, 2);
}
// Presentacion / tamano tal como viene en el nombre (ej. "250 ml").
function sizeOf(p) {
  const specs = p._specs || (p._specs = productSpecs(p));
  const s = specs.find(x => x.label === 'Tamaño');
  if (s) return s.value;
  const m = String(p.name).toUpperCase().match(/(\d+(?:[.,]\d+)?)\s?(ML|GR|G|OZ|KG|L)\b/);
  return m ? m[1].replace(',', '.') + ' ' + m[2].toLowerCase().replace('gr', 'g') : '';
}

function availHTML(p, cls) {
  const lvl = stockLevel(p);
  return `<span class="${cls || 'pc-stock'} is-${lvl.key}"><i></i><b>${lvl.label}</b>${lvl.qty ? `<span>${escapeHtml(lvl.qty)}</span>` : ''}</span>`;
}

function qtyControlHTML(p, compact) {
  const name = escapeHtml(prettyName(p));
  const qty = qtyMap[p.id] || 0;
  if (stockLevel(p).key === 'out') return `<div class="pc-soldout">Sin stock por ahora</div>`;
  return `
    <button type="button" class="pc-add" onclick="changeQty(${p.id},1)" aria-label="Agregar ${name} al pedido">${ICONS.plus}<span>${compact ? 'Agregar' : 'Agregar al pedido'}</span></button>
    <div class="pc-stepper" role="group" aria-label="Cantidad de ${name}">
      <button type="button" onclick="changeQty(${p.id},-1)" aria-label="Quitar una unidad">−</button>
      <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" value="${qty}" data-qty-for="${p.id}" onchange="setQty(${p.id}, this.value)" onfocus="this.select()" aria-label="Cantidad a pedir de ${name}">
      <button type="button" onclick="changeQty(${p.id},1)" aria-label="Agregar una unidad">+</button>
    </div>`;
}

// Estado comercial principal de la tarjeta (una sola marca de color sutil:
// recien llegado, oportunidad, pocas unidades o volumen).
function primaryFlag(p) {
  const f = productFlags(p)[0];
  return f ? f.key : '';
}

function cardHTML(p) {
  const tone = deptTone(p.dept);
  const name = prettyName(p);
  const safeName = escapeHtml(name);
  const lvl = stockLevel(p);
  const qty = qtyMap[p.id] || 0;
  const specs = keySpec(p);
  const flag = primaryFlag(p);
  const classes = ['pc', `tone-${tone}`];
  if (flag) classes.push('f-' + flag);
  if (qty > 0) classes.push('has-qty');
  if (lvl.key === 'out') classes.push('is-out');
  if (!p.img) classes.push('no-photo');
  return `
    <article class="${classes.join(' ')}" id="card-${p.id}" data-card="${p.id}">
      <a class="pc-media" href="#/p/${p.id}" aria-label="Ver ficha de ${safeName}">
        <span class="pc-badges">${cardBadges(p)}</span>
        <img src="${productImgSrc(p)}" alt="${safeName}" loading="lazy" decoding="async">
      </a>
      <div class="pc-body">
        <a class="pc-brand" href="${brandHash(p.brand)}">${escapeHtml(p.brand)}</a>
        <a class="pc-name" href="#/p/${p.id}" title="${escapeHtml(p.name)}">${safeName}</a>
        <div class="pc-meta"><span class="pc-type">${escapeHtml(p.tipo !== 'Otros' ? p.tipo : catName(p.cat))}</span>${specs.map(s => `<span class="pc-spec">${escapeHtml(s)}</span>`).join('')}</div>
        <div class="pc-code" title="Código de barras">Código: <b>${escapeHtml(p.code)}</b></div>
        ${availHTML(p)}
        ${isVolume(p) ? `<span class="pc-vol">${ICONS.box}Disponible para volumen</span>` : ''}
        ${OPORT_NOTE[p.id] ? `<span class="pc-note">${ICONS.flame}${escapeHtml(OPORT_NOTE[p.id])}</span>` : ''}
        ${typeof dupePanelHTML === 'function' ? dupePanelHTML(p.id) : ''}
        <div class="pc-action">${qtyControlHTML(p, true)}</div>
      </div>
    </article>`;
}

// Fila de la vista "Lista" (pedido rapido por codigo)
function rowHTML(p) {
  const name = escapeHtml(prettyName(p));
  const lvl = stockLevel(p);
  const qty = qtyMap[p.id] || 0;
  return `
    <article class="pr tone-${deptTone(p.dept)}${qty > 0 ? ' has-qty' : ''}${lvl.key === 'out' ? ' is-out' : ''}" id="card-${p.id}" data-card="${p.id}">
      <a class="pr-media" href="#/p/${p.id}" aria-label="Ver ficha de ${name}"><img src="${productImgSrc(p)}" alt="" loading="lazy" decoding="async"></a>
      <div class="pr-main">
        <a class="pr-brand" href="${brandHash(p.brand)}">${escapeHtml(p.brand)}</a>
        <a class="pr-name" href="#/p/${p.id}">${name}</a>
        <span class="pr-type">${escapeHtml(p.tipo !== 'Otros' ? p.tipo : catName(p.cat))}${keySpec(p).map(s => ' · ' + escapeHtml(s)).join('')}</span>
      </div>
      <span class="pr-code">${escapeHtml(p.code)}</span>
      ${availHTML(p)}
      <div class="pr-action pc-action">${qtyControlHTML(p, true)}</div>
    </article>`;
}

// Tarjeta chica para carriles horizontales
function railCardHTML(p) {
  const lvl = stockLevel(p);
  const name = escapeHtml(prettyName(p));
  const specs = keySpec(p);
  const qty = qtyMap[p.id] || 0;
  return `
    <article class="rc tone-${deptTone(p.dept)}${qty > 0 ? ' has-qty' : ''}${lvl.key === 'out' ? ' is-out' : ''}" data-card="${p.id}">
      <a class="rc-media" href="#/p/${p.id}" aria-label="Ver ${name}">
        <span class="pc-badges">${cardBadges(p)}</span>
        <img src="${productImgSrc(p)}" alt="" loading="lazy" decoding="async">
      </a>
      <a class="rc-body" href="#/p/${p.id}">
        <span class="rc-brand">${escapeHtml(p.brand)}</span>
        <span class="rc-name">${name}</span>
        <span class="rc-meta">${escapeHtml(p.tipo !== 'Otros' ? p.tipo : catName(p.cat))}${specs[0] ? ' · ' + escapeHtml(specs[0]) : ''}</span>
        ${availHTML(p, 'rc-stock')}
      </a>
      ${lvl.key === 'out' ? '' : `<button type="button" class="rc-add" onclick="changeQty(${p.id},1)" aria-label="Agregar ${name} al pedido">${ICONS.plus}<b data-qty-badge="${p.id}">${qty || ''}</b></button>`}
    </article>`;
}

function railHTML(items, opts) {
  opts = opts || {};
  if (!items.length) return '';
  return `
    <section class="rail${opts.cls ? ' ' + opts.cls : ''}" aria-label="${escapeHtml(opts.title || '')}">
      <div class="sec-head">
        <div>
          ${opts.eyebrow ? `<span class="sec-eyebrow">${opts.icon ? iconSVG(opts.icon) : ''}${escapeHtml(opts.eyebrow)}</span>` : ''}
          <h2 class="sec-title">${escapeHtml(opts.title || '')}</h2>
          ${opts.sub ? `<p class="sec-sub">${escapeHtml(opts.sub)}</p>` : ''}
        </div>
        <div class="sec-actions">
          ${opts.more ? `<a class="sec-more" href="${opts.more}">${escapeHtml(opts.moreLabel || 'Ver todo')} ${ICONS.arrow}</a>` : ''}
          <div class="rail-arrows">
            <button type="button" class="rail-arrow" onclick="scrollRail(this,-1)" aria-label="Anteriores">${ICONS.chevL}</button>
            <button type="button" class="rail-arrow" onclick="scrollRail(this,1)" aria-label="Siguientes">${ICONS.chevR}</button>
          </div>
        </div>
      </div>
      <div class="rail-track">${items.map(railCardHTML).join('')}</div>
    </section>`;
}

function scrollRail(btn, dir) {
  const track = btn.closest('.rail').querySelector('.rail-track');
  if (track) track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: 'smooth' });
}

// ============================================================
//  INICIO
// ============================================================
function photoPick(list, n) { return topWithPhoto(list.filter(p => p.img && stockNum(p) > 0), n); }

// Un producto por grupo, alternando, para que los carriles sean variados.
function mixedPick(groups, n) {
  const lists = groups.map(g => g.slice());
  const out = [];
  while (out.length < n && lists.some(l => l.length)) lists.forEach(l => { if (l.length && out.length < n) out.push(l.shift()); });
  return out;
}

function deptBrands(deptId, n) {
  const c = {};
  VISIBLE_PRODUCTS.forEach(p => { if (p.dept === deptId) c[p.brand] = (c[p.brand] || 0) + 1; });
  return Object.keys(c).sort((a, b) => c[b] - c[a]).slice(0, n);
}

// Encabezado del inicio: "¿Que estas buscando?" + buscador.
function renderHero() {
  const el = document.getElementById('homeHero');
  if (!el) return;
  const cfg = typeof INICIO !== 'undefined' ? INICIO : {};
  const text = String(cfg.texto || '').replace('{productos}', fmt(VISIBLE_PRODUCTS.length)).replace('{marcas}', BRANDS.length);
  const popular = (typeof BUSQUEDAS_POPULARES !== 'undefined' ? BUSQUEDAS_POPULARES : []).slice(0, 6);
  el.innerHTML = `
    <div class="wh-head">
      <span class="wh-eyebrow">${escapeHtml(cfg.etiqueta || 'Catálogo mayorista')}</span>
      <h1 class="wh-title">${escapeHtml(cfg.titulo || '¿Qué estás buscando?')}</h1>
      ${text ? `<p class="wh-text">${escapeHtml(text)}</p>` : ''}
      ${bigSearchHTML('homeSearch', 'Busca por producto, marca o código de barras')}
      ${popular.length ? `<div class="wh-pop"><span>Más buscado:</span>${popular.map(t => `<button type="button" data-q="${escapeHtml(t)}" onclick="runSearch(this.dataset.q)">${escapeHtml(t)}</button>`).join('')}</div>` : ''}
    </div>`;
}

// "Compra por departamento": los cinco grandes accesos.
function renderDeptAccess() {
  const el = document.getElementById('homeDepts');
  if (el) el.innerHTML = deptsWithProducts().map(deptAccessHTML).join('');
}

function deptAccessHTML(d) {
  const pics = mixedPick(catsOfDept(d.id).map(c => photoPick(VISIBLE_PRODUCTS.filter(p => p.cat === c.id), 2)), 3);
  if (pics.length < 3) pics.push(...photoPick(VISIBLE_PRODUCTS.filter(p => p.dept === d.id && !pics.includes(p)), 3 - pics.length));
  const brands = deptBrands(d.id, 4);
  const cats = catsOfDept(d.id);
  const sub = cats.length > 1 ? cats.map(c => c.name).join(' · ') : typesOfCat(cats[0].id).filter(t => t.label !== 'Otros').slice(0, 5).map(t => t.label).join(' · ');
  return `
    <a class="da-card tone-${d.tone}" href="#/d/${d.id}">
      <span class="da-top">
        <span class="da-icon">${iconSVG(d.icon)}</span>
        <span class="da-txt">
          <span class="da-name">${escapeHtml(d.name)}</span>
          <span class="da-count">${fmt(TAXO_COUNTS.dept[d.id])} productos</span>
        </span>
      </span>
      <span class="da-pics" aria-hidden="true">${pics.map(p => `<span><img src="${productImgSrc(p)}" alt="" loading="lazy" decoding="async"></span>`).join('')}</span>
      <span class="da-sub">${escapeHtml(sub)}</span>
      <span class="da-brands">${brands.map(b => `<i>${escapeHtml(b)}</i>`).join('')}</span>
      <span class="da-go">Ver ${escapeHtml(d.name)} ${ICONS.arrow}</span>
    </a>`;
}

function bigSearchHTML(id, placeholder) {
  return `
    <form class="big-search" role="search" onsubmit="event.preventDefault();submitSearch(searchCtxOf('${id}'))" data-search-wrap="${id}">
      ${ICONS.search}
      <input id="${id}" type="search" placeholder="${escapeHtml(placeholder)}" autocomplete="off" enterkeyhint="search" aria-label="${escapeHtml(placeholder)}" aria-controls="${id}Results" aria-expanded="false">
      <button type="submit" class="btn btn-primary">Buscar</button>
      <div class="search-results" id="${id}Results" role="listbox"></div>
    </form>`;
}

// Tarjeta del inicio con un carrusel de sus productos (se mueve solo,
// se detiene al pasar el mouse y se puede deslizar con el dedo).
function promoCarouselHTML(pr) {
  const item = p => {
    const lvl = stockLevel(p);
    return `<a class="pm-item" href="#/p/${p.id}" title="${escapeHtml(prettyName(p))}">
      <span class="pm-pic"><img src="${productImgSrc(p)}" alt="" loading="lazy" decoding="async"></span>
      <span class="pm-name">${escapeHtml(prettyName(p))}</span>
      <span class="pm-stock is-${lvl.key}">${escapeHtml(lvl.qty || lvl.label)}</span>
    </a>`;
  };
  const list = pr.items.map(item).join('');
  return `
    <div class="hero-promo ${pr.cls}">
      <a class="pm-head" href="${pr.href}">
        <span class="hp-k">${iconSVG(pr.icon)}${fmt(pr.n)} productos</span>
        <b>${escapeHtml(pr.title)}</b>
        <span class="hp-d">${escapeHtml(pr.sub)}</span>
      </a>
      <div class="pm-viewport">
        <div class="pm-track" style="--pm-dur:${Math.max(24, pr.items.length * 3.2)}s">${list}<span class="pm-dup" aria-hidden="true">${list}</span></div>
      </div>
      <a class="hp-go" href="${pr.href}">Ver los ${fmt(pr.n)} ${ICONS.arrow}</a>
    </div>`;
}

function renderTrustBar() {
  const el = document.getElementById('trustBar');
  if (!el) return;
  const conStock = VISIBLE_PRODUCTS.filter(p => stockNum(p) > 0).length;
  const items = [
    ['box', `${fmt(VISIBLE_PRODUCTS.length)} productos`, `${fmt(conStock)} disponibles hoy`],
    ['tag', `${BRANDS.length} marcas`, 'Cuidado personal, tecnología y hogar'],
    ['file', 'Pedido en Excel', 'Con las fotos de tus productos'],
    ['chat', 'Tu vendedor por WhatsApp', 'Atención directa y personalizada']
  ];
  el.innerHTML = items.map(([i, b, s]) => `<div class="tb-item">${iconSVG(i)}<span><b>${escapeHtml(b)}</b><small>${escapeHtml(s)}</small></span></div>`).join('');
}

// "¿Que estas buscando?": accesos por necesidad (config.js NECESIDADES)
function hashScope(h) {
  const r = parseHash(h);
  if (r.view !== 'listing') return [];
  return scopeOf(r);
}
function renderNeeds() {
  const el = document.getElementById('homeNeeds');
  if (!el) return;
  const list = (typeof NECESIDADES !== 'undefined' ? NECESIDADES : []).map(n => {
    const scope = hashScope(n.destino);
    return { ...n, count: scope.length, pic: photoPick(scope, 1)[0] };
  }).filter(n => n.count);
  el.innerHTML = list.map(n => `
    <a class="need" href="${escapeHtml(n.destino)}">
      <span class="need-pic">${n.pic ? `<img src="${productImgSrc(n.pic)}" alt="" loading="lazy" decoding="async">` : ''}<i>${iconSVG(n.icono)}</i></span>
      <span class="need-name">${escapeHtml(n.nombre)}</span>
      <small>${fmt(n.count)} productos</small>
    </a>`).join('');
}

function renderDeptBlocks() {
  const el = document.getElementById('deptBlocks');
  if (!el) return;
  el.innerHTML = deptsWithProducts().map(d => {
    const cats = catsOfDept(d.id);
    const items = mixedPick(cats.map(c => photoPick(VISIBLE_PRODUCTS.filter(p => p.cat === c.id), 8)), 16);
    // Departamento de una sola categoria (Baterias): se muestran sus tipos.
    const tiles = (cats.length > 1 ? cats.map(c => ({ href: '#/c/' + c.id, name: c.name, icon: c.icon, list: VISIBLE_PRODUCTS.filter(p => p.cat === c.id),
        types: typesOfCat(c.id).filter(t => t.label !== 'Otros').slice(0, 3).map(t => t.label).join(' · ') }))
      : typesOfCat(cats[0].id).map(t => ({ href: '#/c/' + cats[0].id + '/' + slugify(t.label), name: t.label, icon: cats[0].icon, list: VISIBLE_PRODUCTS.filter(p => p.cat === cats[0].id && p.tipo === t.label), types: `${t.count} productos` })))
      .map(t => {
        const pic = photoPick(t.list, 1)[0];
        return `<a class="db-tile" href="${t.href}">
          <span class="db-tile-pic">${pic ? `<img src="${productImgSrc(pic)}" alt="" loading="lazy" decoding="async">` : iconSVG(t.icon)}</span>
          <span class="db-tile-name">${escapeHtml(t.name)}</span>
          <span class="db-tile-types">${escapeHtml(t.types)}</span>
        </a>`;
      }).join('');
    return `
      <section class="dept-block tone-${d.tone}" aria-labelledby="db-${d.id}">
        <div class="db-inner">
          <div class="sec-head">
            <div>
              <span class="sec-eyebrow">${iconSVG(d.icon)}Departamento</span>
              <h2 class="sec-title" id="db-${d.id}">${escapeHtml(d.name)}</h2>
              <p class="sec-sub">${escapeHtml(d.blurb)}</p>
            </div>
            <div class="sec-actions"><a class="sec-more" href="#/d/${d.id}">Ver los ${fmt(TAXO_COUNTS.dept[d.id])} productos ${ICONS.arrow}</a></div>
          </div>
          <div class="db-tiles">${tiles}</div>
          ${railHTML(items, { title: `Productos de ${d.name}`, cls: 'rail-inblock', more: '#/d/' + d.id })}
        </div>
      </section>`;
  }).join('');
}

function featuredBrands() {
  const stats = {};
  VISIBLE_PRODUCTS.forEach(p => {
    const b = stats[p.brand] || (stats[p.brand] = { name: p.brand, count: 0, depts: {}, cats: {}, items: [] });
    b.count++; b.depts[p.dept] = (b.depts[p.dept] || 0) + 1; b.cats[p.cat] = (b.cats[p.cat] || 0) + 1; b.items.push(p);
  });
  let list = Object.values(stats).sort((a, b) => b.count - a.count);
  if (typeof MARCAS_DESTACADAS !== 'undefined' && MARCAS_DESTACADAS.length) {
    const want = MARCAS_DESTACADAS.map(n => list.find(b => normText(b.name) === normText(n))).filter(Boolean);
    list = want.concat(list.filter(b => !want.includes(b)));
  }
  return list;
}

function brandTileHTML(b) {
  const mainDept = Object.keys(b.depts).sort((x, y) => b.depts[y] - b.depts[x])[0];
  const thumbs = photoPick(b.items, 3);
  const cats = Object.keys(b.cats).sort((x, y) => b.cats[y] - b.cats[x]).map(catName);
  const disp = b.items.filter(p => stockNum(p) > 0).length;
  const nuevos = b.items.filter(isInNuevosIngresosView).length;
  const vol = b.items.filter(isVolume).length;
  return `
    <a class="brand-tile tone-${deptTone(mainDept)}" href="${brandHash(b.name)}" data-brand="${escapeHtml(normText(b.name))}">
      <span class="bt-mark">${brandMarkHTML(b.name, 'bt-word')}</span>
      <span class="bt-cats">${escapeHtml(cats.slice(0, 3).join(' · '))}</span>
      <span class="bt-thumbs" aria-hidden="true">${thumbs.map(p => `<img src="${productImgSrc(p)}" alt="" loading="lazy" decoding="async">`).join('')}</span>
      <span class="bt-stats"><span><b>${fmt(b.count)}</b> productos</span><span><b>${fmt(disp)}</b> con stock</span>${nuevos ? `<span class="bt-new"><b>${nuevos}</b> nuevos</span>` : ''}${vol ? `<span class="bt-vol"><b>${vol}</b> para volumen</span>` : ''}</span>
      <span class="bt-go">Ver productos ${ICONS.arrow}</span>
    </a>`;
}

function renderHomeBrands() {
  const el = document.getElementById('homeBrands');
  if (!el) return;
  el.innerHTML = featuredBrands().slice(0, 12).map(brandTileHTML).join('');
}

function volLevelChipsHTML(active, onclickFn) {
  return VOL_LEVELS.map(n => {
    const c = VISIBLE_PRODUCTS.filter(p => stockNum(p) >= n).length;
    return onclickFn
      ? `<button type="button" class="vol-chip${active === n ? ' on' : ''}" onclick="${onclickFn}(${n})"><b>${n}+</b><span>unidades</span><small>${fmt(c)}</small></button>`
      : `<a class="vol-chip" href="#/col/volumen/${n}"><b>${n}+</b><span>unidades</span><small>${fmt(c)} productos</small></a>`;
  }).join('');
}

// ------------------------------------------------------------
//  ESCAPARATES COMERCIALES DEL INICIO
// ------------------------------------------------------------
//  Nuevos ingresos, Oportunidades, Ultimas unidades y Stock para
//  volumen. Cada uno con su mensaje, sus pestanas (por departamento o
//  por cantidad minima) y tarjetas completas con "Agregar". Todo sale
//  de los datos; un escaparate sin productos no se muestra.
const SHOWCASE_MAX = 16;
const SHOWCASES = [
  { id: 'nuevos', col: 'nuevos', icon: 'spark', claim: 'Esto acaba de llegar', title: 'Nuevos ingresos',
    sub: 'Lo más reciente que entró a bodega, por departamento.', tabs: 'dept',
    list: () => VISIBLE_PRODUCTS.filter(isInNuevosIngresosView), sort: 'recent' },
  { id: 'oportunidades', col: 'oportunidades', icon: 'flame', claim: 'Selección ImpoHogar', title: 'Oportunidades',
    sub: 'Productos que te recomendamos tener: buena disponibilidad y listos para mover.', tabs: 'dept',
    list: () => VISIBLE_PRODUCTS.filter(isOpportunity), sort: 'opp' },
  { id: 'ultimas', col: 'ultimas', icon: 'bolt', claim: 'Quedan pocas unidades', title: 'Últimas unidades',
    sub: `Productos con ${LOW_STOCK} unidades o menos. Asegúralos antes de que se agoten.`, tabs: 'dept',
    list: () => VISIBLE_PRODUCTS.filter(isLowStock), sort: 'stock-asc' },
  { id: 'volumen', col: 'volumen', icon: 'box', claim: 'Mucho inventario', title: 'Stock para volumen',
    sub: 'Elige la cantidad mínima que necesitas y te mostramos lo que tiene inventario suficiente.', tabs: 'level',
    list: () => VISIBLE_PRODUCTS.filter(p => stockNum(p) >= VOL_LEVELS[0]), sort: 'stock' },
  { id: 'mas-vendidos', col: 'mas-vendidos', icon: 'tag', claim: 'Alta rotación', title: 'Más vendidos',
    sub: 'Lo que más piden nuestros clientes.', tabs: 'dept',
    list: () => VISIBLE_PRODUCTS.filter(isBestSeller), sort: 'bestseller' }
];
const SC_STATE = {};

function showcaseItems(sc) {
  const st = SC_STATE[sc.id];
  let list = sc.list();
  if (sc.tabs === 'level') list = list.filter(p => stockNum(p) >= st);
  else if (st) list = list.filter(p => p.dept === st);
  list = sortList(list, sc.sort);
  // Con fotos primero; en "Todos" se alternan departamentos para variar.
  const withImg = list.filter(p => p.img).concat(list.filter(p => !p.img));
  if (sc.tabs === 'dept' && !st && sc.sort !== 'opp') return mixedPick(deptsWithProducts().map(d => withImg.filter(p => p.dept === d.id)), SHOWCASE_MAX);
  if (sc.tabs === 'level') return mixedPick(deptsWithProducts().map(d => withImg.filter(p => p.dept === d.id)), SHOWCASE_MAX);
  return withImg.slice(0, SHOWCASE_MAX);
}

function showcaseTabsHTML(sc) {
  const st = SC_STATE[sc.id];
  if (sc.tabs === 'level') {
    return VOL_LEVELS.map(n => {
      const c = VISIBLE_PRODUCTS.filter(p => stockNum(p) >= n).length;
      return `<button type="button" class="sc-tab${st === n ? ' on' : ''}" onclick="showcaseTab('${sc.id}', ${n})"><b>${n}+</b> unidades<small>${fmt(c)}</small></button>`;
    }).join('');
  }
  const all = sc.list();
  const depts = deptsWithProducts().map(d => ({ d, n: all.filter(p => p.dept === d.id).length })).filter(x => x.n);
  if (depts.length < 2) return '';
  return `<button type="button" class="sc-tab${!st ? ' on' : ''}" onclick="showcaseTab('${sc.id}', '')">Todos<small>${fmt(all.length)}</small></button>` +
    depts.map(x => `<button type="button" class="sc-tab${st === x.d.id ? ' on' : ''}" onclick="showcaseTab('${sc.id}', '${x.d.id}')">${escapeHtml(x.d.name)}<small>${fmt(x.n)}</small></button>`).join('');
}

function showcaseMoreHref(sc) {
  const st = SC_STATE[sc.id];
  if (sc.tabs === 'level') return '#/col/volumen/' + st;
  return '#/col/' + sc.col;
}

function showcaseHTML(sc) {
  const total = sc.list().length;
  const n = sc.tabs === 'level' ? VISIBLE_PRODUCTS.filter(p => stockNum(p) >= SC_STATE[sc.id]).length : total;
  return `
    <section class="showcase sc-${sc.id}" id="sc-${sc.id}" aria-labelledby="sct-${sc.id}">
      <div class="sc-head">
        <span class="sc-icon">${iconSVG(sc.icon)}</span>
        <div class="sc-copy">
          <span class="sc-claim">${escapeHtml(sc.claim)}</span>
          <h2 class="sc-title" id="sct-${sc.id}">${escapeHtml(sc.title)}</h2>
          <p class="sc-sub">${escapeHtml(sc.sub)}</p>
        </div>
        <a class="sc-more" href="${showcaseMoreHref(sc)}" data-sc-more>Ver ${sc.id === 'oportunidades' || sc.id === 'ultimas' ? 'las' : 'los'} ${fmt(n)} ${ICONS.arrow}</a>
      </div>
      <div class="sc-bar">
        <div class="sc-tabs" role="group" aria-label="Filtrar ${escapeHtml(sc.title)}">${showcaseTabsHTML(sc)}</div>
        <div class="rail-arrows">
          <button type="button" class="rail-arrow" onclick="scrollShowcase('${sc.id}',-1)" aria-label="Anteriores">${ICONS.chevL}</button>
          <button type="button" class="rail-arrow" onclick="scrollShowcase('${sc.id}',1)" aria-label="Siguientes">${ICONS.chevR}</button>
        </div>
      </div>
      <div class="sc-track" id="sctrack-${sc.id}">${showcaseItems(sc).map(cardHTML).join('')}</div>
    </section>`;
}

function showcaseTab(id, v) {
  const sc = SHOWCASES.find(x => x.id === id);
  if (!sc) return;
  SC_STATE[id] = v;
  const el = document.getElementById('sc-' + id);
  if (!el) return;
  el.querySelector('.sc-tabs').innerHTML = showcaseTabsHTML(sc);
  const track = el.querySelector('.sc-track');
  track.innerHTML = showcaseItems(sc).map(cardHTML).join('');
  track.scrollLeft = 0;
  const more = el.querySelector('[data-sc-more]');
  const n = sc.tabs === 'level' ? VISIBLE_PRODUCTS.filter(p => stockNum(p) >= v).length : sc.list().filter(p => !v || p.dept === v).length;
  more.href = showcaseMoreHref(sc);
  more.innerHTML = `Ver ${sc.id === 'oportunidades' || sc.id === 'ultimas' ? 'las' : 'los'} ${fmt(n)} ${ICONS.arrow}`;
}

function scrollShowcase(id, dir) {
  const track = document.getElementById('sctrack-' + id);
  if (track) track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: 'smooth' });
}

function renderShowcases() {
  const el = document.getElementById('homeShowcases');
  if (!el) return;
  SHOWCASES.forEach(sc => { if (!(sc.id in SC_STATE)) SC_STATE[sc.id] = sc.tabs === 'level' ? VOL_LEVEL_START : ''; });
  el.innerHTML = SHOWCASES.filter(sc => sc.list().length).map(showcaseHTML).join('');
}
// Compatibilidad: el inicio anterior llamaba a esta funcion.
function renderHomeRails() { renderShowcases(); }

function renderHome() {
  renderHero();
  renderDeptAccess();
  renderShowcases();
  renderNeeds();
  renderHomeBrands();
  renderTrustBar();
  renderDeptBlocks();
  bindSearchBox('homeSearch');
}
// Compatibilidad
function renderHeroNuevos() {}
function renderBrandFilter() {}
function renderCategoriaFilter() { renderNav(); }
function renderDeptCards() {}
function renderCatCircles() {}

// ============================================================
//  DIRECTORIO DE MARCAS
// ============================================================
let brandsDeptFilter = '';
let brandsQuery = '';
function renderBrandsDirectory() {
  const el = document.getElementById('brandsView');
  if (!el) return;
  const all = featuredBrands();
  el.innerHTML = `
    <div class="page-head">
      ${homeBackHTML()}
      <nav class="crumbs" aria-label="Ruta"><a href="#/">Inicio</a>${ICONS.chevR}<span>Marcas</span></nav>
      <h1 class="page-title">Nuestras marcas</h1>
      <p class="page-sub">${all.length} marcas con todo su surtido disponible. Entra a una marca para ver sus productos, categorías y filtros.</p>
      <div class="brand-tools">
        <label class="brand-search">${ICONS.search}<input type="search" id="brandSearch" placeholder="Buscar marca" autocomplete="off" value="${escapeHtml(brandsQuery)}" oninput="brandsQuery=this.value;filterBrandTiles()" aria-label="Buscar marca"></label>
        <div class="chips-row">
          <button type="button" class="fchip${!brandsDeptFilter ? ' on' : ''}" onclick="brandsDeptFilter='';renderBrandsDirectory()">Todas</button>
          ${deptsWithProducts().map(d => `<button type="button" class="fchip${brandsDeptFilter === d.id ? ' on' : ''}" onclick="brandsDeptFilter='${d.id}';renderBrandsDirectory()">${escapeHtml(d.name)}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="brand-dir" id="brandDir">${(brandsDeptFilter ? all.filter(b => b.depts[brandsDeptFilter]) : all).slice().sort((a, b) => a.name.localeCompare(b.name, 'es')).map(brandTileHTML).join('')}</div>
    <div class="empty-state" id="brandEmpty" hidden><div class="empty-state-title">Sin marcas con ese nombre</div><div class="empty-state-text">Revisa cómo está escrito o busca el producto en el buscador de arriba.</div></div>
    <div class="home-back-end">${homeBackHTML('is-outline')}</div>`;
  filterBrandTiles();
}
function filterBrandTiles() {
  const q = normText(brandsQuery).trim();
  let n = 0;
  document.querySelectorAll('#brandDir .brand-tile').forEach(t => {
    const ok = !q || t.dataset.brand.includes(q) || t.dataset.brand.replace(/\s/g, '').includes(q.replace(/\s/g, ''));
    t.hidden = !ok; if (ok) n++;
  });
  const e = document.getElementById('brandEmpty');
  if (e) e.hidden = n > 0;
}

// ============================================================
//  LISTADOS: alcance, filtros por departamento y orden
// ============================================================
function scopeOf(r) {
  switch (r.kind) {
    case 'dept': return VISIBLE_PRODUCTS.filter(p => p.dept === r.dept);
    case 'cat': return VISIBLE_PRODUCTS.filter(p => p.cat === r.cat && (!r.type || p.tipo === r.type));
    case 'brand': return VISIBLE_PRODUCTS.filter(p => p.brand === r.brand);
    case 'col': return VISIBLE_PRODUCTS.filter(COLLECTIONS[r.col].filter);
    case 'search': {
      const t = queryTokensOf(r.q);
      VISIBLE_PRODUCTS.forEach(p => { p._score = searchScore(p, t); });
      return VISIBLE_PRODUCTS.filter(p => p._score > 0);
    }
    default: return VISIBLE_PRODUCTS.slice();
  }
}

function defaultSort(r) {
  if (r.kind === 'search') return 'relevance';
  if (r.kind === 'col') return COLLECTIONS[r.col].sort;
  return 'brand';
}

function toneFamily(p) {
  const n = String(p.name).toUpperCase().match(/\b\d{2}(?:\.\d)?([CNW])\b/);
  if (!n || p.cat !== 'maquillaje') return '';
  return { C: 'Frío (C)', N: 'Neutro (N)', W: 'Cálido (W)' }[n[1]];
}

function powerBucket(p) {
  const w = specValue(p, 'Potencia');
  if (!w) return '';
  const v = parseFloat(w);
  if (v <= 12) return 'Hasta 12 W';
  if (v <= 25) return '13–25 W';
  if (v <= 65) return '26–65 W';
  return 'Más de 65 W';
}

function connValue(p) {
  if (p.cat !== 'audio' && p.cat !== 'computacion') return '';
  return specValue(p, 'Conexión') || 'Con cable';
}

function tipoName(v) {
  const [c, t] = String(v).split('|');
  return t === 'Otros' ? `Otros · ${catName(c)}` : t;
}

const AVAIL_ORDER = ['Disponible', 'Pocas unidades', 'Agotado'];
const FLAG_ORDER = FLAG_DEFS.map(f => f.facet);

// Filtros. "tones": en que departamentos aparecen (beauty / tech /
// battery / home; vacio = siempre). Solo se muestran si hay al menos 2
// opciones. El orden de cada departamento esta en FACET_ORDER.
const FACETS = [
  { id: 'dept',    label: 'Departamento',   get: p => p.dept, name: deptName, when: r => ['all', 'search', 'col', 'brand'].includes(r.kind) },
  { id: 'cat',     label: 'Categoría',      get: p => p.cat, name: catName, when: r => r.kind !== 'cat' },
  { id: 'tipo',    label: 'Subcategoría',   get: p => p.cat + '|' + p.tipo, name: tipoName, when: r => r.kind !== 'all' && !(r.kind === 'cat' && r.type) },
  { id: 'brand',   label: 'Marca',          get: p => p.brand, when: r => r.kind !== 'brand' },
  { id: 'avail',   label: 'Disponibilidad', get: p => stockLevel(p).label, order: AVAIL_ORDER, keep: true },
  { id: 'flags',   label: 'Tipo de producto', get: p => productFlags(p).map(f => f.facet), order: FLAG_ORDER, keep: true },
  // Cuidado personal y maquillaje
  { id: 'size',    label: 'Presentación',   get: sizeBucket, tones: ['beauty', 'care'], order: SIZE_ORDER },
  { id: 'benefit', label: 'Beneficio',      get: productBenefits, tones: ['beauty', 'care'] },
  { id: 'tone',    label: 'Subtono',        get: toneFamily, tones: ['beauty'] },
  // Tecnologia
  { id: 'compat',  label: 'Compatibilidad', get: productCompat, tones: ['tech'] },
  { id: 'conector', label: 'Conector',      get: p => specValue(p, 'Conector'), tones: ['tech'] },
  { id: 'conn',    label: 'Conectividad',   get: connValue, tones: ['tech'] },
  { id: 'power',   label: 'Potencia',       get: powerBucket, tones: ['tech', 'home'], order: ['Hasta 12 W', '13–25 W', '26–65 W', 'Más de 65 W'] },
  // Baterias
  { id: 'bsize',   label: 'Tamaño',         get: batterySize, tones: ['battery'], order: ['AAA', 'AA', 'C', 'D', '9V'] },
  { id: 'bchem',   label: 'Tipo de batería', get: batteryChem, tones: ['battery'] },
  { id: 'bpack',   label: 'Presentación',   get: batteryPack, tones: ['battery'] },
  { id: 'volt',    label: 'Voltaje',        get: batteryVolt, tones: ['battery'] },
  // Hogar
  { id: 'cap',     label: 'Capacidad',      get: p => p.dept === 'hogar' ? specValue(p, 'Capacidad') : '', tones: ['home'] },
  { id: 'speeds',  label: 'Velocidades',    get: p => p.dept === 'hogar' ? specValue(p, 'Velocidades') : '', tones: ['home'] }
];
const FACET_BY_ID = {};
FACETS.forEach(f => { FACET_BY_ID[f.id] = f; });

// Orden de los filtros segun el departamento (lo que mas importa primero).
const FACET_ORDER = {
  beauty:  ['tipo', 'brand', 'avail', 'flags', 'tone', 'size', 'benefit', 'cat', 'dept'],
  care:    ['cat', 'tipo', 'brand', 'avail', 'flags', 'size', 'benefit', 'dept'],
  tech:    ['cat', 'tipo', 'brand', 'avail', 'flags', 'compat', 'conector', 'conn', 'power', 'dept'],
  battery: ['bsize', 'bchem', 'bpack', 'volt', 'tipo', 'brand', 'avail', 'flags', 'cat', 'dept'],
  home:    ['cat', 'tipo', 'brand', 'avail', 'flags', 'cap', 'power', 'speeds', 'dept'],
  mixed:   ['dept', 'cat', 'tipo', 'brand', 'avail', 'flags']
};

function valuesOf(f, p) {
  const v = f.get(p);
  if (Array.isArray(v)) return v.filter(Boolean);
  return v ? [v] : [];
}

function scopeTones(list) {
  return new Set(list.map(p => deptTone(p.dept)));
}

function matchesFacets(p, except) {
  if (listingState.minStock && stockNum(p) < listingState.minStock) return false;
  for (const id in listingState.facets) {
    if (id === except) continue;
    const sel = listingState.facets[id];
    const f = FACET_BY_ID[id];
    if (!f || !sel || !sel.size) continue;
    const vals = valuesOf(f, p);
    if (!vals.some(v => sel.has(v))) return false;
  }
  return true;
}

function sortList(list, sort) {
  const by = {
    relevance: (a, b) => (b._score || 0) - (a._score || 0) || rankScore(b) - rankScore(a),
    featured: (a, b) => rankScore(b) - rankScore(a),
    recent: (a, b) => String(b.dateAdded || '').localeCompare(String(a.dateAdded || '')) || b.id - a.id,
    opp: (a, b) => (OPORT_RANK[a.id] || 1e9) - (OPORT_RANK[b.id] || 1e9),
    bestseller: (a, b) => (MAS_VENDIDOS_RANK[a.code] || 1e9) - (MAS_VENDIDOS_RANK[b.code] || 1e9),
    stock: (a, b) => stockNum(b) - stockNum(a),
    'stock-asc': (a, b) => (stockNum(a) <= 0) - (stockNum(b) <= 0) || stockNum(a) - stockNum(b),
    az: (a, b) => prettyName(a).localeCompare(prettyName(b), 'es', { numeric: true }),
    brand: (a, b) => a.brand.localeCompare(b.brand, 'es') || catIndex(a) - catIndex(b) ||
      typeIndex(a) - typeIndex(b) || prettyName(a).localeCompare(prettyName(b), 'es', { numeric: true })
  };
  return list.slice().sort(by[sort] || by.brand);
}
function catIndex(p) { const i = CATEGORIES.findIndex(c => c.id === p.cat); return i < 0 ? 99 : i; }
function typeIndex(p) {
  const c = CATEGORY_BY_ID[p.cat];
  if (!c) return 99;
  const i = c.types.findIndex(t => t[0] === p.tipo);
  return i < 0 ? 98 : i;
}

const SORT_OPTIONS = [
  ['relevance', 'Más relevantes', r => r.kind === 'search'],
  ['opp', 'Selección ImpoHogar', r => r.kind === 'col' && r.col === 'oportunidades'],
  ['bestseller', 'Más vendidos', r => r.kind === 'col' && r.col === 'mas-vendidos'],
  ['recent', 'Más recientes', () => true],
  ['az', 'A–Z', () => true],
  ['brand', 'Marca', () => true],
  ['stock', 'Mayor disponibilidad', () => true],
  ['stock-asc', 'Menor disponibilidad', () => true]
];

function listingMeta(r) {
  const crumbs = [['#/', 'Inicio']];
  let title = 'Catálogo', sub = 'Busca, filtra y ordena entre todos nuestros productos.', eyebrow = '', tone = '';
  if (r.kind === 'dept') {
    const d = DEPARTMENT_BY_ID[r.dept];
    crumbs.push(['#/todo', 'Catálogo']); crumbs.push(['', d.name]); title = d.name; sub = d.blurb; tone = d.tone; eyebrow = 'Departamento';
  } else if (r.kind === 'cat') {
    const c = CATEGORY_BY_ID[r.cat], d = DEPARTMENT_BY_ID[c.dept];
    crumbs.push(['#/d/' + d.id, d.name]);
    if (r.type) { crumbs.push(['#/c/' + c.id, c.name]); crumbs.push(['', r.type]); title = r.type; sub = `${c.name} · ${d.name}`; }
    else { crumbs.push(['', c.name]); title = c.name; sub = `${typesOfCat(c.id).filter(t => t.label !== 'Otros').map(t => t.label).join(', ')}.`; }
    tone = d.tone; eyebrow = d.name;
  } else if (r.kind === 'brand') {
    crumbs.push(['#/marcas', 'Marcas']); crumbs.push(['', r.brand]); title = r.brand; eyebrow = 'Marca';
    const ds = [...new Set(VISIBLE_PRODUCTS.filter(p => p.brand === r.brand).map(p => deptName(p.dept)))];
    sub = brandInfo(r.brand).text || `Todo el surtido de ${r.brand} en ${ds.join(', ').toLowerCase()}.`;
  } else if (r.kind === 'col') {
    const c = COLLECTIONS[r.col];
    crumbs.push(['', c.title]); title = c.title; sub = c.sub; eyebrow = c.eyebrow;
  } else if (r.kind === 'search') {
    crumbs.push(['', 'Búsqueda']); title = `“${r.q}”`; sub = 'Resultados por nombre, marca, código, categoría y palabras relacionadas.'; eyebrow = 'Resultados de búsqueda';
  } else {
    crumbs.push(['', 'Catálogo']);
  }
  return { crumbs, title, sub, eyebrow, tone };
}

// Accesos rapidos arriba del listado: categorias del departamento, tipos
// de la categoria, o tipos de la marca.
function quickNavHTML(r) {
  let items = [];
  if (r.kind === 'dept') {
    const cats = catsOfDept(r.dept);
    items = cats.length > 1
      ? cats.map(c => ({ href: '#/c/' + c.id, label: c.name, count: TAXO_COUNTS.cat[c.id], pic: photoPick(VISIBLE_PRODUCTS.filter(p => p.cat === c.id), 1)[0], icon: c.icon }))
      : typesOfCat(cats[0].id).map(t => ({ href: '#/c/' + cats[0].id + '/' + slugify(t.label), label: t.label, count: t.count, pic: photoPick(VISIBLE_PRODUCTS.filter(p => p.cat === cats[0].id && p.tipo === t.label), 1)[0], icon: cats[0].icon }));
  } else if (r.kind === 'cat') {
    items = typesOfCat(r.cat).map(t => ({ href: '#/c/' + r.cat + (r.type === t.label ? '' : '/' + slugify(t.label)), label: t.label, count: t.count, on: r.type === t.label,
      pic: photoPick(VISIBLE_PRODUCTS.filter(p => p.cat === r.cat && p.tipo === t.label), 1)[0], icon: CATEGORY_BY_ID[r.cat].icon }));
  }
  if (items.length < 2) return '';
  return `<div class="quicknav">${items.map(i => `
    <a class="qn${i.on ? ' on' : ''}" href="${i.href}">
      <span class="qn-pic">${i.pic ? `<img src="${productImgSrc(i.pic)}" alt="" loading="lazy" decoding="async">` : iconSVG(i.icon)}</span>
      <span class="qn-label">${escapeHtml(i.label)}<small>${i.count}</small></span>
    </a>`).join('')}</div>`;
}

// Pagina de marca: "Todos | Tratamientos | Crema para peinar | Sets | Nuevos"
// segun los datos reales de esa marca.
function brandChipsHTML(r) {
  const list = VISIBLE_PRODUCTS.filter(p => p.brand === r.brand);
  const counts = {};
  list.forEach(p => { const k = p.cat + '|' + p.tipo; counts[k] = (counts[k] || 0) + 1; });
  const keys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const selT = listingState.facets.tipo || new Set();
  const selF = listingState.facets.flags || new Set();
  const flagChips = [];
  if (keys.length < 2 && !flagChips.length) return '';
  return `<div class="brand-chips" role="group" aria-label="Filtrar ${escapeHtml(r.brand)}">
    <button type="button" class="fchip${!selT.size ? ' on' : ''}" onclick="brandChip('', '')">Todos<small>${list.length}</small></button>
    ${keys.length > 1 ? keys.map(k => `<button type="button" class="fchip${selT.has(k) && selT.size === 1 ? ' on' : ''}" data-v="${escapeHtml(k)}" onclick="brandChip('tipo', this.dataset.v)">${escapeHtml(tipoName(k))}<small>${counts[k]}</small></button>`).join('') : ''}
    ${flagChips.map(x => `<button type="button" class="fchip fchip-${x.f.key}${selF.has(x.f.facet) ? ' on' : ''}" data-v="${escapeHtml(x.f.facet)}" onclick="brandChip('flags', this.dataset.v)">${ICONS[x.f.icon]}${x.f.key === 'new' ? 'Nuevos' : 'Oportunidades'}<small>${x.n}</small></button>`).join('')}
  </div>`;
}
function brandChip(id, v) {
  if (!id) { delete listingState.facets.tipo; }
  else {
    const cur = listingState.facets[id];
    if (cur && cur.size === 1 && cur.has(v)) delete listingState.facets[id];
    else listingState.facets[id] = new Set([v]);
  }
  renderListing(false);
}

function brandHeadHTML(r) {
  const list = VISIBLE_PRODUCTS.filter(p => p.brand === r.brand);
  const cats = [...new Set(list.map(p => p.cat))].sort((a, b) => catIndex({ cat: a }) - catIndex({ cat: b }));
  const pics = photoPick(list, 4);
  return `
    <div class="brand-hero tone-${deptTone(list[0] ? list[0].dept : '')}">
      <div class="bh-copy">
        <span class="page-eyebrow">Marca · ${fmt(list.length)} productos</span>
        ${brandMarkHTML(r.brand, 'bh-mark')}
        <p>${escapeHtml(listingMeta(r).sub)}</p>
        <div class="bh-cats">${cats.map(c => `<a href="#/c/${c}">${escapeHtml(catName(c))}<small>${list.filter(p => p.cat === c).length}</small></a>`).join('')}</div>
      </div>
      <div class="bh-pics" aria-hidden="true">${pics.map(p => `<span><img src="${productImgSrc(p)}" alt="" loading="lazy" decoding="async"></span>`).join('')}</div>
    </div>
    <div class="bh-stats" id="brandStats"></div>`;
}

// Datos de la marca que tambien filtran (Disponibles, Nuevos, Volumen...).
const BRAND_STATS = [
  { key: '', label: 'Todos los productos', test: () => true },
  { key: 'avail:Disponible', label: 'Disponibles', test: p => stockLevel(p).key === 'ok', cls: 'is-ok' },
  { key: 'flags:Nuevo ingreso', label: 'Nuevos ingresos', test: isProductNew, cls: 'is-new' },
  { key: 'flags:Oportunidad', label: 'Oportunidades', test: isOpportunity, cls: 'is-opp' },
  { key: 'flags:Compra por volumen', label: 'Para volumen', test: isVolume, cls: 'is-vol' },
  { key: 'flags:Últimas unidades', label: 'Últimas unidades', test: isLowStock, cls: 'is-low' }
];
function brandStatsHTML(r) {
  const list = VISIBLE_PRODUCTS.filter(p => p.brand === r.brand);
  const active = (() => {
    const ids = Object.keys(listingState.facets).filter(id => id !== 'tipo');
    if (ids.length !== 1) return ids.length ? null : '';
    const sel = listingState.facets[ids[0]];
    return sel.size === 1 ? ids[0] + ':' + [...sel][0] : null;
  })();
  return BRAND_STATS.map(st => ({ st, n: list.filter(st.test).length })).filter(x => x.n || !x.st.key).map(x =>
    `<button type="button" class="bh-stat ${x.st.cls || ''}${active === x.st.key ? ' on' : ''}" data-k="${escapeHtml(x.st.key)}" onclick="brandStat(this.dataset.k)"><b>${fmt(x.n)}</b><span>${x.st.label}</span></button>`).join('');
}
function brandStat(k) {
  const tipo = listingState.facets.tipo;
  listingState.facets = tipo ? { tipo } : {};
  if (k) { const [id, v] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)]; listingState.facets[id] = new Set([v]); }
  renderListing(false);
}

function deptHeadHTML(r) {
  const d = DEPARTMENT_BY_ID[r.dept];
  const brands = deptBrands(d.id, 8);
  return `
    <div class="dept-hero tone-${d.tone}">
      <span class="dh-icon">${iconSVG(d.icon)}</span>
      <div>
        <span class="page-eyebrow">Departamento · ${fmt(TAXO_COUNTS.dept[d.id])} productos</span>
        <h1 class="page-title">${escapeHtml(d.name)}</h1>
        <p class="page-sub">${escapeHtml(d.blurb)}</p>
        <div class="dh-brands"><span>Marcas:</span>${brands.map(b => `<a href="${brandHash(b)}">${escapeHtml(b)}</a>`).join('')}</div>
      </div>
    </div>`;
}

// Catalogo general: "¿Que estas buscando?" + comprar por categoria.
function catalogHeadHTML() {
  return `
    <div class="catalog-hero">
      <h1 class="ch-title">¿Qué estás buscando?</h1>
      ${bigSearchHTML('catSearch', 'Escribe un producto, una marca o un código')}
      <div class="ch-label">Comprar por categoría</div>
      <div class="ch-depts">${deptsWithProducts().map(d => {
        const pic = photoPick(VISIBLE_PRODUCTS.filter(p => p.dept === d.id), 1)[0];
        return `<a class="ch-dept tone-${d.tone}" href="#/d/${d.id}">
          <span class="ch-pic">${pic ? `<img src="${productImgSrc(pic)}" alt="" loading="lazy" decoding="async">` : ''}</span>
          <span class="ch-name">${iconSVG(d.icon)}${escapeHtml(d.name)}<small>${fmt(TAXO_COUNTS.dept[d.id])} productos</small></span>
        </a>`;
      }).join('')}</div>
    </div>`;
}

function volumeHeadHTML() {
  return `<div class="vol-levels vol-levels-page" role="group" aria-label="Cantidad mínima disponible">
    <span class="vl-label">${ICONS.box}Necesito al menos:</span>
    ${volLevelChipsHTML(listingState.minStock, 'setVolumeLevel')}
  </div>`;
}
function setVolumeLevel(n) {
  listingState.minStock = n;
  const h = '#/col/volumen/' + n;
  try { history.replaceState(null, '', h); } catch (e) {}
  listingState.key = h; currentRoute.hash = h; lastListingHash = h;
  const wrap = document.querySelector('.vol-levels-page');
  if (wrap) wrap.outerHTML = volumeHeadHTML();
  renderListing(false);
}
function setMinStock(v) {
  listingState.minStock = parseInt(v) || 0;
  if (currentRoute.kind === 'col' && currentRoute.col === 'volumen') { setVolumeLevel(listingState.minStock || VOL_LEVELS[0]); return; }
  renderListing(false);
}
function minStockOptionsHTML() {
  return `<option value="0"${!listingState.minStock ? ' selected' : ''}>Cualquier cantidad</option>` +
    VOL_LEVELS.map(n => `<option value="${n}"${listingState.minStock === n ? ' selected' : ''}>${n}+ unidades</option>`).join('');
}

let scopeCache = { key: '', list: [] };
function currentScope() {
  if (scopeCache.key !== listingState.key) scopeCache = { key: listingState.key, list: scopeOf(currentRoute) };
  return scopeCache.list;
}

function computeFiltered() {
  if (currentRoute.view !== 'listing') return [];
  const list = currentScope().filter(p => matchesFacets(p, null));
  return sortList(list, listingState.sort);
}

function facetGroupsHTML() {
  const r = currentRoute;
  const scope = currentScope();
  const tones = scopeTones(scope);
  const order = tones.size === 1 ? FACET_ORDER[[...tones][0]] : FACET_ORDER.mixed.concat(FACETS.map(f => f.id).filter(id => !FACET_ORDER.mixed.includes(id)));
  return order.map(id => FACET_BY_ID[id]).filter(Boolean).map(f => {
    if (f.when && !f.when(r)) return '';
    if (f.tones && !f.tones.some(t => tones.has(t))) return '';
    if (f.tones && tones.size > 1 && ![...tones].every(t => f.tones.includes(t)) && r.kind !== 'search') return '';
    const base = scope.filter(p => matchesFacets(p, f.id));
    const counts = {};
    base.forEach(p => valuesOf(f, p).forEach(v => { counts[v] = (counts[v] || 0) + 1; }));
    let vals = Object.keys(counts);
    const sel = listingState.facets[f.id] || new Set();
    sel.forEach(v => { if (!(v in counts)) { counts[v] = 0; vals.push(v); } });
    if (vals.length < 2 && !sel.size && !f.keep) return '';
    if (!vals.length) return '';
    if (f.order) vals.sort((a, b) => (f.order.indexOf(a) + 1 || 99) - (f.order.indexOf(b) + 1 || 99) || String(a).localeCompare(String(b), 'es', { numeric: true }));
    else vals.sort((a, b) => counts[b] - counts[a] || String(a).localeCompare(String(b), 'es'));
    const many = vals.length > 7;
    const dot = v => f.id === 'avail' ? `<i class="fdot is-${v === 'Disponible' ? 'ok' : v === 'Agotado' ? 'out' : 'low'}"></i>` : '';
    return `
      <details class="facet facet-${f.id}" open>
        <summary>${escapeHtml(f.label)}${sel.size ? `<b>${sel.size}</b>` : ''}${ICONS.chevD}</summary>
        <div class="facet-opts${many ? ' is-long' : ''}">
          ${vals.map((v, i) => `
            <label class="fopt${i >= 7 ? ' extra' : ''}">
              <input type="checkbox" ${sel.has(v) ? 'checked' : ''} onchange="toggleFacet('${f.id}', this.dataset.v)" data-v="${escapeHtml(v)}">
              <span class="fbox"></span>${dot(v)}<span class="ftxt">${escapeHtml(f.name ? f.name(v) : v)}</span><small>${fmt(counts[v])}</small>
            </label>`).join('')}
          ${many ? `<button type="button" class="facet-more" onclick="this.closest('.facet-opts').classList.toggle('show-all')"><span class="fm-more">Ver ${vals.length - 7} más</span><span class="fm-less">Ver menos</span></button>` : ''}
        </div>
      </details>`;
  }).join('');
}

// Filtros rapidos arriba de los productos (los mismos filtros del panel).
const QUICK_FILTERS = [
  { f: 'avail', v: 'Disponible', label: 'Disponible', dot: 'ok' },
  { f: 'flags', v: 'Nuevo ingreso', label: 'Nuevo', icon: 'spark', cls: 'qf-new' },
  { f: 'flags', v: 'Oportunidad', label: 'Oportunidad', icon: 'flame', cls: 'qf-opp' },
  { f: 'flags', v: 'Compra por volumen', label: 'Volumen', icon: 'box', cls: 'qf-vol' },
  { f: 'flags', v: 'Últimas unidades', label: 'Últimas unidades', icon: 'bolt', cls: 'qf-low' }
];
function quickFiltersHTML() {
  const scope = currentScope();
  const r = currentRoute;
  return QUICK_FILTERS.map(q => {
    const sel = (listingState.facets[q.f] || new Set()).has(q.v);
    const f = FACET_BY_ID[q.f];
    const n = scope.filter(p => matchesFacets(p, q.f) && valuesOf(f, p).includes(q.v)).length;
    // En la coleccion de ese mismo tipo el filtro no aporta nada.
    if (r.kind === 'col' && ((r.col === 'ultimas' && q.v === 'Últimas unidades') || (r.col === 'oportunidades' && q.v === 'Oportunidad') || (r.col === 'nuevos' && q.v === 'Nuevo ingreso'))) return '';
    if (!n && !sel) return '';
    return `<button type="button" class="qf ${q.cls || ''}${sel ? ' on' : ''}" data-f="${q.f}" data-v="${escapeHtml(q.v)}" onclick="toggleFacet(this.dataset.f, this.dataset.v)" aria-pressed="${sel}">${q.dot ? `<i class="fdot is-${q.dot}"></i>` : ICONS[q.icon]}${escapeHtml(q.label)}<small>${fmt(n)}</small></button>`;
  }).join('');
}

function toggleFacet(id, v) {
  const s = listingState.facets[id] || (listingState.facets[id] = new Set());
  if (s.has(v)) s.delete(v); else s.add(v);
  if (!s.size) delete listingState.facets[id];
  renderListing(false);
}
function clearFacet(id, v) {
  if (id === 'min') { setMinStock(0); return; }
  const s = listingState.facets[id];
  if (s) { s.delete(v); if (!s.size) delete listingState.facets[id]; }
  renderListing(false);
}
function clearFacets() {
  listingState.facets = {};
  if (!(currentRoute.kind === 'col' && currentRoute.col === 'volumen')) listingState.minStock = 0;
  renderListing(false);
}

function activeChipsHTML() {
  const chips = [];
  Object.keys(listingState.facets).forEach(id => {
    const f = FACET_BY_ID[id];
    (listingState.facets[id] || new Set()).forEach(v => chips.push(
      `<button type="button" class="achip" data-v="${escapeHtml(v)}" onclick="clearFacet('${id}', this.dataset.v)">${escapeHtml(f && f.name ? f.name(v) : v)}${ICONS.close}</button>`));
  });
  if (listingState.minStock && !(currentRoute.kind === 'col' && currentRoute.col === 'volumen')) chips.push(`<button type="button" class="achip" onclick="clearFacet('min')">${listingState.minStock}+ unidades${ICONS.close}</button>`);
  if (!chips.length) return '';
  return chips.join('') + `<button type="button" class="link-btn" onclick="clearFacets()">Limpiar filtros</button>`;
}

function setSort(v) { listingState.sort = v; renderListing(false); }
function setViewMode(m) {
  viewMode = m;
  try { localStorage.setItem('impohogar_tec_view', m); } catch (e) {}
  renderListing(false, true);
}

function listingHeadHTML(r, meta) {
  const crumbs = `<nav class="crumbs" aria-label="Ruta">${meta.crumbs.map(([h, l]) => h ? `<a href="${h}">${escapeHtml(l)}</a>${ICONS.chevR}` : `<span aria-current="page">${escapeHtml(l)}</span>`).join('')}</nav>`;
  if (r.kind === 'all') return `${homeBackHTML()}${crumbs}${catalogHeadHTML()}`;
  if (r.kind === 'dept') return `${homeBackHTML()}${crumbs}${deptHeadHTML(r)}${quickNavHTML(r)}`;
  if (r.kind === 'brand') return `${homeBackHTML()}${crumbs}${brandHeadHTML(r)}<h2 class="plp-title">Todos los productos de ${escapeHtml(r.brand)}</h2><div id="brandChips"></div>`;
  const colIcon = r.kind === 'col' ? `<span class="col-icon col-${r.col}">${iconSVG(COLLECTIONS[r.col].icon)}</span>` : '';
  return `${homeBackHTML()}${crumbs}
    <div class="page-title-row${colIcon ? ' has-icon' : ''}">${colIcon}<div>
      ${meta.eyebrow ? `<span class="page-eyebrow">${escapeHtml(meta.eyebrow)}</span>` : ''}
      <h1 class="page-title">${escapeHtml(meta.title)}</h1>
      <p class="page-sub">${escapeHtml(meta.sub)}</p>
    </div></div>
    ${r.kind === 'col' && r.col === 'volumen' ? volumeHeadHTML() : ''}
    ${r.kind === 'col' && r.col === 'oportunidades' && OPORT_IS_AUTO ? '<p class="page-note">Productos con la mayor disponibilidad en bodega de cada categoría.</p>' : ''}
    ${quickNavHTML(r)}`;
}

function renderListing(full, keepScroll) {
  const r = currentRoute;
  const sec = document.getElementById('catalogo');
  if (!sec || r.view !== 'listing') return;
  if (full) scopeCache.key = '';
  const meta = listingMeta(r);
  filteredProducts = computeFiltered();
  const total = filteredProducts.length;
  const sorts = SORT_OPTIONS.filter(o => o[2](r));
  const nFacets = Object.values(listingState.facets).reduce((s, x) => s + x.size, 0) + (listingState.minStock && !(r.kind === 'col' && r.col === 'volumen') ? 1 : 0);
  const scopeN = currentScope().length;

  sec.className = 'listing' + (meta.tone ? ' tone-' + meta.tone : '');
  if (full) {
    sec.innerHTML = `
      <div class="page-head">${listingHeadHTML(r, meta)}</div>
      <div class="plp">
        <aside class="facets" id="facetPanel" aria-label="Filtros">
          <div class="facets-head"><b>Filtrar y ordenar</b><button type="button" class="icon-btn" onclick="toggleFilterSheet(false)" aria-label="Cerrar filtros">${ICONS.close}</button></div>
          <div class="facets-sort"><label for="sortSelM">Ordenar por</label><select id="sortSelM" onchange="setSort(this.value)"></select></div>
          <div class="facets-sort facets-min"><label for="minSelM">Cantidad disponible</label><select id="minSelM" onchange="setMinStock(this.value)"></select></div>
          <div id="facetGroups"></div>
          <div class="facets-apply"><button type="button" class="btn btn-outline" onclick="clearFacets()">Limpiar</button><button type="button" class="btn btn-primary" id="facetApply" onclick="toggleFilterSheet(false)">Ver resultados</button></div>
        </aside>
        <div class="sheet-backdrop" onclick="toggleFilterSheet(false)"></div>
        <div class="plp-main">
          <div class="plp-bar">
            <div class="plp-count" id="count" aria-live="polite"></div>
            <button type="button" class="plp-filter-btn" onclick="toggleFilterSheet(true)">${ICONS.filter}Filtrar y ordenar<b id="filtersCount"></b></button>
            <label class="plp-sort plp-min"><span>Cantidad</span><select id="minSel" onchange="setMinStock(this.value)"></select></label>
            <label class="plp-sort"><span>Ordenar</span><select id="sortSel" onchange="setSort(this.value)"></select></label>
            <div class="view-toggle" role="group" aria-label="Vista">
              <button type="button" id="vmGrid" onclick="setViewMode('grid')" aria-label="Ver en cuadrícula" title="Cuadrícula">${ICONS.grid}</button>
              <button type="button" id="vmList" onclick="setViewMode('list')" aria-label="Ver en lista (pedido rápido)" title="Lista (pedido rápido)">${ICONS.list}</button>
            </div>
          </div>
          <div class="quick-filters" id="quickFilters" role="group" aria-label="Filtros rápidos"></div>
          <div class="active-chips" id="activeFilters"></div>
          <div class="grid" id="grid"></div>
          <div class="load-more-wrap">
            <div class="load-more-meta" id="loadMoreMeta"></div>
            <button id="loadMoreBtn" type="button" class="btn btn-outline load-more-btn" onclick="renderPage(false)">Cargar más</button>
            <div id="loadSentinel" aria-hidden="true"></div>
          </div>
          <div class="home-back-end">${homeBackHTML('is-outline')}</div>
        </div>
      </div>`;
    observeSentinel();
    if (r.kind === 'all') bindSearchBox('catSearch');
  }
  const opts = sorts.map(([v, l]) => `<option value="${v}"${v === listingState.sort ? ' selected' : ''}>${l}</option>`).join('');
  ['sortSel', 'sortSelM'].forEach(id => { const s = document.getElementById(id); if (s) s.innerHTML = opts; });
  ['minSel', 'minSelM'].forEach(id => { const s = document.getElementById(id); if (s) s.innerHTML = minStockOptionsHTML(); });
  const bc = document.getElementById('brandChips');
  if (bc) bc.innerHTML = brandChipsHTML(r);
  const bs = document.getElementById('brandStats');
  if (bs) bs.innerHTML = brandStatsHTML(r);
  const qf = document.getElementById('quickFilters');
  if (qf) qf.innerHTML = quickFiltersHTML();
  document.getElementById('facetGroups').innerHTML = facetGroupsHTML();
  document.getElementById('activeFilters').innerHTML = activeChipsHTML();
  document.getElementById('filtersCount').textContent = nFacets || '';
  document.getElementById('facetApply').textContent = `Ver ${fmt(total)} ${total === 1 ? 'resultado' : 'resultados'}`;
  document.getElementById('vmGrid').classList.toggle('on', viewMode === 'grid');
  document.getElementById('vmList').classList.toggle('on', viewMode === 'list');
  document.getElementById('grid').className = 'grid' + (viewMode === 'list' ? ' is-list' : '');
  document.getElementById('count').innerHTML = `<b>${fmt(total)}</b> ${total === 1 ? 'producto' : 'productos'}${total !== scopeN ? ` <span>de ${fmt(scopeN)}</span>` : ''}`;
  renderPage(true);
  if (!full && !keepScroll) {
    const bar = document.querySelector('.plp-bar');
    const hdr = document.getElementById('siteHeader');
    if (bar && bar.getBoundingClientRect().top < 0) window.scrollTo({ top: bar.getBoundingClientRect().top + window.scrollY - (hdr ? hdr.offsetHeight : 0) - 12 });
  }
}

// Encabezados de grupo cuando se ordena "Por marca"
let lastBrand = '', lastGroup = '';
function groupHeadersHTML(p) {
  if (listingState.sort !== 'brand' || viewMode === 'list') return '';
  let html = '';
  if (p.brand !== lastBrand) {
    lastBrand = p.brand; lastGroup = '';
    if (currentRoute.kind !== 'brand') {
      const n = filteredProducts.filter(x => x.brand === p.brand).length;
      html += `<div class="grid-brand"><a href="${brandHash(p.brand)}">${escapeHtml(p.brand)}</a><span>${fmt(n)} ${n === 1 ? 'producto' : 'productos'}</span></div>`;
    }
  }
  const k = p.cat + '|' + p.tipo;
  if (k !== lastGroup) {
    lastGroup = k;
    const n = filteredProducts.filter(x => x.brand === p.brand && x.cat === p.cat && x.tipo === p.tipo).length;
    const label = p.tipo !== 'Otros' ? p.tipo : catName(p.cat);
    html += `<div class="grid-group tone-${deptTone(p.dept)}"><i></i>${escapeHtml(label)}${currentRoute.kind === 'cat' ? '' : `<em>${escapeHtml(catName(p.cat))}</em>`}<span>${n}</span></div>`;
  }
  return html;
}

function emptyListingHTML() {
  const r = currentRoute;
  const col = r.kind === 'col' ? COLLECTIONS[r.col] : null;
  const filtered = Object.keys(listingState.facets).length || (listingState.minStock && !(col && r.col === 'volumen'));
  let text = 'Ningún producto cumple todos los filtros elegidos.';
  if (r.kind === 'search') text = 'No encontramos productos con esa búsqueda. Prueba con otra palabra, la marca o el código de barras.';
  else if (col && col.empty && !currentScope().length) text = col.empty;
  else if (col && r.col === 'volumen') text = 'Ningún producto tiene esa cantidad disponible con los filtros elegidos. Prueba con un nivel menor.';
  return `
    <div class="empty-state">
      <div class="empty-icon">${col ? iconSVG(col.icon) : ICONS.search}</div>
      <div class="empty-state-title">${col && !currentScope().length ? 'Muy pronto' : 'Sin resultados'}</div>
      <div class="empty-state-text">${escapeHtml(text)}</div>
      <div class="empty-actions">
        ${filtered ? `<button type="button" class="btn btn-outline" onclick="clearFacets()">Quitar filtros</button>` : ''}
        ${col && r.col !== 'oportunidades' ? `<a class="btn btn-outline" href="#/col/oportunidades">Ver oportunidades</a>` : ''}
        <a class="btn btn-primary" href="#/todo">Ver todo el catálogo</a>
      </div>
    </div>`;
}

function renderPage(reset) {
  const grid = document.getElementById('grid');
  if (!grid) return;
  if (reset) {
    grid.innerHTML = '';
    renderedCount = 0;
    lastBrand = ''; lastGroup = '';
    if (!filteredProducts.length) grid.innerHTML = emptyListingHTML();
  }
  const next = filteredProducts.slice(renderedCount, renderedCount + PAGE_SIZE);
  const fn = viewMode === 'list' ? rowHTML : cardHTML;
  grid.insertAdjacentHTML('beforeend', next.map(p => groupHeadersHTML(p) + fn(p)).join(''));
  renderedCount += next.length;
  const total = filteredProducts.length;
  const btn = document.getElementById('loadMoreBtn');
  if (btn) {
    btn.style.display = renderedCount < total ? '' : 'none';
    btn.textContent = `Cargar más (${fmt(total - renderedCount)} restantes)`;
  }
  const meta = document.getElementById('loadMoreMeta');
  if (meta) meta.innerHTML = total > PAGE_SIZE ? `Mostrando ${fmt(renderedCount)} de ${fmt(total)}<span class="lm-bar"><i style="width:${Math.round(renderedCount / total * 100)}%"></i></span>` : '';
}

// Carga automatica al llegar al final del listado
let sentinelObs = null;
function observeSentinel() {
  const s = document.getElementById('loadSentinel');
  if (!s || !('IntersectionObserver' in window)) return;
  if (sentinelObs) sentinelObs.disconnect();
  sentinelObs = new IntersectionObserver(es => {
    if (es.some(e => e.isIntersecting) && currentRoute.view === 'listing' && renderedCount < filteredProducts.length && renderedCount >= PAGE_SIZE) renderPage(false);
  }, { rootMargin: '600px 0px' });
  sentinelObs.observe(s);
}

function toggleFilterSheet(open) { document.body.classList.toggle('sheet-open', !!open); }

// Compatibilidad: algunas funciones antiguas llaman a esto.
function applyFilters() { if (currentRoute.view === 'listing') renderListing(false); }
function renderActiveFilters() {}

// ============================================================
//  BUSCADOR (encabezado, inicio y catalogo)
// ============================================================
//  Resultados mientras se escribe: categorias y tipos que coinciden,
//  marcas y productos (con boton para agregar al pedido). Un codigo de
//  barras exacto lleva directo al producto.
let searchTimer = null;
let searchActiveIndex = -1;
const RECENT_KEY = 'impohogar_tec_recent';
const SEARCH_CTXS = {};

function searchCtxOf(inputId) {
  if (SEARCH_CTXS[inputId]) {
    const c = SEARCH_CTXS[inputId];
    c.input = document.getElementById(inputId) || c.input;
    c.box = document.getElementById(c.boxId) || c.box;
    return c;
  }
  const boxId = inputId === 'search' ? 'searchResults' : inputId + 'Results';
  return (SEARCH_CTXS[inputId] = { id: inputId, boxId, input: document.getElementById(inputId), box: document.getElementById(boxId) });
}
function headerCtx() { return searchCtxOf('search'); }

function recentSearches() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { return []; } }
function saveRecent(q) {
  q = q.trim(); if (!q) return;
  const list = [q].concat(recentSearches().filter(x => normText(x) !== normText(q))).slice(0, 6);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) {}
}
function clearRecent() {
  try { localStorage.removeItem(RECENT_KEY); } catch (e) {}
  renderSearchResults(Object.values(SEARCH_CTXS).find(c => c.box && c.box.classList.contains('open')));
}

function highlight(text, tokens) {
  let out = escapeHtml(text);
  tokens.filter(t => t.length > 1).forEach(t => {
    const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    out = out.replace(re, '<mark>$1</mark>');
  });
  return out;
}

// Categorias y tipos que coinciden con lo escrito ("audifonos" -> Audio > Audifonos)
function taxoSuggestions(tokens) {
  if (!tokens.length) return [];
  const out = [];
  const test = label => {
    const n = searchNorm(label);
    return tokens.every(t => expandToken(t).some(a => n.includes(a)));
  };
  CATEGORIES.forEach(c => {
    if (!TAXO_COUNTS.cat[c.id]) return;
    if (test(c.name)) out.push({ href: '#/c/' + c.id, label: c.name, where: deptName(c.dept), count: TAXO_COUNTS.cat[c.id] });
    typesOfCat(c.id).forEach(t => {
      if (t.label !== 'Otros' && test(t.label)) out.push({ href: '#/c/' + c.id + '/' + slugify(t.label), label: t.label, where: c.name, count: t.count });
    });
  });
  DEPARTMENTS.forEach(d => { if (TAXO_COUNTS.dept[d.id] && test(d.name)) out.push({ href: '#/d/' + d.id, label: d.name, where: 'Departamento', count: TAXO_COUNTS.dept[d.id] }); });
  return out.sort((a, b) => b.count - a.count).slice(0, 4);
}

function renderSearchResults(ctx) {
  ctx = ctx || headerCtx();
  const box = ctx.box, input = ctx.input;
  if (!box || !input) return;
  const q = input.value.trim();
  const tokens = queryTokensOf(q);
  searchActiveIndex = -1;
  const run = `runSearch(this.dataset.q, '${ctx.id}')`;
  if (!q) {
    const rec = recentSearches();
    box.innerHTML = `
      ${rec.length ? `<div class="sr-label">Búsquedas recientes <button type="button" class="sr-clear" onclick="clearRecent()">Borrar</button></div>
        <div class="sr-chips">${rec.map(t => `<button type="button" class="sr-chip" data-q="${escapeHtml(t)}" onclick="${run}">${ICONS.clock}${escapeHtml(t)}</button>`).join('')}</div>` : ''}
      <div class="sr-label">Búsquedas populares</div>
      <div class="sr-chips">${(typeof BUSQUEDAS_POPULARES !== 'undefined' ? BUSQUEDAS_POPULARES : []).map(t => `<button type="button" class="sr-chip" data-q="${escapeHtml(t)}" onclick="${run}">${ICONS.search}${escapeHtml(t)}</button>`).join('')}</div>
      <div class="sr-label">Departamentos</div>
      <div class="sr-depts">${deptsWithProducts().map(d => `<a href="#/d/${d.id}" class="sr-dept tone-${d.tone}">${iconSVG(d.icon)}<span>${escapeHtml(d.name)}</span></a>`).join('')}</div>
      <p class="sr-tip">Tip: puedes buscar por <b>código de barras</b>, marca o tipo de producto (ej. “cargador tipo C”).</p>`;
    openSearchResults(ctx);
    return;
  }
  const matches = VISIBLE_PRODUCTS.map(p => [searchScore(p, tokens), p]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0] || rankScore(b[1]) - rankScore(a[1])).map(x => x[1]);
  const brandHits = BRANDS.filter(b => tokens.length && tokens.every(t => normText(b).includes(t) || normText(b).replace(/\s/g, '').includes(t))).slice(0, 3);
  const taxo = taxoSuggestions(tokens);
  const sugg = taxo.map(s => `<a class="sr-sugg" role="option" href="${s.href}">${ICONS.search}<span><b>${escapeHtml(s.label)}</b> <em>en ${escapeHtml(s.where)}</em></span><small>${s.count}</small></a>`)
    .concat(brandHits.map(b => `<a class="sr-sugg" role="option" href="${brandHash(b)}">${ICONS.tag}<span>Marca <b>${escapeHtml(b)}</b></span><small>${VISIBLE_PRODUCTS.filter(p => p.brand === b).length}</small></a>`));
  const rows = matches.slice(0, 7).map(p => {
    const lvl = stockLevel(p);
    const qty = qtyMap[p.id] || 0;
    return `<div class="sr-item${qty ? ' has-qty' : ''}" data-card="${p.id}">
      <a class="sr-link" role="option" href="#/p/${p.id}">
        <img src="${productImgSrc(p)}" alt="" loading="lazy">
        <span class="sr-text"><span class="sr-brand">${escapeHtml(p.brand)} · ${escapeHtml(p.tipo !== 'Otros' ? p.tipo : catName(p.cat))}</span><span class="sr-name">${highlight(prettyName(p), tokens)}</span><span class="sr-code">Código ${highlight(p.code, tokens)}</span></span>
        <span class="sr-stock is-${lvl.key}"><i></i>${escapeHtml(lvl.label)}</span>
      </a>
      ${lvl.key === 'out' ? '' : `<button type="button" class="sr-add" onclick="event.stopPropagation();changeQty(${p.id},1)" aria-label="Agregar ${escapeHtml(prettyName(p))} al pedido">${ICONS.plus}<b data-qty-badge="${p.id}">${qty || ''}</b></button>`}
    </div>`;
  });
  box.innerHTML = (sugg.length ? `<div class="sr-label">Sugerencias</div><div class="sr-group">${sugg.join('')}</div>` : '') +
    (rows.length ? `<div class="sr-label">Productos</div>${rows.join('')}` : `<div class="sr-empty">Sin coincidencias para “${escapeHtml(q)}”. Prueba con otra palabra, la marca o el código.</div>`) +
    (matches.length ? `<button type="button" class="sr-all" onclick="submitSearch(searchCtxOf('${ctx.id}'))">Ver los ${fmt(matches.length)} resultados para “${escapeHtml(q)}” ${ICONS.arrow}</button>` : '');
  openSearchResults(ctx);
}

function openSearchResults(ctx) {
  ctx = ctx || headerCtx();
  Object.values(SEARCH_CTXS).forEach(c => { if (c !== ctx) closeSearchResults(c); });
  ctx.box.classList.add('open');
  ctx.input.setAttribute('aria-expanded', 'true');
  closeMegaMenu(); closeMoreMenu();
}
function closeSearchResults(ctx) {
  ctx = ctx || headerCtx();
  if (ctx.box) ctx.box.classList.remove('open');
  if (ctx.input) ctx.input.setAttribute('aria-expanded', 'false');
}
function closeAllSearchResults() {
  closeSearchResults(headerCtx());
  Object.values(SEARCH_CTXS).forEach(c => closeSearchResults(c));
}

function runSearch(q, ctxId) {
  const ctx = searchCtxOf(ctxId || 'search');
  ctx.input.value = q;
  syncSearchBox();
  submitSearch(ctx);
}

function submitSearch(ctx) {
  ctx = ctx && ctx.input ? ctx : headerCtx();
  const input = ctx.input;
  const q = input.value.trim();
  closeAllSearchResults();
  document.body.classList.remove('search-open');
  input.blur();
  if (!q) return;
  saveRecent(q);
  // Codigo de barras exacto: directo a la ficha.
  const exact = /^\d{6,}$/.test(q) && PRODUCTS.find(p => p.code === q && !p.hidden);
  if (exact) { navigate('#/p/' + exact.id); return; }
  navigate('#/buscar/' + encodeURIComponent(q));
}

function moveSearchSelection(ctx, delta) {
  const items = Array.from(ctx.box.querySelectorAll('.sr-sugg, .sr-link, .sr-all'));
  if (!items.length) return;
  searchActiveIndex = (searchActiveIndex + delta + items.length) % items.length;
  items.forEach((el, i) => el.classList.toggle('is-active', i === searchActiveIndex));
  items[searchActiveIndex].scrollIntoView({ block: 'nearest' });
}

function syncSearchBox() {
  const box = document.getElementById('searchBox');
  const input = document.getElementById('search');
  if (box && input) box.classList.toggle('has-value', !!input.value);
}

function openSearchOverlay(prefill) {
  document.body.classList.add('search-open');
  const input = document.getElementById('search');
  if (typeof prefill === 'string' && prefill) { input.value = prefill; syncSearchBox(); }
  input.focus();
  renderSearchResults(headerCtx());
}
function closeSearchOverlay() {
  document.body.classList.remove('search-open');
  closeSearchResults(headerCtx());
  document.getElementById('search').blur();
}

const isTouchLayout = () => window.matchMedia('(max-width: 1023px)').matches;

// Conecta un buscador grande (inicio / catalogo). En celular abre el
// buscador de pantalla completa del encabezado.
function bindSearchBox(inputId) {
  const ctx = searchCtxOf(inputId);
  const input = ctx.input;
  if (!input || input.dataset.bound) return;
  input.dataset.bound = '1';
  input.addEventListener('focus', () => {
    if (isTouchLayout()) { const v = input.value; input.blur(); openSearchOverlay(v); return; }
    renderSearchResults(ctx);
  });
  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => renderSearchResults(ctx), 90);
  });
  input.addEventListener('keydown', e => searchKeydown(e, ctx));
  ctx.box.addEventListener('click', e => { if (e.target.closest('a')) closeSearchResults(ctx); });
}

function searchKeydown(e, ctx) {
  if (e.key === 'ArrowDown') { e.preventDefault(); moveSearchSelection(ctx, 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); moveSearchSelection(ctx, -1); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    const active = ctx.box.querySelector('.is-active');
    if (active) active.click(); else submitSearch(ctx);
  } else if (e.key === 'Escape') { if (ctx.id === 'search') closeSearchOverlay(); else { closeSearchResults(ctx); ctx.input.blur(); } }
}

function initSearch() {
  const ctx = headerCtx();
  const input = ctx.input;
  const clear = document.getElementById('searchClear');
  input.addEventListener('input', () => {
    syncSearchBox();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => renderSearchResults(ctx), 90);
  });
  input.addEventListener('focus', () => {
    if (isTouchLayout()) document.body.classList.add('search-open');
    renderSearchResults(ctx);
  });
  input.addEventListener('keydown', e => searchKeydown(e, ctx));
  clear.addEventListener('click', () => {
    input.value = '';
    syncSearchBox();
    input.focus();
    renderSearchResults(ctx);
  });
  ctx.box.addEventListener('click', e => {
    if (e.target.closest('a')) { closeSearchResults(ctx); document.body.classList.remove('search-open'); }
  });
  document.addEventListener('click', e => {
    Object.values(SEARCH_CTXS).forEach(c => {
      const wrap = c.id === 'search' ? document.getElementById('searchBox') : (c.input && c.input.closest('.big-search'));
      if (wrap && !wrap.contains(e.target) && !e.target.closest('#tabSearch') && !e.target.closest('.search-back')) closeSearchResults(c);
    });
    if (!e.target.closest('#megaMenu') && !e.target.closest('#megaBtn') && !e.target.closest('.dn-link')) closeMegaMenu();
    if (!e.target.closest('.dn-more')) closeMoreMenu();
  });
  // Atajo "/" para ir al buscador
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || /input|textarea|select/i.test(document.activeElement.tagName)) return;
    const main = document.getElementById('mainContent');
    if (!main || main.style.display === 'none') return;
    e.preventDefault();
    input.focus();
  });
}

function initFilters() {
  const nav = document.getElementById('navBar');
  if (nav) nav.addEventListener('mouseleave', () => { clearTimeout(megaTimer); });
  const mm = document.getElementById('megaMenu');
  if (mm) mm.addEventListener('mouseleave', e => { if (!e.relatedTarget || !e.relatedTarget.closest('#navBar')) closeMegaMenu(); });
  window.addEventListener('hashchange', router);
}

// Compatibilidad: algunas partes llaman a esto para resaltar un producto.
function renderBarcodes() {}
