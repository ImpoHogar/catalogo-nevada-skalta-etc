# Sincronizar inventario — Catálogo Nevada (ImpoHogar Market)

Sube las existencias del sistema **Interakzion → SISTEMA IMPOHOGAR** a Supabase
cada 15 minutos. El catálogo las lee de ahí; ya no hace falta actualizar
`js/stock.js` a mano.

```
\\Servidor\interakzion\SISTEMA\tablas\tabla01.dbf   (CODIGO, CANTIDAD)
        │  cada 15 min, desde la PC del inventario
        ▼
Supabase → tabla nevada_inventario  (una fila: {"código": cantidad})
        │  al abrir el catálogo (clave pública, solo lectura)
        ▼
https://impohogar.github.io/catalogo-nevada-skalta-etc/
```

- **Solo se leen `CODIGO` y `CANTIDAD`.** Costos, precios y el resto de
  columnas de `tabla01.dbf` nunca salen de la red de la empresa.
- **No toca perfumería.** El sistema de perfumería (`\\SERVIDOR\local`, acceso
  "SISTEMA PERFUMES") y su tabla `productos` en Supabase no se leen ni se
  modifican. El script se niega a correr si la ruta apunta a perfumería.
- **Si algo falla, el catálogo sigue con `js/stock.js`.** Si Supabase no
  responde en 3,5 s, o trae datos incompletos, se usa el último `stock.js`.
- **Protecciones:** si la tabla trae menos de 1.000 códigos, no se sube nada
  (para no vaciar el catálogo). Los negativos se suben como 0 (agotado).

## Archivos

| Archivo | Para qué |
|---|---|
| `crear_tabla.sql` | Crea la tabla `nevada_inventario` en Supabase (una sola vez). |
| `config.ejemplo.json` | Modelo de configuración. Se copia como `config.json`. |
| `sincronizar_inventario.ps1` | Lee el DBF y sube las existencias. |
| `probar_lectura.bat` | Solo lee y muestra un resumen. **No sube nada.** |
| `ejecutar_ahora.bat` | Sincroniza en este momento y muestra el resultado. |
| `INSTALAR.bat` / `instalar_todo.ps1` | Instalación de un solo paso (configura, prueba, sincroniza y programa). |
| `instalar_tarea.ps1` | Programa la sincronización cada 15 minutos. |
| `desinstalar_tarea.ps1` | Quita la tarea programada. |
| `sincronizar_inventario.log` | Registro de cada ejecución (se crea solo). |

## Instalación rápida (un solo paso)

Con la tabla ya creada en Supabase (paso 1 de abajo) y la carpeta copiada en la
PC del inventario: **doble clic en `INSTALAR.bat`**, pega la clave secreta
cuando la pida y presiona Enter. Configura, prueba la lectura, hace la primera
sincronización y deja programada la tarea cada 15 minutos.

## Instalación paso a paso (una sola vez)

1. **Crear la tabla en Supabase.** Entra al proyecto (el mismo de
   perfumería) → **SQL Editor** → **New query** → pega todo
   `crear_tabla.sql` → **Run**. Crea solo `nevada_inventario`; no toca otras
   tablas.
2. **Crear la clave secreta.** En Supabase → **Project Settings → API Keys →
   Secret keys → Create new secret key** (nombre: `nevada-sincronizador`).
   Copia la clave (`sb_secret_...`). **No la mandes por chat ni la subas a
   GitHub.**
3. **Copiar esta carpeta a la PC del inventario**, por ejemplo a
   `C:\ImpoHogar\sincronizar_inventario`.
4. **Configurar:** copia `config.ejemplo.json` como `config.json`, ábrelo con
   el Bloc de notas y pega la clave secreta en `clave_secreta`. La ruta
   `tabla_dbf` ya apunta al sistema correcto.
5. **Probar la lectura:** doble clic en `probar_lectura.bat`. Debe decir algo
   como `Leidos 8300 codigos...` y mostrar las existencias de 6 productos de
   muestra.
6. **Primera sincronización:** doble clic en `ejecutar_ahora.bat`. Debe
   terminar con `OK: ... codigos subidos a Supabase`.
7. **Dejarlo automático:** abre PowerShell en esta carpeta y ejecuta:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\instalar_tarea.ps1
   ```

   Desde ahí corre cada 15 minutos mientras la sesión de Windows esté
   abierta (necesita ver `\\Servidor\interakzion`).
8. **Comprobar en el catálogo:** al abrirlo, debajo del título del inicio
   aparece **"Inventario actualizado hoy HH:MM"**.

## Problemas comunes

- **`No se encuentra la tabla`**: la PC no ve el servidor. Abre
  `\\Servidor\interakzion` en el Explorador e inicia sesión si lo pide.
- **`Falta la clave secreta`**: falta pegar la clave en `config.json`.
- **`HTTP 401/403`**: la clave secreta no es correcta (cópiala con el botón
  de copiar del panel; debe empezar con `sb_secret_`) o la tabla no se creó
  (paso 1). El script ya manda la clave solo en `apikey` y con un
  User-Agent propio: Supabase rechaza las claves secretas cuando la petición
  parece venir de un navegador.
- **`Leidos ... codigos` pero las muestras dicen `(no esta)`**: versión vieja
  del script (no leía bien los campos de texto variable de FoxPro).
  Reemplaza `sincronizar_inventario.ps1` por la versión nueva.
- **El catálogo no muestra "Inventario actualizado"**: revisa
  `sincronizar_inventario.log`; mientras tanto, el catálogo usa `stock.js`.
