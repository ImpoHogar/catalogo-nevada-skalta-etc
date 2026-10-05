// ============================================================
//  HISTORIAL DE PEDIDOS
// ============================================================
//  Se guarda solo en el navegador del cliente. El catalogo no tiene
//  backend: aca no hay registro central de lo que piden.
// ============================================================

function saveOrderToHistory(name, phone, items) {
  try {
    const history = JSON.parse(localStorage.getItem('impohogar_tec_order_history') || '[]');
    history.unshift({
      date: new Date().toISOString(),
      name,
      phone,
      items,
      totalUnits: items.reduce((sum, it) => sum + it.qty, 0)
    });
    localStorage.setItem('impohogar_tec_order_history', JSON.stringify(history.slice(0, ORDER_HISTORY_LIMIT)));
  } catch (err) { /* si no hay localStorage disponible, simplemente no se guarda */ }
}

function getOrderHistory() {
  try {
    return JSON.parse(localStorage.getItem('impohogar_tec_order_history') || '[]');
  } catch (err) {
    return [];
  }
}

function openOrderHistory() {
  renderOrderHistory();
  document.getElementById('historyModal').classList.add('open');
}

function closeOrderHistory() {
  document.getElementById('historyModal').classList.remove('open');
}

function formatHistoryDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
}

function renderOrderHistory() {
  const list = document.getElementById('historyList');
  const history = getOrderHistory();
  if (history.length === 0) {
    list.innerHTML = `<div class="order-empty">${ICONS.clock}<b>Todavía no has generado ningún pedido</b>Cuando generes uno, va a quedar guardado aquí para verlo o repetirlo.</div>`;
    return;
  }
  list.innerHTML = history.map((order, idx) => {
    const units = order.totalUnits || order.items.reduce((s, it) => s + it.qty, 0);
    let na = 0;
    const itemsHtml = order.items.map(it => {
      const p = PRODUCTS.find(x => x.code === it.code);
      const ok = p && !p.hidden && (parseInt(p.stock) || 0) > 0;
      if (!ok) na++;
      return `<div class="history-line${ok ? '' : ' is-na'}"><b>${it.qty}×</b><span>${escapeHtml(p ? prettyName(p) : it.name)}</span>${ok ? '' : `<em>${p && !p.hidden ? 'Agotado' : 'Ya no está'}</em>`}</div>`;
    }).join('');
    // Estado: si hoy se puede repetir completo o cuantos productos faltan.
    const estado = na
      ? `<span class="history-state is-warn">${ICONS.warn}${na} ${na === 1 ? 'producto no disponible' : 'productos no disponibles'}</span>`
      : `<span class="history-state is-ok">${ICONS.check}Todo disponible para repetir</span>`;
    return `
      <div class="history-item">
        <div class="history-top">
          <span class="history-ic">${ICONS.file}</span>
          <div class="history-head">
            <div class="history-date">Pedido ${escapeHtml(new Date(order.date).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' }))}</div>
            <div class="history-meta">${escapeHtml(new Date(order.date).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }))} · ${escapeHtml(order.name || 'Sin nombre')}${order.phone ? ' · ' + escapeHtml(order.phone) : ''}</div>
          </div>
        </div>
        <div class="history-stats"><span><b>${order.items.length.toLocaleString('es-CR')}</b> ${order.items.length === 1 ? 'producto' : 'productos'}</span><span><b>${units.toLocaleString('es-CR')}</b> ${units === 1 ? 'unidad' : 'unidades'}</span>${estado}</div>
        <div class="history-actions">
          <button type="button" class="btn btn-outline" onclick="toggleHistoryLines(this)" aria-expanded="false">${ICONS.eye}<span>Ver</span></button>
          <button type="button" class="btn btn-primary history-repeat" onclick="repeatOrder(${idx})">${ICONS.repeat}Repetir pedido</button>
        </div>
        <div class="history-lines" hidden>${itemsHtml}</div>
      </div>`;
  }).join('');
}

function toggleHistoryLines(btn) {
  const lines = btn.closest('.history-item').querySelector('.history-lines');
  lines.hidden = !lines.hidden;
  btn.setAttribute('aria-expanded', String(!lines.hidden));
  btn.querySelector('span').textContent = lines.hidden ? 'Ver' : 'Ocultar';
}

// ------------------------------------------------------------
//  REPETIR PEDIDO
// ------------------------------------------------------------
//  Pregunta antes de agregar. Los productos que ya no existen o estan
//  agotados no rompen nada: se informan y se agregan los demas. Las
//  cantidades se SUMAN a lo que ya tenga el pedido actual.
let repeatPlan = null;

function repeatOrder(idx) {
  const order = getOrderHistory()[idx];
  if (!order) return;
  const ok = [], na = [];
  order.items.forEach(it => {
    const p = PRODUCTS.find(x => x.code === it.code);
    if (p && !p.hidden && PRODUCTS_BY_ID[p.id] && (parseInt(p.stock) || 0) > 0) ok.push({ p, qty: it.qty });
    else na.push({ name: p ? prettyName(p) : it.name, qty: it.qty, why: p && !p.hidden ? 'Agotado' : 'Ya no está en el catálogo' });
  });
  repeatPlan = { ok, na };
  const units = ok.reduce((s, x) => s + x.qty, 0);
  document.getElementById('repeatBody').innerHTML = `
    <p class="form-intro">Pedido del ${escapeHtml(formatHistoryDate(order.date))}</p>
    <div class="confirm-stats"><div><b>${ok.length.toLocaleString('es-CR')}</b><span>${ok.length === 1 ? 'producto' : 'productos'} para agregar</span></div><div><b>${units.toLocaleString('es-CR')}</b><span>unidades</span></div></div>
    ${Object.keys(qtyMap).length ? '<p class="repeat-note">Tu pedido actual ya tiene productos: las cantidades se suman.</p>' : ''}
    ${na.length ? `<div class="order-alert">${ICONS.warn}<span><b>${na.length} ${na.length === 1 ? 'producto no se puede agregar' : 'productos no se pueden agregar'}</b> (se agregan los demás):
      <ul class="repeat-na">${na.map(x => `<li>${escapeHtml(x.name)} <em>${escapeHtml(x.why)}</em></li>`).join('')}</ul></span></div>` : ''}`;
  document.getElementById('repeatGo').disabled = !ok.length;
  document.getElementById('repeatModal').classList.add('open');
}

function closeRepeatModal() {
  document.getElementById('repeatModal').classList.remove('open');
  repeatPlan = null;
}

function confirmRepeatOrder() {
  if (!repeatPlan) return;
  const { ok, na } = repeatPlan;
  window.__bulkCart = true;
  try { ok.forEach(x => setQty(x.p.id, (qtyMap[x.p.id] || 0) + x.qty)); } finally { window.__bulkCart = false; }
  closeRepeatModal();
  closeOrderHistory();
  openOrderReview();
  notify(`✓ ${ok.length} ${ok.length === 1 ? 'producto agregado' : 'productos agregados'} a tu pedido${na.length ? ` · ${na.length} no disponibles` : ''}.`);
}
