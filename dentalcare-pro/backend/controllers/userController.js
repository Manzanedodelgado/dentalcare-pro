/**
 * CONTROLADOR DE USUARIOS Y CONTROL DE ACCESO
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Gestión completa de usuarios del sistema
 * - Control de acceso multi-nivel con permisos granulares
 * - Auditoría de accesos y cambios
 * - Gestión de roles y permisos
 * - Configuración de accesos por departamento
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const databaseService = require('../utils/databaseService');
const logger = require('../utils/logger');
const { 
  USER_ROLES, 
  PERMISSIONS_MATRIX, 
  getRolePermissions, 
  hasPermission 
} = require('./authController');

// ==============================================
// FUNCIONES AUXILIARES
// ==============================================

/**
 * Validar permisos específicos del usuario
 * @param {Object} user - Usuario a validar
 * @param {Array} requiredPermissions - Permisos requeridos
 * @returns {boolean}
 */
function validateUserPermissions(user, requiredPermissions) {
  return requiredPermissions.every(permission => hasPermission(user, permission));
}

/**
 * Generar resumen de permisos del usuario
 * @param {Object} user - Usuario
 * @returns {Object} Resumen de permisos
 */
function generatePermissionSummary(user) {
  const rolePermissions = getRolePermissions(user.role);
  const userPermissions = rolePermissions.filter(permission => permission !== '*');
  
  // Categorizar permisos
  const categorizedPermissions = {
    patients: userPermissions.filter(p => p.startsWith('patients.')),
    appointments: userPermissions.filter(p => p.startsWith('appointments.')),
    whatsapp: userPermissions.filter(p => p.startsWith('whatsapp.')),
    agenda: userPermissions.filter(p => p.startsWith('agenda.')),
    invoices: userPermissions.filter(p => p.startsWith('invoices.')),
    documents: userPermissions.filter(p => p.startsWith('documents.')),
    automation: userPermissions.filter(p => p.startsWith('automation.')),
    users: userPermissions.filter(p => p.startsWith('users.')),
    reports: userPermissions.filter(p => p.startsWith('reports.')),
    system: userPermissions.filter(p => p.startsWith('system.'))
  };
  
  return {
    role: user.role,
    roleName: USER_ROLES[user.role.toUpperCase()].name,
    level: USER_ROLES[user.role.toUpperCase()].level,
    permissions: rolePermissions,
    categorizedPermissions,
    permissionCount: userPermissions.length,
    hasFullAccess: rolePermissions.includes('*')
  };
}

/**
 * Registrar actividad del usuario
 * @param {string} userId - ID del usuario
 * @param {string} action - Acción realizada
 * @param {Object} details - Detalles adicionales
 */
