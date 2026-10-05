// ============================================================
//  GENERACION DEL PEDIDO
// ============================================================
//  Excel del pedido, ZIP de fotos, datos del cliente y envio por
//  WhatsApp al vendedor.
// ============================================================

let currentCustomer = { name: '', phone: '' };

let lastOrderSummary = { name: '', phone: '', totalProducts: 0, totalUnits: 0 };

let pendingPhotosZip = null;

// Ultimo Excel generado: se puede volver a descargar desde "Pedido generado".
let lastExcel = null;

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function downloadLastExcel() {
  if (lastExcel) downloadBlob(lastExcel.blob, lastExcel.filename);
}

// ------------------------------------------------------------
//  ¿TODO LISTO? (confirmacion antes de generar)
// ------------------------------------------------------------
//  Muestra el resumen del pedido, avisa si algo tiene disponibilidad
//  limitada y pide nombre y telefono (se recuerdan en este navegador).
//  Se mantiene el nombre openCustomerModal: el boton "Generar pedido"
//  de la barra lo usa.
function openCustomerModal() {
  const ids = Object.keys(qtyMap);
  if (ids.length === 0) {
    setStatus('Selecciona al menos un producto.', true);
    return;
  }
  try {
    const saved = JSON.parse(localStorage.getItem('impohogar_tec_customer') || '{}');
    document.getElementById('custName').value = saved.name || '';
    document.getElementById('custPhone').value = saved.phone || '';
  } catch (err) {}
  const { products, units } = cartTotals();
  const shortages = cartShortages();
  document.getElementById('confirmProducts').textContent = products.toLocaleString('es-CR');
  document.getElementById('confirmUnits').textContent = units.toLocaleString('es-CR');
  document.getElementById('confirmBrands').textContent = new Set(ids.map(id => PRODUCTS_BY_ID[id].brand)).size;
  document.getElementById('confirmWarn').innerHTML = shortages.length ? `
    <div class="order-alert">${ICONS.warn}<span><b>${plural(shortages.length, 'producto tiene', 'productos tienen')} disponibilidad limitada:</b>
      ${shortages.slice(0, 4).map(p => escapeHtml(prettyName(p))).join(', ')}${shortages.length > 4 ? '…' : ''}. Tu vendedor te confirma las cantidades.</span></div>` : '';
  document.getElementById('custError').textContent = '';
  closeOrderReview();
  document.getElementById('customerModal').classList.add('open');
}

function closeCustomerModal() {
  document.getElementById('customerModal').classList.remove('open');
}

function backToOrder() {
  closeCustomerModal();
  openOrderReview();
}

function confirmCustomerInfo() {
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  if (!name || !phone) {
    document.getElementById('custError').textContent = 'Por favor completa tu nombre y teléfono.';
    return;
  }
  currentCustomer = { name, phone };
  try {
    localStorage.setItem('impohogar_tec_customer', JSON.stringify(currentCustomer));
  } catch (err) {}
  closeCustomerModal();
  generateExcel();
}

