#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🎯 CONFIGURACIÓN INTERACTIVA DE RENDER.COM');
console.log('==========================================\n');

async function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function main() {
    try {
        console.log('📋 OBJETIVO: Configurar las variables de PostgreSQL en .env\n');
        
        const dbHost = await askQuestion('🌐 DB_HOST (pega el host de Render): ');
        const dbDatabase = await askQuestion('🗄️ DB_NAME (normalmente "postgres"): ');
        const dbUser = await askQuestion('👤 DB_USER (normalmente "postgres"): ');
        const dbPassword = await askQuestion('🔑 DB_PASSWORD (pega el password): ');

        if (!dbHost || !dbPassword) {
            console.log('❌ Error: DB_HOST y DB_PASSWORD son obligatorios');
            process.exit(1);
        }

        console.log('\n🔄 Actualizando archivo .env...');

        // Leer el archivo .env actual
        const envPath = '.env';
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Reemplazar las variables
        envContent = envContent.replace(/DB_HOST=.*$/m, `DB_HOST=${dbHost}`);
        envContent = envContent.replace(/DB_PASSWORD=.*$/m, `DB_PASSWORD=${dbPassword}`);
        
        if (dbDatabase) {
            envContent = envContent.replace(/DB_NAME=.*$/m, `DB_NAME=${dbDatabase}`);
        }
        
        if (dbUser) {
            envContent = envContent.replace(/DB_USER=.*$/m, `DB_USER=${dbUser}`);
        }

        // Escribir el archivo actualizado
        fs.writeFileSync(envPath, envContent);

        console.log('✅ Archivo .env actualizado exitosamente!');
        console.log('\n📋 Variables configuradas:');
        console.log(`   DB_HOST=${dbHost}`);
        console.log(`   DB_PASSWORD=[CONFIGURADO]`);
        console.log(`   DB_NAME=${dbDatabase || 'postgres'}`);
        console.log(`   DB_USER=${dbUser || 'postgres'}`);

        console.log('\n🚀 SIGUIENTE PASO:');
        console.log('1. Comita los cambios: git add .env && git commit -m "Configurar credenciales Render" && git push');
        console.log('2. Render redesplegará automáticamente la aplicación');
        console.log('3. Verifica que la app funcione en: https://agenda-dental-backend.onrender.com');

    } catch (error) {
        console.log('❌ Error:', error.message);
    } finally {
        rl.close();
    }
}

main();