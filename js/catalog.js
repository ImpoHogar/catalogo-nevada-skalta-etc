// ============================================================
//  CATALOGO: INICIO, NAVEGACION, FILTROS Y TARJETAS
// ============================================================
//  - Inicio: bloque de categorias (bento), marcas y carriles por mundo
//    (belleza / tecnologia / cuidado personal). Se esconde mientras hay
//    una busqueda o un filtro activo, para ver los resultados arriba.
//  - Navegacion de categorias en el encabezado.
//  - Filtros reales: categoria, tipo de producto (sale del nombre),
//    marca, solo con stock, solo con foto y orden.
//  - Busqueda instantanea con resultados debajo del buscador.
//  - Tarjetas distintas segun el mundo del producto.
//  Todo usa los datos de products.js / stock.js: no se inventa nada.
// ============================================================

let diaNinoMode = false;
let nuevosIngresosMode = false;
let filteredProducts = VISIBLE_PRODUCTS;
let renderedCount = 0;

let selectedCategoria = new Set();   // seleccion unica (se usa como Set por compatibilidad)
let selectedSubtipo = '';
const filterState = { stock: false, foto: false, sort: 'brand' };

function isProductNew(p) {
  if (!MOSTRAR_ETIQUETA_NUEVO) return false;
  if (!p.dateAdded) return false;
  const added = new Date(p.dateAdded + 'T00:00:00');
  if (isNaN(added.getTime())) return false;
  const diffDays = (Date.now() - added.getTime()) / 86400000;
  return diffDays >= 0 && diffDays <= NEW_PRODUCT_DAYS;
}

// Nuevo ingreso normal (dateAdded) O lote de baja rotacion activo.
function isInNuevosIngresosView(p) {
  return isProductNew(p) || (typeof isLowRotationActive === 'function' && isLowRotationActive(p));
}

// Foto del producto: img/productos/<archivo> o el marcador.
function productImgSrc(p) {
  return p.img ? `img/productos/${encodeURIComponent(p.img)}?v=${IMG_VERSION}` : placeholderImg(p.brand, p.categoria);
}

function getCategoria(p) {
  return p.categoria || null;
}

