# Prepara la lista de ubicaciones de Costa Rica para Supabase (tablas
# nevada.geo_ip y nevada.geo_asn), a partir de los archivos gratuitos de
# DB-IP Lite (CC BY 4.0, https://db-ip.com):
#   - ciudad: dbip-city-ipv4-num.csv(.gz)   (desde, hasta, pais, provincia, -, ciudad, ...)
#   - proveedor: dbip-asn-ipv4-num.csv        (desde, hasta, asn, organizacion)
# Uso: python3 preparar_geo.py CIUDAD.csv[.gz] ASN.csv SALIDA_DIR
# Genera geo_ip.sql y geo_asn.sql (reemplazan el contenido de las tablas).
import bisect, csv, gzip, io, re, sys

ciudad, asn, out = sys.argv[1], sys.argv[2], sys.argv[3]
abrir = lambda f: io.TextIOWrapper(gzip.open(f), encoding='utf-8') if f.endswith('.gz') else open(f, encoding='utf-8')

TILDES = {
    'San Jose': 'San José', 'Limon': 'Limón', 'Puerto Limon': 'Puerto Limón', 'Perez Zeledon': 'Pérez Zeledón',
    'Escazu': 'Escazú', 'Paraiso': 'Paraíso', 'Belen': 'Belén', 'Aserri': 'Aserrí', 'Tibas': 'Tibás',
    'San Ramon': 'San Ramón', 'Guapiles': 'Guápiles', 'Guacimo': 'Guácimo', 'Tres Rios': 'Tres Ríos',
    'Rio Segundo': 'Río Segundo', 'Sarchi': 'Sarchí', 'Canas': 'Cañas', 'Tilaran': 'Tilarán', 'Samara': 'Sámara',
    'Jaco': 'Jacó', 'Puerto Cortes': 'Puerto Cortés', 'Concepcion': 'Concepción', 'La Asuncion': 'La Asunción',
    'Batan': 'Batán', 'Angeles': 'Ángeles', 'Barrio Jesus': 'Barrio Jesús', 'Colon': 'Colón',
    'Ipis': 'Ipís', 'Patarra': 'Patarrá', 'Montealegre': 'Montealegre', 'San Sebastian': 'San Sebastián',
    'Rohrmoser': 'Rohrmoser', 'Hatillo': 'Hatillo', 'Pavas': 'Pavas', 'Mata de Platano': 'Mata de Plátano',
    'Castro Fernandez': 'Castro Fernández', 'Gonzalez Lahmann': 'González Lahmann', 'General Canas': 'General Cañas',
    'Cordoba': 'Córdoba', 'Lomas del Rio': 'Lomas del Río', 'Mantica': 'Mántica', 'San Jose (Sabana)': 'Sabana',
    'Quesada': 'Ciudad Quesada', 'Moravia': 'Moravia', 'Curridabat': 'Curridabat', 'Tobosi': 'Tobosi',
    'San Isidro': 'San Isidro', 'Corredor': 'Corredores', 'Purral': 'Purral'
}
PROV = {'San Jose': 'San José', 'Limon': 'Limón'}
def prov(p):
    p = re.sub(r'\s*Province$', '', p.strip())
    return PROV.get(p, p)
def lugar(c, p):
    c = c.strip()
    m = re.match(r'^(.+?) \((.+)\)$', c)
    if m:
        base, det = m.group(1), m.group(2)
        # "San Jose (Pavas)" -> Pavas ; "Curridabat (Cipreses)" -> Curridabat
        c = det if base == 'San Jose' and det not in ('Oficinas',) else base
    return TILDES.get(c, c)
def q(s): return "'" + s.replace("'", "''") + "'"

filas = []
for r in csv.reader(abrir(ciudad)):
    if len(r) < 6 or r[2] != 'CR': continue
    filas.append((int(r[0]), int(r[1]), lugar(r[5], r[3]), prov(r[3])))
filas.sort()
# Une rangos seguidos con el mismo lugar
uni = []
for f in filas:
    if uni and uni[-1][1] + 1 == f[0] and uni[-1][2:] == f[2:]: uni[-1] = (uni[-1][0], f[1]) + f[2:]
    else: uni.append(f)

NOMBRES = {'11830': 'Kölbi (ICE)', '52228': 'Liberty', '262197': 'Tigo', '3790': 'RACSA', '262202': 'Liberty móvil',
           '52263': 'Telecable', '262145': 'Coopelesca', '262241': 'Coopealfaroruiz', '263683': 'Universidad de Costa Rica',
           '266853': 'Metrocom', '263232': 'ESPH', '27773': 'Claro'}
asns = [(int(r[0]), int(r[1]), r[2], r[3]) for r in csv.reader(abrir(asn))]
ini = [a[0] for a in asns]
prov_rangos = []
for a, b, *_ in uni:
    i = max(0, bisect.bisect_right(ini, a) - 1)
    while i < len(asns) and asns[i][0] <= b:
        x = asns[i]
        if x[1] >= a: prov_rangos.append((max(a, x[0]), min(b, x[1]), NOMBRES.get(x[2], x[3][:60])))
        i += 1
prov_rangos = sorted(set(prov_rangos))

with open(f'{out}/geo_ip.sql', 'w') as f:
    f.write('truncate nevada.geo_ip;\n')
    for k in range(0, len(uni), 800):
        f.write('insert into nevada.geo_ip (desde, hasta, lugar, provincia) values\n' +
                ',\n'.join(f'({a},{b},{q(l)},{q(p)})' for a, b, l, p in uni[k:k + 800]) + ';\n')
with open(f'{out}/geo_asn.sql', 'w') as f:
    f.write('truncate nevada.geo_asn;\n')
    for k in range(0, len(prov_rangos), 800):
        f.write('insert into nevada.geo_asn (desde, hasta, proveedor) values\n' +
                ',\n'.join(f'({a},{b},{q(n)})' for a, b, n in prov_rangos[k:k + 800]) + ';\n')
print('rangos de ubicación', len(uni), '· rangos de proveedor', len(prov_rangos))
