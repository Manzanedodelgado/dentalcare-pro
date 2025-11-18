@echo off
color 0C
title 🔧 SOLUCIONAR PROBLEMAS DE SINCRONIZACIÓN
echo ==============================================
echo 🔧 SOLUCIONAR PROBLEMAS DE SINCRONIZACIÓN
echo ==============================================
echo.
echo Veo que tienes problemas con la sincronización de Git.
echo Vamos a solucionarlo paso a paso.
echo.
echo ==============================================
echo 🔍 PROBLEMA 1: ARCHIVOS SIN SEGUIR EN GIT
echo ==============================================
echo.
echo Git no puede hacer pull porque hay archivos nuevos
echo que no están registrados en el repositorio local.
echo.

echo 📋 Mostrando estado actual de Git:
echo.
git status

echo.
echo ==============================================
echo 🔧 SOLUCIÓN: LIMPIAR Y SINCRONIZAR
echo ==============================================
echo.

echo PASO 1: Agregar archivos nuevos a Git
echo Ejecutando: git add .
echo.
git add .

echo.
echo PASO 2: Confirmar archivos locales (si es necesario)
echo.
echo Si hay cambios locales, se van a confirmar con un mensaje.
echo.
git add -u
git commit -m "Local changes before sync with remote"

echo.
echo PASO 3: Realizar pull con sobrescritura forzada
echo Ejecutando: git pull origin main --rebase
echo.
git pull origin main --rebase

echo.
echo ==============================================
echo ✅ ESTADO DESPUÉS DE LA LIMPIEZA:
echo ==============================================
git status

echo.
echo ==============================================
echo 🎯 PRÓXIMOS PASOS
echo ==============================================
echo.
echo Si la sincronización fue exitosa, ahora debes:
echo 1. Estar en el directorio correcto: dentalcare-pro\dentalcare-pro\
echo 2. Verificar que existan los archivos de configuración
echo 3. Ejecutar: configurar-firewall-render.bat (como administrador)
echo.

echo ==============================================
echo PRESIONA CUALQUIER TECLA PARA CONTINUAR...
pause >nul