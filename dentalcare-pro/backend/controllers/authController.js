/**
 * CONTROLADOR DE AUTENTICACIÓN Y CONTROL DE ACCESO
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Autenticación JWT
 * - Control de acceso multi-nivel (Admin, Dentista, Personal, Higienista)
 * - Gestión de sesiones
 * - Sistema de permisos granular
 * - Auditoría de accesos
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const databaseService = require('../utils/databaseService');
const logger = require('../utils/logger');
const emailService = require('../utils/emailService');

// ==============================================
// CONFIGURACIÓN DE ROLES Y PERMISOS
// ==============================================

const USER_ROLES = {
  ADMIN: {
    id: 'admin',
    name: 'Administrador',
    permissions: ['*'], // Acceso total
    level: 1
  },
  DENTIST: {
    id: 'dentist',
    name: 'Dentista',
    permissions: [
      'patients.read', 'patients.create', 'patients.update',
      'appointments.read', 'appointments.create', 'appointments.update',
      'whatsapp.read', 'whatsapp.send',
      'documents.read', 'documents.generate',
      'invoices.read', 'invoices.create',
      'agenda.read', 'agenda.update'
    ],
    level: 2
  },
  STAFF: {
    id: 'staff',
    name: 'Personal Administrativo',
    permissions: [
      'patients.read', 'patients.create', 'patients.update',
      'appointments.read', 'appointments.create', 'appointments.update',
      'whatsapp.read', 'whatsapp.send',
      'agenda.read', 'agenda.update',
      'invoices.read', 'invoices.create',
      'documents.read'
    ],
    level: 3
  },
  HYGIENIST: {
    id: 'hygienist',
    name: 'Higienista',
    permissions: [
      'patients.read',
      'appointments.read',
      'whatsapp.read',
      'agenda.read'
    ],
    level: 4
  }
};

const PERMISSIONS_MATRIX = {
  // Gestión de pacientes
  'patients.read': ['admin', 'dentist', 'staff', 'hygienist'],
  'patients.create': ['admin', 'dentist', 'staff'],
  'patients.update': ['admin', 'dentist', 'staff'],
  'patients.delete': ['admin'],
  
  // Gestión de citas
  'appointments.read': ['admin', 'dentist', 'staff', 'hygienist'],
  'appointments.create': ['admin', 'dentist', 'staff'],
  'appointments.update': ['admin', 'dentist', 'staff'],
  'appointments.delete': ['admin'],
  
  // WhatsApp y comunicaciones
  'whatsapp.read': ['admin', 'dentist', 'staff', 'hygienist'],
  'whatsapp.send': ['admin', 'dentist', 'staff'],
  'whatsapp.urgent': ['admin', 'dentist'],
  
  // Agenda
  'agenda.read': ['admin', 'dentist', 'staff', 'hygienist'],
  'agenda.update': ['admin', 'dentist', 'staff'],
  'agenda.delete': ['admin'],
  
  // Facturación
  'invoices.read': ['admin', 'dentist', 'staff'],
  'invoices.create': ['admin', 'dentist', 'staff'],
  'invoices.update': ['admin', 'dentist'],
  'invoices.delete': ['admin'],
  
  // Documentos
  'documents.read': ['admin', 'dentist', 'staff', 'hygienist'],
  'documents.generate': ['admin', 'dentist', 'staff'],
  'documents.delete': ['admin'],
  
  // Automatizaciones
  'automation.config': ['admin'],
  'automation.execute': ['admin', 'dentist'],
  
  // Usuarios
  'users.read': ['admin'],
  'users.create': ['admin'],
  'users.update': ['admin'],
  'users.delete': ['admin'],
  
  // Reportes
  'reports.read': ['admin', 'dentist'],
  'reports.generate': ['admin'],
  
  // Configuración del sistema
  'system.config': ['admin'],
  'system.monitor': ['admin']
};

// ==============================================
// FUNCIONES AUXILIARES
// ==============================================

/**
 * Verificar si un usuario tiene un permiso específico
 * @param {Object} user - Usuario autenticado
 * @param {string} permission - Permiso a verificar
 * @returns {boolean}
 */
function hasPermission(user, permission) {
  if (!user || !user.role) return false;
  
  const userRole = USER_ROLES[user.role.toUpperCase()];
  if (!userRole) return false;
  
  // Administrador tiene acceso total
  if (userRole.permissions.includes('*')) return true;
  
  return userRole.permissions.includes(permission);
}

/**
 * Obtener permisos del usuario por rol
 * @param {string} role - Rol del usuario
 * @returns {Array} Lista de permisos
 */
