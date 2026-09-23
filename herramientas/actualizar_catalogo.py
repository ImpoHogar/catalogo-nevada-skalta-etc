#!/usr/bin/env python3
# ============================================================
#  ACTUALIZAR EL CATALOGO DESDE EXCEL
# ============================================================
#  Genera js/products.js (el catalogo) y js/stock.js (las cantidades)
#  a partir de la plantilla de carga de productos.
#
#  Uso (desde la carpeta del repo):
#
#    python3 herramientas/actualizar_catalogo.py plantilla.xlsx
#        -> regenera products.js y, si la plantilla trae la columna
#           "Bod Principal", tambien stock.js.
#
#    python3 herramientas/actualizar_catalogo.py plantilla.xlsx --inventario inventario.xlsx
#        -> products.js sale de la plantilla y stock.js del Excel de
#           inventario de siempre (Codigo / Nombre / Bod Principal).
#
#    python3 herramientas/actualizar_catalogo.py --solo-stock inventario.xlsx
#        -> SOLO reemplaza stock.js. No toca products.js.
#
#  Reglas importantes:
#   * El codigo de barras se toma EXACTO (solo se le quitan espacios).
#     Nunca se normalizan ceros a la izquierda.
#   * Los productos que ya estaban en products.js CONSERVAN su id (el
#     carrito y el historial de los clientes dependen de el).
#   * Los productos nuevos (codigo que no estaba antes) reciben la fecha
#     de hoy en "dateAdded" y aparecen solos en "Nuevos ingresos".
#   * Las fotos se buscan en img/productos/<codigo>.jpg|.jpeg|.png|.webp
#   * Las categorias internas (gastos, material POP, exhibidores,
#     regalias...) no se publican.
#
#  Requiere: pip install openpyxl
# ============================================================

import argparse
import datetime
import json
import os
import re
import sys
import unicodedata

try:
    import openpyxl
except ImportError:
    sys.exit("Falta openpyxl. Instalalo con:  pip install openpyxl")

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRODUCTS_JS = os.path.join(RAIZ, "js", "products.js")
STOCK_JS = os.path.join(RAIZ, "js", "stock.js")
FOTOS_DIR = os.path.join(RAIZ, "img", "productos")
EXT_FOTOS = (".jpg", ".jpeg", ".png", ".webp")


def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def clave(s):
    """Texto en mayusculas, sin tildes ni espacios dobles (para comparar)."""
    return re.sub(r"\s+", " ", sin_tildes(str(s or "")).upper()).strip()


# ------------------------------------------------------------
#  MARCAS: nombre de la categoria del sistema -> marca publicada
# ------------------------------------------------------------
MARCA_PUBLICADA = {
    "ARGON": "ARGOM",
    "BATERIAS MAXELL": "MAXELL",
    "MAXELL ACCESORIOS": "MAXELL",
    "MAQUILLAJE": "PATRICIA DE LEÓN",
    "VICTORIA SECRET": "VICTORIA'S SECRET",
}

# Categorias del sistema que NO se publican (uso interno).
CATEGORIAS_OCULTAS = {
    "GASTOS", "MATERIAL POP", "MUEBLES PARA EXI DIF",
    "REGALIAS-ACTIVACIONE", "TESTER",
}
NOMBRES_OCULTOS = ("EXHIBIDOR", "DISPLAY DE MESA")

# ------------------------------------------------------------
#  CATEGORIAS DEL CATALOGO (las tarjetas de arriba)
#  Deben coincidir con CATEGORIAS en js/config.js
# ------------------------------------------------------------
TEC = "Tecnología"
ELEC = "Electrodomésticos"
MAQ = "Maquillaje"
FACIAL = "Cuidado facial"
CORP = "Cuidado corporal"
CAB = "Cabello y barbería"
FRAG = "Fragancias"
OTROS = "Otros"

