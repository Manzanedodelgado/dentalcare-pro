/**
 * SISTEMA DE LOGGING AVANZADO
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Logging estructurado con Winston
 * - Rotación automática de logs
 * - Diferentes niveles de log
 * - Logging a archivos y consola
 * - Métricas y alertas
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// ==============================================
// CONFIGURACIÓN DE LOGS
// ==============================================

const LOGS_DIR = path.join(process.cwd(), 'logs');

// Crear directorio de logs si no existe
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Configuración de formatos
const logFormats = {
  standard: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(info => {
      return `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`;
    })
  ),
  json: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  colored: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
      format: 'HH:mm:ss'
    }),
    winston.format.printf(info => {
      return `${info.timestamp} [${info.level}] ${info.message}`;
    })
  )
};

// Configuración de transports
const transports = [];

// Transport para errores
transports.push(new winston.transports.File({
  filename: path.join(LOGS_DIR, 'error.log'),
  level: 'error',
  maxsize: 5242880, // 5MB
  maxFiles: 10,
  tailable: true,
  format: logFormats.json
}));

// Transport para logs combinados
transports.push(new winston.transports.File({
  filename: path.join(LOGS_DIR, 'combined.log'),
  maxsize: 10485760, // 10MB
  maxFiles: 20,
  tailable: true,
  format: logFormats.json
}));

// Transport para auditoría
transports.push(new winston.transports.File({
  filename: path.join(LOGS_DIR, 'audit.log'),
  level: 'info',
  maxsize: 15728640, // 15MB
  maxFiles: 30,
  tailable: true,
  format: logFormats.json
}));

// Transport para rendimiento
transports.push(new winston.transports.File({
  filename: path.join(LOGS_DIR, 'performance.log'),
  level: 'warn',
  maxsize: 5242880, // 5MB
  maxFiles: 5,
  tailable: true,
  format: logFormats.json
}));

// Transport para WhatsApp
transports.push(new winston.transports.File({
  filename: path.join(LOGS_DIR, 'whatsapp.log'),
  level: 'info',
  maxsize: 5242880, // 5MB
  maxFiles: 10,
  tailable: true,
  format: logFormats.json
}));

// Transport para automatizaciones
transports.push(new winston.transports.File({
  filename: path.join(LOGS_DIR, 'automation.log'),
  level: 'info',
  maxsize: 5242880, // 5MB
  maxFiles: 10,
  tailable: true,
  format: logFormats.json
}));

// Console transport para desarrollo
if (process.env.NODE_ENV !== 'production') {
  transports.push(new winston.transports.Console({
    level: 'debug',
    format: logFormats.colored,
    handleExceptions: true,
    handleRejections: true
  }));
}

// ==============================================
// CREACIÓN DEL LOGGER PRINCIPAL
// ==============================================

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormats.json,
  defaultMeta: {
    service: 'dentalcare-pro',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports,
  exitOnError: false,
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(LOGS_DIR, 'rejections.log'),
      format: logFormats.json
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(LOGS_DIR, 'exceptions.log'),
      format: logFormats.json
    })
  ]
});

// ==============================================
// LOGGERS ESPECIALIZADOS
// ==============================================

// Logger de auditoría
const auditLogger = winston.createLogger({
  level: 'info',
  format: logFormats.json,
  defaultMeta: { 
    logger: 'audit',
    service: 'dentalcare-pro'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'audit.log'),
      maxsize: 15728640,
      maxFiles: 30,
      tailable: true
    })
  ]
});

// Logger de seguridad
const securityLogger = winston.createLogger({
  level: 'warn',
  format: logFormats.json,
  defaultMeta: { 
    logger: 'security',
    service: 'dentalcare-pro'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'security.log'),
      maxsize: 10485760,
      maxFiles: 20,
      tailable: true
    })
  ]
});

// Logger de WhatsApp
const whatsappLogger = winston.createLogger({
  level: 'info',
  format: logFormats.json,
  defaultMeta: { 
    logger: 'whatsapp',
    service: 'dentalcare-pro'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'whatsapp.log'),
      maxsize: 5242880,
      maxFiles: 10,
      tailable: true
    })
  ]
});

// Logger de automatización
const automationLogger = winston.createLogger({
  level: 'info',
  format: logFormats.json,
  defaultMeta: { 
    logger: 'automation',
    service: 'dentalcare-pro'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'automation.log'),
      maxsize: 5242880,
      maxFiles: 10,
      tailable: true
    })
  ]
});

// Logger de rendimiento
const performanceLogger = winston.createLogger({
  level: 'warn',
  format: logFormats.json,
  defaultMeta: { 
    logger: 'performance',
    service: 'dentalcare-pro'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'performance.log'),
      maxsize: 5242880,
      maxFiles: 5,
      tailable: true
    })
  ]
});

// ==============================================
// FUNCIONES DE LOGGING ESPECIALIZADAS
// ==============================================

/**
 * Log de auditoría de usuarios
 */
