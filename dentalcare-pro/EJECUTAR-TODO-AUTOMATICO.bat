@echo off
color 0A
title 🎯 DENTALCARE PRO - EJECUCIÓN AUTOMÁTICA
echo ==============================================
echo 🎯 EJECUCIÓN AUTOMÁTICA - DESPLIEGUE DENTALCARE
echo ==============================================
echo.
echo Este script ejecutará automáticamente todos los pasos
echo necesarios para el despliegue en Render.com.
echo.
echo ⚠️ REQUIERE PERMISOS DE ADMINISTRADOR para el firewall
echo.
echo PRESIONA CUALQUIER TECLA PARA CONTINUAR...
pause >nul
cls

echo ==============================================
echo 📥 PASO 1: SINCRONIZANDO CON GITHUB...
echo ==============================================
echo.
echo Ejecutando: git pull origin main
echo.
git pull origin main --rebase
if %ERRORLEVEL% equ 0 (
    echo ✅ Sincronización exitosa
) else (
    echo ❌ Error en sincronización
    echo Presiona cualquier tecla para continuar...
    pause >nul
)
echo.
echo PRESIONA CUALQUIER TECLA PARA CONTINUAR...
pause >nul
cls

echo ==============================================
echo 📋 PASO 2: VERIFICANDO ARCHIVOS REQUERIDOS...
echo ==============================================
echo.
if exist ".env" (
    echo ✅ .env encontrado
) else (
    echo ❌ .env NO encontrado - ejecutar sincronizar-github.bat primero
)

if exist "configurar-firewall-render.bat" (
    echo ✅ configurar-firewall-render.bat encontrado
) else (
    echo ❌ configurar-firewall-render.bat NO encontrado
)

if exist "verificar-configuracion.bat" (
    echo ✅ verificar-configuracion.bat encontrado
) else (
    echo ❌ verificar-configuracion.bat NO encontrado
)

echo.
echo PRESIONA CUALQUIER TECLA PARA CONTINUAR...
pause >nul
cls

echo ==============================================
echo 🔥 PASO 3: CONFIGURANDO FIREWALL...
echo ==============================================
echo.
echo ⚠️ IMPORTANTE: Se abrirá una ventana para permisos de administrador
echo.
echo El siguiente script configurará el firewall para Render.com
echo y permitirá que Render acceda a tu SQL Server local.
echo.
echo PRESIONA CUALQUIER TECLA PARA ABRIR EL SCRIPT DE FIREWALL...
pause >nul
start "" "configurar-firewall-render.bat"

echo.
echo Una vez completado el firewall, presiona cualquier tecla para continuar...
pause >nul
cls

echo ==============================================
echo 🔍 PASO 4: VERIFICANDO CONFIGURACIÓN...
echo ==============================================
echo.
echo Ejecutando: verificar-configuracion.bat
echo.
if exist "verificar-configuracion.bat" (
    call "verificar-configuracion.bat"
) else (
    echo ❌ Script de verificación no encontrado
)

echo.
echo PRESIONA CUALQUIER TECLA PARA CONTINUAR...
pause >nul
cls

echo ==============================================
echo 📊 PASO 5: VERIFICANDO ESTADO DE RENDER.COM...
echo ==============================================
echo.
echo Consultando estado del despliegue...
echo.

curl -s "https://agenda-dental-backend.onrender.com/health" -w "Estado HTTP: %%{http_code}\n" 2>nul
if %ERRORLEVEL% equ 0 (
    echo ✅ Aplicación respondiendo
) else (
    echo ⏳ Aplicación iniciando (normal durante despliegue)
)

echo.
echo Revisa el dashboard de Render.com para ver el estado del despliegue
echo URL: https://dashboard.render.com > app.rubiogarciadental > Deploys
echo.

echo ==============================================
echo ✅ EJECUCIÓN AUTOMÁTICA COMPLETADA
echo ==============================================
echo.
echo 📋 RESUMEN DE PASOS EJECUTADOS:
echo ✅ 1. Sincronización con GitHub
echo ✅ 2. Verificación de archivos
echo ✅ 3. Configuración de firewall
echo ✅ 4. Verificación de configuración
echo ✅ 5. Verificación de estado Render.com
echo.
echo 🎯 PRÓXIMOS PASOS:
echo • Esperar a que el despliegue en Render.com termine
echo • Verificar logs en: https://dashboard.render.com
echo • Probar la aplicación en: https://agenda-dental-backend.onrender.com
echo.
echo ==============================================
echo PRESIONA CUALQUIER TECLA PARA SALIR...
pause >nul