function getRolePermissions(role) {
  const userRole = USER_ROLES[role.toUpperCase()];
  return userRole ? userRole.permissions : [];
}

/**
 * Generar token JWT
 * @param {Object} user - Datos del usuario
 * @returns {string} Token JWT
 */
function generateJWT(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET);
}

/**
 * Generar token para reset de contraseña
 * @param {string} email - Email del usuario
 * @returns {string} Token único
 */
function generateResetToken(email) {
  const data = {
    email,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(32).toString('hex')
  };
  
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
}

/**
 * Registrar intento de acceso
 * @param {string} email - Email del usuario
 * @param {boolean} success - Si fue exitoso
 * @param {string} ip - IP del cliente
 */
async function logAccessAttempt(email, success, ip) {
  try {
    await databaseService.query(
      `INSERT INTO auth_logs (email, success, ip_address, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [email, success, ip]
    );
  } catch (error) {
    logger.error(`Error al registrar intento de acceso: ${error.message}`);
  }
}

// ==============================================
// CONTROLADOR DE LOGIN
// ==============================================

/**
 * Login de usuario con validación de credenciales
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    
    logger.info(`Intento de login para email: ${email}`);
    
    // Validar que el usuario existe
    const userQuery = await databaseService.query(
      `SELECT id, email, password, name, role, is_active, 
              failed_attempts, last_failed_attempt, created_at, updated_at
       FROM users 
       WHERE email = $1 AND is_active = true`,
      [email.toLowerCase()]
    );
    
    if (userQuery.rows.length === 0) {
      await logAccessAttempt(email, false, ip);
      logger.warn(`Intento de login fallido para usuario inexistente: ${email}`);
      
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
    }
    
    const user = userQuery.rows[0];
    
    // Verificar si la cuenta está bloqueada
    if (user.failed_attempts >= 5) {
      const lastFailed = new Date(user.last_failed_attempt);
      const now = new Date();
      const timeDiff = now - lastFailed;
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        await logAccessAttempt(email, false, ip);
        logger.warn(`Intento de login bloqueado para usuario: ${email} - Demasiados intentos fallidos`);
        
        return res.status(423).json({
          error: 'Cuenta bloqueada',
          message: 'La cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos. Intente nuevamente en 24 horas.'
        });
      } else {
        // Resetear contador después de 24 horas
        await databaseService.query(
          'UPDATE users SET failed_attempts = 0, last_failed_attempt = NULL WHERE email = $1',
          [email.toLowerCase()]
        );
      }
    }
    
    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      // Incrementar contador de intentos fallidos
      await databaseService.query(
        `UPDATE users 
         SET failed_attempts = failed_attempts + 1, last_failed_attempt = NOW()
         WHERE id = $1`,
        [user.id]
      );
      
      await logAccessAttempt(email, false, ip);
      logger.warn(`Intento de login fallido para usuario: ${email} - Contraseña incorrecta`);
      
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
    }
    
    // Login exitoso - resetear contador
    await databaseService.query(
      `UPDATE users 
       SET failed_attempts = 0, last_failed_attempt = NULL, last_login = NOW()
       WHERE id = $1`,
      [user.id]
    );
    
    // Generar token JWT
    const token = generateJWT(user);
    
    // Registrar login exitoso
    await logAccessAttempt(email, true, ip);
    logger.info(`Login exitoso para usuario: ${email} con rol: ${user.role}`);
    
    // Crear sesión
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.save();
    
    // Respuesta exitosa
    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roleName: USER_ROLES[user.role.toUpperCase()].name,
          permissions: getRolePermissions(user.role),
          lastLogin: user.last_login
        },
        token,
        expiresIn: 86400 // 24 horas en segundos
      }
    });
    
  } catch (error) {
    logger.error(`Error en login: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo procesar el login'
    });
  }
}

// ==============================================
// CONTROLADOR DE LOGOUT
// ==============================================

/**
 * Logout de usuario y invalidar sesión
 * POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    // Invalidar sesión actual
    req.session.destroy(async (err) => {
      if (err) {
        logger.error(`Error al destruir sesión: ${err.message}`);
        return res.status(500).json({
          error: 'Error al cerrar sesión',
          message: 'No se pudo cerrar la sesión correctamente'
        });
      }
      
      // Registrar logout
      await logAccessAttempt(userEmail, true, req.ip);
      logger.info(`Logout exitoso para usuario: ${userEmail}`);
      
      res.json({
        success: true,
        message: 'Sesión cerrada correctamente'
      });
    });
    
  } catch (error) {
    logger.error(`Error en logout: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo cerrar la sesión'
    });
  }
}

// ==============================================
// CONTROLADOR DE RENOVACIÓN DE TOKEN
// ==============================================

/**
 * Renovar token JWT antes de que expire
 * POST /api/auth/refresh
 */
