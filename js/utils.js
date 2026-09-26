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
  'tecnologia': '#3F6FE0', 'electrodomesticos': '#0E8C8C', 'maquillaje': '#C73E6A',
  'cuidado-facial': '#4E8F6E', 'cuidado-corporal': '#D9804F', 'cabello-y-barberia': '#7A5AB5'
};

function placeholderImg(brand, categoria) {
  const label = escapeHtml(brand);
  const color = CAT_COLOR_HEX[catSlug(categoria)] || '#C24D66';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="20" y="20" width="360" height="360" fill="none" stroke="#e2e2e2" stroke-width="2"/>
    <text x="200" y="190" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="${color}" text-anchor="middle">${label}</text>
    <text x="200" y="220" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#aaaaaa" text-anchor="middle">foto pendiente</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function sanitizeFilename(str) {
  return String(str).replace(/[^a-zA-Z0-9_\-]+/g, '_').substring(0, 60);
}
