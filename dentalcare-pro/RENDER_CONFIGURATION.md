# 🏥 CONFIGURACIÓN COMPLETA: DENTALCARE PRO
## Sistema de Gestión Dental - Dr. Mario Rubio García

**📅 Fecha:** 18 de noviembre de 2025
**🔧 Versión:** 2.0.0
**🎯 Estado:** Listo para Producción

---

## 🏗️ ARQUITECTURA DE BASE DE DATOS DUAL

La aplicación utiliza **dos bases de datos** para máxima funcionalidad:

### 📊 **PostgreSQL (Render.com) - Base Principal**
- **Propósito**: Base de datos principal de la aplicación
- **Hosting**: Render.com
- **Servicio**: `app.rubiogarciadental`
- **Service ID**: `srv-d4a2687gi27c739q5i4g`
- **API Key**: `rnd_wv4YtHGe1Apd5bKMtzQ9kYggKKDQ`
- **Tipo**: PostgreSQL en la nube

### 💾 **SQL Server 2008 (Local) - Sincronización GELITE**
- **Propósito**: Sincronización con sistema dental legacy
- **Servidor**: `GABINETE2\INFOMED`
- **Base de datos**: `GELITE`
- **Tabla**: `dbo.DCitas`
- **Autenticación**: Windows Authentication
- **Usuario**: `GABINETE2\BOX2`
- **Tipo**: SQL Server 2008 local

---

## 🚀 CONFIGURACIÓN PASO A PASO

### **PASO 1: Configurar Render.com PostgreSQL** 🌐

#### **1.1 Obtener Credenciales desde Render Dashboard**
```cmd
# Ejecutar el script de ayuda
node configure-render.js
```

#### **1.2 Acciones Manual en Render Dashboard:**
1. **Ir a**: https://dashboard.render.com
2. **Localizar servicio**: `app.rubiogarciadental`
3. **Hacer clic** en el servicio
4. **Ir a pestaña**: "Database"
5. **Copiar credenciales** de la sección "Connection"

#### **1.3 Actualizar .env con Credenciales Render:**
```env
# Reemplazar estos valores en tu .env
DB_HOST=tu-host-render-xxxx-01.c7postgres.region-1.aws.compute-1.amazonaws.com
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD_COPIADO
DB_SSL=true
```

---

### **PASO 2: Configurar SQL Server Local** 🏢

#### **2.1 Configurar Permisos (Ya Completado ✅)**
```sql
-- Ejecutar en SQL Server Management Studio
-- Conectado a: GABINETE2\INFOMED

USE GELITE;

-- Usuario ya configurado: GABINETE2\BOX2
-- Permisos ya asignados: db_datareader + db_datawriter
```

#### **2.2 Verificar Configuración Windows Auth:**
- **Archivo**: `backend/utils/databaseService.js`
- **Configuración**: Ya actualizada para Windows Authentication
- **Sin contraseña necesaria**: ✅

---

### **PASO 3: Instalar y Probar** 🧪

```cmd
# 1. Instalar dependencias
npm install

# 2. Verificar conexión con ambas bases de datos
node test-sqlserver.js

# 3. Iniciar la aplicación
npm start

# 4. Abrir en navegador: http://localhost:3000
```

---

## 📋 ARCHIVOS DE CONFIGURACIÓN ACTUALIZADOS

### **🔧 Archivos de Configuración:**
- **`.env.example`** - Plantilla con Render.com + SQL Server
- **`backend/utils/databaseService.js`** - Configuración dual de bases de datos

### **📝 Scripts de Configuración:**
- **`configure-render.js`** - Guía para obtener credenciales de Render
- **`test-sqlserver.js`** - Verificación completa de ambas bases de datos

### **📖 Documentación:**
- **`GELITE_SETUP_INSTRUCTIONS.md`** - Configuración SQL Server
- **`RENDER_CONFIGURATION.md`** - Esta guía completa

---

## 🎯 MAPEOS GELITE IMPLEMENTADOS

### **Estados de Citas (IdSitC):**
```javascript
const ESTADOS_CITAS_GELITE = {
  0: 'planificada', 1: 'anulada', 5: 'finalizada',
  7: 'confirmada', 8: 'cancelada', 9: 'aceptada'
};
```

