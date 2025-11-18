/**
 * MAPEADOR DE DATOS SQL SERVER 2008
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Convierte entre el formato legacy de SQL Server 2008 (dbo.DCitas)
 * y el formato esperado por la aplicación DentalCare Pro
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 */

const logger = require('./logger');

// ==============================================
// UTILIDADES DE CONVERSIÓN
// ==============================================

/**
 * Convertir número de serie de fecha de Excel a formato DATE
 * @param {number} serialDate - Número de serie (ej: 41456)
 * @returns {string} - Fecha en formato 'YYYY-MM-DD'
 */
function excelSerialToDate(serialDate) {
  try {
    // Excel cuenta desde 1900-01-01 (pero cuenta 1900 como bisiesto incorrectamente)
    const excelEpoch = new Date(1900, 0, 1); // 1900-01-01
    const daysFromEpoch = serialDate - 2; // -2 por el error de Excel con 1900
    const resultDate = new Date(excelEpoch.getTime() + (daysFromEpoch * 24 * 60 * 60 * 1000));
    
    return resultDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  } catch (error) {
    logger.error('Error converting Excel serial date:', { serialDate, error: error.message });
    return new Date().toISOString().split('T')[0]; // Fecha actual como fallback
  }
}

/**
 * Convertir segundos desde medianoche a formato TIME
 * @param {number} secondsFromMidnight - Segundos desde medianoche (ej: 41400)
 * @returns {string} - Hora en formato 'HH:MM:SS'
 */
function secondsToTime(secondsFromMidnight) {
  try {
    const hours = Math.floor(secondsFromMidnight / 3600);
    const minutes = Math.floor((secondsFromMidnight % 3600) / 60);
    const seconds = secondsFromMidnight % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } catch (error) {
    logger.error('Error converting seconds to time:', { secondsFromMidnight, error: error.message });
    return '08:00:00'; // Fallback a 8:00 AM
  }
}

/**
 * Convertir duración en segundos a formato TIME
 * @param {number} durationSeconds - Duración en segundos (ej: 1800)
 * @returns {string} - Duración en formato 'HH:MM:SS'
 */
function durationToTime(durationSeconds) {
  return secondsToTime(durationSeconds);
}

/**
 * Obtener hora final calculada
 * @param {number} startSeconds - Hora inicio en segundos
 * @param {number} durationSeconds - Duración en segundos
 * @returns {string} - Hora final en formato 'HH:MM:SS'
 */
function calculateEndTime(startSeconds, durationSeconds) {
  const totalSeconds = startSeconds + durationSeconds;
  return secondsToTime(totalSeconds);
}

// ==============================================
// MAPEADORES DE DATOS
// ==============================================

/**
 * Mapear cita de SQL Server legacy a formato DentalCare Pro
 * @param {Object} sqlServerRow - Fila de dbo.DCitas
 * @returns {Object} - Cita en formato de la aplicación
 */
