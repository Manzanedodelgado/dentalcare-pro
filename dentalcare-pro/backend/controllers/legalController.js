/**
 * CONTROLADOR LEGAL Y CUMPLIMIENTO NORMATIVO
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Cumplimiento LOPD/RGPD automático con audit trail
 * - Gestión de consentimientos informados con tracking
 * - Cuestionarios de primera visita con validación legal
 * - Generación automática de documentos legales
 * - Registro de cumplimiento con timestamp legal
 * - Tablas especializadas: DLegalDocuments, DQuestionnaireResponses, DComplianceLog
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const databaseService = require('../utils/databaseService');
const legalService = require('../utils/legalService');
const logger = require('../utils/logger');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const { generateDocument } = require('../utils/documentGenerator');

// ==============================================
// CONFIGURACIÓN LEGAL Y NORMATIVA
// ==============================================

const LEGAL_DOCUMENT_TYPES = {
  CONSENT_INFORMED: {
    id: 'consent_informed',
    name: 'Consentimiento Informado',
    category: 'medical',
    required: true,
    retention: 7 // años
  },
  LOPD_PRIVACY: {
    id: 'lopd_privacy',
    name: 'Política de Privacidad LOPD',
    category: 'privacy',
    required: true,
    retention: 5 // años
  },
  TREATMENT_CONSENT: {
    id: 'treatment_consent',
    name: 'Consentimiento de Tratamiento',
    category: 'medical',
    required: true,
    retention: 7 // años
  },
  DATA_PROCESSING: {
    id: 'data_processing',
    name: 'Autorización Tratamiento de Datos',
    category: 'privacy',
    required: true,
    retention: 5 // años
  },
  FINANCIAL_CONSENT: {
    id: 'financial_consent',
    name: 'Consentimiento Financiero',
    category: 'financial',
    required: false,
    retention: 7 // años
  }
};

const LOPD_PROCESSING_PURPOSES = [
  'Atención sanitaria',
  'Gestión de citas',
  'Facturación y cobros',
  'Comunicaciones administrativas',
  'Estadísticas sanitarias',
  'Investigación médica',
  'Cumplimiento legal'
];

const COMPLIANCE_LEVELS = {
  PENDING: {
    id: 'pending',
    name: 'Pendiente',
    color: 'yellow',
    description: 'Documentos o cuestionarios pendientes'
  },
  PARTIAL: {
    id: 'partial',
    name: 'Parcial',
    color: 'orange',
    description: 'Algunos documentos completados'
  },
  COMPLIANT: {
    id: 'compliant',
    name: 'Conforme',
    color: 'green',
    description: 'Cumplimiento legal completo'
  },
  NON_COMPLIANT: {
    id: 'non_compliant',
    name: 'No Conforme',
    color: 'red',
    description: 'Rechazo de consentimientos'
  }
};

// ==============================================
// FUNCIONES AUXILIARES
// ==============================================

/**
 * Generar ID único para documento legal
 * @param {string} patientId - ID del paciente
 * @param {string} documentType - Tipo de documento
 * @returns {string} ID único
 */
function generateLegalDocumentId(patientId, documentType) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `LEGAL_${patientId}_${documentType}_${timestamp}_${random}`;
}

/**
 * Verificar cumplimiento LOPD para un paciente
 * @param {string} patientId - ID del paciente
 * @returns {Object} Estado de cumplimiento
 */
