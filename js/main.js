// ============================================================
//  ARRANQUE
// ============================================================
//  Se ejecuta cuando la pagina termina de cargar y conecta todo.
// ============================================================

// ============================================================
//  CARRUSEL DE MARCAS
// ============================================================
//  Arma el carrusel infinito de marcas. La lista viene de
//  MARCAS_CARRUSEL (definida en config.js). Cada logo se busca en
//  img/marcas/; las marcas sin logo se muestran con su nombre.
//  Se duplica la fila completa una vez para que el loop de la
//  animacion (en css/styles.css) no muestre ningun corte.
// ============================================================
function renderBrandMarquee() {
  const track = document.getElementById('brandMarqueeTrack');
  if (!track || typeof MARCAS_CARRUSEL === 'undefined') return;
  // Con logo se muestra la imagen; sin logo, el nombre escrito.
  const logosHTML = MARCAS_CARRUSEL.map(m => m.archivo
    ? `<img src="img/marcas/${m.archivo}?v=${IMG_VERSION}" alt="${escapeHtml(m.nombre)}" class="brand-logo-item">`
    : `<span class="brand-word-item">${escapeHtml(m.nombre)}</span>`
  ).join('');
  track.innerHTML = logosHTML + logosHTML;
}

// ============================================================
//  ENCABEZADO AL HACER SCROLL
// ============================================================
//  Cuando la pagina baja un poco, el encabezado fijo muestra una
//  linea inferior y una sombra suave para separarse del contenido.
// ============================================================
function initHeaderScroll() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  let ticking = false;
  const update = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

// Tecla Escape: cierra la ventana que este abierta (pedido, datos,
// calculadora o historial). No toca los avisos de "gracias" para no
// saltarse los pasos despues de generar un pedido.
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const abiertos = {
    orderModal: typeof closeOrderReview === 'function' ? closeOrderReview : null,
    customerModal: typeof closeCustomerModal === 'function' ? closeCustomerModal : null,
    calcModal: typeof closeCalculator === 'function' ? closeCalculator : null,
    historyModal: typeof closeOrderHistory === 'function' ? closeOrderHistory : null
  };
  Object.keys(abiertos).forEach(id => {
    const el = document.getElementById(id);
    if (el && el.classList.contains('open') && abiertos[id]) abiertos[id]();
  });
  const fb = document.getElementById('fbModal');
  if (fb && fb.classList.contains('open') && typeof closeFeedback === 'function') closeFeedback();
});

document.addEventListener('DOMContentLoaded', () => {
  try {
    initTheme();
    renderBrandFilter();
    renderCategoriaFilter();
    const hoyDiaNino = new Date();
    const limiteDiaNino = new Date(DIA_DEL_NINO_FECHA_LIMITE + 'T23:59:59');
    if (hoyDiaNino <= limiteDiaNino) { document.getElementById('diaNinoBtn').style.display = 'inline-block'; }
    restoreCartFromStorage();
    filteredProducts = VISIBLE_PRODUCTS;
    renderPage(true);
    // Mientras ningun producto tenga foto, el boton no promete el ZIP.
    if (HAS_PHOTOS && VISIBLE_PRODUCTS.some(p => p.img)) {
      document.getElementById('genBtn').textContent = 'Generar pedido (Excel + fotos)';
    }
    const totalCount = VISIBLE_PRODUCTS.length;
    const missingPhotos = VISIBLE_PRODUCTS.filter(p => !p.img).length;
    const agotados = VISIBLE_PRODUCTS.filter(p => (parseInt(p.stock) || 0) <= 0).length;
    renderBrandMarquee();
    renderHeroNuevos();
    document.getElementById('search').addEventListener('input', applyFilters);
    document.getElementById('brandFilter').addEventListener('change', () => { diaNinoMode = false; document.getElementById('diaNinoBanner').style.display = 'none'; applyFilters(); });
    document.getElementById('loadMoreBtn').addEventListener('click', () => renderPage(false));
    document.getElementById('genBtn').addEventListener('click', openCustomerModal);
    if (typeof ExcelJS === 'undefined') {
      setStatus('Aviso: librería Excel no cargó.', true);
    }
    const lbImg = document.getElementById('lightboxImg');
    lbImg.addEventListener('click', toggleZoom);
    lbImg.addEventListener('wheel', wheelZoom, { passive: false });
    lbImg.addEventListener('touchstart', touchZoomStart, { passive: false });
    lbImg.addEventListener('touchmove', touchZoomMove, { passive: false });
    lbImg.addEventListener('touchend', touchZoomEnd);
    initHeaderScroll();
  } catch (err) {
    console.error(err);
    document.getElementById('count').textContent = 'Error cargando catálogo: ' + err.message;
  }
});