function mapSQLServerToApp(sqlServerRow) {
  try {
    // Convertir campos principales
    const fecha = excelSerialToDate(sqlServerRow.Fecha);
    const horaInicio = secondsToTime(sqlServerRow.Hora);
    const horaFin = calculateEndTime(sqlServerRow.Hora, sqlServerRow.Duracion);
    
    // Mapear paciente
    const pacienteNombre = sqlServerRow.Texto || sqlServerRow.Contacto || 'Sin nombre';
    const pacienteId = sqlServerRow.IdPac || sqlServerRow.NUMPAC || null;
    
    // Determinar estado basado en campos existentes
    let estado = 'planificada'; // Por defecto
    if (sqlServerRow.Confirmada === 1) {
      estado = 'confirmada';
    }
    if (sqlServerRow.Aceptada === 1) {
      estado = 'aceptada';
    }
    if (sqlServerRow.FlgBloqueo === 'F') {
      // 'F' podría indicar que está cancelada o bloqueada
      estado = 'anulada';
    }
    
    // Crear objeto mapeado
    const mappedAppointment = {
      id: sqlServerRow.IdCitasP || sqlServerRow.IdCita || `sql_${sqlServerRow.IdOrden}`,
      
      // Datos de fecha y hora (formato aplicación)
      appointment_date: fecha,
      start_time: horaInicio,
      end_time: horaFin,
      
      // Datos de paciente
      patient_id: pacienteId ? pacienteId.toString() : null,
      patient_name: pacienteNombre,
      
      // Datos de tratamiento
      treatment_type: sqlServerRow.IdSitC || sqlServerRow.IdProced || 'Consulta general',
      notes: sqlServerRow.NOTAS || sqlServerRow.Texto || '',
      
      // Estado y control
      status: estado,
      
      // Campos de control
      created_at: sqlServerRow.FecAlta ? new Date(sqlServerRow.FecAlta).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Campos adicionales útiles
      duracion_segundos: sqlServerRow.Duracion,
      contacto_telefono: sqlServerRow.Contacto || sqlServerRow.Movil || '',
      num_paciente: sqlServerRow.NUMPAC || null,
      confirmada: sqlServerRow.Confirmada === 1,
      recordada: sqlServerRow.Recordada === 1,
      
      // Metadatos
      source: 'sql_server_legacy',
      id_original: sqlServerRow.IdOrden
    };
    
    logger.info(`Cita mapeada: ${mappedAppointment.id} - ${pacienteNombre}`);
    
    return mappedAppointment;
  } catch (error) {
    logger.error('Error mapping SQL Server appointment:', { sqlServerRow, error: error.message });
    throw error;
  }
}

/**
 * Mapear cita de aplicación a formato SQL Server legacy
 * @param {Object} appAppointment - Cita de DentalCare Pro
 * @returns {Object} - Cita en formato dbo.DCitas
 */
function mapAppToSQLServer(appAppointment) {
  try {
    // Convertir fecha a número de serie de Excel
    const fechaObj = new Date(appAppointment.appointment_date);
    const daysSince1900 = Math.floor((fechaObj.getTime() - new Date(1900, 0, 1).getTime()) / (24 * 60 * 60 * 1000)) + 2;
    
    // Convertir hora inicio a segundos
    const horaObj = new Date(`2000-01-01T${appAppointment.start_time}`);
    const horaSegundos = horaObj.getHours() * 3600 + horaObj.getMinutes() * 60;
    
    // Convertir duración a segundos
    const [horas, minutos, segundos] = appAppointment.end_time.split(':').map(Number);
    const duracionTotal = (horas * 3600 + minutos * 60 + segundos) - horaSegundos;
    
    // Mapear estados
    let confirmada = 0;
    let aceptada = 0;
    let flgBloqueo = 'F'; // Por defecto libre
    
    switch (appAppointment.status) {
      case 'confirmada':
        confirmada = 1;
        break;
      case 'aceptada':
        confirmada = 1;
        aceptada = 1;
        break;
      case 'anulada':
        flgBloqueo = 'T'; // Bloqueada = anulada
        break;
    }
    
    // Crear objeto para SQL Server
    const mappedSQLServer = {
      // Campos principales
      IdOrden: appAppointment.id.replace('sql_', ''),
      Fecha: daysSince1900,
      Hora: horaSegundos,
      Duracion: duracionTotal,
      
      // Datos de paciente
      Texto: appAppointment.patient_name || '',
      IdPac: appAppointment.patient_id || null,
      NUMPAC: appAppointment.num_paciente || appAppointment.patient_id,
      Contacto: appAppointment.contacto_telefono || '',
      Movil: appAppointment.contacto_telefono || '',
      
      // Control y estado
      Confirmada: confirmada,
      Aceptada: aceptada,
      FlgBloqueo: flgBloqueo,
      
      // Notas y observaciones
      NOTAS: appAppointment.notes || '',
      
      // Campos de control
      FecAlta: new Date(appAppointment.created_at || Date.now()).toLocaleString('en-US'),
      
      // Campos adicionales
      IdSitC: appAppointment.treatment_type || '1',
      IdProced: appAppointment.treatment_type || '1',
      
      // Campos calculados
      horafinal: appAppointment.end_time
    };
    
    logger.info(`Cita mapeada para SQL Server: ${mappedSQLServer.IdOrden}`);
    
    return mappedSQLServer;
  } catch (error) {
    logger.error('Error mapping app appointment to SQL Server:', { appAppointment, error: error.message });
    throw error;
  }
}

