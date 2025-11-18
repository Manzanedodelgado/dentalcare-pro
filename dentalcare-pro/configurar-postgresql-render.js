#!/usr/bin/env node

console.log(`
🔧 CONFIGURACIÓN POSTGRESQL PARA RENDER.COM
==========================================

Este script te ayuda a configurar las credenciales de PostgreSQL
que obtuviste del dashboard de Render.com.

📋 INSTRUCCIONES:
1. Cuando veas las instrucciones en pantalla, pega las credenciales
2. El script actualizará automáticamente el archivo .env
3. Te dará los comandos para hacer commit
`);

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function main() {
    try {
        console.log('\n🔑 CONFIGURACIÓN DE CREDENCIALES:\n');
        
        const dbHost = await askQuestion('🌐 DB_HOST (host de PostgreSQL): ');
        const dbName = await askQuestion('🗄️ DB_NAME (nombre de base de datos): ');
        const dbUser = await askQuestion('👤 DB_USER (usuario): ');
        const dbPassword = await askQuestion('🔑 DB_PASSWORD (password): ');
        const dbPort = await askQuestion('🔌 DB_PORT (normalmente 5432): ');

        if (!dbHost || !dbPassword) {
            console.log('\n❌ Error: DB_HOST y DB_PASSWORD son obligatorios');
            process.exit(1);
        }

        console.log('\n🔄 Actualizando archivo .env...');

        const envContent = `# DENTALCARE PRO - CONFIGURACIÓN POSTGRESQL
# Configuración realizada el: ${new Date().toLocaleString()}

# ==============================================
# RENDER.COM POSTGRESQL (PRIMARY DATABASE)
# ==============================================
DB_HOST=${dbHost}
DB_PORT=${dbPort || 5432}
DB_NAME=${dbName || 'postgres'}
DB_USER=${dbUser || 'postgres'}
DB_PASSWORD=${dbPassword}
DB_SSL=true

# ==============================================
# SQL SERVER 2008 LOCAL (GELITE SYNC)
# ==============================================
SQL_SERVER=GABINETE2\\INFOMED
SQL_DATABASE=GELITE

# 🔒 IPs DE RENDER.COM PARA SQL SERVER
RENDER_ALLOWED_IPS=44.229.227.142,54.188.71.94,52.13.128.108,74.220.48.0/24,74.220.56.0/24

# Configuración básica
JWT_SECRET=dentalcare_jwt_secret_2025_seguro_32_caracteres_minimo
JWT_EXPIRES_IN=24h
NODE_ENV=development
PORT=3000

# Configuraciones opcionales
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
PUPPETEER_EXECUTABLE_PATH=
LOG_LEVEL=info
LOG_FILE=logs/app.log`;

        // Escribir el archivo .env
        fs.writeFileSync('.env', envContent);

        console.log('✅ Archivo .env creado exitosamente!');
        console.log('\n📋 Variables configuradas:');
        console.log(`   DB_HOST=${dbHost}`);
        console.log(`   DB_PORT=${dbPort || 5432}`);
        console.log(`   DB_NAME=${dbName || 'postgres'}`);
        console.log(`   DB_USER=${dbUser || 'postgres'}`);
        console.log(`   DB_PASSWORD=[CONFIGURADO]`);

        console.log('\n🚀 SIGUIENTE PASO:');
        console.log('1. Configurar firewall: node configurar-firewall-simple.bat (como admin)');
        console.log('2. Hacer commit: git add .env && git commit -m "Configurar PostgreSQL Render" && git push');
        console.log('3. Verificar app en: https://agenda-dental-backend.onrender.com');

        console.log('\n🎯 RENDER.COM AUTOMÁTICAMENTE REDESPLEGARÁ LA APP');

    } catch (error) {
        console.log('❌ Error:', error.message);
    } finally {
        rl.close();
    }
}

main();