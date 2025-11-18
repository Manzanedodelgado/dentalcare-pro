/**
 * CONTROLADOR DE AUTOMATIZACIONES INTELIGENTES
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Automatización de recordatorios de citas (24h y 2h antes)
 * - Envío automático de consentimientos informados
 * - Cuestionarios de primera cita con LOPD
 * - Flujos de automatización condicionales
 * - Programación inteligente de envíos
 * - Validación legal automática
 * - Estados de cita vinculados a automatizaciones
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const databaseService = require('../utils/databaseService');
const whatsappService = require('../utils/whatsappService');
const legalService = require('../utils/legalService');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');
const { scheduleJob, cancelJob } = require('../utils/scheduler');

// ==============================================
// CONFIGURACIÓN DE AUTOMATIZACIONES
// ==============================================

const AUTOMATION_TYPES = {
  REMINDER_24H: {
    id: 'reminder_24h',
    name: 'Recordatorio 24 horas',
    description: 'Recordatorio de cita 24 horas antes',
    trigger: 'appointment_24h_before',
    enabled: true
  },
  REMINDER_2H: {
    id: 'reminder_2h',
    name: 'Recordatorio 2 horas',
    description: 'Recordatorio de cita 2 horas antes',
    trigger: 'appointment_2h_before',
    enabled: true
  },
  CONSENT_SEND: {
    id: 'consent_send',
    name: 'Envío de consentimiento',
    description: 'Envío automático de consentimiento informado',
    trigger: 'appointment_confirmed',
    enabled: true
  },
  QUESTIONNAIRE_SEND: {
    id: 'questionnaire_send',
    name: 'Cuestionario primera cita',
    description: 'Cuestionario de primera visita con LOPD',
    trigger: 'appointment_accepted',
    enabled: true
  },
  FOLLOW_UP: {
    id: 'follow_up',
    name: 'Seguimiento post-tratamiento',
    description: 'Mensaje de seguimiento después del tratamiento',
    trigger: 'treatment_completed',
    enabled: true
  }
};

const APPOINTMENT_STATES = {
  PLANIFICADA: {
    id: 'planificada',
    name: 'Planificada',
    color: 'gray',
    description: 'Borrador inicial pendiente de confirmación',
    automations: []
  },
  CONFIRMADA: {
    id: 'confirmada',
    name: 'Confirmada',
    color: 'blue',
    description: 'Confirmada por paciente, pendiente de consentimiento LOPD',
    automations: ['consent_send']
  },
  ACEPTADA: {
    id: 'aceptada',
    name: 'Aceptada',
    color: 'green',
    description: 'Confirmada + documentos LOPD + cuestionario completo',
    automations: ['reminder_24h', 'reminder_2h', 'questionnaire_send']
  },
  ANULADA: {
    id: 'anulada',
    name: 'Anulada',
    color: 'red',
    description: 'Cancelada por paciente o clínica',
    automations: []
  }
};

// ==============================================
// FUNCIONES AUXILIARES
// ==============================================

/**
 * Obtener configuración de automatización
 * @param {string} type - Tipo de automatización
 * @returns {Object} Configuración
 */
async function getAutomationConfig(type) {
  try {
    const configQuery = await databaseService.query(
      'SELECT * FROM automation_config WHERE type = $1 AND enabled = true',
      [type]
    );
    
    return configQuery.rows[0] || null;
  } catch (error) {
    logger.error(`Error al obtener configuración de automatización: ${error.message}`);
    return null;
  }
}

/**
 * Programar automatización para cita específica
 * @param {string} appointmentId - ID de la cita
 * @param {string} automationType - Tipo de automatización
 * @param {Date} scheduleTime - Tiempo de ejecución
 * @param {Object} data - Datos adicionales
 */
async function scheduleAutomation(appointmentId, automationType, scheduleTime, data) {
  try {
    const jobId = `${automationType}_${appointmentId}_${Date.now()}`;
    
    // Crear job programado
    await scheduleJob(jobId, scheduleTime, async () => {
      await executeAutomation(appointmentId, automationType, data);
    });
    
    // Guardar en base de datos
    await databaseService.query(
      `INSERT INTO scheduled_automations (id, appointment_id, type, schedule_time, 
                                         data, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'scheduled', NOW())`,
      [jobId, appointmentId, automationType, scheduleTime, JSON.stringify(data)]
    );
    
    logger.info(`Automatización ${automationType} programada para cita ${appointmentId} en ${scheduleTime}`);
    
  } catch (error) {
    logger.error(`Error al programar automatización: ${error.message}`);
    throw error;
  }
}