async function checkLOPDCompliance(patientId) {
  try {
    // Verificar documentos legales aceptados
    const documentsQuery = await databaseService.query(
      `SELECT document_type, status, accepted_at
       FROM legal_documents 
       WHERE patient_id = $1 AND status = 'accepted'`,
      [patientId]
    );
    
    // Verificar cuestionarios completados
    const questionnairesQuery = await databaseService.query(
      `SELECT questionnaire_type, status, completed_at
       FROM questionnaire_responses 
       WHERE patient_id = $1 AND status = 'completed'`,
      [patientId]
    );
    
    // Verificar consentimientos específicos
    const consentsQuery = await databaseService.query(
      `SELECT consent_type, status, granted_at
       FROM consent_records 
       WHERE patient_id = $1 AND status = 'granted'`,
      [patientId]
    );
    
    const documents = documentsQuery.rows;
    const questionnaires = questionnairesQuery.rows;
    const consents = consentsQuery.rows;
    
    // Determinar nivel de cumplimiento
    let complianceLevel = COMPLIANCE_LEVELS.PENDING;
    let missingItems = [];
    let completedItems = [];
    
    // Verificar documentos obligatorios
    const requiredDocuments = ['consent_informed', 'lopd_privacy', 'data_processing'];
    
    for (const docType of requiredDocuments) {
      const hasDoc = documents.some(d => d.document_type === docType);
      if (hasDoc) {
        completedItems.push(docType);
      } else {
        missingItems.push(`Documento: ${docType}`);
      }
    }
    
    // Verificar cuestionarios
    const hasFirstVisitQuestionnaire = questionnaires.some(q => q.questionnaire_type === 'first_visit');
    if (hasFirstVisitQuestionnaire) {
      completedItems.push('questionnaire_first_visit');
    } else {
      missingItems.push('Cuestionario de primera visita');
    }
    
    // Determinar nivel
    if (missingItems.length === 0) {
      complianceLevel = COMPLIANCE_LEVELS.COMPLIANT;
    } else if (completedItems.length > 0) {
      complianceLevel = COMPLIANCE_LEVELS.PARTIAL;
    }
    
    // Verificar rechazos
    const hasRejections = documents.some(d => d.status === 'rejected') ||
                         consents.some(c => c.status === 'denied');
    
    if (hasRejections) {
      complianceLevel = COMPLIANCE_LEVELS.NON_COMPLIANT;
    }
    
    return {
      level: complianceLevel,
      patientId,
      completedItems,
      missingItems,
      totalRequired: requiredDocuments.length + 1, // + cuestionario
      completionPercentage: Math.round((completedItems.length / (requiredDocuments.length + 1)) * 100),
      lastChecked: new Date()
    };
    
  } catch (error) {
    logger.error(`Error al verificar cumplimiento LOPD: ${error.message}`);
    throw error;
  }
}

/**
 * Registrar evento de cumplimiento legal
 * @param {string} patientId - ID del paciente
 * @param {string} eventType - Tipo de evento
 * @param {Object} data - Datos adicionales
 */
