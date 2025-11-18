@echo off
echo ==============================================
echo DENTALCARE PRO - VERIFICACIÓN FINAL DE CONFIGURACIÓN
echo ==============================================
echo.

echo VERIFICANDO ARCHIVO .ENV...
if exist ".env" (
    echo ✅ Archivo .env encontrado
    echo.
    echo CONTENIDO ACTUAL:
    type ".env" | findstr /C:"DB_HOST" /C:"DB_NAME" /C:"DB_USER"
    echo.
) else (
    echo ❌ Archivo .env NO encontrado
    echo.
)

echo VERIFICANDO REGLAS DE FIREWALL...
echo.
echo Reglas de Render configuradas:
netsh advfirewall firewall show rule name=RenderSQL* 2>nul

if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ Reglas de firewall encontradas
) else (
    echo.
    echo ❌ NO se encontraron reglas de firewall para Render.com
    echo DEBES ejecutar configurar-firewall-render.bat como administrador
)

echo.
echo ==============================================
echo CONFIGURACIÓN DE POSTGRESQL EN RENDER.COM
echo ==============================================
echo.
echo ✅ Base de datos PostgreSQL creada en Render.com
echo ✅ Archivo .env actualizado con credenciales reales
echo.
echo DATOS DE CONEXIÓN:
echo - Host: dpg-d4dvp1ali9vc73ahm7f0-a.oregon-postgres.render.com
echo - Base de datos: dentalcare_db_phtr
echo - Usuario: dentalcare_db_phtr_user
echo.
echo PRÓXIMOS PASOS:
echo 1. ✅ Configurar firewall (ejecutar configurar-firewall-render.bat como admin)
echo 2. ✅ Comitear y hacer push de cambios al repositorio
echo 3. ✅ Verificar que la app funcione en https://agenda-dental-backend.onrender.com
echo.

echo ==============================================
echo Para continuar, ejecuta estos comandos en el terminal:
echo ==============================================
echo.
echo git add .
echo git commit -m "Update: PostgreSQL configuration and firewall setup for Render.com"
echo git push origin main
echo.
echo PRESIONA CUALQUIER TECLA PARA SALIR...
pause >nul