/**
 * Ejecutar automatización específica
 * @param {string} appointmentId - ID de la cita
 * @param {string} automationType - Tipo de automatización
 * @param {Object} data - Datos adicionales
 */
async function executeAutomation(appointmentId, automationType, data = {}) {
  try {
    logger.info(`Ejecutando automatización ${automationType} para cita ${appointmentId}`);
    
    // Obtener datos de la cita
    const appointmentQuery = await databaseService.query(
      `SELECT a.*, p.name as patient_name, p.phone as patient_phone, p.email as patient_email
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.id = $1`,
      [appointmentId]
    );
    
    if (appointmentQuery.rows.length === 0) {
      throw new Error(`Cita ${appointmentId} no encontrada`);
    }
    
    const appointment = appointmentQuery.rows[0];
    let result;
    
    switch (automationType) {
      case 'reminder_24h':
        result = await sendAppointmentReminder(appointment, '24h');
        break;
      case 'reminder_2h':
        result = await sendAppointmentReminder(appointment, '2h');
        break;
      case 'consent_send':
        result = await sendConsentDocument(appointment);
        break;
      case 'questionnaire_send':
        result = await sendFirstVisitQuestionnaire(appointment);
        break;
      case 'follow_up':
        result = await sendFollowUpMessage(appointment);
        break;
      default:
        throw new Error(`Tipo de automatización desconocido: ${automationType}`);
    }
    
    // Actualizar estado del job
    await databaseService.query(
      `UPDATE scheduled_automations 
       SET status = 'executed', executed_at = NOW(), result = $1
       WHERE appointment_id = $2 AND type = $3`,
      [JSON.stringify(result), appointmentId, automationType]
    );
    
    // Registrar log de ejecución
    await databaseService.query(
      `INSERT INTO automation_logs (appointment_id, type, status, message, data, timestamp)
       VALUES ($1, $2, 'success', $3, $4, NOW())`,
      [appointmentId, automationType, result.message, JSON.stringify(data)]
    );
    
    logger.info(`Automatización ${automationType} ejecutada exitosamente para cita ${appointmentId}`);
    
    return result;
    
  } catch (error) {
    logger.error(`Error al ejecutar automatización ${automationType}: ${error.message}`, { stack: error.stack });
    
    // Actualizar estado del job como fallido
    await databaseService.query(
      `UPDATE scheduled_automations 
       SET status = 'failed', error_message = $1
       WHERE appointment_id = $2 AND type = $3`,
      [error.message, appointmentId, automationType]
    );
    
    // Registrar log de error
    await databaseService.query(
      `INSERT INTO automation_logs (appointment_id, type, status, message, error, timestamp)
       VALUES ($1, $2, 'error', $3, $4, NOW())`,
      [appointmentId, automationType, 'Error en automatización', error.message]
    );
    
    throw error;
  }
}

// ==============================================
// AUTOMATIZACIÓN DE RECORDATORIOS
// ==============================================

/**
 * Enviar recordatorio de cita
 * @param {Object} appointment - Datos de la cita
 * @param {string} timeframe - '24h' o '2h'
 */
