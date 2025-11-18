/**
 * CONTROLADOR DE AGENDA Y GESTIÓN DE CITAS
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Sincronización completa con tabla dbo.DCitas de SQL Server
 * - Estados de citas editables (Planificada, Confirmada, Aceptada, Anulada)
 * - Gestión avanzada de agenda (diaria, semanal, mensual)
 * - Estados vinculados a automatizaciones de confirmación
 * - Control de permisos por rol de usuario
 * - Actualización en tiempo real
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const databaseService = require('../utils/databaseService');
const sqlServerService = require('../utils/sqlServerService');
const automationService = require('./automationController');
const logger = require('../utils/logger');
const { hasPermission } = require('./authController');

// ==============================================
// CONFIGURACIÓN DE ESTADOS Y FLUJOS
// ==============================================

const APPOINTMENT_STATES = {
  PLANIFICADA: {
    id: 'planificada',
    name: 'Planificada',
    color: 'gray',
    description: 'Borrador inicial pendiente de confirmación',
    canTransitionTo: ['confirmada', 'anulada'],
    requiresConfirmation: false,
    showInAgenda: false,
    automationTriggers: []
  },
  CONFIRMADA: {
    id: 'confirmada',
    name: 'Confirmada',
    color: 'blue',
    description: 'Confirmada por paciente, pendiente de consentimiento LOPD',
    canTransitionTo: ['aceptada', 'anulada'],
    requiresConfirmation: true,
    showInAgenda: true,
    automationTriggers: ['consent_send']
  },
  ACEPTADA: {
    id: 'aceptada',
    name: 'Aceptada',
    color: 'green',
    description: 'Confirmada + documentos LOPD + cuestionario completo',
    canTransitionTo: ['anulada'],
    requiresConfirmation: true,
    showInAgenda: true,
    automationTriggers: ['reminder_24h', 'reminder_2h', 'questionnaire_send']
  },
  ANULADA: {
    id: 'anulada',
    name: 'Anulada',
    color: 'red',
    description: 'Cancelada por paciente o clínica',
    canTransitionTo: ['planificada'],
    requiresConfirmation: false,
    showInAgenda: false,
    automationTriggers: []
  }
};

// ==============================================
// FUNCIONES AUXILIARES
// ==============================================

/**
 * Validar transición de estado de cita
 * @param {string} currentState - Estado actual
 * @param {string} newState - Estado deseado
 * @returns {boolean}
 */
function validateStateTransition(currentState, newState) {
  const current = APPOINTMENT_STATES[currentState];
  const target = APPOINTMENT_STATES[newState];
  
  if (!current || !target) return false;
  
  return current.canTransitionTo.includes(newState);
}

/**
 * Obtener próximas automatizaciones según estado
 * @param {string} state - Estado de la cita
 * @returns {Array} Lista de automatizaciones a ejecutar
 */
function getStateAutomations(state) {
  const stateConfig = APPOINTMENT_STATES[state.toUpperCase()];
  return stateConfig ? stateConfig.automationTriggers : [];
}

/**
 * Sincronizar cita con SQL Server
 * @param {Object} appointment - Datos de la cita
 * @param {string} operation - 'create', 'update', 'delete'
 */
async function syncWithSQLServer(appointment, operation) {
  try {
    const sqlData = {
      cita_id: appointment.id,
      fecha: appointment.appointment_date,
      hora_inicio: appointment.start_time,
      hora_fin: appointment.end_time,
      paciente_id: appointment.patient_id,
      paciente_nombre: appointment.patient_name,
      tratamiento: appointment.treatment_type,
      estado: appointment.status,
      notas: appointment.notes || '',
      created_at: appointment.created_at,
      updated_at: new Date()
    };
    
    switch (operation) {
      case 'create':
        await sqlServerService.insert('DCitas', sqlData);
        break;
      case 'update':
        await sqlServerService.update('DCitas', { cita_id: appointment.id }, sqlData);
        break;
      case 'delete':
        await sqlServerService.delete('DCitas', { cita_id: appointment.id });
        break;
    }
    
    logger.info(`Cita ${appointment.id} sincronizada con SQL Server (${operation})`);
    
  } catch (error) {
    logger.error(`Error al sincronizar con SQL Server: ${error.message}`);
    // No throw el error para evitar romper el flujo principal
  }
}

