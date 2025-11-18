/**
 * MIDDLEWARE DE AUTENTICACIÓN Y AUTORIZACIÓN
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Verificación de tokens JWT
 * - Control de acceso basado en roles
 * - Validación de permisos granulares
 * - Gestión de sesiones
 * - Auditoría de accesos
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const jwt = require('jsonwebtoken');
const databaseService = require('../utils/databaseService');
const logger = require('../utils/logger');

// ==============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ==============================================

/**
 * Middleware para verificar autenticación JWT
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
async function authenticateJWT(req, res, next) {
  try {
    // Extraer token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token requerido',
        message: 'Se requiere un token de autenticación válido'
      });
    }
    
    const token = authHeader.substring(7); // Remover 'Bearer '
    
    try {
      // Verificar y decodificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Obtener datos actualizados del usuario
      const userQuery = await databaseService.query(
        'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
        [decoded.id]
      );
      
      if (userQuery.rows.length === 0) {
        return res.status(401).json({
          error: 'Usuario no encontrado',
          message: 'El usuario del token no existe en el sistema'
        });
      }
      
      const user = userQuery.rows[0];
      
      // Verificar que el usuario está activo
      if (!user.is_active) {
        return res.status(401).json({
          error: 'Usuario inactivo',
          message: 'El usuario está desactivado'
        });
      }
      
      // Agregar usuario al request
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        token: token
      };
      
      // Registrar acceso
      await databaseService.query(
        'UPDATE users SET last_access = NOW() WHERE id = $1',
        [user.id]
      );
      
      next();
      
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expirado',
          message: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Token inválido',
          message: 'El token proporcionado no es válido'
        });
      } else {
        throw jwtError;
      }
    }
    
  } catch (error) {
    logger.error(`Error en autenticación: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error de autenticación',
      message: 'No se pudo verificar la autenticación'
    });
  }
}

/**
 * Middleware para requerir autenticación
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'No autenticado',
      message: 'Se requiere autenticación para acceder a este recurso'
    });
  }
  next();
}

/**
 * Middleware para requerir rol de administrador
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'No autenticado',
      message: 'Se requiere autenticación'
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Permisos insuficientes',
      message: 'Se requieren permisos de administrador'
    });
  }
  
  next();
}

/**
 * Middleware para requerir rol específico
 * @param {string|Array} roles - Rol(es) requerido(s)
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Se requiere autenticación'
      });
    }
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: `Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
      });
    }
    
    next();
  };
}

/**
 * Middleware para verificar permiso específico
 * @param {string} permission - Permiso requerido
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Se requiere autenticación'
      });
    }
    
    // Verificar permiso usando la función del controlador de autenticación
    const { hasPermission } = require('../controllers/authController');
    
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: `Se requiere el permiso: ${permission}`
      });
    }
    
    next();
  };
}

/**
 * Middleware para verificar múltiples permisos (todos requeridos)
 * @param {Array} permissions - Lista de permisos requeridos
 */
function requireAllPermissions(permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Se requiere autenticación'
      });
    }
    
    const { hasPermission } = require('../controllers/authController');
    
    const missingPermissions = permissions.filter(permission => 
      !hasPermission(req.user, permission)
    );
    
    if (missingPermissions.length > 0) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: `Se requieren los siguientes permisos: ${missingPermissions.join(', ')}`
      });
    }
    
    next();
  };
}

/**
 * Middleware para verificar al menos uno de los permisos
 * @param {Array} permissions - Lista de permisos alternativos
 */
function requireAnyPermission(permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Se requiere autenticación'
      });
    }
    
    const { hasPermission } = require('../controllers/authController');
    
    const hasAnyPermission = permissions.some(permission => 
      hasPermission(req.user, permission)
    );
    
    if (!hasAnyPermission) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: `Se requiere al menos uno de los siguientes permisos: ${permissions.join(', ')}`
      });
    }
    
    next();
  };
}

// ==============================================
// MIDDLEWARE DE SESIÓN
// ==============================================

/**
 * Verificar sesión activa
 */
function verifySession(req, res, next) {
  // Verificar que existe una sesión activa
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Sesión requerida',
      message: 'Se requiere una sesión activa'
    });
  }
  
  // Verificar que la sesión coincide con el token
  if (req.session.userId !== req.user.id) {
    return res.status(401).json({
      error: 'Sesión inválida',
      message: 'La sesión no coincide con el usuario autenticado'
    });
  }
  
  next();
}

// ==============================================
// MIDDLEWARE DE AUDITORÍA
// ==============================================

/**
 * Registrar acceso a recursos sensibles
 */
