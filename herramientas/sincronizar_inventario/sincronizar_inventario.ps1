# ============================================================
#  SINCRONIZAR INVENTARIO - Catalogo Nevada (ImpoHogar Market)
# ============================================================
#  Lee las existencias del sistema Interakzion "SISTEMA IMPOHOGAR"
#  (tabla01.dbf: columnas CODIGO y CANTIDAD) y las sube a Supabase,
#  tabla "nevada_inventario". El catalogo las lee de ahi.
#
#  SOLO lee CODIGO y CANTIDAD. Costos, precios y demas columnas de la
#  tabla NUNCA salen de la red de la empresa.
#
#  No toca el sistema de perfumeria (\\SERVIDOR\local) ni su tabla.
#
#  Uso:
#    powershell -ExecutionPolicy Bypass -File sincronizar_inventario.ps1 -Prueba
#        Solo lee y muestra un resumen. NO sube nada.
#    powershell -ExecutionPolicy Bypass -File sincronizar_inventario.ps1
#        Lee y sube (lo que hace la tarea programada cada 15 min).
#
#  Configuracion: config.json en esta misma carpeta (copiar de
#  config.ejemplo.json). La clave secreta vive SOLO en ese archivo.
# ============================================================
param([switch]$Prueba)

$ErrorActionPreference = 'Stop'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$log = Join-Path $aqui 'sincronizar_inventario.log'

function Log($msg) {
  $linea = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '  ' + $msg
  Write-Host $linea
  try {
    # El registro no crece sin limite: se queda con las ultimas 2000 lineas.
    if ((Test-Path $log) -and (Get-Item $log).Length -gt 400KB) {
      $ult = Get-Content $log -Tail 2000
      Set-Content $log $ult -Encoding UTF8
    }
    Add-Content $log $linea -Encoding UTF8
  } catch { }
}

