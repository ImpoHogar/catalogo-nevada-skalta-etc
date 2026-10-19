# ============================================================
#  ADMINISTRAR CLIENTES - Acceso al Catalogo Nevada
# ============================================================
#  Para usar desde la PC del inventario (usa la clave secreta de
#  config.json, la misma del sincronizador):
#
#    1. Nueva contrasena temporal: para un cliente que la perdio u
#       olvido su contrasena, o para dar de alta un cliente nuevo.
#    2. Desactivar un cliente: ya no puede entrar al catalogo.
#    3. Reactivar un cliente.
#
#  La contrasena temporal se muestra UNA sola vez en esta ventana;
#  no se guarda en ningun archivo. El cliente la cambia al entrar.
# ============================================================
$ErrorActionPreference = 'Stop'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$log = Join-Path $aqui 'administrar_clientes.log'

function Log($msg) {
  try { Add-Content $log ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '  ' + $msg) -Encoding UTF8 } catch { }
}

function Rpc($cfg, $fn, $datos) {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $url = $cfg.supabase_url.TrimEnd('/') + '/rest/v1/rpc/' + $fn
  $json = $datos | ConvertTo-Json -Compress
  return Invoke-RestMethod -Method Post -Uri $url -Headers @{ apikey = $cfg.clave_secreta } -UserAgent 'ImpoHogar-Nevada-Admin/1.0' -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json))
}

try {
  $cfgPath = Join-Path $aqui 'config.json'
  if (-not (Test-Path $cfgPath)) { throw 'Falta config.json (corre primero INSTALAR.bat).' }
  $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
  if (-not $cfg.clave_secreta -or $cfg.clave_secreta -like 'PEGA_AQUI*') { throw 'Falta la clave secreta en config.json.' }

  while ($true) {
    Write-Host ''
    Write-Host '=== Clientes del Catalogo Nevada ===' -ForegroundColor Cyan
    Write-Host '  1. Nueva contrasena temporal (olvido / cliente nuevo)'
    Write-Host '  2. Desactivar un cliente'
    Write-Host '  3. Reactivar un cliente'
    Write-Host '  0. Salir'
    $op = (Read-Host 'Opcion').Trim()
    if ($op -eq '0' -or $op -eq '') { break }

    if ($op -eq '1') {
      $codigo = (Read-Host 'Codigo de cliente').Trim()
      if (-not $codigo) { continue }
      $r = Rpc $cfg 'nevada_admin_clave_temporal' @{ p_codigo = $codigo }
      if (-not $r.ok -and $r.error -match 'no existe') {
        Write-Host 'Ese codigo no tiene cuenta todavia. Se va a crear.' -ForegroundColor Yellow
        $nombre = (Read-Host 'Nombre del cliente (como en el sistema)').Trim()
        if (-not $nombre) { Write-Host 'Cancelado.'; continue }
        $vend = (Read-Host 'Codigo de vendedor (Enter si no tiene)').Trim()
        $r = Rpc $cfg 'nevada_admin_clave_temporal' @{ p_codigo = $codigo; p_nombre = $nombre; p_vendedor = $vend }
      }
      if ($r.ok) {
        Write-Host ''
        Write-Host ("  Cliente:              {0}" -f $r.codigo)
        Write-Host ("  Contrasena temporal:  {0}" -f $r.clave_temporal) -ForegroundColor Green
        Write-Host '  Dasela solo a ese cliente. Al entrar, el catalogo le pide crear la suya.'
        Write-Host '  (Sus sesiones abiertas se cerraron y su bloqueo por intentos se quito.)'
        Log ("Nueva contrasena temporal para el cliente {0}" -f $r.codigo)
      } else {
        Write-Host ('  No se pudo: ' + $r.error) -ForegroundColor Red
      }
    }
    elseif ($op -eq '2' -or $op -eq '3') {
      $codigo = (Read-Host 'Codigo de cliente').Trim()
      if (-not $codigo) { continue }
      $activo = ($op -eq '3')
      $r = Rpc $cfg 'nevada_admin_activo' @{ p_codigo = $codigo; p_activo = $activo }
      if ($r.ok) {
        Write-Host ('  Listo: cliente {0} {1}.' -f $codigo, $(if ($activo) { 'reactivado' } else { 'desactivado (ya no puede entrar)' })) -ForegroundColor Green
        Log ('Cliente {0} {1}' -f $codigo, $(if ($activo) { 'reactivado' } else { 'desactivado' }))
      } else {
        Write-Host ('  No se pudo: ' + $r.error) -ForegroundColor Red
      }
    }
  }
}
catch {
  Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host 'Si dice 401, revisa la clave secreta de config.json.'
}
