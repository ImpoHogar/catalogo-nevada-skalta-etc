@echo off
rem Instala el inventario en vivo del catalogo Nevada (un solo paso).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar_todo.ps1"
pause
