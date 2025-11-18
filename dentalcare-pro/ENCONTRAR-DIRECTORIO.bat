@echo off
color 0E
title 🗂️ ENCONTRAR DIRECTORIO CORRECTO DEL PROYECTO
echo ==============================================
echo 🗂️ ENCONTRAR DIRECTORIO CORRECTO DEL PROYECTO
echo ==============================================
echo.
echo ⚠️ PROBLEMA DETECTADO:
echo - Estás en el directorio equivocado
echo - Git pull falló por conflicto de archivos
echo - No puedes ejecutar los scripts de firewall
echo.
echo ==============================================
echo 🔍 PASO 1: ENCONTRAR TU DIRECTORIO REAL
echo ==============================================
echo.
echo Vamos a buscar dónde está tu proyecto real de dentalcare-pro:
echo.

echo Buscando directorios dentalcare-pro en tu sistema...
echo.

REM Buscar en las ubicaciones más comunes
if exist "C:\Users\%USERNAME%\Desktop\dentalcare-pro\dentalcare-pro\" (
    echo ✅ ENCONTRADO EN: C:\Users\%USERNAME%\Desktop\dentalcare-pro\dentalcare-pro\
    set "PROJECT_DIR=C:\Users\%USERNAME%\Desktop\dentalcare-pro\dentalcare-pro"
    goto :found
)

if exist "C:\Users\%USERNAME%\Documents\dentalcare-pro\dentalcare-pro\" (
    echo ✅ ENCONTRADO EN: C:\Users\%USERNAME%\Documents\dentalcare-pro\dentalcare-pro\
    set "PROJECT_DIR=C:\Users\%USERNAME%\Documents\dentalcare-pro\dentalcare-pro"
    goto :found
)

if exist "C:\dentalcare-pro\dentalcare-pro\" (
    echo ✅ ENCONTRADO EN: C:\dentalcare-pro\dentalcare-pro\
    set "PROJECT_DIR=C:\dentalcare-pro\dentalcare-pro"
    goto :found
)

if exist "C:\Git\dentalcare-pro\dentalcare-pro\" (
    echo ✅ ENCONTRADO EN: C:\Git\dentalcare-pro\dentalcare-pro\
    set "PROJECT_DIR=C:\Git\dentalcare-pro\dentalcare-pro"
    goto :found
)

echo ❌ No se pudo encontrar el directorio automáticamente.
echo.
echo POR FAVOR, NAVEGA MANUALMENTE A TU DIRECTORIO DEL PROYECTO
echo Donde tengas los archivos del proyecto dentalcare-pro.

set /p "PROJECT_DIR=Escribe la ruta completa a tu directorio dentalcare-pro\dentalcare-pro: "

:found
echo.
echo ==============================================
echo ✅ DIRECTORIO ENCONTRADO
echo ==============================================
echo.
echo Tu proyecto está en: %PROJECT_DIR%
echo.
echo ==============================================
echo 🚀 PASO 2: NAVEGAR Y CORREGIR GIT
echo ==============================================
echo.
echo Navegando al directorio correcto...
cd /d "%PROJECT_DIR%"

echo Directorio actual: %CD%
echo.

echo Verificando estado de Git...
git status

echo.
echo ==============================================
echo 🔧 PASO 3: SOLUCIONAR CONFLICTO DE GIT
echo ==============================================
echo.
echo Resolviendo conflicto de archivos sin seguimiento...
echo.

echo Opción A: Forzar sincronización (RECOMENDADO)
echo Esto sobrescribirá archivos locales conflictivos.
echo.
set /p "confirm_sync=¿Quieres continuar con la sincronización forzada? (s/n): "

if /i "%confirm_sync%"=="s" (
    echo.
    echo Ejecutando: git reset --hard HEAD
    git reset --hard HEAD
    
    echo.
    echo Ejecutando: git pull origin main --rebase
    git pull origin main --rebase
    
    if %ERRORLEVEL% equ 0 (
        echo.
        echo ✅ SINCRONIZACIÓN EXITOSA
    ) else (
        echo.
        echo ❌ Error en sincronización. Ejecuta manualmente:
        echo git pull origin main --rebase
    )
) else (
    echo.
    echo Sincronización cancelada por el usuario.
)

echo.
echo ==============================================
echo ✅ VERIFICACIÓN FINAL
echo ==============================================
echo.
echo Estado actual de Git:
git status

echo.
if exist "configurar-firewall-render.bat" (
    echo ✅ Archivo configurar-firewall-render.bat ENCONTRADO
    echo.
    echo 🎯 AHORA PUEDES EJECUTAR:
    echo    configurar-firewall-render.bat (como administrador)
    echo.
) else (
    echo ❌ Archivo configurar-firewall-render.bat NO ENCONTRADO
    echo.
    echo Verifica que estés en el directorio correcto del proyecto.
    echo.
)

echo ==============================================
echo PRESIONA CUALQUIER TECLA PARA SALIR...
pause >nul