/**
 * Obtener conflictos de horario para una cita
 * @param {Date} appointmentDate - Fecha de la cita
 * @param {string} startTime - Hora de inicio
 * @param {string} endTime - Hora de fin
 * @param {string} excludeId - ID de cita a excluir (para updates)
 */
async function getScheduleConflicts(appointmentDate, startTime, endTime, excludeId = null) {
  try {
    let query = `
      SELECT id, appointment_date, start_time, end_time, patient_name, status
      FROM appointments 
      WHERE DATE(appointment_date) = $1 
        AND status IN ('confirmada', 'aceptada')
        AND (
          (start_time < $3 AND end_time > $2) OR 
          (start_time < $4 AND end_time > $3) OR 
          (start_time >= $2 AND end_time <= $4)
        )
    `;
    
    const params = [appointmentDate, startTime, endTime, startTime];
    
    if (excludeId) {
      query += ' AND id != $5';
      params.push(excludeId);
    }
    
    const conflictsQuery = await databaseService.query(query, params);
    return conflictsQuery.rows;
    
  } catch (error) {
    logger.error(`Error al verificar conflictos: ${error.message}`);
    return [];
  }
}

// ==============================================
// CONTROLADOR DE CITAS DEL DÍA
// ==============================================

/**
 * Obtener citas del día actual
 * GET /api/agenda/today
 */
