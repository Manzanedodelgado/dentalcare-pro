/**
 * Sistema de Gestión de Usuarios - DentalCare Pro
 * Módulo completo de usuarios, roles y permisos
 * @author MiniMax Agent
 * @version 1.0.0
 */

class UserManagementSystem {
    constructor() {
        this.api = new ApiClient();
        this.auth = new AuthManager();
        this.websocket = new WebSocketManager();
        this.currentUser = null;
        this.userRoles = new Map();
        this.activityLogs = new Map();
        this.userSessions = new Map();
        this.permissions = this.initializePermissions();
        this.init();
    }

    init() {
        this.currentUser = this.auth.getCurrentUser();
        this.setupEventListeners();
        this.initializeWebSocket();
        this.loadUserPreferences();
        this.initializeRoles();
    }

    setupEventListeners() {
        // Event delegation para mejor rendimiento
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-user-action]')) {
                const action = e.target.getAttribute('data-user-action');
                this.handleUserAction(action, e.target);
            }
        });

        document.addEventListener('submit', (e) => {
            if (e.target.matches('[data-user-form]')) {
                e.preventDefault();
                this.handleUserForm(e.target);
            }
        });

        // Filtros y búsqueda
        document.addEventListener('input', (e) => {
            if (e.target.matches('[data-user-filter]')) {
                this.debounce(() => this.applyUserFilters(), 300)();
            }
        });

        // Auto-logout en inactividad
        this.setupInactivityTimer();
    }

    async initializeWebSocket() {
        this.websocket.on('user-login', (data) => {
            this.handleUserLogin(data);
        });

        this.websocket.on('user-logout', (data) => {
            this.handleUserLogout(data);
        });

        this.websocket.on('permission-denied', (data) => {
            this.handlePermissionDenied(data);
        });

        this.websocket.on('session-expired', (data) => {
            this.handleSessionExpired(data);
        });
    }

    initializeRoles() {
        // Definir roles del sistema según la información proporcionada
        this.userRoles = new Map([
            ['admin', {
                id: 'admin',
                name: 'Administrador',
                level: 100,
                permissions: ['*'], // Todos los permisos
                description: 'Acceso completo al sistema'
            }],
            ['dentista_mario', {
                id: 'dentista_mario',
                name: 'Dr. Mario Rubio',
                level: 80,
                specialties: ['Implantología', 'Cirugía oral'],
                scheduleDays: ['wednesday'],
                permissions: [
                    'patients:read', 'patients:write',
                    'appointments:read', 'appointments:write',
                    'invoices:read', 'invoices:write',
                    'documents:read', 'documents:write',
                    'whatsapp:read', 'whatsapp:write',
                    'accounting:read'
                ],
                description: 'Especialista en implantología y cirugía'
            }],
            ['dentista_irene', {
                id: 'dentista_irene',
                name: 'Dra. Irene García',
                level: 80,
                specialties: ['Endodoncia', 'Odontología general'],
                scheduleDays: ['tuesday'],
                permissions: [
                    'patients:read', 'patients:write',
                    'appointments:read', 'appointments:write',
                    'invoices:read', 'invoices:write',
                    'documents:read', 'documents:write',
                    'whatsapp:read', 'whatsapp:write',
                    'accounting:read'
                ],
                description: 'Especialista en endodoncia y tratamientos generales'
            }],
            ['dentista_virginia', {
                id: 'dentista_virginia',
                name: 'Dra. Virginia Tresgallo',
                level: 80,
                specialties: ['Ortodoncia', 'Ortopedia dentofacial'],
                scheduleDays: ['monday'],
                permissions: [
                    'patients:read', 'patients:write',
                    'appointments:read', 'appointments:write',
                    'invoices:read', 'invoices:write',
                    'documents:read', 'documents:write',
                    'whatsapp:read', 'whatsapp:write',
                    'accounting:read'
                ],
                description: 'Especialista en ortodoncia'
            }],
            ['dentista_miriam', {
                id: 'dentista_miriam',
                name: 'Dra. Miriam Carrasco',
                level: 80,
                specialties: ['Odontopediatría'],
                scheduleDays: [], // Flexible
                permissions: [
                    'patients:read', 'patients:write',
                    'appointments:read', 'appointments:write',
                    'invoices:read', 'invoices:write',
                    'documents:read', 'documents:write',
                    'whatsapp:read', 'whatsapp:write',
                    'accounting:read'
                ],
                description: 'Especialista en odontopediatría'
            }],
            ['higienista', {
                id: 'higienista',
                name: 'Tc. Juan Antonio Manzanedo',
                level: 60,
                specialties: ['Higienes', 'Blanqueamiento', 'Pruebas de tratamientos'],
                scheduleDays: ['thursday', 'friday'],
                permissions: [
                    'patients:read',
                    'appointments:read', 'appointments:write',
                    'documents:read',
                    'whatsapp:read'
                ],
                description: 'Higienista dental y asistente técnico'
            }],
            ['personal', {
                id: 'personal',
                name: 'Personal Administrativo',
                level: 40,
                scheduleDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                permissions: [
                    'patients:read',
                    'appointments:read', 'appointments:write',
                    'invoices:read',
                    'accounting:read',
                    'whatsapp:read', 'whatsapp:write'
                ],
                description: 'Personal administrativo y de atención al cliente'
            }]
        ]);
    }

    initializePermissions() {
        return {
            // Permisos de pacientes
            'patients:read': { name: 'Leer pacientes', category: 'patients' },
            'patients:write': { name: 'Gestionar pacientes', category: 'patients' },
            'patients:delete': { name: 'Eliminar pacientes', category: 'patients' },

            // Permisos de citas
            'appointments:read': { name: 'Leer citas', category: 'appointments' },
            'appointments:write': { name: 'Gestionar citas', category: 'appointments' },
            'appointments:delete': { name: 'Eliminar citas', category: 'appointments' },

            // Permisos de facturación
            'invoices:read': { name: 'Leer facturas', category: 'invoices' },
            'invoices:write': { name: 'Gestionar facturas', category: 'invoices' },
            'invoices:delete': { name: 'Eliminar facturas', category: 'invoices' },

            // Permisos contables
            'accounting:read': { name: 'Leer contabilidad', category: 'accounting' },
            'accounting:write': { name: 'Gestionar contabilidad', category: 'accounting' },
            'accounting:reports': { name: 'Generar reportes', category: 'accounting' },

            // Permisos de documentos
            'documents:read': { name: 'Leer documentos', category: 'documents' },
            'documents:write': { name: 'Gestionar documentos', category: 'documents' },
            'documents:delete': { name: 'Eliminar documentos', category: 'documents' },

            // Permisos de WhatsApp
            'whatsapp:read': { name: 'Leer mensajes WhatsApp', category: 'whatsapp' },
            'whatsapp:write': { name: 'Enviar mensajes WhatsApp', category: 'whatsapp' },

            // Permisos legales
            'legal:read': { name: 'Leer documentos legales', category: 'legal' },
            'legal:write': { name: 'Gestionar documentos legales', category: 'legal' },
            'legal:lopd': { name: 'Gestionar LOPD', category: 'legal' },

            // Permisos de usuarios
            'users:read': { name: 'Leer usuarios', category: 'users' },
            'users:write': { name: 'Gestionar usuarios', category: 'users' },
            'users:delete': { name: 'Eliminar usuarios', category: 'users' },
            'users:permissions': { name: 'Gestionar permisos', category: 'users' },

            // Permisos de sistema
            'system:config': { name: 'Configurar sistema', category: 'system' },
            'system:backup': { name: 'Hacer backups', category: 'system' },
            'system:audit': { name: 'Ver auditoría', category: 'system' }
        };
    }

    // ========================================
    // DASHBOARD DE GESTIÓN DE USUARIOS
    // ========================================

    /**
     * Carga el dashboard de gestión de usuarios
     */
    async loadUserDashboard() {
        try {
            this.showLoadingState('dashboard-container');
            
            const [userStats, activeUsers, recentActivity, permissionMatrix] = await Promise.all([
                this.getUserStatistics(),
                this.getActiveUsers(),
                this.getRecentUserActivity(),
                this.getPermissionMatrix()
            ]);

            const dashboardHTML = this.generateUserDashboardHTML({
                userStats,
                activeUsers,
                recentActivity,
                permissionMatrix
            });

            document.getElementById('dashboard-container').innerHTML = dashboardHTML;
            this.setupUserCharts();
            
        } catch (error) {
            this.showError('Error al cargar el dashboard de usuarios', error);
        } finally {
            this.hideLoadingState('dashboard-container');
        }
    }

    generateUserDashboardHTML(data) {
        const { userStats, activeUsers, recentActivity, permissionMatrix } = data;
        
        return `
            <div class="user-dashboard">
                <!-- Header -->
                <div class="dashboard-header">
                    <h1><i class="fas fa-users-cog"></i> Gestión de Usuarios</h1>
                    <div class="dashboard-actions">
                        <button class="btn btn-primary" data-user-action="create-user">
                            <i class="fas fa-user-plus"></i> Nuevo Usuario
                        </button>
                        <button class="btn btn-secondary" data-user-action="manage-roles">
                            <i class="fas fa-user-shield"></i> Gestionar Roles
                        </button>
                    </div>
                </div>

                <!-- Estadísticas de Usuarios -->
                <div class="user-stats-grid">
                    <div class="stat-card total-users">
                        <div class="stat-icon">
                            <i class="fas fa-users text-blue-600"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${userStats.total}</h3>
                            <p>Usuarios Totales</p>
                            <span class="stat-change ${userStats.totalGrowth >= 0 ? 'positive' : 'negative'}">
                                ${userStats.totalGrowth >= 0 ? '+' : ''}${userStats.totalGrowth}%
                            </span>
                        </div>
                    </div>

                    <div class="stat-card active-users">
                        <div class="stat-icon">
                            <i class="fas fa-user-check text-green-600"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${userStats.active}</h3>
                            <p>Usuarios Activos</p>
                            <span class="stat-detail">${userStats.activePercentage}% del total</span>
                        </div>
                    </div>

                    <div class="stat-card online-users">
                        <div class="stat-icon">
                            <i class="fas fa-circle text-orange-600"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${userStats.online}</h3>
                            <p>Conectados Ahora</p>
                            <span class="stat-detail">En tiempo real</span>
                        </div>
                    </div>

                    <div class="stat-card permissions-managed">
                        <div class="stat-icon">
                            <i class="fas fa-key text-purple-600"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${permissionMatrix.totalPermissions}</h3>
                            <p>Permisos Configurados</p>
                            <span class="stat-detail">${permissionMatrix.rolesCount} roles</span>
                        </div>
                    </div>
                </div>

                <!-- Distribución por Roles -->
                <div class="roles-distribution-section">
                    <div class="section-header">
                        <h3><i class="fas fa-chart-pie"></i> Distribución por Roles</h3>
                    </div>
                    <div class="roles-grid">
                        ${Array.from(this.userRoles.values()).map(role => {
                            const count = userStats.byRole[role.id] || 0;
                            const percentage = userStats.total > 0 ? ((count / userStats.total) * 100).toFixed(1) : 0;
                            return `
                                <div class="role-card">
                                    <div class="role-header">
                                        <div class="role-icon">
                                            <i class="fas fa-${this.getRoleIcon(role.id)}"></i>
                                        </div>
                                        <div class="role-info">
                                            <h4>${role.name}</h4>
                                            <p>${role.description}</p>
                                        </div>
                                        <div class="role-count">
                                            <span class="count">${count}</span>
                                            <span class="percentage">${percentage}%</span>
                                        </div>
                                    </div>
                                    <div class="role-permissions">
                                        <div class="permissions-summary">
                                            <span class="permission-count">${role.permissions.length} permisos</span>
                                            <button class="btn-link" data-user-action="view-role-permissions" data-role="${role.id}">
                                                Ver detalles
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Usuarios Activos y Actividad Reciente -->
                <div class="user-tables-section">
                    <div class="table-row">
                        <div class="table-card">
                            <div class="table-header">
                                <h3>Usuarios Activos</h3>
                                <div class="table-filters">
                                    <select data-user-filter="role">
                                        <option value="">Todos los roles</option>
                                        ${Array.from(this.userRoles.values()).map(role => 
                                            `<option value="${role.id}">${role.name}</option>`
                                        ).join('')}
                                    </select>
                                    <select data-user-filter="status">
                                        <option value="">Todos los estados</option>
                                        <option value="active">Activo</option>
                                        <option value="inactive">Inactivo</option>
                                        <option value="suspended">Suspendido</option>
                                    </select>
                                </div>
                            </div>
                            <div class="table-container">
                                <table class="data-table" id="active-users-table">
                                    <thead>
                                        <tr>
                                            <th>Usuario</th>
                                            <th>Rol</th>
                                            <th>Estado</th>
                                            <th>Último Acceso</th>
                                            <th>Sesiones</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${activeUsers.map(user => `
                                            <tr>
                                                <td class="user-info">
                                                    <div class="user-avatar">
                                                        ${this.getUserInitials(user.name)}
                                                    </div>
                                                    <div class="user-details">
                                                        <span class="user-name">${user.name}</span>
                                                        <span class="user-email">${user.email}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span class="role-badge ${user.role}">
                                                        ${this.getRoleName(user.role)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span class="status-badge ${user.status}">
                                                        <i class="fas fa-${user.status === 'online' ? 'circle' : 'clock'}"></i>
                                                        ${this.getStatusLabel(user.status)}
                                                    </span>
                                                </td>
                                                <td>${this.formatDateTime(user.lastAccess)}</td>
                                                <td>
                                                    <span class="session-count">${user.sessions}</span>
                                                </td>
                                                <td>
                                                    <button class="btn-icon" data-user-action="view-user" data-id="${user.id}">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                    <button class="btn-icon" data-user-action="edit-user" data-id="${user.id}">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <button class="btn-icon" data-user-action="manage-user-sessions" data-id="${user.id}">
                                                        <i class="fas fa-desktop"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="table-card">
                            <div class="table-header">
                                <h3>Actividad Reciente</h3>
                                <div class="table-actions">
                                    <button class="btn btn-sm btn-primary" data-user-action="export-activity-log">
                                        <i class="fas fa-download"></i> Exportar
                                    </button>
                                </div>
                            </div>
                            <div class="table-container">
                                <table class="data-table" id="recent-activity-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha/Hora</th>
                                            <th>Usuario</th>
                                            <th>Acción</th>
                                            <th>Recurso</th>
                                            <th>IP</th>
                                            <th>Resultado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${recentActivity.map(activity => `
                                            <tr>
                                                <td>${this.formatDateTime(activity.timestamp)}</td>
                                                <td>${activity.user}</td>
                                                <td>
                                                    <span class="action-type ${activity.type}">
                                                        ${activity.action}
                                                    </span>
                                                </td>
                                                <td>${activity.resource}</td>
                                                <td class="ip-address">${activity.ip}</td>
                                                <td>
                                                    <span class="result-badge ${activity.result}">
                                                        ${activity.result}
                                                    </span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupUserCharts() {
        this.setupRolesDistributionChart();
        this.setupUserActivityChart();
    }

    setupRolesDistributionChart() {
        const ctx = document.getElementById('roles-distribution-chart');
        if (!ctx) return;

        const rolesData = Array.from(this.userRoles.values()).map(role => {
            const count = Math.floor(Math.random() * 10) + 1; // Datos de ejemplo
            return {
                name: role.name,
                value: count
            };
        });

        const data = {
            labels: rolesData.map(r => r.name),
            datasets: [{
                data: rolesData.map(r => r.value),
                backgroundColor: [
                    '#3B82F6', '#10B981', '#F59E0B', 
                    '#EF4444', '#8B5CF6', '#06B6D4'
                ]
            }]
        };

        new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }

    setupUserActivityChart() {
        const ctx = document.getElementById('user-activity-chart');
        if (!ctx) return;

        const data = {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{
                label: 'Logins',
                data: [45, 52, 48, 61, 58, 25, 30],
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Acciones',
                data: [120, 145, 132, 168, 155, 89, 95],
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };

        new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // ========================================
    // GESTIÓN DE USUARIOS
    // ========================================

    /**
     * Crea un nuevo usuario
     */
    async createUser(userData) {
        try {
            const token = this.auth.getToken();
            const newUser = {
                ...userData,
                fechaCreacion: new Date().toISOString(),
                estado: 'active',
                creadoPor: this.currentUser.id,
                salt: this.generateSalt(),
                lastPasswordChange: new Date().toISOString()
            };

            // Hash de la contraseña
            newUser.password = await this.hashPassword(newUser.password, newUser.salt);

            const response = await this.api.post('/api/users', newUser, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Registrar en auditoría
            await this.logUserActivity({
                userId: response.data.id,
                action: 'create_user',
                resource: 'user',
                result: 'success',
                details: `Usuario creado: ${userData.name}`
            });

            this.showSuccess('Usuario creado correctamente');
            return response.data;
        } catch (error) {
            this.showError('Error al crear el usuario', error);
            throw error;
        }
    }

    /**
     * Actualiza un usuario existente
     */
    async updateUser(userId, updateData) {
        try {
            const token = this.auth.getToken();
            
            const response = await this.api.patch(`/api/users/${userId}`, {
                ...updateData,
                fechaActualizacion: new Date().toISOString(),
                actualizadoPor: this.currentUser.id
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Registrar en auditoría
            await this.logUserActivity({
                userId: userId,
                action: 'update_user',
                resource: 'user',
                result: 'success',
                details: `Usuario actualizado: ${userId}`
            });

            this.showSuccess('Usuario actualizado correctamente');
            return response.data;
        } catch (error) {
            this.showError('Error al actualizar el usuario', error);
            throw error;
        }
    }

    /**
     * Elimina un usuario
     */
    async deleteUser(userId) {
        try {
            const token = this.auth.getToken();
            
            await this.api.delete(`/api/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Registrar en auditoría
            await this.logUserActivity({
                userId: userId,
                action: 'delete_user',
                resource: 'user',
                result: 'success',
                details: `Usuario eliminado: ${userId}`
            });

            this.showSuccess('Usuario eliminado correctamente');
        } catch (error) {
            this.showError('Error al eliminar el usuario', error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de usuarios
     */
    async getUserStatistics() {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get('/api/users/statistics', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return response.data;
        } catch (error) {
            // Datos de ejemplo para desarrollo
            return {
                total: 8,
                active: 7,
                online: 3,
                totalGrowth: 12.5,
                activePercentage: 87.5,
                byRole: {
                    'admin': 1,
                    'dentista_mario': 1,
                    'dentista_irene': 1,
                    'dentista_virginia': 1,
                    'dentista_miriam': 1,
                    'higienista': 1,
                    'personal': 2
                }
            };
        }
    }

    /**
     * Obtiene usuarios activos
     */
    async getActiveUsers() {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get('/api/users/active', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return response.data;
        } catch (error) {
            // Datos de ejemplo para desarrollo
            return [
                {
                    id: 1,
                    name: 'Dr. Mario Rubio',
                    email: 'mario@rubiogarciadental.com',
                    role: 'dentista_mario',
                    status: 'online',
                    lastAccess: '2025-11-17 10:30:00',
                    sessions: 1
                },
                {
                    id: 2,
                    name: 'Dra. Irene García',
                    email: 'irene@rubiogarciadental.com',
                    role: 'dentista_irene',
                    status: 'online',
                    lastAccess: '2025-11-17 10:25:00',
                    sessions: 1
                },
                {
                    id: 3,
                    name: 'Tc. Juan Antonio Manzanedo',
                    email: 'juanantonio@rubiogarciadental.com',
                    role: 'higienista',
                    status: 'online',
                    lastAccess: '2025-11-17 09:45:00',
                    sessions: 1
                },
                {
                    id: 4,
                    name: 'Dra. Virginia Tresgallo',
                    email: 'virginia@rubiogarciadental.com',
                    role: 'dentista_virginia',
                    status: 'inactive',
                    lastAccess: '2025-11-16 18:30:00',
                    sessions: 0
                }
            ];
        }
    }

    // ========================================
    // GESTIÓN DE ROLES Y PERMISOS
    // ========================================

    /**
     * Crea un nuevo rol
     */
    async createRole(roleData) {
        try {
            const token = this.auth.getToken();
            const newRole = {
                ...roleData,
                fechaCreacion: new Date().toISOString(),
                creadoPor: this.currentUser.id,
                version: 1
            };

            const response = await this.api.post('/api/users/roles', newRole, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Registrar en auditoría
            await this.logUserActivity({
                action: 'create_role',
                resource: 'role',
                result: 'success',
                details: `Rol creado: ${roleData.name}`
            });

            this.showSuccess('Rol creado correctamente');
            return response.data;
        } catch (error) {
            this.showError('Error al crear el rol', error);
            throw error;
        }
    }

    /**
     * Asigna permisos a un rol
     */
    async assignRolePermissions(roleId, permissions) {
        try {
            const token = this.auth.getToken();
            await this.api.put(`/api/users/roles/${roleId}/permissions`, {
                permissions: permissions,
                fechaActualizacion: new Date().toISOString(),
                actualizadoPor: this.currentUser.id
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Registrar en auditoría
            await this.logUserActivity({
                action: 'assign_permissions',
                resource: 'role',
                result: 'success',
                details: `Permisos asignados al rol ${roleId}`
            });

            this.showSuccess('Permisos asignados correctamente');
        } catch (error) {
            this.showError('Error al asignar permisos', error);
            throw error;
        }
    }

    /**
     * Verifica si un usuario tiene un permiso específico
     */
    hasPermission(userId, permission) {
        const user = this.getUserById(userId);
        if (!user) return false;

        const role = this.userRoles.get(user.role);
        if (!role) return false;

        // Admin tiene todos los permisos
        if (role.permissions.includes('*')) return true;

        return role.permissions.includes(permission);
    }

    /**
     * Verifica si un usuario puede realizar una acción específica
     */
    canPerformAction(userId, action, resource = null) {
        // Construir nombre del permiso
        const permission = resource ? `${resource}:${action}` : action;
        return this.hasPermission(userId, permission);
    }

    /**
     * Obtiene la matriz de permisos
     */
    async getPermissionMatrix() {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get('/api/users/permissions/matrix', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return response.data;
        } catch (error) {
            return {
                totalPermissions: Object.keys(this.permissions).length,
                rolesCount: this.userRoles.size
            };
        }
    }

    // ========================================
    // GESTIÓN DE SESIONES
    // ========================================

    /**
     * Obtiene las sesiones activas de un usuario
     */
    async getUserSessions(userId) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get(`/api/users/${userId}/sessions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return response.data;
        } catch (error) {
            return [];
        }
    }

    /**
     * Termina una sesión específica
     */
    async terminateSession(sessionId) {
        try {
            const token = this.auth.getToken();
            await this.api.delete(`/api/users/sessions/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Registrar en auditoría
            await this.logUserActivity({
                action: 'terminate_session',
                resource: 'session',
                result: 'success',
                details: `Sesión terminada: ${sessionId}`
            });

            this.showSuccess('Sesión terminada correctamente');
        } catch (error) {
            this.showError('Error al terminar la sesión', error);
            throw error;
        }
    }

    /**
     * Configura timer de inactividad para auto-logout
     */
    setupInactivityTimer() {
        const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
        let inactivityTimer;

        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                this.handleInactivityLogout();
            }, INACTIVITY_TIMEOUT);
        };

        // Eventos que resetean el timer
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });

        resetTimer();
    }

    /**
     * Maneja logout por inactividad
     */
    async handleInactivityLogout() {
        try {
            // Registrar en auditoría
            await this.logUserActivity({
                action: 'auto_logout',
                resource: 'session',
                result: 'success',
                details: 'Logout automático por inactividad'
            });

            // Cerrar sesión
            await this.auth.logout();
            
            this.showWarning('Sesión cerrada por inactividad');
            
            // Redireccionar al login
            window.location.href = '/login';
        } catch (error) {
            console.error('Error en logout por inactividad:', error);
        }
    }

    // ========================================
    // AUDITORÍA DE USUARIOS
    // ========================================

    /**
     * Registra actividad de usuario
     */
    async logUserActivity(activityData) {
        try {
            const auditEntry = {
                ...activityData,
                timestamp: new Date().toISOString(),
                ipAddress: this.getClientIP(),
                userAgent: navigator.userAgent,
                sessionId: this.getSessionId()
            };

            const token = this.auth.getToken();
            await this.api.post('/api/users/activity-log', auditEntry, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

        } catch (error) {
            console.error('Error al registrar actividad de usuario:', error);
        }
    }

    /**
     * Obtiene actividad reciente de usuarios
     */
    async getRecentUserActivity(limit = 50) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get(`/api/users/activity-log/recent?limit=${limit}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return response.data;
        } catch (error) {
            // Datos de ejemplo para desarrollo
            return [
                {
                    timestamp: '2025-11-17 10:30:00',
                    user: 'Dr. Mario Rubio',
                    action: 'Login',
                    type: 'authentication',
                    resource: 'session',
                    ip: '192.168.1.100',
                    result: 'success'
                },
                {
                    timestamp: '2025-11-17 10:25:00',
                    user: 'Dra. Irene García',
                    action: 'Create Appointment',
                    type: 'operation',
                    resource: 'appointment',
                    ip: '192.168.1.101',
                    result: 'success'
                }
            ];
        }
    }

    // ========================================
    // MÉTODOS DE UTILIDAD
    // ========================================

    getRoleName(roleId) {
        const role = this.userRoles.get(roleId);
        return role ? role.name : roleId;
    }

    getRoleIcon(roleId) {
        const icons = {
            'admin': 'crown',
            'dentista_mario': 'user-md',
            'dentista_irene': 'user-md',
            'dentista_virginia': 'user-md',
            'dentista_miriam': 'user-md',
            'higienista': 'hand-holding-medical',
            'personal': 'users'
        };
        return icons[roleId] || 'user';
    }

    getStatusLabel(status) {
        const labels = {
            'online': 'Conectado',
            'active': 'Activo',
            'inactive': 'Inactivo',
            'suspended': 'Suspendido'
        };
        return labels[status] || status;
    }

    getUserInitials(name) {
        return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('es-ES');
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-ES');
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    generateSalt() {
        return crypto.getRandomValues(new Uint8Array(16)).join('');
    }

    async hashPassword(password, salt) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    getClientIP() {
        return '127.0.0.1'; // En producción se obtendría del servidor
    }

    getSessionId() {
        return sessionStorage.getItem('sessionId') || 'unknown';
    }

    getUserById(userId) {
        // En una implementación real, esto vendría de la API
        return { id: userId, role: 'user' };
    }

    // ========================================
    // MÉTODOS DE INTERFAZ
    // ========================================

    handleUserAction(action, element) {
        switch (action) {
            case 'create-user':
                this.showUserCreator();
                break;
            case 'manage-roles':
                this.showRoleManager();
                break;
            case 'view-user':
                this.showUserViewer(element.dataset.id);
                break;
            case 'edit-user':
                this.showUserEditor(element.dataset.id);
                break;
            case 'manage-user-sessions':
                this.showUserSessions(element.dataset.id);
                break;
            case 'view-role-permissions':
                this.showRolePermissions(element.dataset.role);
                break;
            case 'export-activity-log':
                this.exportActivityLog();
                break;
        }
    }

    handleUserForm(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        switch (form.dataset.userForm) {
            case 'new-user':
                this.createUser(data);
                break;
            case 'update-user':
                this.updateUser(data.id, data);
                break;
            case 'new-role':
                this.createRole(data);
                break;
            case 'assign-permissions':
                this.assignRolePermissions(data.roleId, data.permissions);
                break;
        }
    }

    applyUserFilters() {
        // Implementar filtros para tablas de usuarios
        console.log('Aplicando filtros de usuarios...');
    }

    showLoadingState(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Cargando datos de usuarios...</p>
                </div>
            `;
        }
    }

    hideLoadingState(containerId) {
        // Se oculta automáticamente al cargar nuevos datos
    }

    showError(message, error = null) {
        console.error('Error de usuarios:', error);
        
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showWarning(message) {
        const notification = document.createElement('div');
        notification.className = 'notification warning';
        notification.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // ========================================
    // MÉTODOS DE INTERFAZ ADICIONALES
    // ========================================

    showUserCreator() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Crear Nuevo Usuario</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form class="modal-body" data-user-form="new-user">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nombre Completo</label>
                            <input type="text" name="name" required>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Rol</label>
                            <select name="role" required>
                                <option value="">Seleccionar rol...</option>
                                ${Array.from(this.userRoles.values()).map(role => 
                                    `<option value="${role.id}">${role.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="tel" name="phone">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Contraseña Temporal</label>
                            <input type="password" name="password" required>
                        </div>
                        <div class="form-group">
                            <label>Especialidades (opcional)</label>
                            <input type="text" name="specialties" placeholder="Separadas por comas">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Notas</label>
                        <textarea name="notes" rows="2"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-user-plus"></i> Crear Usuario
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    showRoleManager() {
        const modal = document.createElement('div');
        modal.className = 'modal modal-large';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Gestionar Roles y Permisos</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="roles-permissions-grid">
                        <div class="roles-list">
                            <h4>Roles del Sistema</h4>
                            <div class="roles-container">
                                ${Array.from(this.userRoles.values()).map(role => `
                                    <div class="role-item" data-role="${role.id}">
                                        <div class="role-header">
                                            <span class="role-name">${role.name}</span>
                                            <span class="role-level">Nivel ${role.level}</span>
                                        </div>
                                        <div class="role-description">${role.description}</div>
                                        <div class="role-permissions-count">
                                            ${role.permissions.length} permisos
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="permissions-matrix">
                            <h4>Matriz de Permisos</h4>
                            <div class="permissions-container">
                                ${Object.entries(this.permissions).map(([perm, info]) => `
                                    <div class="permission-item">
                                        <div class="permission-name">${info.name}</div>
                                        <div class="permission-category">${info.category}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    showUserViewer(userId) {
        // Implementar visor de usuarios
        this.showSuccess(`Abriendo perfil del usuario ${userId}...`);
    }

    showUserEditor(userId) {
        // Implementar editor de usuarios
        this.showSuccess(`Editando usuario ${userId}...`);
    }

    showUserSessions(userId) {
        // Implementar gestor de sesiones
        this.showSuccess(`Gestionando sesiones del usuario ${userId}...`);
    }

    showRolePermissions(roleId) {
        // Implementar visor de permisos de rol
        this.showSuccess(`Mostrando permisos del rol ${roleId}...`);
    }

    exportActivityLog() {
        // Implementar exportación de log de actividad
        this.showSuccess('Preparando exportación del log de actividad...');
    }

    // ========================================
    // WEBSOCKET EVENT HANDLERS
    // ========================================

    handleUserLogin(data) {
        console.log('Usuario conectado:', data);
        this.showSuccess(`${data.userName} se ha conectado`);
    }

    handleUserLogout(data) {
        console.log('Usuario desconectado:', data);
        this.showInfo(`${data.userName} se ha desconectado`);
    }

    handlePermissionDenied(data) {
        console.log('Acceso denegado:', data);
        this.showError(`Acceso denegado: ${data.permission}`);
    }

    handleSessionExpired(data) {
        console.log('Sesión expirada:', data);
        this.showWarning('Su sesión ha expirado');
        this.auth.logout();
        window.location.href = '/login';
    }

    loadUserPreferences() {
        // Cargar preferencias de usuario
        const preferences = localStorage.getItem('user-management-preferences');
        if (preferences) {
            try {
                this.preferences = JSON.parse(preferences);
            } catch (error) {
                this.preferences = {};
            }
        } else {
            this.preferences = {
                inactivityTimeout: 30, // minutos
                sessionLimit: 3,
                auditRetention: 90, // días
                autoLockScreen: false
            };
        }
    }
}

// Inicializar el sistema de gestión de usuarios cuando se carga el DOM
document.addEventListener('DOMContentLoaded', () => {
    window.userManagement = new UserManagementSystem();
});