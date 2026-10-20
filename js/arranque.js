// ============================================================
//  ARRANQUE DEL CATALOGO
// ============================================================
//  1. Carga js/products.js (respaldo) y, al mismo tiempo, pide a
//     Supabase los productos y ajustes que se editan desde el panel
//     administrativo (tablas nevada_productos y nevada_ajustes).
//  2. Si Supabase responde a tiempo con datos completos, reemplaza la
//     lista de productos, los vendedores y la rotacion de Nuevos
//     Ingresos. Si no, el catalogo sigue con lo de products.js y
//     config.js, como siempre.
//  3. Recien entonces carga el resto de archivos del catalogo, en
//     orden, para que todos armen sus listas con los datos finales.
// ============================================================

const PRODUCTOS_FUENTE = { origen: 'products.js', actualizado: null };

(function arrancarCatalogo() {
  const yo = document.currentScript;
  const version = yo && yo.src.includes('?') ? yo.src.split('?')[1] : '';
  const RESTO = ['stock', 'data', 'utils', 'ui', 'taxonomy', 'relacionados', 'catalog', 'stock-en-vivo',
    'cart', 'theme', 'order', 'history', 'calculator', 'lightbox', 'showcase', 'gate', 'admin', 'feedback', 'main'];

  function cargarArchivo(nombre) {
    return new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = `js/${nombre}.js${version ? '?' + version : ''}`;
      s.async = false;   // se ejecutan en el orden en que se agregan
      s.onload = ok;
      s.onerror = () => mal(new Error('No cargó js/' + nombre + '.js'));
      document.head.appendChild(s);
    });
  }

  async function pedir(ruta, rango) {
    const cfg = CATALOGO_EN_VIVO;
    const headers = { apikey: cfg.clavePublica };
    if (rango) headers.Range = rango;
    const r = await fetch(`${cfg.url}/rest/v1/${ruta}`, { headers, signal: pedir.ctrl.signal });
    if (!r.ok && r.status !== 206) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  async function traerDeSupabase() {
    const cfg = typeof CATALOGO_EN_VIVO !== 'undefined' ? CATALOGO_EN_VIVO : null;
    if (!cfg || !cfg.activo || typeof fetch !== 'function') return null;
    pedir.ctrl = typeof AbortController === 'function' ? new AbortController() : { signal: undefined, abort() {} };
    const timer = setTimeout(() => pedir.ctrl.abort(), cfg.esperaMs);
    try {
      const cols = 'id,code,brand,name,categoria,img,notes,date_added,hidden,actualizado';
      const productos = [];
      for (let desde = 0; desde < 20000; desde += 1000) {
        const lote = await pedir(`nevada_productos?select=${cols}&order=id.asc`, `${desde}-${desde + 999}`);
        productos.push(...lote);
        if (lote.length < 1000) break;
      }
      const ajustes = await pedir('nevada_ajustes?select=clave,valor').catch(() => []);
      return { productos, ajustes };
    } finally {
      clearTimeout(timer);
    }
  }

  function aplicar(remoto) {
    if (!remoto) return;
    const filas = remoto.productos || [];
    // Datos incompletos (tabla vacia, error a medias): se ignoran.
    if (filas.length < Math.max(50, PRODUCTS.length * 0.5)) {
      console.warn('Productos de Supabase incompletos (' + filas.length + '), se usa products.js');
    } else {
      const lista = filas.map(r => {
        const p = { id: r.id, brand: r.brand, code: r.code, name: r.name, categoria: r.categoria, img: r.img || false };
        if (r.date_added) p.dateAdded = r.date_added;
        if (Array.isArray(r.notes) && r.notes.length) p.notes = r.notes;
        if (r.hidden) p.hidden = true;
        return p;
      });
      PRODUCTS.splice(0, PRODUCTS.length, ...lista);
      PRODUCTOS_FUENTE.origen = 'supabase';
      PRODUCTOS_FUENTE.actualizado = filas.reduce((m, r) => (r.actualizado > m ? r.actualizado : m), '');
    }
    (remoto.ajustes || []).forEach(a => {
      if (a.clave === 'vendedores' && a.valor && typeof a.valor === 'object' && Object.keys(a.valor).length) {
        Object.keys(SELLERS).forEach(k => { delete SELLERS[k]; });
        Object.assign(SELLERS, a.valor);
      }
      if (a.clave === 'low_rotation' && a.valor && Array.isArray(a.valor.batches)) {
        LOW_ROTATION_START_DATE = a.valor.start_date || LOW_ROTATION_START_DATE;
        LOW_ROTATION_BATCHES = a.valor.batches;
      }
    });
  }

  (async () => {
    const remotoP = traerDeSupabase().catch(err => {
      console.warn('Catálogo en vivo no disponible, se usa products.js:', err && err.message);
      // Sin respuesta (caido o lento): el inventario en vivo tampoco espera.
      if (err && (err.name === 'AbortError' || err instanceof TypeError)) PRODUCTOS_FUENTE.sinRespuesta = true;
      return null;
    });
    try {
      await cargarArchivo('products');
      aplicar(await remotoP);
    } catch (err) {
      console.error(err);
    }
    // El resto se agrega de una vez; async=false respeta el orden.
    RESTO.forEach(n => cargarArchivo(n).catch(err => console.error(err)));
  })();
})();
