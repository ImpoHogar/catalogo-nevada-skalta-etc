// ============================================================
//  ARRANQUE
// ============================================================
//  Se ejecuta cuando la pagina termina de cargar y conecta todo.
// ============================================================

// Se mantiene por compatibilidad (el carrusel de logos ya no existe).
function renderBrandMarquee() {}

// ============================================================
//  ENCABEZADO AL HACER SCROLL
// ============================================================
//  Con scroll el encabezado gana sombra; la franja superior (datos de
//  la empresa) se esconde y queda fija la barra del buscador.
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

// Tecla Escape: cierra lo que este abierto (pedido, confirmacion,
// calculadora, historial, vendedores, ayuda, filtros, menus, buscador).
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const abiertos = {
    orderModal: typeof closeOrderReview === 'function' ? closeOrderReview : null,
    customerModal: typeof closeCustomerModal === 'function' ? closeCustomerModal : null,
    calcModal: typeof closeCalculator === 'function' ? closeCalculator : null,
    historyModal: typeof closeOrderHistory === 'function' ? closeOrderHistory : null,
    repeatModal: typeof closeRepeatModal === 'function' ? closeRepeatModal : null,
    doneModal: typeof closeOrderDone === 'function' ? closeOrderDone : null,
    sellerModal: typeof closeSellerModal === 'function' ? closeSellerModal : null,
    helpModal: typeof closeHelp === 'function' ? closeHelp : null
  };
  Object.keys(abiertos).forEach(id => {
    const el = document.getElementById(id);
    if (el && el.classList.contains('open') && abiertos[id]) abiertos[id]();
  });
  if (document.body.classList.contains('sheet-open')) toggleFilterSheet(false);
  if (document.body.classList.contains('menu-open')) closeMobileMenu();
  if (document.body.classList.contains('mega-open')) closeMegaMenu();
  if (document.body.classList.contains('more-open')) closeMoreMenu();
  if (document.body.classList.contains('search-open')) closeSearchOverlay();
  const fb = document.getElementById('fbModal');
  if (fb && fb.classList.contains('open') && typeof closeFeedback === 'function') closeFeedback();
});

document.addEventListener('DOMContentLoaded', () => {
  try {
    initTheme();
    restoreCartFromStorage();
    renderNav();
    renderHome();
    // Mientras ningun producto tenga foto, el boton no promete el ZIP.
    if (HAS_PHOTOS && VISIBLE_PRODUCTS.some(p => p.img)) {
      document.getElementById('genBtn').textContent = 'Generar pedido';
      document.getElementById('genBtn').title = 'Descarga el Excel del pedido y las fotos de los productos';
    }
    initSearch();
    initFilters();
    document.getElementById('genBtn').addEventListener('click', openCustomerModal);
    if (typeof ExcelJS === 'undefined') {
      setStatus('Aviso: librería Excel no cargó.', true);
    }
    initHeaderScroll();
    updateOrderBar();
    router();
  } catch (err) {
    console.error(err);
    const main = document.getElementById('homeView');
    if (main) main.insertAdjacentHTML('afterbegin', `<p style="padding:24px;color:#B42318">Error cargando catálogo: ${escapeHtml(err.message)}</p>`);
  }
});