async function getTodayAppointments(req, res) {
  try {
    const { includeAnuladas = false } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let whereClause = `WHERE a.appointment_date >= $1 AND a.appointment_date < $2`;
    const params = [today, tomorrow];
    
    // Filtrar citas anuladas si no se solicitan
    if (!includeAnuladas) {
      whereClause += ' AND a.status != $3';
      params.push('anulada');
    }
    
    const appointmentsQuery = await databaseService.query(
      `SELECT 
         a.id, a.appointment_date, a.start_time, a.end_time,
         a.status, a.treatment_type, a.notes, a.created_at, a.updated_at,
         p.id as patient_id, p.name as patient_name, p.phone as patient_phone,
         p.email as patient_email,
         CASE 
           WHEN a.status = 'aceptada' THEN '🟢 Aceptada'
           WHEN a.status = 'confirmada' THEN '🔵 Confirmada'
           WHEN a.status = 'planificada' THEN '⚪ Planificada'
           WHEN a.status = 'anulada' THEN '🔴 Anulada'
         END as status_label,
         CASE 
           WHEN a.appointment_date < NOW() THEN 'Pasada'
           WHEN a.appointment_date > NOW() THEN 'Futura'
           ELSE 'Hoy'
         END as time_status,
         CASE 
           WHEN a.status IN ('confirmada', 'aceptada') THEN true
           ELSE false
         END as show_in_agenda
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       ${whereClause}
       ORDER BY a.start_time ASC`,
      params
    );
    
    // Obtener estadísticas del día
    const statsQuery = await databaseService.query(
      `SELECT 
         COUNT(*) as total_citas,
         COUNT(CASE WHEN status = 'aceptada' THEN 1 END) as aceptadas,
         COUNT(CASE WHEN status = 'confirmada' THEN 1 END) as confirmadas,
         COUNT(CASE WHEN status = 'planificada' THEN 1 END) as planificadas,
         COUNT(CASE WHEN status = 'anulada' THEN 1 END) as anuladas
       FROM appointments a
       ${whereClause.replace('a.', '')}`,
      params.slice(0, params.length - (includeAnuladas ? 1 : 1))
    );
    
    const stats = statsQuery.rows[0];
    
    res.json({
      success: true,
      data: {
        date: today.toISOString().split('T')[0],
        appointments: appointmentsQuery.rows,
        summary: {
          total: parseInt(stats.total_citas),
          accepted: parseInt(stats.aceptadas),
          confirmed: parseInt(stats.confirmadas),
          planned: parseInt(stats.planificadas),
          cancelled: parseInt(stats.anuladas),
          showInAgenda: parseInt(stats.aceptadas) + parseInt(stats.confirmadas)
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener citas del día: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener citas del día',
      message: 'No se pudieron cargar las citas de hoy'
    });
  }
}

// ==============================================
// CONTROLADOR DE TODAS LAS CITAS
// ==============================================

/**
 * Obtener todas las citas con filtros y paginación
 * GET /api/agenda/appointments
 */
async function getAppointments(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      dateFrom,
      dateTo,
      status,
      patientId,
      treatmentType,
      search
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    // Filtros
    if (dateFrom) {
      whereConditions.push(`a.appointment_date >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }
    
    if (dateTo) {
      whereConditions.push(`a.appointment_date <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`a.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (patientId) {
      whereConditions.push(`a.patient_id = $${paramIndex}`);
      queryParams.push(patientId);
      paramIndex++;
    }
    
    if (treatmentType) {
      whereConditions.push(`a.treatment_type = $${paramIndex}`);
      queryParams.push(treatmentType);
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(p.name ILIKE $${paramIndex} OR a.notes ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Consulta principal
    const appointmentsQuery = await databaseService.query(
      `SELECT 
         a.id, a.appointment_date, a.start_time, a.end_time,
         a.status, a.treatment_type, a.notes, a.created_at, a.updated_at,
         p.id as patient_id, p.name as patient_name, p.phone as patient_phone,
         p.email as patient_email,
         CASE 
           WHEN a.status = 'aceptada' THEN '🟢 Aceptada'
           WHEN a.status = 'confirmada' THEN '🔵 Confirmada'
           WHEN a.status = 'planificada' THEN '⚪ Planificada'
           WHEN a.status = 'anulada' THEN '🔴 Anulada'
         END as status_label,
         CASE 
           WHEN a.appointment_date < NOW() THEN 'Pasada'
           WHEN a.appointment_date > NOW() THEN 'Futura'
           ELSE 'Hoy'
         END as time_status,
         CASE 
           WHEN a.status IN ('confirmada', 'aceptada') THEN true
           ELSE false
         END as show_in_agenda
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       ${whereClause}
       ORDER BY a.appointment_date DESC, a.start_time DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );
    
    // Contar total
    const countQuery = await databaseService.query(
      `SELECT COUNT(*) as total
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       ${whereClause}`,
      queryParams
    );
    
    const total = parseInt(countQuery.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data: {
        appointments: appointmentsQuery.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: {
          dateFrom,
          dateTo,
          status,
          patientId,
          treatmentType,
          search
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener citas: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener citas',
      message: 'No se pudieron cargar las citas'
    });
  }
}

// ==============================================
// CONTROLADOR DE CREACIÓN DE CITAS
// ==============================================

/**
 * Crear nueva cita
 * POST /api/agenda/appointments
 */
async function createAppointment(req, res) {
  try {
    const {
      patientId,
      appointmentDate,
      startTime,
      endTime,
      treatmentType,
      notes,
      status = 'planificada'
    } = req.body;
    
    // Verificar permisos
    if (!hasPermission(req.user, 'appointments.create')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para crear citas'
      });
    }
    
    // Validar fecha
    const date = new Date(appointmentDate);
    if (date < new Date()) {
      return res.status(400).json({
        error: 'Fecha inválida',
        message: 'No se pueden crear citas en fechas pasadas'
      });
    }
    
    // Verificar conflictos de horario
    const conflicts = await getScheduleConflicts(date, startTime, endTime);
    if (conflicts.length > 0) {
      return res.status(409).json({
        error: 'Conflicto de horario',
        message: 'Ya existe una cita programada en ese horario',
        conflicts: conflicts
      });
    }
    
    // Obtener datos del paciente
    const patientQuery = await databaseService.query(
      'SELECT name, phone, email FROM patients WHERE id = $1',
      [patientId]
    );
    
    if (patientQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'No se encontró el paciente especificado'
      });
    }
    
    const patient = patientQuery.rows[0];
    
    // Validar transición de estado inicial
    if (!validateStateTransition('planificada', status)) {
      return res.status(400).json({
        error: 'Estado inválido',
        message: 'La cita debe iniciarse en estado "planificada"'
      });
    }
    
    // Crear cita en base de datos
    const newAppointment = await databaseService.query(
      `INSERT INTO appointments (
         patient_id, appointment_date, start_time, end_time,
         treatment_type, notes, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [patientId, date, startTime, endTime, treatmentType, notes, status]
    );
    
    const appointment = newAppointment.rows[0];
    
    // Sincronizar con SQL Server
    await syncWithSQLServer({
      ...appointment,
      patient_name: patient.name
    }, 'create');
    
    // Ejecutar automatizaciones iniciales si aplica
    const initialAutomations = getStateAutomations(status);
    for (const automation of initialAutomations) {
      try {
        await automationService.executeAutomation(appointment.id, automation);
      } catch (automationError) {
        logger.warn(`Error en automatización ${automation} para cita ${appointment.id}: ${automationError.message}`);
      }
    }
    
    logger.info(`Nueva cita creada: ${appointment.id} para paciente ${patient.name}`);
    
    res.status(201).json({
      success: true,
      message: 'Cita creada correctamente',
      data: {
        appointment: {
          ...appointment,
          patient_name: patient.name,
          patient_phone: patient.phone,
          patient_email: patient.email
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al crear cita: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al crear cita',
      message: 'No se pudo crear la cita'
    });
  }
}

// ==============================================
// CONTROLADOR DE ACTUALIZACIÓN DE CITAS
// ==============================================

/**
 * Actualizar cita existente
 * PUT /api/agenda/appointments/:id
 */
async function updateAppointment(req, res) {
  try {
    const { id: appointmentId } = req.params;
    const {
      appointmentDate,
      startTime,
      endTime,
      treatmentType,
      notes,
      status
    } = req.body;
    
    // Verificar permisos
    if (!hasPermission(req.user, 'appointments.update')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para actualizar citas'
      });
    }
    
    // Verificar que la cita existe
    const existingAppointmentQuery = await databaseService.query(
      'SELECT * FROM appointments WHERE id = $1',
      [appointmentId]
    );
    
    if (existingAppointmentQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada',
        message: 'No se encontró la cita especificada'
      });
    }
    
    const existingAppointment = existingAppointmentQuery.rows[0];
    
    // Validar transición de estado si se cambia
    if (status && status !== existingAppointment.status) {
      if (!validateStateTransition(existingAppointment.status, status)) {
        return res.status(400).json({
          error: 'Transición de estado inválida',
          message: `No se puede cambiar de "${existingAppointment.status}" a "${status}"`
        });
      }
    }
    
    // Verificar conflictos de horario si se cambian fecha/hora
    if (appointmentDate || startTime || endTime) {
      const date = new Date(appointmentDate || existingAppointment.appointment_date);
      const start = startTime || existingAppointment.start_time;
      const end = endTime || existingAppointment.end_time;
      
      const conflicts = await getScheduleConflicts(date, start, end, appointmentId);
      if (conflicts.length > 0) {
        return res.status(409).json({
          error: 'Conflicto de horario',
          message: 'Ya existe una cita programada en ese horario',
          conflicts: conflicts
        });
      }
    }
    
    // Preparar datos de actualización
    const updateData = {
      appointment_date: appointmentDate || existingAppointment.appointment_date,
      start_time: startTime || existingAppointment.start_time,
      end_time: endTime || existingAppointment.end_time,
      treatment_type: treatmentType || existingAppointment.treatment_type,
      notes: notes !== undefined ? notes : existingAppointment.notes,
      status: status || existingAppointment.status,
      updated_at: new Date()
    };
    
    // Actualizar cita
    const updatedAppointmentQuery = await databaseService.query(
      `UPDATE appointments 
       SET appointment_date = $1, start_time = $2, end_time = $3,
           treatment_type = $4, notes = $5, status = $6, updated_at = $7
       WHERE id = $8
       RETURNING *`,
      [
        updateData.appointment_date, updateData.start_time, updateData.end_time,
        updateData.treatment_type, updateData.notes, updateData.status,
        updateData.updated_at, appointmentId
      ]
    );
    
    const updatedAppointment = updatedAppointmentQuery.rows[0];
    
    // Obtener datos del paciente para sincronización
    const patientQuery = await databaseService.query(
      'SELECT name FROM patients WHERE id = $1',
      [updatedAppointment.patient_id]
    );
    
    const patient = patientQuery.rows[0];
    
    // Sincronizar con SQL Server
    await syncWithSQLServer({
      ...updatedAppointment,
      patient_name: patient.name
    }, 'update');
    
    // Ejecutar automatizaciones si cambió el estado
    if (status && status !== existingAppointment.status) {
      const newAutomations = getStateAutomations(status);
      for (const automation of newAutomations) {
        try {
          await automationService.executeAutomation(updatedAppointment.id, automation);
        } catch (automationError) {
          logger.warn(`Error en automatización ${automation} para cita ${updatedAppointment.id}: ${automationError.message}`);
        }
      }
    }
    
    logger.info(`Cita actualizada: ${appointmentId} por usuario ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Cita actualizada correctamente',
      data: {
        appointment: {
          ...updatedAppointment,
          patient_name: patient.name
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al actualizar cita: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al actualizar cita',
      message: 'No se pudo actualizar la cita'
    });
  }
}

