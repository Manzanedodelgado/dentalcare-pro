/**
 * MIDDLEWARE DE SEGURIDAD Y SANITIZACIÓN
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Sanitización de entrada de datos
 * - Protección contra inyecciones SQL
 * - Validación de headers de seguridad
 * - Protección contra ataques XSS
 * - Filtrado de contenido malicioso
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const DOMPurify = require('isomorphic-dompurify');
const xss = require('xss');
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const logger = require('../utils/logger');

// ==============================================
// CONFIGURACIÓN DE SEGURIDAD
// ==============================================

// Configuración de XSS
const xssOptions = {
  whiteList: {
    // Permitir solo ciertos tags HTML seguros
    a: ['href', 'title', 'target'],
    b: [],
    i: [],
    strong: [],
    em: [],
    p: [],
    br: [],
    ul: [],
    ol: [],
    li: [],
    code: [],
    pre: []
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
  onTagAttr: (tag, name, value) => {
    // Sanitizar atributos href
    if (name === 'href') {
      if (!value.startsWith('javascript:') && !value.startsWith('data:')) {
        return { name, value: validator.escape(value) };
      }
    }
    return { name, value: validator.escape(value) };
  }
};

// Configuración de rate limiting por IP
const ipRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Se han realizado demasiadas solicitudes desde esta IP. Intente nuevamente más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} - ${req.originalUrl}`);
    res.status(429).json({
      error: 'Demasiadas solicitudes',
      message: 'Se han realizado demasiadas solicitudes desde esta IP. Intente nuevamente más tarde.'
    });
  }
});

// Rate limiting estricto para operaciones críticas
const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // máximo 5 requests por minuto
  message: {
    error: 'Demasiadas operaciones críticas',
    message: 'Se han realizado demasiadas operaciones críticas. Espere antes de intentar nuevamente.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ==============================================
// FUNCIONES DE SANITIZACIÓN
// ==============================================

/**
 * Sanitizar string para prevenir XSS
 * @param {string} input - Input a sanitizar
 * @returns {string} Input sanitizado
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Usar XSS para sanitización básica
  let sanitized = xss(input, xssOptions);
  
  // Escapar caracteres especiales
  sanitized = validator.escape(sanitized);
  
  // Remover caracteres de control peligrosos
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized.trim();
}

/**
 * Sanitizar objeto completo recursivamente
 * @param {Object} obj - Objeto a sanitizar
 * @returns {Object} Objeto sanitizado
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  return obj;
}

/**
 * Sanitizar HTML tags específicos para contenido médico
 * @param {string} html - HTML a sanitizar
 * @returns {string} HTML seguro
 */
function sanitizeHTML(html) {
  if (typeof html !== 'string') {
    return html;
  }
  
  // Configuración estricta para contenido médico
  const medicalSanitizeOptions = {
    whiteList: {
      p: [],
      br: [],
      strong: ['style'],
      em: ['style'],
      b: [],
      i: [],
      u: ['style'],
      ul: [],
      ol: [],
      li: [],
      h1: ['style'],
      h2: ['style'],
      h3: ['style'],
      h4: ['style'],
      h5: ['style'],
      h6: ['style'],
      blockquote: ['style'],
      code: [],
      pre: []
    },
    allowedAttributes: {
      '*': ['style']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  };
  
  return xss(html, medicalSanitizeOptions);
}

/**
 * Validar y sanitizar número
 * @param {*} input - Input a validar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {number|null} Número sanitizado o null si es inválido
 */
function sanitizeNumber(input, min = -Infinity, max = Infinity) {
  if (input === null || input === undefined || input === '') {
    return null;
  }
  
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }
  
  if (num < min || num > max) {
    return null;
  }
  
  return num;
}

/**
 * Sanitizar email
 * @param {string} email - Email a sanitizar
 * @returns {string|null} Email sanitizado o null si es inválido
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return null;
  }
  
  const sanitized = email.trim().toLowerCase();
  
  if (!validator.isEmail(sanitized)) {
    return null;
  }
  
  return sanitized;
}

/**
 * Sanitizar teléfono
 * @param {string} phone - Teléfono a sanitizar
 * @returns {string|null} Teléfono sanitizado o null si es inválido
 */
