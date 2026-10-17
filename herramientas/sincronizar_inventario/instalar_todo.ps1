# ============================================================
#  INSTALADOR DE UN SOLO PASO - Inventario en vivo, catalogo Nevada
# ============================================================
#  1. Pide la clave secreta de Supabase (una sola vez) y crea config.json
#  2. Prueba la lectura de tabla01.dbf (SISTEMA IMPOHOGAR)
#  3. Hace la primera sincronizacion
#  4. Deja programada la sincronizacion cada 15 minutos
# ============================================================
$ErrorActionPreference = 'Stop'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $aqui
$cfgPath = Join-Path $aqui 'config.json'

function Paso($n, $t) { Write-Host ''; Write-Host "[$n/4] $t" -ForegroundColor Cyan }

try {
  Paso 1 'Configuracion'
  if (Test-Path $cfgPath) {
    Write-Host 'config.json ya existe: se usa el que esta.'
  } else {
    $clave = Read-Host 'Pega la clave secreta de Supabase (sb_secret_...) y presiona Enter'
    $clave = $clave.Trim()
    if ($clave -notlike 'sb_secret_*' -and $clave.Length -lt 40) { throw 'Esa no parece una clave secreta de Supabase (debe empezar con sb_secret_).' }
    $cfg = Get-Content (Join-Path $aqui 'config.ejemplo.json') -Raw | ConvertFrom-Json
    $cfg.clave_secreta = $clave
    ($cfg | ConvertTo-Json) | Set-Content $cfgPath -Encoding UTF8
    Write-Host 'config.json creado.'
  }

  Paso 2 'Probando la lectura de la tabla del sistema (no sube nada)'
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $aqui 'sincronizar_inventario.ps1') -Prueba
  if ($LASTEXITCODE -ne 0) { throw 'La lectura fallo. Revisa el mensaje de arriba (se guarda en sincronizar_inventario.log).' }

  Paso 3 'Primera sincronizacion con Supabase'
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $aqui 'sincronizar_inventario.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo subir. Si dice 401/403/404: la clave no es correcta o falta crear la tabla nevada_inventario.' }

  Paso 4 'Programando la sincronizacion cada 15 minutos'
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $aqui 'instalar_tarea.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear la tarea programada.' }

  Write-Host ''
  Write-Host 'TODO LISTO. El catalogo ya muestra el inventario del sistema.' -ForegroundColor Green
  Write-Host 'Abre el catalogo: debajo del titulo dice "Inventario actualizado hoy HH:MM".'
} catch {
  Write-Host ''
  Write-Host ('NO SE COMPLETO: ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host 'Mandale una captura de esta ventana a Claude.'
}