// ==============================================
// CONTROLADOR DE CAMBIO DE ESTADO
// ==============================================

/**
 * Cambiar estado de cita
 * PATCH /api/agenda/appointments/:id/status
 */
async function changeStatus(req, res) {
  try {
    const { id: appointmentId } = req.params;
    const { status, reason } = req.body;
    
    // Verificar permisos
    if (!hasPermission(req.user, 'appointments.update')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para cambiar el estado de citas'
      });
    }
    
    // Obtener cita actual
    const appointmentQuery = await databaseService.query(
      'SELECT * FROM appointments WHERE id = $1',
      [appointmentId]
    );
    
    if (appointmentQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada',
        message: 'No se encontró la cita especificada'
      });
    }
    
    const appointment = appointmentQuery.rows[0];
    
    // Validar transición
    if (!validateStateTransition(appointment.status, status)) {
      return res.status(400).json({
        error: 'Transición de estado inválida',
        message: `No se puede cambiar de "${appointment.status}" a "${status}"`
      });
    }
    
    // Actualizar estado
    await databaseService.query(
      'UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, appointmentId]
    );
    
    // Registrar cambio de estado
    await databaseService.query(
      `INSERT INTO appointment_state_changes (appointment_id, old_status, new_status, 
                                            changed_by, reason, changed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [appointmentId, appointment.status, status, req.user.id, reason || 'Cambio manual']
    );
    
    // Obtener datos actualizados
    const updatedAppointmentQuery = await databaseService.query(
      `SELECT a.*, p.name as patient_name 
       FROM appointments a 
       JOIN patients p ON a.patient_id = p.id 
       WHERE a.id = $1`,
      [appointmentId]
    );
    
    const updatedAppointment = updatedAppointmentQuery.rows[0];
    
    // Sincronizar con SQL Server
    await syncWithSQLServer(updatedAppointment, 'update');
    
    // Ejecutar automatizaciones para nuevo estado
    const newAutomations = getStateAutomations(status);
    for (const automation of newAutomations) {
      try {
        await automationService.executeAutomation(appointmentId, automation);
      } catch (automationError) {
        logger.warn(`Error en automatización ${automation} para cita ${appointmentId}: ${automationError.message}`);
      }
    }
    
    logger.info(`Estado de cita ${appointmentId} cambiado de ${appointment.status} a ${status} por usuario ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Estado de cita actualizado correctamente',
      data: {
        appointmentId,
        oldStatus: appointment.status,
        newStatus: status,
        reason: reason || 'Cambio manual',
        automationsTriggered: newAutomations
      }
    });
    
  } catch (error) {
    logger.error(`Error al cambiar estado: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al cambiar estado',
      message: 'No se pudo cambiar el estado de la cita'
    });
  }
}

// ==============================================
// CONTROLADOR DE SINCRONIZACIÓN SQL SERVER
// ==============================================

/**
 * Sincronizar agenda completa con SQL Server
 * POST /api/agenda/sync/sqlserver
 */
async function syncWithSQLServer(req, res) {
  try {
    // Verificar permisos de administrador
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'Solo los administradores pueden sincronizar con SQL Server'
      });
    }
    
    logger.info(`Iniciando sincronización con SQL Server por usuario ${req.user.id}`);
    
    // Obtener todas las citas
    const appointmentsQuery = await databaseService.query(
      `SELECT a.*, p.name as patient_name 
       FROM appointments a 
       JOIN patients p ON a.patient_id = p.id
       ORDER BY a.appointment_date ASC`
    );
    
    const appointments = appointmentsQuery.rows;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Sincronizar cada cita
    for (const appointment of appointments) {
      try {
        await syncWithSQLServer(appointment, 'update');
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          appointmentId: appointment.id,
          error: error.message
        });
      }
    }
    
    logger.info(`Sincronización completada: ${successCount} exitosas, ${errorCount} errores`);
    
    res.json({
      success: true,
      message: 'Sincronización con SQL Server completada',
      data: {
        total: appointments.length,
        successful: successCount,
        errors: errorCount,
        errorDetails: errors.slice(0, 10) // Primeros 10 errores
      }
    });
    
  } catch (error) {
    logger.error(`Error en sincronización: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error en sincronización',
      message: 'No se pudo sincronizar con SQL Server'
    });
  }
}

