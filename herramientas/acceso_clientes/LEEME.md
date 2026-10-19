# Acceso de clientes y precios P4 — Catálogo Nevada

Cada cliente entra al catálogo con su **código de cliente** (el del sistema
Interakzion) y su **contraseña**. Ya no hay una contraseña general.

- **Primer ingreso:** el cliente usa la contraseña temporal que le da su
  vendedor (8 caracteres, por ejemplo `K7M42PQA`). El catálogo le obliga a
  crear su propia contraseña (mínimo 8 caracteres) antes de entrar. La
  temporal no distingue mayúsculas, espacios ni guiones.
- **Sesión:** dura 30 días en ese navegador. "Salir" (barra superior o menú
  "Más") la cierra.
- **Seguridad:** 5 intentos fallidos bloquean la cuenta 15 minutos. Las
  contraseñas se guardan cifradas (bcrypt); nadie puede verlas, ni siquiera
  en Supabase.
- **Precios:** el Excel del pedido trae el **precio P4 con IVA incluido** y
  el subtotal por producto, más una hoja "Resumen" con el total. Los
  productos sin P4 en el sistema salen con el precio en blanco. Los precios
  **nunca** aparecen en la pantalla ni en el código del catálogo: se piden a
  Supabase con la sesión del cliente solo al generar el Excel.

## Cómo funciona

```
tabla04.dbf (filas ID_TIPO = P4, columna PVENTA)
        │  cada 15 min, el sincronizador de la PC del inventario
        ▼
Supabase → esquema privado "nevada" (precios, clientes, sesiones)
        │  solo con código + contraseña válidos
        ▼
Catálogo → Excel del pedido con precio P4
```

Todo vive en el esquema privado `nevada` del mismo proyecto de Supabase. Es
**independiente de perfumería**: no usa sus tablas ni su sistema de usuarios
(los clientes de Nevada nunca son "usuarios autenticados" de Supabase, así que
no pueden ver nada de perfumería).

## Archivos

| Archivo | Para qué |
|---|---|
| `crear_acceso.sql` | Crea el esquema `nevada` y sus funciones. Se pega una vez en Supabase → SQL Editor → Run. Se puede volver a correr sin perder datos. |
| `../sincronizar_inventario/sincronizar_inventario.ps1` | Además del inventario, sube los precios P4 de `tabla04.dbf`. |
| `../sincronizar_inventario/administrar_clientes.bat` | Nueva contraseña temporal (olvido o cliente nuevo), desactivar o reactivar un cliente. |

## Tareas comunes

- **Un cliente olvidó su contraseña:** en la PC del inventario, doble clic en
  `administrar_clientes.bat` → opción 1 → código del cliente. Muestra una
  temporal nueva; dásela solo a ese cliente.
- **Cliente nuevo:** la misma opción 1. Si el código no tiene cuenta, pide el
  nombre y lo crea.
- **Quitar el acceso a alguien:** opción 2 (desactivar). Se cierra su sesión
  al instante.
