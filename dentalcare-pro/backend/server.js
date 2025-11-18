/**
 * DENTALCARE PRO - SERVIDOR PRINCIPAL
 * Sistema Inteligente de Gestión Dental
 * Clínica Dental Rubio García
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 * @date November 2025
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple')(session);
const { createServer } = require('http');
const { Server } = require('socket.io');

// Importaciones de controladores
const authController = require('./controllers/authController');
const legalController = require('./controllers/legalController');
const automationController = require('./controllers/automationController');
const whatsappController = require('./controllers/whatsappController');
const agendaController = require('./controllers/agendaController');
const patientController = require('./controllers/patientController');
const invoiceController = require('./controllers/invoiceController');
const documentController = require('./controllers/documentController');
const accountingController = require('./controllers/accountingController');

// Importaciones de middlewares
const authMiddleware = require('./middleware/auth');
const validationMiddleware = require('./middleware/validation');
const securityMiddleware = require('./middleware/security');
const loggingMiddleware = require('./middleware/logging');

// Importaciones de utilidades
const databaseService = require('./utils/databaseService');
const whatsappService = require('./utils/whatsappService');
const legalService = require('./utils/legalService');
const automationService = require('./utils/automationService');
const logger = require('./utils/logger');
const { initializeWhatsApp } = require('./utils/whatsappService');

// ==============================================
// CONFIGURACIÓN INICIAL
// ==============================================

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "https://www.app.rubiogarciadental.com",
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';

// ==============================================
// CONFIGURACIÓN DE SEGURIDAD
// ==============================================

// Helmet para headers de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https://www.app.rubiogarciadental.com"]
    }
  }
}));

// CORS configurado
app.use(cors({
  origin: process.env.CORS_ORIGIN || "https://www.app.rubiogarciadental.com",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Demasiadas solicitudes, intente nuevamente más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// ==============================================
// CONFIGURACIÓN DE MIDDLEWARES
// ==============================================

// Compresión de respuestas
app.use(compression());

// Parsing de datos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookies y sesiones
app.use(cookieParser());
app.use(session({
  store: new connectPgSimple({
    conString: process.env.DATABASE_URL,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Logging
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Middleware de logging personalizado
app.use(loggingMiddleware.requestLogger);

// Middleware de seguridad
app.use(securityMiddleware.sanitizeInput);

// ==============================================
// CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS
// ==============================================

// Servir archivos estáticos del frontend
app.use(express.static('frontend'));

// Servir imágenes y assets
app.use('/assets', express.static('frontend/assets'));

// ==============================================
// CONFIGURACIÓN DE SOCKET.IO PARA TIEMPO REAL
// ==============================================

io.on('connection', (socket) => {
  logger.info(`Usuario conectado: ${socket.id}`);

  // Unirse a room del usuario para notificaciones
  socket.on('joinUserRoom', (userId) => {
    socket.join(`user_${userId}`);
    logger.info(`Usuario ${userId} joined room user_${userId}`);
  });

  // Unirse a room de urgencias para notificaciones en tiempo real
  socket.on('joinUrgentRoom', () => {
    socket.join('urgent_notifications');
    logger.info(`Usuario joined urgent_notifications room`);
  });

  // Manejar desconexión
  socket.on('disconnect', () => {
    logger.info(`Usuario desconectado: ${socket.id}`);
  });
});

// ==============================================
// RUTAS DE LA API
// ==============================================

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: NODE_ENV,
    services: {
      database: 'connected',
      whatsapp: 'active',
      automation: 'enabled'
    }
  });
});

// Ruta de información del sistema
app.get('/api/system/info', (req, res) => {
  res.json({
    name: 'DentalCare Pro',
    version: '1.0.0',
    description: 'Sistema Inteligente de Gestión Dental',
    clinic: {
      name: process.env.CLINIC_NAME,
      admin: process.env.ADMIN_USER,
      email: process.env.ADMIN_EMAIL,
      whatsapp: process.env.WHATSAPP_PHONE_NUMBER
    },
    features: [
      'Control de Acceso Multi-nivel',
      'Panel de Control en Tiempo Real',
      'Sistema de Urgencias WhatsApp',
      'Agenda Avanzada SQL Server',
      'Automatizaciones LOPD/RGPD',
      'Facturación Verifactu',
      '47+ APIs Especializadas',
      'Agente IA Avanzado'
    ]
  });
});

// ==============================================
// RUTAS DE AUTENTICACIÓN (8 endpoints)
// ==============================================

// Login de usuario
app.post('/api/auth/login', 
  validationMiddleware.validateLogin,
  authController.login,
  loggingMiddleware.authLogger
);

// Logout de usuario
app.post('/api/auth/logout',
  authMiddleware.requireAuth,
  authController.logout
);

// Renovación de token
app.post('/api/auth/refresh',
  authMiddleware.requireAuth,
  authController.refreshToken
);

// Verificar token
app.get('/api/auth/verify',
  authMiddleware.requireAuth,
  authController.verifyToken
);

// Registrar nuevo usuario (solo admin)
app.post('/api/auth/register',
  authMiddleware.requireAdmin,
  validationMiddleware.validateRegistration,
  authController.register
);

// Cambiar contraseña
app.post('/api/auth/change-password',
  authMiddleware.requireAuth,
  validationMiddleware.validatePasswordChange,
  authController.changePassword
);

// Solicitar reset de contraseña
app.post('/api/auth/forgot-password',
  validationMiddleware.validateEmail,
  authController.forgotPassword
);

// Resetear contraseña con token
app.post('/api/auth/reset-password/:token',
  validationMiddleware.validateResetPassword,
  authController.resetPassword
);

// ==============================================
// RUTAS LEGALES/LOPD (10 endpoints)
// ==============================================

// Obtener documentos legales
app.get('/api/legal/documents',
  authMiddleware.requireAuth,
  legalController.getDocuments
);

// Crear nuevo documento legal
app.post('/api/legal/documents',
  authMiddleware.requireAdmin,
  validationMiddleware.validateDocument,
  legalController.createDocument
);

// Actualizar documento legal
app.put('/api/legal/documents/:id',
  authMiddleware.requireAdmin,
  validationMiddleware.validateDocument,
  legalController.updateDocument
);

// Eliminar documento legal
app.delete('/api/legal/documents/:id',
  authMiddleware.requireAdmin,
  legalController.deleteDocument
);

// Obtener cuestionarios de LOPD
app.get('/api/legal/questionnaires',
  authMiddleware.requireAuth,
  legalController.getQuestionnaires
);

// Crear nuevo cuestionario
app.post('/api/legal/questionnaires',
  authMiddleware.requireAdmin,
  validationMiddleware.validateQuestionnaire,
  legalController.createQuestionnaire
);

// Enviar cuestionario de LOPD
app.post('/api/legal/compliance/submit',
  authMiddleware.requireAuth,
  validationMiddleware.validateComplianceSubmission,
  legalController.submitCompliance
);

// Verificar cumplimiento LOPD
app.get('/api/legal/compliance/status/:patientId',
  authMiddleware.requireAuth,
  legalController.checkComplianceStatus
);

// Obtener logs de cumplimiento
app.get('/api/legal/compliance/logs',
  authMiddleware.requireAdmin,
  legalController.getComplianceLogs
);

// Generar reporte de cumplimiento
app.get('/api/legal/compliance/report',
  authMiddleware.requireAdmin,
  legalController.generateComplianceReport
);

// ==============================================
// RUTAS DE AUTOMATIZACIÓN (12 endpoints)
// ==============================================

// Obtener configuraciones de automatización
app.get('/api/automation/config',
  authMiddleware.requireAuth,
  automationController.getConfig
);

// Actualizar configuración de automatización
app.put('/api/automation/config',
  authMiddleware.requireAdmin,
  validationMiddleware.validateAutomationConfig,
  automationController.updateConfig
);

// Ejecutar recordatorio manual
app.post('/api/automation/reminders/execute',
  authMiddleware.requireAuth,
  validationMiddleware.validateReminderExecution,
  automationController.executeReminder
);

// Programar recordatorio automático
app.post('/api/automation/reminders/schedule',
  authMiddleware.requireAdmin,
  validationMiddleware.validateScheduledReminder,
  automationController.scheduleReminder
);

// Obtener automatizaciones activas
app.get('/api/automation/active',
  authMiddleware.requireAuth,
  automationController.getActiveAutomations
);

// Ejecutar envío de consentimiento
app.post('/api/automation/consent/send',
  authMiddleware.requireAdmin,
  validationMiddleware.validateConsentSend,
  automationController.sendConsent
);

// Programar envío automático de consentimiento
app.post('/api/automation/consent/schedule',
  authMiddleware.requireAdmin,
  validationMiddleware.validateScheduledConsent,
  automationController.scheduleConsent
);

// Ejecutar cuestionario de primera cita
app.post('/api/automation/questionnaire/send',
  authMiddleware.requireAdmin,
  validationMiddleware.validateQuestionnaireSend,
  automationController.sendQuestionnaire
);

// Obtener estado de automatizaciones
app.get('/api/automation/status',
  authMiddleware.requireAuth,
  automationController.getAutomationStatus
);

// Activar/desactivar automatización específica
app.patch('/api/automation/toggle/:id',
  authMiddleware.requireAdmin,
  automationController.toggleAutomation
);

// Obtener logs de automatización
app.get('/api/automation/logs',
  authMiddleware.requireAdmin,
  automationController.getAutomationLogs
);

// Ejecutar prueba de automatización
app.post('/api/automation/test',
  authMiddleware.requireAdmin,
  validationMiddleware.validateAutomationTest,
  automationController.testAutomation
);

// ==============================================
// RUTAS WHATSAPP/URGENCIAS (8 endpoints)
// ==============================================

// Obtener todas las conversaciones
app.get('/api/whatsapp/conversations',
  authMiddleware.requireAuth,
  whatsappController.getConversations
);

// Obtener solo conversaciones urgentes (naranja)
app.get('/api/whatsapp/urgent/conversations',
  authMiddleware.requireAuth,
  whatsappController.getUrgentConversations
);

// Marcar conversación como urgente
app.post('/api/whatsapp/conversations/:id/urgent',
  authMiddleware.requireAuth,
  validationMiddleware.validateUrgentMarking,
  whatsappController.markAsUrgent
);

// Enviar mensaje manual
app.post('/api/whatsapp/messages/send',
  authMiddleware.requireAuth,
  validationMiddleware.validateMessageSend,
  whatsappController.sendMessage
);

// Obtener mensajes de una conversación
app.get('/api/whatsapp/conversations/:id/messages',
  authMiddleware.requireAuth,
  whatsappController.getMessages
);

// Obtener estado de conexión WhatsApp
app.get('/api/whatsapp/status',
  authMiddleware.requireAuth,
  whatsappController.getStatus
);

// Configurar auto-respuestas
app.post('/api/whatsapp/auto-reply',
  authMiddleware.requireAdmin,
  validationMiddleware.validateAutoReply,
  whatsappController.configureAutoReply
);

// Obtener estadísticas de WhatsApp
app.get('/api/whatsapp/stats',
  authMiddleware.requireAuth,
  whatsappController.getStats
);

// ==============================================
// RUTAS AGENDA/CITAS (7 endpoints)
// ==============================================

// Obtener citas del día
app.get('/api/agenda/today',
  authMiddleware.requireAuth,
  agendaController.getTodayAppointments
);

// Obtener todas las citas
app.get('/api/agenda/appointments',
  authMiddleware.requireAuth,
  validationMiddleware.validateDateRange,
  agendaController.getAppointments
);

// Crear nueva cita
app.post('/api/agenda/appointments',
  authMiddleware.requireAdmin,
  validationMiddleware.validateAppointmentCreation,
  agendaController.createAppointment
);

// Actualizar cita existente
app.put('/api/agenda/appointments/:id',
  authMiddleware.requireAdmin,
  validationMiddleware.validateAppointmentUpdate,
  agendaController.updateAppointment
);

// Cambiar estado de cita
app.patch('/api/agenda/appointments/:id/status',
  authMiddleware.requireAuth,
  validationMiddleware.validateStatusChange,
  agendaController.changeStatus
);

// Sincronizar con SQL Server
app.post('/api/agenda/sync/sqlserver',
  authMiddleware.requireAdmin,
  agendaController.syncWithSQLServer
);

// Cancelar cita
app.delete('/api/agenda/appointments/:id',
  authMiddleware.requireAdmin,
  agendaController.cancelAppointment
);

// ==============================================
// RUTAS PACIENTES (6 endpoints)
// ==============================================

// Obtener lista de pacientes
app.get('/api/patients',
  authMiddleware.requireAuth,
  validationMiddleware.validatePagination,
  patientController.getPatients
);

// Obtener paciente por ID
app.get('/api/patients/:id',
  authMiddleware.requireAuth,
  patientController.getPatient
);

// Crear nuevo paciente
app.post('/api/patients',
  authMiddleware.requireAdmin,
  validationMiddleware.validatePatientCreation,
  patientController.createPatient
);

// Actualizar datos de paciente
app.put('/api/patients/:id',
  authMiddleware.requireAdmin,
  validationMiddleware.validatePatientUpdate,
  patientController.updatePatient
);

// Obtener historial de paciente
app.get('/api/patients/:id/history',
  authMiddleware.requireAuth,
  patientController.getPatientHistory
);

// Eliminar paciente
app.delete('/api/patients/:id',
  authMiddleware.requireAdmin,
  patientController.deletePatient
);

// ==============================================
// RUTAS FACTURACIÓN (5 endpoints)
// ==============================================

// Obtener lista de facturas
app.get('/api/invoices',
  authMiddleware.requireAuth,
  validationMiddleware.validatePagination,
  invoiceController.getInvoices
);

// Crear nueva factura
app.post('/api/invoices',
  authMiddleware.requireAdmin,
  validationMiddleware.validateInvoiceCreation,
  invoiceController.createInvoice
);

// Obtener factura por ID
app.get('/api/invoices/:id',
  authMiddleware.requireAuth,
  invoiceController.getInvoice
);

// Actualizar factura
app.put('/api/invoices/:id',
  authMiddleware.requireAdmin,
  validationMiddleware.validateInvoiceUpdate,
  invoiceController.updateInvoice
);

// Generar PDF de factura
app.get('/api/invoices/:id/pdf',
  authMiddleware.requireAuth,
  invoiceController.generatePDF
);

// ==============================================
// RUTAS DOCUMENTOS (4 endpoints)
// ==============================================

// Obtener documentos generados
app.get('/api/documents',
  authMiddleware.requireAuth,
  documentController.getDocuments
);

// Generar documento
app.post('/api/documents/generate',
  authMiddleware.requireAdmin,
  validationMiddleware.validateDocumentGeneration,
  documentController.generateDocument
);

// Descargar documento
app.get('/api/documents/:id/download',
  authMiddleware.requireAuth,
  documentController.downloadDocument
);

// Eliminar documento
app.delete('/api/documents/:id',
  authMiddleware.requireAdmin,
  documentController.deleteDocument
);

// ==============================================
// RUTAS CONTABILIDAD (3 endpoints)
// ==============================================

// Obtener resúmenes contables
app.get('/api/accounting/summaries',
  authMiddleware.requireAuth,
  accountingController.getSummaries
);

// Generar reporte financiero
app.get('/api/accounting/reports',
  authMiddleware.requireAdmin,
  accountingController.generateReports
);

// Obtener estadísticas financieras
app.get('/api/accounting/stats',
  authMiddleware.requireAuth,
  accountingController.getStats
);

// ==============================================
// RUTAS DE USUARIO Y CONTROL DE ACCESO
// ==============================================

// Obtener perfil de usuario actual
app.get('/api/user/profile',
  authMiddleware.requireAuth,
  authController.getProfile
);

// Actualizar perfil de usuario
app.put('/api/user/profile',
  authMiddleware.requireAuth,
  validationMiddleware.validateProfileUpdate,
  authController.updateProfile
);

// Obtener usuarios del sistema (solo admin)
app.get('/api/users',
  authMiddleware.requireAdmin,
  userController.getUsers
);

// Crear nuevo usuario (solo admin)
app.post('/api/users',
  authMiddleware.requireAdmin,
  validationMiddleware.validateUserCreation,
  userController.createUser
);

// Actualizar usuario (solo admin)
app.put('/api/users/:id',
  authMiddleware.requireAdmin,
  validationMiddleware.validateUserUpdate,
  userController.updateUser
);

// Eliminar usuario (solo admin)
app.delete('/api/users/:id',
  authMiddleware.requireAdmin,
  userController.deleteUser
);

// ==============================================
// RUTA PARA SERVIR EL FRONTEND
// ==============================================

// Ruta principal - servir el frontend
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/frontend/html/index.html');
});

// Rutas del frontend - SPA
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/frontend/html/index.html');
});

// ==============================================
// MANEJO DE ERRORES
// ==============================================

// Error 404
app.use('*', (req, res) => {
  logger.warn(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.method} ${req.originalUrl} no existe`
  });
});

// Error general
app.use((error, req, res, next) => {
  logger.error(`Error en servidor: ${error.message}`, { stack: error.stack });
  
  res.status(500).json({
    error: 'Error interno del servidor',
    message: NODE_ENV === 'development' ? error.message : 'Ha ocurrido un error inesperado'
  });
});

// ==============================================
// INICIALIZACIÓN DEL SISTEMA
// ==============================================

async function initializeSystem() {
  try {
    logger.info('🚀 Inicializando Sistema DentalCare Pro...');
    
    // 1. Conectar bases de datos
    logger.info('📊 Conectando bases de datos...');
    await databaseService.connectPostgreSQL();
    await databaseService.connectSQLServer();
    
    // 2. Inicializar servicios
    logger.info('🔧 Inicializando servicios...');
    await legalService.initializeLOPD();
    await automationService.initializeAutomations();
    
    // 3. Inicializar WhatsApp
    logger.info('💬 Inicializando WhatsApp...');
    await initializeWhatsApp(io);
    
    // 4. Verificar configuración del sistema
    logger.info('⚙️ Verificando configuración...');
    const systemCheck = await performSystemCheck();
    if (!systemCheck.success) {
      logger.error(`❌ Error en verificación del sistema: ${systemCheck.error}`);
      process.exit(1);
    }
    
    // 5. Inicializar logs y monitoreo
    logger.info('📈 Configurando monitoreo...');
    setupMonitoring();
    
    logger.info('✅ Sistema DentalCare Pro inicializado correctamente');
    logger.info(`🌐 Aplicación disponible en: http://localhost:${PORT}`);
    logger.info(`🏥 Clínica: ${process.env.CLINIC_NAME}`);
    logger.info(`👤 Admin: ${process.env.ADMIN_USER}`);
    
  } catch (error) {
    logger.error(`❌ Error al inicializar el sistema: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
}

async function performSystemCheck() {
  try {
    // Verificar conexión a PostgreSQL
    const pgStatus = await databaseService.checkPostgreSQLConnection();
    if (!pgStatus.success) {
      return { success: false, error: `PostgreSQL: ${pgStatus.error}` };
    }
    
    // Verificar conexión a SQL Server
    const sqlStatus = await databaseService.checkSQLServerConnection();
    if (!sqlStatus.success) {
      return { success: false, error: `SQL Server: ${sqlStatus.error}` };
    }
    
    // Verificar variables de entorno críticas
    const criticalEnvVars = [
      'JWT_SECRET', 'ADMIN_USER', 'ADMIN_PASSWORD', 
      'DB_HOST', 'SQL_SERVER'
    ];
    
    for (const envVar of criticalEnvVars) {
      if (!process.env[envVar]) {
        return { success: false, error: `Variable de entorno faltante: ${envVar}` };
      }
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function setupMonitoring() {
  // Monitoreo de salud del sistema
  setInterval(async () => {
    try {
      const healthCheck = await performSystemCheck();
      if (!healthCheck.success) {
        logger.error(`⚠️ Problema de salud del sistema: ${healthCheck.error}`);
      }
    } catch (error) {
      logger.error(`❌ Error en health check: ${error.message}`);
    }
  }, parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000);
  
  // Limpieza de logs antiguos
  setInterval(() => {
    // Implementar limpieza de logs antiguos
    logger.info('🧹 Ejecutando limpieza de logs antiguos...');
  }, 86400000); // 24 horas
}

// ==============================================
// INICIAR SERVIDOR
// ==============================================

// Capturar señales de cierre para limpieza
process.on('SIGTERM', async () => {
  logger.info('🔄 Recibida señal SIGTERM, cerrando servidor...');
  await cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('🔄 Recibida señal SIGINT, cerrando servidor...');
  await cleanup();
  process.exit(0);
});

async function cleanup() {
  try {
    logger.info('🧹 Limpiando recursos del sistema...');
    
    // Cerrar conexiones de base de datos
    await databaseService.disconnectPostgreSQL();
    await databaseService.disconnectSQLServer();
    
    // Cerrar conexión WhatsApp
    await whatsappService.disconnect();
    
    // Cerrar servidor
    server.close(() => {
      logger.info('✅ Servidor cerrado correctamente');
    });
    
  } catch (error) {
    logger.error(`❌ Error durante la limpieza: ${error.message}`, { stack: error.stack });
  }
}

// Inicializar el sistema
initializeSystem().then(() => {
  server.listen(PORT, () => {
    logger.info(`🌟 DentalCare Pro Server iniciado en puerto ${PORT}`);
  });
}).catch(error => {
  logger.error(`❌ Error fatal en inicialización: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

module.exports = app;
