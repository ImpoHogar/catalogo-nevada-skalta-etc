#!/usr/bin/env python3
# ============================================================
#  PROCESAR FOTOS DE PRODUCTOS
# ============================================================
#  Toma fotos sueltas, las empareja con su producto usando el Excel
#  de fotos (hoja "Fotos": N° foto / Codigo de barras / Nombre) y las
#  deja listas en img/productos/<codigo>.webp:
#    - fondo blanco (las transparencias se rellenan de blanco)
#    - cuadradas (se centra el producto, sin recortarlo)
#    - maximo 800x800 y en webp (cargan rapido)
#
#  Uso:
#    python3 herramientas/procesar_fotos.py Fotos.xlsx carpeta_o_fotos...
#        -> cada foto se empareja por su nombre: 0001.jpg = N° 0001.
#
#    python3 herramientas/procesar_fotos.py Fotos.xlsx --desde 6 a.jpg b.jpg c.jpg
#        -> fotos sin numero: se asignan en orden desde el N° 6
#           (a.jpg = 0006, b.jpg = 0007, ...). Ojo: si falta una, se corren.
#
#  Despues hay que correr actualizar_catalogo.py para que el catalogo
#  las detecte.
#
#  Requiere: pip install openpyxl pillow
# ============================================================

import argparse
import os
import re
import sys

try:
    import openpyxl
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Faltan librerias. Instalalas con:  pip install openpyxl pillow")

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(RAIZ, "img", "productos")
EXT = (".jpg", ".jpeg", ".png", ".webp")
LADO = 800


def leer_lista(path):
    ws = openpyxl.load_workbook(path, read_only=True)["Fotos"]
    lista = {}
    for fila in ws.iter_rows(min_row=2, values_only=True):
        if fila[0] and fila[1]:
            lista[int(fila[0])] = (str(fila[1]).strip(), str(fila[2] or "").strip())
    return lista


def juntar_fotos(entradas):
    fotos = []
    for e in entradas:
        if os.path.isdir(e):
            fotos += sorted(os.path.join(e, f) for f in os.listdir(e) if f.lower().endswith(EXT))
        else:
            fotos.append(e)
    return fotos


def procesar(src, dst):
    im = ImageOps.exif_transpose(Image.open(src))
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        fondo = Image.new("RGB", im.size, "white")
        fondo.paste(im, mask=im.split()[-1])
        im = fondo
    else:
        im = im.convert("RGB")
    lado = max(im.size)
    cuadro = Image.new("RGB", (lado, lado), "white")
    cuadro.paste(im, ((lado - im.width) // 2, (lado - im.height) // 2))
    if lado > LADO:
        cuadro = cuadro.resize((LADO, LADO), Image.LANCZOS)
    cuadro.save(dst, "WEBP", quality=82)


def main():
    ap = argparse.ArgumentParser(description="Empareja y prepara fotos de productos.")
    ap.add_argument("lista", help="Excel de fotos (hoja 'Fotos')")
    ap.add_argument("fotos", nargs="+", help="Fotos o carpetas con fotos")
    ap.add_argument("--desde", type=int, help="N° de la primera foto si no vienen numeradas")
    args = ap.parse_args()

    lista = leer_lista(args.lista)
    os.makedirs(DESTINO, exist_ok=True)
    siguiente = args.desde
    for src in juntar_fotos(args.fotos):
        base = os.path.splitext(os.path.basename(src))[0]
        if siguiente is not None:
            num = siguiente
            siguiente += 1
        elif re.fullmatch(r"\d{1,4}", base):
            num = int(base)
        else:
            print(f"SALTADA {src}: el nombre no es un N° de foto (usa --desde)")
            continue
        if num not in lista:
            print(f"SALTADA {src}: el N° {num:04d} no esta en la lista")
            continue
        code, nombre = lista[num]
        for ext in EXT:  # si ya habia una foto de este producto, se reemplaza
            viejo = os.path.join(DESTINO, code + ext)
            if os.path.exists(viejo):
                os.remove(viejo)
        procesar(src, os.path.join(DESTINO, code + ".webp"))
        print(f"{num:04d}  {code}  {nombre}  <- {os.path.basename(src)}")


if __name__ == "__main__":
    main()
