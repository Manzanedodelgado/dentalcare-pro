/**
 * SERVICIO DE BASE DE DATOS UNIFICADO
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Conexión a PostgreSQL (Render.com)
 * - Conexión a SQL Server local (dbo.DCitas)
 * - Pool de conexiones
 * - Transacciones
 * - Consultas optimizadas
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const { Pool } = require('pg');
const sql = require('mssql');
const logger = require('./logger');

// ==============================================
// CONFIGURACIÓN DE CONEXIONES
// ==============================================

// Configuración PostgreSQL (Render.com)
const postgreSQLConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dentalcare_pro',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
};

// Configuración SQL Server (Local)
const sqlServerConfig = {
  server: process.env.SQL_SERVER || 'gabinete2\\box2',
  database: process.env.SQL_DATABASE || 'clinica-dental-db',
  user: process.env.SQL_USERNAME || 'sa',
  password: process.env.SQL_PASSWORD || '',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// ==============================================
// POOLS DE CONEXIÓN
// ==============================================

let postgreSQLPool = null;
let sqlServerPool = null;

// ==============================================
// CONEXIÓN POSTGRESQL
// ==============================================

/**
 * Conectar a PostgreSQL
 */
async function connectPostgreSQL() {
  try {
    postgreSQLPool = new Pool(postgreSQLConfig);
    
    // Probar conexión
    const client = await postgreSQLPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    logger.info('✅ PostgreSQL connected successfully');
    
    // Manejar errores de pool
    postgreSQLPool.on('error', (error) => {
      logger.error('❌ PostgreSQL pool error:', error);
    });
    
    return true;
  } catch (error) {
    logger.error('❌ Error connecting to PostgreSQL:', error);
    postgreSQLPool = null;
    throw error;
  }
}

/**
 * Verificar conexión PostgreSQL
 */