function normalizeText(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Texto de busqueda de cada producto (nombre original y legible, marca,
// codigo, categoria y tipo), calculado una sola vez.
function searchHaystack(p) {
  if (!p._hay) {
    p._hay = normalizeText([p.name, prettyName(p), p.brand, p.code, p.categoria, catMeta(p.categoria).short, p.subtipo].join(' '));
  }
  return p._hay;
}

function matchesQuery(p, tokens) {
  if (!tokens.length) return true;
  const hay = searchHaystack(p);
  return tokens.every(t => hay.includes(t));
}

function queryTokens() {
  const el = document.getElementById('search');
  return normalizeText(el ? el.value : '').split(/\s+/).filter(Boolean);
}

function categoriesWithCounts() {
  const counts = {};
  VISIBLE_PRODUCTS.forEach(p => { counts[p.categoria] = (counts[p.categoria] || 0) + 1; });
  return CATEGORIAS.filter(c => counts[c]).map(c => ({ name: c, count: counts[c] }));
}

function topWithPhoto(list, n) {
  return list.slice().sort((a, b) => featuredScore(b) - featuredScore(a)).slice(0, n);
}

// ============================================================
//  NUEVOS INGRESOS (spotlight del inicio)
// ============================================================
const HERO_INTERVAL_MS = 5000;
let heroNuevosIndex = 0;
let heroNuevosTimer = null;
let heroNuevosTotal = 0;

function pad2(n) { return String(n).padStart(2, '0'); }

function renderHeroNuevos() {
  const hero = document.getElementById('heroNuevos');
  if (!hero) return;
  const nuevos = VISIBLE_PRODUCTS.filter(isInNuevosIngresosView).sort((a, b) => featuredScore(b) - featuredScore(a)).slice(0, 10);
  stopHeroNuevosTimer();
  if (!nuevos.length) { hero.style.display = 'none'; return; }

  hero.style.display = 'grid';
  hero.style.setProperty('--hero-interval', HERO_INTERVAL_MS + 'ms');
  heroNuevosTotal = nuevos.length;

  document.getElementById('heroNuevosTrack').innerHTML = nuevos.map((p, i) => `
    <div class="hero-nuevos-slide${i === 0 ? ' active' : ''}" data-i="${i}" aria-hidden="${i !== 0}">
      <div class="hero-nuevos-brand">${escapeHtml(p.brand)} · ${escapeHtml(catMeta(p.categoria).short)}</div>
      <div class="hero-nuevos-name">${escapeHtml(prettyName(p))}</div>
      <div class="hero-nuevos-notes">${escapeHtml(stockLevel(p).label)}</div>
    </div>`).join('');

  document.getElementById('heroNuevosMedia').innerHTML = nuevos.map((p, i) => `
    <button type="button" class="hero-media-slide${i === 0 ? ' active' : ''}" data-i="${i}" tabindex="${i === 0 ? 0 : -1}"
            onclick="openLightbox(${p.id}, 0)" aria-label="Ver ficha de ${escapeHtml(prettyName(p))}">
      <img src="${productImgSrc(p)}" alt="${escapeHtml(prettyName(p))}" ${i < 2 ? '' : 'loading="lazy"'}>
    </button>`).join('');

  document.getElementById('heroNuevosDots').innerHTML = nuevos.length > 1 ? nuevos.map((p, i) =>
    `<button type="button" class="hero-nuevos-dot" data-i="${i}" onclick="goToHeroNuevos(${i})" aria-label="Ver producto ${i + 1} de ${nuevos.length}"></button>`
  ).join('') : '';

  const progress = hero.querySelector('.hero-progress');
  if (progress) progress.style.display = nuevos.length > 1 ? '' : 'none';

  if (!hero.dataset.bound) {
    hero.addEventListener('mouseenter', pauseHeroNuevos);
    hero.addEventListener('mouseleave', resumeHeroNuevos);
    hero.dataset.bound = '1';
  }
  setHeroNuevosSlide(0);
  startHeroNuevosTimer();
}

function setHeroNuevosSlide(i) {
  heroNuevosIndex = i;
  document.querySelectorAll('#heroNuevosTrack .hero-nuevos-slide').forEach((s, k) => {
    s.classList.toggle('active', k === i);
    s.setAttribute('aria-hidden', k !== i);
  });
  document.querySelectorAll('#heroNuevosMedia .hero-media-slide').forEach((s, k) => {
    s.classList.toggle('active', k === i);
    s.tabIndex = k === i ? 0 : -1;
  });
  const dots = document.querySelectorAll('#heroNuevosDots .hero-nuevos-dot');
  dots.forEach((d, k) => { d.classList.remove('active'); d.classList.toggle('done', k < i); });
  if (dots[i]) { void dots[i].offsetWidth; dots[i].classList.add('active'); }
  const counter = document.getElementById('heroNuevosCounter');
  if (counter) counter.innerHTML = `<b>${pad2(i + 1)}</b> / ${pad2(heroNuevosTotal)}`;
}
function advanceHeroNuevos(total) { if (total) setHeroNuevosSlide((heroNuevosIndex + 1) % total); }
function goToHeroNuevos(i) { setHeroNuevosSlide(i); startHeroNuevosTimer(); }
function startHeroNuevosTimer() {
  stopHeroNuevosTimer();
  if (heroNuevosTotal > 1) heroNuevosTimer = setInterval(() => advanceHeroNuevos(heroNuevosTotal), HERO_INTERVAL_MS);
}
function stopHeroNuevosTimer() { if (heroNuevosTimer) { clearInterval(heroNuevosTimer); heroNuevosTimer = null; } }
function pauseHeroNuevos() {
  stopHeroNuevosTimer();
  const hero = document.getElementById('heroNuevos');
  if (hero) hero.classList.add('is-paused');
}
function resumeHeroNuevos() {
  const hero = document.getElementById('heroNuevos');
  if (hero) hero.classList.remove('is-paused');
  goToHeroNuevos(heroNuevosIndex);
}

// ============================================================
//  INICIO: estadisticas, bento de categorias, marcas y carriles
// ============================================================
function renderHomeStats() {
  const el = document.getElementById('homeStats');
  if (!el) return;
  const conStock = VISIBLE_PRODUCTS.filter(p => (parseInt(p.stock) || 0) > 0).length;
  const stats = [
    [VISIBLE_PRODUCTS.length.toLocaleString('es-CR'), 'productos'],
    [BRANDS.length, 'marcas'],
    [conStock.toLocaleString('es-CR'), 'con stock hoy']
  ];
  el.innerHTML = stats.map(([n, l]) => `<div><dt>${n}</dt><dd>${l}</dd></div>`).join('');
}

function renderBento() {
  const el = document.getElementById('bento');
  if (!el) return;
  const cats = categoriesWithCounts();
  el.innerHTML = cats.map((c, i) => {
    const meta = catMeta(c.name);
    const inCat = VISIBLE_PRODUCTS.filter(p => p.categoria === c.name);
    const fotos = topWithPhoto(inCat.filter(p => p.img), 3);
    const pics = fotos.map((p, k) => `<img class="bento-pic bento-pic-${k}" src="${productImgSrc(p)}" alt="" loading="lazy" decoding="async">`).join('');
    const slug = catSlug(c.name);
    return `
      <button type="button" class="bento-tile cat-${slug} bento-${slug} tone-${meta.group}${fotos.length ? '' : ' is-iconic'}" onclick="selectCategoria('${c.name}')" style="--i:${i}">
        <span class="bento-head">
          <span class="bento-icon">${iconSVG(meta.icon)}</span>
          <span class="bento-count">${c.count}</span>
        </span>
        <span class="bento-copy">
          <span class="bento-name">${escapeHtml(meta.short)}</span>
          <span class="bento-blurb">${escapeHtml(meta.blurb)}</span>
          <span class="bento-go">Explorar ${ICONS.arrow}</span>
        </span>
        <span class="bento-pics" aria-hidden="true">${pics || `<span class="bento-glyph">${iconSVG(meta.icon)}</span>`}</span>
      </button>`;
  }).join('');
}

let showAllBrands = false;
function brandStats() {
  const map = {};
  VISIBLE_PRODUCTS.forEach(p => {
    const b = map[p.brand] || (map[p.brand] = { name: p.brand, count: 0, cats: {}, items: [] });
    b.count++;
    b.cats[p.categoria] = (b.cats[p.categoria] || 0) + 1;
    b.items.push(p);
  });
  return Object.values(map).sort((a, b) => b.count - a.count);
}

function renderBrands() {
  const grid = document.getElementById('brandGrid');
  if (!grid) return;
  const all = brandStats();
  const list = showAllBrands ? all : all.slice(0, 8);
  grid.innerHTML = list.map((b, i) => {
    const mainCat = Object.keys(b.cats).sort((x, y) => b.cats[y] - b.cats[x])[0];
    const thumbs = topWithPhoto(b.items.filter(p => p.img), 3);
    const slug = catSlug(mainCat);
    return `
      <button type="button" class="brand-card cat-${slug}" data-brand="${escapeHtml(b.name)}" onclick="selectBrand(this.dataset.brand)" style="--i:${i}">
        <span class="brand-card-top">
          <span class="brand-card-name">${escapeHtml(b.name)}</span>
          <span class="brand-card-meta">${b.count} productos · ${escapeHtml(catMeta(mainCat).short)}</span>
        </span>
        <span class="brand-card-thumbs${thumbs.length ? '' : ' is-empty'}">
          ${thumbs.length ? thumbs.map(p => `<img src="${productImgSrc(p)}" alt="" loading="lazy" decoding="async">`).join('') : `<span class="brand-card-glyph">${iconSVG(catMeta(mainCat).icon)}</span>`}
        </span>
        <span class="brand-card-go">Ver marca ${ICONS.arrow}</span>
      </button>`;
  }).join('');
  const more = document.getElementById('brandsMore');
  if (more) {
    more.style.display = all.length > 8 ? '' : 'none';
    more.textContent = showAllBrands ? 'Ver menos' : `Ver las ${all.length} marcas`;
  }
}

function toggleAllBrands() {
  showAllBrands = !showAllBrands;
  const sec = document.getElementById('brandSection');
  if (sec) sec.classList.toggle('show-all', showAllBrands);
  renderBrands();
}

// Carriles del inicio: uno por "mundo".
const HOME_RAILS = [
  { group: 'beauty', title: 'Belleza', sub: 'Maquillaje y skincare: K-beauty, bases, labios y rutinas completas.' },
  { group: 'tech',   title: 'Tecnología y hogar', sub: 'Audio, carga, cables, accesorios y pequeños electrodomésticos.' },
  { group: 'care',   title: 'Cuidado personal', sub: 'Cuerpo, cabello y barbería para el día a día.' }
];

function railCardHTML(p) {
  const lvl = stockLevel(p);
  const meta = catMeta(p.categoria);
  return `
    <button type="button" class="rail-card cat-${catSlug(p.categoria)}" onclick="openLightbox(${p.id}, 0)" aria-label="Ver ${escapeHtml(prettyName(p))}">
      <span class="rail-media"><img src="${productImgSrc(p)}" alt="" loading="lazy" decoding="async"></span>
      <span class="rail-body">
        <span class="rail-brand">${escapeHtml(p.brand)}</span>
        <span class="rail-name">${escapeHtml(prettyName(p))}</span>
        <span class="rail-foot"><span class="stock-dot is-${lvl.key}"></span>${escapeHtml(lvl.short)}<span class="rail-type">${escapeHtml(p.subtipo || meta.short)}</span></span>
      </span>
    </button>`;
}

function renderHomeRails() {
  const wrap = document.getElementById('homeRails');
  if (!wrap) return;
  wrap.innerHTML = HOME_RAILS.map(r => {
    const cats = categoriesWithCounts().filter(c => catMeta(c.name).group === r.group);
    if (!cats.length) return '';
    // Mezcla las categorias del mundo para que el carril no sea de una sola.
    // Solo productos con foto: el carril aparece cuando el mundo tiene al
    // menos 4 (hoy cuidado personal todavia no tiene fotos cargadas).
    const perCat = cats.map(c => topWithPhoto(VISIBLE_PRODUCTS.filter(p => p.categoria === c.name && p.img && (parseInt(p.stock) || 0) > 0), 10));
    const items = [];
    for (let k = 0; k < 10; k++) perCat.forEach(list => { if (list[k]) items.push(list[k]); });
    if (items.length < 4) return '';
    const chips = cats.map(c => `<button type="button" class="chip chip-soft cat-${catSlug(c.name)}" onclick="selectCategoria('${c.name}')">${iconSVG(catMeta(c.name).icon)}${escapeHtml(catMeta(c.name).short)} <b>${c.count}</b></button>`).join('');
    return `
      <section class="rail rail-${r.group}" aria-label="${escapeHtml(r.title)}">
        <div class="rail-inner">
          <div class="section-head">
            <div>
              <h2 class="section-title">${escapeHtml(r.title)}</h2>
              <p class="section-sub">${escapeHtml(r.sub)}</p>
            </div>
            <div class="rail-chips">${chips}</div>
          </div>
          <div class="rail-track-wrap">
            <button type="button" class="rail-arrow prev" onclick="scrollRail(this,-1)" aria-label="Anteriores"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
            <div class="rail-track">${items.slice(0, 16).map(railCardHTML).join('')}</div>
            <button type="button" class="rail-arrow next" onclick="scrollRail(this,1)" aria-label="Siguientes"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
          </div>
        </div>
      </section>`;
  }).join('');
}

function scrollRail(btn, dir) {
  const track = btn.parentElement.querySelector('.rail-track');
  if (track) track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: 'smooth' });
}