async function sendAppointmentReminder(appointment, timeframe) {
  try {
    const appointmentDate = new Date(appointment.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = appointmentDate.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let message;
    
    if (timeframe === '24h') {
      message = `🏥 RECORDATORIO DE CITA - 24 HORAS\n\n` +
                `Hola ${appointment.patient_name},\n\n` +
                `Te recordamos que tienes una cita programada para:\n` +
                `📅 Fecha: ${formattedDate}\n` +
                `🕐 Hora: ${formattedTime}\n` +
                `🏢 Clínica Dental Rubio García\n\n` +
                `Por favor, confirma tu asistencia respondiendo:\n` +
                `✅ SI - para confirmar\n` +
                `❌ NO - para anular\n\n` +
                `Si tienes alguna duda, contáctanos al 34664218253\n\n` +
                `¡Nos vemos pronto! 😊`;
    } else {
      message = `⏰ RECORDATORIO DE CITA - 2 HORAS\n\n` +
                `Hola ${appointment.patient_name},\n\n` +
                `Tu cita es en aproximadamente 2 horas:\n` +
                `🕐 Hora: ${formattedTime}\n` +
                `📍 Dirección: Clínica Dental Rubio García\n\n` +
                `Por favor, llega 10 minutos antes.\n\n` +
                `Si tienes alguna duda, contáctanos: 34664218253\n\n` +
                `¡Te esperamos! 🦷`;
    }
    
    // Enviar mensaje por WhatsApp
    const whatsappResult = await whatsappService.sendMessage(
      appointment.patient_phone,
      message
    );
    
    if (!whatsappResult.success) {
      // Fallback a email
      if (appointment.patient_email) {
        await emailService.sendAppointmentReminder(
          appointment.patient_email,
          appointment.patient_name,
          appointmentDate,
          timeframe
        );
      }
    }
    
    return {
      success: true,
      message: `Recordatorio ${timeframe} enviado correctamente`,
      method: whatsappResult.success ? 'whatsapp' : 'email'
    };
    
  } catch (error) {
    logger.error(`Error al enviar recordatorio: ${error.message}`);
    throw error;
  }
}

// ==============================================
// AUTOMATIZACIÓN DE CONSENTIMIENTOS
// ==============================================

/**
 * Enviar documento de consentimiento informado
 * @param {Object} appointment - Datos de la cita
 */
async function sendConsentDocument(appointment) {
  try {
    // Obtener template de consentimiento según el tratamiento
    const consentTemplate = await legalService.getConsentTemplate(
      appointment.treatment_type || 'general'
    );
    
    if (!consentTemplate) {
      throw new Error('Template de consentimiento no encontrado');
    }
    
    // Generar documento personalizado
    const document = await legalService.generateConsentDocument({
      patientId: appointment.patient_id,
      patientName: appointment.patient_name,
      treatment: appointment.treatment_type || 'Tratamiento dental general',
      appointmentDate: appointment.appointment_date,
      template: consentTemplate
    });
    
    // Enviar por WhatsApp con PDF adjunto
    const whatsappMessage = `📋 CONSENTIMIENTO INFORMADO\n\n` +
                           `Hola ${appointment.patient_name},\n\n` +
                           `Adjunto encontrarás el documento de consentimiento informado ` +
                           `para tu tratamiento de ${appointment.treatment_type || 'dental'}.\n\n` +
                           `Es importante que lo leas y aceptes antes de tu cita.\n\n` +
                           `¿Has recibido y leído el documento?\n` +
                           `Responde SÍ para confirmar tu aceptación.\n\n` +
                           `Gracias por tu colaboración. 😊`;
    
    const whatsappResult = await whatsappService.sendMessage(
      appointment.patient_phone,
      whatsappMessage
    );
    
    // Intentar enviar el PDF (si el servicio lo soporta)
    try {
      await whatsappService.sendDocument(
        appointment.patient_phone,
        document.path,
        document.name
      );
    } catch (pdfError) {
      logger.warn(`No se pudo enviar PDF por WhatsApp: ${pdfError.message}`);
    }
    
    // Registrar envío en base de datos
    await databaseService.query(
      `INSERT INTO legal_document_sends (patient_id, appointment_id, document_type, 
                                       method, sent_at, status)
       VALUES ($1, $2, 'consent_informed', 'whatsapp', NOW(), 'sent')`,
      [appointment.patient_id, appointment.id]
    );
    
    return {
      success: true,
      message: 'Consentimiento informado enviado correctamente',
      documentId: document.id,
      method: 'whatsapp'
    };
    
  } catch (error) {
    logger.error(`Error al enviar consentimiento: ${error.message}`);
    throw error;
  }
}

// ==============================================
// AUTOMATIZACIÓN DE CUESTIONARIOS
// ==============================================

/**
 * Enviar cuestionario de primera visita con LOPD
 * @param {Object} appointment - Datos de la cita
 */
async function sendFirstVisitQuestionnaire(appointment) {
  try {
    // Verificar si es primera visita
    const previousVisits = await databaseService.query(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE patient_id = $1 AND status != 'anulada'`,
      [appointment.patient_id]
    );
    
    const isFirstVisit = parseInt(previousVisits.rows[0].count) <= 1;
    
    if (!isFirstVisit) {
      return {
        success: false,
        message: 'No es primera visita, omitiendo cuestionario'
      };
    }
    
    // Obtener cuestionario LOPD
    const questionnaire = await legalService.getLOPDQuestionnaire();
    
    // Crear cuestionario personalizado para el paciente
    const personalizedQuestionnaire = await legalService.generatePersonalizedQuestionnaire({
      patientId: appointment.patient_id,
      patientName: appointment.patient_name,
      questionnaire: questionnaire,
      treatmentType: appointment.treatment_type
    });
    
    // Enviar cuestionario por WhatsApp
    const whatsappMessage = `📝 CUESTIONARIO PRIMERA VISITA + LOPD\n\n` +
                           `Hola ${appointment.patient_name},\n\n` +
                           `Para completar tu registro como paciente nuevo, ` +
                           `necesitamos que respondas este cuestionario:\n\n` +
                           `🔗 ENLACE: [LINK_TO_QUESTIONNAIRE]\n\n` +
                           `Este cuestionario incluye:\n` +
                           `• Datos personales y médicos\n` +
                           `• Cuestionario de salud dental\n` +
                           `• Consentimiento LOPD/RGPD\n\n` +
                           `Es obligatorio completarlo antes de tu cita.\n\n` +
                           `¿Tienes alguna pregunta? 34664218253`;
    
    const whatsappResult = await whatsappService.sendMessage(
      appointment.patient_phone,
      whatsappMessage
    );
    
    // Enviar enlace por email si es posible
    if (appointment.patient_email) {
      await emailService.sendQuestionnaireLink(
        appointment.patient_email,
        appointment.patient_name,
        personalizedQuestionnaire.link
      );
    }
    
    // Programar recordatorio del cuestionario en 2 días si no se completa
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 2);
    
    await scheduleJob(
      `questionnaire_reminder_${appointment.id}`,
      reminderDate,
      async () => {
        await sendQuestionnaireReminder(appointment, personalizedQuestionnaire);
      }
    );
    
    // Registrar envío
    await databaseService.query(
      `INSERT INTO questionnaire_sends (patient_id, appointment_id, questionnaire_type, 
                                      method, sent_at, status)
       VALUES ($1, $2, 'first_visit_lopd', 'whatsapp', NOW(), 'sent')`,
      [appointment.patient_id, appointment.id]
    );
    
    return {
      success: true,
      message: 'Cuestionario de primera visita enviado correctamente',
      questionnaireId: personalizedQuestionnaire.id,
      method: 'whatsapp',
      isFirstVisit: true
    };
    
  } catch (error) {
    logger.error(`Error al enviar cuestionario: ${error.message}`);
    throw error;
  }
}

// ==============================================
// AUTOMATIZACIÓN DE SEGUIMIENTO
// ==============================================

/**
 * Enviar mensaje de seguimiento post-tratamiento
 * @param {Object} appointment - Datos de la cita
 */
async function sendFollowUpMessage(appointment) {
  try {
    const message = `🦷 SEGUIMIENTO POST-TRATAMIENTO\n\n` +
                   `Hola ${appointment.patient_name},\n\n` +
                   `Esperamos que tu tratamiento haya ido muy bien.\n\n` +
                   `¿Cómo te encuentras después de tu visita?\n\n` +
                   `• ¿Tienes alguna molestia?\n` +
                   `• ¿Las indicaciones se han seguido correctamente?\n\n` +
                   `Si tienes cualquier duda o necesitas ayuda, no dudes en contactarnos:\n` +
                   `📞 34664218253\n` +
                   `💬 WhatsApp\n\n` +
                   `¡Gracias por confiar en nosotros! 😊`;
    
    const whatsappResult = await whatsappService.sendMessage(
      appointment.patient_phone,
      message
    );
    
    return {
      success: true,
      message: 'Mensaje de seguimiento enviado correctamente',
      method: 'whatsapp'
    };
    
  } catch (error) {
    logger.error(`Error al enviar seguimiento: ${error.message}`);
    throw error;
  }
}

// ==============================================
// CONTROLADORES DE API
// ==============================================

/**
 * Obtener configuraciones de automatización
 * GET /api/automation/config
 */
async function getConfig(req, res) {
  try {
    const configQuery = await databaseService.query(
      'SELECT * FROM automation_config ORDER BY type'
    );
    
    res.json({
      success: true,
      data: {
        configurations: configQuery.rows,
        availableTypes: AUTOMATION_TYPES,
        appointmentStates: APPOINTMENT_STATES
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener configuración: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener configuración',
      message: 'No se pudo cargar la configuración de automatizaciones'
    });
  }
}

/**
 * Actualizar configuración de automatización
 * PUT /api/automation/config
 */
async function updateConfig(req, res) {
  try {
    const { automationId, enabled, settings } = req.body;
    const userId = req.user.id;
    
    // Actualizar configuración
    await databaseService.query(
      `UPDATE automation_config 
       SET enabled = $1, settings = $2, updated_by = $3, updated_at = NOW()
       WHERE id = $4`,
      [enabled, JSON.stringify(settings), userId, automationId]
    );
    
    logger.info(`Configuración de automatización ${automationId} actualizada por usuario ${userId}`);
    
    res.json({
      success: true,
      message: 'Configuración actualizada correctamente'
    });
    
  } catch (error) {
    logger.error(`Error al actualizar configuración: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al actualizar configuración',
      message: 'No se pudo actualizar la configuración'
    });
  }
}

