@echo off
title CONFIGURACION FIREWALL WINDOWS - RENDER.COM

echo ================================================
echo CONFIGURACION DE FIREWALL PARA RENDER.COM
echo DentalCare Pro - SQL Server Access
echo ================================================
echo.

echo ⚠️  NOTA: Este script debe ejecutarse como Administrador
echo.
echo Para ejecutar como Admin:
echo 1. Click derecho en Command Prompt
echo 2. Seleccionar "Run as administrator"
echo 3. Navegar al directorio del proyecto
echo 4. Ejecutar: configurar-firewall-simple.bat
echo.

pause
echo.
echo 🔧 Configurando reglas de firewall...
echo.

REM Verificar si tenemos permisos de administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Permisos de Administrador detectados
) else (
    echo ❌ ERROR: Se requieren permisos de Administrador
    echo    Por favor ejecuta Command Prompt como Administrator
    pause
    exit /b 1
)

echo.

REM Crear reglas de firewall
echo 1. Configurando regla general SQL Server...
netsh advfirewall firewall add rule name="Render.com SQL Server Access" dir=in action=allow protocol=TCP localport=1433 >nul 2>&1

echo 2. Configurando IP 44.229.227.142...
netsh advfirewall firewall add rule name="Render IP 44.229.227.142" dir=in action=allow remoteip=44.229.227.142 protocol=TCP localport=1433 >nul 2>&1

echo 3. Configurando IP 54.188.71.94...
netsh advfirewall firewall add rule name="Render IP 54.188.71.94" dir=in action=allow remoteip=54.188.71.94 protocol=TCP localport=1433 >nul 2>&1

echo 4. Configurando IP 52.13.128.108...
netsh advfirewall firewall add rule name="Render IP 52.13.128.108" dir=in action=allow remoteip=52.13.128.108 protocol=TCP localport=1433 >nul 2>&1

echo 5. Configurando rango 74.220.48.0/24...
netsh advfirewall firewall add rule name="Render Range 74.220.48.0/24" dir=in action=allow remoteip=74.220.48.0/24 protocol=TCP localport=1433 >nul 2>&1

echo 6. Configurando rango 74.220.56.0/24...
netsh advfirewall firewall add rule name="Render Range 74.220.56.0/24" dir=in action=allow remoteip=74.220.56.0/24 protocol=TCP localport=1433 >nul 2>&1

echo.
echo ✅ Configuracion del firewall completada!
echo.
echo 🔍 VERIFICACION:
echo   1. Abrir Windows Defender Firewall
echo   2. Configuracion avanzada -> Reglas de entrada
echo   3. Verificar que aparecen las 6 reglas "Render"
echo.

echo 🎯 SIGUIENTE PASO:
echo   1. Obtener credenciales PostgreSQL de Render.com
echo   2. Ejecutar: node configurar-env-render.js
echo   3. Commit: git add .env && git commit -m "Configurar Render" && git push
echo.

pause