// ==============================================
// FUNCIONES DE VALIDACIÓN
// ==============================================

/**
 * Validar que un registro de SQL Server tenga los campos mínimos necesarios
 * @param {Object} sqlRow - Registro de dbo.DCitas
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateSQLServerRecord(sqlRow) {
  const errors = [];
  
  // Campos obligatorios
  if (!sqlRow.IdOrden) errors.push('IdOrden es requerido');
  if (sqlRow.Fecha === undefined || sqlRow.Fecha === null) errors.push('Fecha es requerida');
  if (sqlRow.Hora === undefined || sqlRow.Hora === null) errors.push('Hora es requerida');
  if (sqlRow.Duracion === undefined || sqlRow.Duracion === null) errors.push('Duracion es requerida');
  
  // Validar rangos
  if (sqlRow.Fecha < 36526) { // Menos de 100 días desde 1900 = fecha inválida
    errors.push('Fecha inválida (número de serie muy bajo)');
  }
  
  if (sqlRow.Hora < 0 || sqlRow.Hora > 86400) { // Fuera del rango de un día
    errors.push('Hora fuera del rango válido (0-86400 segundos)');
  }
  
  if (sqlRow.Duracion <= 0 || sqlRow.Duracion > 28800) { // Más de 8 horas = sospechoso
    errors.push('Duración inválida');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// ==============================================
// EXPORTACIONES
// ==============================================

module.exports = {
  // Utilidades de conversión
  excelSerialToDate,
  secondsToTime,
  durationToTime,
  calculateEndTime,
  
  // Mapeadores principales
  mapSQLServerToApp,
  mapAppToSQLServer,
  
  // Validación
  validateSQLServerRecord
};

// ==============================================
// PRUEBAS Y EJEMPLOS
// ==============================================

if (require.main === module) {
  // Ejemplo de uso
  console.log('=== PRUEBA DE MAPEADOR SQL SERVER ===\n');
  
  // Ejemplo de registro SQL Server
  const ejemploSQLServer = {
    IdOrden: 1,
    Fecha: 41456,        // 03/09/2019
    Hora: 41400,         // 11:30:00 (11:30 AM)
    Duracion: 1800,      // 30 minutos
    Texto: 'LAURA MORENO VARGAS',
    IdPac: 338,
    NUMPAC: 283,
    Contacto: '639242276',
    NOTAS: 'empieza tratamiento .empastes',
    Confirmada: 0,
    Aceptada: 0,
    FlgBloqueo: 'F',
    FecAlta: '03/09/2019 12:26'
  };
  
  console.log('Registro SQL Server original:');
  console.log(JSON.stringify(ejemploSQLServer, null, 2));
  
  console.log('\nMapeando a formato aplicación...');
  const appointmentApp = mapSQLServerToApp(ejemploSQLServer);
  console.log(JSON.stringify(appointmentApp, null, 2));
  
  console.log('\nMapeando de vuelta a SQL Server...');
  const appointmentSQL = mapAppToSQLServer(appointmentApp);
  console.log(JSON.stringify(appointmentSQL, null, 2));
  
  console.log('\nValidación:');
  const validation = validateSQLServerRecord(ejemploSQLServer);
  console.log(validation);
}