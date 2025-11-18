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
// MAPEOS ESPECÍFICOS DE GELITE
// ==============================================

/**
 * Estados de citas específicos de GELITE (IdSitC)
 */
const ESTADOS_CITAS_GELITE = {
  0: 'planificada',    // Planificada
  1: 'anulada',        // Anulada  
  5: 'finalizada',     // Finalizada
  7: 'confirmada',     // Confirmada
  8: 'cancelada',      // Cancelada
  9: 'aceptada'        // Aceptada
};

/**
 * Tratamientos específicos de GELITE (IdIcono)
 */
const TRATAMIENTOS_GELITE = {
  1: 'Control',
  2: 'Urgencia',
  3: 'Protesis Fija',
  4: 'Cirugia/Injerto',
  6: 'Retirar Ortodoncia',
  7: 'Protesis Removible', 
  8: 'Colocacion Ortodoncia',
  9: 'Periodoncia',
  10: 'Cirugía de Implante',
  11: 'Mensualidad Ortodoncia',
  12: 'Ajuste Prot/tto',
  13: 'Primera Visita',
  14: 'Higiene Dental',
  15: 'Endodoncia',
  16: 'Reconstruccion',
  17: 'Exodoncia',
  18: 'Estudio Ortodoncia',
  19: 'Rx/escaner'
};

/**
 * Odontólogos específicos de GELITE (IdUsu)
 */
const ODONTOLOGOS_GELITE = {
  3: 'Dr. Mario Rubio',
  4: 'Dra. Irene Garcia', 
  8: 'Dra. Virginia Tresgallo',
  10: 'Dra. Miriam Carrasco',
  12: 'Tc. Juan Antonio Manzanedo'
};

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
    // Convertir campos principales usando conversión SQL
    const fecha = excelSerialToDate(sqlServerRow.Fecha);
    const horaInicio = secondsToTime(sqlServerRow.Hora);
    const horaFin = calculateEndTime(sqlServerRow.Hora, sqlServerRow.Duracion);
    
    // Mapear paciente separando nombre y apellidos
    let pacienteNombre = sqlServerRow.Texto || 'Sin nombre';
    let nombre = pacienteNombre;
    let apellidos = null;
    
    if (sqlServerRow.Texto && sqlServerRow.Texto.includes(',')) {
      const parts = sqlServerRow.Texto.split(',');
      apellidos = parts[0].trim();
      nombre = parts.slice(1).join(',').trim();
    }
    
    const pacienteId = sqlServerRow.IdPac || sqlServerRow.NUMPAC || sqlServerRow.Registro || null;
    
    // Mapear estado usando IdSitC específico de GELITE
    let estado = 'planificada'; // Por defecto
    if (sqlServerRow.IdSitC !== undefined && ESTADOS_CITAS_GELITE[sqlServerRow.IdSitC]) {
      estado = ESTADOS_CITAS_GELITE[sqlServerRow.IdSitC];
    }
    
    // Mapear tratamiento usando IdIcono específico de GELITE
    let tratamiento = 'Consulta';
    if (sqlServerRow.IdIcono !== undefined && TRATAMIENTOS_GELITE[sqlServerRow.IdIcono]) {
      tratamiento = TRATAMIENTOS_GELITE[sqlServerRow.IdIcono];
    }
    
    // Mapear odontólogo usando IdUsu específico de GELITE
    let odontologo = 'Odontologo';
    if (sqlServerRow.IdUsu !== undefined && ODONTOLOGOS_GELITE[sqlServerRow.IdUsu]) {
      odontologo = ODONTOLOGOS_GELITE[sqlServerRow.IdUsu];
    }
    
    // Calcular duración en minutos
    const duracionMinutos = Math.round((sqlServerRow.Duracion || 0) / 60);
    
    // Crear objeto mapeado
    const mappedAppointment = {
      id: sqlServerRow.Registro || sqlServerRow.IdCita || sqlServerRow.IdCitasP || `sql_${sqlServerRow.IdOrden || 'unknown'}`,
      
      // Datos de fecha y hora (formato aplicación)
      appointment_date: fecha,
      start_time: horaInicio,
      end_time: horaFin,
      
      // Datos de paciente
      patient_id: pacienteId ? pacienteId.toString() : null,
      patient_name: nombre,
      patient_surname: apellidos,
      patient_full_name: sqlServerRow.Texto || 'Sin nombre',
      
      // Datos de tratamiento
      treatment_type: tratamiento,
      notes: sqlServerRow.NOTAS || '',
      
      // Personal (odontólogo)
      dentist_name: odontologo,
      
      // Estado y control
      status: estado,
      status_id: sqlServerRow.IdSitC,
      icon_id: sqlServerRow.IdIcono,
      user_id: sqlServerRow.IdUsu,
      
      // Campos de control
      created_at: sqlServerRow.FechaAlta ? new Date(sqlServerRow.FechaAlta).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Campos adicionales específicos de GELITE
      contacto_telefono: sqlServerRow.TelMovil || sqlServerRow.Movil || '',
      num_paciente: sqlServerRow.NumPac || sqlServerRow.NUMPAC || null,
      registro: sqlServerRow.Registro || null,
      citamod: sqlServerRow.CitMod || null,
      
      // Metadatos
      source: 'gelite_sql_server',
      id_original: sqlServerRow.IdOrden || sqlServerRow.Registro,
      duracion_minutos: duracionMinutos
    };
    
    logger.info(`Cita GELITE mapeada: ${mappedAppointment.id} - ${mappedAppointment.patient_full_name}`);
    
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
  
  // Mapeos específicos de GELITE
  ESTADOS_CITAS_GELITE,
  TRATAMIENTOS_GELITE,
  ODONTOLOGOS_GELITE,
  
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