// ============================================================
//  UTILIDADES COMPARTIDAS
// ============================================================

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setStatus(msg, isError) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = isError ? 'error' : '';
}

// "Cuidado facial" -> "cuidado-facial": nombre de clase para los colores
// de cada mercado (ver la seccion 19 de css/styles.css).
function catSlug(categoria) {
  return String(categoria || 'otros').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Color de cada mercado para el marcador de "foto pendiente".
const CAT_COLOR_HEX = {
  'tecnologia': '#3553E8', 'electrodomesticos': '#0E8C96', 'maquillaje': '#D93A69',
  'cuidado-facial': '#1E9A72', 'cuidado-corporal': '#E0763C', 'cabello-y-barberia': '#7C4FE0'
};

// Marcador para productos sin foto: fondo transparente (toma el tono de
// la tarjeta), el icono de su categoria y la marca. Se guarda en cache
// porque se repite muchisimo.
const _placeholderCache = {};
function placeholderImg(brand, categoria) {
  const key = brand + '|' + categoria;
  if (_placeholderCache[key]) return _placeholderCache[key];
  const label = escapeHtml(String(brand).slice(0, 22));
  const color = CAT_COLOR_HEX[catSlug(categoria)] || '#6B6E78';
  let glyph = '';
  if (typeof ICONS !== 'undefined' && typeof catMeta === 'function') {
    glyph = (ICONS[catMeta(categoria).icon] || '').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <g transform="translate(164 118) scale(3)" fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity=".55">${glyph}</g>
    <text x="200" y="250" font-family="Helvetica, Arial, sans-serif" font-size="19" font-weight="700" letter-spacing="2" fill="${color}" text-anchor="middle">${label}</text>
    <text x="200" y="276" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#8A8D96" text-anchor="middle">Foto próximamente</text>
  </svg>`;
  return (_placeholderCache[key] = "data:image/svg+xml;utf8," + encodeURIComponent(svg));
}

function sanitizeFilename(str) {
  return String(str).replace(/[^a-zA-Z0-9_\-]+/g, '_').substring(0, 60);
}
