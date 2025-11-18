/**
 * MIDDLEWARE DE LOGGING Y AUDITORÍA
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Logging de todas las requests
 * - Auditoría de operaciones críticas
 * - Tracking de actividad de usuarios
 * - Métricas de rendimiento
 * - Logs de errores y warnings
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const winston = require('winston');
const databaseService = require('../utils/databaseService');

// ==============================================
// CONFIGURACIÓN DEL LOGGER
// ==============================================

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'dentalcare-pro',
    version: '1.0.0'
  },
  transports: [
    // Log de errores
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // Log combinado
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    }),
    // Log de auditoría
    new winston.transports.File({
      filename: 'logs/audit.log',
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 20,
      tailable: true
    })
  ]
});

// En desarrollo, también log en consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// ==============================================
// MIDDLEWARE DE REQUEST LOGGING
// ==============================================

/**
 * Middleware para logging de todas las requests
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Agregar request ID al objeto request
  req.requestId = requestId;
  
  // Logging del request inicial
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
    userRole: req.user?.role,
    timestamp: new Date().toISOString()
  });
  
  // Override del método res.end para logging de respuesta
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Determinar nivel de log basado en status code
    let logLevel = 'info';
    if (statusCode >= 500) {
      logLevel = 'error';
    } else if (statusCode >= 400) {
      logLevel = 'warn';
    }
    
    // Logging de la respuesta
    logger.log(logLevel, 'Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      userRole: req.user?.role,
      userAgent: req.headers['user-agent'],
      contentLength: res.get('content-length') || 0,
      timestamp: new Date().toISOString()
    });
    
    // Logging detallado para requests largas (>5s)
    if (duration > 5000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
    }
    
    // Llamar al método original
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

// ==============================================
// MIDDLEWARE DE AUDITORÍA DE USUARIOS
// ==============================================

/**
 * Middleware para logging de autenticación
 */
