// ============================================================
//  PLATAFORMA MULTIMERCADO: inicio, mercados y pagina de cada mercado
// ============================================================
//  Un solo catalogo:  Mercado > Categoria > Tipo > Marca > Producto
//
//    #/                 Inicio (escaparate comercial de todo el catalogo)
//    #/mercados         Los mercados, uno por uno
//    #/m/<mercado>      Pagina comercial del mercado (belleza, energia...)
//    #/d/<mercado>      Todo el mercado en grilla con filtros (catalog.js)
//
//  Todo sale de los datos reales (products.js, stock.js, taxonomy.js y
//  config.js). No hay estadisticas inventadas: los numeros son conteos
//  del catalogo y los motivos (nuevo, oportunidad, volumen, ultimas
//  unidades) salen del stock y de las listas de config.js.
//
//  Cargar DESPUES de catalog.js.
// ============================================================

// ---------- Datos de cada mercado (se calculan una vez) ----------
const MX_CACHE = {};
function marketsList() { return deptsWithProducts(); }
function marketHref(id) { return '#/m/' + id; }
function marketIndex(id) { return marketsList().findIndex(d => d.id === id) + 1; }
function two(n) { return String(n).padStart(2, '0'); }

function brandsByCount(list) {
  const c = {};
  list.forEach(p => { c[p.brand] = (c[p.brand] || 0) + 1; });
  return Object.keys(c).sort((a, b) => c[b] - c[a] || a.localeCompare(b, 'es')).map(name => ({ name, count: c[name] }));
}

function mx(id) {
  if (MX_CACHE[id]) return MX_CACHE[id];
  const list = VISIBLE_PRODUCTS.filter(p => p.dept === id);
  const cats = catsOfDept(id);
  const types = [];
  cats.forEach(c => typesOfCat(c.id).forEach(t => { if (t.label !== 'Otros') types.push({ cat: c.id, label: t.label, count: t.count }); }));
  return (MX_CACHE[id] = {
    list, cats,
    types: types.sort((a, b) => b.count - a.count),
    brands: brandsByCount(list),
    avail: list.filter(p => stockNum(p) > 0).length,
    nuevos: list.filter(isInNuevosIngresosView).length
  });
}

// Fotos variadas: una por categoria/tipo, alternando, las mejores primero.
// "skip" salta las primeras fotos de cada grupo, para que la portada, las
// puertas y las paginas de mercado no repitan los mismos productos.
function mxPics(list, n, skip) {
  skip = skip || 0;
  const groups = {};
  list.forEach(p => { (groups[p.tipo + '|' + p.cat] = groups[p.tipo + '|' + p.cat] || []).push(p); });
  const lists = Object.values(groups).sort((a, b) => b.length - a.length).map(g => photoPick(g, n + skip));
  const pick = mixedPick(lists.map(g => g.slice(Math.min(skip, Math.max(0, g.length - 1)))), n);
  return pick.length >= n ? pick : pick.concat(photoPick(list.filter(p => !pick.includes(p)), n - pick.length));
}