### **Tratamientos (IdIcono):**
```javascript
const TRATAMIENTOS_GELITE = {
  1: 'Control', 2: 'Urgencia', 13: 'Primera Visita',
  14: 'Higiene Dental', 15: 'Endodoncia', 17: 'Exodoncia',
  // ... 19 tipos en total
};
```

### **Odontólogos (IdUsu):**
```javascript
const ODONTOLOGOS_GELITE = {
  3: 'Dr. Mario Rubio', 4: 'Dra. Irene Garcia',
  8: 'Dra. Virginia Tresgallo', 10: 'Dra. Miriam Carrasco',
  12: 'Tc. Juan Antonio Manzanedo'
};
```

### **Conversiones de Datos:**
- **Fechas**: Excel serial (41456) → YYYY-MM-DD
- **Horas**: Segundos (41400) → HH:MM:SS  
- **Duraciones**: Segundos → minutos
- **Pacientes**: "APELLIDOS, NOMBRE" → formato estándar

---

## ✅ VERIFICACIÓN DE ÉXITO

### **🔌 Prueba de Conectividad:**
```cmd
node test-sqlserver.js
```

**Resultado esperado:**
```
✅ Conexión exitosa con PostgreSQL (Render.com)
✅ Conexión exitosa con SQL Server 2008 (GELITE)
✅ Tabla dbo.DCitas accesible
✅ Mapeos de datos funcionando
✅ Sincronización bidireccional lista
```

### **🌐 Prueba de Aplicación:**
1. **Navegador**: http://localhost:3000
2. **Login**: Usar credenciales configuradas
3. **Agenda**: Crear/modificar citas
4. **Sincronización**: Verificar cambios en ambas bases de datos

---

## 🚀 DEPLOYMENT EN RENDER.COM

### **Para deployment completo:**

1. **Conectar repositorio** en Render.com
2. **Configurar variables de entorno** en Render dashboard
3. **Deployment automático** en cada push a main
4. **SSL incluido** automáticamente
5. **Backup automático** de PostgreSQL

### **Variables de entorno para Render:**
```bash
# En Render.com Dashboard > Variables de entorno
NODE_ENV=production
PORT=3000

# PostgreSQL (Render automatically provides these)
DB_HOST=${DATABASE_HOST}
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=${DATABASE_PASSWORD}
DB_SSL=true

# SQL Server Local (si accedes desde Render - NO recomendado)
# SQL_SERVER=gabinete2\infomed
# SQL_DATABASE=GELITE
```

---

## 📊 DIAGRAMA DE ARQUITECTURA

```
┌─────────────────┐    ┌─────────────────┐
│   DENTALCARE PRO │
│     Aplicación   │
│                 │
│ • Frontend React │
│ • Backend Node.js │
└─────────┬───────┘
          │
┌─────────▼───────┐    ┌─────────────────┐
│ PostgreSQL (Render)│    │ SQL Server 2008 │
│                 │    │ (Local GELITE)  │
│ • Users         │    │                 │
│ • Appointments  │◄───┤ • dbo.DCitas   │
│ • Patients      │    │ • Legacy data  │
│ • Treatments    │    │ • Audit logs   │
└─────────────────┘    └─────────────────┘
```

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### **Error: "Connection refused" (PostgreSQL)**
- Verificar credenciales Render.com
- Confirmar SSL=true
- Revisar variables de entorno

### **Error: "Login failed" (SQL Server)**
- Verificar Windows Authentication activa
- Confirmar permisos usuario `GABINETE2\BOX2`
- Revisar configuración servidor

### **Error: "Invalid date format" (Sincronización)**
- Verificar mapeos en `sqlServerDataMapper.js`
- Confirmar formato de fechas Excel
- Revisar función `excelSerialToDate()`

---

## 🎉 PRÓXIMOS PASOS

### **Fase 1: Validación** (Inmediato)
- ✅ Configurar Render PostgreSQL
- ✅ Verificar SQL Server conexión
- ✅ Probar aplicación local

### **Fase 2: Desarrollo** (Esta semana)
- Implementar más funcionalidades del backend
- Mejorar interfaz frontend
- Añadir validaciones adicionales

### **Fase 3: Producción** (Próxima semana)
- Deployment en Render.com
- Configurar dominio personalizado
- Activar backups automáticos
- Monitoreo de rendimiento

---

**🏥 Dr. Mario Rubio García**  
**Sistema de Gestión Dental Profesional**  
**Render.com + SQL Server 2008 Integration**  
**Versión 2.0.0 - Noviembre 2025**