POR_MARCA = {
    "ARGON": TEC, "UNNO TEKNO": TEC, "BATERIAS MAXELL": TEC, "MAXELL ACCESORIOS": TEC,
    "BRENTWOOD": ELEC, "NOSTALGIA": ELEC, "WAHL": ELEC,
    "TREE HUT": CORP, "NIVEA": CORP,
    "SKALA": CAB, "ORIGEM": CAB, "INOAR": CAB, "SALON LINE": CAB, "IMMORTAL": CAB,
    "EQQUALBERRY": FACIAL,
    "MAQUILLAJE": MAQ,
    "AFNAN": FRAG, "ARMANI": FRAG, "CAROLINA HERRERA": FRAG, "ADIDAS": FRAG,
    "VICTORIA SECRET": FRAG,
}

# Marcas mixtas: se decide por palabras del nombre.
MAQ_FUERTE = ("FOUNDATION", "FUNDATION", "CUSHION", "BASE FIT", "CORRECTOR", "TINT",
              "LIP", "LABIAL", "BLUSH", "RUBOR", "BB CREAM", "MASCARA ", "MASCARA-",
              "MASK FIT", "GLOW POP", "LINER", "BROW", "HIGHLIGHT", "CONTOUR",
              "SHIMMER", "ILUMIN", "ILLUMIN", "SHADE", "PALET", "SUNLIT")
FACIAL_PAL = ("SERUM", "TONER", "TONICO", "LIMPIADOR", "CLEANS", "FOAMIN", "MASCARILLA",
              "MASK", "SUN LOTION", "BLOQUEADOR", "BLOQUEDOR", "SUNSCREEN", "AMPOLLA",
              "AMPOULE", "PADS", "CREMA", "CREAM", "PORE", "MATCHA", "DESMAQUILLANTE",
              "REMOVEDOR", "MICELAR", "FACIAL", "CONTORNO", "HIDRATANTE", "EXFOLIANTE",
              "JABON", "LECHE LIMPIADORA", "CAPSULA", "WIPES", " SET ")


def categoria_de(cat_sistema, nombre):
    c = clave(cat_sistema)
    n = " " + clave(nombre) + " "
    if c in POR_MARCA:
        cat = POR_MARCA[c]
        if c == "ORIGEM" and re.search(r"CRE,?A CORP|CREMA CORP", n):
            return CORP
        if c == "SKALA" and any(k in n for k in ("COLONIA BEBE", "JABON SKALA SKALINHA", "SKALINHA 200ML LAVANDA")):
            return CORP
        return cat
    if c == "NEVADA":
        if any(k in n for k in ("SHAMPOO", "SHP ", "CAPILAR")) and "FACIAL" not in n:
            return CAB
        if any(k in n for k in ("CORPORAL", "CORP ", "GEL DE BANO", "CREMA DISNEY")) and "FACIAL" not in n:
            return CORP
        if "BB CREAM" in n:
            return MAQ
        return FACIAL
    if c in ("TIRTIR", "KARA BEAUTY"):
        if any(k in n for k in MAQ_FUERTE):
            return MAQ
        if any(k in n for k in FACIAL_PAL):
            return FACIAL
        return MAQ
    return OTROS


def marca_de(cat_sistema):
    c = clave(cat_sistema)
    if c in MARCA_PUBLICADA:
        return MARCA_PUBLICADA[c]
    return re.sub(r"\s+", " ", str(cat_sistema)).strip().upper()