async function logUserActivity(userId, action, details = {}) {
  try {
    await databaseService.query(
      `INSERT INTO user_activity_log (user_id, action, details, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [userId, action, JSON.stringify(details)]
    );
  } catch (error) {
    logger.error(`Error al registrar actividad de usuario: ${error.message}`);
  }
}

// ==============================================
// CONTROLADOR DE OBTENER USUARIOS
// ==============================================

/**
 * Obtener lista de usuarios del sistema
 * GET /api/users
 */
async function getUsers(req, res) {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    // Filtros
    if (role) {
      whereConditions.push(`u.role = $${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }
    
    if (status !== undefined) {
      whereConditions.push(`u.is_active = $${paramIndex}`);
      queryParams.push(status === 'true');
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Consulta principal
    const usersQuery = await databaseService.query(
      `SELECT 
         u.id, u.name, u.email, u.role, u.phone, u.is_active,
         u.last_login, u.failed_attempts, u.created_at, u.updated_at,
         CASE 
           WHEN u.role = 'admin' THEN '🔑 Administrador'
           WHEN u.role = 'dentist' THEN '🦷 Dentista'
           WHEN u.role = 'staff' THEN '👥 Personal Administrativo'
           WHEN u.role = 'hygienist' THEN '🧽 Higienista'
         END as role_label,
         CASE 
           WHEN u.is_active = true THEN '🟢 Activo'
           ELSE '🔴 Inactivo'
         END as status_label,
         CASE 
           WHEN u.last_login > NOW() - INTERVAL '24 hours' THEN 'Reciente'
           WHEN u.last_login > NOW() - INTERVAL '7 days' THEN 'Esta semana'
           WHEN u.last_login > NOW() - INTERVAL '30 days' THEN 'Este mes'
           WHEN u.last_login IS NULL THEN 'Nunca'
           ELSE 'Inactivo'
         END as activity_status
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );
    
    // Contar total
    const countQuery = await databaseService.query(
      `SELECT COUNT(*) as total
       FROM users u
       ${whereClause}`,
      queryParams
    );
    
    const total = parseInt(countQuery.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    // Obtener estadísticas
    const statsQuery = await databaseService.query(
      `SELECT 
         COUNT(*) as total_users,
         COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
         COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
         COUNT(CASE WHEN role = 'dentist' THEN 1 END) as dentists,
         COUNT(CASE WHEN role = 'staff' THEN 1 END) as staff,
         COUNT(CASE WHEN role = 'hygienist' THEN 1 END) as hygienists
       FROM users
       ${whereClause.replace('u.', '')}`,
      queryParams
    );
    
    const stats = statsQuery.rows[0];
    
    res.json({
      success: true,
      data: {
        users: usersQuery.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        statistics: {
          total: parseInt(stats.total_users),
          active: parseInt(stats.active_users),
          byRole: {
            admins: parseInt(stats.admins),
            dentists: parseInt(stats.dentists),
            staff: parseInt(stats.staff),
            hygienists: parseInt(stats.hygienists)
          }
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener usuarios: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener usuarios',
      message: 'No se pudieron cargar los usuarios del sistema'
    });
  }
}

// ==============================================
// CONTROLADOR DE CREAR USUARIO
// ==============================================

/**
 * Crear nuevo usuario del sistema
 * POST /api/users
 */
async function createUser(req, res) {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      permissions = []
    } = req.body;
    
    // Validar rol
    if (!USER_ROLES[role.toUpperCase()]) {
      return res.status(400).json({
        error: 'Rol inválido',
        message: 'El rol especificado no existe en el sistema'
      });
    }
    
    // Verificar permisos del usuario actual
    if (!hasPermission(req.user, 'users.create')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para crear usuarios'
      });
    }
    
    // Verificar que el email no existe
    const existingUserQuery = await databaseService.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUserQuery.rows.length > 0) {
      return res.status(409).json({
        error: 'Email ya registrado',
        message: 'Ya existe un usuario con este email'
      });
    }
    
    // Validar permisos adicionales si se proporcionan
    if (permissions.length > 0) {
      const validPermissions = Object.keys(PERMISSIONS_MATRIX);
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
      
      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          error: 'Permisos inválidos',
          message: `Los siguientes permisos no existen: ${invalidPermissions.join(', ')}`
        });
      }
    }
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Crear usuario
    const newUserQuery = await databaseService.query(
      `INSERT INTO users (
         name, email, password, role, phone, is_active,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       RETURNING id, name, email, role, phone, is_active, created_at`,
      [name, email.toLowerCase(), hashedPassword, role.toLowerCase(), phone]
    );
    
    const newUser = newUserQuery.rows[0];
    
    // Registrar actividad
    await logUserActivity(req.user.id, 'user_created', {
      createdUserId: newUser.id,
      createdUserEmail: newUser.email,
      role: role
    });
    
    logger.info(`Nuevo usuario creado: ${email} con rol ${role} por ${req.user.email}`);
    
    res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente',
      data: {
        user: {
          ...newUser,
          roleName: USER_ROLES[newUser.role.toUpperCase()].name,
          permissions: getRolePermissions(newUser.role),
          permissionSummary: generatePermissionSummary(newUser)
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al crear usuario: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al crear usuario',
      message: 'No se pudo crear el usuario'
    });
  }
}

// ==============================================
// CONTROLADOR DE ACTUALIZAR USUARIO
// ==============================================

/**
 * Actualizar datos de usuario
 * PUT /api/users/:id
 */
async function updateUser(req, res) {
  try {
    const { id: userId } = req.params;
    const {
      name,
      email,
      role,
      phone,
      isActive,
      permissions = []
    } = req.body;
    
    // Verificar que el usuario existe
    const existingUserQuery = await databaseService.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    
    if (existingUserQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró el usuario especificado'
      });
    }
    
    const existingUser = existingUserQuery.rows[0];
    
    // Verificar permisos
    const canUpdate = req.user.role === 'admin' || req.user.id === userId;
    if (!canUpdate) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para actualizar este usuario'
      });
    }
    
    // Validar rol si se cambia
    if (role && role !== existingUser.role) {
      if (!USER_ROLES[role.toUpperCase()]) {
        return res.status(400).json({
          error: 'Rol inválido',
          message: 'El rol especificado no existe en el sistema'
        });
      }
      
      // Solo admin puede cambiar roles
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Permisos insuficientes',
          message: 'Solo los administradores pueden cambiar roles'
        });
      }
    }
    
    // Verificar que el email no esté en uso por otro usuario
    if (email && email.toLowerCase() !== existingUser.email) {
      const emailConflictQuery = await databaseService.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email.toLowerCase(), userId]
      );
      
      if (emailConflictQuery.rows.length > 0) {
        return res.status(409).json({
          error: 'Email ya registrado',
          message: 'Ya existe otro usuario con este email'
        });
      }
    }
    
    // Preparar datos de actualización
    const updateData = {
      name: name || existingUser.name,
      email: email ? email.toLowerCase() : existingUser.email,
      role: role || existingUser.role,
      phone: phone !== undefined ? phone : existingUser.phone,
      isActive: isActive !== undefined ? isActive : existingUser.is_active,
      updated_at: new Date()
    };
    
    // Actualizar usuario
    const updatedUserQuery = await databaseService.query(
      `UPDATE users 
       SET name = $1, email = $2, role = $3, phone = $4, 
           is_active = $5, updated_at = $6
       WHERE id = $7
       RETURNING id, name, email, role, phone, is_active, updated_at`,
      [
        updateData.name, updateData.email, updateData.role, updateData.phone,
        updateData.isActive, updateData.updated_at, userId
      ]
    );
    
    const updatedUser = updatedUserQuery.rows[0];
    
    // Si se cambia el rol, limpiar permisos personalizados
    if (role && role !== existingUser.role) {
      await databaseService.query(
        'DELETE FROM user_permissions WHERE user_id = $1',
        [userId]
      );
    }
    
    // Registrar actividad
    await logUserActivity(req.user.id, 'user_updated', {
      updatedUserId: userId,
      updatedFields: Object.keys(updateData),
      oldRole: existingUser.role,
      newRole: updateData.role
    });
    
    logger.info(`Usuario actualizado: ${updatedUser.email} por ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Usuario actualizado correctamente',
      data: {
        user: {
          ...updatedUser,
          roleName: USER_ROLES[updatedUser.role.toUpperCase()].name,
          permissions: getRolePermissions(updatedUser.role),
          permissionSummary: generatePermissionSummary(updatedUser)
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error al actualizar usuario: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al actualizar usuario',
      message: 'No se pudo actualizar el usuario'
    });
  }
}

// ==============================================
// CONTROLADOR DE ELIMINAR USUARIO
// ==============================================

/**
 * Eliminar usuario del sistema
 * DELETE /api/users/:id
 */
async function deleteUser(req, res) {
  try {
    const { id: userId } = req.params;
    
    // Verificar que el usuario existe
    const userQuery = await databaseService.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró el usuario especificado'
      });
    }
    
    const user = userQuery.rows[0];
    
    // Verificar permisos
    if (!hasPermission(req.user, 'users.delete')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para eliminar usuarios'
      });
    }
    
    // No permitir auto-eliminación
    if (req.user.id === userId) {
      return res.status(400).json({
        error: 'No permitido',
        message: 'No puedes eliminar tu propio usuario'
      });
    }
    
    // No permitir eliminar último administrador
    if (user.role === 'admin') {
      const adminCountQuery = await databaseService.query(
        'SELECT COUNT(*) as count FROM users WHERE role = $1 AND is_active = true',
        ['admin']
      );
      
      if (parseInt(adminCountQuery.rows[0].count) <= 1) {
        return res.status(400).json({
          error: 'No permitido',
          message: 'No se puede eliminar el último administrador activo'
        });
      }
    }
    
    // Soft delete (desactivar usuario en lugar de eliminar)
    await databaseService.query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
      [userId]
    );
    
    // Registrar actividad
    await logUserActivity(req.user.id, 'user_deleted', {
      deletedUserId: userId,
      deletedUserEmail: user.email,
      role: user.role
    });
    
    logger.info(`Usuario desactivado: ${user.email} por ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Usuario eliminado correctamente',
      data: {
        userId,
        action: 'deactivated',
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    logger.error(`Error al eliminar usuario: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al eliminar usuario',
      message: 'No se pudo eliminar el usuario'
    });
  }
}