/**
 * Ejecutar recordatorio manual
 * POST /api/automation/reminders/execute
 */
async function executeReminder(req, res) {
  try {
    const { appointmentId, type } = req.body;
    
    // Obtener datos de la cita
    const appointmentQuery = await databaseService.query(
      `SELECT a.*, p.name as patient_name, p.phone as patient_phone
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.id = $1`,
      [appointmentId]
    );
    
    if (appointmentQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada',
        message: 'No se encontró la cita especificada'
      });
    }
    
    const appointment = appointmentQuery.rows[0];
    
    // Ejecutar recordatorio
    const result = await executeAutomation(appointmentId, `reminder_${type}`);
    
    res.json({
      success: true,
      message: 'Recordatorio ejecutado correctamente',
      data: result
    });
    
  } catch (error) {
    logger.error(`Error al ejecutar recordatorio: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al ejecutar recordatorio',
      message: 'No se pudo ejecutar el recordatorio'
    });
  }
}

/**
 * Programar recordatorio automático
 * POST /api/automation/reminders/schedule
 */
async function scheduleReminder(req, res) {
  try {
    const { appointmentId, type, scheduleTime } = req.body;
    
    // Verificar que la cita existe
    const appointmentQuery = await databaseService.query(
      'SELECT id FROM appointments WHERE id = $1',
      [appointmentId]
    );
    
    if (appointmentQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada',
        message: 'No se encontró la cita especificada'
      });
    }
    
    // Programar recordatorio
    await scheduleAutomation(
      appointmentId,
      `reminder_${type}`,
      new Date(scheduleTime),
      { manuallyScheduled: true }
    );
    
    res.json({
      success: true,
      message: 'Recordatorio programado correctamente',
      data: {
        appointmentId,
        type,
        scheduleTime
      }
    });
    
  } catch (error) {
    logger.error(`Error al programar recordatorio: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al programar recordatorio',
      message: 'No se pudo programar el recordatorio'
    });
  }
}