function auditAccess(resourceType) {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Registrar acceso después de la respuesta
      setImmediate(async () => {
        try {
          await databaseService.query(
            `INSERT INTO access_audit_log (
              user_id, resource_type, resource_id, action, 
              ip_address, user_agent, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [
              req.user?.id || null,
              resourceType,
              req.params.id || req.params.userId || req.params.appointmentId || null,
              `${req.method} ${req.path}`,
              req.ip || req.connection.remoteAddress,
              req.headers['user-agent'] || ''
            ]
          );
        } catch (auditError) {
          logger.error(`Error en auditoría: ${auditError.message}`);
        }
      });
      
      // Llamar al send original
      originalSend.call(this, data);
    };
    
    next();
  };
}

// ==============================================
// MIDDLEWARE DE RATE LIMITING PERSONALIZADO
// ==============================================

/**
 * Rate limiting por usuario
 */
const userRateLimits = new Map();

/**
 * Verificar rate limiting por usuario
 * @param {number} maxRequests - Máximo número de requests
 * @param {number} windowMs - Ventana de tiempo en ms
 */
function userRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    if (!req.user) {
      return next(); // Solo aplicar a usuarios autenticados
    }
    
    const userId = req.user.id;
    const now = Date.now();
    
    if (!userRateLimits.has(userId)) {
      userRateLimits.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const userLimit = userRateLimits.get(userId);
    
    // Resetear contador si la ventana ha pasado
    if (now > userLimit.resetTime) {
      userLimit.count = 1;
      userLimit.resetTime = now + windowMs;
      return next();
    }
    
    // Verificar límite
    if (userLimit.count >= maxRequests) {
      return res.status(429).json({
        error: 'Demasiadas solicitudes',
        message: `Has excedido el límite de ${maxRequests} solicitudes por ${windowMs / 1000 / 60} minutos`,
        resetTime: new Date(userLimit.resetTime)
      });
    }
    
    // Incrementar contador
    userLimit.count++;
    next();
  };
}

/**
 * Rate limiting especial para operaciones críticas
 */
const criticalOperationLimits = new Map();

/**
 * Verificar rate limiting para operaciones críticas
 * @param {number} maxRequests - Máximo número de requests
 * @param {number} windowMs - Ventana de tiempo en ms
 */
function criticalOperationRateLimit(maxRequests = 5, windowMs = 60 * 1000) {
  return (req, res, next) => {
    if (!req.user) {
      return next();
    }
    
    const userId = req.user.id;
    const operation = req.path;
    const key = `${userId}:${operation}`;
    const now = Date.now();
    
    if (!criticalOperationLimits.has(key)) {
      criticalOperationLimits.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const operationLimit = criticalOperationLimits.get(key);
    
    // Resetear contador si la ventana ha pasado
    if (now > operationLimit.resetTime) {
      operationLimit.count = 1;
      operationLimit.resetTime = now + windowMs;
      return next();
    }
    
    // Verificar límite
    if (operationLimit.count >= maxRequests) {
      return res.status(429).json({
        error: 'Demasiadas operaciones críticas',
        message: `Has excedido el límite de ${maxRequests} operaciones por minuto`,
        resetTime: new Date(operationLimit.resetTime)
      });
    }
    
    // Incrementar contador
    operationLimit.count++;
    next();
  };
}

// ==============================================
// MIDDLEWARE DE VALIDACIÓN DE ESTADO
// ==============================================

/**
 * Verificar que el usuario está activo
 */
function verifyUserActive(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'No autenticado',
      message: 'Se requiere autenticación'
    });
  }
  
  if (req.user.is_active === false) {
    return res.status(403).json({
      error: 'Usuario inactivo',
      message: 'Tu cuenta ha sido desactivada'
    });
  }
  
  next();
}

/**
 * Verificar límites de la cuenta
 */
function verifyAccountLimits(req, res, next) {
  if (!req.user) {
    return next();
  }
  
  // Verificar intentos fallidos de login
  databaseService.query(
    'SELECT failed_attempts, last_failed_attempt FROM users WHERE id = $1',
    [req.user.id]
  ).then(result => {
    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Verificar si está bloqueado por demasiados intentos
      if (user.failed_attempts >= 5) {
        const lastFailed = new Date(user.last_failed_attempt);
        const now = new Date();
        const hoursDiff = (now - lastFailed) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          return res.status(423).json({
            error: 'Cuenta bloqueada',
            message: 'La cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos'
          });
        }
      }
    }
    
    next();
  }).catch(error => {
    logger.error(`Error al verificar límites de cuenta: ${error.message}`);
    next(); // Continuar si hay error en la verificación
  });
}

// ==============================================
// EXPORTACIÓN DE MIDDLEWARES
// ==============================================

module.exports = {
  // Autenticación
  authenticateJWT,
  requireAuth,
  requireAdmin,
  requireRole,
  requirePermission,
  requireAllPermissions,
  requireAnyPermission,
  
  // Sesión
  verifySession,
  
  // Auditoría
  auditAccess,
  
  // Rate Limiting
  userRateLimit,
  criticalOperationRateLimit,
  
  // Validación de estado
  verifyUserActive,
  verifyAccountLimits,
  
  // Variables exportadas para uso en otros módulos
  userRateLimits,
  criticalOperationLimits
};
