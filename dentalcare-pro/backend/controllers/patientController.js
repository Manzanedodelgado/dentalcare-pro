/**
 * CONTROLADOR DE GESTIÓN DE PACIENTES
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Gestión completa de base de datos de pacientes
 * - Historial médico y tratamientos
 * - Datos de contacto actualizados
 * - Gestión de consentimientos y cuestionarios
 * - Búsqueda y filtrado avanzado
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const { v4: uuidv4 } = require('uuid');
const databaseService = require('../utils/databaseService');
const legalService = require('./legalController');
const logger = require('../utils/logger');
const { hasPermission } = require('./authController');

// ==============================================
// FUNCIONES AUXILIARES
// ==============================================

/**
 * Generar ID único para paciente
 * @returns {string} UUID único
 */
function generatePatientId() {
  return uuidv4();
}

/**
 * Validar datos de paciente
 * @param {Object} patientData - Datos del paciente
 * @returns {Object} Datos validados
 */
function validatePatientData(patientData) {
  const validated = {
    name: patientData.name?.trim(),
    email: patientData.email?.toLowerCase().trim(),
    phone: patientData.phone?.trim(),
    address: patientData.address?.trim(),
    birthDate: patientData.birthDate ? new Date(patientData.birthDate) : null,
    gender: patientData.gender?.trim(),
    medicalHistory: patientData.medicalHistory?.trim(),
    allergies: patientData.allergies?.trim(),
    medications: patientData.medications?.trim(),
    emergencyContact: patientData.emergencyContact?.trim(),
    emergencyPhone: patientData.emergencyPhone?.trim(),
    insurance: patientData.insurance?.trim(),
    notes: patientData.notes?.trim()
  };

  // Validaciones básicas
  if (!validated.name || validated.name.length < 2) {
    throw new Error('El nombre debe tener al menos 2 caracteres');
  }

  if (validated.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validated.email)) {
    throw new Error('El email debe tener un formato válido');
  }

  if (validated.phone && !/^\+?[1-9]\d{1,14}$/.test(validated.phone.replace(/\s/g, ''))) {
    throw new Error('El teléfono debe tener un formato válido');
  }

  if (validated.birthDate && validated.birthDate > new Date()) {
    throw new Error('La fecha de nacimiento no puede ser futura');
  }

  return validated;
}

/**
 * Obtener estadísticas del paciente
 * @param {string} patientId - ID del paciente
 * @returns {Object} Estadísticas
 */
async function getPatientStatistics(patientId) {
  try {
    // Estadísticas de citas
    const appointmentsQuery = await databaseService.query(
      `SELECT 
         COUNT(*) as total_appointments,
         COUNT(CASE WHEN status = 'aceptada' THEN 1 END) as completed_appointments,
         COUNT(CASE WHEN status = 'anulada' THEN 1 END) as cancelled_appointments,
         COUNT(CASE WHEN appointment_date < NOW() THEN 1 END) as past_appointments,
         COUNT(CASE WHEN appointment_date >= NOW() THEN 1 END) as future_appointments,
         MIN(appointment_date) as first_appointment,
         MAX(appointment_date) as last_appointment
       FROM appointments 
       WHERE patient_id = $1`,
      [patientId]
    );

    // Estadísticas de gastos
    const expensesQuery = await databaseService.query(
      `SELECT 
         COUNT(*) as total_invoices,
         COALESCE(SUM(total_amount), 0) as total_spent,
         COALESCE(AVG(total_amount), 0) as average_invoice,
         COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_amount,
         COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END), 0) as pending_amount
       FROM invoices 
       WHERE patient_id = $1`,
      [patientId]
    );

    // Últimos tratamientos
    const treatmentsQuery = await databaseService.query(
      `SELECT DISTINCT treatment_type, COUNT(*) as frequency
       FROM appointments 
       WHERE patient_id = $1 AND treatment_type IS NOT NULL AND treatment_type != ''
       GROUP BY treatment_type
       ORDER BY frequency DESC
       LIMIT 5`,
      [patientId]
    );

    // Estado de cumplimiento LOPD
    const complianceStatus = await legalService.checkLOPDCompliance(patientId);

    const appointments = appointmentsQuery.rows[0];
    const expenses = expensesQuery.rows[0];

    return {
      appointments: {
        total: parseInt(appointments.total_appointments),
        completed: parseInt(appointments.completed_appointments),
        cancelled: parseInt(appointments.cancelled_appointments),
        past: parseInt(appointments.past_appointments),
        future: parseInt(appointments.future_appointments),
        firstAppointment: appointments.first_appointment,
        lastAppointment: appointments.last_appointment
      },
      expenses: {
        totalInvoices: parseInt(expenses.total_invoices),
        totalSpent: parseFloat(expenses.total_spent),
        averageInvoice: parseFloat(expenses.average_invoice),
        paidAmount: parseFloat(expenses.paid_amount),
        pendingAmount: parseFloat(expenses.pending_amount)
      },
      topTreatments: treatmentsQuery.rows,
      complianceStatus
    };

  } catch (error) {
    logger.error(`Error al obtener estadísticas del paciente: ${error.message}`);
    throw error;
  }
}

