// ============================================================
//  CATALOGO: NAVEGACION, INICIO, LISTADOS, FILTROS Y BUSCADOR
// ============================================================
//  El catalogo funciona como una tienda con secciones, cada una con su
//  direccion (se puede volver atras con el boton del navegador y
//  compartir el enlace):
//
//    #/                      Inicio (descubrimiento)
//    #/todo                  Todos los productos
//    #/d/<departamento>      Belleza, Cuidado personal, Tecnologia, Hogar
//    #/c/<categoria>[/<tipo>]  Ej. #/c/audio/parlantes
//    #/marca/<marca>         Todo de una marca
//    #/marcas                Directorio de marcas
//    #/buscar/<texto>        Resultados de busqueda
//    #/col/<coleccion>       nuevos, mas-vendidos, ultimas, volumen, dia-nino
//    #/p/<id>                Ficha del producto (lightbox.js)
//
//  Todo sale de products.js / stock.js y de la estructura de
//  taxonomy.js: no se inventa ningun dato.
// ============================================================

// ---------- Estado ----------
let filteredProducts = [];
let renderedCount = 0;
let currentRoute = { view: 'home' };
let lastListingHash = '#/todo';
const listingState = { key: '', facets: {}, sort: '', q: '' };
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
const VOLUMEN_MIN = typeof STOCK_VOLUMEN !== 'undefined' ? STOCK_VOLUMEN : 1000;

function stockNum(p) { return parseInt(p.stock) || 0; }

function isProductNew(p) {
  if (NUEVOS_SET.has(p.code)) return true;
  if (!MOSTRAR_ETIQUETA_NUEVO) return false;
  if (!p.dateAdded) return false;
  const added = new Date(p.dateAdded + 'T00:00:00');
  if (isNaN(added.getTime())) return false;
  const diffDays = (Date.now() - added.getTime()) / 86400000;
  return diffDays >= 0 && diffDays <= NEW_PRODUCT_DAYS;
}

// Nuevo ingreso (dateAdded o lista manual) O lote de baja rotacion activo.
function isInNuevosIngresosView(p) {
  return isProductNew(p) || (typeof isLowRotationActive === 'function' && isLowRotationActive(p));
}
function isBestSeller(p) { return !!MAS_VENDIDOS_RANK[p.code]; }

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

// Destacados: con stock, con foto, mas vendido, nuevo, y luego mas stock.
function rankScore(p) {
  const s = stockNum(p);
  return (s > 0 ? 4e7 : 0) + (p.img ? 2e7 : 0) + (isBestSeller(p) ? 1e7 - MAS_VENDIDOS_RANK[p.code] : 0) +
    (isProductNew(p) ? 5e6 : 0) + Math.min(s, 4e6);
}

// Marcas
const BRAND_BY_SLUG = {};
BRANDS.forEach(b => { BRAND_BY_SLUG[slugify(b)] = b; });
function brandHash(b) { return '#/marca/' + slugify(b); }

// ---------- Colecciones comerciales ----------
const COLLECTIONS = {
  'nuevos':       { title: 'Nuevos ingresos', eyebrow: 'Recién llegados', sub: 'Lo más reciente que llegó a bodega.', icon: 'spark', filter: isInNuevosIngresosView, sort: 'featured' },
  'mas-vendidos': { title: 'Más vendidos', eyebrow: 'Alta rotación', sub: 'Los productos que más piden nuestros clientes.', icon: 'flame', filter: isBestSeller, sort: 'bestseller' },
  'ultimas':      { title: 'Últimas unidades', eyebrow: 'Quedan pocas', sub: `Productos con ${LOW_STOCK} unidades o menos: asegúralos antes de que se agoten.`, icon: 'clock', filter: p => { const s = stockNum(p); return s > 0 && s <= LOW_STOCK; }, sort: 'stock-asc' },
  'volumen':      { title: 'Stock para volumen', eyebrow: 'Pedidos grandes', sub: `Más de ${VOLUMEN_MIN.toLocaleString('es-CR')} unidades disponibles: listos para surtir en cantidad.`, icon: 'box', filter: p => stockNum(p) >= VOLUMEN_MIN, sort: 'stock' },
  'dia-nino':     { title: 'Día del Niño', eyebrow: 'Temporada', sub: 'Productos seleccionados para la temporada.', icon: 'spark', filter: p => DIA_DEL_NINO_CATEGORIES.includes(p.brand), sort: 'featured' }
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

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean).map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
  const [a, b, c] = parts;
  if (!a) return { view: 'home' };
  if (a === 'todo') return { view: 'listing', kind: 'all' };
  if (a === 'd' && DEPARTMENT_BY_ID[b]) return { view: 'listing', kind: 'dept', dept: b };
  if (a === 'c' && CATEGORY_BY_ID[b]) {
    const type = c ? (typesOfCat(b).find(t => slugify(t.label) === c) || {}).label : '';
    return { view: 'listing', kind: 'cat', cat: b, type: type || '' };
  }
  if (a === 'marca' && BRAND_BY_SLUG[b]) return { view: 'listing', kind: 'brand', brand: BRAND_BY_SLUG[b] };
  if (a === 'marcas') return { view: 'brands' };
  if (a === 'buscar') return { view: 'listing', kind: 'search', q: parts.slice(1).join('/') };
  if (a === 'col' && COLLECTIONS[b]) return { view: 'listing', kind: 'col', col: b };
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
  closeMegaMenu(); closeSearchResults(); closeMobileMenu(); toggleFilterSheet(false);
  document.body.classList.remove('search-open');

  if (r.view !== 'product' && typeof onProductViewLeave === 'function') onProductViewLeave();

  if (r.view === 'home') {
    showView('home');
    window.scrollTo(0, scrollMemory[r.hash] || 0);
  } else if (r.view === 'brands') {
    renderBrandsDirectory();
    showView('brands');
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
      renderListing(true);
    }
    showView('listing');
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
//  ENCABEZADO: departamentos (menu grande) y navegacion movil
// ============================================================
function renderNav() {
  const nav = document.getElementById('deptNav');
  if (nav) {
    const depts = deptsWithProducts().map(d =>
      `<a class="dn-link" href="#/d/${d.id}" data-dept="${d.id}" onmouseenter="openMegaMenu('${d.id}', true)">${escapeHtml(d.name)}</a>`).join('');
    const cols = ['nuevos', 'mas-vendidos', 'ultimas'].filter(collectionActive).map(id =>
      `<a class="dn-link dn-col dn-${id}" href="#/col/${id}">${escapeHtml(COLLECTIONS[id].title)}</a>`).join('');
    const nino = collectionActive('dia-nino') ? `<a class="dn-link dn-col" href="#/col/dia-nino">Día del Niño</a>` : '';
    nav.innerHTML = `
      <button type="button" class="dn-all" id="megaBtn" onclick="toggleMegaMenu()" aria-expanded="false" aria-controls="megaMenu">${ICONS.menu}<span>Departamentos</span></button>
      ${depts}
      <a class="dn-link" href="#/marcas">Marcas</a>
      <span class="dn-sep" aria-hidden="true"></span>
      ${cols}${nino}`;
  }
  renderMegaMenu();
  renderMobileMenu();
}

