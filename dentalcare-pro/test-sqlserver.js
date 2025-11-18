#!/usr/bin/env node

/**
 * SCRIPT DE PRUEBA Y VERIFICACIÓN SQL SERVER 2008
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Este script verifica:
 * 1. Conectividad con SQL Server 2008 local
 * 2. Presencia de la tabla dbo.DCitas
 * 3. Estructura de datos compatible
 * 4. Mapeo de datos legacy
 * 5. Sincronización básica
 * 
 * Uso: node test-sqlserver.js
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 */

require('dotenv').config();

const { connectSQLServer, querySQLServer, checkSQLServerConnection } = require('./utils/databaseService');
const { mapSQLServerToApp, validateSQLServerRecord, excelSerialToDate, secondsToTime } = require('./utils/sqlServerDataMapper');
const logger = require('./utils/logger');

// ==============================================
// CONFIGURACIÓN Y UTILIDADES
// ==============================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function separator(title) {
  console.log('\n' + '='.repeat(60));
  log(colors.bright + colors.cyan, `  ${title}`);
  console.log('='.repeat(60));
}

function testResult(testName, success, details = '') {
  const status = success ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
  log(colors.bright, `${status} ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
  return success;
}

// ==============================================
// PRUEBAS PRINCIPALES
// ==============================================

async function testConnection() {
  separator('PRUEBA 1: CONECTIVIDAD SQL SERVER 2008');
  
  try {
    log(colors.yellow, 'Intentando conectar a SQL Server...');
    
    const result = await checkSQLServerConnection();
    
    if (result.success) {
      testResult('Conexión SQL Server', true, 'Conexión establecida exitosamente');
      
      // Probar consulta básica
      try {
        await querySQLServer('SELECT @@VERSION as version');
        testResult('Consulta básica SQL Server', true, 'SELECT @@VERSION ejecutado correctamente');
      } catch (queryError) {
        testResult('Consulta básica SQL Server', false, `Error: ${queryError.message}`);
      }
      
      return true;
    } else {
      testResult('Conexión SQL Server', false, `Error: ${result.error}`);
      return false;
    }
  } catch (error) {
    testResult('Conexión SQL Server', false, `Error crítico: ${error.message}`);
    return false;
  }
}

async function testTableStructure() {
  separator('PRUEBA 2: ESTRUCTURA TABLA DBO.DCITAS');
  
  try {
    // Verificar si la tabla existe
    const tableQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_NAME = 'DCitas'
    `;
    
    const tableResult = await querySQLServer(tableQuery);
    
    if (tableResult.rows.length > 0) {
      testResult('Tabla dbo.DCitas existe', true);
      
      // Verificar columnas principales
      const columnsQuery = `
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'dbo' 
        AND TABLE_NAME = 'DCitas'
        ORDER BY ORDINAL_POSITION
      `;
      
      const columnsResult = await querySQLServer(columnsQuery);
      
      log(colors.blue, `\nColumnas encontradas (${columnsResult.rows.length}):`);
      columnsResult.rows.forEach(col => {
        const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        log(colors.cyan, `  • ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${nullable}`);
      });
      
      // Verificar columnas críticas
      const requiredColumns = ['IdOrden', 'Fecha', 'Hora', 'Duracion', 'Texto'];
      const foundColumns = columnsResult.rows.map(col => col.COLUMN_NAME);
      
      requiredColumns.forEach(col => {
        const found = foundColumns.includes(col);
        testResult(`Columna crítica: ${col}`, found, found ? 'Encontrada' : 'FALTANTE');
      });
      
      return true;
    } else {
      testResult('Tabla dbo.DCitas existe', false, 'La tabla no existe en la base de datos');
      return false;
    }
  } catch (error) {
    testResult('Estructura tabla dbo.DCitas', false, `Error: ${error.message}`);
    return false;
  }
}