// ==============================================
// CONTROLADOR DE OBTENER PACIENTES
// ==============================================

/**
 * Obtener lista de pacientes con filtros y paginación
 * GET /api/patients
 */
async function getPatients(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      lastVisitFrom,
      lastVisitTo,
      treatmentType,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Verificar permisos
    if (!hasPermission(req.user, 'patients.read')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para ver pacientes'
      });
    }

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtros
    if (search) {
      whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.email ILIKE $${paramIndex} OR p.phone ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (status === 'active') {
      whereConditions.push(`p.is_active = true`);
    } else if (status === 'inactive') {
      whereConditions.push(`p.is_active = false`);
    }

    if (lastVisitFrom) {
      whereConditions.push(`(SELECT MAX(a.appointment_date) FROM appointments a WHERE a.patient_id = p.id) >= $${paramIndex}`);
      queryParams.push(lastVisitFrom);
      paramIndex++;
    }

    if (lastVisitTo) {
      whereConditions.push(`(SELECT MAX(a.appointment_date) FROM appointments a WHERE a.patient_id = p.id) <= $${paramIndex}`);
      queryParams.push(lastVisitTo);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Validar ordenamiento
    const validSortFields = ['name', 'email', 'phone', 'created_at', 'updated_at'];
    const validSortOrders = ['asc', 'desc'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
    const sortDirection = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';

    // Consulta principal
    const patientsQuery = await databaseService.query(
      `SELECT 
         p.id, p.name, p.email, p.phone, p.address, p.birth_date,
         p.gender, p.medical_history, p.allergies, p.medications,
         p.emergency_contact, p.emergency_phone, p.insurance,
         p.is_active, p.created_at, p.updated_at,
         (SELECT MAX(a.appointment_date) FROM appointments a WHERE a.patient_id = p.id) as last_visit,
         (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id) as total_appointments,
         (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id AND a.appointment_date >= NOW()) as upcoming_appointments,
         CASE 
           WHEN p.birth_date IS NOT NULL THEN 
             EXTRACT(YEAR FROM AGE(p.birth_date))
           ELSE NULL
         END as age,
         CASE 
           WHEN p.is_active = true THEN '🟢 Activo'
           ELSE '🔴 Inactivo'
         END as status_label
       FROM patients p
       ${whereClause}
       ORDER BY p.${sortField} ${sortDirection}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    // Contar total
    const countQuery = await databaseService.query(
      `SELECT COUNT(*) as total
       FROM patients p
       ${whereClause}`,
      queryParams
    );

    const total = parseInt(countQuery.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Obtener estadísticas generales
    const statsQuery = await databaseService.query(
      `SELECT 
         COUNT(*) as total_patients,
         COUNT(CASE WHEN is_active = true THEN 1 END) as active_patients,
         COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month,
         COUNT(CASE WHEN birth_date >= '1990-01-01' THEN 1 END) as patients_under_35
       FROM patients
       ${whereClause.replace('p.', '')}`,
      queryParams
    );

    const stats = statsQuery.rows[0];

    res.json({
      success: true,
      data: {
        patients: patientsQuery.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        statistics: {
          total: parseInt(stats.total_patients),
          active: parseInt(stats.active_patients),
          newThisMonth: parseInt(stats.new_this_month),
          patientsUnder35: parseInt(stats.patients_under_35)
        },
        filters: {
          search,
          status,
          lastVisitFrom,
          lastVisitTo,
          treatmentType,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    logger.error(`Error al obtener pacientes: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener pacientes',
      message: 'No se pudieron cargar los pacientes'
    });
  }
}

