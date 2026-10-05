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
  if (v > prev && !window.__bulkCart && typeof showAddedToast === 'function') showAddedToast(id, v);
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

function cartTotals() {
  const ids = Object.keys(qtyMap);
  return { products: ids.length, units: ids.reduce((sum, id) => sum + qtyMap[id], 0) };
}

// Lineas del pedido cuya cantidad supera lo disponible en bodega.
function cartShortages() {
  return Object.keys(qtyMap).map(id => PRODUCTS_BY_ID[id]).filter(p => p && qtyMap[p.id] > (parseInt(p.stock) || 0));
}

function plural(n, uno, varios) { return `${n.toLocaleString('es-CR')} ${n === 1 ? uno : varios}`; }

function updateOrderBar() {
  const { products, units } = cartTotals();
  document.getElementById('selCount').textContent = products;
  document.getElementById('selUnits').textContent = units;
  document.getElementById('genBtn').disabled = products === 0;

  const bar = document.getElementById('orderBar');
  if (bar) bar.classList.toggle('has-items', products > 0);
  document.body.classList.toggle('has-order', products > 0);
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

function confirmClearCart() {
  const { products } = cartTotals();
  if (!products) return;
  if (confirm(`¿Vaciar tu pedido? Se quitarán los ${products} productos.`)) clearCart();
}

// Linea del pedido: producto, disponibilidad, cantidad y eliminar.
function orderLineHTML(p) {
  const q = qtyMap[p.id];
  const st = parseInt(p.stock) || 0;
  const lvl = stockLevel(p);
  const short = q > st;
  const warn = !short ? '' : st <= 0
    ? `<div class="oi-warn">${ICONS.warn}<span><b>Agotado por ahora.</b> Tu vendedor te confirma la próxima entrada.</span></div>`
    : `<div class="oi-warn">${ICONS.warn}<span><b>Disponibilidad limitada:</b> hay ${st.toLocaleString('es-CR')} ${st === 1 ? 'unidad' : 'unidades'}. <button type="button" class="link-btn" onclick="setQty(${p.id}, ${st})">Ajustar a ${st.toLocaleString('es-CR')}</button></span></div>`;
  return `
    <div class="order-item${short ? ' is-short' : ''}">
      <a href="#/p/${p.id}" onclick="closeOrderReview()" class="oi-img"><img src="${productImgSrc(p)}" alt="${escapeHtml(prettyName(p))}" loading="lazy"></a>
      <div class="oi-info">
        <div class="oi-brand">${escapeHtml(p.brand)}</div>
        <a class="oi-name" href="#/p/${p.id}" onclick="closeOrderReview()">${escapeHtml(prettyName(p))}</a>
        <div class="oi-code">Código ${escapeHtml(p.code)}</div>
        <div class="oi-avail is-${lvl.key}"><i></i>${escapeHtml(lvl.label)}${lvl.qty ? ` · ${escapeHtml(lvl.qty)}` : ''}</div>
      </div>
      <div class="oi-side">
        <div class="oi-qty" role="group" aria-label="Cantidad">
          <button type="button" onclick="changeQty(${p.id},-1)" aria-label="Quitar una unidad">−</button>
          <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" value="${q}" onchange="setQty(${p.id}, this.value)" onfocus="this.select()" class="oi-qty-input" aria-label="Cantidad de ${escapeHtml(prettyName(p))}">
          <button type="button" onclick="changeQty(${p.id},1)" aria-label="Agregar una unidad">+</button>
        </div>
        <button type="button" class="oi-remove" onclick="setQty(${p.id},0)">${ICONS.trash}Eliminar</button>
      </div>
      ${warn}
    </div>`;
}

function renderOrderReview() {
  const list = document.getElementById('orderList');
  const items = Object.keys(qtyMap).map(id => PRODUCTS_BY_ID[id]).filter(Boolean)
    .sort((a, b) => a.brand.localeCompare(b.brand, 'es') || prettyName(a).localeCompare(prettyName(b), 'es', { numeric: true }));
  const { products, units } = cartTotals();
  const shortages = cartShortages();
  if (!products) {
    list.innerHTML = `<div class="order-empty">${ICONS.bag}<b>Tu pedido está vacío</b>Toca “Agregar” en cualquier producto del catálogo, o repite un pedido anterior desde el historial.
      <div class="oe-actions"><button type="button" class="btn btn-outline" onclick="closeOrderReview();openOrderHistory()">${ICONS.clock}Historial de pedidos</button><a class="btn btn-primary" href="#/todo" onclick="closeOrderReview()">Ver el catálogo</a></div></div>`;
  } else {
    let lastBrand = '';
    list.innerHTML = (shortages.length ? `<div class="order-alert">${ICONS.warn}<span><b>${plural(shortages.length, 'producto tiene', 'productos tienen')} disponibilidad limitada.</b> Puedes ajustar la cantidad o dejarla: tu vendedor te confirma.</span></div>` : '') +
      items.map(p => {
        const head = p.brand !== lastBrand ? `<div class="oi-group">${escapeHtml(p.brand)}<span>${items.filter(x => x.brand === p.brand).length}</span></div>` : '';
        lastBrand = p.brand;
        return head + orderLineHTML(p);
      }).join('');
  }
  document.getElementById('orderModalCount').textContent = products.toLocaleString('es-CR');
  document.getElementById('orderModalUnits').textContent = units.toLocaleString('es-CR');
  const sum = document.getElementById('orderHeadSum');
  if (sum) sum.textContent = products ? `${plural(products, 'producto', 'productos')} · ${plural(units, 'unidad', 'unidades')}` : 'Sin productos todavía';
  const gen = document.getElementById('orderGenBtn');
  if (gen) gen.disabled = !products;
  const clr = document.getElementById('orderClearBtn');
  if (clr) clr.hidden = !products;
}
