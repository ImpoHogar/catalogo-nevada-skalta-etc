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

// ============================================================
//  VITRINA COMERCIAL DEL INICIO
// ============================================================
//  Lo que se edita a mano para "mover" el inicio. Todo usa CODIGOS DE
//  BARRAS exactos, como en el resto del catalogo.
// ============================================================

// Textos del encabezado del inicio ("¿Que quieres comprar hoy?").
// En "texto" se puede usar {productos} y {marcas}: se reemplazan solos
// por las cantidades reales del catalogo.
const INICIO = {
  etiqueta: 'Catálogo mayorista · Grupo ImpoHogar',
  titulo: '¿Qué quieres comprar hoy?',
  texto: '{productos} productos de {marcas} marcas con disponibilidad real de bodega. Busca por nombre, marca o código, o entra por departamento.'
};

// ------------------------------------------------------------
//  NUEVOS INGRESOS
// ------------------------------------------------------------
//  Un producto es "Nuevo ingreso" si cumple CUALQUIERA de estas:
//   1. Tiene "dateAdded" en products.js dentro de los ultimos
//      NEW_PRODUCT_DAYS dias. El script herramientas/actualizar_catalogo.py
//      lo pone solo cuando aparece un codigo nuevo en la plantilla.
//   2. Tiene "nuevo":true en su linea de products.js.
//   3. Su codigo esta en esta lista. Ej: ["886540006029", "7897042018512"]
//  Si no hay ninguno, la seccion no aparece en el inicio (no se inventa).
const NUEVOS_INGRESOS = [];

// ------------------------------------------------------------
//  OPORTUNIDADES
// ------------------------------------------------------------
//  Productos que ImpoHogar quiere poner frente al cliente: impulsar,
//  mover inventario, dar a conocer, productos estrategicos...
//  Se marcan con su CODIGO DE BARRAS en esta lista (en el orden en que
//  quieres que salgan) o con "oportunidad":true en products.js.
//    Ej: const OPORTUNIDADES = ["7897042018512", "025215723476"];
//
//  OPORTUNIDADES_AUTO: mientras la lista este vacia, el catalogo elige
//  solo los productos con MAS UNIDADES en bodega de cada categoria
//  (stock real, con foto). Pon false para que la seccion solo muestre
//  lo que escribas en la lista.
const OPORTUNIDADES = [];
const OPORTUNIDADES_AUTO = true;
const OPORTUNIDADES_AUTO_CANTIDAD = 24;

// Mas vendidos / alta rotacion, en orden. Mientras este vacio, la
// seccion "Mas vendidos" no aparece (no se inventa).
const MAS_VENDIDOS = [];

// Marcas destacadas del inicio, en orden (nombre exacto como en el
// catalogo). Vacio = las marcas con mas productos.
const MARCAS_DESTACADAS = [];

// Informacion visual de cada marca (opcional). El logo se guarda en
// img/marcas/<archivo>. Si una marca no tiene logo, se muestra su
// nombre escrito (nunca se inventa un logo).
//   "SKALA": { logo: "skala.png", descripcion: "Cuidado capilar brasileño." },
const MARCAS_INFO = {
};

// ------------------------------------------------------------
//  DISPONIBILIDAD Y COMPRA POR VOLUMEN
// ------------------------------------------------------------
// Etiqueta "VOLUMEN" y badge "Disponible para volumen": productos con
// al menos esta cantidad en bodega.
const STOCK_VOLUMEN = 500;

// Botones de "Compra por volumen" (cantidad minima disponible).
const VOLUMEN_NIVELES = [5, 10, 25, 50, 100];
// Nivel que se muestra al entrar a "Compra por volumen".
const VOLUMEN_NIVEL_INICIAL = 50;

// Por encima de esta cantidad la tarjeta dice "+100 disponibles" en
// vez del numero exacto. (Pocas unidades = LOW_STOCK, en js/ui.js.)
const STOCK_TOPE_VISIBLE = 100;

// ------------------------------------------------------------
//  "¿QUE ESTAS BUSCANDO?" (comprar por necesidad)
// ------------------------------------------------------------
//  Accesos pensados para el cliente que no conoce las marcas.
//  destino: '#/c/<categoria>', '#/c/<categoria>/<tipo>', '#/d/<departamento>',
//           '#/buscar/<palabras>' o '#/marca/<marca>'.
//  icono: makeup, face, hair, body, tech, cable, bolt, battery, mouse,
//         watch, stand, home, iron, box, tag.
const NECESIDADES = [
  { nombre: 'Maquillaje',              icono: 'makeup',  destino: '#/c/maquillaje' },
  { nombre: 'Cuidado de la piel',      icono: 'face',    destino: '#/c/skincare' },
  { nombre: 'Cuidado del cabello',     icono: 'hair',    destino: '#/c/cabello' },
  { nombre: 'Cuidado corporal',        icono: 'body',    destino: '#/c/cuidado-corporal' },
  { nombre: 'Barbería',                icono: 'hair',    destino: '#/c/barberia' },
  { nombre: 'Accesorios tecnológicos', icono: 'cable',   destino: '#/d/tecnologia' },
  { nombre: 'Audio',                   icono: 'tech',    destino: '#/c/audio' },
  { nombre: 'Cargadores y energía',    icono: 'bolt',    destino: '#/c/carga-energia' },
  { nombre: 'Baterías',                icono: 'battery', destino: '#/d/baterias' },
  { nombre: 'Hogar y cocina',          icono: 'home',    destino: '#/d/hogar' }
];

// Sugerencias del buscador cuando todavia no se escribio nada.
const BUSQUEDAS_POPULARES = ['Cushion', 'Audífonos', 'Cargador tipo C', 'Exfoliante', 'Licuadora', 'Baterías AA', 'Sérum', 'Shampoo', 'Smartwatch', 'Labial'];

// Habilita el ZIP de fotos del pedido (solo incluye los productos que
// ya tienen foto en img/productos/).
const HAS_PHOTOS = true;

// Vendedores de este catalogo. "img" es la tarjeta de cada uno
// (img/vendedores/). Al tocarla se abre WhatsApp con ese numero.
const SELLERS = {
  esteban:  { name: 'Esteban Guerrero H.', role: 'Supervisor de ventas', phone: '50683683535', img: 'img/vendedores/esteban.webp' },
  ingrid:   { name: 'Ingrid Mora G.',      role: 'Asesora de ventas',    phone: '50686052020', img: 'img/vendedores/ingrid.webp' },
  jennifer: { name: 'Jennifer Rivera M.',  role: 'Agente de ventas',     phone: '50684700099', img: 'img/vendedores/jennifer.webp' },
  lohana:   { name: 'Lohana Mora',         role: 'Agente de ventas',     phone: '50670519682', img: 'img/vendedores/lohana.webp' },
  nicole:   { name: 'Nicole Díaz C.',      role: 'Agente de ventas',     phone: '50684732332', img: 'img/vendedores/nicole.webp' }
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
  "Otros": "otros.svg"
};

// Filas de la vitrina de entrada (ademas de "Nuevos ingresos", que
// siempre va primero si hay). Cada nombre debe estar en CATEGORIAS.
const VITRINA_CATEGORIAS = ["Maquillaje", "Tecnología", "Cuidado facial", "Electrodomésticos"];

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