// ==============================================
// CONTROLADOR DE OBTENER PACIENTE POR ID
// ==============================================

/**
 * Obtener paciente por ID con información completa
 * GET /api/patients/:id
 */
async function getPatient(req, res) {
  try {
    const { id: patientId } = req.params;

    // Verificar permisos
    if (!hasPermission(req.user, 'patients.read')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para ver pacientes'
      });
    }

    // Obtener datos del paciente
    const patientQuery = await databaseService.query(
      `SELECT 
         p.*,
         CASE 
           WHEN p.birth_date IS NOT NULL THEN 
             EXTRACT(YEAR FROM AGE(p.birth_date))
           ELSE NULL
         END as age
       FROM patients p
       WHERE p.id = $1`,
      [patientId]
    );

    if (patientQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'No se encontró el paciente especificado'
      });
    }

    const patient = patientQuery.rows[0];

    // Obtener estadísticas
    const statistics = await getPatientStatistics(patientId);

    // Obtener próximas citas
    const upcomingAppointmentsQuery = await databaseService.query(
      `SELECT 
         id, appointment_date, start_time, end_time,
         treatment_type, status, notes
       FROM appointments
       WHERE patient_id = $1 AND appointment_date >= NOW()
       ORDER BY appointment_date ASC
       LIMIT 5`,
      [patientId]
    );

    // Obtener últimos documentos legales
    const recentDocumentsQuery = await databaseService.query(
      `SELECT 
         document_type, title, status, created_at
       FROM legal_documents
       WHERE patient_id = $1
       ORDER BY created_at DESC
       LIMIT 3`,
      [patientId]
    );

    res.json({
      success: true,
      data: {
        patient,
        statistics,
        upcomingAppointments: upcomingAppointmentsQuery.rows,
        recentDocuments: recentDocumentsQuery.rows
      }
    });

  } catch (error) {
    logger.error(`Error al obtener paciente: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener paciente',
      message: 'No se pudo cargar el paciente'
    });
  }
}

// ==============================================
// CONTROLADOR DE CREAR PACIENTE
// ==============================================

/**
 * Crear nuevo paciente
 * POST /api/patients
 */
async function createPatient(req, res) {
  try {
    const patientData = req.body;

    // Verificar permisos
    if (!hasPermission(req.user, 'patients.create')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para crear pacientes'
      });
    }

    // Validar datos
    const validatedData = validatePatientData(patientData);
    const patientId = generatePatientId();

    // Verificar que el email no esté en uso
    if (validatedData.email) {
      const existingPatientQuery = await databaseService.query(
        'SELECT id FROM patients WHERE email = $1',
        [validatedData.email]
      );

      if (existingPatientQuery.rows.length > 0) {
        return res.status(409).json({
          error: 'Email ya registrado',
          message: 'Ya existe un paciente con este email'
        });
      }
    }

    // Verificar que el teléfono no esté en uso
    if (validatedData.phone) {
      const existingPhoneQuery = await databaseService.query(
        'SELECT id FROM patients WHERE phone = $1',
        [validatedData.phone]
      );

      if (existingPhoneQuery.rows.length > 0) {
        return res.status(409).json({
          error: 'Teléfono ya registrado',
          message: 'Ya existe un paciente con este teléfono'
        });
      }
    }

    // Crear paciente
    const newPatientQuery = await databaseService.query(
      `INSERT INTO patients (
         id, name, email, phone, address, birth_date, gender,
         medical_history, allergies, medications,
         emergency_contact, emergency_phone, insurance,
         notes, is_active, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, NOW(), NOW())
       RETURNING *`,
      [
        patientId,
        validatedData.name,
        validatedData.email,
        validatedData.phone,
        validatedData.address,
        validatedData.birthDate,
        validatedData.gender,
        validatedData.medicalHistory,
        validatedData.allergies,
        validatedData.medications,
        validatedData.emergencyContact,
        validatedData.emergencyPhone,
        validatedData.insurance,
        validatedData.notes
      ]
    );

    const newPatient = newPatientQuery.rows[0];

    // Registrar actividad
    await databaseService.query(
      `INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [req.user.id, 'create_patient', 'patient', patientId]
    );

    logger.info(`Nuevo paciente creado: ${newPatient.name} (${patientId}) por ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Paciente creado correctamente',
      data: {
        patient: {
          ...newPatient,
          age: newPatient.birth_date ? 
            new Date().getFullYear() - new Date(newPatient.birth_date).getFullYear() : 
            null
        }
      }
    });

  } catch (error) {
    logger.error(`Error al crear paciente: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al crear paciente',
      message: error.message || 'No se pudo crear el paciente'
    });
  }
}