function megaColumnHTML(d) {
  const cats = catsOfDept(d.id);
  return `
    <div class="mm-col tone-${d.tone}" data-dept="${d.id}">
      <a class="mm-dept" href="#/d/${d.id}">${iconSVG(d.icon)}<span>${escapeHtml(d.name)}</span><small>${TAXO_COUNTS.dept[d.id]}</small></a>
      ${cats.map(c => `
        <div class="mm-cat">
          <a class="mm-cat-link" href="#/c/${c.id}">${escapeHtml(c.name)}</a>
          <ul>${typesOfCat(c.id).filter(t => t.label !== 'Otros').slice(0, 6).map(t =>
            `<li><a href="#/c/${c.id}/${slugify(t.label)}">${escapeHtml(t.label)}</a></li>`).join('')}</ul>
        </div>`).join('')}
    </div>`;
}

function renderMegaMenu() {
  const mm = document.getElementById('megaMenu');
  if (!mm) return;
  const colLinks = ['nuevos', 'mas-vendidos', 'ultimas', 'volumen'].filter(collectionActive).map(id =>
    `<a href="#/col/${id}" class="mm-pill">${iconSVG(COLLECTIONS[id].icon)}${escapeHtml(COLLECTIONS[id].title)}<small>${collectionCount(id)}</small></a>`).join('');
  mm.innerHTML = `
    <div class="mm-inner">
      <div class="mm-cols">${deptsWithProducts().map(megaColumnHTML).join('')}</div>
      <div class="mm-foot">
        <div class="mm-pills">${colLinks}<a href="#/marcas" class="mm-pill">${ICONS.tag}Todas las marcas<small>${BRANDS.length}</small></a></div>
        <a href="#/todo" class="mm-all">Ver todo el catálogo · ${VISIBLE_PRODUCTS.length.toLocaleString('es-CR')} productos ${ICONS.arrow}</a>
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
  const cols = ['nuevos', 'mas-vendidos', 'ultimas', 'volumen', 'dia-nino'].filter(collectionActive).map(id =>
    `<a class="mmb-col" href="#/col/${id}">${iconSVG(COLLECTIONS[id].icon)}<span>${escapeHtml(COLLECTIONS[id].title)}</span><small>${collectionCount(id)}</small></a>`).join('');
  el.innerHTML = `
    <div class="mmb-cols">${cols}</div>
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
    <a class="mmb-row" href="#/marcas">${ICONS.tag}<span>Todas las marcas</span><small>${BRANDS.length}</small></a>
    <a class="mmb-row" href="#/todo">${ICONS.grid}<span>Todo el catálogo</span><small>${VISIBLE_PRODUCTS.length}</small></a>
    <div class="mmb-tools">
      <button type="button" onclick="closeMobileMenu();openOrderHistory()">${ICONS.clock}<span>Historial de pedidos</span></button>
      <button type="button" onclick="closeMobileMenu();openCalculator()">${ICONS.file}<span>Calculadora</span></button>
      <button type="button" onclick="toggleTheme()">${ICONS.spark}<span>Modo claro / oscuro</span></button>
    </div>`;
}
function openMobileMenu() { document.body.classList.add('menu-open'); }
function closeMobileMenu() { document.body.classList.remove('menu-open'); }

function updateNavActive() {
  const r = currentRoute;
  let dept = '';
  if (r.kind === 'dept') dept = r.dept;
  else if (r.kind === 'cat') dept = CATEGORY_BY_ID[r.cat].dept;
  else if (r.view === 'product') { const p = PRODUCTS_BY_ID[r.id]; if (p) dept = p.dept; }
  document.querySelectorAll('#deptNav .dn-link').forEach(a => {
    const h = a.getAttribute('href');
    a.classList.toggle('active', (a.dataset.dept && a.dataset.dept === dept) || h === r.hash || (h === '#/marcas' && (r.view === 'brands' || r.kind === 'brand')));
  });
}

function updateMobileTabs() {
  const r = currentRoute;
  const map = { home: 'tabHome', brands: 'tabBrands' };
  document.querySelectorAll('.tabbar a, .tabbar button').forEach(t => t.classList.remove('active'));
  let id = map[r.view] || (r.kind === 'brand' ? 'tabBrands' : 'tabExplore');
  if (r.view === 'listing' && r.kind === 'search') id = 'tabSearch';
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ============================================================
//  TARJETAS
// ============================================================
function cardBadges(p) {
  const lvl = stockLevel(p);
  const out = [];
  if (isProductNew(p)) out.push('<span class="badge badge-new">Nuevo</span>');
  if (isBestSeller(p)) out.push('<span class="badge badge-best">Más vendido</span>');
  if (lvl.key === 'low') out.push('<span class="badge badge-low">Últimas unidades</span>');
  if (lvl.key === 'out') out.push('<span class="badge badge-out">Agotado</span>');
  return out.slice(0, 2).join('');
}

// Dato clave que se muestra en la tarjeta segun el tipo de producto.
function keySpec(p) {
  const specs = p._specs || (p._specs = productSpecs(p));
  const tone = deptTone(p.dept);
  if (tone === 'tech' || tone === 'home') {
    const pick = ['Conector', 'Potencia', 'Batería', 'Video', 'Conexión', 'Capacidad', 'Largo', 'Empaque'];
    const found = pick.map(l => specs.find(s => s.label === l)).filter(Boolean).slice(0, 2);
    return found.map(s => s.value);
  }
  const pick = ['Tono', 'Tamaño', 'Protección', 'Contenido'];
  return pick.map(l => specs.find(s => s.label === l)).filter(Boolean).slice(0, 2).map(s => (s.label === 'Tono' ? 'Tono ' : '') + s.value);
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

function cardHTML(p) {
  const tone = deptTone(p.dept);
  const name = prettyName(p);
  const safeName = escapeHtml(name);
  const lvl = stockLevel(p);
  const qty = qtyMap[p.id] || 0;
  const specs = keySpec(p);
  const classes = ['pc', `tone-${tone}`];
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
        <div class="pc-foot">
          <span class="pc-stock is-${lvl.key}"><i></i>${escapeHtml(lvl.label)}</span>
          <span class="pc-code" title="Código de barras">${escapeHtml(p.code)}</span>
        </div>
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
      <span class="pc-stock is-${lvl.key}"><i></i>${escapeHtml(lvl.short)}</span>
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
        <span class="rc-stock is-${lvl.key}"><i></i>${escapeHtml(lvl.short)}</span>
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

// Un producto por categoria, alternando, para que los carriles sean variados.
function mixedPick(groups, n) {
  const lists = groups.map(g => g.slice());
  const out = [];
  while (out.length < n && lists.some(l => l.length)) lists.forEach(l => { if (l.length && out.length < n) out.push(l.shift()); });
  return out;
}

function renderHero() {
  const el = document.getElementById('homeHero');
  if (!el) return;
  const cfg = typeof CAMPANA_INICIO !== 'undefined' ? CAMPANA_INICIO : {};
  const nuevos = VISIBLE_PRODUCTS.filter(isInNuevosIngresosView);
  const useNew = cfg.modo !== 'fijo' && nuevos.length > 0;
  let pics = [];
  if (!useNew && cfg.productos && cfg.productos.length) pics = cfg.productos.map(c => PRODUCTS_BY_CODE[c]).filter(Boolean);
  if (useNew) pics = photoPick(nuevos, 4);
  if (pics.length < 4) {
    const extra = mixedPick(deptsWithProducts().map(d => photoPick(VISIBLE_PRODUCTS.filter(p => p.dept === d.id && !pics.includes(p)), 3)), 4 - pics.length);
    pics = pics.concat(extra);
  }
  const eyebrow = useNew ? 'Nuevos ingresos' : (cfg.etiqueta || 'Catálogo mayorista');
  const title = useNew ? 'Descubre lo nuevo en bodega.' : (cfg.titulo || 'Surtido completo para tu negocio.');
  const text = useNew ? `${nuevos.length} ${nuevos.length === 1 ? 'producto recién llegado' : 'productos recién llegados'} de nuestras marcas. Sé el primero en ofrecerlos en tu tienda.` : (cfg.texto || '');
  const cta = useNew ? 'Ver nuevos ingresos' : (cfg.boton || 'Explorar el catálogo');
  const dest = useNew ? '#/col/nuevos' : (cfg.destino || '#/todo');

  const ultimasList = VISIBLE_PRODUCTS.filter(COLLECTIONS.ultimas.filter);
  const volList = VISIBLE_PRODUCTS.filter(COLLECTIONS.volumen.filter);
  const masList = VISIBLE_PRODUCTS.filter(isBestSeller);
  const promos = [];
  if (ultimasList.length) promos.push({ cls: 'promo-low', href: '#/col/ultimas', icon: 'clock', title: 'Últimas unidades', sub: 'Quedan pocas: asegúralas hoy.', n: ultimasList.length,
    items: mixedPick(deptsWithProducts().map(d => topWithPhoto(ultimasList.filter(p => p.dept === d.id && p.img), 5)), 14) });
  if (masList.length) promos.push({ cls: 'promo-alt', href: '#/col/mas-vendidos', icon: 'flame', title: 'Más vendidos', sub: 'Lo que más piden nuestros clientes.', n: masList.length,
    items: masList.filter(p => p.img).sort((x, y) => MAS_VENDIDOS_RANK[x.code] - MAS_VENDIDOS_RANK[y.code]).slice(0, 14) });
  else if (volList.length) promos.push({ cls: 'promo-alt', href: '#/col/volumen', icon: 'box', title: 'Stock para volumen', sub: `Más de ${VOLUMEN_MIN.toLocaleString('es-CR')} unidades de cada uno.`, n: volList.length,
    items: mixedPick(deptsWithProducts().map(d => volList.filter(p => p.dept === d.id && p.img).sort((x, y) => stockNum(y) - stockNum(x)).slice(0, 5)), 14) });

  el.innerHTML = `
    <a class="hero-main" href="${escapeHtml(dest)}">
      <div class="hero-copy">
        <span class="hero-eyebrow">${useNew ? '<i class="dot-live"></i>' : ''}${escapeHtml(eyebrow)}</span>
        <h1 class="hero-title">${escapeHtml(title)}</h1>
        ${text ? `<p class="hero-text">${escapeHtml(text)}</p>` : ''}
        <span class="btn btn-light btn-lg hero-cta">${escapeHtml(cta)} ${ICONS.arrow}</span>
      </div>
      <div class="hero-pics" aria-hidden="true">${pics.slice(0, 4).map((p, i) => `<span class="hero-pic hp-${i}"><img src="${productImgSrc(p)}" alt="" ${i < 2 ? 'fetchpriority="high"' : 'loading="lazy"'}></span>`).join('')}</div>
    </a>
    <div class="hero-side">${promos.map(promoCarouselHTML).join('')}</div>`;
}

// Tarjeta lateral del banner con un carrusel de sus productos (se mueve
// solo, se detiene al pasar el mouse y se puede deslizar con el dedo).
function promoCarouselHTML(pr) {
  const item = p => {
    const lvl = stockLevel(p);
    return `<a class="pm-item" href="#/p/${p.id}" title="${escapeHtml(prettyName(p))}">
      <span class="pm-pic"><img src="${productImgSrc(p)}" alt="" loading="lazy" decoding="async"></span>
      <span class="pm-name">${escapeHtml(prettyName(p))}</span>
      <span class="pm-stock is-${lvl.key}">${escapeHtml(lvl.short)}</span>
    </a>`;
  };
  const list = pr.items.map(item).join('');
  return `
    <div class="hero-promo ${pr.cls}">
      <a class="pm-head" href="${pr.href}">
        <span class="hp-k">${iconSVG(pr.icon)}${pr.n.toLocaleString('es-CR')} productos</span>
        <b>${escapeHtml(pr.title)}</b>
        <span class="hp-d">${escapeHtml(pr.sub)}</span>
      </a>
      <div class="pm-viewport">
        <div class="pm-track" style="--pm-dur:${Math.max(24, pr.items.length * 3.2)}s">${list}<span class="pm-dup" aria-hidden="true">${list}</span></div>
      </div>
      <a class="hp-go" href="${pr.href}">Ver los ${pr.n.toLocaleString('es-CR')} ${ICONS.arrow}</a>
    </div>`;
}

function renderTrustBar() {
  const el = document.getElementById('trustBar');
  if (!el) return;
  const conStock = VISIBLE_PRODUCTS.filter(p => stockNum(p) > 0).length;
  const items = [
    ['box', `${VISIBLE_PRODUCTS.length.toLocaleString('es-CR')} productos`, `${conStock.toLocaleString('es-CR')} con stock hoy`],
    ['tag', `${BRANDS.length} marcas`, 'Belleza, tecnología y hogar'],
    ['file', 'Pedido en Excel', 'Con las fotos de tus productos'],
    ['chat', 'Tu vendedor por WhatsApp', 'Atención directa y personalizada']
  ];
  el.innerHTML = items.map(([i, b, s]) => `<div class="tb-item">${iconSVG(i)}<span><b>${escapeHtml(b)}</b><small>${escapeHtml(s)}</small></span></div>`).join('');
}

function renderDeptCards() {
  const el = document.getElementById('deptCards');
  if (!el) return;
  el.innerHTML = deptsWithProducts().map(d => {
    const pics = mixedPick(catsOfDept(d.id).map(c => photoPick(VISIBLE_PRODUCTS.filter(p => p.cat === c.id), 2)), 3);
    return `
      <div class="dept-card tone-${d.tone}">
        <a class="dc-top" href="#/d/${d.id}">
          <span class="dc-pics" aria-hidden="true">${pics.map(p => `<img src="${productImgSrc(p)}" alt="" loading="lazy" decoding="async">`).join('')}</span>
          <span class="dc-name">${escapeHtml(d.name)}<small>${TAXO_COUNTS.dept[d.id]} productos</small></span>
        </a>
        <ul class="dc-cats">${catsOfDept(d.id).map(c => `<li><a href="#/c/${c.id}">${escapeHtml(c.name)}<small>${TAXO_COUNTS.cat[c.id]}</small></a></li>`).join('')}</ul>
        <a class="dc-all" href="#/d/${d.id}">Ver todo ${escapeHtml(d.name)} ${ICONS.arrow}</a>
      </div>`;
  }).join('');
}

function renderCatCircles() {
  const el = document.getElementById('catCircles');
  if (!el) return;
  const cats = deptsWithProducts().flatMap(d => catsOfDept(d.id));
  el.innerHTML = cats.map(c => {
    const p = photoPick(VISIBLE_PRODUCTS.filter(x => x.cat === c.id), 1)[0];
    return `
      <a class="cc tone-${deptTone(c.dept)}" href="#/c/${c.id}">
        <span class="cc-pic">${p ? `<img src="${productImgSrc(p)}" alt="" loading="lazy" decoding="async">` : iconSVG(c.icon)}</span>
        <span class="cc-name">${escapeHtml(c.name)}</span>
      </a>`;
  }).join('');
}

function renderDeptBlocks() {
  const el = document.getElementById('deptBlocks');
  if (!el) return;
  el.innerHTML = deptsWithProducts().map(d => {
    const cats = catsOfDept(d.id);
    const items = mixedPick(cats.map(c => photoPick(VISIBLE_PRODUCTS.filter(p => p.cat === c.id), 8)), 16);
    const tiles = cats.map(c => {
      const pic = photoPick(VISIBLE_PRODUCTS.filter(p => p.cat === c.id), 1)[0];
      return `<a class="db-tile" href="#/c/${c.id}">
        <span class="db-tile-pic">${pic ? `<img src="${productImgSrc(pic)}" alt="" loading="lazy" decoding="async">` : iconSVG(c.icon)}</span>
        <span class="db-tile-name">${escapeHtml(c.name)}</span>
        <span class="db-tile-types">${typesOfCat(c.id).filter(t => t.label !== 'Otros').slice(0, 3).map(t => escapeHtml(t.label)).join(' · ')}</span>
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
            <div class="sec-actions"><a class="sec-more" href="#/d/${d.id}">Ver los ${TAXO_COUNTS.dept[d.id]} productos ${ICONS.arrow}</a></div>
          </div>
          <div class="db-tiles">${tiles}</div>
          ${railHTML(items, { title: `Destacados en ${d.name}`, cls: 'rail-inblock' })}
        </div>
      </section>`;
  }).join('');
}

function featuredBrands() {
  const stats = {};
  VISIBLE_PRODUCTS.forEach(p => {
    const b = stats[p.brand] || (stats[p.brand] = { name: p.brand, count: 0, depts: {}, items: [] });
    b.count++; b.depts[p.dept] = (b.depts[p.dept] || 0) + 1; b.items.push(p);
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
  return `
    <a class="brand-tile tone-${deptTone(mainDept)}" href="${brandHash(b.name)}">
      <span class="bt-word">${escapeHtml(b.name)}</span>
      <span class="bt-thumbs" aria-hidden="true">${thumbs.map(p => `<img src="${productImgSrc(p)}" alt="" loading="lazy" decoding="async">`).join('')}</span>
      <span class="bt-meta">${b.count} productos · ${Object.keys(b.depts).map(deptName).join(', ')}</span>
    </a>`;
}

function renderHomeBrands() {
  const el = document.getElementById('homeBrands');
  if (!el) return;
  el.innerHTML = featuredBrands().slice(0, 12).map(brandTileHTML).join('');
}

function renderHomeRails() {
  const top = document.getElementById('homeRailsTop');
  const mid = document.getElementById('homeRailsMid');
  const nuevos = VISIBLE_PRODUCTS.filter(isInNuevosIngresosView).sort((a, b) => rankScore(b) - rankScore(a));
  const mas = VISIBLE_PRODUCTS.filter(isBestSeller).sort((a, b) => MAS_VENDIDOS_RANK[a.code] - MAS_VENDIDOS_RANK[b.code]);
  const ultimas = VISIBLE_PRODUCTS.filter(COLLECTIONS.ultimas.filter);
  // Ultimas unidades: variado por departamento, primero lo que tiene foto.
  const ultMix = mixedPick(deptsWithProducts().map(d => topWithPhoto(ultimas.filter(p => p.dept === d.id && p.img), 6)), 18);
  const vol = mixedPick(deptsWithProducts().map(d => VISIBLE_PRODUCTS.filter(p => p.dept === d.id && p.img && stockNum(p) >= VOLUMEN_MIN).sort((a, b) => stockNum(b) - stockNum(a)).slice(0, 6)), 16);
  if (top) top.innerHTML =
    railHTML(nuevos.slice(0, 18), { title: 'Nuevos ingresos', eyebrow: 'Recién llegados', icon: 'spark', sub: 'Lo más reciente que entró a bodega.', more: '#/col/nuevos', moreLabel: `Ver los ${nuevos.length}`, cls: 'rail-new' }) +
    railHTML(mas.slice(0, 18), { title: 'Más vendidos', eyebrow: 'Alta rotación', icon: 'flame', sub: 'Lo que más piden nuestros clientes.', more: '#/col/mas-vendidos', cls: 'rail-best' }) +
    railHTML(ultMix, { title: 'Últimas unidades', eyebrow: 'Quedan pocas', icon: 'clock', sub: 'Productos con pocas existencias: asegúralos antes de que se agoten.', more: '#/col/ultimas', moreLabel: `Ver los ${ultimas.length}`, cls: 'rail-low' });
  if (mid) mid.innerHTML = railHTML(vol, { title: 'Stock para volumen', eyebrow: 'Pedidos grandes', icon: 'box', sub: `Más de ${VOLUMEN_MIN.toLocaleString('es-CR')} unidades disponibles de cada uno.`, more: '#/col/volumen', cls: 'rail-vol' });
}

function renderHome() {
  renderHero();
  renderTrustBar();
  renderDeptCards();
  renderCatCircles();
  renderHomeRails();
  renderDeptBlocks();
  renderHomeBrands();
}
// Compatibilidad
function renderHeroNuevos() {}
function renderBrandFilter() {}
function renderCategoriaFilter() { renderNav(); }

// ============================================================
//  DIRECTORIO DE MARCAS
// ============================================================
let brandsDeptFilter = '';
function renderBrandsDirectory() {
  const el = document.getElementById('brandsView');
  if (!el) return;
  const all = featuredBrands();
  const list = (brandsDeptFilter ? all.filter(b => b.depts[brandsDeptFilter]) : all).slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
  el.innerHTML = `
    <div class="page-head">
      ${homeBackHTML()}
      <nav class="crumbs" aria-label="Ruta"><a href="#/">Inicio</a>${ICONS.chevR}<span>Marcas</span></nav>
      <h1 class="page-title">Nuestras marcas</h1>
      <p class="page-sub">${all.length} marcas con todo su surtido disponible. Entra a una marca para ver todos sus productos.</p>
      <div class="chips-row">
        <button type="button" class="fchip${!brandsDeptFilter ? ' on' : ''}" onclick="brandsDeptFilter='';renderBrandsDirectory()">Todas</button>
        ${deptsWithProducts().map(d => `<button type="button" class="fchip${brandsDeptFilter === d.id ? ' on' : ''}" onclick="brandsDeptFilter='${d.id}';renderBrandsDirectory()">${escapeHtml(d.name)}</button>`).join('')}
      </div>
    </div>
    <div class="brand-dir">${list.map(brandTileHTML).join('')}</div>
    <div class="home-back-end">${homeBackHTML('is-outline')}</div>`;
}

// ============================================================
//  LISTADOS: alcance, filtros contextuales y orden
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

function availValues(p) {
  const s = stockNum(p);
  const out = [];
  if (s > 0) out.push('Con stock');
  if (s > 0 && s <= LOW_STOCK) out.push('Últimas unidades');
  if (s >= VOLUMEN_MIN) out.push('Stock para volumen');
  if (isProductNew(p)) out.push('Nuevos ingresos');
  if (p.img) out.push('Con foto');
  return out;
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

// Filtros. "tones": en que tipo de seccion aparecen (beauty/care/tech/home;
// vacio = siempre). Solo se muestran si hay al menos 2 opciones.
const FACETS = [
  { id: 'dept',   label: 'Departamento', get: p => p.dept, name: deptName, when: r => ['all', 'search', 'col', 'brand'].includes(r.kind) },
  { id: 'cat',    label: 'Categoría',    get: p => p.cat, name: catName, when: r => r.kind !== 'cat' },
  { id: 'tipo',   label: 'Tipo de producto', get: p => p.tipo, when: r => r.kind === 'cat' && !r.type || ['dept', 'brand'].includes(r.kind) && false },
  { id: 'brand',  label: 'Marca',        get: p => p.brand, when: r => r.kind !== 'brand' },
  { id: 'tone',   label: 'Subtono',      get: toneFamily, tones: ['beauty'] },
  { id: 'benefit', label: 'Beneficio',   get: productBenefits, tones: ['beauty', 'care'] },
  { id: 'size',   label: 'Presentación', get: sizeBucket, tones: ['beauty', 'care'], order: SIZE_ORDER },
  { id: 'conector', label: 'Conector',   get: p => specValue(p, 'Conector'), tones: ['tech'] },
  { id: 'compat', label: 'Compatibilidad', get: productCompat, tones: ['tech'] },
  { id: 'conn',   label: 'Conexión',     get: connValue, tones: ['tech'] },
  { id: 'power',  label: 'Potencia',     get: powerBucket, tones: ['tech'], order: ['Hasta 12 W', '13–25 W', '26–65 W', 'Más de 65 W'] },
  { id: 'avail',  label: 'Disponibilidad', get: availValues, order: ['Con stock', 'Últimas unidades', 'Stock para volumen', 'Nuevos ingresos', 'Con foto'] }
];

function valuesOf(f, p) {
  const v = f.get(p);
  if (Array.isArray(v)) return v.filter(Boolean);
  return v ? [v] : [];
}

function scopeTones(list) {
  const t = new Set(list.map(p => deptTone(p.dept)));
  return t;
}

function matchesFacets(p, except) {
  for (const f of FACETS) {
    if (f.id === except) continue;
    const sel = listingState.facets[f.id];
    if (!sel || !sel.size) continue;
    const vals = valuesOf(f, p);
    if (f.id === 'avail') { if (![...sel].every(s => vals.includes(s))) return false; }
    else if (!vals.some(v => sel.has(v))) return false;
  }
  return true;
}

function sortList(list, sort) {
  const by = {
    relevance: (a, b) => (b._score || 0) - (a._score || 0) || rankScore(b) - rankScore(a),
    featured: (a, b) => rankScore(b) - rankScore(a),
    bestseller: (a, b) => (MAS_VENDIDOS_RANK[a.code] || 1e9) - (MAS_VENDIDOS_RANK[b.code] || 1e9),
    stock: (a, b) => stockNum(b) - stockNum(a),
    'stock-asc': (a, b) => (stockNum(a) <= 0) - (stockNum(b) <= 0) || stockNum(a) - stockNum(b),
    az: (a, b) => prettyName(a).localeCompare(prettyName(b), 'es', { numeric: true }),
    brand: (a, b) => a.brand.localeCompare(b.brand, 'es') || catIndex(a) - catIndex(b) ||
      typeIndex(a) - typeIndex(b) || prettyName(a).localeCompare(prettyName(b), 'es', { numeric: true })
  };
  return list.slice().sort(by[sort] || by.featured);
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
  ['brand', 'Por marca', () => true],
  ['featured', 'Destacados', () => true],
  ['bestseller', 'Más vendidos', r => r.kind === 'col' && r.col === 'mas-vendidos'],
  ['stock', 'Más disponibles', () => true],
  ['stock-asc', 'Menos disponibles', r => r.kind === 'col' && r.col === 'ultimas'],
  ['az', 'Nombre (A–Z)', () => true]
];

function listingMeta(r) {
  const crumbs = [['#/', 'Inicio']];
  let title = 'Todo el catálogo', sub = 'Explora por departamento, marca o tipo de producto y arma tu pedido.', eyebrow = '', tone = '';
  if (r.kind === 'dept') {
    const d = DEPARTMENT_BY_ID[r.dept];
    crumbs.push(['', d.name]); title = d.name; sub = d.blurb; tone = d.tone; eyebrow = 'Departamento';
  } else if (r.kind === 'cat') {
    const c = CATEGORY_BY_ID[r.cat], d = DEPARTMENT_BY_ID[c.dept];
    crumbs.push(['#/d/' + d.id, d.name]);
    if (r.type) { crumbs.push(['#/c/' + c.id, c.name]); crumbs.push(['', r.type]); title = r.type; sub = `${c.name} · ${d.name}`; }
    else { crumbs.push(['', c.name]); title = c.name; sub = `${typesOfCat(c.id).filter(t => t.label !== 'Otros').map(t => t.label).join(', ')}.`; }
    tone = d.tone;
  } else if (r.kind === 'brand') {
    crumbs.push(['#/marcas', 'Marcas']); crumbs.push(['', r.brand]); title = r.brand; eyebrow = 'Marca';
    const ds = [...new Set(VISIBLE_PRODUCTS.filter(p => p.brand === r.brand).map(p => deptName(p.dept)))];
    sub = `Todo el surtido de ${r.brand} en ${ds.join(', ').toLowerCase()}.`;
  } else if (r.kind === 'col') {
    const c = COLLECTIONS[r.col];
    crumbs.push(['', c.title]); title = c.title; sub = c.sub; eyebrow = c.eyebrow;
  } else if (r.kind === 'search') {
    crumbs.push(['', 'Búsqueda']); title = `“${r.q}”`; sub = 'Resultados por nombre, marca, código, categoría y palabras relacionadas.'; eyebrow = 'Resultados de búsqueda';
  } else {
    crumbs.push(['', 'Todo el catálogo']);
  }
  return { crumbs, title, sub, eyebrow, tone };
}

// Accesos rapidos arriba del listado: categorias del departamento o
// tipos de la categoria (con foto).
function quickNavHTML(r) {
  let items = [];
  if (r.kind === 'dept') {
    items = catsOfDept(r.dept).map(c => ({ href: '#/c/' + c.id, label: c.name, count: TAXO_COUNTS.cat[c.id], pic: photoPick(VISIBLE_PRODUCTS.filter(p => p.cat === c.id), 1)[0], icon: c.icon }));
  } else if (r.kind === 'cat') {
    items = typesOfCat(r.cat).map(t => ({ href: '#/c/' + r.cat + (r.type === t.label ? '' : '/' + slugify(t.label)), label: t.label, count: t.count, on: r.type === t.label,
      pic: photoPick(VISIBLE_PRODUCTS.filter(p => p.cat === r.cat && p.tipo === t.label), 1)[0], icon: CATEGORY_BY_ID[r.cat].icon }));
  } else if (r.kind === 'all') {
    items = deptsWithProducts().map(d => ({ href: '#/d/' + d.id, label: d.name, count: TAXO_COUNTS.dept[d.id], pic: photoPick(VISIBLE_PRODUCTS.filter(p => p.dept === d.id), 1)[0], icon: d.icon }));
  }
  if (items.length < 2) return '';
  return `<div class="quicknav">${items.map(i => `
    <a class="qn${i.on ? ' on' : ''}" href="${i.href}">
      <span class="qn-pic">${i.pic ? `<img src="${productImgSrc(i.pic)}" alt="" loading="lazy" decoding="async">` : iconSVG(i.icon)}</span>
      <span class="qn-label">${escapeHtml(i.label)}<small>${i.count}</small></span>
    </a>`).join('')}</div>`;
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
  return FACETS.map(f => {
    if (f.when && !f.when(r)) return '';
    if (f.tones && !f.tones.some(t => tones.has(t))) return '';
    if (f.tones && tones.size > 1 && !['dept', 'brand', 'avail'].includes(f.id) && ![...tones].every(t => f.tones.includes(t)) && r.kind !== 'search') return '';
    const base = scope.filter(p => matchesFacets(p, f.id));
    const counts = {};
    base.forEach(p => valuesOf(f, p).forEach(v => { counts[v] = (counts[v] || 0) + 1; }));
    let vals = Object.keys(counts);
    const sel = listingState.facets[f.id] || new Set();
    sel.forEach(v => { if (!(v in counts)) { counts[v] = 0; vals.push(v); } });
    if (vals.length < 2 && !sel.size && f.id !== 'avail') return '';
    if (!vals.length) return '';
    if (f.order) vals.sort((a, b) => f.order.indexOf(a) - f.order.indexOf(b));
    else vals.sort((a, b) => counts[b] - counts[a] || String(a).localeCompare(String(b), 'es'));
    const many = vals.length > 7;
    return `
      <details class="facet" open>
        <summary>${escapeHtml(f.label)}${sel.size ? `<b>${sel.size}</b>` : ''}${ICONS.chevD}</summary>
        <div class="facet-opts${many ? ' is-long' : ''}">
          ${vals.map((v, i) => `
            <label class="fopt${i >= 7 ? ' extra' : ''}">
              <input type="checkbox" ${sel.has(v) ? 'checked' : ''} onchange="toggleFacet('${f.id}', this.dataset.v)" data-v="${escapeHtml(v)}">
              <span class="fbox"></span><span class="ftxt">${escapeHtml(f.name ? f.name(v) : v)}</span><small>${counts[v]}</small>
            </label>`).join('')}
          ${many ? `<button type="button" class="facet-more" onclick="this.closest('.facet-opts').classList.toggle('show-all')"><span class="fm-more">Ver ${vals.length - 7} más</span><span class="fm-less">Ver menos</span></button>` : ''}
        </div>
      </details>`;
  }).join('');
}

function toggleFacet(id, v) {
  const s = listingState.facets[id] || (listingState.facets[id] = new Set());
  if (s.has(v)) s.delete(v); else s.add(v);
  if (!s.size) delete listingState.facets[id];
  renderListing(false);
}
function clearFacet(id, v) {
  const s = listingState.facets[id];
  if (s) { s.delete(v); if (!s.size) delete listingState.facets[id]; }
  renderListing(false);
}
function clearFacets() { listingState.facets = {}; renderListing(false); }

function activeChipsHTML() {
  const chips = [];
  FACETS.forEach(f => (listingState.facets[f.id] || new Set()).forEach(v => chips.push(
    `<button type="button" class="achip" data-v="${escapeHtml(v)}" onclick="clearFacet('${f.id}', this.dataset.v)">${escapeHtml(f.name ? f.name(v) : v)}${ICONS.close}</button>`)));
  if (!chips.length) return '';
  return chips.join('') + `<button type="button" class="link-btn" onclick="clearFacets()">Limpiar filtros</button>`;
}

function setSort(v) { listingState.sort = v; renderListing(false); }
function setViewMode(m) {
  viewMode = m;
  try { localStorage.setItem('impohogar_tec_view', m); } catch (e) {}
  renderListing(false, true);
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
  const nFacets = Object.values(listingState.facets).reduce((s, x) => s + x.size, 0);
  const scopeN = currentScope().length;

  sec.className = 'listing' + (meta.tone ? ' tone-' + meta.tone : '');
  if (full) {
    sec.innerHTML = `
      <div class="page-head">
        ${homeBackHTML()}
        <nav class="crumbs" aria-label="Ruta">${meta.crumbs.map(([h, l], i) => h ? `<a href="${h}">${escapeHtml(l)}</a>${ICONS.chevR}` : `<span aria-current="page">${escapeHtml(l)}</span>`).join('')}</nav>
        ${meta.eyebrow ? `<span class="page-eyebrow">${escapeHtml(meta.eyebrow)}</span>` : ''}
        <h1 class="page-title">${escapeHtml(meta.title)}</h1>
        <p class="page-sub">${escapeHtml(meta.sub)}</p>
        ${quickNavHTML(r)}
      </div>
      <div class="plp">
        <aside class="facets" id="facetPanel" aria-label="Filtros">
          <div class="facets-head"><b>Filtrar</b><button type="button" class="icon-btn" onclick="toggleFilterSheet(false)" aria-label="Cerrar filtros">${ICONS.close}</button></div>
          <div class="facets-sort"><label for="sortSelM">Ordenar por</label><select id="sortSelM" onchange="setSort(this.value)"></select></div>
          <div id="facetGroups"></div>
          <div class="facets-apply"><button type="button" class="btn btn-outline" onclick="clearFacets()">Limpiar</button><button type="button" class="btn btn-primary" id="facetApply" onclick="toggleFilterSheet(false)">Ver resultados</button></div>
        </aside>
        <div class="sheet-backdrop" onclick="toggleFilterSheet(false)"></div>
        <div class="plp-main">
          <div class="plp-bar">
            <div class="plp-count" id="count" aria-live="polite"></div>
            <button type="button" class="plp-filter-btn" onclick="toggleFilterSheet(true)">${ICONS.filter}Filtrar y ordenar<b id="filtersCount"></b></button>
            <label class="plp-sort"><span>Ordenar</span><select id="sortSel" onchange="setSort(this.value)"></select></label>
            <div class="view-toggle" role="group" aria-label="Vista">
              <button type="button" id="vmGrid" onclick="setViewMode('grid')" aria-label="Ver en cuadrícula" title="Cuadrícula">${ICONS.grid}</button>
              <button type="button" id="vmList" onclick="setViewMode('list')" aria-label="Ver en lista (pedido rápido)" title="Lista (pedido rápido)">${ICONS.list}</button>
            </div>
          </div>
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
  }
  const opts = sorts.map(([v, l]) => `<option value="${v}"${v === listingState.sort ? ' selected' : ''}>${l}</option>`).join('');
  ['sortSel', 'sortSelM'].forEach(id => { const s = document.getElementById(id); if (s) s.innerHTML = opts; });
  document.getElementById('facetGroups').innerHTML = facetGroupsHTML();
  document.getElementById('activeFilters').innerHTML = activeChipsHTML();
  document.getElementById('filtersCount').textContent = nFacets || '';
  document.getElementById('facetApply').textContent = `Ver ${total.toLocaleString('es-CR')} ${total === 1 ? 'resultado' : 'resultados'}`;
  document.getElementById('vmGrid').classList.toggle('on', viewMode === 'grid');
  document.getElementById('vmList').classList.toggle('on', viewMode === 'list');
  document.getElementById('grid').className = 'grid' + (viewMode === 'list' ? ' is-list' : '');
  document.getElementById('count').innerHTML = `<b>${total.toLocaleString('es-CR')}</b> ${total === 1 ? 'producto' : 'productos'}${nFacets ? ` <span>de ${scopeN.toLocaleString('es-CR')}</span>` : ''}`;
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
      html += `<div class="grid-brand"><a href="${brandHash(p.brand)}">${escapeHtml(p.brand)}</a><span>${n.toLocaleString('es-CR')} ${n === 1 ? 'producto' : 'productos'}</span></div>`;
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

