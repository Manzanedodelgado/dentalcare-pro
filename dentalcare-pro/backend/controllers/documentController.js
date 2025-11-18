/**
 * CONTROLADOR DE GESTIÓN DE DOCUMENTOS
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Generación automática de documentos
 * - Gestión de plantillas de documentos
 * - Tracking de documentos enviados
 * - Documentos de consentimiento informados
 * - Documentos legales y cuestionarios
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const databaseService = require('../utils/databaseService');
const legalService = require('./legalController');
const logger = require('../utils/logger');
const { hasPermission } = require('./authController');

// ==============================================
// CONFIGURACIÓN DE DOCUMENTOS
// ==============================================

const DOCUMENT_TYPES = {
  CONSENT_INFORMED: {
    id: 'consent_informed',
    name: 'Consentimiento Informado',
    category: 'medical',
    required: true,
    template: 'consent_template.html'
  },
  MEDICAL_RECORD: {
    id: 'medical_record',
    name: 'Historial Médico',
    category: 'medical',
    required: false,
    template: 'medical_record_template.html'
  },
  TREATMENT_PLAN: {
    id: 'treatment_plan',
    name: 'Plan de Tratamiento',
    category: 'medical',
    required: false,
    template: 'treatment_plan_template.html'
  },
  PRESCRIPTION: {
    id: 'prescription',
    name: 'Receta Médica',
    category: 'medical',
    required: false,
    template: 'prescription_template.html'
  },
  INVOICE: {
    id: 'invoice',
    name: 'Factura',
    category: 'financial',
    required: false,
    template: 'invoice_template.html'
  },
  QUOTATION: {
    id: 'quotation',
    name: 'Presupuesto',
    category: 'financial',
    required: false,
    template: 'quotation_template.html'
  },
  LOPD_FORM: {
    id: 'lopd_form',
    name: 'Formulario LOPD',
    category: 'legal',
    required: true,
    template: 'lopd_form_template.html'
  },
  COMPLAINT_FORM: {
    id: 'complaint_form',
    name: 'Formulario de Reclamación',
    category: 'legal',
    required: false,
    template: 'complaint_form_template.html'
  }
};

const DOCUMENT_STATUS = {
  DRAFT: {
    id: 'draft',
    name: 'Borrador',
    color: 'gray',
    description: 'Documento en borrador'
  },
  GENERATED: {
    id: 'generated',
    name: 'Generado',
    color: 'blue',
    description: 'Documento generado y listo'
  },
  SENT: {
    id: 'sent',
    name: 'Enviado',
    color: 'orange',
    description: 'Documento enviado al paciente'
  },
  VIEWED: {
    id: 'viewed',
    name: 'Visto',
    color: 'green',
    description: 'Documento visto por el paciente'
  },
  SIGNED: {
    id: 'signed',
    name: 'Firmado',
    color: 'green',
    description: 'Documento firmado por el paciente'
  },
  EXPIRED: {
    id: 'expired',
    name: 'Expirado',
    color: 'red',
    description: 'Documento expirado'
  }
};

// ==============================================
// FUNCIONES AUXILIARES
// ==============================================

/**
 * Generar ID único para documento
 * @param {string} patientId - ID del paciente
 * @param {string} documentType - Tipo de documento
 * @returns {string} ID único
 */
function generateDocumentId(patientId, documentType) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `DOC_${patientId}_${documentType}_${timestamp}_${random}`;
}

/**
 * Generar nombre de archivo único
 * @param {string} documentId - ID del documento
 * @param {string} extension - Extensión del archivo
 * @returns {string} Nombre de archivo
 */
function generateFileName(documentId, extension = 'pdf') {
  return `${documentId}.${extension}`;
}

/**
 * Obtener ruta de almacenamiento para documentos
 * @param {string} documentId - ID del documento
 * @param {string} filename - Nombre del archivo
 * @returns {string} Ruta completa
 */
function getDocumentPath(documentId, filename) {
  const documentsDir = path.join(process.cwd(), 'documents');
  const patientDir = path.join(documentsDir, documentId.substring(0, 8)); // Primeros 8 caracteres del ID
  
  return path.join(patientDir, filename);
}

/**
 * Renderizar plantilla HTML con datos
 * @param {string} template - Plantilla HTML
 * @param {Object} data - Datos para renderizar
 * @returns {string} HTML renderizado
 */
function renderTemplate(template, data) {
  let rendered = template;
  
  // Reemplazar variables simples
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, data[key] || '');
  });
  
  // Reemplazar condicionales
  rendered = rendered.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
    return data[condition] ? content : '';
  });
  
  // Reemplazar bucles
  rendered = rendered.replace(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g, (match, arrayName, content) => {
    if (!Array.isArray(data[arrayName])) return '';
    
    return data[arrayName].map((item, index) => {
      let itemContent = content;
      Object.keys(item).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        itemContent = itemContent.replace(regex, item[key] || '');
      });
      return itemContent;
    }).join('');
  });
  
  return rendered;
}