/**
 * Obtener automatizaciones activas
 * GET /api/automation/active
 */
async function getActiveAutomations(req, res) {
  try {
    const automationsQuery = await databaseService.query(
      `SELECT sa.*, a.appointment_date, a.treatment_type, 
              p.name as patient_name, p.phone as patient_phone
       FROM scheduled_automations sa
       JOIN appointments a ON sa.appointment_id = a.id
       JOIN patients p ON a.patient_id = p.id
       WHERE sa.status = 'scheduled' AND sa.schedule_time > NOW()
       ORDER BY sa.schedule_time ASC`
    );
    
    res.json({
      success: true,
      data: {
        activeAutomations: automationsQuery.rows
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener automatizaciones activas: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener automatizaciones',
      message: 'No se pudieron cargar las automatizaciones activas'
    });
  }
}

/**
 * Ejecutar envío de consentimiento
 * POST /api/automation/consent/send
 */
async function sendConsent(req, res) {
  try {
    const { appointmentId } = req.body;
    
    const result = await executeAutomation(appointmentId, 'consent_send');
    
    res.json({
      success: true,
      message: 'Consentimiento enviado correctamente',
      data: result
    });
    
  } catch (error) {
    logger.error(`Error al enviar consentimiento: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al enviar consentimiento',
      message: 'No se pudo enviar el consentimiento'
    });
  }
}

/**
 * Obtener estado de automatizaciones
 * GET /api/automation/status
 */
async function getAutomationStatus(req, res) {
  try {
    const statusQuery = await databaseService.query(
      `SELECT 
         type,
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
         COUNT(CASE WHEN status = 'executed' THEN 1 END) as executed,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
       FROM scheduled_automations
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY type`
    );
    
    res.json({
      success: true,
      data: {
        automationStatus: statusQuery.rows
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener estado: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener estado',
      message: 'No se pudo cargar el estado de automatizaciones'
    });
  }
}

/**
 * Activar/desactivar automatización específica
 * PATCH /api/automation/toggle/:id
 */
async function toggleAutomation(req, res) {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    await databaseService.query(
      `UPDATE automation_config 
       SET enabled = $1, updated_at = NOW()
       WHERE id = $2`,
      [enabled, id]
    );
    
    logger.info(`Automatización ${id} ${enabled ? 'activada' : 'desactivada'} por usuario ${req.user.id}`);
    
    res.json({
      success: true,
      message: `Automatización ${enabled ? 'activada' : 'desactivada'} correctamente`
    });
    
  } catch (error) {
    logger.error(`Error al cambiar estado: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al cambiar estado',
      message: 'No se pudo cambiar el estado de la automatización'
    });
  }
}