async function refreshToken(req, res) {
  try {
    const user = req.user;
    
    // Generar nuevo token
    const newToken = generateJWT(user);
    
    logger.info(`Token renovado para usuario: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Token renovado correctamente',
      data: {
        token: newToken,
        expiresIn: 86400 // 24 horas
      }
    });
    
  } catch (error) {
    logger.error(`Error al renovar token: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al renovar token',
      message: 'No se pudo renovar la sesión'
    });
  }
}

// ==============================================
// CONTROLADOR DE VERIFICACIÓN DE TOKEN
// ==============================================

/**
 * Verificar validez del token JWT
 * GET /api/auth/verify
 */
async function verifyToken(req, res) {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      message: 'Token válido',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roleName: USER_ROLES[user.role.toUpperCase()].name,
          permissions: getRolePermissions(user.role)
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al verificar token: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al verificar token',
      message: 'No se pudo verificar la validez del token'
    });
  }
}

// ==============================================
// CONTROLADOR DE REGISTRO (SOLO ADMIN)
// ==============================================

/**
 * Registrar nuevo usuario (solo administradores)
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;
    const adminUser = req.user;
    
    // Verificar que el rol es válido
    if (!USER_ROLES[role.toUpperCase()]) {
      return res.status(400).json({
        error: 'Rol inválido',
        message: 'El rol especificado no existe en el sistema'
      });
    }
    
    // Verificar si el email ya existe
    const existingUser = await databaseService.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Email ya registrado',
        message: 'Ya existe un usuario con este email'
      });
    }
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Crear nuevo usuario
    const newUser = await databaseService.query(
      `INSERT INTO users (name, email, password, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email.toLowerCase(), hashedPassword, role.toLowerCase()]
    );
    
    const user = newUser.rows[0];
    
    logger.info(`Nuevo usuario registrado: ${email} con rol: ${role} por ${adminUser.email}`);
    
    res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          roleName: USER_ROLES[user.role.toUpperCase()].name,
          isActive: user.is_active,
          createdAt: user.created_at
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al registrar usuario: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo registrar el usuario'
    });
  }
}

// ==============================================
// CONTROLADOR DE CAMBIO DE CONTRASEÑA
// ==============================================

/**
 * Cambiar contraseña del usuario autenticado
 * POST /api/auth/change-password
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    // Verificar contraseña actual
    const userQuery = await databaseService.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se pudo verificar la identidad del usuario'
      });
    }
    
    const user = userQuery.rows[0];
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
      logger.warn(`Intento de cambio de contraseña fallido para usuario ID: ${userId} - Contraseña actual incorrecta`);
      return res.status(401).json({
        error: 'Contraseña actual incorrecta',
        message: 'La contraseña actual proporcionada no es correcta'
      });
    }
    
    // Validar nueva contraseña (debe cumplir criterios de seguridad)
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Contraseña débil',
        message: 'La nueva contraseña debe tener al menos 8 caracteres'
      });
    }
    
    // Encriptar nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    
    // Actualizar contraseña
    await databaseService.query(
      `UPDATE users 
       SET password = $1, updated_at = NOW()
       WHERE id = $2`,
      [hashedNewPassword, userId]
    );
    
    logger.info(`Contraseña cambiada exitosamente para usuario ID: ${userId}`);
    
    res.json({
      success: true,
      message: 'Contraseña cambiada correctamente'
    });
    
  } catch (error) {
    logger.error(`Error al cambiar contraseña: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo cambiar la contraseña'
    });
  }
}

// ==============================================
// CONTROLADOR DE SOLICITUD DE RESET
// ==============================================

/**
 * Solicitar reset de contraseña por email
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    
    // Verificar si el usuario existe
    const userQuery = await databaseService.query(
      'SELECT id, name, email FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    
    if (userQuery.rows.length === 0) {
      // No revelar si el email existe o no por seguridad
      return res.json({
        success: true,
        message: 'Si el email existe en nuestro sistema, se ha enviado un enlace de recuperación'
      });
    }
    
    const user = userQuery.rows[0];
    
    // Generar token de reset
    const resetToken = generateResetToken(user.email);
    const expiresAt = new Date(Date.now() + 3600000); // 1 hora
    
    // Guardar token en base de datos
    await databaseService.query(
      `INSERT INTO password_resets (user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [user.id, resetToken, expiresAt]
    );
    
    // Limpiar tokens expirados
    await databaseService.query(
      'DELETE FROM password_resets WHERE expires_at < NOW()'
    );
    
    try {
      // Enviar email con enlace de recuperación
      await emailService.sendPasswordResetEmail(
        user.email,
        user.name,
        resetToken
      );
      
      logger.info(`Email de reset enviado a: ${user.email}`);
    } catch (emailError) {
      logger.error(`Error al enviar email de reset: ${emailError.message}`);
      // Continuar sin revelar error de email por seguridad
    }
    
    res.json({
      success: true,
      message: 'Si el email existe en nuestro sistema, se ha enviado un enlace de recuperación'
    });
    
  } catch (error) {
    logger.error(`Error en solicitud de reset: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo procesar la solicitud de recuperación'
    });
  }
}

// ==============================================
// CONTROLADOR DE RESET DE CONTRASEÑA
// ==============================================

/**
 * Resetear contraseña usando token
 * POST /api/auth/reset-password/:token
 */