// ==============================================
// CONTROLADOR DE ACTUALIZAR PACIENTE
// ==============================================

/**
 * Actualizar datos de paciente
 * PUT /api/patients/:id
 */
async function updatePatient(req, res) {
  try {
    const { id: patientId } = req.params;
    const patientData = req.body;

    // Verificar permisos
    if (!hasPermission(req.user, 'patients.update')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para actualizar pacientes'
      });
    }

    // Verificar que el paciente existe
    const existingPatientQuery = await databaseService.query(
      'SELECT * FROM patients WHERE id = $1',
      [patientId]
    );

    if (existingPatientQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'No se encontró el paciente especificado'
      });
    }

    const existingPatient = existingPatientQuery.rows[0];

    // Validar datos
    const validatedData = validatePatientData(patientData);

    // Verificar conflictos de email
    if (validatedData.email && validatedData.email !== existingPatient.email) {
      const emailConflictQuery = await databaseService.query(
        'SELECT id FROM patients WHERE email = $1 AND id != $2',
        [validatedData.email, patientId]
      );

      if (emailConflictQuery.rows.length > 0) {
        return res.status(409).json({
          error: 'Email ya registrado',
          message: 'Ya existe otro paciente con este email'
        });
      }
    }

    // Verificar conflictos de teléfono
    if (validatedData.phone && validatedData.phone !== existingPatient.phone) {
      const phoneConflictQuery = await databaseService.query(
        'SELECT id FROM patients WHERE phone = $1 AND id != $2',
        [validatedData.phone, patientId]
      );

      if (phoneConflictQuery.rows.length > 0) {
        return res.status(409).json({
          error: 'Teléfono ya registrado',
          message: 'Ya existe otro paciente con este teléfono'
        });
      }
    }

    // Actualizar paciente
    const updateData = {
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone,
      address: validatedData.address,
      birth_date: validatedData.birthDate,
      gender: validatedData.gender,
      medical_history: validatedData.medicalHistory,
      allergies: validatedData.allergies,
      medications: validatedData.medications,
      emergency_contact: validatedData.emergencyContact,
      emergency_phone: validatedData.emergencyPhone,
      insurance: validatedData.insurance,
      notes: validatedData.notes,
      updated_at: new Date()
    };

    const updatedPatientQuery = await databaseService.query(
      `UPDATE patients 
       SET name = $1, email = $2, phone = $3, address = $4, birth_date = $5,
           gender = $6, medical_history = $7, allergies = $8, medications = $9,
           emergency_contact = $10, emergency_phone = $11, insurance = $12,
           notes = $13, updated_at = $14
       WHERE id = $15
       RETURNING *`,
      [
        updateData.name, updateData.email, updateData.phone, updateData.address,
        updateData.birth_date, updateData.gender, updateData.medical_history,
        updateData.allergies, updateData.medications, updateData.emergency_contact,
        updateData.emergency_phone, updateData.insurance, updateData.notes,
        updateData.updated_at, patientId
      ]
    );

    const updatedPatient = updatedPatientQuery.rows[0];

    // Registrar actividad
    await databaseService.query(
      `INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [req.user.id, 'update_patient', 'patient', patientId]
    );

    logger.info(`Paciente actualizado: ${updatedPatient.name} (${patientId}) por ${req.user.email}`);

    res.json({
      success: true,
      message: 'Paciente actualizado correctamente',
      data: {
        patient: {
          ...updatedPatient,
          age: updatedPatient.birth_date ? 
            new Date().getFullYear() - new Date(updatedPatient.birth_date).getFullYear() : 
            null
        }
      }
    });

  } catch (error) {
    logger.error(`Error al actualizar paciente: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al actualizar paciente',
      message: error.message || 'No se pudo actualizar el paciente'
    });
  }
}

