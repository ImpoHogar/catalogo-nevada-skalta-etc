// ============================================================
//  FICHA DEL PRODUCTO (pagina #/p/<id>)
// ============================================================
//  Galeria (foto, fotos extra si el producto trae "imgs" en
//  products.js, y codigo de barras) con zoom y descarga de la foto,
//  disponibilidad, caracteristicas segun el departamento, cantidad para
//  el pedido, consulta al vendedor por WhatsApp y los carriles
//  "Tambien te puede interesar", otras opciones y misma marca.
//  Solo presenta datos que YA existen en el catalogo.
//
//  Se mantienen los nombres openLightbox / closeLightbox /
//  refreshLightboxQty porque el resto del catalogo los usa.
// ============================================================

let lightboxState = { images: [], index: 0, scale: 1, pid: null };
let pinchStartDist = null;
let pinchStartScale = 1;

function barcodeDataURL(code) {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, code, { format: 'CODE128', displayValue: true, width: 2, height: 70, margin: 8, fontSize: 16 });
    return canvas.toDataURL('image/png');
  } catch (e) {
    return placeholderImg('Código no válido para barras', '');
  }
}

function getProductImages(p) {
  const imgs = [{ src: productImgSrc(p), caption: `${p.brand} · ${prettyName(p)}`, kind: 'foto' }];
  (Array.isArray(p.imgs) ? p.imgs : []).forEach((f, i) => imgs.push({ src: `img/productos/${encodeURIComponent(f)}?v=${IMG_VERSION}`, caption: `${prettyName(p)} · foto ${i + 2}`, kind: 'foto' }));
  imgs.push({ src: barcodeDataURL(p.code), caption: `Código de barras · ${p.code}`, kind: 'barras' });
  return imgs;
}

// Abrir la ficha = ir a su direccion (asi funciona el boton "atras").
function openLightbox(pid, imgIndex) {
  if (!PRODUCTS_BY_ID[pid]) return;
  lightboxState.index = imgIndex || 0;
  navigate('#/p/' + pid);
}

// Volver: si se llego navegando dentro del catalogo, vuelve a la pagina
// anterior (con su posicion); si se abrio el enlace directo, al inicio.
function closeLightbox() {
  if ((window.__appNav || 0) > 1) history.back();
  else navigate('#/');
}

function onProductViewLeave() { lightboxState.pid = null; }

// Caracteristicas de la ficha segun el departamento. Solo datos que
// salen del nombre / la estructura del catalogo (nada inventado).
function productFacts(p) {
  const tone = productTone(p);
  const specs = p._specs || (p._specs = productSpecs(p));
  const model = modelCode(p);
  const rows = [['Marca', p.brand], ['Categoría', catName(p.cat)], ['Tipo de producto', p.tipo !== 'Otros' ? p.tipo : catName(p.cat)]];
  if (tone === 'battery') {
    if (batterySize(p)) rows.push(['Tamaño', batterySize(p)]);
    if (batteryChem(p)) rows.push(['Tipo de batería', batteryChem(p)]);
    if (batteryVolt(p)) rows.push(['Voltaje', batteryVolt(p)]);
    if (batteryPack(p)) rows.push(['Presentación', batteryPack(p)]);
    if (model) rows.push(['Modelo', model]);
  } else if (tone === 'tech' || tone === 'home') {
    if (model) rows.push(['Modelo', model]);
    specs.forEach(s => rows.push([s.label === 'Conexión' ? 'Conectividad' : s.label, s.value]));
    const comp = productCompat(p);
    if (comp.length) rows.push(['Compatibilidad', comp.join(', ')]);
  } else {
    specs.forEach(s => rows.push([s.label === 'Tamaño' ? 'Presentación' : s.label, s.value]));
    const tf = toneFamily(p);
    if (tf) rows.push(['Subtono', tf]);
    const ben = productBenefits(p);
    if (ben.length) rows.push(['Beneficio', ben.join(', ')]);
  }
  rows.push(['Código de barras', p.code]);
  return rows;
}

