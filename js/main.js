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
    // Mensaje claro para el cliente (el detalle tecnico queda en la consola).
    if (main) main.insertAdjacentHTML('afterbegin', `
      <div class="load-error" role="alert">
        <b>No pudimos cargar el catálogo</b>
        <span>Revisa tu conexión a internet y vuelve a intentarlo. Si sigue pasando, escríbenos por WhatsApp.</span>
        <div><button type="button" class="btn btn-primary" onclick="location.reload()">Volver a cargar</button>
        <a class="btn btn-outline" href="https://wa.me/50684116868" target="_blank" rel="noopener">Escribir por WhatsApp</a></div>
      </div>`);
  }
});

// ============================================================
//  ACCESIBILIDAD DE LAS VENTANAS
// ============================================================
//  Al abrir una ventana (pedido, confirmacion, historial, calculadora...)
//  el foco entra en ella; al cerrarla vuelve al boton que la abrio. Asi
//  se puede usar todo con teclado o lector de pantalla.
(function initModalFocus() {
  if (!('MutationObserver' in window)) return;
  const obs = new MutationObserver(ms => ms.forEach(m => {
    const el = m.target;
    const open = el.classList.contains('open');
    if (open && !el._wasOpen) {
      el._wasOpen = true;
      el._opener = document.activeElement;
      setTimeout(() => {
        if (el.contains(document.activeElement)) return;
        // En celular no se abre el teclado solo: tapa el resumen.
        const empty = window.matchMedia('(hover: hover)').matches && Array.from(el.querySelectorAll('input.field-input')).find(i => !i.value);
        const target = empty || el.querySelector('.icon-btn, button:not([disabled])');
        if (target) target.focus({ preventScroll: true });
      }, 80);
    } else if (!open && el._wasOpen) {
      el._wasOpen = false;
      const o = el._opener;
      el._opener = null;
      if (o && o !== document.body && document.contains(o) && !document.querySelector('.order-modal.open, .thanks-modal.open')) o.focus({ preventScroll: true });
    }
  }));
  document.querySelectorAll('.order-modal, .thanks-modal').forEach(m => obs.observe(m, { attributes: true, attributeFilter: ['class'] }));
})();
