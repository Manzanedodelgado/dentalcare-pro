# 🔥 FIREWALL CONFIGURATION - RENDER.COM

## 🚨 PROBLEMA
Tu aplicación en Render.com no puede conectarse al SQL Server local (GABINETE2\INFOMED) porque el firewall de Windows bloquea las conexiones.

## ✅ SOLUCIÓN
Configurar el firewall para permitir conexiones desde las IPs de Render.com.

## 📋 PASOS A SEGUIR (EN ORDEN)

### 1️⃣ CONFIGURAR FIREWALL (OBLIGATORIO)

**Opción A - Script automático simple:**
```bash
node firewall-setup-simple.js
```

**Opción B - Archivo .bat (recomendado):**
1. Click derecho en `configurar-firewall-simple.bat`
2. Seleccionar "Run as administrator"
3. Seguir las instrucciones en pantalla

**Opción C - Manual (copy-paste):**
Los comandos están en `firewall-commands.txt`

### 2️⃣ OBTENER CREDENCIALES POSTGRESQL
1. Ir a: https://dashboard.render.com
2. Buscar: `app.rubiogarciadental`
3. Ir a pestaña "Database"
4. Copiar:
   - **Host** (DB_HOST)
   - **Password** (DB_PASSWORD)

### 3️⃣ CONFIGURAR VARIABLES
```bash
node configurar-env-render.js
```
Pegar las credenciales que obtuviste.

### 4️⃣ DESPLEGAR
```bash
git add .env
git commit -m "Configurar credenciales Render.com"
git push
```

## 🎯 RESULTADO ESPERADO
- ✅ Firewall configurado
- ✅ PostgreSQL conectado en Render.com
- ✅ SQL Server local accesible
- ✅ App funcionando en: https://agenda-dental-backend.onrender.com

## 🆘 SI TIENES PROBLEMAS
1. **Firewall no se configura**: Ejecutar Command Prompt como Administrador
2. **No encuentras credenciales**: Puede que no tengas PostgreSQL en Render
3. **La app sigue fallando**: Verificar que .env tenga las credenciales correctas

## 📞 COMANDOS DIRECTOS (si los scripts fallan)
```bash
netsh advfirewall firewall add rule name="Render.com SQL Server" dir=in action=allow protocol=TCP localport=1433
netsh advfirewall firewall add rule name="Render IP 44.229.227.142" dir=in action=allow remoteip=44.229.227.142 protocol=TCP localport=1433
netsh advfirewall firewall add rule name="Render IP 54.188.71.94" dir=in action=allow remoteip=54.188.71.94 protocol=TCP localport=1433
netsh advfirewall firewall add rule name="Render IP 52.13.128.108" dir=in action=allow remoteip=52.13.128.108 protocol=TCP localport=1433
netsh advfirewall firewall add rule name="Render Range 74.220.48.0/24" dir=in action=allow remoteip=74.220.48.0/24 protocol=TCP localport=1433
netsh advfirewall firewall add rule name="Render Range 74.220.56.0/24" dir=in action=allow remoteip=74.220.56.0/24 protocol=TCP localport=1433
```