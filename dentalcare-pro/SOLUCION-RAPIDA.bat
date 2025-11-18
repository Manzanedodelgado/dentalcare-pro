@echo off
color 0B
title 🚨 SOLUCIÓN RÁPIDA - PROBLEMAS IDENTIFICADOS
echo ==============================================
echo 🚨 SOLUCIÓN RÁPIDA - PROBLEMAS IDENTIFICADOS
echo ==============================================
echo.
echo ❌ PROBLEMAS DETECTADOS:
echo    1. Estás en directorio equivocado
echo    2. Conflicto de Git con archivos sin seguimiento  
echo    3. No puedes ejecutar scripts de firewall
echo.
echo ==============================================
echo 🔧 SOLUCIÓN INMEDIATA
echo ==============================================
echo.
echo Ejecutando comandos para resolver conflictos...
echo.

echo PASO 1: Forzar reset de Git (soluciona conflicto)
git reset --hard HEAD
if %ERRORLEVEL% equ 0 (
    echo ✅ Git reset exitoso
) else (
    echo ❌ Error en git reset
)

echo.
echo PASO 2: Pull forzado con rebase (sincroniza archivos)
git pull origin main --rebase
if %ERRORLEVEL% equ 0 (
    echo ✅ Sincronización exitosa
) else (
    echo ❌ Error en sincronización
    echo.
    echo Si el error persiste, tu proyecto no está en este directorio.
    echo Ejecuta: ENCONTRAR-DIRECTORIO.bat para encontrarlo.
)

echo.
echo ==============================================
echo 🔍 VERIFICACIÓN DE ARCHIVOS
echo ==============================================
echo.
echo Buscando archivos de configuración...

if exist ".env" (
    echo ✅ .env encontrado
    type .env | findstr "DB_HOST"
) else (
    echo ❌ .env NO encontrado - directorio incorrecto
)

if exist "configurar-firewall-render.bat" (
    echo ✅ configurar-firewall-render.bat encontrado
) else (
    echo ❌ configurar-firewall-render.bat NO encontrado - directorio incorrecto
)

echo.
echo ==============================================
echo 📋 DIRECTORIO ACTUAL
echo ==============================================
echo.
echo Estás en: %CD%
echo.

echo ==============================================
echo ✅ RESULTADO
echo ==============================================
echo.

if exist "configurar-firewall-render.bat" (
    echo 🎯 DIRECTORIO CORRECTO - PUEDES CONTINUAR
    echo.
    echo SIGUIENTE PASO:
    echo    Clic derecho en configurar-firewall-render.bat
    echo    Seleccionar: "Ejecutar como administrador"
    echo.
) else (
    echo 🚨 DIRECTORIO INCORRECTO
    echo.
    echo TU PROYECTO ESTÁ EN OTRA UBICACIÓN
    echo.
    echo SOLUCIÓN:
    echo    1. Encuentra dónde clonaste el proyecto
    echo    2. Navega a esa carpeta
    echo    3. Ejecuta los scripts desde allí
    echo.
    echo DIRECTORIOS COMUNES:
    echo    C:\Users\%USERNAME%\Desktop\dentalcare-pro\dentalcare-pro\
    echo    C:\Users\%USERNAME%\Documents\dentalcare-pro\dentalcare-pro\
    echo    C:\dentalcare-pro\dentalcare-pro\
)

echo ==============================================
echo PRESIONA CUALQUIER TECLA PARA SALIR...
pause >nul