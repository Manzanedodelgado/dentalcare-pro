# ==============================================
# COMANDOS PARA COMPLETAR LA INTEGRACIÓN GELITE
# DentalCare Pro - Sistema de Gestión Dental
# ==============================================

# PASO 1: Crear archivo .env desde la plantilla
cp .env.example .env

# PASO 2: Instalar dependencias (si no están instaladas)
npm install

# PASO 3: Ejecutar script de verificación GELITE
node test-sqlserver.js

# ==============================================
# RESULTADO ESPERADO:
# ✅ Conexión exitosa con GABINETE2\INFOMED
# ✅ Base de datos GELITE accesible
# ✅ Tabla dbo.DCitas encontrada
# ✅ Mapeos de datos funcionando
# ✅ Datos de prueba leídos correctamente
# ==============================================