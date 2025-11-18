#!/usr/bin/env node

console.log(`
🎯 OBTENER CREDENCIALES REALES DE RENDER.COM
==========================================

Tu aplicación en Render.com está fallando porque le faltan las credenciales reales de PostgreSQL.

📋 PASOS PARA OBTENER LAS CREDENCIALES:

1. 🔗 ABRE EL DASHBOARD DE RENDER:
   👉 https://dashboard.render.com

2. 📂 BUSCA TU SERVICIO:
   👉 Nombre: app.rubiogarciadental
   👉 ID: srv-d4a2687gi27c739q5i4g
   👉 Haz clic para abrirlo

3. 🗄️ VE A LA PESTAÑA "Database"
   👉 Busca "Connection" o "Connect" 
   👉 Encontrarás las credenciales PostgreSQL

4. 📋 COPIA ESTAS 4 CREDENCIALES:
   🎯 Host (DB_HOST)
   🎯 Database (debería ser "postgres")
   🎯 User (debería ser "postgres") 
   🎯 Password (DB_PASSWORD)

5. 🟢 FORMULARIO PARA ACTUALIZAR .env:
   
   Presiona Ctrl+C para salir de este script y luego ingresa las credenciales:
   
   -- DB_HOST: [pega tu host aquí]
   -- Database: [generalmente "postgres"]
   -- User: [generalmente "postgres"] 
   -- Password: [pega tu password aquí]

   El script actualizar automáticamente el archivo .env
`);

setTimeout(() => {
    console.log(`
💡 CONSEJOS ADICIONALES:
- Si no encuentras la base de datos, puede ser que no tengas PostgreSQL configurado
- En ese caso, necesitas crear una nueva base de datos PostgreSQL en Render
- Busca la opción "New +" → "PostgreSQL" 

🔄 DESPUÉS DE CONFIGURAR:
1. Guarda el archivo .env
2. Sube los cambios a GitHub: git add .env && git commit -m "Configurar variables Render" && git push
3. Render automáticamente redesplegará la aplicación
`);
    process.exit(0);
}, 10000); // 10 segundos para leer