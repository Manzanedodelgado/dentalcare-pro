#!/bin/bash
# Script para sincronizar con el repositorio remoto de GitHub

echo "=============================================="
echo "DENTALCARE PRO - SINCRONIZACIÓN CON GITHUB"
echo "=============================================="
echo

echo "📥 Actualizando repositorio local con cambios de GitHub..."
echo

# Mostrar estado actual
echo "🔍 Estado actual:"
git status

echo
echo "📡 Descargando cambios del repositorio remoto..."
git fetch origin

echo
echo "🔄 Sincronizando rama main..."
git pull origin main --rebase

echo
echo "📋 Estado después de la sincronización:"
git status

echo
echo "=============================================="
echo "✅ SINCRONIZACIÓN COMPLETADA"
echo "=============================================="
echo
echo "Ahora deberías tener estos archivos nuevos:"
echo "✅ .env (con configuración de PostgreSQL)"
echo "✅ configurar-firewall-render.bat"
echo "✅ verificar-configuracion.bat"
echo "✅ monitorear-despliegue.bat"
echo "✅ FIREWALL_CONFIG_RENDER.md"
echo

echo "📝 PRÓXIMOS PASOS:"
echo "1. Revisar que tengas todos los archivos nuevos"
echo "2. Ejecutar configurar-firewall-render.bat como administrador"
echo "3. Verificar el despliegue en https://dashboard.render.com"
echo

echo "⚠️  SI HAY CONFLICTOS:"
echo "git status mostrará archivos con conflictos"
echo "Resuelve los conflictos manualmente y luego:"
echo "git add ."
echo "git commit -m \"Resolver conflictos de sincronización\""
echo "git push origin main"