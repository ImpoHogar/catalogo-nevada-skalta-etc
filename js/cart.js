// ============================================================
//  CARRITO
// ============================================================
//  Cantidades, guardado en el navegador del cliente y panel de
//  revision del pedido.
// ============================================================

const qtyMap = {};

function setQty(id, val) {
  const v = Math.max(0, parseInt(val) || 0);
  const prev = qtyMap[id] || 0;
  if (v > 0) qtyMap[id] = v; else delete qtyMap[id];
  // El mismo producto puede estar a la vez en el listado, en carriles y en
  // la ficha: se actualizan todos.
  document.querySelectorAll(`[data-qty-for="${id}"]`).forEach(i => { i.value = v; });
  document.querySelectorAll(`[data-qty-badge="${id}"]`).forEach(b => { b.textContent = v || ''; });
  document.querySelectorAll(`[data-card="${id}"]`).forEach(card => {
    card.classList.toggle('has-qty', v > 0);
    if (v > prev) { card.classList.remove('just-added'); void card.offsetWidth; card.classList.add('just-added'); }
  });
  if (v > prev && typeof showAddedToast === 'function') showAddedToast(id, v);
  if (typeof refreshLightboxQty === 'function') refreshLightboxQty(id);
  saveCartToStorage();
  updateOrderBar();
}

function changeQty(id, delta) {
  // La cantidad sale del pedido (no del input): asi funciona tambien
  // desde la ficha o el panel del pedido aunque la tarjeta no este en pantalla.
  const newVal = Math.max(0, (qtyMap[id] || 0) + delta);
  setQty(id, newVal);
}

function saveCartToStorage() {
  try {
    localStorage.setItem('impohogar_tec_cart', JSON.stringify(qtyMap));
  } catch (err) { /* localStorage no disponible, seguimos sin guardar */ }
}

function restoreCartFromStorage() {
  try {
    const saved = localStorage.getItem('impohogar_tec_cart');
    if (!saved) return;
    const savedMap = JSON.parse(saved);
    // Se carga antes de dibujar el catalogo: basta con llenar el pedido.
    Object.keys(savedMap).forEach(id => {
      const v = parseInt(savedMap[id]) || 0;
      if (PRODUCTS_BY_ID[id] && v > 0) qtyMap[Number(id)] = v;
    });
    updateOrderBar();
  } catch (err) { /* si algo esta corrupto, simplemente no restauramos */ }
}

function clearCart() {
  Object.keys(qtyMap).forEach(id => setQty(Number(id), 0));
  try { localStorage.removeItem('impohogar_tec_cart'); } catch (err) {}
}

function updateOrderBar() {
  const ids = Object.keys(qtyMap);
  const units = ids.reduce((sum, id) => sum + qtyMap[id], 0);
  document.getElementById('selCount').textContent = ids.length;
  document.getElementById('selUnits').textContent = units;
  document.getElementById('genBtn').disabled = ids.length === 0;

  const bar = document.getElementById('orderBar');
  if (bar) bar.classList.toggle('has-items', ids.length > 0);
  document.body.classList.toggle('has-order', ids.length > 0);
  document.querySelectorAll('[data-cart-units]').forEach(b => { b.textContent = units > 99 ? '99+' : units; b.hidden = !units; });
  const badge = document.getElementById('reviewBadge');
  if (units > 0) {
    badge.textContent = units;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
  if (document.getElementById('orderModal').classList.contains('open')) {
    renderOrderReview();
  }
}

function openOrderReview() {
  renderOrderReview();
  document.getElementById('orderModal').classList.add('open');
}

function closeOrderReview() {
  document.getElementById('orderModal').classList.remove('open');
}

function renderOrderReview() {
  const list = document.getElementById('orderList');
  const ids = Object.keys(qtyMap);
  if (ids.length === 0) {
    list.innerHTML = '<div class="order-empty"><b>Tu pedido está vacío</b>Toca “Agregar” en cualquier producto del catálogo.</div>';
  } else {
    list.innerHTML = ids.map(id => {
      const p = PRODUCTS_BY_ID[id];
      const imgSrc = productImgSrc(p);
      return `
        <div class="order-item">
          <img src="${imgSrc}" alt="${escapeHtml(prettyName(p))}">
          <div class="oi-info">
            <div class="oi-brand">${escapeHtml(p.brand)}</div>
            <div class="oi-name">${escapeHtml(prettyName(p))}</div>
            <div class="oi-code">${escapeHtml(p.code)}</div>
          </div>
          <div class="oi-qty">
            <button type="button" onclick="changeQty(${p.id},-1)">−</button>
            <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" value="${qtyMap[id]}" onchange="setQty(${p.id}, this.value)" onfocus="this.select()" class="oi-qty-input">
            <button type="button" onclick="changeQty(${p.id},1)">+</button>
          </div>
          <button type="button" class="oi-remove" onclick="setQty(${p.id},0)">Quitar</button>
        </div>`;
    }).join('');
  }
  const units = ids.reduce((sum, id) => sum + qtyMap[id], 0);
  document.getElementById('orderModalCount').textContent = ids.length;
  document.getElementById('orderModalUnits').textContent = units;
}
