// ============================================================
//  PRODUCTOS RELACIONADOS
// ============================================================
//  Une productos que conviene ofrecer juntos o que se reemplazan
//  entre si. En la tarjeta aparece el boton "Relacionados" y en la
//  ficha la seccion "Productos relacionados", con cantidad a pedir.
//
//  Cada entrada cubre las dos direcciones (no hace falta repetirla al
//  reves) y se escribe con los CODIGOS DE BARRAS exactos:
//
//    { a: "886540006029", b: "886540006623", tipo: 'complemento' },
//
//  tipos:  'complemento'  -> se usa junto con (cable + cargador,
//                            limpiador + tonico, etc.)
//          'alternativa'  -> reemplaza a (otro modelo, otro tono)
//
//  Vacio = el boton no aparece en ningun producto.
// ============================================================

const RELACIONES = [
];

function relacionEtiqueta(tipo) {
  return tipo === 'alternativa' ? 'Alternativa'
       : tipo === 'complemento' ? 'Complemento'
       : 'Relacionado';
}

PRODUCTS.forEach(p => { PRODUCTS_BY_ID[p.id] = p; });

const PRODUCTS_BY_CODE = {};
PRODUCTS.forEach(p => { PRODUCTS_BY_CODE[p.code] = p; });

function getRelatedProducts(pid) {
  const rels = [];
  const p = PRODUCTS_BY_ID[pid];
  if (!p) return rels;
  RELACIONES.forEach(r => {
    const a = PRODUCTS_BY_CODE[r.a];
    const b = PRODUCTS_BY_CODE[r.b];
    if (!a || !b) return;
    if (a.id === pid) rels.push({ product: b, tipo: r.tipo });
    else if (b.id === pid) rels.push({ product: a, tipo: r.tipo });
  });
  return rels;
}

function dupePanelHTML(pid) {
  const rels = getRelatedProducts(pid);
  if (!rels.length) return '';
  const items = rels.map(r => {
    const rp = r.product;
    const imgSrc = productImgSrc(rp);
    const label = relacionEtiqueta(r.tipo);
    const stockNum = parseInt(rp.stock) || 0;
    const agotado = stockNum <= 0;
    const qty = qtyMap[rp.id] || 0;
    const qtyControls = agotado
      ? `<span class="dupe-item-agotado">Sin stock</span>`
      : `<button type="button" onclick="event.stopPropagation(); dupeChangeQty(${rp.id}, -1)" aria-label="Quitar una unidad">−</button>
         <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" value="${qty}" id="dupe-qty-${rp.id}"
                onclick="event.stopPropagation()" onfocus="this.select()"
                onchange="event.stopPropagation(); dupeSetQty(${rp.id}, this.value)">
         <button type="button" onclick="event.stopPropagation(); dupeChangeQty(${rp.id}, 1)" aria-label="Agregar una unidad">+</button>`;
    return `<div class="dupe-item">
      <img src="${imgSrc}" alt="" onclick="event.stopPropagation(); jumpToProduct(${rp.id})">
      <div class="dupe-item-text" onclick="event.stopPropagation(); jumpToProduct(${rp.id})" title="Ir a este producto"><div class="dupe-item-brand">${escapeHtml(rp.brand)} · ${label}</div><div class="dupe-item-name">${escapeHtml(rp.name)}</div></div>
      <div class="dupe-item-qty">${qtyControls}</div>
    </div>`;
  }).join('');
  return `
    <button type="button" class="dupe-btn" onclick="event.stopPropagation(); toggleDupePanel(${pid})" aria-controls="dupe-panel-${pid}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/></svg>
      Relacionados
      <span class="dupe-count">${rels.length}</span>
      <svg class="dupe-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <div class="dupe-panel" id="dupe-panel-${pid}">
      <div class="dupe-label">Relacionado con:</div>
      ${items}
    </div>`;
}

function dupeSetQty(id, val) {
  setQty(id, val);
  const dInput = document.getElementById('dupe-qty-' + id);
  if (dInput) dInput.value = qtyMap[id] || 0;
}

function dupeChangeQty(id, delta) {
  const newVal = Math.max(0, (qtyMap[id] || 0) + delta);
  dupeSetQty(id, newVal);
}

function toggleDupePanel(pid) {
  const panel = document.getElementById('dupe-panel-' + pid);
  if (panel) panel.classList.toggle('open');
}

function jumpToProduct(pid) {
  const card = document.getElementById('card-' + pid);
  if (!card) { setStatus('Ese producto no está visible con los filtros actuales.', true); return; }
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.classList.add('dupe-highlight');
  setTimeout(() => card.classList.remove('dupe-highlight'), 1600);
}