function sanitizePhone(phone) {
  if (typeof phone !== 'string') {
    return null;
  }
  
  const sanitized = phone.trim();
  
  // Permitir formato internacional
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  
  if (!phoneRegex.test(sanitized)) {
    return null;
  }
  
  return sanitized;
}

/**
 * Sanitizar fecha
 * @param {string} date - Fecha a sanitizar
 * @returns {Date|null} Fecha sanitizada o null si es inválida
 */
function sanitizeDate(date) {
  if (typeof date !== 'string') {
    return null;
  }
  
  const sanitized = date.trim();
  
  // Validar formato ISO 8601
  if (!validator.isISO8601(sanitized)) {
    return null;
  }
  
  const dateObj = new Date(sanitized);
  
  if (isNaN(dateObj.getTime())) {
    return null;
  }
  
  return dateObj;
}

// ==============================================
// MIDDLEWARE DE SANITIZACIÓN
// ==============================================

/**
 * Middleware para sanitizar todos los inputs
 */
function sanitizeInput(req, res, next) {
  try {
    // Sanitizar query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitizar body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitizar params
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    logger.error(`Error en sanitización: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error de sanitización',
      message: 'No se pudieron procesar los datos de entrada'
    });
  }
}

/**
 * Middleware para sanitizar HTML específico para contenido médico
 */
function sanitizeMedicalContent(req, res, next) {
  if (req.body && req.body.content) {
    req.body.content = sanitizeHTML(req.body.content);
  }
  
  if (req.body && req.body.notes) {
    req.body.notes = sanitizeHTML(req.body.notes);
  }
  
  next();
}

/**
 * Middleware para validar y sanitizar emails
 */
function validateAndSanitizeEmail(req, res, next) {
  if (req.body && req.body.email) {
    const sanitizedEmail = sanitizeEmail(req.body.email);
    
    if (!sanitizedEmail) {
      return res.status(400).json({
        error: 'Email inválido',
        message: 'El email proporcionado no tiene un formato válido'
      });
    }
    
    req.body.email = sanitizedEmail;
  }
  
  next();
}

/**
 * Middleware para validar y sanitizar teléfonos
 */
function validateAndSanitizePhone(req, res, next) {
  if (req.body && req.body.phone) {
    const sanitizedPhone = sanitizePhone(req.body.phone);
    
    if (!sanitizedPhone) {
      return res.status(400).json({
        error: 'Teléfono inválido',
        message: 'El teléfono proporcionado no tiene un formato válido'
      });
    }
    
    req.body.phone = sanitizedPhone;
  }
  
  if (req.body && req.body.patient_phone) {
    const sanitizedPhone = sanitizePhone(req.body.patient_phone);
    
    if (!sanitizedPhone) {
      return res.status(400).json({
        error: 'Teléfono de paciente inválido',
        message: 'El teléfono del paciente no tiene un formato válido'
      });
    }
    
    req.body.patient_phone = sanitizedPhone;
  }
  
  next();
}

/**
 * Middleware para validar y sanitizar fechas
 */
function validateAndSanitizeDates(req, res, next) {
  const dateFields = ['appointmentDate', 'dateFrom', 'dateTo', 'birthDate'];
  
  dateFields.forEach(field => {
    if (req.body && req.body[field]) {
      const sanitizedDate = sanitizeDate(req.body[field]);
      
      if (!sanitizedDate) {
        return res.status(400).json({
          error: 'Fecha inválida',
          message: `La fecha ${field} no tiene un formato válido`
        });
      }
      
      req.body[field] = sanitizedDate.toISOString();
    }
  });
  
  next();
}

/**
 * Middleware para validar y sanitizar números
 */
function validateAndSanitizeNumbers(req, res, next) {
  const numberFields = ['age', 'phone', 'price', 'amount'];
  
  numberFields.forEach(field => {
    if (req.body && req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
      const sanitizedNumber = sanitizeNumber(req.body[field]);
      
      if (sanitizedNumber === null) {
        return res.status(400).json({
          error: 'Número inválido',
          message: `El campo ${field} debe ser un número válido`
        });
      }
      
      req.body[field] = sanitizedNumber;
    }
  });
  
  next();
}

// ==============================================
// MIDDLEWARE DE VALIDACIÓN DE HEADERS
// ==============================================

/**
 * Validar headers de seguridad
 */
function validateSecurityHeaders(req, res, next) {
  // Verificar que no se envíen headers peligrosos
  const dangerousHeaders = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url',
    'x-originating-ip'
  ];
  
  for (const header of dangerousHeaders) {
    if (req.headers[header]) {
      logger.warn(`Header potencialmente peligroso detectado: ${header} = ${req.headers[header]}`);
    }
  }
  
  next();
}

/**
 * Validar content-type
 */
function validateContentType(req, res, next) {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.headers['content-type'];
    
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        error: 'Content-Type inválido',
        message: 'Para operaciones POST/PUT/PATCH se requiere Content-Type: application/json'
      });
    }
  }
  
  next();
}

// ==============================================
// MIDDLEWARE DE PROTECCIÓN ADICIONAL
// ==============================================

/**
 * Protección contra injection SQL (detección básica)
 */
function detectSQLInjection(req, res, next) {
  const dangerousPatterns = [
    /('|(\\x27)|(\\x22)|(\\x2d)|(\\x5c))/i,
    /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i,
    /(script|javascript:|data:|vbscript:)/i
  ];
  
  const dataToCheck = [
    ...Object.values(req.query || {}),
    ...Object.values(req.body || {}),
    ...Object.values(req.params || {})
  ].join(' ');
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(dataToCheck)) {
      logger.warn(`Posible inyección SQL detectada desde IP: ${req.ip} - ${req.originalUrl}`);
      return res.status(400).json({
        error: 'Solicitud sospechosa',
        message: 'La solicitud contiene contenido potencialmente malicioso'
      });
    }
  }
  
  next();
}

/**
 * Validar user agent
 */
function validateUserAgent(req, res, next) {
  const userAgent = req.headers['user-agent'];
  
  // Verificar que existe user agent
  if (!userAgent) {
    logger.warn(`Solicitud sin User-Agent desde IP: ${req.ip}`);
    return res.status(400).json({
      error: 'User-Agent requerido',
      message: 'Se requiere un User-Agent válido'
    });
  }
  
  // Verificar que no es un bot malicioso conocido
  const maliciousBots = [
    'bot', 'crawler', 'spider', 'scraper'
  ];
  
  const userAgentLower = userAgent.toLowerCase();
  const isMalicious = maliciousBots.some(bot => userAgentLower.includes(bot));
  
  if (isMalicious) {
    logger.warn(`Bot potencialmente malicioso: ${userAgent} desde IP: ${req.ip}`);
    // Permitir pero registrar
  }
  
  next();
}

// ==============================================
// MIDDLEWARE DE RATE LIMITING ESPECÍFICO
// ==============================================

/**
 * Rate limiting para operaciones de autenticación
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por ventana
  message: {
    error: 'Demasiados intentos de autenticación',
    message: 'Demasiados intentos de login. Espere 15 minutos antes de intentar nuevamente.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Saltar rate limiting para usuarios ya autenticados
    return !!req.user;
  }
});

/**
 * Rate limiting para operaciones críticas
 */
const criticalOperationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 3, // máximo 3 operaciones críticas por minuto
  message: {
    error: 'Demasiadas operaciones críticas',
    message: 'Espere antes de realizar otra operación crítica.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ==============================================
// EXPORTACIÓN DE MIDDLEWARES Y FUNCIONES
// ==============================================

module.exports = {
  // Middlewares principales
  sanitizeInput,
  sanitizeMedicalContent,
  validateAndSanitizeEmail,
  validateAndSanitizePhone,
  validateAndSanitizeDates,
  validateAndSanitizeNumbers,
  
  // Middlewares de validación
  validateSecurityHeaders,
  validateContentType,
  detectSQLInjection,
  validateUserAgent,
  
  // Rate limitings
  ipRateLimit,
  strictRateLimit,
  authRateLimit,
  criticalOperationRateLimit,
  
  // Funciones de utilidad
  sanitizeString,
  sanitizeObject,
  sanitizeHTML,
  sanitizeNumber,
  sanitizeEmail,
  sanitizePhone,
  sanitizeDate,
  
  // Configuraciones
  xssOptions
};