# ------------------------------------------------------------
#  LECTURA DE EXCEL
# ------------------------------------------------------------
def texto_codigo(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip()


def numero(v):
    try:
        return float(str(v).replace(",", "").strip() or 0)
    except ValueError:
        return 0.0


def leer_hoja(path, requeridas):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    for ws in wb.worksheets:
        filas = ws.iter_rows(values_only=True)
        for encabezado in filas:
            cols = {clave(h): i for i, h in enumerate(encabezado) if h is not None}
            if all(r in cols for r in requeridas):
                datos = [f for f in filas if f and any(x is not None for x in f)]
                return cols, datos
            break
    sys.exit(f"No encontre una hoja con las columnas {requeridas} en {path}")


def leer_plantilla(path):
    cols, filas = leer_hoja(path, ["CODIGO", "NOMBRE", "CATEGORIA"])
    productos = []
    for f in filas:
        code = texto_codigo(f[cols["CODIGO"]])
        nombre = re.sub(r"\s+", " ", str(f[cols["NOMBRE"]] or "")).strip()
        cat = str(f[cols["CATEGORIA"]] or "").strip()
        if not code or not nombre:
            continue
        stock = numero(f[cols["BOD PRINCIPAL"]]) if "BOD PRINCIPAL" in cols else None
        productos.append({"code": code, "name": nombre, "cat": cat, "stock": stock})
    return productos, ("BOD PRINCIPAL" in cols)


def leer_inventario(path):
    cols, filas = leer_hoja(path, ["CODIGO", "BOD PRINCIPAL"])
    stock = {}
    for f in filas:
        code = texto_codigo(f[cols["CODIGO"]])
        if code:
            stock[code] = numero(f[cols["BOD PRINCIPAL"]])
    return stock


def leer_products_js():
    """Lee el products.js actual para conservar ids, fechas y extras."""
    if not os.path.exists(PRODUCTS_JS):
        return {}
    previos = {}
    with open(PRODUCTS_JS, encoding="utf-8") as fh:
        for linea in fh:
            linea = linea.strip().rstrip(",")
            if linea.startswith("{") and linea.endswith("}"):
                p = json.loads(linea)
                previos[p["code"]] = p
    return previos


def buscar_foto(code):
    for ext in EXT_FOTOS:
        for nombre in (code + ext, code + ext.upper()):
            if os.path.exists(os.path.join(FOTOS_DIR, nombre)):
                return nombre
    return False


# ------------------------------------------------------------
#  ESCRITURA
# ------------------------------------------------------------
CABECERA_PRODUCTS = """// ============================================================
//  CATALOGO DE PRODUCTOS
// ============================================================
//  Un producto por linea. Las CANTIDADES no viven aca: estan en
//  js/stock.js y se pegan a cada producto al cargar la pagina.
//
//  Archivo generado por herramientas/actualizar_catalogo.py
//  desde la plantilla de carga. Si lo editas a mano, respeta el
//  formato de una linea por producto.
//
//  Campos: id (no cambiarlo nunca), brand, code (exacto, con sus
//  ceros), name, categoria (una de CATEGORIAS en config.js),
//  img (nombre del archivo en img/productos/ o false),
//  dateAdded (opcional: lo pone "Nuevos ingresos"),
//  notes (opcional: detalles que se muestran en la ficha).
// ============================================================
const PRODUCTS = [
"""

CABECERA_STOCK = """// ============================================================
//  CANTIDADES POR CODIGO DE BARRAS
// ============================================================
//  Este es el UNICO archivo que hay que reemplazar cuando llega
//  el excel de inventario. Formato: "codigo": cantidad,
//
//  OJO: el cruce es por coincidencia EXACTA del codigo. Hay codigos
//  que solo se diferencian por un cero al inicio y son productos
//  distintos: no normalizar ceros.
//
//  Valores negativos del excel se llevan a 0 (agotado) hasta que
//  se revisen en el sistema interno.
//
//  Generado el {fecha} por herramientas/actualizar_catalogo.py
// ============================================================
const STOCK = {{
"""


def escribir_products(lista):
    with open(PRODUCTS_JS, "w", encoding="utf-8") as fh:
        fh.write(CABECERA_PRODUCTS)
        fh.write(",\n".join("  " + json.dumps(p, ensure_ascii=False, separators=(",", ":")) for p in lista))
        fh.write("\n];\n")


def escribir_stock(stock):
    hoy = datetime.date.today().isoformat()
    with open(STOCK_JS, "w", encoding="utf-8") as fh:
        fh.write(CABECERA_STOCK.format(fecha=hoy))
        fh.write(",\n".join(f"  {json.dumps(c)}: {max(0, int(round(q)))}" for c, q in stock.items()))
        fh.write("\n};\n")


def main():
    ap = argparse.ArgumentParser(description="Genera js/products.js y js/stock.js desde Excel.")
    ap.add_argument("plantilla", nargs="?", help="Plantilla de carga de productos (.xlsx)")
    ap.add_argument("--inventario", help="Excel de inventario (Codigo / Nombre / Bod Principal)")
    ap.add_argument("--solo-stock", metavar="INVENTARIO", help="Solo regenera stock.js desde este Excel")
    args = ap.parse_args()

    if args.solo_stock:
        stock = leer_inventario(args.solo_stock)
        escribir_stock(stock)
        previos = leer_products_js()
        faltan = [c for c in previos if c not in stock]
        print(f"stock.js: {len(stock)} codigos.")
        if faltan:
            print(f"Aviso: {len(faltan)} productos del catalogo no vienen en el inventario (quedan agotados):")
            for c in faltan[:30]:
                print("   ", c, previos[c]["name"])
        return

    if not args.plantilla:
        ap.error("falta la plantilla .xlsx (o usa --solo-stock)")

    filas, trae_stock = leer_plantilla(args.plantilla)
    previos = leer_products_js()
    primera_vez = not previos
    siguiente_id = max([p["id"] for p in previos.values()] + [0]) + 1
    hoy = datetime.date.today().isoformat()

    productos, ocultos, otros, vistos = [], [], [], set()
    stock = {}
    for f in filas:
        if f["code"] in vistos:
            print("Aviso: codigo repetido, se usa solo la primera fila:", f["code"], f["name"])
            continue
        vistos.add(f["code"])
        if clave(f["cat"]) in CATEGORIAS_OCULTAS or any(k in clave(f["name"]) for k in NOMBRES_OCULTOS):
            ocultos.append(f)
            continue
        prev = previos.get(f["code"], {})
        p = {
            "id": prev.get("id") or siguiente_id,
            "brand": marca_de(f["cat"]),
            "code": f["code"],
            "name": f["name"],
            "categoria": categoria_de(f["cat"], f["name"]),
            "img": buscar_foto(f["code"]),
        }
        if not prev:
            siguiente_id += 1
            if not primera_vez:
                p["dateAdded"] = hoy
        elif prev.get("dateAdded"):
            p["dateAdded"] = prev["dateAdded"]
        if prev.get("notes"):
            p["notes"] = prev["notes"]
        if p["categoria"] == OTROS:
            otros.append(p)
        productos.append(p)
        if f["stock"] is not None:
            stock[f["code"]] = f["stock"]

    productos.sort(key=lambda p: p["id"])
    escribir_products(productos)

    if args.inventario:
        stock = leer_inventario(args.inventario)
    if args.inventario or trae_stock:
        escribir_stock(stock)

    from collections import Counter
    cats = Counter(p["categoria"] for p in productos)
    print(f"products.js: {len(productos)} productos publicados.")
    for c, n in cats.most_common():
        print(f"   {n:5d}  {c}")
    print(f"Con foto: {sum(1 for p in productos if p['img'])} / {len(productos)}")
    nuevos = [p for p in productos if p.get("dateAdded") == hoy]
    if nuevos:
        print(f"Nuevos ingresos de hoy: {len(nuevos)}")
    if ocultos:
        print(f"No publicados (uso interno): {len(ocultos)}")
        for f in ocultos:
            print(f"    {f['code']}  {f['name']}  [{f['cat']}]")
    if otros:
        print(f"Aviso: {len(otros)} productos quedaron en 'Otros' (categoria nueva). "
              "Agregala en POR_MARCA de este script si hace falta.")
    if args.inventario or trae_stock:
        print(f"stock.js: {len(stock)} codigos.")


if __name__ == "__main__":
    main()
