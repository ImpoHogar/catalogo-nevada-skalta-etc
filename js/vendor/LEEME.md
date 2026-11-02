# Librerías del catálogo (copias locales)

Se guardan aquí, en vez de cargarlas desde un servidor externo (cdnjs),
para que nadie de afuera pueda cambiar el código que corre en el catálogo.

| Archivo | Librería | Versión | Huella SHA-512 |
|---|---|---|---|
| exceljs.min.js | ExcelJS (Excel del pedido) | 4.4.0 | `sha512-dlPw+ytv/6JyepmelABrgeYgHI0O+frEwgfnPdXDTOIZz+eDgfW07QXG02/O8COfivBdGNINy+Vex+lYmJ5rxw==` |
| jszip.min.js | JSZip (ZIP de fotos) | 3.10.1 | `sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==` |
| JsBarcode.all.min.js | JsBarcode (códigos de barras) | 3.12.3 | `sha512-nMnXAGKzA0wZ4YsriudrdnAKSFYXwdCvSt1Auwz6q7XXtSRoRcMVud13Q1LnQnobA2hRhLtHUv9tbVR5pyStPw==` |

Salen tal cual de la carpeta `dist/` del paquete oficial de npm; el paquete
se verificó contra la firma publicada por npm (`dist.integrity`).
Licencias: ExcelJS MIT, JSZip MIT (o GPLv3), JsBarcode MIT.

Para actualizar una: descargar la versión nueva desde npm, verificar su
firma, reemplazar el archivo y cambiar el `?v=` en `index.html`.
