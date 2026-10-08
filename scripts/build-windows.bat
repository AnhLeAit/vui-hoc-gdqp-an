@echo off
rem Nhap dup de build ban Windows (goi build-windows.ps1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-windows.ps1"
pause
