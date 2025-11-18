# ✅ CONFIGURACIÓN GELITE - WINDOWS AUTHENTICATION
## DentalCare Pro - Sistema de Gestión Dental

**Usuario identificado**: `GABINETE2\BOX2`
**Servidor SQL**: `GABINETE2\INFOMED`
**Base de datos**: `GELITE`
**Tabla**: `dbo.DCitas`

---

## 🚀 PASOS FINALES PARA COMPLETAR LA INTEGRACIÓN

### **PASO 1: Configurar Permisos en SQL Server** ⚠️

**1.1. Abrir SQL Server Management Studio (SSMS)**

**1.2. Conectarse a:**
- Servidor: `GABINETE2\INFOMED`
- Usuario: `GABINETE2\BOX2` (Windows Authentication)

**1.3. Ejecutar comandos SQL:**
- Abrir archivo: `sql-permissions-GABINETE2-BOX2.sql`
- Copiar y ejecutar TODOS los comandos en orden
- Verificar que NO hay errores

### **PASO 2: Configurar Variables de Entorno**

**2.1. Crear archivo .env:**
```bash
cd dentalcare-pro\dentalcare-pro
cp .env.example .env
```

**2.2. El .env debe contener:**
```env
SQL_SERVER=GABINETE2\INFOMED
SQL_DATABASE=GELITE
# NO necesita SQL_USERNAME ni SQL_PASSWORD (Windows Auth)
```

### **PASO 3: Instalar Dependencias**

```bash
npm install
```

### **PASO 4: Verificar Conexión**

```bash
node test-sqlserver.js
```

---

## 📋 COMANDOS SQL ESPECÍFICOS PARA TU USUARIO

```sql
-- Ejecutar en SQL Server Management Studio
-- Conectado a: GABINETE2\INFOMED

USE GELITE;

-- Crear usuario (si no existe)
CREATE USER [GABINETE2\BOX2] FOR LOGIN [GABINETE2\BOX2];

-- Asignar permisos
ALTER ROLE db_datareader ADD MEMBER [GABINETE2\BOX2];
ALTER ROLE db_datawriter ADD MEMBER [GABINETE2\BOX2];

-- Verificar resultado
SELECT dp.name, r.name as role_name
FROM sys.database_principals dp
LEFT JOIN sys.database_role_members rm ON dp.principal_id = rm.member_principal_id
LEFT JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
WHERE dp.name = 'GABINETE2\BOX2';
```

---

## ✅ VERIFICACIÓN DE ÉXITO

**El script `test-sqlserver.js` debe mostrar:**
- ✅ Conexión exitosa con GABINETE2\INFOMED
- ✅ Base de datos GELITE accesible
- ✅ Tabla dbo.DCitas encontrada
- ✅ Mapeos de datos funcionando
- ✅ Datos de prueba leídos correctamente

---

## 🔍 SOLUCIÓN DE PROBLEMAS

### **Error: "Login failed"**
- Verificar que SQL Server permite Windows Authentication
- Verificar que el usuario `GABINETE2\BOX2` tiene permisos

### **Error: "Could not find stored procedure"**
- Ejecutar los comandos SQL de permisos completamente

### **Error: "Could not connect to server"**
- Verificar que el servicio SQL Server está ejecutándose
- Verificar que `GABINETE2\INFOMED` es accesible

---

## 📊 MAPEOS GELITE IMPLEMENTADOS

### **Estados de Citas (IdSitC):**
- `0` → `planificada`
- `1` → `anulada`
- `5` → `finalizada`
- `7` → `confirmada`
- `8` → `cancelada`
- `9` → `aceptada`

### **Tratamientos (IdIcono):**
19 tipos de tratamiento mapeados (Control, Urgencia, Primera Visita, etc.)

### **Odontólogos (IdUsu):**
- `3` → `Dr. Mario Rubio`
- `4` → `Dra. Irene Garcia`
- `8` → `Dra. Virginia Tresgallo`
- `10` → `Dra. Miriam Carrasco`
- `12` → `Tc. Juan Antonio Manzanedo`

### **Conversiones de Datos:**
- **Fecha**: Excel serial (41456) → YYYY-MM-DD
- **Hora**: Segundos (41400) → HH:MM:SS
- **Duración**: Segundos → minutos
- **Paciente**: "APELLIDOS, NOMBRE" → formato estándar

---

## 🎯 PRÓXIMOS PASOS DESPUÉS DE LA VERIFICACIÓN

1. **Crear una cita de prueba** desde la aplicación web
2. **Verificar sincronización** con GELITE
3. **Importar citas existentes** desde GELITE
4. **Configurar sincronización automática** en el cron jobs

¡La integración con GELITE estará lista para usar! 🎉