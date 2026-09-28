// ============================================================
//  ARRANQUE
// ============================================================
//  Se ejecuta cuando la pagina termina de cargar y conecta todo.
// ============================================================

// Se mantiene por compatibilidad: el carrusel de logos se reemplazo por
// la seccion "Marcas" del inicio (catalog.js > renderBrands).
function renderBrandMarquee() {}

// ============================================================
//  ENCABEZADO AL HACER SCROLL
// ============================================================
//  Con scroll el encabezado gana sombra; en el celular ademas se
//  compacta (queda el buscador y las categorias, que es lo que se usa).
// ============================================================
function initHeaderScroll() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  let ticking = false;
  let lastY = window.scrollY;
  const search = document.getElementById('searchBox');
  const measure = () => { if (search) header.style.setProperty('--hdr-hide', Math.max(0, search.offsetTop - 8) + 'px'); };
  measure();
  window.addEventListener('resize', measure, { passive: true });
  const update = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    if (mobile) {
      if (y > 140 && y > lastY + 4) { if (!header.classList.contains('is-compact')) measure(); header.classList.add('is-compact'); }
      else if (y < lastY - 4 || y < 140) header.classList.remove('is-compact');
    } else {
      header.classList.remove('is-compact');
    }
    lastY = y;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

// Tecla Escape: cierra la ventana que este abierta (pedido, datos,
// calculadora, historial o filtros). No toca los avisos de "gracias".
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
  if (document.body.classList.contains('sheet-open')) toggleFilterSheet(false);
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
    if (hoyDiaNino <= limiteDiaNino) { document.getElementById('diaNinoBtn').style.display = 'inline-flex'; }
    restoreCartFromStorage();
    renderHome();
    renderHeroNuevos();
    filteredProducts = computeFiltered();
    renderActiveFilters();
    renderPage(true, false);
    // Mientras ningun producto tenga foto, el boton no promete el ZIP.
    if (HAS_PHOTOS && VISIBLE_PRODUCTS.some(p => p.img)) {
      document.getElementById('genBtn').textContent = 'Generar pedido';
      document.getElementById('genBtn').title = 'Descarga el Excel del pedido y las fotos de los productos';
    }
    initSearch();
    initFilters();
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
    updateOrderBar();
  } catch (err) {
    console.error(err);
    document.getElementById('count').textContent = 'Error cargando catálogo: ' + err.message;
  }
});