// ==============================================
// CONTROLADOR DE CANCELACIÓN DE CITAS
// ==============================================

/**
 * Cancelar cita
 * DELETE /api/agenda/appointments/:id
 */
async function cancelAppointment(req, res) {
  try {
    const { id: appointmentId } = req.params;
    const { reason } = req.body;
    
    // Verificar permisos
    if (!hasPermission(req.user, 'appointments.delete')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para cancelar citas'
      });
    }
    
    // Verificar que la cita existe
    const appointmentQuery = await databaseService.query(
      'SELECT * FROM appointments WHERE id = $1',
      [appointmentId]
    );
    
    if (appointmentQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada',
        message: 'No se encontró la cita especificada'
      });
    }
    
    const appointment = appointmentQuery.rows[0];
    
    // Cambiar estado a anulada
    await databaseService.query(
      'UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2',
      ['anulada', appointmentId]
    );
    
    // Registrar cancelación
    await databaseService.query(
      `INSERT INTO appointment_cancellations (appointment_id, cancelled_by, reason, cancelled_at)
       VALUES ($1, $2, $3, NOW())`,
      [appointmentId, req.user.id, reason || 'Cancelación manual']
    );
    
    // Obtener datos actualizados para sincronización
    const updatedAppointmentQuery = await databaseService.query(
      `SELECT a.*, p.name as patient_name 
       FROM appointments a 
       JOIN patients p ON a.patient_id = p.id 
       WHERE a.id = $1`,
      [appointmentId]
    );
    
    const updatedAppointment = updatedAppointmentQuery.rows[0];
    
    // Sincronizar con SQL Server
    await syncWithSQLServer(updatedAppointment, 'update');
    
    logger.info(`Cita ${appointmentId} cancelada por usuario ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Cita cancelada correctamente',
      data: {
        appointmentId,
        reason: reason || 'Cancelación manual',
        cancelledAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error(`Error al cancelar cita: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al cancelar cita',
      message: 'No se pudo cancelar la cita'
    });
  }
}

// ==============================================
// EXPORTACIÓN DE FUNCIONES
// ==============================================

module.exports = {
  // Controladores principales
  getTodayAppointments,
  getAppointments,
  createAppointment,
  updateAppointment,
  changeStatus,
  syncWithSQLServer,
  cancelAppointment,
  
  // Funciones auxiliares
  validateStateTransition,
  getStateAutomations,
  syncWithSQLServer,
  getScheduleConflicts,
  
  // Configuraciones
  APPOINTMENT_STATES
};
