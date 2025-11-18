#!/usr/bin/env node

/**
 * SCRIPT PARA VERIFICAR USUARIO DE WINDOWS
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Muestra el usuario actual de Windows para configurar permisos en SQL Server
 * 
 * Uso: node check-windows-user.js
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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

async function checkWindowsUser() {
  try {
    log(colors.bold + colors.blue, '🔍 VERIFICANDO USUARIO DE WINDOWS');
    log(colors.blue, '=====================================\n');

    // Ejecutar whoami
    const { stdout: whoami } = await execPromise('whoami');
    const userInfo = whoami.trim();
    log(colors.green, `👤 Usuario actual: ${userInfo}\n`);

    // Extraer dominio y usuario
    let domain, username;
    if (userInfo.includes('\\')) {
      [domain, username] = userInfo.split('\\');
    } else {
      domain = 'DESCONOCIDO';
      username = userInfo;
    }

    log(colors.blue, '📋 INFORMACIÓN PARA SQL SERVER:');
    log(colors.yellow, `   Dominio: ${domain}`);
    log(colors.yellow, `   Usuario: ${username}`);
    log(colors.yellow, `   Formato SQL: [${domain}\\${username}]`);
    console.log();

    // Generar comandos SQL
    log(colors.blue, '🔧 COMANDOS SQL PARA EJECUTAR:');
    log(colors.blue, '(Ejecutar en SQL Server Management Studio)\n');

    log(colors.yellow, '1. CREAR USUARIO (si no existe):');
    console.log(`USE GELITE;`);
    console.log(`CREATE USER [${domain}\\${username}] FOR LOGIN [${domain}\\${username}];`);
    console.log();

    log(colors.yellow, '2. ASIGNAR PERMISOS DE LECTURA:');
    console.log(`ALTER ROLE db_datareader ADD MEMBER [${domain}\\${username}];`);
    console.log();

    log(colors.yellow, '3. ASIGNAR PERMISOS DE ESCRITURA:');
    console.log(`ALTER ROLE db_datawriter ADD MEMBER [${domain}\\${username}];`);
    console.log();

    log(colors.green, '✅ SIGUIENTES PASOS:');
    log(colors.yellow, '1. Copia y ejecuta los comandos SQL de arriba');
    log(colors.yellow, '2. En SQL Server Management Studio');
    log(colors.yellow, '3. Conectado a: GABINETE2\\INFOMED');
    console.log();

    log(colors.bold + colors.blue, '🚀 DESPUÉS DE CONFIGURAR PERMISOS:');
    log(colors.yellow, '   npm install');
    log(colors.yellow, '   node test-sqlserver.js');

  } catch (error) {
    log(colors.red, `❌ Error: ${error.message}`);
    log(colors.red, 'Este script debe ejecutarse en Windows con Node.js instalado');
  }
}

// Ejecutar verificación
checkWindowsUser();