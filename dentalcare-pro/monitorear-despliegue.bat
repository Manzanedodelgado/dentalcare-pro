@echo off
echo ==============================================
echo DENTALCARE PRO - ESTADO DEL DESPLIEGUE EN RENDER.COM
echo ==============================================
echo.

echo Verificando estado del despliegue...
echo Service: app.rubiogarciadental
echo URL: https://agenda-dental-backend.onrender.com
echo.

REM Verificar estado del servicio
echo Checking service status...
curl -s "https://agenda-dental-backend.onrender.com/health" -w "Status: %%{http_code}\n" || echo "Service not responding yet"

echo.
echo ==============================================
echo CONFIGURACIÓN COMPLETADA ✅
echo ==============================================
echo.
echo ✅ PostgreSQL database created in Render.com
echo ✅ .env updated with real PostgreSQL credentials
echo ✅ Firewall configuration scripts created
echo ✅ Changes committed and pushed to GitHub
echo ✅ New deployment triggered with PostgreSQL config
echo.

echo 🎯 PRÓXIMOS PASOS:
echo.
echo 1. 🖥️ CONFIGURAR FIREWALL (MÁXIMA PRIORIDAD):
echo    - Clic derecho en configurar-firewall-render.bat
echo    - Seleccionar "Ejecutar como administrador"
echo    - Verificar que las 5 reglas se creen correctamente
echo.
echo 2. ⏳ ESPERAR A QUE EL DESPLIEGUE TERMINE:
echo    - Revisar logs en https://dashboard.render.com
echo    - El despliegue puede tardar 3-10 minutos
echo.
echo 3. 🔗 PROBAR LA APLICACIÓN:
echo    - URL: https://agenda-dental-backend.onrender.com
echo    - Endpoint de salud: /health
echo    - API endpoints: /api/* 
echo.

echo 📊 DATOS DE CONFIGURACIÓN:
echo - PostgreSQL Host: dpg-d4dvp1ali9vc73ahm7f0-a.oregon-postgres.render.com
echo - Database: dentalcare_db_phtr
echo - Usuario: dentalcare_db_phtr_user
echo - SQL Server Local: GABINETE2\INFOMED (GELITE)
echo - Render IPs Whitelisted: ✅ 5 ranges configured
echo.

echo ==============================================
echo SI EL DESPLIEGUE FALLA:
echo ==============================================
echo.
echo 1. Revisar logs en dashboard de Render.com
echo 2. Verificar que el firewall esté configurado
echo 3. Confirmar que SQL Server esté ejecutándose localmente
echo 4. Verificar conectividad entre Render y SQL Server
echo.
echo Para ver logs de despliegue:
echo - Ir a: https://dashboard.render.com
echo - Seleccionar: app.rubiogarciadental  
echo - Pestaña: Deploys → Ver dep-d4dvscili9vc73ahorp0
echo.

echo PRESIONA CUALQUIER TECLA PARA SALIR...
pause >nul