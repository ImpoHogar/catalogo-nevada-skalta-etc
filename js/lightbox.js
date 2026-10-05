// ============================================================
//  FICHA DEL PRODUCTO (pagina #/p/<id>)
// ============================================================
//  Galeria (foto, fotos extra si el producto trae "imgs" en
//  products.js, y codigo de barras) con zoom, informacion adaptada al
//  tipo de producto, cantidad para el pedido y carriles de
//  relacionados, similares y de la misma marca.
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

// Datos de la ficha segun el tipo de producto
function productFacts(p) {
  const tone = deptTone(p.dept);
  const specs = p._specs || (p._specs = productSpecs(p));
  const model = modelCode(p);
  const rows = [['Marca', p.brand], ['Categoría', catName(p.cat)], ['Tipo de producto', p.tipo !== 'Otros' ? p.tipo : catName(p.cat)]];
  if (tone === 'tech' || tone === 'home') {
    if (model) rows.push(['Modelo', model]);
    specs.forEach(s => rows.push([s.label, s.value]));
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

function sameBrandProducts(p, n) {
  const list = VISIBLE_PRODUCTS.filter(x => x.id !== p.id && x.brand === p.brand);
  return list.sort((a, b) => (b.cat === p.cat) - (a.cat === p.cat) || rankScore(b) - rankScore(a)).slice(0, n);
}

function renderProductPage(pid) {
  const el = document.getElementById('productView');
  const p = PRODUCTS_BY_ID[pid];
  if (!el || !p) return;
  lightboxState.pid = pid;
  lightboxState.images = getProductImages(p);
  if (!lightboxState.images[lightboxState.index]) lightboxState.index = 0;
  const tone = deptTone(p.dept);
  const d = DEPARTMENT_BY_ID[p.dept];
  const c = CATEGORY_BY_ID[p.cat];
  const lvl = stockLevel(p);
  const enPedido = qtyMap[p.id] || 0;
  const brandCount = VISIBLE_PRODUCTS.filter(x => x.brand === p.brand).length;
  const badges = [];
  if (isProductNew(p)) badges.push('<span class="badge badge-new">Nuevo ingreso</span>');
  if (isBestSeller(p)) badges.push('<span class="badge badge-best">Más vendido</span>');
  if (lvl.key === 'low') badges.push('<span class="badge badge-low">Últimas unidades</span>');
  if (stockNum(p) >= VOLUMEN_MIN) badges.push('<span class="badge badge-vol">Stock para volumen</span>');
  const crumbs = [['#/', 'Inicio']];
  if (d) crumbs.push(['#/d/' + d.id, d.name]);
  if (c) crumbs.push(['#/c/' + c.id, c.name]);
  if (c && p.tipo !== 'Otros') crumbs.push(['#/c/' + c.id + '/' + slugify(p.tipo), p.tipo]);

  const buy = lvl.key === 'out'
    ? `<div class="pdp-soldout">Este producto está agotado por ahora. Consulta a tu vendedor por la próxima entrada.</div>`
    : `<div class="pdp-buy">
        <div class="pdp-stepper" role="group" aria-label="Cantidad">
          <button type="button" onclick="changeQty(${p.id},-1)" aria-label="Quitar una unidad">−</button>
          <input type="number" min="0" inputmode="numeric" value="${enPedido}" data-qty-for="${p.id}" onchange="setQty(${p.id}, this.value)" onfocus="this.select()" aria-label="Cantidad">
          <button type="button" onclick="changeQty(${p.id},1)" aria-label="Agregar una unidad">+</button>
        </div>
        <button type="button" class="btn btn-primary pdp-add" id="pdpAdd" onclick="changeQty(${p.id},1)">${ICONS.bag}<span>${enPedido ? 'Agregar otra unidad' : 'Agregar al pedido'}</span></button>
      </div>
      <div class="pdp-incart" id="pdpInCart"${enPedido ? '' : ' hidden'}>${ICONS.check}En tu pedido: <b>${enPedido} ${enPedido === 1 ? 'unidad' : 'unidades'}</b> · <button type="button" class="link-btn" onclick="openOrderReview()">Ver pedido</button></div>`;

  const notas = (p.notes && p.notes.length) ? `
    <div class="pdp-block"><h2 class="pdp-h">Detalles</h2><div class="pdp-notes">${p.notes.map(n => `<span>${escapeHtml(n)}</span>`).join('')}</div></div>` : '';

  const rels = (typeof getRelatedProducts === 'function') ? getRelatedProducts(p.id).map(r => r.product) : [];
  const thumbs = lightboxState.images.map((im, i) => `
    <button type="button" class="pdp-thumb${i === lightboxState.index ? ' on' : ''}" onclick="lightboxGoTo(${i}, event)" aria-label="${escapeHtml(im.caption)}">
      ${im.kind === 'barras' ? `<span class="pdp-thumb-bc">${ICONS.list}<small>Código</small></span>` : `<img src="${im.src}" alt="">`}
    </button>`).join('');

  el.innerHTML = `
    <div class="pdp tone-${tone}">
      <div class="pdp-top">
        <button type="button" class="pdp-back" onclick="closeLightbox()">${ICONS.chevL}Volver</button>
        <nav class="crumbs" aria-label="Ruta">${crumbs.map(([h, l]) => `<a href="${h}">${escapeHtml(l)}</a>${ICONS.chevR}`).join('')}<span aria-current="page">${escapeHtml(prettyName(p))}</span></nav>
      </div>
      <div class="pdp-grid">
        <div class="pdp-gallery">
          <div class="pdp-thumbs">${thumbs}</div>
          <div class="pdp-stage" id="pdpStage">
            <span class="pc-badges">${badges.slice(0, 2).join('')}</span>
            <img id="lightboxImg" src="${lightboxState.images[lightboxState.index].src}" alt="${escapeHtml(prettyName(p))}">
            ${lightboxState.images.length > 1 ? `
              <button class="pdp-nav prev" type="button" onclick="lightboxNav(-1, event)" aria-label="Imagen anterior">${ICONS.chevL}</button>
              <button class="pdp-nav next" type="button" onclick="lightboxNav(1, event)" aria-label="Imagen siguiente">${ICONS.chevR}</button>` : ''}
            <span class="pdp-hint">Toca la imagen para hacer zoom</span>
          </div>
        </div>
        <div class="pdp-info">
          <a class="pdp-brand" href="${brandHash(p.brand)}">${escapeHtml(p.brand)}<small>Ver sus ${brandCount} productos ${ICONS.arrow}</small></a>
          <h1 class="pdp-name">${escapeHtml(prettyName(p))}</h1>
          <div class="pdp-raw">${escapeHtml(p.name)}</div>
          ${badges.length ? `<div class="pdp-badges">${badges.join('')}</div>` : ''}
          <div class="pdp-code">
            <span>Código</span><b>${escapeHtml(p.code)}</b>
            <button type="button" class="pdp-copy" onclick="copyCode('${escapeHtml(p.code)}', this)" aria-label="Copiar código">${ICONS.copy}<span>Copiar</span></button>
          </div>
          <div class="pdp-avail is-${lvl.key}"><i></i><span>${escapeHtml(lvl.label)}</span></div>
          ${buy}
          <p class="pdp-note">${ICONS.chat}Pedido mayorista: agrega las unidades que necesitas, genera tu pedido en Excel y tu vendedor te confirma por WhatsApp.</p>
          <div class="pdp-block">
            <h2 class="pdp-h">${tone === 'tech' || tone === 'home' ? 'Ficha técnica' : 'Detalles del producto'}</h2>
            <dl class="pdp-facts">${productFacts(p).map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd${k === 'Código de barras' || k === 'Modelo' ? ' class="mono"' : ''}>${escapeHtml(v)}</dd></div>`).join('')}</dl>
          </div>
          ${notas}
        </div>
      </div>
      <div class="pdp-rails">
        ${railHTML(rels, { title: 'Productos relacionados', sub: 'Se usan junto con este producto o lo reemplazan.' })}
        ${railHTML(similarProducts(p, 16), { title: `Similares en ${p.tipo !== 'Otros' ? p.tipo : catName(p.cat)}`, sub: 'Otras opciones del mismo tipo de producto.', more: c ? '#/c/' + c.id + (p.tipo !== 'Otros' ? '/' + slugify(p.tipo) : '') : '' })}
        ${railHTML(sameBrandProducts(p, 16), { title: `Más de ${p.brand}`, more: brandHash(p.brand), moreLabel: `Ver los ${brandCount}` })}
      </div>
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
    inCart.innerHTML = `${ICONS.check}En tu pedido: <b>${q} ${q === 1 ? 'unidad' : 'unidades'}</b> · <button type="button" class="link-btn" onclick="openOrderReview()">Ver pedido</button>`;
  }
  const add = document.querySelector('#pdpAdd span');
  if (add) add.textContent = q ? 'Agregar otra unidad' : 'Agregar al pedido';
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
