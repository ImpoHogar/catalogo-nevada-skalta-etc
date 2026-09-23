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
js/catalog.js           Tarjetas, filtros, categorías, Nuevos Ingresos
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
- **Vendedores** (`SELLERS` en `js/config.js` y en `index.html`): Roy Chacón y
  Pedro Alemán.