function renderHome() {
  renderHomeStats();
  renderBento();
  renderBrands();
  renderHomeRails();
}

// ============================================================
//  NAVEGACION DE CATEGORIAS (encabezado)
// ============================================================
function renderBrandFilter() {
  const sel = document.getElementById('brandFilter');
  BRANDS.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b;
    opt.textContent = b;
    sel.appendChild(opt);
  });
}

function renderCategoriaFilter() {
  const nav = document.getElementById('catNav');
  if (!nav) return;
  const active = [...selectedCategoria][0] || '';
  const hayNuevos = VISIBLE_PRODUCTS.some(isInNuevosIngresosView);
  const items = [`<button type="button" class="cat-link${!active && !nuevosIngresosMode ? ' active' : ''}" onclick="goHome()">${ICONS.grid}<span>Inicio</span></button>`]
    .concat(categoriesWithCounts().map(c => {
      const meta = catMeta(c.name);
      const on = active === c.name;
      return `<button type="button" class="cat-link cat-${catSlug(c.name)}${on ? ' active' : ''}" onclick="toggleCategoria('${c.name}')" aria-pressed="${on}">${iconSVG(meta.icon)}<span>${escapeHtml(meta.short)}</span><small>${c.count}</small></button>`;
    }));
  if (hayNuevos) {
    items.push(`<button type="button" class="cat-link cat-new${nuevosIngresosMode ? ' active' : ''}" onclick="showNuevosIngresos()">${ICONS.spark}<span>Novedades</span></button>`);
  }
  nav.innerHTML = items.join('');
  const on = nav.querySelector('.cat-link.active');
  if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function renderSubtypeChips() {
  const wrap = document.getElementById('subtypeChips');
  if (!wrap) return;
  const cat = [...selectedCategoria][0];
  if (!cat) { wrap.innerHTML = ''; wrap.classList.remove('has-items'); return; }
  const subs = subtypesOf(cat);
  if (subs.length < 2) { wrap.innerHTML = ''; wrap.classList.remove('has-items'); return; }
  wrap.classList.add('has-items');
  const total = subs.reduce((s, x) => s + x.count, 0);
  wrap.innerHTML = [`<button type="button" class="sub-chip${!selectedSubtipo ? ' active' : ''}" onclick="selectSubtipo('')">Todo <small>${total}</small></button>`]
    .concat(subs.map(s => `<button type="button" class="sub-chip${selectedSubtipo === s.label ? ' active' : ''}" onclick="selectSubtipo('${s.label}')">${escapeHtml(s.label)} <small>${s.count}</small></button>`))
    .join('');
}

function toggleCategoria(opt) {
  if (selectedCategoria.has(opt)) {
    selectedCategoria.delete(opt);
  } else {
    selectedCategoria.clear();
    selectedCategoria.add(opt);
  }
  selectedSubtipo = '';
  diaNinoMode = false;
  document.getElementById('diaNinoBanner').style.display = 'none';
  nuevosIngresosMode = false;
  document.getElementById('nuevosIngresosBanner').style.display = 'none';
  renderCategoriaFilter();
  applyFilters();
}

function selectCategoria(opt) {
  selectedCategoria.clear();
  toggleCategoria(opt);
}

function selectSubtipo(s) {
  selectedSubtipo = s;
  applyFilters({ keepScroll: true });
}

function selectBrand(b) {
  const sel = document.getElementById('brandFilter');
  sel.value = b;
  selectedCategoria.clear();
  selectedSubtipo = '';
  nuevosIngresosMode = false; diaNinoMode = false;
  renderCategoriaFilter();
  applyFilters();
}

function clearCategoria() {
  selectedCategoria.clear();
  selectedSubtipo = '';
  renderCategoriaFilter();
  applyFilters();
}

function clearAllFilters() {
  document.getElementById('search').value = '';
  document.getElementById('brandFilter').value = '';
  document.getElementById('fStock').checked = false;
  document.getElementById('fFoto').checked = false;
  document.getElementById('sortSel').value = 'brand';
  filterState.stock = false; filterState.foto = false; filterState.sort = 'brand';
  selectedCategoria.clear();
  selectedSubtipo = '';
  diaNinoMode = false; nuevosIngresosMode = false;
  document.getElementById('diaNinoBanner').style.display = 'none';
  document.getElementById('nuevosIngresosBanner').style.display = 'none';
  closeSearchResults();
  renderCategoriaFilter();
  applyFilters();
}

function goHome() {
  clearAllFilters();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleFilterSheet(open) {
  document.body.classList.toggle('sheet-open', !!open);
}

// ============================================================
//  TARJETA DE PRODUCTO
// ============================================================
//  Una sola estructura con tres "acentos" segun el mundo:
//    beauty: editorial, tono y tamano como etiquetas suaves
//    tech:   ficha tecnica (modelo, conector, potencia...)
//    care:   limpia y fresca, tamano y tipo
// ============================================================
function specsHTML(p, group, max) {
  const specs = productSpecs(p);
  const model = modelCode(p);
  if (group === 'tech') {
    const rows = (model ? [{ label: 'Modelo', value: model }] : []).concat(specs).slice(0, max);
    if (!rows.length) return '';
    return `<dl class="card-spec-table">${rows.map(s => `<div><dt>${escapeHtml(s.label)}</dt><dd>${escapeHtml(s.value)}</dd></div>`).join('')}</dl>`;
  }
  if (!specs.length) return '';
  return `<ul class="card-tags">${specs.slice(0, max).map(s => `<li><span>${escapeHtml(s.label)}</span>${escapeHtml(s.value)}</li>`).join('')}</ul>`;
}

function cardHTML(p) {
  const meta = catMeta(p.categoria);
  const group = meta.group;
  const name = prettyName(p);
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(p.code);
  const safeBrand = escapeHtml(p.brand);
  const lvl = stockLevel(p);
  const agotado = lvl.key === 'out';
  const esNuevo = isProductNew(p);
  const qty = qtyMap[p.id] || 0;
  const badges = [
    esNuevo ? '<span class="badge badge-new">Nuevo</span>' : '',
    lvl.key === 'low' ? '<span class="badge badge-low">Últimas unidades</span>' : '',
    agotado ? '<span class="badge badge-out">Agotado</span>' : ''
  ].join('');
  const classes = ['card', `card--${group}`, `cat-${catSlug(p.categoria)}`];
  if (qty > 0) classes.push('has-qty');
  if (agotado) classes.push('agotado');
  if (!p.img) classes.push('no-photo');
  if (esNuevo) classes.push('new-arrival');

  const action = agotado
    ? `<div class="card-soldout">Sin stock por ahora</div>`
    : `<button type="button" class="add-btn" onclick="changeQty(${p.id},1)" aria-label="Agregar ${safeName} al pedido">${ICONS.plus}<span>Agregar</span></button>
       <div class="stepper" role="group" aria-label="Cantidad de ${safeName}">
         <button type="button" onclick="changeQty(${p.id},-1)" aria-label="Quitar una unidad">−</button>
         <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" value="${qty}" id="qty-${p.id}" onchange="setQty(${p.id}, this.value)" onfocus="this.select()" aria-label="Cantidad a pedir de ${safeName}">
         <button type="button" onclick="changeQty(${p.id},1)" aria-label="Agregar una unidad">+</button>
       </div>`;

  return `
    <article class="${classes.join(' ')}" id="card-${p.id}" data-name="${escapeHtml(p.name).toLowerCase()}" data-code="${safeCode}" data-brand="${safeBrand}">
      <div class="card-media" onclick="openLightbox(${p.id}, 0)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openLightbox(${p.id}, 0);}" role="button" tabindex="0" aria-label="Ver ficha de ${safeName}">
        <div class="card-badges">${badges}</div>
        <img src="${productImgSrc(p)}" alt="${safeName}" loading="lazy" decoding="async">
        <span class="card-quick" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M11 8.5v5M8.5 11h5"/></svg></span>
      </div>
      <div class="card-body">
        <div class="card-kicker"><span class="card-brand">${safeBrand}</span><span class="card-type">${escapeHtml(p.subtipo && p.subtipo !== 'Otros' ? p.subtipo : meta.short)}</span></div>
        <h3 class="card-name" title="${escapeHtml(p.name)}">${safeName}</h3>
        ${specsHTML(p, group, group === 'tech' ? 3 : 2)}
        <div class="card-meta">
          <span class="card-stock is-${lvl.key}"><i></i>${escapeHtml(lvl.label)}</span>
          <span class="card-code" title="Código de barras">${safeCode}</span>
        </div>
        ${dupePanelHTML(p.id)}
        <div class="card-action">${action}</div>
      </div>
    </article>`;
}

// Se mantiene por compatibilidad: el codigo de barras ahora vive en la ficha.
function renderBarcodes() {}

// ============================================================
//  FILTRADO Y ORDEN
// ============================================================
function isFiltering() {
  return !!(queryTokens().length || document.getElementById('brandFilter').value || selectedCategoria.size ||
    selectedSubtipo || filterState.stock || filterState.foto || diaNinoMode || nuevosIngresosMode);
}

function computeFiltered() {
  const tokens = queryTokens();
  const brand = document.getElementById('brandFilter').value;
  const cat = [...selectedCategoria][0];
  let list = VISIBLE_PRODUCTS.filter(p => {
    if (!matchesQuery(p, tokens)) return false;
    if (diaNinoMode) return DIA_DEL_NINO_CATEGORIES.includes(p.brand);
    if (nuevosIngresosMode) return isInNuevosIngresosView(p);
    if (brand && p.brand !== brand) return false;
    if (cat && p.categoria !== cat) return false;
    if (selectedSubtipo && p.subtipo !== selectedSubtipo) return false;
    if (filterState.stock && (parseInt(p.stock) || 0) <= 0) return false;
    if (filterState.foto && !p.img) return false;
    return true;
  });
  if (filterState.sort === 'stock') {
    list = list.slice().sort((a, b) => (parseInt(b.stock) || 0) - (parseInt(a.stock) || 0));
  } else if (filterState.sort === 'az') {
    list = list.slice().sort((a, b) => prettyName(a).localeCompare(prettyName(b), 'es'));
  } else if (filterState.sort === 'featured') {
    list = list.slice().sort((a, b) => featuredScore(b) - featuredScore(a));
  } else {
    // Por marca: cada marca junta, y dentro de ella cada tipo de producto
    // junto (ej. TirTir: cushions, labiales, sérums...), no intercalados.
    list = list.slice().sort((a, b) =>
      a.brand.localeCompare(b.brand, 'es') ||
      catOrder(a) - catOrder(b) ||
      (groupLabel(a) === catMeta(a.categoria).short) - (groupLabel(b) === catMeta(b.categoria).short) ||
      groupLabel(a).localeCompare(groupLabel(b), 'es') ||
      prettyName(a).localeCompare(prettyName(b), 'es', { numeric: true }));
  }
  groupCounts = {};
  if (filterState.sort === 'brand') list.forEach(p => {
    groupCounts[p.brand] = (groupCounts[p.brand] || 0) + 1;
    const k = p.brand + '|' + p.categoria + '|' + groupLabel(p);
    groupCounts[k] = (groupCounts[k] || 0) + 1;
  });
  return list;
}

// Agrupacion del listado "Por marca".
let groupCounts = {};
let lastBrand = '', lastGroup = '';
function catOrder(p) {
  const i = CATEGORIAS.indexOf(p.categoria);
  return i < 0 ? 99 : i;
}
function groupLabel(p) {
  return p.subtipo && p.subtipo !== 'Otros' ? p.subtipo : catMeta(p.categoria).short;
}
function groupHeadersHTML(p) {
  if (filterState.sort !== 'brand') return '';
  let html = '';
  const oneBrand = !!document.getElementById('brandFilter').value;
  if (p.brand !== lastBrand) {
    lastBrand = p.brand; lastGroup = '';
    if (!oneBrand) {
      const n = groupCounts[p.brand] || 0;
      html += `<div class="grid-brand"><h3>${escapeHtml(p.brand)}</h3><span>${n.toLocaleString('es-CR')} ${n === 1 ? 'producto' : 'productos'}</span></div>`;
    }
  }
  const k = p.brand + '|' + p.categoria + '|' + groupLabel(p);
  if (k !== lastGroup) {
    lastGroup = k;
    html += `<div class="grid-group cat-${catSlug(p.categoria)}"><i></i>${escapeHtml(groupLabel(p))}<span>${groupCounts[k] || 0}</span></div>`;
  }
  return html;
}

function updateCatalogHead() {
  const cat = [...selectedCategoria][0];
  const brand = document.getElementById('brandFilter').value;
  const q = document.getElementById('search').value.trim();
  let title = 'Todos los productos';
  let sub = 'Agrega cantidades y genera tu pedido en Excel.';
  if (nuevosIngresosMode) { title = 'Nuevos ingresos'; sub = 'Lo más reciente que llegó a bodega.'; }
  else if (diaNinoMode) { title = 'Día del Niño'; sub = ''; }
  else if (q) { title = `Resultados para “${q}”`; sub = cat ? `En ${catMeta(cat).short}` : 'En todo el catálogo'; }
  else if (cat) { title = catMeta(cat).short; sub = catMeta(cat).blurb; }
  else if (brand) { title = brand; sub = 'Todo el surtido de la marca.'; }
  document.getElementById('catalogTitle').textContent = title;
  document.getElementById('catalogSub').textContent = sub;
  const section = document.getElementById('catalogo');
  section.className = 'catalog' + (cat ? ` cat-${catSlug(cat)} is-${catMeta(cat).group}` : '');
}

function renderActiveFilters() {
  const wrap = document.getElementById('activeFilters');
  if (!wrap) return;
  const chips = [];
  const q = document.getElementById('search').value.trim();
  const brand = document.getElementById('brandFilter').value;
  const cat = [...selectedCategoria][0];
  if (q) chips.push(['Búsqueda: ' + q, "document.getElementById('search').value='';applyFilters()"]);
  if (cat) chips.push([catMeta(cat).short, 'clearCategoria()']);
  if (selectedSubtipo) chips.push([selectedSubtipo, "selectSubtipo('')"]);
  if (brand) chips.push(['Marca: ' + brand, "document.getElementById('brandFilter').value='';applyFilters()"]);
  if (filterState.stock) chips.push(['Solo con stock', "document.getElementById('fStock').checked=false;filterState.stock=false;applyFilters()"]);
  if (filterState.foto) chips.push(['Solo con foto', "document.getElementById('fFoto').checked=false;filterState.foto=false;applyFilters()"]);
  wrap.innerHTML = chips.length
    ? chips.map(([l, fn]) => `<button type="button" class="active-chip" onclick="${fn}">${escapeHtml(l)}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg></button>`).join('') +
      `<button type="button" class="link-btn" onclick="clearAllFilters()">Limpiar todo</button>`
    : '';
  const n = [brand, filterState.stock, filterState.foto, filterState.sort !== 'brand'].filter(Boolean).length;
  const fc = document.getElementById('filtersCount');
  if (fc) fc.textContent = n ? n : '';
}

// Aparicion suave de las tarjetas al entrar en pantalla.
let revealObserver = null;
function observeRevealCards(elementos) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06 });
  }
  elementos.forEach((el, i) => {
    if (!el.classList.contains('card')) return;
    el.classList.add('reveal');
    el.style.setProperty('--d', (i % 8) * 35 + 'ms');
    revealObserver.observe(el);
  });
}

