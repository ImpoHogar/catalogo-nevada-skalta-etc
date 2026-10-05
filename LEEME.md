# Catálogo ImpoHogar — Tecnología, Cuidado Personal y Maquillaje

Catálogo de pedido mayorista hecho **sobre la misma base que el catálogo de
perfumería** (`Catalogo-Perfumer-a-Web`): mismo diseño, vitrina de entrada,
clave, carrito, Excel del pedido, envío por WhatsApp, historial, calculadora,
modo oscuro y formulario de opinión.

Lo que cambió es el contenido, porque es otro mercado:

| Perfumería                          | Este catálogo                                                        |
|-------------------------------------|----------------------------------------------------------------------|
| Categorías Hombre / Mujer / Estuches…| Tecnología, Electrodomésticos, Maquillaje, Cuidado facial, Cuidado corporal, Cabello y barbería |
| Notas olfativas                     | Sección "Detalles" (opcional, campo `notes`)                         |
| Dupe / Inspiración                  | "Productos relacionados" (complemento / alternativa), vacío por ahora |
| Fotos `img/p<id>.webp`              | Fotos `img/productos/<código de barras>.jpg`                         |
| Logos de marcas en el carrusel      | Nombre escrito (hasta que haya logos)                               |
| Carrito / historial del navegador   | Claves propias (`impohogar_tec_…`): no se mezclan con perfumería     |

## Qué hay en cada archivo

```
index.html              Esqueleto de la página
css/styles.css          Todos los estilos (idénticos a perfumería + marca escrita)
img/logo.png            Logos de ImpoHogar
img/categorias/*.svg    Iconos de las tarjetas de categoría
img/productos/          FOTOS: una por producto, nombrada con el código de barras
img/marcas/             Logos de marcas para el carrusel (opcional)

js/config.js            ⚙️  AJUSTES: categorías, marcas del carrusel, vitrina,
                            vendedores, días de "Nuevos ingresos", rotación
js/products.js          📦 EL CATÁLOGO (generado desde la plantilla Excel)
js/stock.js             🔢 LAS CANTIDADES (generado desde el inventario)
js/relacionados.js      Productos relacionados (complemento / alternativa)
js/data.js              Pega las cantidades a los productos
js/taxonomy.js          Departamentos, categorías, tipos, filtros y buscador
js/catalog.js           Navegación, inicio, listados, tarjetas y buscador
js/lightbox.js          Ficha del producto (galería, datos, relacionados)
js/showcase.js          Vitrina de entrada
js/cart.js, order.js    Carrito, Excel del pedido, ZIP de fotos, WhatsApp
js/lightbox.js          Ficha del producto con zoom y código de barras
js/…                    Resto igual que perfumería

herramientas/actualizar_catalogo.py   Genera products.js y stock.js desde Excel
```

---

## Para actualizar productos (plantilla de carga)

1. Llenar la plantilla `catalogo-tecnologia-plantilla-productos.xlsx`
   (hoja **Productos**: Código / Nombre / … / Categoría / Bod Principal).
2. Correr:

```
pip install openpyxl
python3 herramientas/actualizar_catalogo.py plantilla.xlsx
```

El script:

- Toma el código de barras **exacto** (con sus ceros a la izquierda).
- **Conserva el id** de los productos que ya existían (el carrito y el
  historial de los clientes dependen de él).
- A los productos **nuevos** les pone la fecha de hoy → salen solos en
  "Nuevos ingresos" durante `NEW_PRODUCT_DAYS` días.
- Asigna la categoría del catálogo según la marca y el nombre (ej. TIRTIR
  "CUSHION" → Maquillaje, TIRTIR "SERUM" → Cuidado facial, NEVADA "SHAMPOO" →
  Cabello y barbería).
- **No publica** lo interno: GASTOS, MATERIAL POP, MUEBLES/EXHIBIDORES,
  REGALÍAS-ACTIVACIONES, TESTER.