// ==============================================
// CONTROLADOR DE HISTORIAL DE PACIENTE
// ==============================================

/**
 * Obtener historial completo del paciente
 * GET /api/patients/:id/history
 */
async function getPatientHistory(req, res) {
  try {
    const { id: patientId } = req.params;

    // Verificar permisos
    if (!hasPermission(req.user, 'patients.read')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para ver el historial'
      });
    }

    // Verificar que el paciente existe
    const patientQuery = await databaseService.query(
      'SELECT name FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'No se encontró el paciente especificado'
      });
    }

    const patient = patientQuery.rows[0];

    // Obtener historial de citas
    const appointmentsHistoryQuery = await databaseService.query(
      `SELECT 
         a.id, a.appointment_date, a.start_time, a.end_time,
         a.treatment_type, a.status, a.notes, a.created_at,
         CASE 
           WHEN a.status = 'aceptada' THEN '🟢 Completada'
           WHEN a.status = 'confirmada' THEN '🔵 Confirmada'
           WHEN a.status = 'planificada' THEN '⚪ Programada'
           WHEN a.status = 'anulada' THEN '🔴 Cancelada'
         END as status_label
       FROM appointments a
       WHERE a.patient_id = $1
       ORDER BY a.appointment_date DESC
       LIMIT 50`,
      [patientId]
    );

    // Obtener historial de facturas
    const invoicesHistoryQuery = await databaseService.query(
      `SELECT 
         id, invoice_number, invoice_date, total_amount,
         payment_status, status, created_at,
         CASE 
           WHEN payment_status = 'paid' THEN '🟢 Pagada'
           WHEN payment_status = 'pending' THEN '🟡 Pendiente'
           WHEN payment_status = 'overdue' THEN '🔴 Vencida'
         END as payment_status_label
       FROM invoices
       WHERE patient_id = $1
       ORDER BY invoice_date DESC
       LIMIT 50`,
      [patientId]
    );

    // Obtener historial de documentos legales
    const legalDocumentsQuery = await databaseService.query(
      `SELECT 
         document_type, title, status, created_at,
         CASE 
           WHEN status = 'accepted' THEN '✅ Aceptado'
           WHEN status = 'pending' THEN '⏳ Pendiente'
           WHEN status = 'rejected' THEN '❌ Rechazado'
         END as status_label
       FROM legal_documents
       WHERE patient_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [patientId]
    );

    // Obtener historial de comunicaciones WhatsApp
    const whatsappHistoryQuery = await databaseService.query(
      `SELECT 
         conversation_id, whatsapp_number, patient_name,
         last_message, last_message_at, urgency_level,
         status, unread_count
       FROM conversations
       WHERE whatsapp_number IN (
         SELECT phone FROM patients WHERE id = $1
       )
       ORDER BY last_message_at DESC
       LIMIT 10`,
      [patientId]
    );

    // Obtener historial de cuestionarios
    const questionnairesHistoryQuery = await databaseService.query(
      `SELECT 
         questionnaire_type, status, submitted_at,
         CASE 
           WHEN status = 'completed' THEN '✅ Completado'
           WHEN status = 'pending' THEN '⏳ Pendiente'
           WHEN status = 'expired' THEN '⏰ Expirado'
         END as status_label
       FROM questionnaire_responses
       WHERE patient_id = $1
       ORDER BY submitted_at DESC
       LIMIT 10`,
      [patientId]
    );

    res.json({
      success: true,
      data: {
        patient: {
          name: patient.name
        },
        history: {
          appointments: appointmentsHistoryQuery.rows,
          invoices: invoicesHistoryQuery.rows,
          legalDocuments: legalDocumentsQuery.rows,
          whatsappCommunications: whatsappHistoryQuery.rows,
          questionnaires: questionnairesHistoryQuery.rows
        }
      }
    });

  } catch (error) {
    logger.error(`Error al obtener historial: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener historial',
      message: 'No se pudo cargar el historial del paciente'
    });
  }
}

