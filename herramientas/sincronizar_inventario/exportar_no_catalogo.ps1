# ============================================================
#  ARTICULOS CON EXISTENCIA QUE NO ESTAN EN EL CATALOGO
# ============================================================
#  Lee tabla01.dbf (CODIGO, ARTICULO, MARCA, CANTIDAD) y el catalogo
#  publicado, y genera un Excel con los articulos que tienen
#  existencia pero todavia no estan en el catalogo Nevada.
#
#  No lee ni exporta costos ni precios. No sube nada a internet:
#  solo descarga la lista de codigos del catalogo publicado.
#
#  Uso: doble clic en exportar_no_catalogo.bat
#  Resultado: articulos_no_catalogo.xlsx en esta misma carpeta.
# ============================================================
param([string]$Catalogo)
$ErrorActionPreference = 'Stop'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path

try {
  $cfgPath = Join-Path $aqui 'config.json'
  $dbf = '\\Servidor\interakzion\SISTEMA\tablas\tabla01.dbf'
  if (Test-Path $cfgPath) { $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json; if ($cfg.tabla_dbf) { $dbf = $cfg.tabla_dbf } }
  if ($dbf -match '\\\\SERVIDOR\\local') { throw "La ruta apunta al sistema de perfumeria." }
  if (-not (Test-Path $dbf)) { throw "No se encuentra la tabla: $dbf" }

  # ---------- Codigos del catalogo publicado ----------
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $urlCat = 'https://impohogar.github.io/catalogo-nevada-skalta-etc/js/products.js?t=' + [DateTime]::Now.Ticks
  # -Catalogo <ruta a products.js>: usa un archivo local en vez de descargarlo.
  if ($Catalogo) {
    $js = [IO.File]::ReadAllText($Catalogo)
  } else {
    Write-Host 'Descargando la lista de codigos del catalogo...'
    $js = (Invoke-WebRequest -Uri $urlCat -UseBasicParsing -UserAgent 'ImpoHogar-Nevada-Exportador/1.0').Content
  }
  $enCatalogo = @{}
  foreach ($m in [regex]::Matches($js, '"code"\s*:\s*"([^"]+)"')) { $enCatalogo[$m.Groups[1].Value] = $true }
  if ($enCatalogo.Count -lt 500) { throw "Solo se encontraron $($enCatalogo.Count) codigos en el catalogo publicado. Revisa la conexion." }
  Write-Host ("  {0} codigos en el catalogo." -f $enCatalogo.Count)

  # ---------- Lectura del DBF ----------
  Write-Host 'Leyendo la tabla del sistema...'
  $fs = [IO.File]::Open($dbf, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    $b = New-Object byte[] $fs.Length
    $leido = 0
    while ($leido -lt $b.Length) { $r = $fs.Read($b, $leido, $b.Length - $leido); if ($r -le 0) { break }; $leido += $r }
  } finally { $fs.Close() }

  $nReg = [BitConverter]::ToUInt32($b, 4)
  $hl = [BitConverter]::ToUInt16($b, 8)
  $rl = [BitConverter]::ToUInt16($b, 10)
  $campos = @{}
  $off = 1
  for ($i = 32; $i -lt $hl -and $b[$i] -ne 13; $i += 32) {
    $nm = [Text.Encoding]::ASCII.GetString($b, $i, 11).Trim([char]0, ' ')
    $campos[$nm] = @{ t = [char]$b[$i + 11]; o = $off; l = $b[$i + 16] }
    $off += $b[$i + 16]
  }
  foreach ($c in 'CODIGO', 'CANTIDAD', 'ARTICULO') { if (-not $campos.ContainsKey($c)) { throw "La tabla no tiene la columna $c." } }
  $enc = [Text.Encoding]::GetEncoding(1252)

  function Txt($base, $nombre) {
    if (-not $campos.ContainsKey($nombre)) { return '' }
    $f = $campos[$nombre]
    $largo = $f.l
    if ($f.t -eq 'V') { $ult = $b[$base + $f.o + $f.l - 1]; if ($ult -lt $f.l) { $largo = $ult } }
    return ($enc.GetString($b, $base + $f.o, $largo) -replace '^[\x00-\x20]+|[\x00-\x20]+$', '')
  }
  function Num($base, $nombre) {
    $f = $campos[$nombre]; $s = $base + $f.o
    switch ($f.t) {
      'B' { return [BitConverter]::ToDouble($b, $s) }
      'I' { return [BitConverter]::ToInt32($b, $s) }
      'Y' { return [BitConverter]::ToInt64($b, $s) / 10000 }
      default {
        $v = 0.0
        if ([double]::TryParse(($enc.GetString($b, $s, $f.l).Trim([char]0, ' ')), [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$v)) { return $v }
        return 0
      }
    }
  }

  $filas = New-Object System.Collections.ArrayList
  $vistos = @{}
  $maxReg = [Math]::Min([int64]$nReg, [int64][Math]::Floor(($b.Length - $hl) / $rl))
  for ($r = 0; $r -lt $maxReg; $r++) {
    $base = $hl + $r * $rl
    if ($b[$base] -eq 42) { continue }
    $code = Txt $base 'CODIGO'
    if (-not $code -or $vistos.ContainsKey($code)) { continue }
    $vistos[$code] = $true
    if ($enCatalogo.ContainsKey($code)) { continue }
    $q = [Math]::Round([double](Num $base 'CANTIDAD'))
    if ($q -le 0) { continue }
    [void]$filas.Add([pscustomobject]@{ Codigo = $code; Descripcion = (Txt $base 'ARTICULO'); Marca = (Txt $base 'MARCA'); Cantidad = [int64]$q })
  }
  $filas = @($filas | Sort-Object Marca, Descripcion)
  Write-Host ("  {0} articulos con existencia que no estan en el catalogo." -f $filas.Count)

  # ---------- Excel (.xlsx) sin necesitar Excel instalado ----------
  function X($s) { return [Security.SecurityElement]::Escape([string]$s) }
  function Celda($ref, $s) { return '<c r="' + $ref + '" t="inlineStr"><is><t xml:space="preserve">' + (X $s) + '</t></is></c>' }
  $sb = New-Object Text.StringBuilder
  [void]$sb.Append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="18" customWidth="1"/><col min="2" max="2" width="60" customWidth="1"/><col min="3" max="3" width="20" customWidth="1"/><col min="4" max="4" width="11" customWidth="1"/></cols><sheetData>')
  [void]$sb.Append('<row r="1">' + (Celda 'A1' 'Codigo de barras') + (Celda 'B1' 'Descripcion') + (Celda 'C1' 'Marca') + (Celda 'D1' 'Cantidad') + '</row>')
  $n = 1
  foreach ($f in $filas) {
    $n++
    [void]$sb.Append('<row r="' + $n + '">' + (Celda "A$n" $f.Codigo) + (Celda "B$n" $f.Descripcion) + (Celda "C$n" $f.Marca) + '<c r="D' + $n + '"><v>' + $f.Cantidad + '</v></c></row>')
  }
  [void]$sb.Append('</sheetData><autoFilter ref="A1:D' + $n + '"/></worksheet>')

  $partes = [ordered]@{
    '[Content_Types].xml'        = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
    '_rels/.rels'                = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
    'xl/workbook.xml'            = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="No en catalogo" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">''No en catalogo''!$A$1:$D$' + $n + '</definedName></definedNames></workbook>'
    'xl/_rels/workbook.xml.rels' = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
    'xl/worksheets/sheet1.xml'   = $sb.ToString()
  }
  Add-Type -AssemblyName System.IO.Compression
  $salida = Join-Path $aqui 'articulos_no_catalogo.xlsx'
  if (Test-Path $salida) { Remove-Item $salida -Force }
  $fsx = [IO.File]::Open($salida, [IO.FileMode]::CreateNew)
  try {
    $zip = New-Object IO.Compression.ZipArchive($fsx, [IO.Compression.ZipArchiveMode]::Create)
    foreach ($k in $partes.Keys) {
      $w = New-Object IO.StreamWriter(($zip.CreateEntry($k)).Open(), (New-Object Text.UTF8Encoding($false)))
      $w.Write($partes[$k]); $w.Close()
    }
    $zip.Dispose()
  } finally { $fsx.Close() }

  Write-Host ''
  Write-Host "LISTO: $salida" -ForegroundColor Green
  exit 0
}
catch {
  Write-Host ("ERROR: " + $_.Exception.Message) -ForegroundColor Red
  exit 1
}
