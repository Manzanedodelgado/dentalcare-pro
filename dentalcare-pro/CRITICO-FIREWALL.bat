@echo off
color 0C
title 🔥 PASO CRÍTICO - CONFIGURACIÓN DE FIREWALL
echo ==============================================
echo 🔥 PASO CRÍTICO - CONFIGURAR FIREWALL PARA RENDER
echo ==============================================
echo.
echo ⚠️ IMPORTANTE: Este paso es CRÍTICO para el funcionamiento
echo.
echo El script que vas a ejecutar creará reglas de firewall
echo que permitirán que Render.com acceda a tu SQL Server local.
echo.
echo SIN ESTAS REGLAS, LA APLICACIÓN NO PODRÁ CONECTARSE
echo A TU BASE DE DATOS GELITE LOCAL.
echo.
echo ==============================================
echo 🔧 QUÉ VA A HACER EL SCRIPT:
echo ==============================================
echo.
echo ✅ Crear regla para IP: 44.229.227.142
echo ✅ Crear regla para IP: 54.188.71.94
echo ✅ Crear regla para IP: 52.13.128.108
echo ✅ Crear regla para Red: 74.220.48.0/24
echo ✅ Crear regla para Red: 74.220.56.0/24
echo.
echo Cada regla permitirá tráfico TCP en puerto 1433
echo (el puerto de SQL Server) desde las IPs de Render.
echo.
echo ==============================================
echo 🚨 INSTRUCCIONES DE EJECUCIÓN:
echo ==============================================
echo.
echo 1. Se abrirá una nueva ventana de comandos
echo 2. Te pedirá permisos de administrador (UAC)
echo 3. Debes hacer clic en "Sí" en la ventana UAC
echo 4. El script creará las 5 reglas automáticamente
echo 5. Al final mostrará "CONFIGURACIÓN COMPLETADA"
echo.
echo ==============================================
echo 🚀 ¿LISTO PARA EJECUTAR?
echo ==============================================
echo.
echo Presiona CUALQUIER TECLA para continuar...
echo El próximo paso será ejecutar configurar-firewall-render.bat
echo.
pause >nul

cls
echo ==============================================
echo 🔥 EJECUTANDO CONFIGURACIÓN DE FIREWALL...
echo ==============================================
echo.
echo ⚠️ IMPORTANTE: Si aparece una ventana de UAC, haz clic en "SÍ"
echo.
if exist "configurar-firewall-render.bat" (
    echo Ejecutando: configurar-firewall-render.bat
    echo.
    start "" "configurar-firewall-render.bat"
    echo.
    echo El script de firewall se está ejecutando en una nueva ventana.
    echo Por favor, sigue las instrucciones en esa ventana.
    echo.
    echo Una vez que termine la configuración del firewall,
    echo presiona cualquier tecla para continuar...
    pause >nul
) else (
    echo ❌ ERROR: No se encuentra configurar-firewall-render.bat
    echo.
    echo Asegúrate de haber ejecutado sincronizar-github.bat primero
    echo para descargar todos los archivos desde GitHub.
    echo.
    echo PRESIONA CUALQUIER TECLA PARA SALIR...
    pause >nul
)

cls
echo ==============================================
echo 🔍 VERIFICACIÓN POST-FIREWALL
echo ==============================================
echo.
echo Ahora verificaremos que el firewall esté configurado correctamente.
echo.
echo Ejecutando verificación...
echo.
if exist "verificar-configuracion.bat" (
    call "verificar-configuracion.bat"
) else (
    echo ❌ Script de verificación no encontrado
    echo.
    echo Para verificar manualmente:
    echo 1. Abrir Panel de Control > Firewall de Windows
    echo 2. Ir a Configuración avanzada > Reglas de entrada
    echo 3. Buscar reglas que empiecen con "RenderSQL"
    echo 4. Debes ver 5 reglas creadas
)

echo.
echo ==============================================
echo ✅ CONFIGURACIÓN DE FIREWALL COMPLETADA
echo ==============================================
echo.
echo 🎯 PRÓXIMOS PASOS:
echo 1. ⏳ Esperar a que termine el despliegue en Render.com
echo 2. 📊 Monitorear con: monitorear-despliegue.bat
echo 3. 🧪 Probar la aplicación en: https://agenda-dental-backend.onrender.com
echo.
echo 💡 TIEMPO ESTIMADO: El despliegue puede tardar 3-10 minutos más
echo.
echo PRESIONA CUALQUIER TECLA PARA SALIR...
pause >nul