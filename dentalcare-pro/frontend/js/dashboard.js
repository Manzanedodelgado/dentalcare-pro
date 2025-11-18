/**
 * DentalCare Pro - Dashboard Module
 * Dashboard functionality with today's appointments and stats
 * Production-ready dashboard with Apple-style design
 */

class DashboardManager {
  constructor() {
    this.isInitialized = false;
    this.refreshInterval = null;
    this.lastRefresh = null;
    
    // Dashboard data
    this.data = {
      stats: {},
      todayAppointments: [],
      urgentMessages: [],
      recentActivity: []
    };
    
    // Initialize dashboard
    this.init();
  }
  
  /**
   * Initialize dashboard
   */
  init() {
    if (this.isInitialized) return;
    
    this.setupEventListeners();
    this.setupPeriodicRefresh();
    
    this.isInitialized = true;
    console.log('Dashboard initialized');
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-dashboard');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refresh());
    }
    
    // Quick appointment button
    const quickAppointmentBtn = document.getElementById('quick-appointment');
    if (quickAppointmentBtn) {
      quickAppointmentBtn.addEventListener('click', () => this.showQuickAppointment());
    }
    
    // Navigation links
    const agendaLink = document.querySelector('[data-page="agenda"]');
    if (agendaLink) {
      agendaLink.addEventListener('click', (e) => {
        e.preventDefault();
        app.navigateTo('agenda');
      });
    }
    
    const whatsappLink = document.querySelector('[data-page="whatsapp"]');
    if (whatsappLink) {
      whatsappLink.addEventListener('click', (e) => {
        e.preventDefault();
        app.navigateTo('whatsapp');
      });
    }
    
    // WebSocket events
    window.addEventListener('app:appointment_update', (event) => {
      this.handleAppointmentUpdate(event.detail);
    });
    