function mxImg(p, eager) {
  return `<img src="${productImgSrc(p)}" alt="" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

function mxHead(o) {
  return `
    <header class="mx-head">
      <div class="mx-head-copy">
        ${o.eyebrow ? `<span class="mx-eyebrow">${escapeHtml(o.eyebrow)}</span>` : ''}
        <h2 class="mx-h2"${o.id ? ` id="${o.id}"` : ''}>${escapeHtml(o.title)}</h2>
        ${o.sub ? `<p class="mx-sub">${escapeHtml(o.sub)}</p>` : ''}
      </div>
      ${o.more ? `<a class="mx-more" href="${o.more}">${escapeHtml(o.moreLabel || 'Ver todo')} ${ICONS.arrow}</a>` : ''}
    </header>`;
}

function mxStatsHTML(items) {
  return `<dl class="mx-stats">${items.filter(x => x[1]).map(([label, n]) => `<div><dd>${fmt(n)}</dd><dt>${escapeHtml(label)}</dt></div>`).join('')}</dl>`;
}

// ---------- Carril de tarjetas con pestanas (generico) ----------
// tabs: [{ key, label, items: [productos], more: {href,label} }]
const MX_TABS = {};
function mxTabsRail(id, tabs, opts) {
  tabs = tabs.filter(t => t.items.length);
  if (!tabs.length) return '';
  MX_TABS[id] = { tabs, on: tabs[0].key };
  return `
    <section class="mx-sec mx-tabsec${opts.cls ? ' ' + opts.cls : ''}" id="${id}">
      ${mxHead(opts)}
      <div class="mx-bar">
        ${tabs.length > 1 ? `<div class="mx-tabs" role="group" aria-label="${escapeHtml(opts.title)}">${mxTabButtons(id)}</div>` : '<span></span>'}
        <div class="rail-arrows">
          <button type="button" class="rail-arrow" onclick="mxScroll('${id}',-1)" aria-label="Anteriores">${ICONS.chevL}</button>
          <button type="button" class="rail-arrow" onclick="mxScroll('${id}',1)" aria-label="Siguientes">${ICONS.chevR}</button>
        </div>
      </div>
      <div class="mx-track" data-track>${mxTrackHTML(tabs[0])}</div>
    </section>`;
}
function mxTabButtons(id) {
  const st = MX_TABS[id];
  return st.tabs.map(t => `<button type="button" class="mx-tab${t.key === st.on ? ' on' : ''}" aria-pressed="${t.key === st.on}" onclick="mxTab('${id}','${t.key}')">${escapeHtml(t.label)}<small>${fmt(t.total || t.items.length)}</small></button>`).join('');
}
function mxTrackHTML(tab) {
  const more = tab.more ? `<a class="mx-endcard" href="${tab.more.href}"><span>${escapeHtml(tab.more.label)}</span>${ICONS.arrow}</a>` : '';
  return tab.items.map(cardHTML).join('') + more;
}
function mxTab(id, key) {
  const st = MX_TABS[id], el = document.getElementById(id);
  if (!st || !el) return;
  st.on = key;
  const tab = st.tabs.find(t => t.key === key);
  const tabs = el.querySelector('.mx-tabs');
  if (tabs) tabs.innerHTML = mxTabButtons(id);
  const track = el.querySelector('[data-track]');
  track.innerHTML = mxTrackHTML(tab);
  track.scrollLeft = 0;
}
function mxScroll(id, dir) {
  const el = document.getElementById(id);
  const track = el && el.querySelector('[data-track]');
  if (track) track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: 'smooth' });
}

// ============================================================
//  INICIO
// ============================================================

// ---------- A. Portada: mensaje + escenario que rota por mercado ----------
//  El escenario muestra un mercado a la vez (o una campana de
//  config.js CAMPANAS_INICIO, que va primero). Se detiene al pasar el
//  mouse y no se mueve si el sistema pide "reducir movimiento".
const HERO_MS = 6500;
let heroIdx = 0, heroTimer = null, heroPaused = false, heroSlidesCache = null;

function heroSlides() {
  if (heroSlidesCache) return heroSlidesCache;
  const camp = (typeof CAMPANAS_INICIO !== 'undefined' ? CAMPANAS_INICIO : []).filter(c => c && c.activa !== false).map(c => {
    const items = (c.codigos || []).map(code => VISIBLE_PRODUCTS.find(p => p.code === String(code))).filter(p => p && p.img);
    if (!items.length || !c.titulo) return null;
    return { key: 'camp-' + slugify(c.titulo), tone: c.tono || '', label: c.pestana || c.titulo, eyebrow: c.etiqueta || 'Campaña',
      title: c.titulo, text: c.texto || '', href: c.enlace || '#/todo', cta: c.boton || 'Ver la campaña', items: items.slice(0, 3) };
  }).filter(Boolean);
  const markets = marketsList().map((d, i) => {
    const m = mx(d.id);
    return { key: d.id, tone: d.tone, label: d.name, eyebrow: `${two(i + 1)} · Mercado`, title: d.name, text: d.claim,
      href: marketHref(d.id), cta: 'Entrar a ' + d.name, items: mxPics(m.list, 3), count: m.list.length };
  });
  return (heroSlidesCache = camp.concat(markets));
}

function heroTextHTML() {
  const cfg = typeof INICIO !== 'undefined' ? INICIO : {};
  const fill = s => String(s || '').replace('{productos}', fmt(VISIBLE_PRODUCTS.length)).replace('{marcas}', BRANDS.length).replace('{mercados}', marketsList().length);
  const title = fill(cfg.titulo || 'Todo lo que tu negocio vende,|en un solo catálogo.').split('|');
  return `
    <div class="hx-copy">
      <span class="mx-eyebrow">${escapeHtml(fill(cfg.etiqueta || 'Catálogo mayorista · Grupo ImpoHogar'))}</span>
      <h1 class="hx-title">${escapeHtml(title[0])}${title[1] ? `<em>${escapeHtml(title[1])}</em>` : ''}</h1>
      <p class="hx-text">${escapeHtml(fill(cfg.texto || '{productos} productos de {marcas} marcas en {mercados} mercados. Arma tu pedido y envíalo a tu vendedor por WhatsApp.'))}</p>
      <div class="hx-ctas">
        <a class="xbtn xbtn-primary" href="#/todo">Explorar catálogo ${ICONS.arrow}</a>
        <a class="xbtn xbtn-ghost" href="#/mercados">Explorar mercados</a>
      </div>
    </div>`;
}
function heroStatsHTML() {
  return `<div class="hx-nums">${mxStatsHTML([
    ['productos', VISIBLE_PRODUCTS.length],
    ['marcas', BRANDS.length],
    ['disponibles hoy', VISIBLE_PRODUCTS.filter(p => stockNum(p) > 0).length],
    ['nuevos ingresos', collectionCount('nuevos')]
  ])}</div>`;
}

function heroSlideHTML(s, i) {
  const [a, b, c] = s.items;
  return `
    <a class="hx-slide tone-${s.tone}${i === heroIdx ? ' on' : ''}" href="${s.href}" data-i="${i}" ${i === heroIdx ? '' : 'aria-hidden="true" tabindex="-1"'}>
      <span class="hx-pics" aria-hidden="true">
        ${a ? `<span class="hx-pic hx-pic-a">${mxImg(a, i === 0)}</span>` : ''}
        ${b ? `<span class="hx-pic hx-pic-b">${mxImg(b)}</span>` : ''}
        ${c ? `<span class="hx-pic hx-pic-c">${mxImg(c)}</span>` : ''}
      </span>
      <span class="hx-cap">
        <small>${escapeHtml(s.eyebrow)}${s.count ? ` · ${fmt(s.count)} productos` : ''}</small>
        <b>${escapeHtml(s.title)}</b>
        ${s.text ? `<span>${escapeHtml(s.text)}</span>` : ''}
        <i>${escapeHtml(s.cta)} ${ICONS.arrow}</i>
      </span>
    </a>`;
}

function renderHero() {
  const el = document.getElementById('homeHero');
  if (!el) return;
  const slides = heroSlides();
  el.innerHTML = `
    <div class="hx">
      ${heroTextHTML()}
      <div class="hx-stage" onmouseenter="heroPaused=true" onmouseleave="heroPaused=false" onfocusin="heroPaused=true" onfocusout="heroPaused=false">
        <div class="hx-slides">${slides.map(heroSlideHTML).join('')}</div>
        <div class="hx-tabs" role="tablist" aria-label="Mercados">${slides.map((s, i) =>
          `<button type="button" role="tab" class="hx-tab tone-${s.tone}${i === heroIdx ? ' on' : ''}" aria-selected="${i === heroIdx}" onclick="heroGo(${i}, true)"><span>${escapeHtml(s.label)}</span><i></i></button>`).join('')}</div>
      </div>
      ${heroStatsHTML()}
    </div>`;
  heroStart();
}

function heroGo(i, byUser) {
  const slides = document.querySelectorAll('#homeHero .hx-slide');
  const tabs = document.querySelectorAll('#homeHero .hx-tab');
  if (!slides.length) return;
  heroIdx = (i + slides.length) % slides.length;
  slides.forEach((s, k) => {
    const on = k === heroIdx;
    s.classList.toggle('on', on);
    if (on) { s.removeAttribute('aria-hidden'); s.removeAttribute('tabindex'); }
    else { s.setAttribute('aria-hidden', 'true'); s.setAttribute('tabindex', '-1'); }
  });
  tabs.forEach((t, k) => { t.classList.toggle('on', k === heroIdx); t.setAttribute('aria-selected', String(k === heroIdx)); });
  if (byUser) heroStart();
}

function heroStart() {
  clearInterval(heroTimer);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const stage = document.querySelector('#homeHero .hx-stage');
  if (stage) { stage.classList.remove('is-running'); void stage.offsetWidth; stage.classList.add('is-running'); }
  heroTimer = setInterval(() => {
    if (heroPaused || document.hidden || document.body.dataset.view !== 'home') return;
    heroGo(heroIdx + 1);
    const st = document.querySelector('#homeHero .hx-stage');
    if (st) { st.classList.remove('is-running'); void st.offsetWidth; st.classList.add('is-running'); }
  }, HERO_MS);
}

// ---------- B. Puertas de los mercados ----------
function doorHTML(d, i) {
  const m = mx(d.id);
  const pics = mxPics(m.list, 3, 1);
  const types = m.types.slice(0, 3).map(t => t.label);
  return `
    <a class="door tone-${d.tone}" href="${marketHref(d.id)}" aria-label="${escapeHtml(d.name)}: ${fmt(m.list.length)} productos">
      <span class="door-top"><span class="door-num">${two(i + 1)}</span><span class="door-count">${fmt(m.list.length)} productos</span></span>
      <span class="door-pics" aria-hidden="true">${pics.map((p, k) => `<span class="door-pic door-pic-${k}">${mxImg(p)}</span>`).join('')}</span>
      <span class="door-body">
        <b class="door-name">${escapeHtml(d.name)}</b>
        <span class="door-claim">${escapeHtml(d.claim)}</span>
        <span class="door-types">${types.map(t => `<i>${escapeHtml(t)}</i>`).join('')}</span>
        <span class="door-brands">${m.brands.slice(0, 4).map(b => escapeHtml(b.name)).join(' · ')}</span>
        <span class="door-go">Entrar ${ICONS.arrow}</span>
      </span>
    </a>`;
}
function oppDoorHTML() {
  const rows = OPP_TABS.map(t => ({ t, n: t.col === 'volumen' ? VISIBLE_PRODUCTS.filter(p => stockNum(p) >= VOL_LEVEL_START).length : collectionCount(t.col) })).filter(x => x.n);
  if (!rows.length) return '';
  return `
    <a class="door door-opp" href="#/col/oportunidades">
      <span class="door-top"><span class="door-num">${ICONS.flame}</span><span class="door-count">Todos los mercados</span></span>
      <span class="door-motives">${rows.map(x => `<span class="dmo">${iconSVG(x.t.icon)}<span>${escapeHtml(x.t.col === 'volumen' ? `Stock para volumen (${VOL_LEVEL_START}+)` : x.t.label)}</span><b>${fmt(x.n)}</b></span>`).join('')}</span>
      <span class="door-body">
        <b class="door-name">Oportu&shy;nidades</b>
        <span class="door-claim">Motivos reales para pedir hoy, según la disponibilidad en bodega.</span>
        <span class="door-go">Ver oportunidades ${ICONS.arrow}</span>
      </span>
    </a>`;
}
function renderDoors() {
  const el = document.getElementById('homeDoors');
  if (!el) return;
  el.innerHTML = `
    ${mxHead({ eyebrow: 'Mercados', title: 'Elige tu mercado', id: 'doorsTitle',
      sub: `${marketsList().length} mercados en un solo catálogo y un solo pedido. Entra al que más se vende en tu negocio.`,
      more: '#/mercados', moreLabel: 'Ver todos los mercados' })}
    <div class="doors">${marketsList().map(doorHTML).join('')}${oppDoorHTML()}</div>`;
}

// ---------- C. Recorrido por cada mercado (disponible hoy) ----------
// Sin repetir lo que ya sale arriba (nuevos y oportunidades): el recorrido
// muestra otra parte del surtido. Si no alcanza, se completa igual.
function isFresh(p) { return !isOpportunity(p) && !isInNuevosIngresosView(p); }
function freshPick(list, n) {
  const pick = photoPick(list.filter(isFresh), n);
  if (pick.length < n) pick.push(...photoPick(list.filter(p => !pick.includes(p)), n - pick.length));
  return pick;
}
function marketPick(id, n) {
  const m = mx(id);
  const pick = mixedPick(m.cats.map(c => photoPick(m.list.filter(p => p.cat === c.id && isFresh(p)), n)), n);
  if (pick.length < n) pick.push(...photoPick(m.list.filter(p => !pick.includes(p)), n - pick.length));
  return pick;
}
function renderMarketRows() {
  const el = document.getElementById('homeMarketRows');
  if (!el) return;
  // Un solo bloque con una pestana por mercado (antes eran cinco filas):
  // misma informacion, la mitad de largo.
  const tabs = marketsList().map(d => {
    const m = mx(d.id);
    return { key: d.id, label: d.name, items: marketPick(d.id, 12), total: m.list.length,
      more: { href: marketHref(d.id), label: `Entrar a ${d.name}: ${fmt(m.list.length)} productos` } };
  });
  el.innerHTML = mxTabsRail('home-surtido', tabs, { eyebrow: 'Disponible hoy', title: 'Surtido por mercado', id: 'rowsTitle',
    sub: 'Productos con stock en bodega en cada mercado, listos para agregar a tu pedido.', cls: 'surtido-sec' });
}

// ---------- D. Marcas que debes conocer ----------
function brandSpotHTML(b) {
  const mkts = Object.keys(b.depts).sort((x, y) => b.depts[y] - b.depts[x]);
  const pics = mxPics(b.items, 4);
  const disp = b.items.filter(p => stockNum(p) > 0).length;
  const nuevos = b.items.filter(isInNuevosIngresosView).length;
  return `
    <a class="bspot tone-${deptTone(mkts[0])}" href="${brandHash(b.name)}">
      <span class="bspot-logo${brandInfo(b.name).logo ? ' has-logo' : ''}">${brandMarkHTML(b.name, 'bspot-mark')}</span>
      <span class="bspot-pics" aria-hidden="true">${pics.map(p => `<span>${mxImg(p)}</span>`).join('')}</span>
      <span class="bspot-meta">
        <span class="bspot-mk">${mkts.map(deptName).map(escapeHtml).join(' · ')}</span>
        <span class="bspot-nums"><span><b>${fmt(b.count)}</b> ${b.count === 1 ? 'producto' : 'productos'}</span><span><b>${fmt(disp)}</b> disponibles</span>${nuevos ? `<span class="is-new"><b>${fmt(nuevos)}</b> ${nuevos === 1 ? 'nuevo' : 'nuevos'}</span>` : ''}</span>
      </span>
    </a>`;
}
function renderBrandSpot() {
  const el = document.getElementById('homeBrandSpot');
  if (!el) return;
  el.innerHTML = `
    ${mxHead({ eyebrow: 'Marcas', title: 'Nuestras marcas', id: 'spotTitle',
      sub: 'Entra a una marca para ver todo su surtido, sus nuevos ingresos y su disponibilidad.', more: '#/marcas', moreLabel: `Ver las ${BRANDS.length} marcas` })}
    <div class="brand-wall" id="homeBrands"></div>`;
  renderHomeBrands();
}

// ---------- E. Como pedir ----------
function renderHow() {
  const el = document.getElementById('homeHow');
  if (!el) return;
  el.innerHTML = `
    <div class="how-in">
      <div class="how-copy">
        <span class="mx-eyebrow">Cómo pedir</span>
        <h2 class="mx-h2">Tu pedido mayorista en tres pasos.</h2>
        <p>Sin registros ni formularios. Tu vendedor recibe el pedido con códigos de barras y te confirma la disponibilidad.</p>
        <div class="how-ctas">
          <button type="button" class="xbtn xbtn-light" onclick="openSellerModal('contacto')">${ICONS.wa}Hablar con un vendedor</button>
          <button type="button" class="xbtn xbtn-line" onclick="openHelp()">Ver la guía</button>
        </div>
      </div>
      <ol class="how-steps">
        <li><b>01</b><h3>Elige productos y cantidades</h3><p>Por mercado, marca o buscando por nombre o código. Agregas con un toque.</p></li>
        <li><b>02</b><h3>Descarga tu pedido en Excel</h3><p>Con código de barras, descripción y cantidad. Si las necesitas, también las fotos.</p></li>
        <li><b>03</b><h3>Envíalo por WhatsApp</h3><p>Eliges a tu vendedor y le llega el pedido listo para atenderte.</p></li>
      </ol>
    </div>`;
}

// ============================================================
//  PAGINA DE MERCADOS (#/mercados)
// ============================================================
function renderMarketsPage() {
  const el = document.getElementById('marketsView');
  if (!el) return;
  const ms = marketsList();
  el.innerHTML = `
    <header class="mkts-head">
      <nav class="crumbs" aria-label="Ruta"><a href="#/">Inicio</a>${ICONS.chevR}<span>Mercados</span></nav>
      <span class="mx-eyebrow">Un solo catálogo</span>
      <h1 class="mkts-title">Mercados</h1>
      <p class="mkts-sub">${ms.length} mercados, ${BRANDS.length} marcas y ${fmt(VISIBLE_PRODUCTS.length)} productos en un mismo pedido. Entra a un mercado para ver sus categorías, marcas, novedades y oportunidades.</p>
      <nav class="mkts-jump" aria-label="Ir a un mercado">${ms.map(d => `<a class="tone-${d.tone}" href="${marketHref(d.id)}"><i></i>${escapeHtml(d.name)}<small>${fmt(mx(d.id).list.length)}</small></a>`).join('')}</nav>
    </header>
    <div class="mkts-list">
      ${ms.map((d, i) => {
        const m = mx(d.id);
        const pics = mxPics(m.list, 3, 2);
        return `
        <article class="mkb tone-${d.tone}">
          <a class="mkb-pics" href="${marketHref(d.id)}" aria-label="Entrar a ${escapeHtml(d.name)}">${pics.map(p => `<span>${mxImg(p)}</span>`).join('')}</a>
          <div class="mkb-body">
            <span class="mkb-num">${two(i + 1)} · ${fmt(m.list.length)} productos · ${m.brands.length} ${m.brands.length === 1 ? 'marca' : 'marcas'}</span>
            <h2 class="mkb-name"><a href="${marketHref(d.id)}">${escapeHtml(d.name)}</a></h2>
            <p class="mkb-lead">${escapeHtml(d.headline)}</p>
            <ul class="mkb-cats">${m.cats.map(c => `<li><a href="#/c/${c.id}"><span>${escapeHtml(c.name)}</span><small>${fmt(TAXO_COUNTS.cat[c.id])}</small></a></li>`).join('')}</ul>
            <div class="mkb-brands">${m.brands.slice(0, 6).map(b => `<a href="${brandHash(b.name)}" class="mkb-brand${brandInfo(b.name).logo ? ' has-logo' : ''}" title="${escapeHtml(b.name)}">${brandMarkHTML(b.name, 'mkb-mark')}</a>`).join('')}</div>
            <div class="mkb-ctas">
              <a class="xbtn xbtn-primary" href="${marketHref(d.id)}">Entrar a ${escapeHtml(d.name)} ${ICONS.arrow}</a>
              <a class="xbtn xbtn-ghost" href="#/d/${d.id}">Ver los ${fmt(m.list.length)} productos</a>
            </div>
          </div>
        </article>`;
      }).join('')}
    </div>
    <div class="mkts-end">
      <a class="mkts-opp" href="#/col/oportunidades">${ICONS.flame}<span><b>Oportunidades</b><small>Selección ImpoHogar, últimas unidades y stock para volumen, de todos los mercados.</small></span>${ICONS.arrow}</a>
      <a class="mkts-all" href="#/todo">${ICONS.grid}<span><b>Todo el catálogo</b><small>${fmt(VISIBLE_PRODUCTS.length)} productos con buscador, filtros y orden.</small></span>${ICONS.arrow}</a>
    </div>`;
}

// ============================================================
//  PAGINA COMERCIAL DE UN MERCADO (#/m/<id>)
// ============================================================
function typeTileHTML(c, t, list) {
  const pool = list.filter(p => p.cat === c.id && p.tipo === t.label);
  const pic = photoPick(pool, 1)[0] || pool.find(p => p.img);
  return `
    <a class="tt" href="#/c/${c.id}/${slugify(t.label)}">
      <span class="tt-pic">${pic ? mxImg(pic) : iconSVG(c.icon)}</span>
      <span class="tt-name">${escapeHtml(t.label)}</span>
      <small>${fmt(t.count)} ${t.count === 1 ? 'producto' : 'productos'}</small>
    </a>`;
}

function renderMarketPage(id) {
  const el = document.getElementById('marketView');
  const d = DEPARTMENT_BY_ID[id];
  if (!el || !d) return;
  const m = mx(id);
  const i = marketIndex(id);
  const total = marketsList().length;
  const pics = mxPics(m.list, 4, 3);
  const others = marketsList().filter(x => x.id !== id);

  // Oportunidades del mercado, por motivo (todo sale del stock y de config.js)
  const oppTabs = OPP_TABS.map(t => {
    const all = t.col === 'volumen'
      ? sortList(m.list.filter(p => stockNum(p) >= VOL_LEVEL_START), 'stock')
      : sortList(m.list.filter(COLLECTIONS[t.col].filter), COLLECTIONS[t.col].sort);
    const withImg = all.filter(p => p.img).concat(all.filter(p => !p.img));
    return { key: t.col, label: t.col === 'volumen' ? `Stock para volumen (${VOL_LEVEL_START}+)` : t.label, items: withImg.slice(0, 12), total: all.length,
      more: { href: t.col === 'volumen' ? '#/col/volumen/' + VOL_LEVEL_START : t.href, label: 'Ver en todos los mercados' } };
  });
  const nuevos = sortList(m.list.filter(isInNuevosIngresosView), 'recent');
  // Surtido por categoria: lo que hay disponible, de mayor a menor stock
  const catTabs = m.cats.map(c => ({ key: c.id, label: c.name, items: freshPick(m.list.filter(p => p.cat === c.id), 12), total: TAXO_COUNTS.cat[c.id],
    more: { href: '#/c/' + c.id, label: `Ver los ${fmt(TAXO_COUNTS.cat[c.id])} de ${c.name}` } }));

  el.innerHTML = `
    <div class="mk tone-${d.tone}">
      <section class="mk-hero">
        <div class="mk-hero-in">
          <div class="mk-copy">
            <nav class="crumbs" aria-label="Ruta"><a href="#/">Inicio</a>${ICONS.chevR}<a href="#/mercados">Mercados</a>${ICONS.chevR}<span>${escapeHtml(d.name)}</span></nav>
            <span class="mx-eyebrow">Mercado ${two(i)} de ${two(total)}</span>
            <h1 class="mk-title">${escapeHtml(d.name)}</h1>
            <p class="mk-lead">${escapeHtml(d.headline)}</p>
            <p class="mk-blurb">${escapeHtml(d.blurb)}</p>
            <div class="hx-ctas">
              <a class="xbtn xbtn-primary" href="#/d/${d.id}">Explorar todo ${escapeHtml(d.name)} ${ICONS.arrow}</a>
              <a class="xbtn xbtn-ghost" href="#mk-brands" onclick="event.preventDefault();document.getElementById('mk-brands').scrollIntoView({behavior:'smooth'})">Ver marcas</a>
            </div>
            ${mxStatsHTML([['productos', m.list.length], [m.brands.length === 1 ? 'marca' : 'marcas', m.brands.length], ['disponibles hoy', m.avail], ['nuevos ingresos', m.nuevos]])}
          </div>
          <div class="mk-pics" aria-hidden="true">${pics.map((p, k) => `<span class="mk-pic mk-pic-${k}">${mxImg(p, k === 0)}</span>`).join('')}</div>
        </div>
      </section>

      <section class="mx-sec mk-aisles" aria-labelledby="mkCatsTitle">
        ${mxHead({ eyebrow: 'Categorías', title: `Recorre ${d.name}`, id: 'mkCatsTitle', sub: 'Entra directo al tipo de producto que buscas.' })}
        ${m.cats.map(c => {
          const types = typesOfCat(c.id);
          return `
          <div class="aisle">
            <a class="aisle-head" href="#/c/${c.id}"><span>${escapeHtml(c.name)}</span><small>${fmt(TAXO_COUNTS.cat[c.id])} productos</small>${ICONS.arrow}</a>
            <div class="aisle-tiles">${types.map(t => typeTileHTML(c, t, m.list)).join('')}</div>
          </div>`;
        }).join('')}
      </section>

      <section class="mx-sec" id="mk-brands" aria-labelledby="mkBrandsTitle">
        ${mxHead({ eyebrow: 'Marcas', title: `Marcas en ${d.name}`, id: 'mkBrandsTitle', more: '#/marcas', moreLabel: 'Todas las marcas' })}
        <div class="mk-brands">${m.brands.map(b => `
          <a class="mkbr" href="${brandHash(b.name)}">
            <span class="mkbr-logo${brandInfo(b.name).logo ? ' has-logo' : ''}">${brandMarkHTML(b.name, 'mkbr-mark')}</span>
            <small>${fmt(b.count)} ${b.count === 1 ? 'producto' : 'productos'}</small>
          </a>`).join('')}</div>
      </section>

      ${nuevos.length ? mxTabsRail('mk-nuevos', [{ key: 'n', label: 'Nuevos', items: nuevos.slice(0, 12), total: nuevos.length, more: { href: '#/col/nuevos', label: 'Ver todos los nuevos ingresos' } }],
        { eyebrow: 'Recién llegados', title: `Nuevos ingresos en ${d.name}`, sub: 'Lo más reciente que entró a bodega.' }) : ''}

      ${mxTabsRail('mk-opp', oppTabs, { eyebrow: 'Para pedir hoy', title: `Oportunidades en ${d.name}`, sub: 'Con un motivo real: selección de la casa, pocas unidades o stock para pedidos grandes.', cls: 'is-opp' })}

      ${mxTabsRail('mk-surtido', catTabs, { eyebrow: 'Disponible hoy', title: 'Listo para tu pedido', sub: 'Productos con stock en bodega, de mayor a menor disponibilidad.' })}

      <section class="mk-end">
        <a class="mk-all" href="#/d/${d.id}">
          <span class="mx-eyebrow">Explorar todo</span>
          <b>${escapeHtml(d.name)}</b>
          <span>${fmt(m.list.length)} productos con buscador, filtros por categoría, marca y disponibilidad.</span>
          <i>Ver todo ${escapeHtml(d.name)} ${ICONS.arrow}</i>
        </a>
        <div class="mk-others">
          <span class="mx-eyebrow">Otros mercados</span>
          ${others.map(o => {
            const p = photoPick(mx(o.id).list, 1)[0];
            return `<a class="mko tone-${o.tone}" href="${marketHref(o.id)}"><span class="mko-pic">${p ? mxImg(p) : ''}</span><span><b>${escapeHtml(o.name)}</b><small>${escapeHtml(o.claim)}</small></span>${ICONS.arrow}</a>`;
          }).join('')}
        </div>
      </section>
    </div>`;
}

// Ficha del producto: "Complementa tu pedido" con otras categorias del
// mismo mercado (relacion real: mismo mercado, otra categoria).
function complementPick(p, n) {
  const pool = VISIBLE_PRODUCTS.filter(x => x.dept === p.dept && x.cat !== p.cat);
  const groups = {};
  pool.forEach(x => { (groups[x.cat + '|' + x.tipo] = groups[x.cat + '|' + x.tipo] || []).push(x); });
  return mixedPick(Object.values(groups).map(g => photoPick(g, 2)), n);
}

// ============================================================
//  INICIO COMPLETO
// ============================================================
function renderHome() {
  renderHero();
  renderDoors();
  renderShowcases();
  renderMarketRows();
  renderBrandSpot();
  renderNeeds();
  renderHow();
}