- **No publica perfumería** (Afnan, Armani, Carolina Herrera, Adidas,
  Victoria's Secret): esos productos van en el catálogo de perfumería. Si
  aparece otra marca de perfumes, se agrega en `MARCAS_PERFUMERIA` dentro del
  script.
- **No publica el precio de costo** (la columna no se usa).
- Si una marca nueva no tiene categoría asignada, la manda a "Otros" y lo
  avisa: se agrega en `POR_MARCA` dentro del script.

## Para actualizar solo cantidades

Con el Excel de inventario de siempre (Código / Nombre / Bod Principal):

```
python3 herramientas/actualizar_catalogo.py --solo-stock inventario.xlsx
```

Reemplaza únicamente `js/stock.js`. Los negativos quedan en 0 (agotado).

> ⚠️ Igual que en perfumería: el cruce es por coincidencia **exacta** del
> código. No normalizar ceros a la izquierda.

## Para agregar fotos

**Con el Excel de fotos** (`Fotos-catalogo-tecnologia-belleza.xlsx`, hoja
"Fotos", cada producto con su N° de foto):

```
pip install openpyxl pillow
# lo mas rapido: fotos nombradas con el codigo de barras (886540006081.jpg)
python3 herramientas/procesar_fotos.py Fotos-pendientes.xlsx carpeta_con_fotos/
# o, con la lista vieja, fotos nombradas con su N° (0001.jpg, 0002.jpg...):
python3 herramientas/procesar_fotos.py Fotos.xlsx carpeta_con_fotos/
# o fotos sin numero, en el orden de la lista, empezando por el N° 6:
python3 herramientas/procesar_fotos.py Fotos.xlsx --desde 6 a.jpg b.jpg c.jpg
# y despues, para que el catalogo las detecte:
python3 herramientas/actualizar_catalogo.py plantilla.xlsx
```

`procesar_fotos.py` las deja con fondo blanco, cuadradas, de 800x800 y en webp,
guardadas como `img/productos/<código de barras>.webp`.

**A mano:**

Copiar las fotos a `img/productos/` con el código de barras como nombre
(`7501234567890.jpg`, también sirve `.png` o `.webp`), fondo blanco, y volver a
correr el script con la plantilla para que las detecte. Mientras un producto no
tenga foto se muestra una tarjeta "foto pendiente" con su marca. Cuando se
reemplacen fotos, subir `IMG_VERSION` en `js/config.js`.

Cuando haya al menos una foto, el botón pasa a decir "Generar pedido
(Excel + fotos)" y el cliente recibe también el ZIP de fotos de su pedido.

## Para publicar

Hacer commit y push como siempre. **El orden de los `<script>` en el
`index.html` importa**: no reordenarlos.

Cuando cambies cualquier archivo de `js/` o `css/`, subí el número `?v=20260923t`
en el `index.html` (buscar y reemplazar) para que los clientes no vean la
versión vieja.

## Compartido con perfumería (revisar si se quiere separar)

- **Clave de acceso** (`js/gate.js`): es la misma. Igual que en perfumería, no
  es seguridad real.
- **Google Analytics** (`G-QF2TFBMBLR` en `index.html`): mismo ID; las visitas
  se distinguen por la dirección de la página.
- **Formulario de opinión** (`FEEDBACK_URL` en `js/config.js`): mismo Google
  Apps Script.
- (Ya no) **Vendedores**: este catálogo tiene los suyos propios (ver abajo).

## Vendedores

Están en `SELLERS` de `js/config.js` (nombre, cargo, WhatsApp y foto). Cada
uno tiene su tarjeta en `img/vendedores/`. Salen en la ventana "Elige tu
vendedor" al generar el pedido (abre WhatsApp con el mensaje del pedido) y al
pie de la página (abre el chat directo). Para cambiar uno, se edita su línea
en `SELLERS` y se reemplaza su imagen.

## Diseño y arquitectura (ImpoHogar Market)

El catálogo funciona como una tienda grande con secciones, cada una con su
dirección (se puede usar el botón "atrás" del navegador y compartir el enlace):

| Dirección | Qué muestra |
|---|---|
| `#/` | Inicio: banner, departamentos, categorías, últimas unidades, bloques por departamento, stock para volumen, marcas |
| `#/todo` | Todo el catálogo |
| `#/d/belleza` · `#/d/cuidado-personal` · `#/d/tecnologia` · `#/d/hogar` | Departamento |
| `#/c/audio` · `#/c/audio/parlantes` | Categoría y tipo de producto |
| `#/marca/tirtir` · `#/marcas` | Una marca / directorio de marcas |
| `#/buscar/cargador tipo c` | Resultados de búsqueda |
| `#/col/ultimas` · `#/col/volumen` · `#/col/nuevos` · `#/col/mas-vendidos` | Colecciones comerciales |
| `#/p/123` | Ficha del producto |

**Departamentos > categorías > tipos** (`js/taxonomy.js`): cada producto se ubica
leyendo su categoría de la plantilla y palabras de su nombre. Hoy:

- **Belleza:** Maquillaje (bases y cushions, labios, ojos y cejas, mejillas,
  correctores y polvos) · Skincare (limpieza, tónicos, sérums, cremas,
  mascarillas, protección solar, sets).
- **Cuidado personal:** Cuidado corporal · Cabello · Barbería.
- **Tecnología:** Audio · Cables y adaptadores · Carga y energía · Baterías y
  pilas · Computación y gaming · Smart y cámaras · Soportes y accesorios.
- **Hogar:** Cocina · Cuidado de la ropa.

Para crecer: se agrega la categoría o el tipo en `CATEGORIES` con las palabras
que lo identifican. Las categorías sin productos no se muestran. La categoría de
la plantilla (`categoria` en products.js) no cambia: el script de carga sigue
igual.

**Buscador:** busca por nombre, marca, código de barras (exacto o parcial),
categoría, tipo y sinónimos en español/inglés (audífonos = headphones, pila =
batería, labial = lip/tint, bloqueador = SPF, tipo C = USB-C…). Un código
completo abre la ficha directo. Sinónimos en `SYNONYMS` (taxonomy.js).

**Filtros contextuales:** cambian según la sección. Belleza y cuidado
personal: marca, tipo, subtono (C/N/W), beneficio, presentación. Tecnología:
marca, tipo, conector, compatibilidad, conexión, potencia. Siempre:
disponibilidad. Solo aparecen si tienen al menos dos opciones reales.

**Vista lista (pedido rápido):** en cualquier listado, el botón de lista muestra
filas con código y cantidad para pedir rápido.

### Vitrina comercial (en `js/config.js`)

- `CAMPANA_INICIO`: texto, botón y destino del banner principal. En modo
  `'auto'`, si hay nuevos ingresos el banner pasa solo a "Descubre lo nuevo".
- `NUEVOS_INGRESOS`: códigos marcados a mano como nuevos (además de los que el
  script de carga marca con `dateAdded`).
- `MAS_VENDIDOS`: códigos de mayor rotación, en orden. **Mientras esté vacío la
  sección "Más vendidos" no aparece** (no se inventan datos).
- `MARCAS_DESTACADAS`: orden de las marcas del inicio (vacío = las que más
  productos tienen).
- `STOCK_VOLUMEN`: desde cuántas unidades un producto entra en "Stock para
  volumen".
- `BUSQUEDAS_POPULARES`: sugerencias del buscador.

"Últimas unidades" sale solo del inventario (12 unidades o menos).

### Fotos extra (galería)

La ficha muestra la foto principal y el código de barras. Para sumar más fotos a
un producto, se agrega en su línea de products.js el campo
`"imgs":["<codigo>-2.webp","<codigo>-3.webp"]` con esos archivos en
`img/productos/`.

### Estilo

Azul de Grupo ImpoHogar como color de acción, blanco y grises neutros, y un
tono por departamento (belleza rosa empolvado, cuidado personal verde salvia,
tecnología azul, hogar ámbar). Tarjetas sin bordes, con la foto como
protagonista; en tecnología muestran datos técnicos (conector, potencia) y en
belleza tono y tamaño. Tipografía Plus Jakarta Sans + Inter. Modo claro y
oscuro. En celular: barra inferior (Inicio, Departamentos, Buscar, Marcas,
Pedido), menú lateral, buscador a pantalla completa y filtros en panel.

## Al compartir el enlace

`img/compartir.jpg` es la imagen que sale al pegar el enlace del catálogo en
WhatsApp, Facebook, etc. (etiquetas `og:` en `index.html`). El ícono de la
pestaña es `img/favicon.svg` (+ `favicon-32.png` y `apple-touch-icon.png`).
