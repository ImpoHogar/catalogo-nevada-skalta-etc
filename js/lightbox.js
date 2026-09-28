// ============================================================
//  FICHA DEL PRODUCTO / VISOR DE FOTOS (zoom, gestos, codigo de barras)
// ============================================================
//  Al tocar la foto de un producto se abre su ficha: a la izquierda
//  la foto (con zoom, pellizco y flechas para pasar al codigo de
//  barras), a la derecha la informacion que YA existe en el catalogo:
//  marca, nombre, categoria, codigo, stock, detalles y productos
//  relacionados. No agrega datos nuevos: solo los presenta.
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
    return placeholderImg('Código no valido para barras');
  }
}

function getProductImages(p) {
  const photoSrc = productImgSrc(p);
  const barcodeSrc = barcodeDataURL(p.code);
  return [
    { src: photoSrc, caption: `${p.brand} · ${prettyName(p)}` },
    { src: barcodeSrc, caption: `Código de barras · ${p.code}` }
  ];
}

function openLightbox(pid, imgIndex) {
  const p = PRODUCTS_BY_ID[pid];
  if (!p) return;
  lightboxState.pid = pid;
  lightboxState.images = getProductImages(p);
  lightboxState.index = imgIndex;
  updateLightbox();
  renderLightboxInfo(p);
  const lb = document.getElementById('lightbox');
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
  const info = document.getElementById('lightboxInfo');
  if (info) info.scrollTop = 0;
}

// Panel derecho con la informacion del producto
function renderLightboxInfo(p) {
  const info = document.getElementById('lightboxInfo');
  if (!info) return;
  const meta = catMeta(p.categoria);
  const lvl = stockLevel(p);
  const agotado = lvl.key === 'out';
  const esNuevo = (typeof isProductNew === 'function') && isProductNew(p);
  const enPedido = (typeof qtyMap !== 'undefined' && qtyMap[p.id]) ? qtyMap[p.id] : 0;
  const specs = productSpecs(p);
  const model = modelCode(p);
  const rows = (model ? [{ label: 'Modelo', value: model }] : []).concat(specs);

  const tags = [];
  if (esNuevo) tags.push('<span class="lb-tag is-new">Nuevo ingreso</span>');
  tags.push(`<span class="lb-tag is-cat">${iconSVG(meta.icon)}${escapeHtml(meta.short)}</span>`);
  if (p.subtipo && p.subtipo !== 'Otros') tags.push(`<span class="lb-tag">${escapeHtml(p.subtipo)}</span>`);

  const notas = (p.notes && p.notes.length) ? `
    <div class="lb-section">
      <h4 class="lb-section-title">Detalles</h4>
      <div class="lb-notes">${p.notes.map(n => `<span class="lb-note">${escapeHtml(n)}</span>`).join('')}</div>
    </div>` : '';

  const rels = (typeof getRelatedProducts === 'function') ? getRelatedProducts(p.id) : [];
  const relacionados = rels.length ? `
    <div class="lb-section">
      <h4 class="lb-section-title">Productos relacionados</h4>
      <div class="lb-related">
        ${rels.map(r => {
          const rp = r.product;
          const rl = stockLevel(rp);
          return `
          <button type="button" class="lb-rel" onclick="openLightbox(${rp.id}, 0)">
            <img src="${productImgSrc(rp)}" alt="">
            <span><span class="lb-rel-brand">${escapeHtml(rp.brand)} · ${relacionEtiqueta(r.tipo)}</span><span class="lb-rel-name">${escapeHtml(prettyName(rp))}</span></span>
            <span class="lb-stock is-${rl.key}">${escapeHtml(rl.short)}</span>
          </button>`;
        }).join('')}
      </div>
    </div>` : '';

  const buy = agotado
    ? `<div class="lb-soldout">Este producto está agotado por ahora.</div>`
    : `<div class="lb-buy">
        <div class="lb-stepper" role="group" aria-label="Cantidad">
          <button type="button" onclick="changeQty(${p.id},-1)" aria-label="Quitar una unidad">−</button>
          <input type="number" min="0" inputmode="numeric" value="${enPedido}" id="lb-qty-${p.id}" onchange="setQty(${p.id}, this.value)" onfocus="this.select()" aria-label="Cantidad">
          <button type="button" onclick="changeQty(${p.id},1)" aria-label="Agregar una unidad">+</button>
        </div>
        <button type="button" class="btn btn-primary lb-add" onclick="changeQty(${p.id},1)">${enPedido ? 'Agregar otra unidad' : 'Agregar al pedido'}</button>
      </div>
      <div class="lb-incart" id="lb-incart-${p.id}"${enPedido ? '' : ' hidden'}>En tu pedido: <b>${enPedido} ${enPedido === 1 ? 'unidad' : 'unidades'}</b></div>`;

  info.className = `lightbox-info cat-${catSlug(p.categoria)} is-${meta.group}`;
  info.innerHTML = `
    <div class="lb-kicker"><span class="lb-brand">${escapeHtml(p.brand)}</span></div>
    <h2 class="lb-name">${escapeHtml(prettyName(p))}</h2>
    <div class="lb-raw">${escapeHtml(p.name)}</div>
    <div class="lb-tags">${tags.join('')}</div>
    <div class="lb-availability is-${lvl.key}"><i></i><span>${escapeHtml(lvl.label)}</span></div>
    ${buy}
    <dl class="lb-facts">
      <div class="lb-fact"><dt>Código de barras</dt><dd class="code">${escapeHtml(p.code)}</dd></div>
      ${rows.map(r => `<div class="lb-fact"><dt>${escapeHtml(r.label)}</dt><dd>${escapeHtml(r.value)}</dd></div>`).join('')}
    </dl>
    ${notas}
    ${relacionados}
    <div class="lb-actions">
      <button type="button" class="link-btn" onclick="closeLightbox(); jumpToProduct(${p.id});">Ir al producto en el catálogo ${ICONS.arrow}</button>
    </div>`;
}