function logUserAction(action, userId, details = {}) {
  auditLogger.info('User action', {
    action,
    userId,
    details,
    timestamp: new Date().toISOString(),
    service: 'dentalcare-pro'
  });
}

/**
 * Log de eventos de seguridad
 */
function logSecurityEvent(event, details = {}) {
  securityLogger.warn('Security event', {
    event,
    details,
    timestamp: new Date().toISOString(),
    service: 'dentalcare-pro'
  });
}

/**
 * Log de operaciones de WhatsApp
 */
function logWhatsAppOperation(operation, phoneNumber, details = {}) {
  whatsappLogger.info('WhatsApp operation', {
    operation,
    phoneNumber,
    details,
    timestamp: new Date().toISOString(),
    service: 'dentalcare-pro'
  });
}

/**
 * Log de automatizaciones
 */
function logAutomationEvent(event, automationType, details = {}) {
  automationLogger.info('Automation event', {
    event,
    automationType,
    details,
    timestamp: new Date().toISOString(),
    service: 'dentalcare-pro'
  });
}

/**
 * Log de métricas de rendimiento
 */
function logPerformanceMetric(metric, value, details = {}) {
  performanceLogger.warn('Performance metric', {
    metric,
    value,
    details,
    timestamp: new Date().toISOString(),
    service: 'dentalcare-pro'
  });
}

/**
 * Log de errores críticos
 */
function logCriticalError(error, context = {}) {
  logger.error('Critical error', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    service: 'dentalcare-pro'
  });
}

/**
 * Log de inicio/cierre de aplicación
 */
function logApplicationLifecycle(event, details = {}) {
  logger.info('Application lifecycle', {
    event,
    details,
    timestamp: new Date().toISOString(),
    service: 'dentalcare-pro',
    pid: process.pid,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
}

/**
 * Log de integración con servicios externos
 */
function logExternalService(service, operation, success, details = {}) {
  const level = success ? 'info' : 'error';
  logger.log(level, 'External service call', {
    service,
    operation,
    success,
    details,
    timestamp: new Date().toISOString(),
    service: 'dentalcare-pro'
  });
}

/**
 * Log de operaciones de base de datos
 */
function logDatabaseOperation(operation, table, success, details = {}) {
  const level = success ? 'debug' : 'error';
  logger.log(level, 'Database operation', {
    operation,
    table,
    success,
    details,
    timestamp: new Date().toISOString(),
    service: 'dentalcare-pro'
  });
}

/**
 * Log de operaciones de archivos
 */
function logFileOperation(operation, filename, success, details = {}) {
  const level = success ? 'debug' : 'error';
  logger.log(level, 'File operation', {
    operation,
    filename,
    success,
    details,
    timestamp: new Date().toISOString(),
    service: 'dentalcare-pro'
  });
}

/**
 * Log de eventos de facturación
 */
function logBillingEvent(event, invoiceNumber, details = {}) {
  logger.info('Billing event', {
    event,
    invoiceNumber,
    details,
    timestamp: new Date().toISOString(),
    service: 'dentalcare-pro'
  });
}

/**
 * Log de eventos legales/compliance
 */
function logLegalEvent(event, patientId, details = {}) {
  auditLogger.info('Legal/compliance event', {
    event,
    patientId,
    details,
    timestamp: new Date().toISOString(),
    service: 'dentalcare-pro'
  });
}

// ==============================================
// FUNCIONES DE UTILIDAD
// ==============================================

/**
 * Limpiar logs antiguos
 */
async function cleanupOldLogs() {
  try {
    const LOG_RETENTION_DAYS = 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_DAYS);

    const logFiles = [
      'error.log',
      'combined.log',
      'audit.log',
      'security.log',
      'whatsapp.log',
      'automation.log',
      'performance.log'
    ];

    for (const file of logFiles) {
      const filePath = path.join(LOGS_DIR, file);
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.mtime < cutoffDate) {
          // Archivar archivo antiguo
          const archiveName = `${file}.${cutoffDate.toISOString().split('T')[0]}`;
          const archivePath = path.join(LOGS_DIR, 'archive', archiveName);
          
          // Crear directorio de archivo si no existe
          const archiveDir = path.join(LOGS_DIR, 'archive');
          if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
          }
          
          fs.renameSync(filePath, archivePath);
          logger.info(`Log file archived: ${file}`);
        }
      }
    }

    // Limpiar archivos de archivo antiguos (más de 1 año)
    const archiveDir = path.join(LOGS_DIR, 'archive');
    if (fs.existsSync(archiveDir)) {
      const archiveFiles = fs.readdirSync(archiveDir);
      const archiveCutoffDate = new Date();
      archiveCutoffDate.setFullYear(archiveCutoffDate.getFullYear() - 1);

      for (const file of archiveFiles) {
        const filePath = path.join(archiveDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < archiveCutoffDate) {
          fs.unlinkSync(filePath);
          logger.info(`Old log file deleted: ${file}`);
        }
      }
    }

  } catch (error) {
    logger.error('Error cleaning up old logs', { error: error.message });
  }
}

