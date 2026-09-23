// ============================================================
//  AJUSTES DEL CATALOGO
// ============================================================
//  Todo lo que se cambia a mano vive aca. Ningun otro archivo
//  deberia necesitar tocarse para estos ajustes.
// ============================================================

// Sube esta fecha cada vez que reemplaces fotos de la carpeta img/,
// para que el navegador de los clientes no sirva la imagen vieja.
const IMG_VERSION = "20260923";

// Marcas que aparecen en el carrusel animado de arriba del catalogo.
// Si la marca tiene logo, guardalo en img/marcas/<archivo> y ponelo en
// "archivo". Si no tiene (o todavia no llego), se deja sin "archivo" y
// el carrusel muestra el nombre escrito, sin romper nada.
const MARCAS_CARRUSEL = [
  { nombre: "Argom" },
  { nombre: "Unno Tekno" },
  { nombre: "Maxell" },
  { nombre: "Brentwood" },
  { nombre: "TirTir" },
  { nombre: "Kara Beauty" },
  { nombre: "Tree Hut" },
  { nombre: "Nevada" },
  { nombre: "Skala" },
  { nombre: "Origem" },
  { nombre: "Eqqualberry" },
  { nombre: "Immortal" }
];

// Un producto aparece en "Nuevos Ingresos" mientras su dateAdded este
// dentro de los ultimos NEW_PRODUCT_DAYS dias.
const NEW_PRODUCT_DAYS = 30;

// Etiqueta "NUEVO" sobre la foto de los productos recientes.
// OJO: en el archivo original habia dos versiones de esta funcion y ganaba
// la que SI muestra la etiqueta, asi que hoy la etiqueta se ve. Se dejo el
// mismo comportamiento. Pone false aca si queres apagarla.
const MOSTRAR_ETIQUETA_NUEVO = true;

// Cuantos productos se cargan por tanda al hacer scroll / "Ver mas".
const PAGE_SIZE = 60;

// Boton "Dia del Nino": marcas que agrupa.
// El boton se muestra solo hasta esta fecha INCLUIDA (formato AAAA-MM-DD).
// A partir del dia siguiente desaparece solo, sin que haya que tocar nada.
// Para la proxima promocion con fecha, solo hay que cambiar este valor.
const DIA_DEL_NINO_FECHA_LIMITE = "2026-09-09";
const DIA_DEL_NINO_CATEGORIES = ["NEVADA"];

// Cuantos pedidos guarda el historial local de cada cliente.
const ORDER_HISTORY_LIMIT = 20;

// ============================================================
//  VITRINA DE ENTRADA (pantalla previa a la clave)
// ============================================================
//  Cuantos productos se muestran en cada fila de la vitrina.
//  Las filas salen solas de las categorias del catalogo, no hay
//  ninguna lista escrita a mano: subir o bajar este numero es lo
//  unico que hay que tocar para mostrar mas o menos productos.
//
//  La fila de "Nuevos ingresos" NO usa este limite: siempre muestra
//  todos los nuevos ingresos que haya, sean 5 o sean 50.
//
//  Ojo con subirlo mucho: cada producto de mas son una foto y una
//  tarjeta mas que cargar antes de que el cliente entre.
const VITRINA_MAX_POR_FILA = 40;

// Habilita el ZIP de fotos del pedido (solo incluye los productos que
// ya tienen foto en img/productos/).
const HAS_PHOTOS = true;

const SELLERS = {
  roy: { name: 'Roy Chacón', phone: '50687203737' },
  pedro: { name: 'Pedro Alemán', phone: '50672349212' }
};

// URL de despliegue del Google Apps Script que recibe los mensajes
// del formulario de feedback (con fotos adjuntas).
const FEEDBACK_URL = "https://script.google.com/macros/s/AKfycbz8t35NnwV7paVbsrYBPvODUNDDNGiltQgvvjLjFGLW8XjV7-51Fozt6aN5F4N9-SPt/exec";

// Categorias del catalogo, en el orden en que salen las tarjetas de
// arriba. Cada producto trae su "categoria" en products.js (la pone
// herramientas/actualizar_catalogo.py). Las categorias sin productos
// no se muestran.
const CATEGORIAS = [
  "Tecnología",
  "Electrodomésticos",
  "Maquillaje",
  "Cuidado facial",
  "Cuidado corporal",
  "Cabello y barbería",
  "Fragancias",
  "Otros"
];

// Iconos de la fila de tarjetas de categoria (arriba del catalogo).
// Cada icono debe estar guardado en img/categorias/<archivo>. Si una
// categoria no tiene entrada aca, la tarjeta se muestra sin icono
// (solo texto), sin romper nada.
const CATEGORIA_ICONOS = {
  "Tecnología": "tecnologia.svg",
  "Electrodomésticos": "electrodomesticos.svg",
  "Maquillaje": "maquillaje.svg",
  "Cuidado facial": "facial.svg",
  "Cuidado corporal": "corporal.svg",
  "Cabello y barbería": "cabello.svg",
  "Fragancias": "fragancias.svg",
  "Otros": "otros.svg"
};

// Filas de la vitrina de entrada (ademas de "Nuevos ingresos", que
// siempre va primero si hay). Cada nombre debe estar en CATEGORIAS.
const VITRINA_CATEGORIAS = ["Tecnología", "Maquillaje", "Cuidado facial", "Cuidado corporal"];

// ============================================================
//  ROTACION SEMANAL DE BAJA ROTACION
// ============================================================
//  Lotes de productos de baja rotacion que se suman a "Nuevos
//  Ingresos" una semana cada uno. Cada 7 dias, contados desde
//  LOW_ROTATION_START_DATE, se activa el siguiente lote solo; al
//  llegar al ultimo vuelve a empezar.
//
//  Cada lote es una lista de codigos de barras (exactos), por ejemplo:
//    ["886540006029", "810112884678", "8809928132488"],
//
//  Vacio = no hay rotacion (solo se muestran los Nuevos Ingresos
//  normales, los que tienen dateAdded en products.js).
// ============================================================
const LOW_ROTATION_START_DATE = "2026-09-21";

const LOW_ROTATION_BATCHES = [
];

function getActiveLowRotationBatch() {
  if (!LOW_ROTATION_BATCHES.length) return [];
  const start = new Date(LOW_ROTATION_START_DATE + 'T00:00:00');
  const diffDays = Math.floor((Date.now() - start.getTime()) / 86400000);
  const weekIndex = Math.floor(diffDays / 7);
  const idx = ((weekIndex % LOW_ROTATION_BATCHES.length) + LOW_ROTATION_BATCHES.length) % LOW_ROTATION_BATCHES.length;
  return LOW_ROTATION_BATCHES[idx];
}

function isLowRotationActive(p) {
  return getActiveLowRotationBatch().includes(p.code);
}