/**
 * Obtener logs de automatización
 * GET /api/automation/logs
 */
async function getAutomationLogs(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const logsQuery = await databaseService.query(
      `SELECT al.*, a.appointment_date, p.name as patient_name
       FROM automation_logs al
       JOIN appointments a ON al.appointment_id = a.id
       JOIN patients p ON a.patient_id = p.id
       ORDER BY al.timestamp DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    res.json({
      success: true,
      data: {
        logs: logsQuery.rows
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener logs: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener logs',
      message: 'No se pudieron cargar los logs de automatización'
    });
  }
}

/**
 * Ejecutar prueba de automatización
 * POST /api/automation/test
 */
async function testAutomation(req, res) {
  try {
    const { type, testData } = req.body;
    
    // Crear cita de prueba temporal
    const testAppointment = {
      id: 'test_' + Date.now(),
      patient_name: testData.patientName || 'Paciente de Prueba',
      patient_phone: testData.patientPhone || '+34664218253',
      appointment_date: new Date(),
      treatment_type: testData.treatmentType || 'Prueba'
    };
    
    let result;
    
    switch (type) {
      case 'reminder':
        result = await sendAppointmentReminder(testAppointment, 'test');
        break;
      case 'consent':
        result = await sendConsentDocument(testAppointment);
        break;
      case 'questionnaire':
        result = await sendFirstVisitQuestionnaire(testAppointment);
        break;
      default:
        return res.status(400).json({
          error: 'Tipo de prueba inválido',
          message: 'Tipos válidos: reminder, consent, questionnaire'
        });
    }
    
    logger.info(`Prueba de automatización ${type} ejecutada por usuario ${req.user.id}`);
    
    res.json({
      success: true,
      message: `Prueba de ${type} ejecutada correctamente`,
      data: {
        testResult: result,
        testData: testAppointment
      }
    });
    
  } catch (error) {
    logger.error(`Error en prueba de automatización: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error en prueba',
      message: 'No se pudo ejecutar la prueba de automatización'
    });
  }
}

// ==============================================
// EXPORTACIÓN DE FUNCIONES
// ==============================================

module.exports = {
  // Controladores principales
  getConfig,
  updateConfig,
  executeReminder,
  scheduleReminder,
  getActiveAutomations,
  sendConsent,
  getAutomationStatus,
  toggleAutomation,
  getAutomationLogs,
  testAutomation,
  
  // Funciones de automatización
  executeAutomation,
  scheduleAutomation,
  
  // Configuraciones
  AUTOMATION_TYPES,
  APPOINTMENT_STATES
};