    window.addEventListener('auth:urgent_message', (event) => {
      this.handleUrgentMessage(event.detail);
    });
  }
  
  /**
   * Setup periodic refresh
   */
  setupPeriodicRefresh() {
    // Refresh every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.refresh();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Refresh dashboard data
   */
  async refresh() {
    try {
      console.log('Refreshing dashboard...');
      
      // Show loading state
      this.showLoadingState();
      
      // Load all dashboard data
      await Promise.all([
        this.loadDashboardStats(),
        this.loadTodayAppointments(),
        this.loadUrgentMessages(),
        this.loadRecentActivity()
      ]);
      
      // Update UI
      this.updateUI();
      
      this.lastRefresh = new Date();
      
      console.log('Dashboard refreshed successfully');
      
    } catch (error) {
      console.error('Dashboard refresh error:', error);
      Toast.error('Error actualizando el panel de control');
    } finally {
      this.hideLoadingState();
    }
  }
  
  /**
   * Refresh only statistics
   */
  async refreshStats() {
    try {
      await this.loadDashboardStats();
      this.updateStatsUI();
    } catch (error) {
      console.error('Stats refresh error:', error);
    }
  }
  
  /**
   * Load dashboard statistics
   */
  async loadDashboardStats() {
    try {
      const result = await API.getDashboardStats();
      
      if (result.success) {
        this.data.stats = result.data;
        this.updateStatsUI();
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  }
  
  /**
   * Load today's appointments
   */
  async loadTodayAppointments() {
    try {
      const result = await API.getTodayAppointments();
      
      if (result.success) {
        this.data.todayAppointments = result.data;
        this.updateAppointmentsUI();
        
        // Update sidebar badges
        this.updateSidebarBadges();
      }
    } catch (error) {
      console.error('Error loading today appointments:', error);
    }
  }
  
  /**
   * Load urgent messages
   */
  async loadUrgentMessages() {
    try {
      const result = await API.getUrgentMessages();
      
      if (result.success) {
        this.data.urgentMessages = result.data;
        this.updateUrgentMessagesUI();
      }
    } catch (error) {
      console.error('Error loading urgent messages:', error);
    }
  }
  
  /**
   * Load recent activity
   */
  async loadRecentActivity() {
    try {
      const result = await API.getRecentActivity();
      
      if (result.success) {
        this.data.recentActivity = result.data;
        this.updateActivityUI();
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  }
  
  /**
   * Update UI components
   */
  updateUI() {
    this.updateStatsUI();
    this.updateAppointmentsUI();
    this.updateUrgentMessagesUI();
    this.updateActivityUI();
    this.updateSidebarBadges();
  }
  
  /**
   * Update statistics UI
   */
  updateStatsUI() {
    const stats = this.data.stats;
    
    // Update today appointments
    const todayAppointmentsEl = document.getElementById('today-appointments');
    const todayAppointmentsChangeEl = document.getElementById('today-appointments-change');
    
    if (todayAppointmentsEl) {
      todayAppointmentsEl.textContent = stats.todayAppointments || 0;
    }
    
    if (todayAppointmentsChangeEl) {
      const change = stats.todayAppointmentsChange || 0;
      const changeText = change > 0 ? `+${change} vs ayer` : `${change} vs ayer`;
      todayAppointmentsChangeEl.textContent = changeText;
      todayAppointmentsChangeEl.className = `stat-change ${change >= 0 ? 'positive' : 'negative'}`;
    }
    
    // Update total patients
    const totalPatientsEl = document.getElementById('total-patients');
    const patientsChangeEl = document.getElementById('patients-change');
    
    if (totalPatientsEl) {
      totalPatientsEl.textContent = stats.totalPatients || 0;
    }
    
    if (patientsChangeEl) {
      const change = stats.patientsChange || 0;
      const changeText = change > 0 ? `+${change} este mes` : `${change} este mes`;
      patientsChangeEl.textContent = changeText;
      patientsChangeEl.className = `stat-change ${change >= 0 ? 'positive' : 'negative'}`;
    }
    
    // Update monthly revenue
    const monthlyRevenueEl = document.getElementById('monthly-revenue');
    const revenueChangeEl = document.getElementById('revenue-change');
    
    if (monthlyRevenueEl) {
      monthlyRevenueEl.textContent = Utils.formatCurrency(stats.monthlyRevenue || 0);
    }
    
    if (revenueChangeEl) {
      const change = stats.revenueChange || 0;
      const changeText = change > 0 ? `+${change}% vs mes anterior` : `${change}% vs mes anterior`;
      revenueChangeEl.textContent = changeText;
      revenueChangeEl.className = `stat-change ${change >= 0 ? 'positive' : 'negative'}`;
    }
    
    // Update urgent messages
    const urgentMessagesEl = document.getElementById('urgent-messages');
    const urgentChangeEl = document.getElementById('urgent-change');
    
    if (urgentMessagesEl) {
      urgentMessagesEl.textContent = this.data.urgentMessages.length;
    }
    
    if (urgentChangeEl) {
      const change = stats.urgentMessagesChange || 0;
      urgentChangeEl.textContent = `${change} nuevos`;
    }
  }
  
  /**
   * Update appointments UI
   */
  updateAppointmentsUI() {
    const container = document.getElementById('today-schedule');
    if (!container) return;
    
    if (this.data.todayAppointments.length === 0) {
      container.innerHTML = `
        <div class="no-appointments">
          <p>No hay citas programadas para hoy</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.data.todayAppointments.map(appointment => {
      return this.createAppointmentHTML(appointment);
    }).join('');
    
    // Add event listeners to appointment items
    this.addAppointmentEventListeners();
  }
  
  /**
   * Create appointment HTML
   */
  createAppointmentHTML(appointment) {
    const statusClass = this.getStatusClass(appointment.status);
    const statusText = this.getStatusText(appointment.status);
    
    return `
      <div class="schedule-item" data-appointment-id="${appointment.id}">
        <div class="schedule-time">
          ${Utils.formatTime(appointment.date)}
        </div>
        <div class="schedule-content">
          <div class="schedule-patient">
            ${Utils.sanitizeHTML(appointment.patientName)}
          </div>
          <div class="schedule-details">
            ${Utils.sanitizeHTML(appointment.treatment || 'Consulta general')}
            ${appointment.dentist ? ` - Dr. ${Utils.sanitizeHTML(appointment.dentist)}` : ''}
          </div>
          ${appointment.notes ? `
            <div class="schedule-notes">
              ${Utils.sanitizeHTML(appointment.notes)}
            </div>
          ` : ''}
        </div>
        <div class="schedule-status">
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
      </div>
    `;
  }
  
  /**
   * Get status class for CSS
   */
  getStatusClass(status) {
    const statusMap = {
      'Planificada': 'planned',
      'Confirmada': 'confirmed',
      'Aceptada': 'accepted',
      'Completada': 'completed',
      'Cancelada': 'cancelled'
    };
    
    return statusMap[status] || 'planned';
  }
  
  /**
   * Get status text
   */
  getStatusText(status) {
    return status || 'Planificada';
  }
  
  /**
   * Add event listeners to appointment items
   */
  addAppointmentEventListeners() {
    const appointmentItems = document.querySelectorAll('.schedule-item');
    
    appointmentItems.forEach(item => {
      const appointmentId = item.getAttribute('data-appointment-id');
      
      item.addEventListener('click', () => {
        this.showAppointmentDetails(appointmentId);
      });
    });
  }
  
  /**
   * Update urgent messages UI
   */
  updateUrgentMessagesUI() {
    const container = document.getElementById('urgent-messages-list');
    if (!container) return;
    
    if (this.data.urgentMessages.length === 0) {
      container.innerHTML = `
        <div class="no-messages">
          <p>No hay mensajes urgentes</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.data.urgentMessages.map(message => {
      return this.createUrgentMessageHTML(message);
    }).join('');
    
    // Add event listeners
    this.addUrgentMessageEventListeners();
  }
  
  /**
   * Create urgent message HTML
   */
  createUrgentMessageHTML(message) {
    return `
      <div class="urgent-message-item" data-conversation-id="${message.conversationId}">
        <div class="urgent-header">
          <div class="urgent-contact">
            <span class="urgent-icon">🟠</span>
            <span>${Utils.sanitizeHTML(message.contact)}</span>
          </div>
          <div class="urgent-time">
            ${Utils.getRelativeTime(message.timestamp)}
          </div>
        </div>
        <div class="urgent-content">
          ${Utils.sanitizeHTML(message.preview || message.message)}
        </div>
      </div>
    `;
  }
  
  /**
   * Add event listeners to urgent message items
   */
  addUrgentMessageEventListeners() {
    const messageItems = document.querySelectorAll('.urgent-message-item');
    
    messageItems.forEach(item => {
      const conversationId = item.getAttribute('data-conversation-id');
      
      item.addEventListener('click', () => {
        this.openUrgentConversation(conversationId);
      });
    });
  }
  
  /**
   * Update activity UI
   */
  updateActivityUI() {
    const container = document.getElementById('recent-activity');
    if (!container) return;
    
    if (this.data.recentActivity.length === 0) {
      container.innerHTML = `
        <div class="no-activity">
          <p>No hay actividad reciente</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.data.recentActivity.map(activity => {
      return this.createActivityHTML(activity);
    }).join('');
  }
  
  /**
   * Create activity HTML
   */
  createActivityHTML(activity) {
    const iconMap = {
      'appointment_created': '📅',
      'appointment_updated': '✏️',
      'appointment_cancelled': '❌',
      'patient_added': '👤',
      'patient_updated': '✏️',
      'invoice_generated': '💰',
      'document_uploaded': '📄',
      'urgent_message': '🟠'
    };
    
    const icon = iconMap[activity.type] || '📋';
    
    return `
      <div class="activity-item">
        <div class="activity-icon ${activity.type.includes('cancelled') ? 'warning' : 'success'}">
          ${icon}
        </div>
        <div class="activity-content">
          <div class="activity-text">
            ${Utils.sanitizeHTML(activity.description)}
          </div>
          <div class="activity-time">
            ${Utils.getRelativeTime(activity.timestamp)}
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Update sidebar badges
   */
  updateSidebarBadges() {
    // Today appointments badge
    const todayAppointmentsBadge = document.getElementById('today-appointments-badge');
    if (todayAppointmentsBadge) {
      todayAppointmentsBadge.textContent = this.data.todayAppointments.length;
    }
    
    // Total appointments badge (approximate)
    const totalAppointmentsBadge = document.getElementById('total-appointments-badge');
    if (totalAppointmentsBadge) {
      totalAppointmentsBadge.textContent = this.data.stats.totalAppointments || 0;
    }
    
    // Unread messages badge
    const unreadMessagesBadge = document.getElementById('unread-messages-badge');
    if (unreadMessagesBadge) {
      const unreadCount = this.data.urgentMessages.length;
      unreadMessagesBadge.textContent = unreadCount;
      unreadMessagesBadge.classList.toggle('hidden', unreadCount === 0);
    }
    
    // Patients count badge
    const patientsCountBadge = document.getElementById('patients-count-badge');
    if (patientsCountBadge) {
      patientsCountBadge.textContent = this.data.stats.totalPatients || 0;
    }
  }
  
  /**
   * Show loading state
   */
  showLoadingState() {
    const containers = [
      'today-schedule',
      'urgent-messages-list',
      'recent-activity'
    ];
    
    containers.forEach(containerId => {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `
          <div class="loading-placeholder">
            <div class="spinner-small"></div>
            <p>Cargando...</p>
          </div>
        `;
      }
    });
  }
  
  /**
   * Hide loading state
   */
  hideLoadingState() {
    // Loading state is hidden by updateUI method
  }
  
  /**
   * Show appointment details
   */
  showAppointmentDetails(appointmentId) {
    // Find appointment in data
    const appointment = this.data.todayAppointments.find(apt => apt.id == appointmentId);
    
    if (!appointment) {
      Toast.error('Cita no encontrada');
      return;
    }
    
    const modalContent = `
      <div class="appointment-details">
        <h3>Detalles de la Cita</h3>
        
        <div class="detail-grid">
          <div class="detail-item">
            <label>Paciente:</label>
            <span>${Utils.sanitizeHTML(appointment.patientName)}</span>
          </div>
          
          <div class="detail-item">
            <label>Fecha y Hora:</label>
            <span>${Utils.formatDateTime(appointment.date)}</span>
          </div>
          
          <div class="detail-item">
            <label>Tratamiento:</label>
            <span>${Utils.sanitizeHTML(appointment.treatment || 'Consulta general')}</span>
          </div>
          
          <div class="detail-item">
            <label>Dentista:</label>
            <span>${appointment.dentist ? `Dr. ${Utils.sanitizeHTML(appointment.dentist)}` : 'No asignado'}</span>
          </div>
          
          <div class="detail-item">
            <label>Estado:</label>
            <span class="status-badge ${this.getStatusClass(appointment.status)}">${this.getStatusText(appointment.status)}</span>
          </div>
          
          ${appointment.notes ? `
            <div class="detail-item full-width">
              <label>Notas:</label>
              <p>${Utils.sanitizeHTML(appointment.notes)}</p>
            </div>
          ` : ''}
        </div>
        
        <div class="appointment-actions">
          <button class="btn btn-primary" onclick="Dashboard.editAppointment('${appointmentId}')">
            Editar Cita
          </button>
          <button class="btn btn-secondary" onclick="Dashboard.confirmAppointment('${appointmentId}')">
            Confirmar
          </button>
          <button class="btn btn-outline" onclick="Modal.hideAll()">
            Cerrar
          </button>
        </div>
      </div>
    `;
    
    Modal.show(modalContent, {
      title: 'Detalles de la Cita',
      size: 'large'
    });
  }
  
  /**
   * Open urgent conversation
   */
  openUrgentConversation(conversationId) {
    // Navigate to WhatsApp page
    app.navigateTo('whatsapp');
    
    // Open specific conversation if WhatsApp module is loaded
    if (typeof WhatsApp !== 'undefined' && WhatsApp.openConversation) {
      setTimeout(() => {
        WhatsApp.openConversation(conversationId);
      }, 500);
    }
    
    Modal.hideAll();
  }
  
  /**
   * Show quick appointment modal
   */
  showQuickAppointment() {
    const modalContent = `
      <form id="quick-appointment-form">
        <div class="form-row">
          <div class="form-group">
            <label for="qa-patient">Paciente</label>
            <select id="qa-patient" required>
              <option value="">Seleccionar paciente</option>
              ${this.generatePatientOptions()}
            </select>
          </div>
          
          <div class="form-group">
            <label for="qa-dentist">Dentista</label>
            <select id="qa-dentist" required>
              <option value="">Seleccionar dentista</option>
              ${this.generateDentistOptions()}
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="qa-date">Fecha</label>
            <input type="date" id="qa-date" required value="${new Date().toISOString().split('T')[0]}">
          </div>
          
          <div class="form-group">
            <label for="qa-time">Hora</label>
            <input type="time" id="qa-time" required value="10:00">
          </div>
        </div>
        
        <div class="form-group">
          <label for="qa-treatment">Tratamiento</label>
          <input type="text" id="qa-treatment" placeholder="Consulta general" maxlength="100">
        </div>
        
        <div class="form-group">
          <label for="qa-notes">Notas (opcional)</label>
          <textarea id="qa-notes" rows="3" maxlength="500" placeholder="Notas adicionales..."></textarea>
        </div>
        
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="Modal.hideAll()">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary">
            Crear Cita
          </button>
        </div>
      </form>
    `;
    
    Modal.show(modalContent, {
      title: 'Nueva Cita Rápida',
      size: 'normal'
    });
    
    // Setup form submission
    const form = document.getElementById('quick-appointment-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createQuickAppointment(form);
      });
    }
  }
  
  /**
   * Generate patient options
   */
  generatePatientOptions() {
    const patients = app.getState('patients') || [];
    return patients.map(patient => 
      `<option value="${patient.id}">${Utils.sanitizeHTML(patient.name)}</option>`
    ).join('');
  }
  
  /**
   * Generate dentist options
   */
  generateDentistOptions() {
    // This would typically come from an API or config
    const dentists = [
      { id: 1, name: 'Dr. García' },
      { id: 2, name: 'Dra. Martínez' },
      { id: 3, name: 'Dr. López' }
    ];
    
    return dentists.map(dentist => 
      `<option value="${dentist.id}">${Utils.sanitizeHTML(dentist.name)}</option>`
    ).join('');
  }
  
  /**
   * Create quick appointment
   */
  async createQuickAppointment(form) {
    try {
      const formData = new FormData(form);
      
      const appointmentData = {
        patientId: document.getElementById('qa-patient').value,
        dentistId: document.getElementById('qa-dentist').value,
        date: document.getElementById('qa-date').value,
        time: document.getElementById('qa-time').value,
        treatment: document.getElementById('qa-treatment').value,
        notes: document.getElementById('qa-notes').value
      };
      
      const result = await API.createAppointment(appointmentData);
      
      if (result.success) {
        Toast.success('Cita creada exitosamente');
        Modal.hideAll();
        this.refresh();
      } else {
        throw new Error(result.message || 'Error creando la cita');
      }
      
    } catch (error) {
      console.error('Error creating appointment:', error);
      Toast.error(error.message || 'Error creando la cita');
    }
  }
  
  /**
   * Edit appointment (placeholder)
   */
  editAppointment(appointmentId) {
    Toast.info('Funcionalidad de edición en desarrollo');
  }
  
  /**
   * Confirm appointment
   */
  async confirmAppointment(appointmentId) {
    try {
      const result = await API.confirmAppointment(appointmentId);
      
      if (result.success) {
        Toast.success('Cita confirmada exitosamente');
        Modal.hideAll();
        this.refresh();
      } else {
        throw new Error(result.message || 'Error confirmando la cita');
      }
      
    } catch (error) {
      console.error('Error confirming appointment:', error);
      Toast.error(error.message || 'Error confirmando la cita');
    }
  }
  
  /**
   * Handle appointment update from WebSocket
   */
  handleAppointmentUpdate(data) {
    // Update today's appointments if the updated appointment is for today
    if (Utils.isToday(data.date)) {
      const index = this.data.todayAppointments.findIndex(apt => apt.id === data.id);
      
      if (index !== -1) {
        this.data.todayAppointments[index] = data;
      } else {
        this.data.todayAppointments.push(data);
      }
      
      this.updateAppointmentsUI();
      this.updateSidebarBadges();
    }
  }
  
  /**
   * Handle urgent message from WebSocket
   */
  handleUrgentMessage(data) {
    // Add to urgent messages if not already present
    const exists = this.data.urgentMessages.some(msg => msg.id === data.id);
    
    if (!exists) {
      this.data.urgentMessages.unshift(data);
      this.updateUrgentMessagesUI();
      this.updateSidebarBadges();
      
      // Show notification
      Toast.urgent('Nuevo mensaje urgente recibido');
    }
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

// Create global dashboard instance
const Dashboard = new DashboardManager();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Dashboard;
} else {
  window.Dashboard = Dashboard;
}

// Make dashboard available globally
window.DentalCareDashboard = Dashboard;