// Cuando cambia la cantidad (desde la ficha o la tarjeta) se refresca la
// ficha abierta sin volver a dibujarla entera.
function refreshLightboxQty(id) {
  const lb = document.getElementById('lightbox');
  if (!lb || !lb.classList.contains('open') || lightboxState.pid !== id) return;
  const q = qtyMap[id] || 0;
  const input = document.getElementById('lb-qty-' + id);
  if (input) input.value = q;
  const inCart = document.getElementById('lb-incart-' + id);
  if (inCart) {
    inCart.hidden = !q;
    inCart.innerHTML = `En tu pedido: <b>${q} ${q === 1 ? 'unidad' : 'unidades'}</b>`;
  }
  const add = document.querySelector('#lightboxInfo .lb-add');
  if (add) add.textContent = q ? 'Agregar otra unidad' : 'Agregar al pedido';
}

function updateLightbox() {
  const { images, index } = lightboxState;
  const img = document.getElementById('lightboxImg');
  const cap = document.getElementById('lightboxCaption');
  img.src = images[index].src;
  img.alt = images[index].caption;
  cap.textContent = images[index].caption;
  img.style.transform = 'scale(1)';
  img.classList.remove('zoomed');
  lightboxState.scale = 1;
  document.querySelectorAll('#lightboxTabs button').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.i) === index);
  });
}

function lightboxNav(delta, evt) {
  if (evt) evt.stopPropagation();
  const n = lightboxState.images.length;
  lightboxState.index = (lightboxState.index + delta + n) % n;
  updateLightbox();
}

// Salta directo a la foto (0) o al codigo de barras (1)
function lightboxGoTo(i, evt) {
  if (evt) evt.stopPropagation();
  if (!lightboxState.images[i]) return;
  lightboxState.index = i;
  updateLightbox();
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

function toggleZoom(e) {
  const img = document.getElementById('lightboxImg');
  if (lightboxState.scale === 1) {
    lightboxState.scale = 2.5;
    img.classList.add('zoomed');
    const rect = img.getBoundingClientRect();
    const originX = ((e.clientX - rect.left) / rect.width) * 100;
    const originY = ((e.clientY - rect.top) / rect.height) * 100;
    img.style.transformOrigin = `${originX}% ${originY}%`;
  } else {
    lightboxState.scale = 1;
    img.classList.remove('zoomed');
    img.style.transformOrigin = 'center center';
  }
  img.style.transform = `scale(${lightboxState.scale})`;
}

function wheelZoom(e) {
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
    pinchStartDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    pinchStartScale = lightboxState.scale;
  }
}

function touchZoomMove(e) {
  if (e.touches.length === 2 && pinchStartDist) {
    e.preventDefault();
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const img = document.getElementById('lightboxImg');
    let s = pinchStartScale * (dist / pinchStartDist);
    s = Math.min(4, Math.max(1, s));
    lightboxState.scale = s;
    img.classList.toggle('zoomed', s > 1);
    img.style.transform = `scale(${s})`;
  }
}

function touchZoomEnd(e) {
  if (e.touches.length < 2) pinchStartDist = null;
}

document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  if (!lb || !lb.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lightboxNav(-1);
  if (e.key === 'ArrowRight') lightboxNav(1);
});