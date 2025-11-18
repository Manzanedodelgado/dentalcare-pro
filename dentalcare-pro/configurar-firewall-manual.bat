@echo off
echo ===============================================
echo CONFIGURACION MANUAL DE FIREWALL WINDOWS
echo Para permitir conexiones desde Render.com
echo ===============================================
echo.

echo ⚠️  IMPORTANTE: Ejecutar como Administrador
echo   1. Click derecho en Command Prompt
echo   2. Seleccionar "Run as administrator"
echo   3. Ejecutar este archivo .bat
echo.

pause

echo.
echo 🔧 Configurando reglas de firewall...
echo.

REM Permitir SQL Server en puerto 1433
echo 1. Configurando SQL Server puerto 1433...
netsh advfirewall firewall add rule name="Render.com SQL Server Access" dir=in action=allow protocol=TCP localport=1433

REM Permitir IPs específicas de Render.com
echo 2. Configurando IP 44.229.227.142...
netsh advfirewall firewall add rule name="Render IP 44.229.227.142" dir=in action=allow remoteip=44.229.227.142 protocol=TCP localport=1433

echo 3. Configurando IP 54.188.71.94...
netsh advfirewall firewall add rule name="Render IP 54.188.71.94" dir=in action=allow remoteip=54.188.71.94 protocol=TCP localport=1433

echo 4. Configurando IP 52.13.128.108...
netsh advfirewall firewall add rule name="Render IP 52.13.128.108" dir=in action=allow remoteip=52.13.128.108 protocol=TCP localport=1433

echo 5. Configurando rango 74.220.48.0/24...
netsh advfirewall firewall add rule name="Render Range 74.220.48.0/24" dir=in action=allow remoteip=74.220.48.0/24 protocol=TCP localport=1433

echo 6. Configurando rango 74.220.56.0/24...
netsh advfirewall firewall add rule name="Render Range 74.220.56.0/24" dir=in action=allow remoteip=74.220.56.0/24 protocol=TCP localport=1433

echo.
echo ✅ Configuracion completada!
echo.
echo 🔍 Para verificar:
echo   1. Abrir Windows Defender Firewall
echo   2. Configuracion avanzada -> Reglas de entrada
echo   3. Buscar reglas que empiecen con "Render"
echo.

echo 🎯 SIGUIENTE PASO:
echo   1. Obtener credenciales de PostgreSQL en Render.com
echo   2. Ejecutar: node configurar-env-render.js
echo   3. Commit y push: git add .env && git commit -m "Configurar Render" && git push

pause