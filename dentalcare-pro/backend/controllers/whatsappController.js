/**
 * CONTROLADOR DE WHATSAPP Y SISTEMA DE URGENCIAS
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Integración con WhatsApp usando Baileys
 * - Sistema de codificación por colores para urgencias
 * - Panel especializado de conversaciones urgentes
 * - Detección automática de palabras clave de urgencia
 * - Envío y recepción de mensajes automatizados
 * - Escalamiento automático de casos críticos
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const { getConnection, getMessageHistory, sendMessage } = require('../utils/whatsappService');
const databaseService = require('../utils/databaseService');
const logger = require('../utils/logger');
const { detectUrgency, categorizeConversation } = require('../utils/urgencyDetection');

// ==============================================
// CONFIGURACIÓN DEL SISTEMA DE URGENCIAS
// ==============================================

const URGENT_COLORS = {
  GREEN: 'green',
  YELLOW: 'yellow', 
  ORANGE: 'orange',
  RED: 'red'
};

const URGENCY_LEVELS = {
  NORMAL: {
    color: URGENT_COLORS.GREEN,
    level: 1,
    description: 'Conversación normal',
    priority: 'low'
  },
  MODERATE: {
    color: URGENT_COLORS.YELLOW,
    level: 2,
    description: 'Requiere atención moderada',
    priority: 'medium'
  },
  URGENT: {
    color: URGENT_COLORS.ORANGE,
    level: 3,
    description: 'Urgente - requiere intervención inmediata',
    priority: 'high'
  },
  CRITICAL: {
    color: URGENT_COLORS.RED,
    level: 4,
    description: 'Crítico - atención prioritaria',
    priority: 'critical'
  }
};

// Palabras clave para detección automática de urgencias
const URGENCY_KEYWORDS = [
  // Urgencias dentales específicas
  'dolor', 'dolor de muela', 'muela', 'muelas', 'quiste', 'infección',
  'sangrado', 'sangra', 'sangro', 'sangrado', 'hemorragia', 'hemorragia',
  'emergencia', 'urgencia', 'urgente', 'importante', 'asap', 'pronto',
  'fiebre', 'febril', 'fiebre alta', 'malestar', 'malestar general',
  'hinchazón', 'hincha', 'hinchados', 'inflamado', 'inflamación',
  'fractura', 'roto', 'rota', 'rotos', 'rotas', 'accidente',
  'trauma', 'traumático', 'traumático', 'golpe', 'golpes',
  
  // Síntomas graves
  'no puedo', 'no puedo comer', 'no puedo dormir', 'insoportable',
  'terrible', 'horrible', 'muy mal', 'dolor insoportable',
  'necesito', 'necesito ayuda', 'ayuda', 'socorro',
  'puedo venir', 'puedo ir', 'necesito cita', 'cita urgente',
  'ahora', 'hoy', 'esta noche', 'mañana temprano',
  
  // Términos médicos urgentes
  'absceso', 'celulitis', 'pericoronitis', 'periodontitis',
  'pulpotomía', 'endodoncia', 'trauma dental', 'luxación',
  'fractura dental', 'avulsión', 'corona rota', 'implante',
  'postoperatorio', 'post operatorio', 'complicación',
  
  // Situaciones extremas
  'desmayo', 'desmayé', 'desmayos', 'pérdida de conciencia',
  'dificultad respirar', 'no puedo respirar', 'sofoco', 'sofoca',
  'alergia', 'reacción alérgica', 'urticaria', 'anafilaxia'
];

// ==============================================
// FUNCIONES AUXILIARES PARA URGENCIAS
// ==============================================

/**
 * Analizar mensaje para detectar nivel de urgencia
 * @param {string} message - Mensaje a analizar
 * @returns {Object} Nivel de urgencia detectado
 */
function analyzeMessageUrgency(message) {
  const lowerMessage = message.toLowerCase();
  let urgencyScore = 0;
  let detectedKeywords = [];
  
  // Verificar cada palabra clave
  URGENCY_KEYWORDS.forEach(keyword => {
    if (lowerMessage.includes(keyword)) {
      urgencyScore += 1;
      detectedKeywords.push(keyword);
    }
  });
  
  // Determinar nivel de urgencia basado en el puntaje
  let urgencyLevel;
  if (urgencyScore >= 5) {
    urgencyLevel = URGENCY_LEVELS.CRITICAL;
  } else if (urgencyScore >= 3) {
    urgencyLevel = URGENCY_LEVELS.URGENT;
  } else if (urgencyScore >= 1) {
    urgencyLevel = URGENCY_LEVELS.MODERATE;
  } else {
    urgencyLevel = URGENCY_LEVELS.NORMAL;
  }
  
  return {
    level: urgencyLevel,
    score: urgencyScore,
    keywords: detectedKeywords,
    timestamp: new Date()
  };
}