async function logComplianceEvent(patientId, eventType, data = {}) {
  try {
    await databaseService.query(
      `INSERT INTO compliance_log (patient_id, event_type, event_data, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [patientId, eventType, JSON.stringify(data)]
    );
    
    logger.info(`Evento de cumplimiento registrado: ${patientId} - ${eventType}`);
    
  } catch (error) {
    logger.error(`Error al registrar evento de cumplimiento: ${error.message}`);
  }
}

/**
 * Generar documento PDF legal
 * @param {Object} documentData - Datos del documento
 * @returns {Buffer} PDF generado
 */
async function generateLegalPDF(documentData) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let yPosition = 800;
    
    // Header
    page.drawText('CLÍNICA DENTAL RUBIO GARCÍA', {
      x: 50,
      y: yPosition,
      size: 16,
      font: fontBold
    });
    
    yPosition -= 30;
    page.drawText(documentData.title, {
      x: 50,
      y: yPosition,
      size: 14,
      font: fontBold
    });
    
    yPosition -= 40;
    
    // Contenido del documento
    const lines = documentData.content.split('\n');
    
    for (const line of lines) {
      if (yPosition < 50) {
        // Nueva página si es necesario
        yPosition = 800;
        pdfDoc.addPage([595.28, 841.89]);
      }
      
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 11,
        font: font
      });
      
      yPosition -= 15;
    }
    
    // Footer con datos legales
    yPosition = 100;
    page.drawText(`Documento ID: ${documentData.documentId}`, {
      x: 50,
      y: yPosition,
      size: 9,
      font: font
    });
    
    page.drawText(`Generado: ${new Date().toLocaleDateString('es-ES')}`, {
      x: 50,
      y: yPosition - 15,
      size: 9,
      font: font
    });
    
    // Firmas
    yPosition -= 50;
    page.drawText('Firma del Paciente:', {
      x: 50,
      y: yPosition,
      size: 10,
      font: fontBold
    });
    
    page.drawText('Firma del Profesional:', {
      x: 300,
      y: yPosition,
      size: 10,
      font: fontBold
    });
    
    return await pdfDoc.save();
    
  } catch (error) {
    logger.error(`Error al generar PDF legal: ${error.message}`);
    throw error;
  }
}

// ==============================================
// CONTROLADOR DE DOCUMENTOS LEGALES
// ==============================================

/**
 * Obtener documentos legales del paciente
 * GET /api/legal/documents
 */
async function getDocuments(req, res) {
  try {
    const { patientId, status, type } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (patientId) {
      whereConditions.push(`ld.patient_id = $${paramIndex}`);
      queryParams.push(patientId);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`ld.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (type) {
      whereConditions.push(`ld.document_type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    const documentsQuery = await databaseService.query(
      `SELECT 
         ld.id, ld.document_id, ld.patient_id, ld.document_type,
         ld.title, ld.content, ld.status, ld.accepted_at,
         ld.rejected_at, ld.notes, ld.created_at, ld.updated_at,
         p.name as patient_name, p.phone as patient_phone,
         CASE 
           WHEN ld.status = 'pending' THEN '⏳ Pendiente'
           WHEN ld.status = 'accepted' THEN '✅ Aceptado'
           WHEN ld.status = 'rejected' THEN '❌ Rechazado'
           WHEN ld.status = 'expired' THEN '⏰ Expirado'
         END as status_label
       FROM legal_documents ld
       JOIN patients p ON ld.patient_id = p.id
       ${whereClause}
       ORDER BY ld.created_at DESC`,
      queryParams
    );
    
    // Obtener estadísticas de cumplimiento
    const complianceQuery = await databaseService.query(
      `SELECT 
         COUNT(*) as total_documents,
         COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
         COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
       FROM legal_documents ld
       ${whereClause.replace('ld.', '')}`,
      queryParams
    );
    
    const compliance = complianceQuery.rows[0];
    
    res.json({
      success: true,
      data: {
        documents: documentsQuery.rows,
        summary: {
          total: parseInt(compliance.total_documents),
          accepted: parseInt(compliance.accepted),
          pending: parseInt(compliance.pending),
          rejected: parseInt(compliance.rejected)
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener documentos legales: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener documentos',
      message: 'No se pudieron cargar los documentos legales'
    });
  }
}

/**
 * Crear nuevo documento legal
 * POST /api/legal/documents
 */
async function createDocument(req, res) {
  try {
    const {
      patientId,
      documentType,
      title,
      content,
      customFields = {}
    } = req.body;
    
    // Verificar tipo de documento válido
    if (!LEGAL_DOCUMENT_TYPES[documentType.toUpperCase()]) {
      return res.status(400).json({
        error: 'Tipo de documento inválido',
        message: 'El tipo de documento especificado no es válido'
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
    const documentId = generateLegalDocumentId(patientId, documentType);
    
    // Crear documento legal
    const newDocument = await databaseService.query(
      `INSERT INTO legal_documents (
         document_id, patient_id, document_type, title, content,
         custom_fields, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
       RETURNING *`,
      [documentId, patientId, documentType, title, content, JSON.stringify(customFields)]
    );
    
    const document = newDocument.rows[0];
    
    // Registrar evento de cumplimiento
    await logComplianceEvent(patientId, 'document_created', {
      documentId,
      documentType,
      title
    });
    
    logger.info(`Documento legal creado: ${documentId} para paciente ${patient.name}`);
    
    res.status(201).json({
      success: true,
      message: 'Documento legal creado correctamente',
      data: {
        document: {
          ...document,
          patient_name: patient.name,
          patient_phone: patient.phone,
          patient_email: patient.email
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al crear documento legal: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al crear documento',
      message: 'No se pudo crear el documento legal'
    });
  }
}

/**
 * Actualizar documento legal
 * PUT /api/legal/documents/:id
 */
async function updateDocument(req, res) {
  try {
    const { id: documentId } = req.params;
    const { title, content, customFields } = req.body;
    
    // Verificar que el documento existe
    const existingDocumentQuery = await databaseService.query(
      'SELECT * FROM legal_documents WHERE id = $1',
      [documentId]
    );
    
    if (existingDocumentQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Documento no encontrado',
        message: 'No se encontró el documento especificado'
      });
    }
    
    const existingDocument = existingDocumentQuery.rows[0];
    
    // No permitir editar documentos ya aceptados o rechazados
    if (existingDocument.status !== 'pending') {
      return res.status(400).json({
        error: 'Documento no editable',
        message: 'No se puede editar un documento que ya ha sido procesado'
      });
    }
    
    // Actualizar documento
    await databaseService.query(
      `UPDATE legal_documents 
       SET title = $1, content = $2, custom_fields = $3, updated_at = NOW()
       WHERE id = $4`,
      [title, content, JSON.stringify(customFields), documentId]
    );
    
    logger.info(`Documento legal actualizado: ${documentId} por usuario ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Documento legal actualizado correctamente'
    });
    
  } catch (error) {
    logger.error(`Error al actualizar documento legal: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al actualizar documento',
      message: 'No se pudo actualizar el documento legal'
    });
  }
}

/**
 * Eliminar documento legal
 * DELETE /api/legal/documents/:id
 */
async function deleteDocument(req, res) {
  try {
    const { id: documentId } = req.params;
    
    // Verificar que el documento existe
    const documentQuery = await databaseService.query(
      'SELECT * FROM legal_documents WHERE id = $1',
      [documentId]
    );
    
    if (documentQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Documento no encontrado',
        message: 'No se encontró el documento especificado'
      });
    }
    
    const document = documentQuery.rows[0];
    
    // No permitir eliminar documentos ya aceptados
    if (document.status === 'accepted') {
      return res.status(400).json({
        error: 'Documento no eliminable',
        message: 'No se puede eliminar un documento ya aceptado'
      });
    }
    
    // Eliminar documento
    await databaseService.query('DELETE FROM legal_documents WHERE id = $1', [documentId]);
    
    // Registrar evento
    await logComplianceEvent(document.patient_id, 'document_deleted', {
      documentId,
      documentType: document.document_type
    });
    
    logger.info(`Documento legal eliminado: ${documentId} por usuario ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Documento legal eliminado correctamente'
    });
    
  } catch (error) {
    logger.error(`Error al eliminar documento legal: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al eliminar documento',
      message: 'No se pudo eliminar el documento legal'
    });
  }
}

// ==============================================
// CONTROLADOR DE CUESTIONARIOS LOPD
// ==============================================

/**
 * Obtener cuestionarios LOPD disponibles
 * GET /api/legal/questionnaires
 */
async function getQuestionnaires(req, res) {
  try {
    const questionnairesQuery = await databaseService.query(
      `SELECT 
         id, name, description, questions, is_active, created_at
       FROM lopd_questionnaires
       WHERE is_active = true
       ORDER BY created_at DESC`
    );
    
    res.json({
      success: true,
      data: {
        questionnaires: questionnairesQuery.rows,
        availablePurposes: LOPD_PROCESSING_PURPOSES
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener cuestionarios: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener cuestionarios',
      message: 'No se pudieron cargar los cuestionarios'
    });
  }
}

/**
 * Crear nuevo cuestionario LOPD
 * POST /api/legal/questionnaires
 */
async function createQuestionnaire(req, res) {
  try {
    const { name, description, questions } = req.body;
    
    // Crear cuestionario
    const newQuestionnaire = await databaseService.query(
      `INSERT INTO lopd_questionnaires (name, description, questions, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [name, description, JSON.stringify(questions)]
    );
    
    const questionnaire = newQuestionnaire.rows[0];
    
    logger.info(`Cuestionario LOPD creado: ${questionnaire.id} por usuario ${req.user.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Cuestionario LOPD creado correctamente',
      data: { questionnaire }
    });
    
  } catch (error) {
    logger.error(`Error al crear cuestionario: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al crear cuestionario',
      message: 'No se pudo crear el cuestionario LOPD'
    });
  }
}

/**
 * Enviar cuestionario LOPD de cumplimiento
 * POST /api/legal/compliance/submit
 */
async function submitCompliance(req, res) {
  try {
    const {
      patientId,
      questionnaireId,
      answers,
      consentData
    } = req.body;
    
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
    
    // Validar respuestas requeridas
    const requiredConsentFields = ['data_processing', 'communications', 'medical_records'];
    const missingConsents = requiredConsentFields.filter(
      field => !consentData || !consentData[field]
    );
    
    if (missingConsents.length > 0) {
      return res.status(400).json({
        error: 'Consentimientos requeridos faltantes',
        message: `Faltan los siguientes consentimientos: ${missingConsents.join(', ')}`
      });
    }
    
    // Guardar respuestas del cuestionario
    const questionnaireResponse = await databaseService.query(
      `INSERT INTO questionnaire_responses (
         patient_id, questionnaire_id, answers, consent_data, status, submitted_at
       ) VALUES ($1, $2, $3, $4, 'completed', NOW())
       RETURNING *`,
      [patientId, questionnaireId, JSON.stringify(answers), JSON.stringify(consentData)]
    );
    
    // Crear registros de consentimiento
    for (const [consentType, granted] of Object.entries(consentData)) {
      if (granted) {
        await databaseService.query(
          `INSERT INTO consent_records (
             patient_id, consent_type, status, granted_at, ip_address
           ) VALUES ($1, $2, 'granted', NOW(), $3)`,
          [patientId, consentType, req.ip]
        );
      }
    }
    
    // Verificar cumplimiento general
    const complianceStatus = await checkLOPDCompliance(patientId);
    
    // Registrar evento de cumplimiento
    await logComplianceEvent(patientId, 'compliance_submitted', {
      questionnaireId,
      complianceLevel: complianceStatus.level.id,
      consents: consentData
    });
    
    logger.info(`Cumplimiento LOPD enviado para paciente ${patient.name}: ${complianceStatus.level.name}`);
    
    res.json({
      success: true,
      message: 'Cuestionario LOPD enviado correctamente',
      data: {
        questionnaireResponse: questionnaireResponse.rows[0],
        complianceStatus,
        patientName: patient.name
      }
    });
    
  } catch (error) {
    logger.error(`Error al enviar cumplimiento: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al enviar cuestionario',
      message: 'No se pudo procesar el cuestionario LOPD'
    });
  }
}

/**
 * Verificar estado de cumplimiento LOPD
 * GET /api/legal/compliance/status/:patientId
 */
async function checkComplianceStatus(req, res) {
  try {
    const { patientId } = req.params;
    
    // Verificar que el paciente existe
    const patientQuery = await databaseService.query(
      'SELECT id, name FROM patients WHERE id = $1',
      [patientId]
    );
    
    if (patientQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'No se encontró el paciente especificado'
      });
    }
    
    const patient = patientQuery.rows[0];
    const complianceStatus = await checkLOPDCompliance(patientId);
    
    // Obtener documentos pendientes
    const pendingDocumentsQuery = await databaseService.query(
      `SELECT document_type, title, created_at
       FROM legal_documents 
       WHERE patient_id = $1 AND status = 'pending'
       ORDER BY created_at ASC`,
      [patientId]
    );
    
    // Obtener últimos eventos de cumplimiento
    const recentEventsQuery = await databaseService.query(
      `SELECT event_type, event_data, timestamp
       FROM compliance_log 
       WHERE patient_id = $1
       ORDER BY timestamp DESC
       LIMIT 10`,
      [patientId]
    );
    
    res.json({
      success: true,
      data: {
        patient: {
          id: patient.id,
          name: patient.name
        },
        complianceStatus,
        pendingDocuments: pendingDocumentsQuery.rows,
        recentEvents: recentEventsQuery.rows
      }
    });
    
  } catch (error) {
    logger.error(`Error al verificar cumplimiento: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al verificar cumplimiento',
      message: 'No se pudo verificar el estado de cumplimiento'
    });
  }
}