function authLogger(req, res, next) {
  // Solo loggear intentos de login
  if (req.path === '/api/auth/login' && req.method === 'POST') {
    const email = req.body?.email || 'unknown';
    const ip = req.ip || req.connection.remoteAddress;
    
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const statusCode = res.statusCode;
      const success = statusCode === 200;
      
      logger.info('Authentication attempt', {
        email: email.toLowerCase(),
        success,
        statusCode,
        ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
      
      // Registrar en base de datos si es exitoso
      if (success && req.user) {
        databaseService.query(
          `INSERT INTO auth_logs (email, success, ip_address, user_id, timestamp)
           VALUES ($1, $2, $3, $4, NOW())`,
          [email.toLowerCase(), true, ip, req.user.id]
        ).catch(error => {
          logger.error(`Error al registrar log de auth: ${error.message}`);
        });
      }
      
      originalEnd.call(this, chunk, encoding);
    };
  }
  
  next();
}

// ==============================================
// MIDDLEWARE DE AUDITORÍA DE OPERACIONES CRÍTICAS
// ==============================================

/**
 * Middleware para auditar operaciones críticas
 */
function criticalOperationLogger(operationType) {
  return (req, res, next) => {
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const statusCode = res.statusCode;
      const success = statusCode < 400;
      
      // Registrar solo operaciones exitosas y errores críticos
      if (success || statusCode >= 500) {
        logCriticalOperation({
          operation: operationType,
          method: req.method,
          path: req.originalUrl,
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          statusCode,
          success,
          requestId: req.requestId,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          body: sanitizeBodyForLogging(req.body),
          timestamp: new Date().toISOString()
        });
      }
      
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
}

/**
 * Registrar operación crítica en base de datos
 */
async function logCriticalOperation(data) {
  try {
    // Logging con Winston
    const logLevel = data.success ? 'info' : 'error';
    logger.log(logLevel, 'Critical operation', data);
    
    // Insertar en base de datos
    await databaseService.query(
      `INSERT INTO critical_operations_log (
         operation_type, method, path, user_id, user_email, user_role,
         status_code, success, request_id, ip_address, user_agent,
         request_body, timestamp
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [
        data.operation,
        data.method,
        data.path,
        data.userId,
        data.userEmail,
        data.userRole,
        data.statusCode,
        data.success,
        data.requestId,
        data.ip,
        data.userAgent,
        JSON.stringify(data.body)
      ]
    );
  } catch (error) {
    logger.error(`Error al registrar operación crítica: ${error.message}`, { stack: error.stack });
  }
}

/**
 * Sanitizar body para logging (remover datos sensibles)
 */
function sanitizeBodyForLogging(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'currentPassword',
    'newPassword',
    'token',
    'refreshToken',
    'authorization',
    'cookie',
    'secret',
    'key',
    'card',
    'iban',
    'ssn'
  ];
  
  // Remover o enmascarar campos sensibles
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  // Enmascarar emails parcialmente
  if (sanitized.email) {
    const email = sanitized.email;
    const [local, domain] = email.split('@');
    if (local && domain) {
      sanitized.email = `${local.substring(0, 2)}***@${domain}`;
    }
  }
  
  // Enmascarar teléfonos parcialmente
  if (sanitized.phone || sanitized.patientPhone) {
    const phone = sanitized.phone || sanitized.patientPhone;
    if (phone.length > 4) {
      sanitized.phone = `***${phone.slice(-4)}`;
      sanitized.patientPhone = sanitized.phone;
    }
  }
  
  return sanitized;
}

// ==============================================
// MIDDLEWARE DE TRACKING DE ACTIVIDAD
// ==============================================

/**
 * Middleware para tracking de actividad de usuarios
 */
function activityTracker(req, res, next) {
  // Solo trackear usuarios autenticados
  if (!req.user) {
    return next();
  }
  
  // Rutas a trackear
  const trackableRoutes = [
    '/api/appointments',
    '/api/patients',
    '/api/whatsapp',
    '/api/invoices',
    '/api/legal',
    '/api/automation',
    '/api/users'
  ];
  
  const shouldTrack = trackableRoutes.some(route => req.path.startsWith(route));
  
  if (!shouldTrack) {
    return next();
  }
  
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const statusCode = res.statusCode;
    
    // Solo trackear operaciones exitosas
    if (statusCode < 400) {
      trackUserActivity({
        userId: req.user.id,
        action: `${req.method} ${req.path}`,
        resourceType: getResourceType(req.path),
        resourceId: getResourceId(req.params),
        success: true,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

/**
 * Registrar actividad de usuario
 */
async function trackUserActivity(data) {
  try {
    logger.info('User activity', data);
    
    // Insertar en base de datos
    await databaseService.query(
      `INSERT INTO user_activity_log (
         user_id, action, resource_type, resource_id, success,
         ip_address, user_agent, request_id, timestamp
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        data.userId,
        data.action,
        data.resourceType,
        data.resourceId,
        data.success,
        data.ip,
        data.userAgent,
        data.requestId
      ]
    );
  } catch (error) {
    logger.error(`Error al trackear actividad: ${error.message}`, { stack: error.stack });
  }
}

/**
 * Determinar tipo de recurso basado en la ruta
 */
function getResourceType(path) {
  const resourceMap = {
    '/api/appointments': 'appointment',
    '/api/patients': 'patient',
    '/api/whatsapp': 'whatsapp',
    '/api/invoices': 'invoice',
    '/api/legal': 'legal',
    '/api/automation': 'automation',
    '/api/users': 'user',
    '/api/documents': 'document'
  };
  
  for (const [route, resource] of Object.entries(resourceMap)) {
    if (path.startsWith(route)) {
      return resource;
    }
  }
  
  return 'unknown';
}

/**
 * Obtener ID de recurso de los parámetros
 */
function getResourceId(params) {
  const idFields = ['id', 'userId', 'appointmentId', 'patientId', 'invoiceId'];
  
  for (const field of idFields) {
    if (params[field]) {
      return params[field];
    }
  }
  
  return null;
}

// ==============================================
// MIDDLEWARE DE MÉTRICAS DE RENDIMIENTO
// ==============================================

/**
 * Middleware para收集 métricas de rendimiento
 */
function performanceMetrics(req, res, next) {
  const startTime = process.hrtime.bigint();
  
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convertir a milisegundos
    
    // Solo registrar métricas para rutas de API
    if (req.path.startsWith('/api/')) {
      recordPerformanceMetric({
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        duration: Math.round(duration * 100) / 100, // Redondear a 2 decimales
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

/**
 * Registrar métrica de rendimiento
 */
async function recordPerformanceMetric(data) {
  try {
    logger.info('Performance metric', data);
    
    // Insertar en base de datos
    await databaseService.query(
      `INSERT INTO performance_metrics (
         path, method, status_code, duration, user_id, timestamp
       ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        data.path,
        data.method,
        data.statusCode,
        data.duration,
        data.userId
      ]
    );
    
    // Alertas para operaciones lentas
    if (data.duration > 5000) {
      logger.warn('Slow operation detected', data);
    }
  } catch (error) {
    logger.error(`Error al registrar métrica: ${error.message}`, { stack: error.stack });
  }
}

// ==============================================
// MIDDLEWARE DE ERROR HANDLING
// ==============================================

/**
 * Middleware para logging de errores
 */
function errorLogger(err, req, res, next) {
  // Log del error con contexto
  logger.error('Application error', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id,
    userEmail: req.user?.email,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    timestamp: new Date().toISOString()
  });
  
  // Registrar error crítico en base de datos
  if (err.status >= 500 || !err.status) {
    logCriticalError({
      errorType: err.name || 'UnknownError',
      message: err.message,
      stack: err.stack,
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.id,
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    });
  }
  
  next(err);
}

/**
 * Registrar error crítico en base de datos
 */
async function logCriticalError(data) {
  try {
    await databaseService.query(
      `INSERT INTO critical_errors_log (
         error_type, message, stack, request_id, method, url,
         user_id, ip_address, timestamp
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        data.errorType,
        data.message,
        data.stack,
        data.requestId,
        data.method,
        data.url,
        data.userId,
        data.ip
      ]
    );
  } catch (error) {
    logger.error(`Error al registrar error crítico: ${error.message}`, { stack: error.stack });
  }
}

// ==============================================
// FUNCIONES DE LOGGING ESPECIALIZADAS
// ==============================================

/**
 * Log de seguridad
 */
function logSecurityEvent(event) {
  logger.warn('Security event', {
    ...event,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log de operaciones de negocio
 */
function logBusinessOperation(operation, data) {
  logger.info('Business operation', {
    operation,
    ...data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log de integraciones externas
 */
function logExternalIntegration(service, action, data) {
  logger.info('External integration', {
    service,
    action,
    ...data,
    timestamp: new Date().toISOString()
  });
}

// ==============================================
// EXPORTACIÓN
// ==============================================

module.exports = {
  // Logger principal
  logger,
  
  // Middlewares
  requestLogger,
  authLogger,
  criticalOperationLogger,
  activityTracker,
  performanceMetrics,
  errorLogger,
  
  // Funciones especializadas
  logCriticalOperation,
  trackUserActivity,
  recordPerformanceMetric,
  logSecurityEvent,
  logBusinessOperation,
  logExternalIntegration,
  
  // Utilidades
  sanitizeBodyForLogging
};