/**
 * Marcar conversación como urgente
 * @param {string} conversationId - ID de la conversación
 * @param {string} urgencyLevel - Nivel de urgencia
 * @param {string} reason - Razón del marcado
 * @param {string} userId - ID del usuario que marca
 */
async function markConversationAsUrgent(conversationId, urgencyLevel, reason, userId) {
  try {
    await databaseService.query(
      `UPDATE conversations 
       SET urgency_level = $1, urgent_reason = $2, marked_urgent_by = $3, 
           marked_urgent_at = NOW()
       WHERE id = $4`,
      [urgencyLevel, reason, userId, conversationId]
    );
    
    // Registrar el evento de urgencia
    await databaseService.query(
      `INSERT INTO urgency_events (conversation_id, urgency_level, reason, user_id, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [conversationId, urgencyLevel, reason, userId]
    );
    
    logger.info(`Conversación ${conversationId} marcada como ${urgencyLevel} por usuario ${userId}`);
    
  } catch (error) {
    logger.error(`Error al marcar conversación como urgente: ${error.message}`);
    throw error;
  }
}

/**
 * Obtener estadísticas de WhatsApp
 * @returns {Object} Estadísticas del día
 */
async function getWhatsAppStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const statsQuery = await databaseService.query(
      `SELECT 
         COUNT(*) as total_conversations,
         COUNT(CASE WHEN urgency_level = 'orange' THEN 1 END) as urgent_conversations,
         COUNT(CASE WHEN urgency_level = 'red' THEN 1 END) as critical_conversations,
         COUNT(CASE WHEN created_at >= $1 THEN 1 END) as today_conversations,
         COUNT(CASE WHEN last_message_at >= $1 THEN 1 END) as active_conversations
       FROM conversations`,
      [today]
    );
    
    const stats = statsQuery.rows[0];
    
    return {
      totalConversations: parseInt(stats.total_conversations),
      urgentConversations: parseInt(stats.urgent_conversations),
      criticalConversations: parseInt(stats.critical_conversations),
      todayConversations: parseInt(stats.today_conversations),
      activeConversations: parseInt(stats.active_conversations),
      urgentPercentage: stats.total_conversations > 0 
        ? ((stats.urgent_conversations / stats.total_conversations) * 100).toFixed(1)
        : 0
    };
    
  } catch (error) {
    logger.error(`Error al obtener estadísticas: ${error.message}`);
    return {
      totalConversations: 0,
      urgentConversations: 0,
      criticalConversations: 0,
      todayConversations: 0,
      activeConversations: 0,
      urgentPercentage: 0
    };
  }
}

// ==============================================
// CONTROLADOR DE CONVERSACIONES
// ==============================================

/**
 * Obtener todas las conversaciones con filtros
 * GET /api/whatsapp/conversations
 */
async function getConversations(req, res) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      urgencyLevel,
      search,
      dateFrom,
      dateTo
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    // Construir filtros
    if (status) {
      whereConditions.push(`c.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (urgencyLevel) {
      whereConditions.push(`c.urgency_level = $${paramIndex}`);
      queryParams.push(urgencyLevel);
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(c.patient_name ILIKE $${paramIndex} OR c.last_message ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    if (dateFrom) {
      whereConditions.push(`c.created_at >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }
    
    if (dateTo) {
      whereConditions.push(`c.created_at <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Consulta principal
    const conversationsQuery = await databaseService.query(
      `SELECT 
         c.id, c.whatsapp_number, c.patient_name, c.patient_phone,
         c.last_message, c.last_message_at, c.urgency_level,
         c.status, c.unread_count, c.created_at, c.updated_at,
         CASE 
           WHEN c.urgency_level = 'orange' THEN 'Urgente'
           WHEN c.urgency_level = 'red' THEN 'Crítico'
           WHEN c.urgency_level = 'yellow' THEN 'Moderado'
           ELSE 'Normal'
         END as urgency_label,
         CASE 
           WHEN c.last_message_at > NOW() - INTERVAL '1 hour' THEN 'Reciente'
           WHEN c.last_message_at > NOW() - INTERVAL '24 hours' THEN 'Activa'
           ELSE 'Antigua'
         END as activity_status
       FROM conversations c
       ${whereClause}
       ORDER BY 
         CASE c.urgency_level
           WHEN 'red' THEN 1
           WHEN 'orange' THEN 2  
           WHEN 'yellow' THEN 3
           WHEN 'green' THEN 4
         END,
         c.last_message_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );
    
    // Contar total para paginación
    const countQuery = await databaseService.query(
      `SELECT COUNT(*) as total
       FROM conversations c
       ${whereClause}`,
      queryParams
    );
    
    const total = parseInt(countQuery.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data: {
        conversations: conversationsQuery.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener conversaciones: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener conversaciones',
      message: 'No se pudieron cargar las conversaciones'
    });
  }
}

// ==============================================
// CONTROLADOR DE CONVERSACIONES URGENTES
// ==============================================

/**
 * Obtener solo conversaciones urgentes (codificadas en naranja)
 * GET /api/whatsapp/urgent/conversations
 */
async function getUrgentConversations(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Solo conversaciones marcadas como urgentes (naranja o rojo)
    const urgentConversationsQuery = await databaseService.query(
      `SELECT 
         c.id, c.whatsapp_number, c.patient_name, c.patient_phone,
         c.last_message, c.last_message_at, c.urgency_level,
         c.status, c.unread_count, c.created_at, c.updated_at,
         c.urgent_reason, c.marked_urgent_by, c.marked_urgent_at,
         u.name as marked_by_name,
         CASE 
           WHEN c.urgency_level = 'orange' THEN 'Urgente'
           WHEN c.urgency_level = 'red' THEN 'Crítico'
         END as urgency_label,
         CASE 
           WHEN c.marked_urgent_at > NOW() - INTERVAL '1 hour' THEN 'Reciente'
           WHEN c.marked_urgent_at > NOW() - INTERVAL '24 hours' THEN 'Hoy'
           WHEN c.marked_urgent_at > NOW() - INTERVAL '7 days' THEN 'Esta semana'
           ELSE 'Anterior'
         END as urgency_timeline
       FROM conversations c
       LEFT JOIN users u ON c.marked_urgent_by = u.id
       WHERE c.urgency_level IN ('orange', 'red')
       ORDER BY 
         CASE c.urgency_level
           WHEN 'red' THEN 1
           WHEN 'orange' THEN 2
         END,
         c.marked_urgent_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    // Contar total de urgentes
    const countQuery = await databaseService.query(
      `SELECT COUNT(*) as total
       FROM conversations
       WHERE urgency_level IN ('orange', 'red')`
    );
    
    const total = parseInt(countQuery.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data: {
        conversations: urgentConversationsQuery.rows,
        summary: {
          totalUrgent: total,
          criticalCount: urgentConversationsQuery.rows.filter(c => c.urgency_level === 'red').length,
          urgentCount: urgentConversationsQuery.rows.filter(c => c.urgency_level === 'orange').length
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener conversaciones urgentes: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener conversaciones urgentes',
      message: 'No se pudieron cargar las conversaciones urgentes'
    });
  }
}

// ==============================================
// CONTROLADOR DE MARCADO COMO URGENTE
// ==============================================

/**
 * Marcar conversación como urgente manualmente
 * POST /api/whatsapp/conversations/:id/urgent
 */
async function markAsUrgent(req, res) {
  try {
    const { id: conversationId } = req.params;
    const { urgencyLevel, reason } = req.body;
    const userId = req.user.id;
    
    // Validar nivel de urgencia
    const validUrgencyLevels = ['orange', 'red'];
    if (!validUrgencyLevels.includes(urgencyLevel)) {
      return res.status(400).json({
        error: 'Nivel de urgencia inválido',
        message: 'Solo se pueden marcar conversaciones como urgente (orange) o crítico (red)'
      });
    }
    
    // Verificar que la conversación existe
    const conversationQuery = await databaseService.query(
      'SELECT id, patient_name, whatsapp_number FROM conversations WHERE id = $1',
      [conversationId]
    );
    
    if (conversationQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Conversación no encontrada',
        message: 'No se encontró la conversación especificada'
      });
    }
    
    const conversation = conversationQuery.rows[0];
    
    // Marcar como urgente
    await markConversationAsUrgent(
      conversationId, 
      urgencyLevel, 
      reason || 'Marcado manualmente por usuario',
      userId
    );
    
    // Enviar notificación si es muy urgente (rojo)
    if (urgencyLevel === 'red') {
      // Aquí se podría enviar notificación al equipo médico
      logger.warn(`CONVERSACIÓN CRÍTICA: ${conversation.patient_name} (${conversation.whatsapp_number}) requiere atención inmediata`);
    }
    
    logger.info(`Conversación ${conversationId} marcada como ${urgencyLevel} por usuario ${userId}`);
    
    res.json({
      success: true,
      message: `Conversación marcada como ${
        urgencyLevel === 'red' ? 'crítica' : 'urgente'
      } correctamente`,
      data: {
        conversationId,
        urgencyLevel,
        reason: reason || 'Marcado manualmente por usuario',
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    logger.error(`Error al marcar conversación como urgente: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al marcar conversación como urgente',
      message: 'No se pudo marcar la conversación como urgente'
    });
  }
}

// ==============================================
// CONTROLADOR DE ENVÍO DE MENSAJES
// ==============================================

/**
 * Enviar mensaje manual a través de WhatsApp
 * POST /api/whatsapp/messages/send
 */
async function sendMessage(req, res) {
  try {
    const { conversationId, phoneNumber, message, messageType = 'text' } = req.body;
    const userId = req.user.id;
    
    let targetPhone;
    
    // Determinar número de destino
    if (conversationId) {
      const conversationQuery = await databaseService.query(
        'SELECT whatsapp_number, patient_name FROM conversations WHERE id = $1',
        [conversationId]
      );
      
      if (conversationQuery.rows.length === 0) {
        return res.status(404).json({
          error: 'Conversación no encontrada',
          message: 'No se encontró la conversación especificada'
        });
      }
      
      targetPhone = conversationQuery.rows[0].whatsapp_number;
    } else if (phoneNumber) {
      targetPhone = phoneNumber;
    } else {
      return res.status(400).json({
        error: 'Número de teléfono requerido',
        message: 'Se debe especificar un número de teléfono o ID de conversación'
      });
    }
    
    // Analizar urgencia del mensaje
    const urgencyAnalysis = analyzeMessageUrgency(message);
    
    // Enviar mensaje a través del servicio de WhatsApp
    const messageResult = await sendMessage(targetPhone, message);
    
    if (!messageResult.success) {
      return res.status(500).json({
        error: 'Error al enviar mensaje',
        message: messageResult.error
      });
    }
    
    // Registrar mensaje en base de datos
    const savedMessage = await databaseService.query(
      `INSERT INTO messages (conversation_id, whatsapp_number, message, message_type, 
                             direction, urgency_level, keywords_detected, sent_by, sent_at)
       VALUES ($1, $2, $3, $4, 'outbound', $5, $6, $7, NOW())
       RETURNING id, sent_at`,
      [conversationId || null, targetPhone, message, messageType,
       urgencyAnalysis.level.color, JSON.stringify(urgencyAnalysis.keywords), userId]
    );
    
    // Actualizar conversación si existe
    if (conversationId) {
      await databaseService.query(
        `UPDATE conversations 
         SET last_message = $1, last_message_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [message, conversationId]
      );
    } else {
      // Crear nueva conversación si no existe
      const newConversation = await databaseService.query(
        `INSERT INTO conversations (whatsapp_number, patient_name, last_message, 
                                   last_message_at, urgency_level, status, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), $4, 'active', NOW(), NOW())
         RETURNING id`,
        [targetPhone, targetPhone, message, urgencyAnalysis.level.color]
      );
      
      // Actualizar mensaje con el ID de conversación
      await databaseService.query(
        'UPDATE messages SET conversation_id = $1 WHERE id = $2',
        [newConversation.rows[0].id, savedMessage.rows[0].id]
      );
    }
    
    logger.info(`Mensaje enviado a ${targetPhone} por usuario ${userId} - Urgencia: ${urgencyAnalysis.level.description}`);
    
    res.json({
      success: true,
      message: 'Mensaje enviado correctamente',
      data: {
        messageId: savedMessage.rows[0].id,
        phoneNumber: targetPhone,
        urgencyLevel: urgencyAnalysis.level.color,
        urgencyScore: urgencyAnalysis.score,
        keywordsDetected: urgencyAnalysis.keywords,
        sentAt: savedMessage.rows[0].sent_at
      }
    });
    
  } catch (error) {
    logger.error(`Error al enviar mensaje: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al enviar mensaje',
      message: 'No se pudo enviar el mensaje'
    });
  }
}

// ==============================================
// CONTROLADOR DE MENSAJES DE CONVERSACIÓN
// ==============================================

/**
 * Obtener mensajes de una conversación específica
 * GET /api/whatsapp/conversations/:id/messages
 */
async function getMessages(req, res) {
  try {
    const { id: conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    // Verificar que la conversación existe
    const conversationQuery = await databaseService.query(
      'SELECT id, whatsapp_number, patient_name FROM conversations WHERE id = $1',
      [conversationId]
    );
    
    if (conversationQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Conversación no encontrada',
        message: 'No se encontró la conversación especificada'
      });
    }
    
    const conversation = conversationQuery.rows[0];
    
    // Obtener mensajes de la conversación
    const messagesQuery = await databaseService.query(
      `SELECT 
         m.id, m.message, m.message_type, m.direction, m.urgency_level,
         m.keywords_detected, m.sent_at, m.read_at,
         u.name as sent_by_name,
         CASE 
           WHEN m.direction = 'inbound' THEN 'Recibido'
           WHEN m.direction = 'outbound' THEN 'Enviado'
         END as direction_label
       FROM messages m
       LEFT JOIN users u ON m.sent_by = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.sent_at ASC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );
    
    // Marcar mensajes como leídos
    await databaseService.query(
      'UPDATE conversations SET unread_count = 0 WHERE id = $1',
      [conversationId]
    );
    
    // Contar total de mensajes
    const countQuery = await databaseService.query(
      'SELECT COUNT(*) as total FROM messages WHERE conversation_id = $1',
      [conversationId]
    );
    
    const total = parseInt(countQuery.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          patientName: conversation.patient_name,
          phoneNumber: conversation.whatsapp_number
        },
        messages: messagesQuery.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener mensajes: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener mensajes',
      message: 'No se pudieron cargar los mensajes de la conversación'
    });
  }
}

// ==============================================
// CONTROLADOR DE ESTADO DE WHATSAPP
// ==============================================

/**
 * Obtener estado de conexión de WhatsApp
 * GET /api/whatsapp/status
 */
async function getStatus(req, res) {
  try {
    const connection = getConnection();
    
    const status = {
      connected: connection?.ws?.readyState === 1,
      connectionState: connection?.ws?.readyState || 'disconnected',
      lastActivity: new Date(),
      qrCode: connection?.qr || null,
      deviceInfo: connection?.info || null,
      uptime: process.uptime(),
      sessionActive: connection?.sessionActive || false
    };
    
    // Obtener estadísticas adicionales
    const stats = await getWhatsAppStats();
    
    res.json({
      success: true,
      data: {
        connection: status,
        statistics: stats,
        system: {
          version: '1.0.0',
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          environment: process.env.NODE_ENV
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener estado de WhatsApp: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener estado',
      message: 'No se pudo obtener el estado de WhatsApp'
    });
  }
}

// ==============================================
// CONTROLADOR DE AUTO-RESPUESTAS
// ==============================================

/**
 * Configurar auto-respuestas para WhatsApp
 * POST /api/whatsapp/auto-reply
 */
async function configureAutoReply(req, res) {
  try {
    const {
      enabled = true,
      responses = [],
      workingHours = { start: '09:00', end: '18:00' },
      urgencyKeywords = URGENCY_KEYWORDS
    } = req.body;
    
    // Guardar configuración
    const configQuery = await databaseService.query(
      `INSERT INTO whatsapp_config (auto_reply_enabled, responses, working_hours, 
                                   urgency_keywords, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) 
       DO UPDATE SET 
         auto_reply_enabled = EXCLUDED.auto_reply_enabled,
         responses = EXCLUDED.responses,
         working_hours = EXCLUDED.working_hours,
         urgency_keywords = EXCLUDED.urgency_keywords,
         updated_by = EXCLUDED.updated_by,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [enabled, JSON.stringify(responses), JSON.stringify(workingHours), 
       JSON.stringify(urgencyKeywords), req.user.id]
    );
    
    logger.info(`Configuración de auto-respuesta actualizada por usuario ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Configuración de auto-respuesta actualizada',
      data: configQuery.rows[0]
    });
    
  } catch (error) {
    logger.error(`Error al configurar auto-respuestas: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al configurar auto-respuestas',
      message: 'No se pudo actualizar la configuración'
    });
  }
}

// ==============================================
// CONTROLADOR DE ESTADÍSTICAS
// ==============================================

/**
 * Obtener estadísticas detalladas de WhatsApp
 * GET /api/whatsapp/stats
 */
async function getStats(req, res) {
  try {
    const { period = 'today' } = req.query;
    
    let dateFilter;
    const today = new Date();
    
    switch (period) {
      case 'today':
        today.setHours(0, 0, 0, 0);
        dateFilter = today;
        break;
      case 'week':
        today.setDate(today.getDate() - 7);
        dateFilter = today;
        break;
      case 'month':
        today.setMonth(today.getMonth() - 1);
        dateFilter = today;
        break;
      default:
        dateFilter = null;
    }
    
    const whereClause = dateFilter ? `WHERE created_at >= $1` : '';
    const params = dateFilter ? [dateFilter] : [];
    
    // Estadísticas detalladas
    const statsQuery = await databaseService.query(
      `SELECT 
         COUNT(DISTINCT c.id) as total_conversations,
         COUNT(DISTINCT CASE WHEN m.direction = 'inbound' THEN c.id END) as conversations_with_inbound,
         COUNT(m.id) as total_messages,
         COUNT(CASE WHEN m.direction = 'inbound' THEN 1 END) as inbound_messages,
         COUNT(CASE WHEN m.direction = 'outbound' THEN 1 END) as outbound_messages,
         COUNT(CASE WHEN c.urgency_level IN ('orange', 'red') THEN 1 END) as urgent_conversations,
         COUNT(CASE WHEN c.urgency_level = 'red' THEN 1 END) as critical_conversations,
         COUNT(CASE WHEN c.urgency_level = 'yellow' THEN 1 END) as moderate_conversations,
         COUNT(CASE WHEN c.urgency_level = 'green' THEN 1 END) as normal_conversations
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       ${whereClause}`,
      params
    );
    
    // Mensajes por hora (últimas 24 horas)
    const hourlyQuery = await databaseService.query(
      `SELECT 
         EXTRACT(hour FROM sent_at) as hour,
         COUNT(*) as message_count
       FROM messages
       WHERE sent_at >= NOW() - INTERVAL '24 hours'
       GROUP BY EXTRACT(hour FROM sent_at)
       ORDER BY hour`
    );
    
    // Top palabras clave detectadas
    const keywordsQuery = await databaseService.query(
      `SELECT 
         jsonb_array_elements_text(keywords_detected) as keyword,
         COUNT(*) as frequency
       FROM messages
       WHERE keywords_detected IS NOT NULL
         AND sent_at >= COALESCE($1, NOW() - INTERVAL '30 days')
       GROUP BY jsonb_array_elements_text(keywords_detected)
       ORDER BY frequency DESC
       LIMIT 10`,
      [dateFilter]
    );
    
    const stats = statsQuery.rows[0];
    
    res.json({
      success: true,
      data: {
        period,
        dateRange: {
          from: dateFilter,
          to: new Date()
        },
        summary: {
          totalConversations: parseInt(stats.total_conversations),
          conversationsWithInbound: parseInt(stats.conversations_with_inbound),
          totalMessages: parseInt(stats.total_messages),
          inboundMessages: parseInt(stats.inbound_messages),
          outboundMessages: parseInt(stats.outbound_messages)
        },
        urgencyDistribution: {
          urgent: parseInt(stats.urgent_conversations),
          critical: parseInt(stats.critical_conversations),
          moderate: parseInt(stats.moderate_conversations),
          normal: parseInt(stats.normal_conversations)
        },
        hourlyDistribution: hourlyQuery.rows,
        topKeywords: keywordsQuery.rows,
        urgentPercentage: stats.total_conversations > 0 
          ? ((stats.urgent_conversations / stats.total_conversations) * 100).toFixed(1)
          : 0
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener estadísticas: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener estadísticas',
      message: 'No se pudieron cargar las estadísticas'
    });
  }
}

// ==============================================
// EXPORTACIÓN DE FUNCIONES
// ==============================================

module.exports = {
  // Controladores principales
  getConversations,
  getUrgentConversations,
  markAsUrgent,
  sendMessage,
  getMessages,
  getStatus,
  configureAutoReply,
  getStats,
  
  // Utilidades para otros módulos
  URGENCY_LEVELS,
  URGENT_COLORS,
  URGENCY_KEYWORDS,
  analyzeMessageUrgency,
  markConversationAsUrgent,
  getWhatsAppStats
};