async function testDataMapping() {
  separator('PRUEBA 3: MAPEO DE DATOS LEGACY');
  
  try {
    // Obtener algunos registros de ejemplo
    const sampleQuery = `
      SELECT TOP 5 
        IdOrden, Fecha, Hora, Duracion, Texto, IdPac, 
        Contacto, NOTAS, Confirmada, Aceptada, FlgBloqueo
      FROM dbo.DCitas
      ORDER BY IdOrden
    `;
    
    const sampleResult = await querySQLServer(sampleQuery);
    
    if (sampleResult.rows.length > 0) {
      testResult('Datos de ejemplo obtenidos', true, `${sampleResult.rows.length} registros encontrados`);
      
      log(colors.blue, '\nProcesando mapeo de datos:');
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const row of sampleResult.rows) {
        try {
          // Validar registro
          const validation = validateSQLServerRecord(row);
          
          if (validation.valid) {
            // Mapear a formato aplicación
            const mappedAppointment = mapSQLServerToApp(row);
            
            log(colors.green, `  ✅ Registro ${row.IdOrden}: ${mappedAppointment.patient_name}`);
            log(colors.yellow, `     Fecha: ${mappedAppointment.appointment_date} | Hora: ${mappedAppointment.start_time}`);
            
            successCount++;
          } else {
            log(colors.red, `  ❌ Registro ${row.IdOrden}: ${validation.errors.join(', ')}`);
            errorCount++;
          }
        } catch (mapError) {
          log(colors.red, `  ❌ Error mapeando registro ${row.IdOrden}: ${mapError.message}`);
          errorCount++;
        }
      }
      
      testResult('Mapeo de datos', successCount > 0, `${successCount} registros procesados correctamente, ${errorCount} errores`);
      
      return successCount > 0;
    } else {
      testResult('Datos de ejemplo obtenidos', false, 'No se encontraron registros en dbo.DCitas');
      return false;
    }
  } catch (error) {
    testResult('Mapeo de datos', false, `Error: ${error.message}`);
    return false;
  }
}

async function testDateTimeConversion() {
  separator('PRUEBA 4: CONVERSIÓN FECHA Y HORA');
  
  try {
    // Probar conversión de fecha
    const testDates = [
      { serial: 41456, expected: '2019-09-03' },
      { serial: 41457, expected: '2019-09-04' }
    ];
    
    log(colors.blue, '\nProbando conversión de fechas:');
    
    for (const test of testDates) {
      const converted = excelSerialToDate(test.serial);
      const success = converted === test.expected;
      
      testResult(
        `Fecha serial ${test.serial}`,
        success,
        `Esperado: ${test.expected} | Obtenido: ${converted}`
      );
    }
    
    // Probar conversión de hora
    const testTimes = [
      { seconds: 41400, expected: '11:30:00' },   // 11:30 AM
      { seconds: 32400, expected: '09:00:00' },   // 9:00 AM
      { seconds: 54000, expected: '15:00:00' }    // 3:00 PM
    ];
    
    log(colors.blue, '\nProbando conversión de horas:');
    
    for (const test of testTimes) {
      const converted = secondsToTime(test.seconds);
      const success = converted === test.expected;
      
      testResult(
        `Hora ${test.seconds} segundos`,
        success,
        `Esperado: ${test.expected} | Obtenido: ${converted}`
      );
    }
    
    return true;
  } catch (error) {
    testResult('Conversión fecha/hora', false, `Error: ${error.message}`);
    return false;
  }
}

