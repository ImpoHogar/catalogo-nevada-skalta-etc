# Quita la sincronizacion automatica del catalogo Nevada.
$nombre = 'ImpoHogar Nevada - Sincronizar inventario'
Unregister-ScheduledTask -TaskName $nombre -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "Tarea '$nombre' eliminada (si existia)."
