// Script simplificado para configurar firewall de Windows
// Ejecutar como Administrador en Command Prompt

console.log(`
🔥 CONFIGURACIÓN FIREWALL WINDOWS - RENDER.COM
==============================================

Este script configura el firewall para permitir conexiones 
desde Render.com a tu SQL Server local.

⚠️  IMPORTANTE: Ejecutar como Administrador
`);

const fs = require('fs');

// Mostrar comandos para ejecutar manualmente
const firewallCommands = [
    'netsh advfirewall firewall add rule name="Render.com SQL Server" dir=in action=allow protocol=TCP localport=1433',
    'netsh advfirewall firewall add rule name="Render IP 44.229.227.142" dir=in action=allow remoteip=44.229.227.142 protocol=TCP localport=1433',
    'netsh advfirewall firewall add rule name="Render IP 54.188.71.94" dir=in action=allow remoteip=54.188.71.94 protocol=TCP localport=1433',
    'netsh advfirewall firewall add rule name="Render IP 52.13.128.108" dir=in action=allow remoteip=52.13.128.108 protocol=TCP localport=1433',
    'netsh advfirewall firewall add rule name="Render Range 74.220.48.0/24" dir=in action=allow remoteip=74.220.48.0/24 protocol=TCP localport=1433',
    'netsh advfirewall firewall add rule name="Render Range 74.220.56.0/24" dir=in action=allow remoteip=74.220.56.0/24 protocol=TCP localport=1433'
];

console.log('📋 COMANDOS A EJECUTAR (COPY-PASTE):');
console.log('=====================================\n');

firewallCommands.forEach((cmd, index) => {
    console.log(`${index + 1}. ${cmd}\n`);
});

console.log('🔧 PASOS:');
console.log('1. Abrir Command Prompt como Administrador');
console.log('2. Navegar al directorio del proyecto');
console.log('3. Ejecutar cada comando arriba, uno por uno\n');

// Crear archivo de comandos para fácil acceso
const commandsFile = firewallCommands.join('\n');
fs.writeFileSync('firewall-commands.txt', commandsFile);

console.log('✅ Archivo "firewall-commands.txt" creado para copiar comandos fácilmente');
console.log('\n🎯 DESPUÉS DEL FIREWALL:');
console.log('1. Obtener credenciales PostgreSQL de Render.com');
console.log('2. Ejecutar: node configurar-env-render.js');
console.log('3. Commit: git add .env && git commit -m "Configurar Render" && git push');