# ---------- Precios P4 (tabla04: una fila por articulo y tipo de precio) ----------
# Lee SOLO las filas con ID_TIPO = P4 y su PVENTA (precio con IVA). No lee
# costos ni margenes. Devuelve @{ codigo = precio }.
function Leer-PreciosP4($ruta) {
  $fs = [IO.File]::Open($ruta, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    $b = New-Object byte[] $fs.Length
    $leido = 0
    while ($leido -lt $b.Length) { $r = $fs.Read($b, $leido, $b.Length - $leido); if ($r -le 0) { break }; $leido += $r }
  } finally { $fs.Close() }
  $nReg = [BitConverter]::ToUInt32($b, 4); $hl = [BitConverter]::ToUInt16($b, 8); $rl = [BitConverter]::ToUInt16($b, 10)
  $campos = @{}
  $off = 1
  for ($i = 32; $i -lt $hl -and $b[$i] -ne 13; $i += 32) {
    $nm = [Text.Encoding]::ASCII.GetString($b, $i, 11).Trim([char]0, ' ')
    $campos[$nm] = @{ t = [char]$b[$i + 11]; o = $off; l = $b[$i + 16] }
    $off += $b[$i + 16]
  }
  foreach ($c in 'ID_TIPO', 'CODIGO', 'PVENTA') { if (-not $campos.ContainsKey($c)) { throw "La tabla de precios no tiene la columna $c." } }
  $enc = [Text.Encoding]::GetEncoding(1252)
  $texto = {
    param($base, $f)
    $largo = $f.l
    if ($f.t -eq 'V') { $ult = $b[$base + $f.o + $f.l - 1]; if ($ult -lt $f.l) { $largo = $ult } }
    $enc.GetString($b, $base + $f.o, $largo) -replace '^[\x00-\x20]+|[\x00-\x20]+$', ''
  }
  $fT = $campos['ID_TIPO']; $fC = $campos['CODIGO']; $fP = $campos['PVENTA']
  $precios = @{}
  $max = [Math]::Min([int64]$nReg, [int64][Math]::Floor(($b.Length - $hl) / $rl))
  for ($r = 0; $r -lt $max; $r++) {
    $base = $hl + $r * $rl
    if ($b[$base] -eq 42) { continue }
    if ((& $texto $base $fT) -ne 'P4') { continue }
    $code = & $texto $base $fC
    if (-not $code -or $precios.ContainsKey($code)) { continue }
    $s = $base + $fP.o
    $v = 0.0
    switch ($fP.t) {
      'B' { $v = [BitConverter]::ToDouble($b, $s) }
      'Y' { $v = [BitConverter]::ToInt64($b, $s) / 10000 }
      'I' { $v = [double][BitConverter]::ToInt32($b, $s) }
      default { [void][double]::TryParse((& $texto $base $fP), [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$v) }
    }
    if ($v -gt 0) { $precios[$code] = [Math]::Round($v, 2) }
  }
  return $precios
}

try {
  # ---------- Configuracion ----------
  $cfgPath = Join-Path $aqui 'config.json'
  if (-not (Test-Path $cfgPath)) { throw "Falta config.json (copia config.ejemplo.json y completalo)." }
  $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
  $dbf = $cfg.tabla_dbf
  $minimo = if ($cfg.minimo_codigos) { [int]$cfg.minimo_codigos } else { 1000 }
  if ($dbf -match '\\\\SERVIDOR\\local') { throw "La ruta apunta al sistema de perfumeria. Debe ser \\Servidor\interakzion\SISTEMA\tablas\tabla01.dbf" }
  if (-not (Test-Path $dbf)) { throw "No se encuentra la tabla: $dbf" }
  # Precios P4: tabla04.dbf en la misma carpeta (o "tabla_precios" en config.json).
  $tablaPrecios = if ($cfg.tabla_precios) { $cfg.tabla_precios } else { Join-Path (Split-Path -Parent $dbf) 'tabla04.dbf' }
  if ($tablaPrecios -match '\\\\SERVIDOR\\local') { throw "La ruta de precios apunta al sistema de perfumeria." }

  # ---------- Lectura del DBF (sin bloquear al sistema) ----------
  # Se abre en modo lectura compartida: Interakzion puede seguir
  # trabajando mientras se lee.
  $fs = [IO.File]::Open($dbf, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    $b = New-Object byte[] $fs.Length
    $leido = 0
    while ($leido -lt $b.Length) {
      $r = $fs.Read($b, $leido, $b.Length - $leido)
      if ($r -le 0) { break }
      $leido += $r
    }
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
  foreach ($c in 'CODIGO', 'CANTIDAD') { if (-not $campos.ContainsKey($c)) { throw "La tabla no tiene la columna $c. No se sube nada." } }
  $fc = $campos['CODIGO']; $fq = $campos['CANTIDAD']
  $enc = [Text.Encoding]::GetEncoding(1252)

  function Num($s, $d) {
    switch ($d.t) {
      'B' { return [BitConverter]::ToDouble($b, $s) }
      'I' { return [BitConverter]::ToInt32($b, $s) }
      'Y' { return [BitConverter]::ToInt64($b, $s) / 10000 }
      default {
        $txt = $enc.GetString($b, $s, $d.l).Trim([char]0, ' ')
        $v = 0.0
        if ([double]::TryParse($txt, [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$v)) { return $v }
        return 0
      }
    }
  }

  $stock = @{}
  $duplicados = 0; $sinCodigo = 0; $negativos = 0
  $maxReg = [Math]::Min([int64]$nReg, [int64][Math]::Floor(($b.Length - $hl) / $rl))
  for ($r = 0; $r -lt $maxReg; $r++) {
    $base = $hl + $r * $rl
    if ($b[$base] -eq 42) { continue }                      # registro borrado (*)
    # Campo 'V' (varchar de Visual FoxPro): si el valor es mas corto que el
    # campo, su largo real va en el ultimo byte. Se respeta ese largo y se
    # quitan espacios y caracteres de control sobrantes.
    $largo = $fc.l
    if ($fc.t -eq 'V') { $ult = $b[$base + $fc.o + $fc.l - 1]; if ($ult -lt $fc.l) { $largo = $ult } }
    $code = $enc.GetString($b, $base + $fc.o, $largo) -replace '^[\x00-\x20]+|[\x00-\x20]+$', ''
    if (-not $code) { $sinCodigo++; continue }
    $q = [Math]::Round([double](Num ($base + $fq.o) $fq))
    if ($q -lt 0) { $negativos++; $q = 0 }                  # negativo = agotado
    if ($stock.ContainsKey($code)) { $duplicados++; continue }   # se queda el primero
    $stock[$code] = [int64]$q
  }

  $total = $stock.Count
  Log ("Leidos {0} codigos de {1} (sin codigo: {2}, duplicados: {3}, negativos llevados a 0: {4})" -f $total, $dbf, $sinCodigo, $duplicados, $negativos)
  if ($total -lt $minimo) { throw "Solo $total codigos (minimo $minimo): algo raro con la tabla. No se sube nada para no vaciar el catalogo." }

  if ($Prueba) {
    $muestra = '7897042017881', '886540004179', '847610009159', '025215720734', '8809679696451', '810112884715'
    foreach ($m in $muestra) { Write-Host ("   {0}  ->  {1}" -f $m, $(if ($stock.ContainsKey($m)) { $stock[$m] } else { '(no esta)' })) }
    try {
      $p4 = Leer-PreciosP4 $tablaPrecios
      Log ("Precios P4: {0} articulos en {1}" -f $p4.Count, $tablaPrecios)
      foreach ($m in $muestra) { Write-Host ("   P4 {0}  ->  {1}" -f $m, $(if ($p4.ContainsKey($m)) { $p4[$m] } else { '(sin P4)' })) }
    } catch { Log ("AVISO precios P4: " + $_.Exception.Message) }
    Log 'Modo prueba: NO se subio nada.'
    exit 0
  }

  # ---------- Envio a Supabase ----------
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $key = $cfg.clave_secreta
  if (-not $key -or $key -like 'PEGA_AQUI*') { throw "Falta la clave secreta en config.json." }
  $tabla = if ($cfg.tabla_supabase) { $cfg.tabla_supabase } else { 'nevada_inventario' }
  $url = $cfg.supabase_url.TrimEnd('/') + "/rest/v1/$tabla" + '?on_conflict=id'

  # JSON armado a mano (rapido y sin limite de profundidad).
  $sb = New-Object Text.StringBuilder
  [void]$sb.Append('[{"id":"stock","total":').Append($total).Append(',"actualizado":"').Append((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')).Append('","datos":{')
  $primero = $true
  foreach ($k in $stock.Keys) {
    if (-not $primero) { [void]$sb.Append(',') }
    $primero = $false
    $kj = $k.Replace('\', '\\').Replace('"', '\"')
    [void]$sb.Append('"').Append($kj).Append('":').Append($stock[$k])
  }
  [void]$sb.Append('}}]')
  $body = [Text.Encoding]::UTF8.GetBytes($sb.ToString())

  # Las claves sb_secret_ van SOLO en el encabezado apikey (no son JWT) y
  # Supabase las rechaza (401) si el User-Agent parece de navegador
  # ("Mozilla/..."), que es el que manda PowerShell por defecto.
  $headers = @{
    apikey = $key
    Prefer = 'resolution=merge-duplicates,return=minimal'
  }
  Invoke-RestMethod -Method Post -Uri $url -Headers $headers -UserAgent 'ImpoHogar-Nevada-Sincronizador/1.0' -ContentType 'application/json; charset=utf-8' -Body $body | Out-Null
  Log ("OK: {0} codigos subidos a Supabase ({1})." -f $total, $tabla)

  # ---------- Precios P4 (protegidos: solo los ve un cliente con sesion) ----------
  # Si algo falla aqui, el inventario ya quedo subido igual.
  try {
    $p4 = Leer-PreciosP4 $tablaPrecios
    if ($p4.Count -lt 500) { throw ("Solo {0} precios P4: algo raro con la tabla. No se suben." -f $p4.Count) }
    $sp = New-Object Text.StringBuilder
    [void]$sp.Append('{"p_total":').Append($p4.Count).Append(',"p_datos":{')
    $primero = $true
    foreach ($k in $p4.Keys) {
      if (-not $primero) { [void]$sp.Append(',') }
      $primero = $false
      [void]$sp.Append('"').Append($k.Replace('\', '\\').Replace('"', '\"')).Append('":').Append($p4[$k].ToString([Globalization.CultureInfo]::InvariantCulture))
    }
    [void]$sp.Append('}}')
    $urlP = $cfg.supabase_url.TrimEnd('/') + '/rest/v1/rpc/nevada_subir_precios'
    Invoke-RestMethod -Method Post -Uri $urlP -Headers @{ apikey = $key } -UserAgent 'ImpoHogar-Nevada-Sincronizador/1.0' -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($sp.ToString())) | Out-Null
    Log ("OK: {0} precios P4 subidos." -f $p4.Count)
  } catch {
    Log ("AVISO precios P4 (el inventario si se subio): " + $_.Exception.Message)
  }
  exit 0
}
catch {
  Log ("ERROR: " + $_.Exception.Message)
  exit 1
}