/**
 * Generar documento desde plantilla
 * @param {Object} templateData - Datos de la plantilla
 * @param {Object} patientData - Datos del paciente
 * @returns {string} HTML del documento
 */
async function generateDocumentFromTemplate(templateData, patientData) {
  try {
    // Cargar plantilla
    const templatePath = path.join(__dirname, '..', 'templates', templateData.template);
    const templateContent = await fs.readFile(templatePath, 'utf8');
    
    // Preparar datos para renderización
    const renderData = {
      // Datos de la clínica
      clinic_name: process.env.CLINIC_NAME || 'Clínica Dental Rubio García',
      clinic_phone: process.env.WHATSAPP_PHONE_NUMBER || '34664218253',
      clinic_email: process.env.ADMIN_EMAIL || 'info@rubiogarciadental.com',
      clinic_address: 'Dirección de la Clínica',
      
      // Datos del paciente
      patient_name: patientData.name,
      patient_phone: patientData.phone,
      patient_email: patientData.email,
      patient_address: patientData.address,
      patient_birth_date: patientData.birth_date ? 
        new Date(patientData.birth_date).toLocaleDateString('es-ES') : '',
      
      // Datos del documento
      document_title: templateData.title,
      document_date: new Date().toLocaleDateString('es-ES'),
      document_id: generateDocumentId(patientData.id, templateData.type),
      
      // Datos específicos del tratamiento
      treatment_type: patientData.treatment_type || '',
      treatment_description: patientData.treatment_description || '',
      treatment_cost: patientData.treatment_cost || '',
      treatment_duration: patientData.treatment_duration || '',
      
      // Información legal
      legal_text: templateData.legal_text || '',
      signature_line: '_________________________',
      date_line: '_________________',
      
      // Datos adicionales
      ...patientData.additional_data
    };
    
    // Renderizar plantilla
    const renderedHtml = renderTemplate(templateContent, renderData);
    
    return renderedHtml;
    
  } catch (error) {
    logger.error(`Error al generar documento desde plantilla: ${error.message}`);
    throw error;
  }
}

/**
 * Validar datos requeridos para documento
 * @param {string} documentType - Tipo de documento
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 */
function validateDocumentData(documentType, data) {
  const requiredFields = {
    consent_informed: ['patientId', 'treatmentDescription', 'risks', 'benefits'],
    medical_record: ['patientId', 'medicalHistory', 'currentCondition'],
    treatment_plan: ['patientId', 'treatmentType', 'description', 'cost'],
    lopd_form: ['patientId', 'consentData']
  };
  
  const fields = requiredFields[documentType] || [];
  const missingFields = fields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Campos requeridos faltantes para ${documentType}: ${missingFields.join(', ')}`);
  }
  
  return data;
}

// ==============================================
// CONTROLADOR DE OBTENER DOCUMENTOS
// ==============================================

/**
 * Obtener lista de documentos con filtros
 * GET /api/documents
 */
async function getDocuments(req, res) {
  try {
    const {
      patientId,
      documentType,
      status,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Verificar permisos
    if (!hasPermission(req.user, 'documents.read')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para ver documentos'
      });
    }

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtros
    if (patientId) {
      whereConditions.push(`d.patient_id = $${paramIndex}`);
      queryParams.push(patientId);
      paramIndex++;
    }

    if (documentType) {
      whereConditions.push(`d.document_type = $${paramIndex}`);
      queryParams.push(documentType);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`d.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`DATE(d.created_at) >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`DATE(d.created_at) <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(d.title ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Consulta principal
    const documentsQuery = await databaseService.query(
      `SELECT 
         d.id, d.document_id, d.patient_id, d.document_type,
         d.title, d.description, d.status, d.file_path,
         d.file_size, d.mime_type, d.created_at, d.updated_at,
         d.sent_at, d.viewed_at, d.signed_at, d.expires_at,
         p.name as patient_name, p.phone as patient_phone, p.email as patient_email,
         CASE 
           WHEN d.status = 'draft' THEN '⚪ Borrador'
           WHEN d.status = 'generated' THEN '🔵 Generado'
           WHEN d.status = 'sent' THEN '🟡 Enviado'
           WHEN d.status = 'viewed' THEN '🟢 Visto'
           WHEN d.status = 'signed' THEN '✅ Firmado'
           WHEN d.status = 'expired' THEN '⏰ Expirado'
         END as status_label,
         CASE 
           WHEN d.expires_at IS NOT NULL AND d.expires_at < NOW() THEN true
           ELSE false
         END as is_expired
       FROM documents d
       JOIN patients p ON d.patient_id = p.id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    // Contar total
    const countQuery = await databaseService.query(
      `SELECT COUNT(*) as total
       FROM documents d
       JOIN patients p ON d.patient_id = p.id
       ${whereClause}`,
      queryParams
    );

    const total = parseInt(countQuery.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Obtener estadísticas
    const statsQuery = await databaseService.query(
      `SELECT 
         COUNT(*) as total_documents,
         COUNT(CASE WHEN status = 'generated' THEN 1 END) as generated,
         COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
         COUNT(CASE WHEN status = 'viewed' THEN 1 END) as viewed,
         COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed,
         COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 END) as expired
       FROM documents d
       ${whereClause.replace('d.', '')}`,
      queryParams
    );

    const stats = statsQuery.rows[0];

    res.json({
      success: true,
      data: {
        documents: documentsQuery.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        statistics: {
          total: parseInt(stats.total_documents),
          generated: parseInt(stats.generated),
          sent: parseInt(stats.sent),
          viewed: parseInt(stats.viewed),
          signed: parseInt(stats.signed),
          expired: parseInt(stats.expired)
        }
      }
    });

  } catch (error) {
    logger.error(`Error al obtener documentos: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener documentos',
      message: 'No se pudieron cargar los documentos'
    });
  }
}

