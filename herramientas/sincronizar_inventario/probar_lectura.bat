@echo off
rem Solo LEE la tabla y muestra un resumen. No sube nada a Supabase.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sincronizar_inventario.ps1" -Prueba
pause
