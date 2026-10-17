# ============================================================
#  INSTALAR LA SINCRONIZACION AUTOMATICA - Catalogo Nevada
# ============================================================
#  Crea una tarea en el Programador de tareas de Windows que corre
#  sincronizar_inventario.ps1 cada 15 minutos mientras la sesion de
#  este usuario esta abierta (necesita ver \\Servidor\interakzion).
#
#  Uso (una sola vez):
#    powershell -ExecutionPolicy Bypass -File instalar_tarea.ps1
#  Para quitarla: desinstalar_tarea.ps1
# ============================================================
$ErrorActionPreference = 'Stop'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$script = Join-Path $aqui 'sincronizar_inventario.ps1'
$nombre = 'ImpoHogar Nevada - Sincronizar inventario'
$minutos = 15

if (-not (Test-Path (Join-Path $aqui 'config.json'))) { throw 'Primero crea config.json (copia config.ejemplo.json y pega la clave secreta).' }

$accion = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $script + '"') -WorkingDirectory $aqui
$disparo = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $minutos)
$ajustes = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $nombre -Action $accion -Trigger $disparo -Settings $ajustes -Description 'Sube las existencias de tabla01.dbf (SISTEMA IMPOHOGAR) a Supabase para el catalogo Nevada. Solo codigo y cantidad.' -Force | Out-Null

Write-Host ''
Write-Host "Listo: la tarea '$nombre' corre cada $minutos minutos." -ForegroundColor Green
Write-Host 'Se puede ver en el Programador de tareas de Windows.'
Write-Host 'Registro de cada ejecucion: sincronizar_inventario.log (en esta carpeta).'