// ==============================================
// CONTROLADOR DE GENERAR DOCUMENTO
// ==============================================

/**
 * Generar nuevo documento
 * POST /api/documents/generate
 */
async function generateDocument(req, res) {
  try {
    const {
      patientId,
      documentType,
      title,
      description,
      data,
      templateId,
      expiresIn = null
    } = req.body;

    // Verificar permisos
    if (!hasPermission(req.user, 'documents.generate')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para generar documentos'
      });
    }

    // Verificar tipo de documento válido
    if (!DOCUMENT_TYPES[documentType.toUpperCase()]) {
      return res.status(400).json({
        error: 'Tipo de documento inválido',
        message: 'El tipo de documento especificado no es válido'
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

    // Validar datos requeridos
    const validatedData = validateDocumentData(documentType, data || {});

    // Generar ID del documento
    const documentId = generateDocumentId(patientId, documentType);

    // Obtener plantilla si se especifica
    let templateData = null;
    if (templateId) {
      const templateQuery = await databaseService.query(
        'SELECT * FROM document_templates WHERE id = $1',
        [templateId]
      );
      
      if (templateQuery.rows.length > 0) {
        templateData = templateQuery.rows[0];
      }
    } else {
      // Usar plantilla por defecto del tipo de documento
      const documentTypeConfig = DOCUMENT_TYPES[documentType.toUpperCase()];
      templateData = {
        type: documentType,
        template: documentTypeConfig.template,
        title: documentTypeConfig.name,
        legal_text: 'Texto legal estándar'
      };
    }

    // Preparar datos para generación
    const documentData = {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      birth_date: patient.birth_date,
      treatment_type: validatedData.treatmentType,
      treatment_description: validatedData.treatmentDescription,
      treatment_cost: validatedData.treatmentCost,
      treatment_duration: validatedData.treatmentDuration,
      additional_data: validatedData
    };

    // Generar documento desde plantilla
    const generatedHtml = await generateDocumentFromTemplate(templateData, documentData);

    // Crear registro en base de datos
    const expiresAt = expiresIn ? 
      new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : // días a milisegundos
      null;

    const newDocumentQuery = await databaseService.query(
      `INSERT INTO documents (
         document_id, patient_id, document_type, title, description,
         content, status, created_at, updated_at, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, 'generated', NOW(), NOW(), $7)
       RETURNING *`,
      [
        documentId,
        patientId,
        documentType,
        title || templateData.title,
        description || '',
        generatedHtml,
        expiresAt
      ]
    );

    const newDocument = newDocumentQuery.rows[0];

    // Guardar archivo HTML en disco
    try {
      const fileName = generateFileName(documentId, 'html');
      const filePath = getDocumentPath(documentId, fileName);
      
      // Crear directorio si no existe
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(filePath, generatedHtml, 'utf8');
      
      // Actualizar ruta del archivo en la base de datos
      await databaseService.query(
        'UPDATE documents SET file_path = $1 WHERE id = $2',
        [filePath, newDocument.id]
      );
      
    } catch (fileError) {
      logger.warn(`Error al guardar archivo: ${fileError.message}`);
      // Continuar sin el archivo
    }

    logger.info(`Documento generado: ${documentId} por ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Documento generado correctamente',
      data: {
        document: {
          ...newDocument,
          patient_name: patient.name
        }
      }
    });

  } catch (error) {
    logger.error(`Error al generar documento: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al generar documento',
      message: error.message || 'No se pudo generar el documento'
    });
  }
}