async function checkPostgreSQLConnection() {
  try {
    if (!postgreSQLPool) {
      return { success: false, error: 'PostgreSQL pool not initialized' };
    }
    
    const client = await postgreSQLPool.connect();
    await client.query('SELECT 1');
    client.release();
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Ejecutar consulta en PostgreSQL
 */
async function query(text, params = []) {
  const start = Date.now();
  
  try {
    if (!postgreSQLPool) {
      await connectPostgreSQL();
    }
    
    const result = await postgreSQLPool.query(text, params);
    const duration = Date.now() - start;
    
    // Log de consulta lenta
    if (duration > 1000) {
      logger.warn(`Slow PostgreSQL query (${duration}ms):`, { 
        query: text.substring(0, 100), 
        duration 
      });
    }
    
    return result;
  } catch (error) {
    logger.error('❌ PostgreSQL query error:', { 
      query: text.substring(0, 100), 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Iniciar transacción PostgreSQL
 */
async function beginTransaction() {
  await query('BEGIN');
}

/**
 * Confirmar transacción PostgreSQL
 */
async function commitTransaction() {
  await query('COMMIT');
}

/**
 * Revertir transacción PostgreSQL
 */
async function rollbackTransaction() {
  await query('ROLLBACK');
}

/**
 * Desconectar de PostgreSQL
 */
async function disconnectPostgreSQL() {
  if (postgreSQLPool) {
    await postgreSQLPool.end();
    postgreSQLPool = null;
    logger.info('PostgreSQL disconnected');
  }
}

// ==============================================
// CONEXIÓN SQL SERVER
// ==============================================

/**
 * Conectar a SQL Server
 */
async function connectSQLServer() {
  try {
    sqlServerPool = await sql.connect(sqlServerConfig);
    
    logger.info('✅ SQL Server connected successfully');
    
    return true;
  } catch (error) {
    logger.error('❌ Error connecting to SQL Server:', error);
    sqlServerPool = null;
    throw error;
  }
}

/**
 * Verificar conexión SQL Server
 */
async function checkSQLServerConnection() {
  try {
    if (!sqlServerPool) {
      return { success: false, error: 'SQL Server pool not initialized' };
    }
    
    const result = await sqlServerPool.request().query('SELECT 1');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Ejecutar consulta en SQL Server
 */
async function querySQLServer(queryText, params = []) {
  const start = Date.now();
  
  try {
    if (!sqlServerPool) {
      await connectSQLServer();
    }
    
    const request = sqlServerPool.request();
    
    // Agregar parámetros
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
    
    // Reemplazar placeholders con parámetros nombrados
    let namedQuery = queryText;
    params.forEach((_, index) => {
      namedQuery = namedQuery.replace(`$${index + 1}`, `@param${index}`);
    });
    
    const result = await request.query(namedQuery);
    const duration = Date.now() - start;
    
    // Log de consulta lenta
    if (duration > 1000) {
      logger.warn(`Slow SQL Server query (${duration}ms):`, { 
        query: queryText.substring(0, 100), 
        duration 
      });
    }
    
    return {
      rows: result.recordset || [],
      rowCount: result.rowsAffected ? result.rowsAffected.reduce((a, b) => a + b, 0) : 0
    };
  } catch (error) {
    logger.error('❌ SQL Server query error:', { 
      query: queryText.substring(0, 100), 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Obtener citas de SQL Server (dbo.DCitas)
 */
async function getAppointmentsFromSQLServer(dateFrom = null, dateTo = null) {
  try {
    let queryText = 'SELECT * FROM dbo.DCitas';
    const params = [];
    
    if (dateFrom && dateTo) {
      queryText += ' WHERE fecha BETWEEN @param0 AND @param1';
      params.push(dateFrom, dateTo);
    }
    
    queryText += ' ORDER BY fecha, hora_inicio';
    
    const result = await querySQLServer(queryText, params);
    return result.rows;
  } catch (error) {
    logger.error('Error getting appointments from SQL Server:', error);
    throw error;
  }
}

/**
 * Sincronizar cita con SQL Server
 */
async function syncAppointmentToSQLServer(appointment) {
  try {
    const query = `
      MERGE dbo.DCitas AS target
      USING (SELECT 
        @cita_id as cita_id,
        @fecha as fecha,
        @hora_inicio as hora_inicio,
        @hora_fin as hora_fin,
        @paciente_id as paciente_id,
        @paciente_nombre as paciente_nombre,
        @tratamiento as tratamiento,
        @estado as estado,
        @notas as notas,
        @created_at as created_at,
        @updated_at as updated_at
      ) AS source
      ON target.cita_id = source.cita_id
      WHEN MATCHED THEN
        UPDATE SET 
          fecha = source.fecha,
          hora_inicio = source.hora_inicio,
          hora_fin = source.hora_fin,
          paciente_nombre = source.paciente_nombre,
          tratamiento = source.tratamiento,
          estado = source.estado,
          notas = source.notas,
          updated_at = source.updated_at
      WHEN NOT MATCHED THEN
        INSERT (cita_id, fecha, hora_inicio, hora_fin, paciente_id, paciente_nombre, tratamiento, estado, notas, created_at, updated_at)
        VALUES (source.cita_id, source.fecha, source.hora_inicio, source.hora_fin, source.paciente_id, source.paciente_nombre, source.tratamiento, source.estado, source.notas, source.created_at, source.updated_at);
    `;
    
    const params = [
      appointment.id,
      appointment.appointment_date,
      appointment.start_time,
      appointment.end_time,
      appointment.patient_id,
      appointment.patient_name || '',
      appointment.treatment_type || '',
      appointment.status,
      appointment.notes || '',
      appointment.created_at,
      appointment.updated_at
    ];
    
    const result = await querySQLServer(query, params);
    logger.info(`Appointment ${appointment.id} synced to SQL Server`);
    
    return result;
  } catch (error) {
    logger.error(`Error syncing appointment ${appointment.id} to SQL Server:`, error);
    throw error;
  }
}

/**
 * Crear nueva cita en SQL Server
 */
async function createAppointmentInSQLServer(appointment) {
  try {
    const query = `
      INSERT INTO dbo.DCitas (
        cita_id, fecha, hora_inicio, hora_fin, paciente_id, paciente_nombre,
        tratamiento, estado, notas, created_at, updated_at
      ) VALUES (
        @cita_id, @fecha, @hora_inicio, @hora_fin, @paciente_id, @paciente_nombre,
        @tratamiento, @estado, @notas, @created_at, @updated_at
      )
    `;
    
    const params = [
      appointment.id,
      appointment.appointment_date,
      appointment.start_time,
      appointment.end_time,
      appointment.patient_id,
      appointment.patient_name || '',
      appointment.treatment_type || '',
      appointment.status,
      appointment.notes || '',
      appointment.created_at,
      appointment.updated_at
    ];
    
    const result = await querySQLServer(query, params);
    logger.info(`Appointment ${appointment.id} created in SQL Server`);
    
    return result;
  } catch (error) {
    logger.error(`Error creating appointment ${appointment.id} in SQL Server:`, error);
    throw error;
  }
}

/**
 * Actualizar cita en SQL Server
 */
async function updateAppointmentInSQLServer(appointmentId, updates) {
  try {
    let setClause = [];
    const params = [];
    let paramIndex = 0;
    
    // Construir cláusula SET dinámicamente
    Object.keys(updates).forEach(key => {
      setClause.push(`${key} = @param${paramIndex}`);
      params.push(updates[key]);
      paramIndex++;
    });
    
    const query = `
      UPDATE dbo.DCitas 
      SET ${setClause.join(', ')}, updated_at = @param${paramIndex}
      WHERE cita_id = @param${paramIndex + 1}
    `;
    
    params.push(new Date(), appointmentId);
    
    const result = await querySQLServer(query, params);
    logger.info(`Appointment ${appointmentId} updated in SQL Server`);
    
    return result;
  } catch (error) {
    logger.error(`Error updating appointment ${appointmentId} in SQL Server:`, error);
    throw error;
  }
}

/**
 * Eliminar cita de SQL Server
 */
async function deleteAppointmentFromSQLServer(appointmentId) {
  try {
    const query = 'DELETE FROM dbo.DCitas WHERE cita_id = @param0';
    const result = await querySQLServer(query, [appointmentId]);
    logger.info(`Appointment ${appointmentId} deleted from SQL Server`);
    return result;
  } catch (error) {
    logger.error(`Error deleting appointment ${appointmentId} from SQL Server:`, error);
    throw error;
  }
}

/**
 * Desconectar de SQL Server
 */
async function disconnectSQLServer() {
  if (sqlServerPool) {
    await sqlServerPool.close();
    sqlServerPool = null;
    logger.info('SQL Server disconnected');
  }
}

// ==============================================
// FUNCIONES DE UTILIDAD
// ==============================================

/**
 * Ping a todas las bases de datos
 */
async function pingAllDatabases() {
  const results = {
    postgresql: await checkPostgreSQLConnection(),
    sqlserver: await checkSQLServerConnection()
  };
  
  return results;
}

/**
 * Obtener estadísticas de conexiones
 */
function getConnectionStats() {
  return {
    postgresql: {
      active: postgreSQLPool ? postgreSQLPool.totalCount : 0,
      idle: postgreSQLPool ? postgreSQLPool.idleCount : 0,
      waiting: postgreSQLPool ? postgreSQLPool.waitingCount : 0
    },
    sqlserver: {
      connected: sqlServerPool ? true : false
    }
  };
}

/**
 * Ejecutar migración de esquema
 */
async function runMigration(migrationFile) {
  try {
    const migrationSQL = await fs.readFile(migrationFile, 'utf8');
    await query(migrationSQL);
    logger.info(`Migration applied: ${migrationFile}`);
  } catch (error) {
    logger.error(`Error applying migration ${migrationFile}:`, error);
    throw error;
  }
}

/**
 * Crear índices de rendimiento
 */
async function createIndexes() {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)',
    'CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id)',
    'CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)',
    'CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name)',
    'CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at)',
    'CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(whatsapp_number)',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
  ];
  
  for (const index of indexes) {
    try {
      await query(index);
      logger.info(`Index created: ${index.substring(0, 50)}...`);
    } catch (error) {
      logger.warn(`Error creating index: ${error.message}`);
    }
  }
}

/**
 * Verificar integridad de datos
 */
async function checkDataIntegrity() {
  const checks = [
    {
      name: 'orphaned_appointments',
      query: 'SELECT COUNT(*) FROM appointments a LEFT JOIN patients p ON a.patient_id = p.id WHERE p.id IS NULL'
    },
    {
      name: 'orphaned_invoices',
      query: 'SELECT COUNT(*) FROM invoices i LEFT JOIN patients p ON i.patient_id = p.id WHERE p.id IS NULL'
    },
    {
      name: 'orphaned_messages',
      query: 'SELECT COUNT(*) FROM messages m LEFT JOIN conversations c ON m.conversation_id = c.id WHERE c.id IS NULL'
    }
  ];
  
  const results = {};
  
  for (const check of checks) {
    try {
      const result = await query(check.query);
      results[check.name] = {
        count: parseInt(result.rows[0].count),
        status: parseInt(result.rows[0].count) === 0 ? 'ok' : 'warning'
      };
    } catch (error) {
      results[check.name] = {
        error: error.message,
        status: 'error'
      };
    }
  }
  
  return results;
}

// ==============================================
// LIMPIEZA Y MANTENIMIENTO
// ==============================================

/**
 * Limpiar datos antiguos
 */
async function cleanupOldData() {
  try {
    // Limpiar logs antiguos (más de 90 días)
    await query(`
      DELETE FROM auth_logs 
      WHERE timestamp < NOW() - INTERVAL '90 days'
    `);
    
    // Limpiar sesiones expiradas
    await query(`
      DELETE FROM user_sessions 
      WHERE expires_at < NOW()
    `);
    
    // Archivar mensajes antiguos (más de 1 año)
    await query(`
      DELETE FROM messages 
      WHERE sent_at < NOW() - INTERVAL '1 year'
        AND id NOT IN (
          SELECT conversation_id 
          FROM conversations 
          WHERE updated_at > NOW() - INTERVAL '30 days'
        )
    `);
    
    logger.info('Old data cleanup completed');
  } catch (error) {
    logger.error('Error during data cleanup:', error);
  }
}

/**
 * Programar mantenimiento automático
 */
function scheduleMaintenance() {
  // Limpiar datos cada día a las 3:00 AM
  const now = new Date();
  const cleanupTime = new Date(now);
  cleanupTime.setHours(3, 0, 0, 0);
  
  if (cleanupTime <= now) {
    cleanupTime.setDate(cleanupTime.getDate() + 1);
  }
  
  const timeUntilCleanup = cleanupTime.getTime() - now.getTime();
  
  setTimeout(async () => {
    await cleanupOldData();
    
    // Programar próximas limpiezas cada 24 horas
    setInterval(cleanupOldData, 24 * 60 * 60 * 1000);
    
    logger.info('Automatic data cleanup scheduled');
  }, timeUntilCleanup);
}

// ==============================================
// EXPORTACIÓN
// ==============================================

module.exports = {
  // PostgreSQL
  connectPostgreSQL,
  checkPostgreSQLConnection,
  query,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  disconnectPostgreSQL,
  
  // SQL Server
  connectSQLServer,
  checkSQLServerConnection,
  querySQLServer,
  getAppointmentsFromSQLServer,
  syncAppointmentToSQLServer,
  createAppointmentInSQLServer,
  updateAppointmentInSQLServer,
  deleteAppointmentFromSQLServer,
  disconnectSQLServer,
  
  // Utilidades
  pingAllDatabases,
  getConnectionStats,
  runMigration,
  createIndexes,
  checkDataIntegrity,
  cleanupOldData,
  
  // Configuración
  postgreSQLConfig,
  sqlServerConfig
};

// Inicializar pools en startup si las variables de entorno están disponibles
if (process.env.DB_HOST && process.env.DB_USER) {
  connectPostgreSQL().catch(error => {
    logger.error('Failed to auto-connect PostgreSQL:', error);
  });
}

if (process.env.SQL_SERVER && process.env.SQL_DATABASE) {
  connectSQLServer().catch(error => {
    logger.error('Failed to auto-connect SQL Server:', error);
  });
}

// Programar mantenimiento automático
scheduleMaintenance();