function similarProducts(p, n) {
  const same = VISIBLE_PRODUCTS.filter(x => x.id !== p.id && x.cat === p.cat && x.tipo === p.tipo);
  const others = same.filter(x => x.brand !== p.brand).sort((a, b) => rankScore(b) - rankScore(a));
  const mine = same.filter(x => x.brand === p.brand).sort((a, b) => rankScore(b) - rankScore(a));
  let list = others.concat(mine);
  if (list.length < 6) list = list.concat(VISIBLE_PRODUCTS.filter(x => x.id !== p.id && x.cat === p.cat && !list.includes(x)).sort((a, b) => rankScore(b) - rankScore(a)));
  return list.slice(0, n);
}

// Misma linea: misma marca y nombre de linea en comun (ej. "Mais
// Cachos", "Aguacate"). Sale solo de los nombres reales.
function sameLineProducts(p, n) {
  if (typeof relWords !== 'function') return [];
  const w = relWords(p);
  if (!w.size) return [];
  return VISIBLE_PRODUCTS.filter(x => x.id !== p.id && x.brand === p.brand && [...relWords(x)].some(t => w.has(t)))
    .map(x => [x, [...relWords(x)].filter(t => w.has(t)).length])
    .sort((a, b) => b[1] - a[1] || (stockNum(b[0]) > 0) - (stockNum(a[0]) > 0) || a[0].id - b[0].id)
    .map(x => x[0]).slice(0, n);
}

// Datos clave bajo el nombre (categoria, presentacion, tamano...).
function pdpKeyFacts(p) {
  const tone = productTone(p);
  const out = [['Categoría', p.tipo !== 'Otros' ? p.tipo : catName(p.cat)]];
  if (tone === 'battery') {
    if (batterySize(p)) out.push(['Tamaño', batterySize(p)]);
    if (batteryPack(p)) out.push(['Presentación', batteryPack(p)]);
  } else if (tone === 'tech' || tone === 'home') {
    (p._specs || (p._specs = productSpecs(p))).slice(0, 2).forEach(x => out.push([x.label === 'Conexión' ? 'Conectividad' : x.label, x.value]));
  } else {
    const size = sizeOf(p);
    if (size) out.push(['Presentación', size]);
    const tf = toneFamily(p);
    if (tf) out.push(['Subtono', tf]);
  }
  return out.slice(0, 3);
}

function sameBrandProducts(p, n) {
  const list = VISIBLE_PRODUCTS.filter(x => x.id !== p.id && x.brand === p.brand);
  return list.sort((a, b) => (b.cat === p.cat) - (a.cat === p.cat) || rankScore(b) - rankScore(a)).slice(0, n);
}

// Cantidad elegida en la ficha (antes de agregar al pedido).
let pdpQty = 1;
function pdpQtyChange(delta) { pdpSetQty(pdpQty + delta); }
function pdpSetQty(v) {
  pdpQty = Math.max(1, parseInt(v) || 1);
  const i = document.getElementById('pdpQty');
  if (i) i.value = pdpQty;
  document.querySelectorAll('[data-pdp-qty]').forEach(x => { x.value = pdpQty; });
  pdpRefreshHint();
}
function pdpRefreshHint() {
  const p = PRODUCTS_BY_ID[lightboxState.pid];
  const h = document.getElementById('pdpQtyHint');
  if (!p || !h) return;
  const st = parseInt(p.stock) || 0;
  const total = pdpQty + (qtyMap[p.id] || 0);
  h.hidden = total <= st;
  h.innerHTML = `${ICONS.warn}Disponibilidad limitada: hay ${st.toLocaleString('es-CR')} ${st === 1 ? 'unidad' : 'unidades'}. Puedes pedirlas igual y tu vendedor te confirma.`;
}
function pdpAddToOrder() {
  const p = PRODUCTS_BY_ID[lightboxState.pid];
  if (!p) return;
  setQty(p.id, (qtyMap[p.id] || 0) + pdpQty);
  pdpSetQty(1);
}