/**
 * Obtener estadísticas de logs
 */
function getLogStats() {
  try {
    const logFiles = {
      error: path.join(LOGS_DIR, 'error.log'),
      combined: path.join(LOGS_DIR, 'combined.log'),
      audit: path.join(LOGS_DIR, 'audit.log'),
      security: path.join(LOGS_DIR, 'security.log'),
      whatsapp: path.join(LOGS_DIR, 'whatsapp.log'),
      automation: path.join(LOGS_DIR, 'automation.log'),
      performance: path.join(LOGS_DIR, 'performance.log')
    };

    const stats = {};
    
    for (const [type, filePath] of Object.entries(logFiles)) {
      if (fs.existsSync(filePath)) {
        const fileStats = fs.statSync(filePath);
        stats[type] = {
          size: fileStats.size,
          sizeFormatted: formatFileSize(fileStats.size),
          lastModified: fileStats.mtime,
          exists: true
        };
      } else {
        stats[type] = {
          exists: false
        };
      }
    }

    return stats;
  } catch (error) {
    logger.error('Error getting log stats', { error: error.message });
    return {};
  }
}

/**
 * Formatear tamaño de archivo
 */
function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Programar limpieza automática de logs
 */
function scheduleLogCleanup() {
  // Limpiar logs cada día a las 2:00 AM
  const now = new Date();
  const cleanupTime = new Date(now);
  cleanupTime.setHours(2, 0, 0, 0);
  
  // Si ya pasó la hora de hoy, programar para mañana
  if (cleanupTime <= now) {
    cleanupTime.setDate(cleanupTime.getDate() + 1);
  }
  
  const timeUntilCleanup = cleanupTime.getTime() - now.getTime();
  
  setTimeout(() => {
    cleanupOldLogs();
    
    // Programar próximas limpiezas cada 24 horas
    setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);
    
    logger.info('Scheduled log cleanup started');
  }, timeUntilCleanup);
}

// ==============================================
// EVENTOS DE APLICACIÓN
// ==============================================

// Log de inicio de aplicación
logApplicationLifecycle('start', {
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  environment: process.env.NODE_ENV
});

// Log de cierre graceful
process.on('SIGTERM', () => {
  logApplicationLifecycle('shutdown', { signal: 'SIGTERM' });
  process.exit(0);
});

process.on('SIGINT', () => {
  logApplicationLifecycle('shutdown', { signal: 'SIGINT' });
  process.exit(0);
});

// Manejo de excepciones no capturadas
process.on('uncaughtException', (error) => {
  logCriticalError(error, { type: 'uncaughtException' });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logCriticalError(new Error(`Unhandled Rejection: ${reason}`), { 
    type: 'unhandledRejection',
    promise: promise.toString()
  });
});

// ==============================================
// EXPORTACIÓN
// ==============================================

module.exports = {
  // Logger principal
  logger,
  
  // Loggers especializados
  auditLogger,
  securityLogger,
  whatsappLogger,
  automationLogger,
  performanceLogger,
  
  // Funciones de logging especializadas
  logUserAction,
  logSecurityEvent,
  logWhatsAppOperation,
  logAutomationEvent,
  logPerformanceMetric,
  logCriticalError,
  logApplicationLifecycle,
  logExternalService,
  logDatabaseOperation,
  logFileOperation,
  logBillingEvent,
  logLegalEvent,
  
  // Funciones de utilidad
  cleanupOldLogs,
  getLogStats,
  formatFileSize,
  scheduleLogCleanup
};

// Programar limpieza automática de logs
scheduleLogCleanup();
