# 🔐 CREDENCIALES Y CONFIGURACIÓN PARA DEPLOYMENT

## 📋 REQUISITOS PARA EL PUSH A GITHUB

### Opción 1: Generar nuevo token personal
1. Ve a: https://github.com/settings/tokens
2. Crea un nuevo token personal con permisos:
   - `repo` (acceso completo a repositorios)
   - `workflow` (si usas GitHub Actions)
3. Usa el comando:
```bash
cd /workspace/dentalcare-pro
git remote remove origin
git remote add origin https://TU_NUEVO_TOKEN@github.com/Manzanedodelgado/dentalcare-pro.git
git push -u origin master
```

### Opción 2: Push manual desde tu entorno local
```bash
# Copia todo el directorio dentalcare-pro a tu máquina local
# Luego en tu terminal local:
cd dentalcare-pro
git push -u origin master
```

## 🚀 PASOS PARA DEPLOYMENT EN RENDER.COM

### 1. Conectar GitHub:
- Ve a: https://render.com
- Conecta tu repositorio: `Manzanedodelgado/dentalcare-pro`
- Selecciona "Web Service"

### 2. Configuración del servicio:
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: Node
- **Region**: EU-West (Ireland)

### 3. Variables de entorno en Render.com:
Configura estas variables desde tu `.env.example`:

```env
NODE_ENV=production
PORT=3000

# Base de datos PostgreSQL (para sesiones)
DATABASE_URL=postgresql://usuario:password@host:puerto/database

# Base de datos SQL Server (datos clínicos)
DB_SERVER=gabinete2\box2
DB_DATABASE=clinica-dental-db
DB_USER=usuario_sql
DB_PASSWORD=password_sql

# Autenticación JWT
JWT_SECRET=b79882e078a7911286b880690c51934c95174aacaa2fd718d9e71a0cb31cb27368884f152a567a1953de2cdbc977b783c17374a4977dae95653eccb86ec83812

# WhatsApp
WHATSAPP_PHONE_NUMBER=34664218253
WHATSAPP_API_URL=http://localhost:3000

# Clínica
CLINIC_NAME=Clínica Dental Rubio García
ADMIN_USER=JMD
ADMIN_PASSWORD=190582
ADMIN_EMAIL=info@rubiogarciadental.com

# Dominio personalizado
CORS_ORIGIN=https://www.app.rubiogarciadental.com

# Límites de seguridad
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
HEALTH_CHECK_INTERVAL=30000
```

### 4. Configurar dominio personalizado:
- En Render.com: Settings → Custom Domains
- Agrega: `www.app.rubiogarciadental.com`
- Configura SSL automático

## ✅ VERIFICACIÓN FINAL

### Comandos para verificar que todo está correcto:
```bash
# Verificar sintaxis de Node.js
cd dentalcare-pro
node -c backend/server.js
for file in frontend/js/*.js; do node -c "$file"; done

# Verificar que todos los archivos están
find dentalcare-pro -name "*.js" | wc -l  # Debe mostrar 46 archivos
find dentalcare-pro -name "*.css" | wc -l # Debe mostrar 12 archivos
find dentalcare-pro -name "*.json" | wc -l # Debe mostrar 2 archivos

# Verificar estructura
tree dentalcare-pro -I node_modules
```

### URLs finales:
- **Backend API**: `https://clinica-dental-backend.onrender.com`
- **Frontend**: `https://www.app.rubiogarciadental.com`
- **Health Check**: `https://clinica-dental-backend.onrender.com/health`

## 🎉 CONFIRMACIÓN DE DEPLOYMENT

El deployment será exitoso cuando veas:
1. ✅ Build completed in Render.com
2. ✅ Service is live en la URL
3. ✅ `/health` endpoint responde con status "ok"
4. ✅ `/api/system/info` muestra información del sistema

**¡El sistema DentalCare Pro estará 100% operativo en producción!**