// ==============================================
// CONTROLADOR DE DESCARGAR DOCUMENTO
// ==============================================

/**
 * Descargar documento
 * GET /api/documents/:id/download
 */
async function downloadDocument(req, res) {
  try {
    const { id: documentId } = req.params;
    const { format = 'html' } = req.query;

    // Verificar permisos
    if (!hasPermission(req.user, 'documents.read')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para descargar documentos'
      });
    }

    // Obtener documento
    const documentQuery = await databaseService.query(
      `SELECT d.*, p.name as patient_name 
       FROM documents d
       JOIN patients p ON d.patient_id = p.id
       WHERE d.id = $1`,
      [documentId]
    );

    if (documentQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Documento no encontrado',
        message: 'No se encontró el documento especificado'
      });
    }

    const document = documentQuery.rows[0];

    // Verificar si el documento ha expirado
    if (document.expires_at && new Date(document.expires_at) < new Date()) {
      return res.status(410).json({
        error: 'Documento expirado',
        message: 'Este documento ha expirado y ya no está disponible'
      });
    }

    let content;
    let mimeType;
    let fileName;

    switch (format.toLowerCase()) {
      case 'html':
        content = document.content;
        mimeType = 'text/html';
        fileName = `${document.document_id}.html`;
        break;
        
      case 'pdf':
        // Aquí se podría convertir HTML a PDF usando puppeteer
        // Por simplicidad, devolvemos HTML con header PDF
        content = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${document.title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; margin-bottom: 40px; }
              .content { margin: 20px 0; }
              .footer { margin-top: 40px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            ${document.content}
          </body>
          </html>
        `;
        mimeType = 'text/html';
        fileName = `${document.document_id}.html`;
        break;
        
      default:
        content = document.content;
        mimeType = 'text/html';
        fileName = `${document.document_id}.html`;
    }

    // Actualizar estado de visualización
    if (document.status === 'generated' || document.status === 'sent') {
      await databaseService.query(
        'UPDATE documents SET status = $1, viewed_at = NOW() WHERE id = $2',
        ['viewed', documentId]
      );
    }

    // Configurar headers para descarga
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', Buffer.byteLength(content));

    logger.info(`Documento descargado: ${document.document_id} por ${req.user.email}`);

    res.send(content);

  } catch (error) {
    logger.error(`Error al descargar documento: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al descargar documento',
      message: 'No se pudo descargar el documento'
    });
  }
}

// ==============================================
// CONTROLADOR DE ELIMINAR DOCUMENTO
// ==============================================

/**
 * Eliminar documento
 * DELETE /api/documents/:id
 */
async function deleteDocument(req, res) {
  try {
    const { id: documentId } = req.params;

    // Verificar permisos
    if (!hasPermission(req.user, 'documents.delete')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para eliminar documentos'
      });
    }

    // Verificar que el documento existe
    const documentQuery = await databaseService.query(
      'SELECT * FROM documents WHERE id = $1',
      [documentId]
    );

    if (documentQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Documento no encontrado',
        message: 'No se encontró el documento especificado'
      });
    }

    const document = documentQuery.rows[0];

    // No permitir eliminar documentos firmados o enviados
    if (['signed', 'sent'].includes(document.status)) {
      return res.status(400).json({
        error: 'No se puede eliminar',
        message: 'No se puede eliminar un documento que ha sido enviado o firmado'
      });
    }

    // Eliminar archivo físico si existe
    if (document.file_path) {
      try {
        await fs.unlink(document.file_path);
      } catch (fileError) {
        logger.warn(`Error al eliminar archivo físico: ${fileError.message}`);
      }
    }

    // Eliminar registro de la base de datos
    await databaseService.query('DELETE FROM documents WHERE id = $1', [documentId]);

    logger.info(`Documento eliminado: ${document.document_id} por ${req.user.email}`);

    res.json({
      success: true,
      message: 'Documento eliminado correctamente',
      data: {
        documentId,
        deletedAt: new Date()
      }
    });

  } catch (error) {
    logger.error(`Error al eliminar documento: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al eliminar documento',
      message: 'No se pudo eliminar el documento'
    });
  }
}

// ==============================================
// EXPORTACIÓN DE FUNCIONES
// ==============================================

module.exports = {
  // Controladores principales
  getDocuments,
  generateDocument,
  downloadDocument,
  deleteDocument,
  
  // Funciones auxiliares
  generateDocumentId,
  generateFileName,
  getDocumentPath,
  renderTemplate,
  generateDocumentFromTemplate,
  validateDocumentData,
  
  // Configuraciones
  DOCUMENT_TYPES,
  DOCUMENT_STATUS
};
