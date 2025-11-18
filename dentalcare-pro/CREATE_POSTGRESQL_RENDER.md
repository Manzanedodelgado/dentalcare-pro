# 🗄️ CREAR BASE DE DATOS POSTGRESQL EN RENDER.COM

## ❌ PROBLEMA IDENTIFICADO
Tu servicio `app.rubiogarciadental` es solo un **Web Service** sin base de datos PostgreSQL.
No encuentras credenciales porque **no hay base de datos creada**.

## ✅ SOLUCIÓN: Crear PostgreSQL en Render.com

### PASO 1: CREAR BASE DE DATOS
1. Ir a: https://dashboard.render.com
2. Hacer click en "**New +**" (esquina superior derecha)
3. Seleccionar "**PostgreSQL**"
4. Configurar:
   - **Name**: `dentalcare-db` (o el nombre que prefieras)
   - **Region**: `Oregon (US West)` (recomendado)
   - **Plan**: `Free` (para empezar)

### PASO 2: OBTENER CREDENCIALES
Después de crear la base de datos, verás:
- **Internal Database URL**: postgres://usuario:password@host:puerto/database
- **Host**: extraer del URL
- **Database**: extraer del URL  
- **User**: extraer del URL
- **Password**: extraer del URL
- **Port**: 5432 (por defecto)

### PASO 3: CONECTAR WEB SERVICE
1. Ir a tu servicio: `app.rubiogarciadental`
2. Pestaña "**Environment**"
3. Click "**Add Environment Variable**"
4. Agregar:
   - `DB_HOST`: [host de la base de datos]
   - `DB_NAME`: postgres
   - `DB_USER`: postgres
   - `DB_PASSWORD`: [password de la base de datos]
   - `DB_SSL`: true

### PASO 4: DESPLEGAR
1. Hacer commit de los cambios
2. Render redesplegará automáticamente

## 🎯 ALTERNATIVA RÁPIDA
Si ya tienes base de datos PostgreSQL en otro lugar:
- Usar la URL de conexión que tengas
- Configurar las variables de entorno manualmente

## ❓ ¿CUÁL PREFIERES?
A) Crear nueva base de datos PostgreSQL en Render.com
B) Usar una base de datos PostgreSQL existente (proporcionar URL)

¡Dime qué opción prefieres y te guío paso a paso!