/**
 * Obtener logs de cumplimiento
 * GET /api/legal/compliance/logs
 */
async function getComplianceLogs(req, res) {
  try {
    const { patientId, eventType, limit = 50 } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (patientId) {
      whereConditions.push(`cl.patient_id = $${paramIndex}`);
      queryParams.push(patientId);
      paramIndex++;
    }
    
    if (eventType) {
      whereConditions.push(`cl.event_type = $${paramIndex}`);
      queryParams.push(eventType);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    const logsQuery = await databaseService.query(
      `SELECT 
         cl.id, cl.patient_id, cl.event_type, cl.event_data, cl.timestamp,
         p.name as patient_name
       FROM compliance_log cl
       JOIN patients p ON cl.patient_id = p.id
       ${whereClause}
       ORDER BY cl.timestamp DESC
       LIMIT $${paramIndex}`,
      [...queryParams, limit]
    );
    
    res.json({
      success: true,
      data: {
        logs: logsQuery.rows
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener logs de cumplimiento: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener logs',
      message: 'No se pudieron cargar los logs de cumplimiento'
    });
  }
}

/**
 * Generar reporte de cumplimiento
 * GET /api/legal/compliance/report
 */
async function generateComplianceReport(req, res) {
  try {
    const { dateFrom, dateTo, format = 'json' } = req.query;
    
    // Consulta de estadísticas generales
    const statsQuery = await databaseService.query(
      `SELECT 
         COUNT(DISTINCT p.id) as total_patients,
         COUNT(CASE WHEN ld.status = 'accepted' THEN 1 END) as documents_accepted,
         COUNT(CASE WHEN ld.status = 'pending' THEN 1 END) as documents_pending,
         COUNT(CASE WHEN qr.status = 'completed' THEN 1 END) as questionnaires_completed,
         COUNT(CASE WHEN cr.status = 'granted' THEN 1 END) as consents_granted
       FROM patients p
       LEFT JOIN legal_documents ld ON p.id = ld.patient_id
       LEFT JOIN questionnaire_responses qr ON p.id = qr.patient_id
       LEFT JOIN consent_records cr ON p.id = cr.patient_id`
    );
    
    // Cumplimiento por paciente
    const patientComplianceQuery = await databaseService.query(
      `SELECT 
         p.id, p.name, p.created_at as patient_since,
         COUNT(CASE WHEN ld.status = 'accepted' THEN 1 END) as documents_count,
         COUNT(CASE WHEN qr.status = 'completed' THEN 1 END) as questionnaires_count,
         COUNT(CASE WHEN cr.status = 'granted' THEN 1 END) as consents_count,
         CASE 
           WHEN COUNT(CASE WHEN ld.status = 'accepted' THEN 1 END) >= 3 
                AND COUNT(CASE WHEN qr.status = 'completed' THEN 1 END) >= 1 
           THEN 'compliant'
           WHEN COUNT(CASE WHEN ld.status = 'accepted' THEN 1 END) > 0 
                OR COUNT(CASE WHEN qr.status = 'completed' THEN 1 END) > 0
           THEN 'partial'
           ELSE 'pending'
         END as compliance_level
       FROM patients p
       LEFT JOIN legal_documents ld ON p.id = ld.patient_id
       LEFT JOIN questionnaire_responses qr ON p.id = qr.patient_id
       LEFT JOIN consent_records cr ON p.id = cr.patient_id
       GROUP BY p.id, p.name, p.created_at
       ORDER BY compliance_level, p.name`
    );
    
    const report = {
      generatedAt: new Date(),
      dateRange: {
        from: dateFrom,
        to: dateTo
      },
      summary: statsQuery.rows[0],
      patientCompliance: patientComplianceQuery.rows,
      complianceLevels: COMPLIANCE_LEVELS
    };
    
    if (format === 'pdf') {
      // Generar PDF del reporte
      const pdfContent = await generateCompliancePDF(report);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte_cumplimiento_lopd.pdf"');
      res.send(pdfContent);
    } else {
      res.json({
        success: true,
        data: report
      });
    }
    
  } catch (error) {
    logger.error(`Error al generar reporte: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al generar reporte',
      message: 'No se pudo generar el reporte de cumplimiento'
    });
  }
}

// ==============================================
// EXPORTACIÓN DE FUNCIONES
// ==============================================

module.exports = {
  // Controladores de documentos
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  
  // Controladores de cuestionarios
  getQuestionnaires,
  createQuestionnaire,
  submitCompliance,
  
  // Controladores de cumplimiento
  checkComplianceStatus,
  getComplianceLogs,
  generateComplianceReport,
  
  // Funciones auxiliares
  checkLOPDCompliance,
  logComplianceEvent,
  generateLegalPDF,
  generateLegalDocumentId,
  
  // Configuraciones
  LEGAL_DOCUMENT_TYPES,
  LOPD_PROCESSING_PURPOSES,
  COMPLIANCE_LEVELS
};
