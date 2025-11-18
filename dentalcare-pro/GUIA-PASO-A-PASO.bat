@echo off
echo ==============================================
echo 🎯 GUÍA PASO A PASO - DESPLIEGUE DENTALCARE PRO
echo ==============================================
echo.
echo Esta guía te llevará paso a paso por todo el proceso
echo de despliegue en Render.com con PostgreSQL.
echo.
echo ==============================================
echo 📋 ANTES DE EMPEZAR:
echo ==============================================
echo.
echo ✅ Asegúrate de estar en el directorio correcto del proyecto
echo ✅ Ten Git instalado y configurado
echo ✅ Tienes acceso de administrador en Windows
echo ✅ Tu SQL Server local está ejecutándose
echo.
echo ==============================================
echo 🚀 PASO 1: SINCRONIZAR REPOSITORIO
echo ==============================================
echo.
echo 1.1 ABRE EL DIRECTORIO DEL PROYECTO
echo    Navega a: dentalcare-pro/dentalcare-pro/
echo.
echo 1.2 EJECUTA SINCRONIZACIÓN
echo    Opción A: Doble clic en "sincronizar-github.bat"
echo    Opción B: Ejecuta en CMD: git pull origin main
echo.
echo 1.3 VERIFICAR SINCRONIZACIÓN
echo    Ejecuta: git status
echo    Debe mostrar: "On branch main, nothing to commit"
echo.
echo ✅ DESPUÉS DEL PASO 1, DEBERÁS VER ESTOS ARCHIVOS:
echo    - .env (con configuración PostgreSQL)
echo    - configurar-firewall-render.bat
echo    - verificar-configuracion.bat
echo    - monitorear-despliegue.bat
echo    - INICIO-DESPLIEGUE.bat
echo.
echo ==============================================
echo 🔥 PASO 2: CONFIGURAR FIREWALL (CRÍTICO)
echo ==============================================
echo.
echo ⚠️ REQUIERE PERMISOS DE ADMINISTRADOR
echo.
echo 2.1 CERRAR APLICACIONES IMPORTANTES (OPCIONAL)
echo    - SQL Server Management Studio
echo    - Aplicaciones que usen SQL Server
echo.
echo 2.2 EJECUTAR SCRIPT DE FIREWALL
echo    • Clic derecho en "configurar-firewall-render.bat"
echo    • Seleccionar "Ejecutar como administrador"
echo    • Confirmar cualquier ventana de UAC (Control de Cuentas)
echo.
echo 2.3 VERIFICAR CONFIGURACIÓN
echo    El script debe mostrar:
echo    ✅ Regla creada: RenderSQL_44_229_227_142
echo    ✅ Regla creada: RenderSQL_54_188_71_94
echo    ✅ Regla creada: RenderSQL_52_13_128_108
echo    ✅ Regla creada: RenderSQL_74_220_48_0_24
echo    ✅ Regla creada: RenderSQL_74_220_56_0_24
echo.
echo 🆘 SI FALLA EL PASO 2:
echo    • Ve a Panel de Control > Firewall de Windows
echo    • Configuración avanzada > Reglas de entrada
echo    • Crear regla manual siguiendo FIREWALL_CONFIG_RENDER.md
echo.
echo ==============================================
echo 🔍 PASO 3: VERIFICAR CONFIGURACIÓN
echo ==============================================
echo.
echo 3.1 EJECUTAR VERIFICACIÓN
echo    Doble clic en "verificar-configuracion.bat"
echo.
echo 3.2 REVISAR RESULTADOS
echo    Debe mostrar:
echo    ✅ Archivo .env encontrado
echo    ✅ Reglas de firewall encontradas
echo    ✅ Configuración PostgreSQL correcta
echo.
echo 3.3 VERIFICAR SQL SERVER
echo    • Abrir SQL Server Configuration Manager
echo    • Verificar que "SQL Server Browser" esté ejecutándose
echo    • Verificar que TCP/IP esté habilitado
echo    • Verificar puerto 1433
echo.
echo ==============================================
echo 📊 PASO 4: MONITOREAR DESPLIEGUE
echo ==============================================
echo.
echo 4.1 EJECUTAR MONITOR
echo    Doble clic en "monitorear-despliegue.bat"
echo.
echo 4.2 VERIFICAR RENDER.COM
echo    • Abre: https://dashboard.render.com
echo    • Ve a: app.rubiogarciadental
echo    • Revisa: Pestaña "Deploys"
echo    • Busca: dep-d4dvscili9vc73ahorp0
echo.
echo 4.3 VERIFICAR APLICACIÓN
echo    • Abre: https://agenda-dental-backend.onrender.com/health
echo    • Debe mostrar: {"status": "ok"} 
echo.
echo 📈 POSIBLES ESTADOS DEL DESPLIEGUE:
echo    ⏳ build_in_progress: Construyéndose (normal)
echo    ✅ success: ¡Despliegue exitoso!
echo    ❌ build_failed: Error de construcción
echo.
echo ==============================================
echo 🆘 SOLUCIÓN DE PROBLEMAS COMUNES
echo ==============================================
echo.
echo ❌ "git no se reconoce como comando"
echo    → Instalar Git desde: https://git-scm.com
echo.
echo ❌ "No tengo permisos de administrador"
echo    → Contactar al administrador del sistema
echo.
echo ❌ "Firewall configuration failed"
echo    → Seguir manual: FIREWALL_CONFIG_RENDER.md
echo.
echo ❌ "SQL Server connection failed"
echo    → Verificar que SQL Server esté ejecutándose
echo    → Verificar que GELITE database exista
echo.
echo ❌ "Render.com deployment failed"
echo    → Revisar logs en dashboard de Render
echo    → Verificar variables de entorno
echo.
echo ==============================================
echo ✅ FIN DE LA GUÍA PASO A PASO
echo ==============================================
echo.
echo 🚀 SIGUIENTE PASO: Comenzar con "sincronizar-github.bat"
echo.
echo 💡 TIP: Si tienes dudas, ejecuta "INICIO-DESPLIEGUE.bat"
echo    para ver el estado general de todo el sistema.
echo.
echo ==============================================
echo PRESIONA CUALQUIER TECLA PARA SALIR...
pause >nul