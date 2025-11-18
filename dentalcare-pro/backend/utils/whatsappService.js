/**
 * SERVICIO DE INTEGRACIÓN WHATSAPP CON BAILEYS
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Integración con WhatsApp sin API Business
 * - Envío y recepción de mensajes
 * - Manejo de sesiones
 * - Soporte para archivos multimedia
 * - Detección automática de urgencias
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const { 
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeInMemoryStore
} = require('baileys');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const databaseService = require('./databaseService');
const logger = require('./logger');

// ==============================================
// CONFIGURACIÓN DE WHATSAPP
// ==============================================

const WHATSAPP_CONFIG = {
  SESSIONS_PATH: process.env.WHATSAPP_SESSIONS_PATH || './whatsapp-sessions',
  TIMEOUT: parseInt(process.env.WHATSAPP_TIMEOUT) || 30000,
  RETRY_ATTEMPTS: parseInt(process.env.WHATSAPP_RETRY_ATTEMPTS) || 3,
  PHONE_NUMBER: process.env.WHATSAPP_PHONE_NUMBER,
  AUTO_REPLY_ENABLED: true,
  URGENCY_KEYWORDS: [
    'dolor', 'sangrado', 'emergencia', 'urgente', 'importante',
    'fiebre', 'hinchazón', 'accidente', 'trauma', 'quiste',
    'infección', 'malestar', 'terrible', 'horrible', 'insoportable'
  ]
};

// Palabras clave para detección de urgencias
const URGENCY_KEYWORDS = {
  DENTAL_EMERGENCY: [
    'dolor', 'dolor de muela', 'muela', 'muelas', 'quiste', 'infección',
    'sangrado', 'hemorragia', 'desmayo', 'fiebre', 'malestar general',
    'hinchazón', 'inflamado', 'fractura', 'roto', 'accidente', 'trauma'
  ],
  URGENT_TERMS: [
    'emergencia', 'urgencia', 'urgente', 'importante', 'asap', 'pronto',
    'necesito', 'necesito ayuda', 'ayuda', 'socorro', 'puedo venir',
    'ahora', 'hoy', 'esta noche', 'mañana temprano'
  ],
  SYMPTOMS: [
    'no puedo', 'no puedo comer', 'no puedo dormir', 'terrible',
    'horrible', 'muy mal', 'dolor insoportable', 'no respiro bien'
  ]
};

// ==============================================
// ESTADO GLOBAL DEL SERVICIO
// ==============================================

let sock = null;
let qrCode = null;
let connectionState = 'disconnected';
let sessionActive = false;
let isConnecting = false;

// ==============================================
// FUNCIONES DE UTILIDAD
// ==============================================

/**
 * Generar ID único para sesión de WhatsApp
 */
function generateSessionId() {
  return `session_${Date.now()}_${uuidv4()}`;
}

/**
 * Crear directorio de sesiones si no existe
 */
async function ensureSessionsDirectory() {
  try {
    await fs.access(WHATSAPP_CONFIG.SESSIONS_PATH);
  } catch (error) {
    await fs.mkdir(WHATSAPP_CONFIG.SESSIONS_PATH, { recursive: true });
    logger.info(`Created WhatsApp sessions directory: ${WHATSAPP_CONFIG.SESSIONS_PATH}`);
  }
}

/**
 * Analizar mensaje para detectar urgencia
 */
function analyzeMessageForUrgency(message) {
  const lowerMessage = message.toLowerCase();
  let urgencyScore = 0;
  let detectedKeywords = [];
  let urgencyLevel = 'normal';

  // Verificar palabras clave de emergencia dental
  for (const keyword of URGENCY_KEYWORDS.DENTAL_EMERGENCY) {
    if (lowerMessage.includes(keyword)) {
      urgencyScore += 3;
      detectedKeywords.push(keyword);
    }
  }

  // Verificar términos urgentes
  for (const keyword of URGENCY_KEYWORDS.URGENT_TERMS) {
    if (lowerMessage.includes(keyword)) {
      urgencyScore += 2;
      detectedKeywords.push(keyword);
    }
  }

  // Verificar síntomas
  for (const keyword of URGENCY_KEYWORDS.SYMPTOMS) {
    if (lowerMessage.includes(keyword)) {
      urgencyScore += 2;
      detectedKeywords.push(keyword);
    }
  }

  // Determinar nivel de urgencia
  if (urgencyScore >= 8) {
    urgencyLevel = 'critical';
  } else if (urgencyScore >= 4) {
    urgencyLevel = 'urgent';
  } else if (urgencyScore >= 2) {
    urgencyLevel = 'moderate';
  }

  return {
    urgencyLevel,
    urgencyScore,
    detectedKeywords,
    isUrgent: urgencyLevel !== 'normal'
  };
}