function renderPage(reset) {
  const grid = document.getElementById('grid');
  if (!grid) return;
  if (reset) {
    grid.innerHTML = '';
    renderedCount = 0;
    lastBrand = ''; lastGroup = '';
    if (!filteredProducts.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${ICONS.search}</div>
          <div class="empty-state-title">Sin resultados</div>
          <div class="empty-state-text">${currentRoute.kind === 'search' ? 'No encontramos productos con esa búsqueda. Prueba con otra palabra, la marca o el código de barras.' : 'Ningún producto cumple todos los filtros elegidos.'}</div>
          ${Object.keys(listingState.facets).length ? `<button type="button" class="btn btn-outline" onclick="clearFacets()">Quitar filtros</button>` : `<a class="btn btn-outline" href="#/todo">Ver todo el catálogo</a>`}
        </div>`;
    }
  }
  const next = filteredProducts.slice(renderedCount, renderedCount + PAGE_SIZE);
  const fn = viewMode === 'list' ? rowHTML : cardHTML;
  grid.insertAdjacentHTML('beforeend', next.map(p => groupHeadersHTML(p) + fn(p)).join(''));
  renderedCount += next.length;
  const total = filteredProducts.length;
  const btn = document.getElementById('loadMoreBtn');
  if (btn) {
    btn.style.display = renderedCount < total ? '' : 'none';
    btn.textContent = `Cargar más (${(total - renderedCount).toLocaleString('es-CR')} restantes)`;
  }
  const meta = document.getElementById('loadMoreMeta');
  if (meta) meta.innerHTML = total > PAGE_SIZE ? `Mostrando ${renderedCount.toLocaleString('es-CR')} de ${total.toLocaleString('es-CR')}<span class="lm-bar"><i style="width:${Math.round(renderedCount / total * 100)}%"></i></span>` : '';
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
//  BUSCADOR
// ============================================================
let searchTimer = null;
let searchActiveIndex = -1;
const RECENT_KEY = 'impohogar_tec_recent';

function recentSearches() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { return []; } }
function saveRecent(q) {
  q = q.trim(); if (!q) return;
  const list = [q].concat(recentSearches().filter(x => normText(x) !== normText(q))).slice(0, 6);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) {}
}
function clearRecent() { try { localStorage.removeItem(RECENT_KEY); } catch (e) {} renderSearchResults(); }

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

function renderSearchResults() {
  const box = document.getElementById('searchResults');
  const input = document.getElementById('search');
  if (!box || !input) return;
  const q = input.value.trim();
  const tokens = queryTokensOf(q);
  searchActiveIndex = -1;
  if (!q) {
    const rec = recentSearches();
    box.innerHTML = `
      ${rec.length ? `<div class="sr-label">Búsquedas recientes <button type="button" class="sr-clear" onclick="clearRecent()">Borrar</button></div>
        <div class="sr-chips">${rec.map(t => `<button type="button" class="sr-chip" data-q="${escapeHtml(t)}" onclick="runSearch(this.dataset.q)">${ICONS.clock}${escapeHtml(t)}</button>`).join('')}</div>` : ''}
      <div class="sr-label">Búsquedas populares</div>
      <div class="sr-chips">${(typeof BUSQUEDAS_POPULARES !== 'undefined' ? BUSQUEDAS_POPULARES : []).map(t => `<button type="button" class="sr-chip" data-q="${escapeHtml(t)}" onclick="runSearch(this.dataset.q)">${ICONS.search}${escapeHtml(t)}</button>`).join('')}</div>
      <div class="sr-label">Departamentos</div>
      <div class="sr-depts">${deptsWithProducts().map(d => `<a href="#/d/${d.id}" class="sr-dept tone-${d.tone}">${iconSVG(d.icon)}<span>${escapeHtml(d.name)}</span></a>`).join('')}</div>
      <p class="sr-tip">Tip: puedes buscar por <b>código de barras</b>, marca o tipo de producto (ej. “cargador tipo C”).</p>`;
    openSearchResults();
    return;
  }
  const matches = VISIBLE_PRODUCTS.map(p => [searchScore(p, tokens), p]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0] || rankScore(b[1]) - rankScore(a[1])).map(x => x[1]);
  const brandHits = BRANDS.filter(b => tokens.length && tokens.every(t => normText(b).includes(t) || normText(b).replace(/\s/g, '').includes(t))).slice(0, 3);
  const taxo = taxoSuggestions(tokens);
  const sugg = taxo.map(s => `<a class="sr-sugg" role="option" href="${s.href}">${ICONS.search}<span><b>${escapeHtml(s.label)}</b> <em>en ${escapeHtml(s.where)}</em></span><small>${s.count}</small></a>`)
    .concat(brandHits.map(b => `<a class="sr-sugg" role="option" href="${brandHash(b)}">${ICONS.tag}<span>Marca <b>${escapeHtml(b)}</b></span><small>${VISIBLE_PRODUCTS.filter(p => p.brand === b).length}</small></a>`));
  const rows = matches.slice(0, 6).map(p => {
    const lvl = stockLevel(p);
    return `<a class="sr-item" role="option" href="#/p/${p.id}">
      <img src="${productImgSrc(p)}" alt="" loading="lazy">
      <span class="sr-text"><span class="sr-brand">${escapeHtml(p.brand)} · ${escapeHtml(p.tipo !== 'Otros' ? p.tipo : catName(p.cat))}</span><span class="sr-name">${highlight(prettyName(p), tokens)}</span><span class="sr-code">${highlight(p.code, tokens)}</span></span>
      <span class="sr-stock is-${lvl.key}">${escapeHtml(lvl.short)}</span>
    </a>`;
  });
  box.innerHTML = (sugg.length ? `<div class="sr-label">Sugerencias</div><div class="sr-group">${sugg.join('')}</div>` : '') +
    (rows.length ? `<div class="sr-label">Productos</div>${rows.join('')}` : `<div class="sr-empty">Sin coincidencias para “${escapeHtml(q)}”. Prueba con otra palabra, la marca o el código.</div>`) +
    (matches.length ? `<button type="button" class="sr-all" onclick="submitSearch()">Ver los ${matches.length.toLocaleString('es-CR')} resultados para “${escapeHtml(q)}” ${ICONS.arrow}</button>` : '');
  openSearchResults();
}

function openSearchResults() {
  const box = document.getElementById('searchResults');
  box.classList.add('open');
  document.getElementById('search').setAttribute('aria-expanded', 'true');
  closeMegaMenu();
}
function closeSearchResults() {
  const box = document.getElementById('searchResults');
  if (box) box.classList.remove('open');
  const input = document.getElementById('search');
  if (input) input.setAttribute('aria-expanded', 'false');
}

function runSearch(q) {
  const input = document.getElementById('search');
  input.value = q;
  syncSearchBox();
  submitSearch();
}

function submitSearch() {
  const input = document.getElementById('search');
  const q = input.value.trim();
  closeSearchResults();
  document.body.classList.remove('search-open');
  input.blur();
  if (!q) return;
  saveRecent(q);
  // Codigo de barras exacto: directo a la ficha.
  const exact = /^\d{6,}$/.test(q) && PRODUCTS.find(p => p.code === q && !p.hidden);
  if (exact) { navigate('#/p/' + exact.id); return; }
  navigate('#/buscar/' + encodeURIComponent(q));
}

function moveSearchSelection(delta) {
  const items = Array.from(document.querySelectorAll('#searchResults .sr-sugg, #searchResults .sr-item, #searchResults .sr-all'));
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

function openSearchOverlay() {
  document.body.classList.add('search-open');
  const input = document.getElementById('search');
  input.focus();
  renderSearchResults();
}
function closeSearchOverlay() {
  document.body.classList.remove('search-open');
  closeSearchResults();
  document.getElementById('search').blur();
}

function initSearch() {
  const input = document.getElementById('search');
  const box = document.getElementById('searchBox');
  const clear = document.getElementById('searchClear');
  input.addEventListener('input', () => {
    syncSearchBox();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderSearchResults, 90);
  });
  input.addEventListener('focus', () => {
    if (window.matchMedia('(max-width: 1023px)').matches) document.body.classList.add('search-open');
    renderSearchResults();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSearchSelection(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSearchSelection(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const active = document.querySelector('#searchResults .is-active');
      if (active) active.click(); else submitSearch();
    } else if (e.key === 'Escape') { closeSearchOverlay(); }
  });
  clear.addEventListener('click', () => {
    input.value = '';
    syncSearchBox();
    input.focus();
    renderSearchResults();
  });
  document.getElementById('searchResults').addEventListener('click', e => {
    if (e.target.closest('a')) { closeSearchResults(); document.body.classList.remove('search-open'); }
  });
  document.addEventListener('click', e => {
    if (!box.contains(e.target) && !e.target.closest('#tabSearch') && !e.target.closest('.search-back')) {
      closeSearchResults();
    }
    if (!e.target.closest('#megaMenu') && !e.target.closest('#megaBtn') && !e.target.closest('.dn-link')) closeMegaMenu();
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