// ==============================================
// CONTROLADOR DE ACTIVIDAD DE USUARIOS
// ==============================================

/**
 * Obtener actividad reciente de usuarios
 * GET /api/users/activity
 */
async function getUserActivity(req, res) {
  try {
    const { userId, action, limit = 50 } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (userId) {
      whereConditions.push(`ual.user_id = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    }
    
    if (action) {
      whereConditions.push(`ual.action = $${paramIndex}`);
      queryParams.push(action);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    const activityQuery = await databaseService.query(
      `SELECT 
         ual.id, ual.user_id, ual.action, ual.details, ual.timestamp,
         u.name as user_name, u.email as user_email, u.role as user_role
       FROM user_activity_log ual
       JOIN users u ON ual.user_id = u.id
       ${whereClause}
       ORDER BY ual.timestamp DESC
       LIMIT $${paramIndex}`,
      [...queryParams, limit]
    );
    
    res.json({
      success: true,
      data: {
        activity: activityQuery.rows,
        filters: { userId, action }
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener actividad de usuarios: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener actividad',
      message: 'No se pudo cargar la actividad de usuarios'
    });
  }
}

// ==============================================
// CONTROLADOR DE PERMISOS DE USUARIO
// ==============================================

/**
 * Obtener permisos específicos de un usuario
 * GET /api/users/:id/permissions
 */
async function getUserPermissions(req, res) {
  try {
    const { id: userId } = req.params;
    
    // Verificar que el usuario existe
    const userQuery = await databaseService.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró el usuario especificado'
      });
    }
    
    const user = userQuery.rows[0];
    
    // Obtener permisos personalizados del usuario
    const customPermissionsQuery = await databaseService.query(
      'SELECT permission FROM user_permissions WHERE user_id = $1',
      [userId]
    );
    
    const customPermissions = customPermissionsQuery.rows.map(row => row.permission);
    const rolePermissions = getRolePermissions(user.role);
    
    // Combinar permisos de rol con permisos personalizados
    const allPermissions = [...new Set([...rolePermissions, ...customPermissions])];
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          roleName: USER_ROLES[user.role.toUpperCase()].name
        },
        rolePermissions,
        customPermissions,
        allPermissions,
        permissionSummary: generatePermissionSummary(user)
      }
    });
    
  } catch (error) {
    logger.error(`Error al obtener permisos: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener permisos',
      message: 'No se pudieron cargar los permisos del usuario'
    });
  }
}

// ==============================================
// EXPORTACIÓN DE FUNCIONES
// ==============================================

module.exports = {
  // Controladores principales
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserActivity,
  getUserPermissions,
  
  // Funciones auxiliares
  validateUserPermissions,
  generatePermissionSummary,
  logUserActivity
};
