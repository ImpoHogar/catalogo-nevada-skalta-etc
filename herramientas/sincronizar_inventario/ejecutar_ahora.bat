@echo off
rem Sincroniza el inventario del catalogo Nevada en este momento y muestra el resultado.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sincronizar_inventario.ps1"
pause