function pdpInCartHTML(p) {
  const q = qtyMap[p.id] || 0;
  return `${ICONS.check}<span>En tu pedido:</span>
    <div class="pdp-mini-stepper" role="group" aria-label="Cantidad en tu pedido">
      <button type="button" onclick="changeQty(${p.id},-1)" aria-label="Quitar una unidad">−</button>
      <input type="number" min="0" inputmode="numeric" value="${q}" data-qty-for="${p.id}" onchange="setQty(${p.id}, this.value)" onfocus="this.select()" aria-label="Cantidad en tu pedido">
      <button type="button" onclick="changeQty(${p.id},1)" aria-label="Agregar una unidad">+</button>
    </div>
    <span>${q === 1 ? 'unidad' : 'unidades'}</span>
    <button type="button" class="link-btn" onclick="openOrderReview()">Ver pedido</button>`;
}

function renderProductPage(pid) {
  const el = document.getElementById('productView');
  const p = PRODUCTS_BY_ID[pid];
  if (!el || !p) return;
  lightboxState.pid = pid;
  lightboxState.images = getProductImages(p);
  if (!lightboxState.images[lightboxState.index]) lightboxState.index = 0;
  pdpQty = 1;
  const tone = productTone(p);
  const d = DEPARTMENT_BY_ID[p.dept];
  const c = CATEGORY_BY_ID[p.cat];
  const lvl = stockLevel(p);
  const enPedido = qtyMap[p.id] || 0;
  const brandCount = VISIBLE_PRODUCTS.filter(x => x.brand === p.brand).length;
  const flags = productFlags(p).filter(f => f.key !== 'low');
  const badges = flags.map(f => `<span class="badge badge-${f.key}">${ICONS[f.icon]}${f.key === 'new' ? 'Nuevo ingreso' : f.key === 'vol' ? 'Disponible para volumen' : f.badge}</span>`);
  if (isBestSeller(p)) badges.push('<span class="badge badge-best">Más vendido</span>');
  const crumbs = [['#/', 'Inicio']];
  if (d) crumbs.push(['#/m/' + d.id, d.name]);
  if (c) crumbs.push(['#/c/' + c.id, c.name]);
  if (c && p.tipo !== 'Otros') crumbs.push(['#/c/' + c.id + '/' + slugify(p.tipo), p.tipo]);

  const buy = lvl.key === 'out'
    ? `<div class="pdp-soldout">${ICONS.warn}<span>Este producto está agotado por ahora. Consulta a tu vendedor por la próxima entrada.</span></div>`
    : `<div class="pdp-qty-label">Cantidad</div>
      <div class="pdp-buy">
        <div class="pdp-stepper" role="group" aria-label="Cantidad a agregar">
          <button type="button" onclick="pdpQtyChange(-1)" aria-label="Quitar una unidad">−</button>
          <input type="number" min="1" inputmode="numeric" value="1" id="pdpQty" onchange="pdpSetQty(this.value)" onfocus="this.select()" aria-label="Cantidad a agregar">
          <button type="button" onclick="pdpQtyChange(1)" aria-label="Agregar una unidad">+</button>
        </div>
        <button type="button" class="btn btn-primary pdp-add" id="pdpAdd" onclick="pdpAddToOrder()">${ICONS.bag}<span>Agregar al pedido</span></button>
      </div>
      <div class="pdp-quick">${[6, 12, 24, 48].map(n => `<button type="button" onclick="pdpSetQty(${n})">${n}</button>`).join('')}<span>Cantidades rápidas</span></div>
      <div class="pdp-qty-hint" id="pdpQtyHint" hidden></div>
      <div class="pdp-incart" id="pdpInCart"${enPedido ? '' : ' hidden'}>${pdpInCartHTML(p)}</div>`;

  const notas = (p.notes && p.notes.length) ? `
    <div class="pdp-block"><h2 class="pdp-h">Detalles</h2><div class="pdp-notes">${p.notes.map(n => `<span>${escapeHtml(n)}</span>`).join('')}</div></div>` : '';

  const line = sameLineProducts(p, 14);
  const lineIds = new Set(line.map(x => x.id));
  const suggested = (typeof suggestedProducts === 'function' ? suggestedProducts(p, 20) : []).filter(x => !lineIds.has(x.id)).slice(0, 14);
  const sugIds = new Set(suggested.map(x => x.id).concat([...lineIds]));
  const similar = similarProducts(p, 20).filter(x => !sugIds.has(x.id)).slice(0, 16);
  const thumbs = lightboxState.images.map((im, i) => `
    <button type="button" class="pdp-thumb${i === lightboxState.index ? ' on' : ''}" onclick="lightboxGoTo(${i}, event)" aria-label="${escapeHtml(im.caption)}">
      ${im.kind === 'barras' ? `<span class="pdp-thumb-bc">${ICONS.list}<small>Código</small></span>` : `<img src="${im.src}" alt="">`}
    </button>`).join('');

  el.innerHTML = `
    <div class="pdp tone-${tone}">
      <div class="pdp-top">
        ${homeBackHTML()}
        <button type="button" class="pdp-back" onclick="closeLightbox()">${ICONS.chevL}Volver atrás</button>
        <nav class="crumbs" aria-label="Ruta">${crumbs.map(([h, l]) => `<a href="${h}">${escapeHtml(l)}</a>${ICONS.chevR}`).join('')}<span aria-current="page">${escapeHtml(prettyName(p))}</span></nav>
      </div>
      <div class="pdp-grid">
        <div class="pdp-gallery">
          <div class="pdp-thumbs">${thumbs}</div>
          <div class="pdp-stage" id="pdpStage">
            <img id="lightboxImg" src="${lightboxState.images[lightboxState.index].src}" alt="${escapeHtml(prettyName(p))}">
            ${lightboxState.images.length > 1 ? `
              <button class="pdp-nav prev" type="button" onclick="lightboxNav(-1, event)" aria-label="Imagen anterior">${ICONS.chevL}</button>
              <button class="pdp-nav next" type="button" onclick="lightboxNav(1, event)" aria-label="Imagen siguiente">${ICONS.chevR}</button>` : ''}
            <span class="pdp-hint">Toca la imagen para hacer zoom</span>
          </div>
          ${p.img ? `<button type="button" class="pdp-dl" onclick="downloadProductPhoto(${p.id}, this)">${ICONS.download}Descargar foto</button>` : ''}
        </div>
        <div class="pdp-info">
          <a class="pdp-brand" href="${brandHash(p.brand)}">${escapeHtml(p.brand)}<small>Ver sus ${brandCount} productos ${ICONS.arrow}</small></a>
          <h1 class="pdp-name">${escapeHtml(prettyName(p))}</h1>
          <div class="pdp-raw">${escapeHtml(p.name)}</div>
          <div class="pdp-code">
            <span>Código</span><b>${escapeHtml(p.code)}</b>
            <button type="button" class="pdp-copy" onclick="copyCode('${escapeHtml(p.code)}', this)" aria-label="Copiar código">${ICONS.copy}<span>Copiar</span></button>
          </div>
          <div class="pdp-keyfacts">${pdpKeyFacts(p).map(([k, v]) => `<div><span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b></div>`).join('')}</div>
          <div class="pdp-avail is-${lvl.key}"><i></i><span>${escapeHtml(lvl.label)}</span>${lvl.qty ? `<small>${escapeHtml(lvl.qty)}</small>` : ''}</div>
          ${badges.length ? `<div class="pdp-badges">${badges.join('')}</div>` : ''}
          <div class="pdp-buybox">${buy}</div>
          <div class="pdp-help">
            <span>${ICONS.chat}<b>¿Tienes dudas sobre este producto?</b></span>
            <button type="button" class="btn btn-wa" onclick="openSellerModal('consulta', ${p.id})">${ICONS.wa}Consultar con vendedor</button>
          </div>
          <div class="pdp-block">
            <h2 class="pdp-h">Características</h2>
            <dl class="pdp-facts">${productFacts(p).map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd${k === 'Código de barras' || k === 'Modelo' ? ' class="mono"' : ''}>${escapeHtml(v)}</dd></div>`).join('')}</dl>
          </div>
          ${notas}
        </div>
      </div>
      <div class="pdp-rails">
        ${line.length >= 2 ? railHTML(line, { title: 'De la misma línea', sub: `Otros productos ${p.brand} de la misma línea.`, cls: 'rail-sugg' }) : ''}
        ${railHTML(suggested, { title: line.length >= 2 ? 'También te puede interesar' : 'Productos relacionados', sub: 'Productos que se usan junto con este o lo complementan.', cls: 'rail-sugg' })}
        ${railHTML(similar, { title: `Otras opciones de ${p.tipo !== 'Otros' ? p.tipo : catName(p.cat)}`, sub: 'Del mismo tipo de producto.', more: c ? '#/c/' + c.id + (p.tipo !== 'Otros' ? '/' + slugify(p.tipo) : '') : '' })}
        ${railHTML(sameBrandProducts(p, 16), { title: `Más de ${p.brand}`, more: brandHash(p.brand), moreLabel: `Ver los ${brandCount}` })}
        ${d ? railHTML(complementPick(p, 14), { title: `Complementa tu pedido en ${d.name}`, sub: `Otras categorías del mercado ${d.name}, con stock en bodega.`, more: '#/m/' + d.id, moreLabel: `Ir a ${d.name}` }) : ''}
      </div>
      <div class="home-back-end">${homeBackHTML('is-outline')}</div>
      ${lvl.key === 'out' ? '' : `
      <div class="pdp-sticky" aria-label="Agregar al pedido">
        <div class="pdp-sticky-info"><b>${escapeHtml(prettyName(p))}</b><span class="is-${lvl.key}">${escapeHtml(lvl.qty || lvl.label)}</span></div>
        <div class="pdp-stepper pdp-stepper-sm" role="group" aria-label="Cantidad a agregar">
          <button type="button" onclick="pdpQtyChange(-1)" aria-label="Quitar una unidad">−</button>
          <input type="number" min="1" inputmode="numeric" value="1" data-pdp-qty onchange="pdpSetQty(this.value)" onfocus="this.select()" aria-label="Cantidad a agregar">
          <button type="button" onclick="pdpQtyChange(1)" aria-label="Agregar una unidad">+</button>
        </div>
        <button type="button" class="btn btn-primary" onclick="pdpAddToOrder()">${ICONS.bag}Agregar</button>
      </div>`}
    </div>`;
  bindZoom();
  document.title = `${prettyName(p)} · ${p.brand} · ImpoHogar Market`;
}

function copyCode(code, btn) {
  const done = () => { btn.classList.add('ok'); btn.querySelector('span').textContent = 'Copiado'; setTimeout(() => { btn.classList.remove('ok'); btn.querySelector('span').textContent = 'Copiar'; }, 1600); };
  try { navigator.clipboard.writeText(code).then(done, done); } catch (e) { done(); }
}

// La cantidad cambio (desde la ficha o cualquier tarjeta): se refresca el
// texto de la ficha abierta sin dibujarla de nuevo.
function refreshLightboxQty(id) {
  if (lightboxState.pid !== id || currentRoute.view !== 'product') return;
  const q = qtyMap[id] || 0;
  const inCart = document.getElementById('pdpInCart');
  if (inCart) {
    inCart.hidden = !q;
    const input = inCart.querySelector('input');
    if (!input || document.activeElement !== input) inCart.innerHTML = pdpInCartHTML(PRODUCTS_BY_ID[id]);
  }
  pdpRefreshHint();
}

function updateLightbox() {
  const { images, index } = lightboxState;
  const img = document.getElementById('lightboxImg');
  if (!img || !images[index]) return;
  img.src = images[index].src;
  img.alt = images[index].caption;
  img.style.transform = 'scale(1)';
  img.classList.remove('zoomed');
  img.classList.toggle('is-barcode', images[index].kind === 'barras');
  lightboxState.scale = 1;
  document.querySelectorAll('.pdp-thumb').forEach((b, i) => b.classList.toggle('on', i === index));
}

function lightboxNav(delta, evt) {
  if (evt) evt.stopPropagation();
  const n = lightboxState.images.length;
  if (!n) return;
  lightboxState.index = (lightboxState.index + delta + n) % n;
  updateLightbox();
}

function lightboxGoTo(i, evt) {
  if (evt) evt.stopPropagation();
  if (!lightboxState.images[i]) return;
  lightboxState.index = i;
  updateLightbox();
}

function bindZoom() {
  const img = document.getElementById('lightboxImg');
  if (!img) return;
  img.addEventListener('click', toggleZoom);
  img.addEventListener('wheel', wheelZoom, { passive: false });
  img.addEventListener('touchstart', touchZoomStart, { passive: false });
  img.addEventListener('touchmove', touchZoomMove, { passive: false });
  img.addEventListener('touchend', touchZoomEnd);
  img.addEventListener('mousemove', e => {
    if (lightboxState.scale <= 1) return;
    const r = img.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
  });
}

function toggleZoom(e) {
  const img = document.getElementById('lightboxImg');
  if (!img) return;
  if (lightboxState.scale === 1) {
    lightboxState.scale = 2.4;
    img.classList.add('zoomed');
    const rect = img.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX - rect.left) / rect.width) * 100}% ${((e.clientY - rect.top) / rect.height) * 100}%`;
  } else {
    lightboxState.scale = 1;
    img.classList.remove('zoomed');
    img.style.transformOrigin = 'center center';
  }
  img.style.transform = `scale(${lightboxState.scale})`;
}

