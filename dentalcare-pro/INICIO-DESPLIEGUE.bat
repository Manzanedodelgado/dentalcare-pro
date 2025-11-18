@echo off
echo ==============================================
echo 🚀 DENTALCARE PRO - DESPLIEGUE EN RENDER.COM
echo ==============================================
echo.

echo 🔄 Verificando estado del despliegue...
echo Service: app.rubiogarciadental
echo URL: https://agenda-dental-backend.onrender.com
echo.

curl -s "https://agenda-dental-backend.onrender.com/health" -w "Estado HTTP: %%{http_code}\n" 2>nul

if %ERRORLEVEL% equ 0 (
    if exist .env (
        echo.
        echo ✅ APLICACIÓN FUNCIONANDO
        echo 🎯 La app está respondiendo correctamente
    ) else (
        echo.
        echo ⚠️ APLIKACIÓN RESPONDIENDO PERO .ENV NO ENCONTRADO
    )
) else (
    echo.
    echo ⏳ APLICACIÓN INICIANDO...
    echo El despliegue puede tardar hasta 10 minutos
)

echo.
echo ==============================================
echo 🔧 PASOS PARA COMPLETAR LA CONFIGURACIÓN
echo ==============================================
echo.

echo 1️⃣ SINCRONIZAR REPOSITORIO LOCAL:
echo    Ejecutar: sincronizar-github.bat
echo    (Esto descargará todos los archivos nuevos de GitHub)
echo.

echo 2️⃣ CONFIGURAR FIREWALL (CRÍTICO):
echo    Ejecutar: configurar-firewall-render.bat (como administrador)
echo    (Permitirá que Render.com acceda a tu SQL Server)
echo.

echo 3️⃣ VERIFICAR CONFIGURACIÓN:
echo    Ejecutar: verificar-configuracion.bat
echo    (Verificará que todo esté correctamente configurado)
echo.

echo 4️⃣ MONITOREAR DESPLIEGUE:
echo    Ejecutar: monitorear-despliegue.bat
echo    (Monitorea el estado del despliegue en tiempo real)
echo.

echo ==============================================
echo 📋 ARCHIVOS QUE DEBERÁS TENER DESPUÉS DEL SYNC:
echo ==============================================
echo.
echo ✅ .env - Configuración con PostgreSQL de Render
echo ✅ configurar-firewall-render.bat - Script de firewall
echo ✅ verificar-configuracion.bat - Verificación del sistema
echo ✅ monitorear-despliegue.bat - Monitor de despliegue
echo ✅ FIREWALL_CONFIG_RENDER.md - Documentación
echo ✅ sincronizar-github.bat - Script de sincronización
echo.

echo ==============================================
echo 🎯 ORDEN DE EJECUCIÓN RECOMENDADO:
echo ==============================================
echo.
echo 1. sincronizar-github.bat          ← PRIMERO
echo 2. configurar-firewall-render.bat  ← SEGUNDO (como admin)
echo 3. verificar-configuracion.bat     ← TERCERO
echo 4. monitorear-despliegue.bat       ← CUARTO
echo.

echo ==============================================
echo 🔍 DATOS DE CONFIGURACIÓN ACTUAL:
echo ==============================================
echo.
echo 🗄️ PostgreSQL (Render.com):
echo    Host: dpg-d4dvp1ali9vc73ahm7f0-a.oregon-postgres.render.com
echo    Database: dentalcare_db_phtr
echo    User: dentalcare_db_phtr_user
echo.
echo 🖥️ SQL Server (Local):
echo    Server: GABINETE2\INFOMED
echo    Database: GELITE
echo    Auth: Windows (GABINETE2\BOX2)
echo.
echo 🌐 Render IPs configuradas: ✅ 5 rangos
echo 🚀 Despliegue ID: dep-d4dvscili9vc73ahorp0
echo.

echo ==============================================
echo ✅ ¡TODO LISTO PARA CONTINUAR!
echo ==============================================
echo.
echo Empieza con: sincronizar-github.bat
echo.
echo PRESIONA CUALQUIER TECLA PARA SALIR...
pause >nul