async function generateExcel() {
  try {
    if (typeof ExcelJS === 'undefined') {
      setStatus('Error: librería Excel no disponible.', true);
      return;
    }
    const ids = Object.keys(qtyMap);
    if (ids.length === 0) {
      setStatus('Selecciona al menos un producto.', true);
      return;
    }
    setStatus('Generando tu pedido...', false);

    const customerName = (currentCustomer.name || '').trim();
    const customerPhone = (currentCustomer.phone || '').trim();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Pedido');

    sheet.getColumn(1).width = 20;
    sheet.getColumn(2).width = 50;
    sheet.getColumn(3).width = 20;

    const headerRow = sheet.addRow(['Codigo de barras', 'Descripcion', 'Cantidad']);
    headerRow.font = { bold: true };

    const historyItems = [];
    const photoItems = [];

    ids.forEach(id => {
      const p = PRODUCTS_BY_ID[id];
      historyItems.push({ code: p.code, name: p.name, brand: p.brand, qty: qtyMap[id] });
      sheet.addRow([p.code, p.name, qtyMap[id]]);
      if (p.img) {
        photoItems.push(p);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const today = new Date().toISOString().slice(0, 10);
    const fileTag = customerName ? `_${sanitizeFilename(customerName)}` : '';
    lastExcel = { blob, filename: `Pedido${fileTag}_${today}.xlsx` };
    downloadBlob(lastExcel.blob, lastExcel.filename);

    setStatus('✓ Excel descargado.', false);
    saveOrderToHistory(customerName, customerPhone, historyItems);
    lastOrderSummary = {
      name: customerName,
      phone: customerPhone,
      totalProducts: historyItems.length,
      totalUnits: historyItems.reduce((sum, it) => sum + it.qty, 0)
    };

    // Aviso a Google Analytics de que se genero un pedido, sin mandar
    // ningun dato personal del cliente (solo cantidades).
    if (typeof gtag === 'function') {
      gtag('event', 'generar_pedido', {
        cantidad_productos: lastOrderSummary.totalProducts,
        cantidad_unidades: lastOrderSummary.totalUnits
      });
    }

    clearCart();

    // "Pedido generado" se abre enseguida; el ZIP de fotos se arma
    // mientras tanto y su boton se activa cuando esta listo.
    pendingPhotosZip = null;
    showOrderDone(photoItems.length);
    if (photoItems.length > 0) {
      await prepareOrderPhotosZip(photoItems, customerName, today, fileTag);
      refreshDonePhotos();
    }
  } catch (err) {
    console.error(err);
    setStatus('Error al generar: ' + err.message, true);
  }
}

async function imageToJpegBlob(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('No se pudo descargar ' + url);
  const blob = await resp.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  return await new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob fallo')), 'image/jpeg', 0.85);
  });
}

async function prepareOrderPhotosZip(photoItems, customerName, today, fileTag) {
  try {
    if (typeof JSZip === 'undefined') { pendingPhotosZip = null; return; }
    const zip = new JSZip();
    await Promise.all(photoItems.map(async p => {
      try {
        const jpegBlob = await imageToJpegBlob(productImgSrc(p));
        const safeName = sanitizeFilename(`${p.brand}_${p.name}`);
        zip.file(`${safeName}_${p.code}.jpg`, jpegBlob);
      } catch (e) {
        console.error('No se pudo incluir la foto de', p.code, e);
      }
    }));
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    pendingPhotosZip = { blob: zipBlob, filename: `Fotos_Pedido${fileTag}_${today}.zip` };
  } catch (err) {
    console.error('No se pudo generar el zip de fotos', err);
    pendingPhotosZip = null;
  }
}

function downloadPendingPhotosZip() {
  if (!pendingPhotosZip) return;
  downloadBlob(pendingPhotosZip.blob, pendingPhotosZip.filename);
}

// ------------------------------------------------------------
//  PEDIDO GENERADO
// ------------------------------------------------------------
let donePhotosExpected = 0;
function showOrderDone(nPhotos) {
  donePhotosExpected = nPhotos;
  const s = lastOrderSummary;
  document.getElementById('doneSummary').innerHTML =
    `<span><b>${s.totalProducts.toLocaleString('es-CR')}</b> ${s.totalProducts === 1 ? 'producto' : 'productos'}</span><span><b>${s.totalUnits.toLocaleString('es-CR')}</b> ${s.totalUnits === 1 ? 'unidad' : 'unidades'}</span>`;
  refreshDonePhotos();
  closeOrderReview();
  document.getElementById('doneModal').classList.add('open');
}
function refreshDonePhotos() {
  const btn = document.getElementById('donePhotosBtn');
  if (!btn) return;
  btn.hidden = !donePhotosExpected;
  btn.disabled = !pendingPhotosZip;
  btn.querySelector('span').textContent = pendingPhotosZip ? `Descargar fotos (${donePhotosExpected})` : 'Preparando fotos…';
}
function closeOrderDone() {
  document.getElementById('doneModal').classList.remove('open');
}
function doneSendWhatsApp() {
  closeOrderDone();
  openSellerModal('pedido');
}
function doneKeepShopping() {
  closeOrderDone();
  if (currentRoute.view === 'product') return;
  navigate(lastListingHash && currentRoute.view !== 'home' ? lastListingHash : '#/');
}

// Compatibilidad con el flujo anterior (avisos "gracias" / fotos).
function showPhotosNoticeModal() { showOrderDone(donePhotosExpected); }
function hidePhotosNoticeModal() { openSellerModal('pedido'); }
function showThankYouModal() { showOrderDone(donePhotosExpected); }
function hideThankYouModal() { closeOrderDone(); openSellerModal('pedido'); }

// ------------------------------------------------------------
//  DESCARGA DE IMAGENES
// ------------------------------------------------------------
// Foto de un producto en JPG (ficha del producto).
async function downloadProductPhoto(pid, btn) {
  const p = PRODUCTS_BY_ID[pid];
  if (!p || !p.img) return;
  if (btn) btn.classList.add('is-busy');
  try {
    const jpeg = await imageToJpegBlob(productImgSrc(p));
    downloadBlob(jpeg, `${sanitizeFilename(`${p.brand}_${p.name}`)}_${p.code}.jpg`);
  } catch (e) {
    console.error(e);
    notify('No se pudo descargar la foto.', true);
  }
  if (btn) btn.classList.remove('is-busy');
}

// ZIP con las fotos de los productos que estan en el pedido actual.
async function downloadCartPhotos() {
  const items = Object.keys(qtyMap).map(id => PRODUCTS_BY_ID[id]).filter(p => p && p.img);
  if (!items.length) {
    notify(Object.keys(qtyMap).length ? 'Los productos de tu pedido todavía no tienen foto.' : 'Agrega productos a tu pedido para descargar sus fotos.', true);
    return;
  }
  notify(`Preparando ${items.length} ${items.length === 1 ? 'foto' : 'fotos'}…`);
  const today = new Date().toISOString().slice(0, 10);
  await prepareOrderPhotosZip(items, '', today, '');
  if (pendingPhotosZip) {
    downloadPendingPhotosZip();
    notify('✓ Fotos de tu pedido descargadas.');
  } else notify('No se pudieron preparar las fotos.', true);
}

// ------------------------------------------------------------
//  AYUDA
// ------------------------------------------------------------
function openHelp() { document.getElementById('helpModal').classList.add('open'); }
function closeHelp() { document.getElementById('helpModal').classList.remove('open'); }

// Tarjetas de vendedores: en la ventana de envio del pedido y en el pie.
function sellerPhoneLabel(phone) {
  const n = String(phone).replace(/^506/, '');
  return `(506) ${n.slice(0, 4)}-${n.slice(4)}`;
}
function sellerCardInner(s) {
  return `<img src="${s.img}" alt="${escapeHtml(s.name)} · ${escapeHtml(s.role)}" loading="lazy" width="480" height="480">
    <span class="seller-phone"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2zm4.5 12.1c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8.9-.1.2-.3.2-.5.1-.2-.1-1.1-.4-2-1.3-.7-.7-1.2-1.5-1.4-1.7-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4.1-.1 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.4 1 2.5c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3z"/></svg>${sellerPhoneLabel(s.phone)}</span>`;
}
// El ultimo vendedor que eligio el cliente sale primero y marcado
// ("Tu vendedor"). Se guarda solo en este navegador.
const SELLER_KEY = 'impohogar_tec_seller';
function savedSellerKey() {
  try { const k = localStorage.getItem(SELLER_KEY); return SELLERS[k] ? k : ''; } catch (e) { return ''; }
}
// Modo de la ventana de vendedores:
//   'pedido'   -> enviar el pedido recien generado
//   'consulta' -> preguntar por un producto (desde su ficha)
//   'contacto' -> escribir sin pedido
let sellerMode = 'pedido';
let sellerProduct = null;

function renderSellers() {
  const list = document.getElementById('sellerList');
  const mine = savedSellerKey();
  const entries = Object.entries(SELLERS).sort((a, b) => (b[0] === mine) - (a[0] === mine));
  const verb = sellerMode === 'pedido' ? 'Enviar pedido a' : 'Escribir a';
  if (list) list.innerHTML = entries.map(([key, s]) =>
    `<button type="button" class="seller-option${key === mine ? ' is-mine' : ''}" onclick="sendToSeller('${key}')" aria-label="${verb} ${escapeHtml(s.name)} por WhatsApp">${key === mine ? '<span class="seller-mine">Tu vendedor</span>' : ''}${sellerCardInner(s)}</button>`).join('');
  const foot = document.getElementById('footerSellers');
  if (foot) foot.innerHTML = Object.values(SELLERS).map(s =>
    `<a class="seller-option" href="https://wa.me/${s.phone}" target="_blank" rel="noopener" aria-label="Escribir a ${escapeHtml(s.name)} por WhatsApp">${sellerCardInner(s)}</a>`).join('');
}
document.addEventListener('DOMContentLoaded', renderSellers);

function openSellerModal(mode, pid) {
  sellerMode = mode || 'pedido';
  sellerProduct = pid ? PRODUCTS_BY_ID[pid] : null;
  const t = document.getElementById('sellerTitle');
  const n = document.getElementById('sellerNote');
  if (sellerMode === 'consulta' && sellerProduct) {
    t.textContent = '¿Tienes dudas sobre este producto?';
    n.textContent = `Elige tu vendedor: se abrirá WhatsApp con el producto y su código (${sellerProduct.code}) listos.`;
  } else if (sellerMode === 'contacto') {
    t.textContent = 'Contacta a tu vendedor';
    n.textContent = 'Toca a tu vendedor para escribirle por WhatsApp.';
  } else {
    t.textContent = 'Elige tu vendedor para enviarle tu pedido por WhatsApp';
    n.textContent = 'Se abrirá un chat de WhatsApp con el mensaje listo: solo adjunta ahí el Excel que se acaba de descargar.';
  }
  renderSellers();
  document.getElementById('sellerModal').classList.add('open');
}

function closeSellerModal() {
  document.getElementById('sellerModal').classList.remove('open');
}

function sendToSeller(key) {
  const seller = SELLERS[key];
  if (!seller) return;
  let message;
  if (sellerMode === 'consulta' && sellerProduct) {
    const p = sellerProduct;
    message = `Buenas, tengo una consulta sobre este producto: ${prettyName(p)} (${p.brand}) · Código ${p.code}.`;
  } else if (sellerMode === 'contacto') {
    message = 'Buenas, quisiera hacer una consulta sobre el catálogo.';
  } else {
    const s = lastOrderSummary;
    const intro = s.name ? `Buenas, mi nombre es ${s.name}, este es mi pedido` : 'Buenas, este es mi pedido';
    const detalle = s.totalProducts ? ` (${s.totalProducts} ${s.totalProducts === 1 ? 'producto' : 'productos'}, ${s.totalUnits} ${s.totalUnits === 1 ? 'unidad' : 'unidades'}). Te adjunto el Excel.` : '.';
    message = intro + detalle;
  }
  const url = `https://wa.me/${seller.phone}?text=${encodeURIComponent(message)}`;
  try { localStorage.setItem(SELLER_KEY, key); } catch (e) {}
  window.open(url, '_blank');
  closeSellerModal();
}