function wheelZoom(e) {
  if (lightboxState.scale === 1 && !e.ctrlKey) return;   // no secuestra el scroll normal
  e.preventDefault();
  const img = document.getElementById('lightboxImg');
  let s = lightboxState.scale + (e.deltaY < 0 ? 0.3 : -0.3);
  s = Math.min(4, Math.max(1, s));
  lightboxState.scale = s;
  img.classList.toggle('zoomed', s > 1);
  img.style.transform = `scale(${s})`;
}

function touchZoomStart(e) {
  if (e.touches.length === 2) {
    pinchStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    pinchStartScale = lightboxState.scale;
  }
}

function touchZoomMove(e) {
  if (e.touches.length === 2 && pinchStartDist) {
    e.preventDefault();
    const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    const img = document.getElementById('lightboxImg');
    let s = Math.min(4, Math.max(1, pinchStartScale * (dist / pinchStartDist)));
    lightboxState.scale = s;
    img.classList.toggle('zoomed', s > 1);
    img.style.transform = `scale(${s})`;
  }
}

function touchZoomEnd(e) { if (e.touches.length < 2) pinchStartDist = null; }

document.addEventListener('keydown', e => {
  if (typeof currentRoute === 'undefined' || currentRoute.view !== 'product') return;
  if (/input|textarea|select/i.test(document.activeElement.tagName)) return;
  if (document.querySelector('.order-modal.open, .thanks-modal.open')) return;
  if (e.key === 'ArrowLeft') lightboxNav(-1);
  if (e.key === 'ArrowRight') lightboxNav(1);
});

// ============================================================
//  AVISO "AGREGADO AL PEDIDO"
// ============================================================
let toastTimer = null;
function showAddedToast(id, qty) {
  const t = document.getElementById('addToast');
  const p = PRODUCTS_BY_ID[id];
  if (!t || !p) return;
  t.innerHTML = `
    <img src="${productImgSrc(p)}" alt="">
    <span class="at-text"><b>${qty === 1 ? 'Agregado al pedido' : `${qty} unidades en tu pedido`}</b><span>${escapeHtml(prettyName(p))}</span></span>
    <button type="button" class="at-btn" onclick="openOrderReview()">Ver pedido</button>`;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
