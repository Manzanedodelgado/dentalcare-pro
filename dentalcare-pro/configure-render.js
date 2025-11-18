#!/usr/bin/env node

/**
 * SCRIPT PARA CONFIGURAR RENDER.COM POSTGRESQL
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Render Service: app.rubiogarciadental
 * Service ID: srv-d4a2687gi27c739q5i4g
 * API Key: rnd_wv4YtHGe1Apd5bKMtzQ9kYggKKDQ
 * 
 * Este script ayuda a obtener las credenciales de la base de datos PostgreSQL
 * desde el dashboard de Render.com
 * 
 * Uso: node configure-render.js
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 */

// ==============================================
// CONFIGURACIÓN RENDER.COM
// ==============================================
const RENDER_CONFIG = {
  serviceName: 'app.rubiogarciadental',
  serviceId: 'srv-d4a2687gi27c739q5i4g',
  apiKey: 'rnd_wv4YtHGe1Apd5bKMtzQ9kYggKKDQ'
};

// Colores para consola
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function showRenderConfiguration() {
  log(colors.bold + colors.blue, '🚀 CONFIGURACIÓN RENDER.COM PARA DENTALCARE PRO');
  log(colors.blue, '=======================================================\n');

  log(colors.yellow, '📋 INFORMACIÓN DEL SERVICIO:');
  log(colors.yellow, `   Nombre: ${RENDER_CONFIG.serviceName}`);
  log(colors.yellow, `   ID: ${RENDER_CONFIG.serviceId}`);
  log(colors.yellow, `   API Key: ${RENDER_CONFIG.apiKey}\n`);

  log(colors.blue, '📝 PASOS PARA OBTENER CREDENCIALES DE POSTGRESQL:');
  log(colors.yellow, '\n1. ACCEDER AL DASHBOARD DE RENDER');
  log(colors.blue, '   👉 Ve a: https://dashboard.render.com');
  log(colors.blue, '   👉 Inicia sesión con tu cuenta\n');

  log(colors.yellow, '2. LOCALIZAR EL SERVICIO');
  log(colors.blue, '   👉 Busca el servicio: app.rubiogarciadental');
  log(colors.blue, '   👉 Haz clic en el servicio para abrirlo\n');

  log(colors.yellow, '3. ACCEDER A LA BASE DE DATOS');
  log(colors.blue, '   👉 Ve a la pestaña "Database" (o "Base de Datos")');
  log(colors.blue, '   👉 Busca la sección "Connection" o "Connect"\n');

  log(colors.yellow, '4. COPIAR CREDENCIALES');
  log(colors.green, '   🎯 Copia estas credenciales y guárdalas:');
  log(colors.green, '   ✨ Host (DB_HOST)');
  log(colors.green, '   ✨ Database (DB_NAME)');
  log(colors.green, '   ✨ Username (DB_USER)');
  log(colors.green, '   ✨ Password (DB_PASSWORD)\n');

  log(colors.bold + colors.blue, '📄 FORMATO DE CONEXIÓN TÍPICO DE RENDER:');
  log(colors.yellow, 'Host: ' + colors.green + 'nombre-servicio-xxxx-01.c7postgres.region-1.aws.compute-1.amazonaws.com');
  log(colors.yellow, 'Database: ' + colors.green + 'postgres');
  log(colors.yellow, 'User: ' + colors.green + 'postgres');
  log(colors.yellow, 'Port: ' + colors.green + '5432');
  log(colors.yellow, 'Password: ' + colors.green + '[copia desde dashboard]');
  log(colors.yellow, 'SSL: ' + colors.green + 'true\n');

  log(colors.bold + colors.blue, '💾 PARA ACTUALIZAR TU ARCHIVO .env:');
  log(colors.yellow, '1. Abre el archivo .env en tu editor');
  log(colors.yellow, '2. Reemplaza los valores:');
  console.log();
  console.log(`   DB_HOST=${colors.green}TULO_HOST_COPIADO${colors.reset}`);
  console.log(`   DB_NAME=postgres`);
  console.log(`   DB_USER=postgres`);
  console.log(`   DB_PASSWORD=${colors.green}TU_PASSWORD_COPIADO${colors.reset}`);
  console.log(`   DB_SSL=true`);
  console.log();

  log(colors.bold + colors.blue, '🔧 COMANDO PARA ACTUALIZAR .env:');
  log(colors.yellow, '   echo "DB_HOST=TU_HOST_COPIADO" >> .env');
  log(colors.yellow, '   echo "DB_NAME=postgres" >> .env');
  log(colors.yellow, '   echo "DB_USER=postgres" >> .env');
  log(colors.yellow, '   echo "DB_PASSWORD=TU_PASSWORD_COPIADO" >> .env');
  log(colors.yellow, '   echo "DB_SSL=true" >> .env');
  console.log();

  log(colors.bold + colors.blue, '✅ DESPUÉS DE CONFIGURAR RENDER:');
  log(colors.yellow, '   1. npm install');
  log(colors.yellow, '   2. node test-sqlserver.js');
  log(colors.yellow, '   3. npm start (para iniciar la aplicación)');
  log(colors.yellow, '   4. Probar la aplicación en http://localhost:3000');
  console.log();

  log(colors.bold + colors.blue, '🎯 RESULTADO ESPERADO:');
  log(colors.green, '   ✅ Conexión exitosa con PostgreSQL en Render.com');
  log(colors.green, '   ✅ Conexión exitosa con SQL Server local (GELITE)');
  log(colors.green, '   ✅ Aplicación funcionando en producción');
  log(colors.green, '   ✅ Sincronización bidireccional de citas activa');
}

// Ejecutar configuración
showRenderConfiguration();