/**
 * Formatear número de teléfono para WhatsApp
 */
function formatPhoneNumber(phoneNumber) {
  // Remover caracteres no numéricos
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Añadir prefijo + si no lo tiene
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  return phoneNumber;
}

/**
 * Guardar mensaje en base de datos
 */
async function saveMessage(messageData) {
  try {
    const {
      conversationId,
      phoneNumber,
      message,
      messageType = 'text',
      direction,
      urgencyLevel,
      keywords
    } = messageData;

    // Buscar o crear conversación
    const conversationQuery = await databaseService.query(
      `INSERT INTO conversations (
         whatsapp_number, patient_name, last_message, last_message_at,
         urgency_level, status, created_at, updated_at
       ) VALUES ($1, $2, $3, NOW(), $4, 'active', NOW(), NOW())
       ON CONFLICT (whatsapp_number) 
       DO UPDATE SET 
         last_message = EXCLUDED.last_message,
         last_message_at = NOW(),
         urgency_level = EXCLUDED.urgency_level,
         updated_at = NOW()
       RETURNING id`,
      [
        phoneNumber,
        phoneNumber, // Por defecto, usar el número como nombre
        message,
        urgencyLevel || 'normal'
      ]
    );

    const convId = conversationQuery.rows[0].id;

    // Guardar mensaje
    await databaseService.query(
      `INSERT INTO messages (
         conversation_id, whatsapp_number, message, message_type,
         direction, urgency_level, keywords_detected, sent_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        convId,
        phoneNumber,
        message,
        messageType,
        direction,
        urgencyLevel || 'normal',
        JSON.stringify(keywords || [])
      ]
    );

    // Actualizar contador de mensajes no leídos para mensajes entrantes
    if (direction === 'inbound') {
      await databaseService.query(
        'UPDATE conversations SET unread_count = unread_count + 1 WHERE id = $1',
        [convId]
      );
    }

    return convId;

  } catch (error) {
    logger.error(`Error saving WhatsApp message: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Enviar mensaje de respuesta automática
 */
async function sendAutoReply(phoneNumber, originalMessage) {
  const autoReplyMessages = [
    "¡Hola! 👋 Gracias por contactar a Clínica Dental Rubio García. Un agente le responderá pronto.",
    "Hemos recibido tu mensaje. Te responderemos lo antes posible. Para urgencias, llama al 34664218253.",
    "Gracias por tu mensaje. Nuestro equipo está trabajando para atenderte. ¡Que tengas un excelente día! 😊"
  ];

  const randomReply = autoReplyMessages[Math.floor(Math.random() * autoReplyMessages.length)];
  
  try {
    await sendMessage(phoneNumber, randomReply);
    logger.info(`Auto-reply sent to ${phoneNumber}`);
  } catch (error) {
    logger.error(`Error sending auto-reply: ${error.message}`);
  }
}

// ==============================================
// FUNCIONES PRINCIPALES DEL SERVICIO
// ==============================================

/**
 * Conectar a WhatsApp
 */
async function connect() {
  try {
    if (isConnecting || sessionActive) {
      logger.warn('WhatsApp connection already in progress or active');
      return;
    }

    isConnecting = true;
    connectionState = 'connecting';

    logger.info('Connecting to WhatsApp...');
    await ensureSessionsDirectory();

    // Crear directorio de autenticación
    const authDir = path.join(WHATSAPP_CONFIG.SESSIONS_PATH, 'auth');
    await ensureSessionsDirectory();
    await fs.mkdir(authDir, { recursive: true });

    // Cargar estado de autenticación
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    // Obtener versión más reciente de Baileys
    const { version } = await fetchLatestBaileysVersion();

    // Crear socket
    sock = makeWASocket({
      auth: state,
      version,
      connectTimeoutMs: WHATSAPP_CONFIG.TIMEOUT,
      defaultQueryTimeoutMs: WHATSAPP_CONFIG.TIMEOUT,
      keepAliveIntervalMs: 10000,
      printQRInTerminal: true, // Mostrar QR en terminal
      logger: logger,
      browserDescription: ['DentalCare Pro', 'Chrome', '1.0.0']
    });

    // Manejar eventos de conexión
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      connectionState = connection;
      
      switch (connection) {
        case 'open':
          sessionActive = true;
          logger.info('✅ WhatsApp connected successfully');
          qrCode = null;
          break;
          
        case 'close':
          sessionActive = false;
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          
          if (shouldReconnect) {
            logger.warn('WhatsApp connection closed, reconnecting...');
            setTimeout(connect, 5000);
          } else {
            logger.error('❌ WhatsApp logged out, manual reconnection required');
          }
          break;
          
        case 'connecting':
          logger.info('📱 WhatsApp connecting...');
          break;
      }

      // Manejar código QR
      if (qr) {
        qrCode = qr;
        logger.info('📱 Scan the QR code with WhatsApp to connect');
      }

      // Guardar credenciales
      if (update.qr) {
        await saveCreds();
      }
    });

    // Manejar mensajes entrantes
    sock.ev.on('messages.upsert', async (m) => {
      const messages = m.messages;
      
      for (const msg of messages) {
        if (!msg.message) continue;
        
        try {
          const message = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text ||
                         msg.message.imageMessage?.caption ||
                         msg.message.documentMessage?.caption ||
                         msg.message.videoMessage?.caption ||
                         msg.message.audioMessage?.caption;
          
          if (!message) continue;
          
          const phoneNumber = msg.key.remoteJid;
          const isFromMe = msg.key.fromMe;
          
          // Analizar urgencia
          const urgencyAnalysis = analyzeMessageForUrgency(message);
          
          // Guardar mensaje
          await saveMessage({
            conversationId: null,
            phoneNumber,
            message,
            messageType: 'text',
            direction: isFromMe ? 'outbound' : 'inbound',
            urgencyLevel: urgencyAnalysis.urgencyLevel,
            keywords: urgencyAnalysis.detectedKeywords
          });
          
          // Log del mensaje
          logger.info(`WhatsApp message: ${isFromMe ? 'Sent' : 'Received'} from ${phoneNumber}`, {
            message: message.substring(0, 100),
            urgency: urgencyAnalysis.urgencyLevel,
            keywords: urgencyAnalysis.detectedKeywords
          });
          
          // Enviar auto-respuesta para mensajes entrantes
          if (!isFromMe && WHATSAPP_CONFIG.AUTO_REPLY_ENABLED && urgencyAnalysis.urgencyLevel === 'normal') {
            await sendAutoReply(phoneNumber, message);
          }
          
        } catch (msgError) {
          logger.error(`Error processing WhatsApp message: ${msgError.message}`, { stack: msgError.stack });
        }
      }
    });

    isConnecting = false;
    
  } catch (error) {
    isConnecting = false;
    connectionState = 'error';
    sessionActive = false;
    
    logger.error('❌ Error connecting to WhatsApp:', error);
    throw error;
  }
}

/**
 * Desconectar de WhatsApp
 */
async function disconnect() {
  try {
    if (sock) {
      await sock.end();
      sock = null;
    }
    
    sessionActive = false;
    connectionState = 'disconnected';
    qrCode = null;
    
    logger.info('WhatsApp disconnected');
  } catch (error) {
    logger.error('Error disconnecting WhatsApp:', error);
  }
}

/**
 * Enviar mensaje por WhatsApp
 */
async function sendMessage(phoneNumber, message, messageType = 'text') {
  try {
    if (!sessionActive || !sock) {
      throw new Error('WhatsApp not connected');
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    const messageData = {
      text: message
    };

    // Enviar mensaje
    const sent = await sock.sendMessage(formattedPhone, messageData);
    
    // Guardar mensaje enviado
    await saveMessage({
      conversationId: null,
      phoneNumber: formattedPhone,
      message,
      messageType,
      direction: 'outbound'
    });
    
    logger.info(`WhatsApp message sent to ${formattedPhone}:`, { 
      message: message.substring(0, 100) 
    });
    
    return {
      success: true,
      messageId: sent?.key?.id,
      recipient: formattedPhone
    };

  } catch (error) {
    logger.error(`Error sending WhatsApp message to ${phoneNumber}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Enviar imagen por WhatsApp
 */
async function sendImage(phoneNumber, imagePath, caption = '') {
  try {
    if (!sessionActive || !sock) {
      throw new Error('WhatsApp not connected');
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const imageBuffer = await fs.readFile(imagePath);

    // Enviar imagen
    const sent = await sock.sendMessage(formattedPhone, {
      image: imageBuffer,
      caption: caption || 'Imagen de Clínica Dental Rubio García'
    });
    
    // Guardar mensaje
    await saveMessage({
      conversationId: null,
      phoneNumber: formattedPhone,
      message: caption || '[Imagen]',
      messageType: 'image',
      direction: 'outbound'
    });
    
    logger.info(`WhatsApp image sent to ${formattedPhone}:`, { 
      imagePath,
      caption: caption.substring(0, 100)
    });
    
    return {
      success: true,
      messageId: sent?.key?.id,
      recipient: formattedPhone
    };

  } catch (error) {
    logger.error(`Error sending WhatsApp image to ${phoneNumber}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Enviar documento por WhatsApp
 */
async function sendDocument(phoneNumber, documentPath, caption = '') {
  try {
    if (!sessionActive || !sock) {
      throw new Error('WhatsApp not connected');
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const documentBuffer = await fs.readFile(documentPath);
    const documentName = path.basename(documentPath);

    // Enviar documento
    const sent = await sock.sendMessage(formattedPhone, {
      document: documentBuffer,
      fileName: documentName,
      mimetype: 'application/pdf',
      caption: caption || 'Documento de Clínica Dental Rubio García'
    });
    
    // Guardar mensaje
    await saveMessage({
      conversationId: null,
      phoneNumber: formattedPhone,
      message: caption || `[Documento: ${documentName}]`,
      messageType: 'document',
      direction: 'outbound'
    });
    
    logger.info(`WhatsApp document sent to ${formattedPhone}:`, { 
      documentPath,
      documentName,
      caption: caption.substring(0, 100)
    });
    
    return {
      success: true,
      messageId: sent?.key?.id,
      recipient: formattedPhone
    };

  } catch (error) {
    logger.error(`Error sending WhatsApp document to ${phoneNumber}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Marcar conversación como urgente
 */
async function markConversationAsUrgent(phoneNumber, urgencyLevel = 'orange', reason = '') {
  try {
    await databaseService.query(
      `UPDATE conversations 
       SET urgency_level = $1, updated_at = NOW()
       WHERE whatsapp_number = $2`,
      [urgencyLevel, formatPhoneNumber(phoneNumber)]
    );
    
    logger.info(`Conversation marked as ${urgencyLevel}: ${phoneNumber}`, { reason });
    
    return { success: true };
  } catch (error) {
    logger.error(`Error marking conversation as urgent:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener estado de conexión
 */
function getConnectionStatus() {
  return {
    connected: sessionActive,
    connectionState,
    qrCode,
    phoneNumber: WHATSAPP_CONFIG.PHONE_NUMBER,
    isConnecting,
    uptime: process.uptime()
  };
}

/**
 * Obtener conversaciones
 */
async function getConversations(limit = 50, offset = 0) {
  try {
    const conversationsQuery = await databaseService.query(
      `SELECT 
         id, whatsapp_number, patient_name, last_message, last_message_at,
         urgency_level, status, unread_count, created_at
       FROM conversations
       ORDER BY 
         CASE urgency_level
           WHEN 'red' THEN 1
           WHEN 'orange' THEN 2
           WHEN 'yellow' THEN 3
           ELSE 4
         END,
         last_message_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return conversationsQuery.rows;
  } catch (error) {
    logger.error(`Error getting conversations:`, error);
    return [];
  }
}

/**
 * Obtener mensajes de conversación
 */
async function getMessages(conversationId, limit = 50, offset = 0) {
  try {
    const messagesQuery = await databaseService.query(
      `SELECT 
         id, message, message_type, direction, urgency_level,
         keywords_detected, sent_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY sent_at ASC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );

    return messagesQuery.rows;
  } catch (error) {
    logger.error(`Error getting messages:`, error);
    return [];
  }
}

// ==============================================
// FUNCIONES DE INICIALIZACIÓN
// ==============================================

/**
 * Inicializar servicio de WhatsApp
 */
async function initializeWhatsApp(io = null) {
  try {
    logger.info('Initializing WhatsApp service...');
    
    // Conectar a WhatsApp
    await connect();
    
    // Configurar WebSocket para notificaciones en tiempo real
    if (io) {
      // Emitir estado de conexión periódicamente
      setInterval(() => {
        io.emit('whatsapp_status', getConnectionStatus());
      }, 10000);
    }
    
    logger.info('WhatsApp service initialized successfully');
    
  } catch (error) {
    logger.error('Error initializing WhatsApp service:', error);
    throw error;
  }
}

/**
 * Reiniciar conexión de WhatsApp
 */
async function restartConnection() {
  try {
    logger.info('Restarting WhatsApp connection...');
    await disconnect();
    await connect();
    logger.info('WhatsApp connection restarted successfully');
  } catch (error) {
    logger.error('Error restarting WhatsApp connection:', error);
    throw error;
  }
}

// ==============================================
// EXPORTACIÓN
// ==============================================

module.exports = {
  // Funciones principales
  connect,
  disconnect,
  sendMessage,
  sendImage,
  sendDocument,
  markConversationAsUrgent,
  
  // Funciones de consulta
  getConnectionStatus,
  getConversations,
  getMessages,
  
  // Funciones de utilidad
  initializeWhatsApp,
  restartConnection,
  analyzeMessageForUrgency,
  formatPhoneNumber,
  
  // Configuración
  WHATSAPP_CONFIG,
  URGENCY_KEYWORDS
};

// Auto-inicializar si está configurado
if (process.env.WHATSAPP_AUTO_CONNECT === 'true') {
  initializeWhatsApp().catch(error => {
    logger.error('Failed to auto-connect WhatsApp:', error);
  });
}