async function testSQLQueries() {
  separator('PRUEBA 5: CONSULTAS SQL AVANZADAS');
  
  try {
    // Probar consulta de estadísticas
    const statsQuery = `
      SELECT 
        COUNT(*) as total_citas,
        COUNT(CASE WHEN Confirmada = 1 THEN 1 END) as confirmadas,
        COUNT(CASE WHEN Aceptada = 1 THEN 1 END) as aceptadas,
        COUNT(CASE WHEN FlgBloqueo = 'T' THEN 1 END) as bloqueadas,
        AVG(Duracion) as duracion_promedio
      FROM dbo.DCitas
    `;
    
    const statsResult = await querySQLServer(statsQuery);
    
    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      
      testResult('Estadísticas de citas', true, 
        `Total: ${stats.total_citas}, Confirmadas: ${stats.confirmadas}, Aceptadas: ${stats.aceptadas}`
      );
      
      // Probar consulta de fechas recientes
      const recentQuery = `
        SELECT TOP 3 IdOrden, Texto, Fecha, Hora
        FROM dbo.DCitas
        ORDER BY Fecha DESC, Hora DESC
      `;
      
      const recentResult = await querySQLServer(recentQuery);
      
      if (recentResult.rows.length > 0) {
        testResult('Citas más recientes', true, `${recentResult.rows.length} registros encontrados`);
        
        log(colors.blue, '\nÚltimas citas:');
        recentResult.rows.forEach(row => {
          const fecha = excelSerialToDate(row.Fecha);
          const hora = secondsToTime(row.Hora);
          log(colors.cyan, `  • ${row.IdOrden}: ${row.Texto} - ${fecha} ${hora}`);
        });
      } else {
        testResult('Citas más recientes', false, 'No se encontraron citas');
      }
      
      return true;
    } else {
      testResult('Estadísticas de citas', false, 'No se pudieron obtener estadísticas');
      return false;
    }
  } catch (error) {
    testResult('Consultas SQL avanzadas', false, `Error: ${error.message}`);
    return false;
  }
}

// ==============================================
// FUNCIÓN PRINCIPAL
// ==============================================

async function main() {
  log(colors.bright + colors.blue, '\n' + '█'.repeat(60));
  log(colors.bright + colors.blue, '  DENTALCARE PRO - PRUEBA SQL SERVER 2008');
  log(colors.bright + colors.blue, '  '.repeat(30) + 'MiniMax Agent');
  log(colors.bright + colors.blue, '█'.repeat(60));
  
  console.log('\nIniciando verificación completa del sistema SQL Server...\n');
  
  const tests = [
    { name: 'Conectividad', fn: testConnection },
    { name: 'Estructura de tabla', fn: testTableStructure },
    { name: 'Mapeo de datos', fn: testDataMapping },
    { name: 'Conversión fecha/hora', fn: testDateTimeConversion },
    { name: 'Consultas SQL', fn: testSQLQueries }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      testResult(`Error en ${test.name}`, false, error.message);
      failed++;
    }
  }
  
  separator('RESULTADOS FINALES');
  
  const total = passed + failed;
  const percentage = Math.round((passed / total) * 100);
  
  log(colors.bright + (percentage >= 80 ? colors.green : colors.yellow), 
    `RESULTADO: ${passed}/${total} pruebas exitosas (${percentage}%)`);
  
  if (percentage >= 80) {
    log(colors.green, '\n✅ ¡SISTEMA SQL SERVER CONFIGURADO CORRECTAMENTE!');
    log(colors.blue, '\nPuedes proceder con la sincronización de la agenda.');
  } else {
    log(colors.red, '\n❌ HAY PROBLEMAS CON LA CONFIGURACIÓN SQL SERVER');
    log(colors.yellow, '\nRevisa los errores arriba antes de continuar.');
  }
  
  log(colors.cyan, '\nPara más ayuda, revisa:');
  log(colors.cyan, '  • Archivo .env.example para configuración');
  log(colors.cyan, '  • sqlServerDataMapper.js para mapeo de datos');
  log(colors.cyan, '  • databaseService.js para configuración de conexión');
  
  console.log('\n' + '█'.repeat(60) + '\n');
  
  process.exit(percentage >= 80 ? 0 : 1);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(error => {
    log(colors.red, `\nError crítico: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main };