// ==============================================
// CONTROLADOR DE ELIMINAR PACIENTE
// ==============================================

/**
 * Eliminar paciente (soft delete)
 * DELETE /api/patients/:id
 */
async function deletePatient(req, res) {
  try {
    const { id: patientId } = req.params;

    // Verificar permisos
    if (!hasPermission(req.user, 'patients.delete')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para eliminar pacientes'
      });
    }

    // Verificar que el paciente existe
    const patientQuery = await databaseService.query(
      'SELECT * FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'No se encontró el paciente especificado'
      });
    }

    const patient = patientQuery.rows[0];

    // Verificar si tiene citas futuras (no permitir eliminación si las tiene)
    const futureAppointmentsQuery = await databaseService.query(
      'SELECT COUNT(*) as count FROM appointments WHERE patient_id = $1 AND appointment_date >= NOW()',
      [patientId]
    );

    if (parseInt(futureAppointmentsQuery.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar',
        message: 'No se puede eliminar un paciente que tiene citas programadas'
      });
    }

    // Soft delete - desactivar paciente
    await databaseService.query(
      'UPDATE patients SET is_active = false, updated_at = NOW() WHERE id = $1',
      [patientId]
    );

    // Registrar actividad
    await databaseService.query(
      `INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [req.user.id, 'delete_patient', 'patient', patientId]
    );

    logger.info(`Paciente desactivado: ${patient.name} (${patientId}) por ${req.user.email}`);

    res.json({
      success: true,
      message: 'Paciente eliminado correctamente',
      data: {
        patientId,
        action: 'deactivated',
        timestamp: new Date()
      }
    });

  } catch (error) {
    logger.error(`Error al eliminar paciente: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al eliminar paciente',
      message: 'No se pudo eliminar el paciente'
    });
  }
}

// ==============================================
// EXPORTACIÓN DE FUNCIONES
// ==============================================

module.exports = {
  // Controladores principales
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  getPatientHistory,
  deletePatient,
  
  // Funciones auxiliares
  generatePatientId,
  validatePatientData,
  getPatientStatistics
};
