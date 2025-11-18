@echo off
echo ==============================================
echo DENTALCARE PRO - CONFIGURAR FIREWALL PARA RENDER.COM
echo ==============================================
echo.
echo Este script configurará el firewall de Windows para permitir
echo que Render.com acceda a tu SQL Server local (puerto 1433).
echo.
echo NECESITAS EJECUTAR ESTE SCRIPT COMO ADMINISTRADOR
echo.
echo Presiona cualquier tecla para continuar...
pause >nul

echo.
echo Configurando reglas de firewall para Render.com IPs...
echo.

REM Eliminar reglas existentes si existen
echo Eliminando reglas existentes (si las hay)...
netsh advfirewall firewall delete rule name="RenderPostgreSQL" 2>nul
netsh advfirewall firewall delete rule name="RenderSQLServer" 2>nul

REM Configurar reglas para las IPs de Render.com
echo Creando reglas para Render.com IPs...

REM IP 44.229.227.142
netsh advfirewall firewall add rule name="RenderSQL_44_229_227_142" dir=in action=allow protocol=TCP localport=1433 remoteip=44.229.227.142

REM IP 54.188.71.94
netsh advfirewall firewall add rule name="RenderSQL_54_188_71_94" dir=in action=allow protocol=TCP localport=1433 remoteip=54.188.71.94

REM IP 52.13.128.108
netsh advfirewall firewall add rule name="RenderSQL_52_13_128_108" dir=in action=allow protocol=TCP localport=1433 remoteip=52.13.128.108

REM Red 74.220.48.0/24
netsh advfirewall firewall add rule name="RenderSQL_74_220_48_0_24" dir=in action=allow protocol=TCP localport=1433 remoteip=74.220.48.0/24

REM Red 74.220.56.0/24
netsh advfirewall firewall add rule name="RenderSQL_74_220_56_0_24" dir=in action=allow protocol=TCP localport=1433 remoteip=74.220.56.0/24

echo.
echo ==============================================
echo CONFIGURACIÓN COMPLETADA
echo ==============================================
echo.
echo Las siguientes reglas han sido creadas:
echo ✅ Permitir acceso desde 44.229.227.142 al puerto 1433
echo ✅ Permitir acceso desde 54.188.71.94 al puerto 1433
echo ✅ Permitir acceso desde 52.13.128.108 al puerto 1433
echo ✅ Permitir acceso desde 74.220.48.0/24 al puerto 1433
echo ✅ Permitir acceso desde 74.220.56.0/24 al puerto 1433
echo.
echo Para verificar las reglas creadas, puedes ejecutar:
echo netsh advfirewall firewall show rule name=RenderSQL*
echo.
echo PRESIONA CUALQUIER TECLA PARA SALIR...
pause >nul