function scrollToCatalog() {
  const ancla = document.querySelector('.catalog-head');
  const header = document.getElementById('siteHeader');
  if (!ancla) return;
  const offset = (header ? header.offsetHeight : 0) + 8;
  window.scrollTo({ top: Math.max(0, ancla.getBoundingClientRect().top + window.scrollY - offset), behavior: 'auto' });
}

function renderPage(reset, scroll) {
  const grid = document.getElementById('grid');
  if (reset) {
    grid.innerHTML = '';
    renderedCount = 0;
    lastBrand = ''; lastGroup = '';
    if (scroll) scrollToCatalog();
    if (filteredProducts.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${ICONS.search}</div>
          <div class="empty-state-title">Sin resultados</div>
          <div class="empty-state-text">No encontramos productos con esa búsqueda o filtro. Prueba con otro nombre, código o marca.</div>
          <button type="button" class="btn btn-outline" onclick="clearAllFilters()">Limpiar filtros</button>
        </div>`;
    }
  }
  const nextBatch = filteredProducts.slice(renderedCount, renderedCount + PAGE_SIZE);
  const antes = grid.children.length;
  grid.insertAdjacentHTML('beforeend', nextBatch.map(p => groupHeadersHTML(p) + cardHTML(p)).join(''));
  observeRevealCards(Array.from(grid.children).slice(antes));
  renderedCount += nextBatch.length;

  const total = filteredProducts.length;
  document.getElementById('count').textContent = total.toLocaleString('es-CR') + (total === 1 ? ' producto' : ' productos');

  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.style.display = renderedCount < total ? '' : 'none';
    loadMoreBtn.textContent = `Cargar más (${total - renderedCount} restantes)`;
  }
  const meta = document.getElementById('loadMoreMeta');
  if (meta) {
    meta.innerHTML = total > PAGE_SIZE
      ? `Mostrando ${renderedCount} de ${total}<span class="lm-bar"><i style="width:${Math.round(renderedCount / total * 100)}%"></i></span>`
      : '';
  }

  // Busqueda puntual: si el producto tiene relacionados, el panel se abre solo.
  if (document.getElementById('search').value.trim() && typeof getRelatedProducts === 'function') {
    nextBatch.forEach(p => {
      if (!getRelatedProducts(p.id).length) return;
      const panel = document.getElementById('dupe-panel-' + p.id);
      if (panel) panel.classList.add('open');
    });
  }
}

function applyFilters(opts) {
  opts = opts || {};
  const before = document.body.classList.contains('is-filtering');
  const now = isFiltering();
  document.body.classList.toggle('is-filtering', now);
  filteredProducts = computeFiltered();
  updateCatalogHead();
  renderSubtypeChips();
  renderActiveFilters();
  // Al pasar del inicio a resultados (o al reves) se sube arriba; con
  // un cambio de filtro normal se va al comienzo del listado.
  let scroll = false;
  if (before !== now) window.scrollTo({ top: 0 });
  else if (!opts.keepScroll && !opts.typing) scroll = true;
  renderPage(true, scroll);
}

function showDiaDelNino() {
  document.getElementById('search').value = '';
  document.getElementById('brandFilter').value = '';
  selectedCategoria.clear(); selectedSubtipo = '';
  nuevosIngresosMode = false;
  document.getElementById('nuevosIngresosBanner').style.display = 'none';
  diaNinoMode = true;
  renderCategoriaFilter();
  applyFilters();
  document.getElementById('diaNinoBanner').style.display = 'flex';
}

function exitDiaDelNino() {
  diaNinoMode = false;
  applyFilters();
  document.getElementById('diaNinoBanner').style.display = 'none';
}

function showNuevosIngresos() {
  document.getElementById('search').value = '';
  document.getElementById('brandFilter').value = '';
  selectedCategoria.clear(); selectedSubtipo = '';
  diaNinoMode = false;
  document.getElementById('diaNinoBanner').style.display = 'none';
  nuevosIngresosMode = true;
  renderCategoriaFilter();
  applyFilters();
  document.getElementById('nuevosIngresosBanner').style.display = 'flex';
}

function exitNuevosIngresos() {
  nuevosIngresosMode = false;
  renderCategoriaFilter();
  applyFilters();
  document.getElementById('nuevosIngresosBanner').style.display = 'none';
}

// ============================================================
//  BUSQUEDA INSTANTANEA
// ============================================================
let searchTimer = null;
let searchActiveIndex = -1;

function highlight(text, tokens) {
  let out = escapeHtml(text);
  tokens.filter(t => t.length > 1).forEach(t => {
    const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    out = out.replace(re, '<mark>$1</mark>');
  });
  return out;
}

function renderSearchResults() {
  const box = document.getElementById('searchResults');
  const input = document.getElementById('search');
  const tokens = queryTokens();
  searchActiveIndex = -1;
  if (!tokens.length) { closeSearchResults(); return; }
  const matches = VISIBLE_PRODUCTS.filter(p => matchesQuery(p, tokens)).sort((a, b) => featuredScore(b) - featuredScore(a));
  const brandHits = BRANDS.filter(b => tokens.every(t => normalizeText(b).includes(t))).slice(0, 3);
  const catHits = categoriesWithCounts().filter(c => tokens.every(t => normalizeText(c.name + ' ' + catMeta(c.name).short).includes(t))).slice(0, 2);

  const sugg = catHits.map(c => `<button type="button" class="sr-sugg" role="option" onclick="closeSearchResults();document.getElementById('search').value='';selectCategoria('${c.name}')">${iconSVG(catMeta(c.name).icon)}<span>Categoría <b>${escapeHtml(catMeta(c.name).short)}</b></span><small>${c.count}</small></button>`)
    .concat(brandHits.map(b => `<button type="button" class="sr-sugg" role="option" data-brand="${escapeHtml(b)}" onclick="closeSearchResults();document.getElementById('search').value='';selectBrand(this.dataset.brand)">${ICONS.grid}<span>Marca <b>${escapeHtml(b)}</b></span><small>${VISIBLE_PRODUCTS.filter(p => p.brand === b).length}</small></button>`));

  const rows = matches.slice(0, 6).map(p => {
    const lvl = stockLevel(p);
    return `<button type="button" class="sr-item" role="option" onclick="closeSearchResults();openLightbox(${p.id},0)">
      <img src="${productImgSrc(p)}" alt="" loading="lazy">
      <span class="sr-text"><span class="sr-brand">${escapeHtml(p.brand)} · ${escapeHtml(catMeta(p.categoria).short)}</span><span class="sr-name">${highlight(prettyName(p), tokens)}</span><span class="sr-code">${highlight(p.code, tokens)}</span></span>
      <span class="sr-stock is-${lvl.key}">${escapeHtml(lvl.short)}</span>
    </button>`;
  });

  box.innerHTML = (sugg.length ? `<div class="sr-group">${sugg.join('')}</div>` : '') +
    (rows.length ? `<div class="sr-label">Productos</div>${rows.join('')}` : `<div class="sr-empty">Sin coincidencias para “${escapeHtml(input.value.trim())}”</div>`) +
    (matches.length ? `<button type="button" class="sr-all" onclick="submitSearch()">Ver los ${matches.length} resultados ${ICONS.arrow}</button>` : '');
  box.classList.add('open');
  input.setAttribute('aria-expanded', 'true');
}

function closeSearchResults() {
  const box = document.getElementById('searchResults');
  if (box) box.classList.remove('open');
  const input = document.getElementById('search');
  if (input) input.setAttribute('aria-expanded', 'false');
}

function submitSearch() {
  closeSearchResults();
  document.getElementById('search').blur();
  scrollToCatalog();
}

function moveSearchSelection(delta) {
  const items = Array.from(document.querySelectorAll('#searchResults .sr-sugg, #searchResults .sr-item, #searchResults .sr-all'));
  if (!items.length) return;
  searchActiveIndex = (searchActiveIndex + delta + items.length) % items.length;
  items.forEach((el, i) => el.classList.toggle('is-active', i === searchActiveIndex));
  items[searchActiveIndex].scrollIntoView({ block: 'nearest' });
}

function initSearch() {
  const input = document.getElementById('search');
  const box = document.getElementById('searchBox');
  const clear = document.getElementById('searchClear');
  input.addEventListener('input', () => {
    box.classList.toggle('has-value', !!input.value);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      renderSearchResults();
      applyFilters({ typing: true });
    }, 110);
  });
  input.addEventListener('focus', () => { if (input.value.trim()) renderSearchResults(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSearchSelection(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSearchSelection(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const active = document.querySelector('#searchResults .is-active');
      if (active) active.click(); else submitSearch();
    } else if (e.key === 'Escape') { closeSearchResults(); input.blur(); }
  });
  clear.addEventListener('click', () => {
    input.value = '';
    box.classList.remove('has-value');
    closeSearchResults();
    applyFilters();
    input.focus();
  });
  document.addEventListener('click', e => { if (!box.contains(e.target)) closeSearchResults(); });
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
  document.getElementById('brandFilter').addEventListener('change', () => {
    diaNinoMode = false;
    document.getElementById('diaNinoBanner').style.display = 'none';
    applyFilters();
  });
  document.getElementById('sortSel').addEventListener('change', e => { filterState.sort = e.target.value; applyFilters({ keepScroll: true }); });
  document.getElementById('fStock').addEventListener('change', e => { filterState.stock = e.target.checked; applyFilters({ keepScroll: true }); });
  document.getElementById('fFoto').addEventListener('change', e => { filterState.foto = e.target.checked; applyFilters({ keepScroll: true }); });
}
