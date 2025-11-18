#!/usr/bin/env node

const fs = require('fs');
const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log(`
🔥 CONFIGURACIÓN DE FIREWALL WINDOWS PARA RENDER.COM
===================================================

Este script configurará el firewall de Windows para permitir 
conexiones desde Render.com a tu SQL Server local.

📋 IPs DE RENDER.COM A CONFIGURAR:
   44.229.227.142
   54.188.71.94
   52.13.128.108
   74.220.48.0/24
   74.220.56.0/24

🎯 OBJETIVO: Permitir conexiones al puerto 1433 (SQL Server)
`);

async function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim().toLowerCase());
        });
    });
}

async function executeFirewallCommand(command, description) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`❌ Error en "${description}":`, error.message);
                reject(error);
            } else {
                console.log(`✅ ${description} configurado exitosamente`);
                resolve(stdout);
            }
        });
    });
}

async function main() {
    try {
        console.log('\n⚠️  IMPORTANTE: Este script requiere permisos de Administrador');
        console.log('   Asegúrate de ejecutar Command Prompt como Administrador\n');
        
        const confirm = await askQuestion('¿Continuar con la configuración del firewall? (s/n): ');
        
        if (confirm !== 's' && confirm !== 'si' && confirm !== 'sí') {
            console.log('❌ Configuración cancelada');
            process.exit(0);
        }

        console.log('\n🔧 CONFIGURANDO FIREWALL DE WINDOWS...\n');

        // Array de comandos para configurar firewall
        const firewallCommands = [
            // Permitir tráfico entrante en puerto 1433 para SQL Server
            {
                command: 'netsh advfirewall firewall add rule name="Render.com SQL Server Access" dir=in action=allow protocol=TCP localport=1433',
                description: 'Permitir tráfico en puerto 1433 (SQL Server)'
            },
            // Permitir IP específica 44.229.227.142
            {
                command: 'netsh advfirewall firewall add rule name="Render IP 44.229.227.142" dir=in action=allow remoteip=44.229.227.142 protocol=TCP localport=1433',
                description: 'Permitir IP 44.229.227.142'
            },
            // Permitir IP específica 54.188.71.94
            {
                command: 'netsh advfirewall firewall add rule name="Render IP 54.188.71.94" dir=in action=allow remoteip=54.188.71.94 protocol=TCP localport=1433',
                description: 'Permitir IP 54.188.71.94'
            },
            // Permitir IP específica 52.13.128.108
            {
                command: 'netsh advfirewall firewall add rule name="Render IP 52.13.128.108" dir=in action=allow remoteip=52.13.128.108 protocol=TCP localport=1433',
                description: 'Permitir IP 52.13.128.108'
            },
            // Permitir rango 74.220.48.0/24
            {
                command: 'netsh advfirewall firewall add rule name="Render Range 74.220.48.0/24" dir=in action=allow remoteip=74.220.48.0/24 protocol=TCP localport=1433',
                description: 'Permitir rango 74.220.48.0/24'
            },
            // Permitir rango 74.220.56.0/24
            {
                command: 'netsh advfirewall firewall add rule name="Render Range 74.220.56.0/24" dir=in action=allow remoteip=74.220.56.0/24 protocol=TCP localport=1433',
                description: 'Permitir rango 74.220.56.0/24'
            }
        ];

        // Ejecutar comandos secuencialmente
        for (const cmd of firewallCommands) {
            try {
                await executeFirewallCommand(cmd.command, cmd.description);
            } catch (error) {
                console.log(`⚠️  Continuando con el siguiente comando...`);
            }
        }

        console.log('\n🎉 CONFIGURACIÓN COMPLETADA!');
        console.log('\n📋 VERIFICACIÓN:');
        console.log('1. Abrir Windows Defender Firewall');
        console.log('2. Ir a "Configuración avanzada"');
        console.log('3. Verificar que las reglas se crearon correctamente');
        
        console.log('\n🔗 SIGUIENTE PASO:');
        console.log('1. Obtén las credenciales reales de PostgreSQL de Render.com');
        console.log('2. Ejecuta: node configurar-env-render.js');
        console.log('3. Haz commit: git add .env && git commit -m "Configurar Render" && git push');
        console.log('4. Verifica que la app funcione en Render.com');

    } catch (error) {
        console.log('❌ Error:', error.message);
    } finally {
        rl.close();
    }
}

main();