async function resetPassword(req, res) {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    
    // Verificar token y si no ha expirado
    const resetQuery = await databaseService.query(
      `SELECT pr.user_id, u.email, u.name
       FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = $1 AND pr.expires_at > NOW() AND u.is_active = true`,
      [token]
    );
    
    if (resetQuery.rows.length === 0) {
      logger.warn(`Intento de reset con token inválido/expirado: ${token}`);
      return res.status(400).json({
        error: 'Token inválido o expirado',
        message: 'El enlace de recuperación no es válido o ha expirado'
      });
    }
    
    const resetData = resetQuery.rows[0];
    
    // Validar nueva contraseña
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Contraseña débil',
        message: 'La nueva contraseña debe tener al menos 8 caracteres'
      });
    }
    
    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Actualizar contraseña
    await databaseService.query(
      `UPDATE users 
       SET password = $1, updated_at = NOW()
       WHERE id = $2`,
      [hashedPassword, resetData.user_id]
    );
    
    // Eliminar token de reset (uso único)
    await databaseService.query(
      'DELETE FROM password_resets WHERE token = $1',
      [token]
    );
    
    logger.info(`Contraseña reseteada exitosamente para usuario: ${resetData.email}`);
    
    res.json({
      success: true,
      message: 'Contraseña reseteada correctamente. Puede iniciar sesión con su nueva contraseña.'
    });
    
  } catch (error) {
    logger.error(`Error al resetear contraseña: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo resetear la contraseña'
    });
  }
}

// ==============================================
// CONTROLADOR DE PERFIL DE USUARIO
// ==============================================

/**
 * Obtener perfil del usuario autenticado
 * GET /api/user/profile
 */
async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    
    const userQuery = await databaseService.query(
      `SELECT id, name, email, role, phone, 
              created_at, updated_at, last_login, is_active
       FROM users 
       WHERE id = $1`,
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se pudo obtener el perfil del usuario'
      });
    }
    
    const user = userQuery.rows[0];
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          roleName: USER_ROLES[user.role.toUpperCase()].name,
          phone: user.phone,
          permissions: getRolePermissions(user.role),
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLogin: user.last_login,
          isActive: user.is_active
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener perfil: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener el perfil del usuario'
    });
  }
}

// ==============================================
// CONTROLADOR DE ACTUALIZACIÓN DE PERFIL
// ==============================================

/**
 * Actualizar perfil del usuario autenticado
 * PUT /api/user/profile
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { name, phone } = req.body;
    
    // Actualizar datos del perfil
    const updateQuery = await databaseService.query(
      `UPDATE users 
       SET name = $1, phone = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, email, role, phone, updated_at`,
      [name, phone, userId]
    );
    
    if (updateQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se pudo actualizar el perfil'
      });
    }
    
    const updatedUser = updateQuery.rows[0];
    
    logger.info(`Perfil actualizado para usuario: ${updatedUser.email}`);
    
    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          roleName: USER_ROLES[updatedUser.role.toUpperCase()].name,
          phone: updatedUser.phone,
          updatedAt: updatedUser.updated_at
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al actualizar perfil: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo actualizar el perfil'
    });
  }
}

// ==============================================
// EXPORTACIÓN DE FUNCIONES Y UTILIDADES
// ==============================================

module.exports = {
  // Funciones de autenticación
  login,
  logout,
  refreshToken,
  verifyToken,
  
  // Funciones de gestión de contraseñas
  register,
  changePassword,
  forgotPassword,
  resetPassword,
  
  // Funciones de perfil
  getProfile,
  updateProfile,
  
  // Utilidades para otros controladores
  USER_ROLES,
  PERMISSIONS_MATRIX,
  hasPermission,
  getRolePermissions,
  generateJWT,
  generateResetToken,
  logAccessAttempt
};
