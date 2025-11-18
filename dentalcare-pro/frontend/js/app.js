/**
 * DentalCare Pro - Main Application
 * Core application logic, routing, and initialization
 * Production-ready application with Apple-style UI
 */

class DentalCareApp {
  constructor() {
    this.currentPage = 'dashboard';
    this.isInitialized = false;
    this.loadingStates = new Map();
    this.observers = new Map();
    
    // Application state
    this.state = {
      user: null,
      appointments: [],
      patients: [],
      urgentMessages: [],
      notifications: [],
      isOnline: navigator.onLine,
      lastSync: null
    };
    
    // Initialize application
    this.init();
  }
  
  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('Initializing DentalCare Pro...');
      
      // Show loading screen
      this.showLoadingScreen();
      
      // Initialize core systems
      await this.initializeSystems();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Setup routing
      this.setupRouting();
      
      // Setup WebSocket connection
      this.setupWebSocket();
      
      // Initialize UI components
      this.initializeUI();
      
      // Setup periodic updates
      this.setupPeriodicUpdates();
      
      // Hide loading screen
      this.hideLoadingScreen();
      
      this.isInitialized = true;
      console.log('DentalCare Pro initialized successfully');
      
      // Emit initialization event
      this.emit('app:initialized');
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.handleInitializationError(error);
    }
  }
  
  /**
   * Initialize core systems
   */
  async initializeSystems() {
    // Check authentication
    if (!Auth.isAuthenticated) {
      await this.handleAuthentication();
      return;
    }
    
    // Load initial data
    await this.loadInitialData();
    
    // Setup connection monitoring
    this.setupConnectionMonitoring();
  }
  
  /**
   * Handle authentication check
   */
  async handleAuthentication() {
    const hasValidToken = await Auth.validateToken();
    
    if (!hasValidToken) {
      // Redirect to login
      this.showLoginScreen();
      return;
    }
    
    // Authentication successful, update user state
    this.state.user = Auth.currentUser;
    console.log('User authenticated:', this.state.user.email);
  }
  
  /**
   * Load initial application data
   */
  async loadInitialData() {
    try {
      console.log('Loading initial data...');
      
      // Load dashboard data
      const dashboardPromise = API.getDashboardStats();
      const appointmentsPromise = API.getTodayAppointments();
      const urgentMessagesPromise = API.getUrgentMessages();
      const patientsPromise = API.getPatients({ limit: 10 });
      
      const [
        dashboardResult,
        appointmentsResult,
        urgentResult,
        patientsResult
      ] = await Promise.allSettled([
        dashboardPromise,
        appointmentsPromise,
        urgentMessagesPromise,
        patientsPromise
      ]);
      
      // Update state with results
      if (dashboardResult.status === 'fulfilled' && dashboardResult.value.success) {
        this.updateState('dashboard', dashboardResult.value.data);
      }
      
      if (appointmentsResult.status === 'fulfilled' && appointmentsResult.value.success) {
        this.updateState('appointments', appointmentsResult.value.data);
      }
      
      if (urgentResult.status === 'fulfilled' && urgentResult.value.success) {
        this.updateState('urgentMessages', urgentResult.value.data);
      }
      
      if (patientsResult.status === 'fulfilled' && patientsResult.value.success) {
        this.updateState('patients', patientsResult.value.data);
      }
      
      // Update last sync time
      this.state.lastSync = new Date().toISOString();
      
      console.log('Initial data loaded successfully');
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      Toast.error('Error cargando datos iniciales. Algunas funciones pueden no estar disponibles.');
    }
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Authentication events
    window.addEventListener('auth:login', (event) => {
      this.handleLogin(event.detail.user);
    });
    
    window.addEventListener('auth:logout', () => {
      this.handleLogout();
    });
    
    window.addEventListener('auth:tokenRefresh', (event) => {
      this.handleTokenRefresh(event.detail.user);
    });
    
    // WebSocket events
    window.addEventListener('auth:urgent_message', (event) => {
      this.handleUrgentMessage(event.detail);
    });
    
    window.addEventListener('auth:appointment_update', (event) => {
      this.handleAppointmentUpdate(event.detail);
    });
    
    // Navigation events
    document.addEventListener('click', (event) => {
      const pageLink = event.target.closest('[data-page]');
      if (pageLink) {
        event.preventDefault();
        const page = pageLink.getAttribute('data-page');
        this.navigateTo(page);
      }
    });
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + K for global search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        this.focusGlobalSearch();
      }
      
      // Escape to close modals/dropdowns
      if (event.key === 'Escape') {
        Modal.hideAll();
        this.closeAllDropdowns();
      }
    });
    
    // Window events
    window.addEventListener('online', () => {
      this.handleConnectionChange(true);
    });
    
    window.addEventListener('offline', () => {
      this.handleConnectionChange(false);
    });
    
    window.addEventListener('beforeunload', (event) => {
      this.handleBeforeUnload(event);
    });
  }
  
  /**
   * Setup routing
   */
  setupRouting() {
    // Handle initial page load
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 'dashboard';
    
    // Setup pushState for navigation
    window.addEventListener('popstate', (event) => {
      const page = event.state?.page || 'dashboard';
      this.navigateTo(page, false);
    });
    
    // Navigate to initial page
    this.navigateTo(page, false);
  }
  
  /**
   * Navigate to a specific page
   */
  navigateTo(page, updateURL = true) {
    if (!this.isValidPage(page)) {
      console.warn(`Invalid page: ${page}`);
      return;
    }
    
    // Update current page
    const previousPage = this.currentPage;
    this.currentPage = page;
    
    // Update URL
    if (updateURL) {
      const url = new URL(window.location);
      url.searchParams.set('page', page);
      window.history.pushState({ page }, '', url);
    }
    
    // Update navigation
    this.updateNavigation(page);
    
    // Show/hide pages
    this.showPage(page);
    
    // Load page-specific data
    this.loadPageData(page);
    
    // Emit navigation event
    this.emit('app:navigate', { 
      from: previousPage, 
      to: page 
    });
    
    console.log(`Navigated to page: ${page}`);
  }
  
  /**
   * Show specific page
   */
  showPage(page) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    
    // Show target page
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
      targetPage.classList.add('active');
    }
    
    // Update page title
    this.updatePageTitle(page);
  }
  
  /**
   * Update navigation active state
   */
  updateNavigation(activePage) {
    const navItems = document.querySelectorAll('.sidebar-item');
    navItems.forEach(item => {
      const itemPage = item.getAttribute('data-page');
      item.classList.toggle('active', itemPage === activePage);
    });
  }
  
  /**
   * Load page-specific data
   */
  async loadPageData(page) {
    switch (page) {
      case 'dashboard':
        if (typeof Dashboard !== 'undefined' && Dashboard.refresh) {
          Dashboard.refresh();
        }
        break;
        
      case 'agenda':
        if (typeof Agenda !== 'undefined' && Agenda.refresh) {
          Agenda.refresh();
        }
        break;
        
      case 'whatsapp':
        if (typeof WhatsApp !== 'undefined' && WhatsApp.refresh) {
          WhatsApp.refresh();
        }
        break;
        
      case 'patients':
        if (typeof Patients !== 'undefined' && Patients.refresh) {
          Patients.refresh();
        }
        break;
        
      case 'invoices':
        if (typeof Invoices !== 'undefined' && Invoices.refresh) {
          Invoices.refresh();
        }
        break;
        
      case 'documents':
        if (typeof Documents !== 'undefined' && Documents.refresh) {
          Documents.refresh();
        }
        break;
        
      case 'accounting':
        if (typeof Accounting !== 'undefined' && Accounting.refresh) {
          Accounting.refresh();
        }
        break;
        
      case 'legal':
        if (typeof Legal !== 'undefined' && Legal.refresh) {
          Legal.refresh();
        }
        break;
        
      case 'users':
        if (typeof Users !== 'undefined' && Users.refresh) {
          Users.refresh();
        }
        break;
    }
  }
  
  /**
   * Setup WebSocket connection
   */
  setupWebSocket() {
    if (Auth.isAuthenticated) {
      WebSocket.connect();
      
      // Update connection status indicator
      this.updateConnectionStatus();
    }
  }
  
  /**
   * Initialize UI components
   */
  initializeUI() {
    // Setup sidebar toggle
    this.setupSidebarToggle();
    
    // Setup global search
    this.setupGlobalSearch();
    
    // Setup user menu
    this.setupUserMenu();
    
    // Setup urgent messages dropdown
    this.setupUrgentMessagesDropdown();
    
    // Setup notifications
    this.setupNotifications();
    
    // Setup tooltips and popovers
    this.initializeTooltips();
  }
  
  /**
   * Setup sidebar toggle for mobile
   */
  setupSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
      
      // Close sidebar when clicking outside
      document.addEventListener('click', (event) => {
        if (window.innerWidth <= 1024) {
          if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
            sidebar.classList.remove('open');
          }
        }
      });
    }
  }
  
  /**
   * Setup global search functionality
   */
  setupGlobalSearch() {
    const globalSearch = document.getElementById('global-search');
    
    if (globalSearch) {
      const debouncedSearch = Utils.debounce((query) => {
        if (query.length >= 2) {
          this.performGlobalSearch(query);
        }
      }, 300);
      
      globalSearch.addEventListener('input', (event) => {
        debouncedSearch(event.target.value.trim());
      });
      
      globalSearch.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          this.performGlobalSearch(event.target.value.trim());
        }
      });
    }
  }
  
  /**
   * Setup user menu
   */
  setupUserMenu() {
    const userBtn = document.getElementById('user-btn');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userBtn && userDropdown) {
      userBtn.addEventListener('click', () => {
        userDropdown.classList.toggle('hidden');
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (event) => {
        if (!userBtn.contains(event.target) && !userDropdown.contains(event.target)) {
          userDropdown.classList.add('hidden');
        }
      });
      
      // Setup dropdown actions
      const profileBtn = document.getElementById('profile-btn');
      const settingsBtn = document.getElementById('settings-btn');
      const logoutBtn = document.getElementById('logout-btn');
      
      if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showUserProfile();
        });
      }
      
      if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showSettings();
        });
      }
      
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.logout();
        });
      }
    }
    
    // Update user info in UI
    this.updateUserInfo();
  }
  
  /**
   * Setup urgent messages dropdown
   */
  setupUrgentMessagesDropdown() {
    const urgentBtn = document.getElementById('urgent-btn');
    const urgentDropdown = document.getElementById('urgent-dropdown');
    
    if (urgentBtn && urgentDropdown) {
      urgentBtn.addEventListener('click', () => {
        urgentDropdown.classList.toggle('hidden');
        if (!urgentDropdown.classList.contains('hidden')) {
          this.loadUrgentMessages();
        }
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (event) => {
        if (!urgentBtn.contains(event.target) && !urgentDropdown.contains(event.target)) {
          urgentDropdown.classList.add('hidden');
        }
      });
    }
  }
  
  /**
   * Setup notifications
   */
  setupNotifications() {
    const notificationBtn = document.getElementById('notification-btn');
    
    if (notificationBtn) {
      notificationBtn.addEventListener('click', () => {
        this.showNotifications();
      });
    }
  }
  
  /**
   * Setup periodic updates
   */
  setupPeriodicUpdates() {
    // Update dashboard stats every 5 minutes
    setInterval(() => {
      if (this.currentPage === 'dashboard' && typeof Dashboard !== 'undefined') {
        Dashboard.refreshStats();
      }
    }, 5 * 60 * 1000);
    
    // Check for urgent messages every minute
    setInterval(() => {
      this.checkUrgentMessages();
    }, 60 * 1000);
    
    // Sync data every 10 minutes
    setInterval(() => {
      this.syncData();
    }, 10 * 60 * 1000);
  }
  
  /**
   * Setup connection monitoring
   */
  setupConnectionMonitoring() {
    window.addEventListener('online', () => {
      this.handleConnectionChange(true);
    });
    
    window.addEventListener('offline', () => {
      this.handleConnectionChange(false);
    });
  }
  
  /**
   * Show loading screen
   */
  showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const appContainer = document.getElementById('app-container');
    const loginContainer = document.getElementById('login-container');
    
    if (loadingScreen) loadingScreen.classList.remove('hidden');
    if (appContainer) appContainer.classList.add('hidden');
    if (loginContainer) loginContainer.classList.add('hidden');
  }
  
  /**
   * Hide loading screen
   */
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const appContainer = document.getElementById('app-container');
    const loginContainer = document.getElementById('login-container');
    
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
      }, 300);
    }
    
    if (appContainer && Auth.isAuthenticated) {
      appContainer.classList.remove('hidden');
    }
    
    if (loginContainer && !Auth.isAuthenticated) {
      loginContainer.classList.remove('hidden');
    }
  }
  
  /**
   * Show login screen
   */
  showLoginScreen() {
    const appContainer = document.getElementById('app-container');
    const loginContainer = document.getElementById('login-container');
    
    if (appContainer) appContainer.classList.add('hidden');
    if (loginContainer) loginContainer.classList.remove('hidden');
    
    this.hideLoadingScreen();
  }
  
  /**
   * Handle login
   */
  handleLogin(user) {
    this.state.user = user;
    
    // Update UI
    this.updateUserInfo();
    
    // Hide login screen
    this.hideLoadingScreen();
    
    // Setup app
    this.initializeSystems();
    
    // Navigate to dashboard
    this.navigateTo('dashboard');
    
    console.log('Login handled successfully');
  }
  
  /**
   * Handle logout
   */
  handleLogout() {
    // Clear state
    this.state = {
      user: null,
      appointments: [],
      patients: [],
      urgentMessages: [],
      notifications: [],
      isOnline: navigator.onLine,
      lastSync: null
    };
    
    // Disconnect WebSocket
    if (typeof WebSocket !== 'undefined') {
      WebSocket.disconnect();
    }
    
    // Show login screen
    this.showLoginScreen();
    
    console.log('Logout handled successfully');
  }
  
  /**
   * Handle token refresh
   */
  handleTokenRefresh(user) {
    this.state.user = user;
    this.updateUserInfo();
    console.log('Token refreshed');
  }
  
  /**
   * Handle urgent message
   */
  handleUrgentMessage(data) {
    // Add to state
    this.state.urgentMessages.unshift(data);
    
    // Update UI indicator
    this.updateUrgentIndicator();
    
    // Show notification
    Toast.urgent('Nuevo mensaje urgente recibido');
    
    // Play sound if enabled
    this.playNotificationSound();
  }
  
  /**
   * Handle appointment update
   */
  handleAppointmentUpdate(data) {
    // Update appointments in state
    const index = this.state.appointments.findIndex(apt => apt.id === data.id);
    if (index !== -1) {
      this.state.appointments[index] = data;
    } else {
      this.state.appointments.push(data);
    }
    
    // Update UI if on relevant pages
    if (this.currentPage === 'dashboard' || this.currentPage === 'agenda') {
      this.loadPageData(this.currentPage);
    }
  }
  
  /**
   * Handle connection change
   */
  handleConnectionChange(isOnline) {
    this.state.isOnline = isOnline;
    
    // Update connection indicator
    this.updateConnectionStatus();
    
    // Show notification
    if (isOnline) {
      Toast.success('Conexión restaurada');
      this.syncData();
    } else {
      Toast.warning('Sin conexión a internet. Trabajando en modo offline.');
    }
    
    console.log(`Connection status: ${isOnline ? 'online' : 'offline'}`);
  }
  
  /**
   * Handle before unload
   */
  handleBeforeUnload(event) {
    // Save any pending changes
    this.savePendingChanges();
    
    // Show confirmation if there are unsaved changes
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?';
      return event.returnValue;
    }
  }
  
  /**
   * Handle initialization error
   */
  handleInitializationError(error) {
    console.error('Initialization error:', error);
    
    // Hide loading screen
    this.hideLoadingScreen();
    
    // Show error message
    const errorMessage = 'Error inicializando la aplicación. Por favor, recarga la página.';
    
    const errorContainer = document.createElement('div');
    errorContainer.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <h2>Error de Inicialización</h2>
        <p>${errorMessage}</p>
        <button onclick="window.location.reload()" class="btn btn-primary">
          Recargar Página
        </button>
      </div>
    `;
    
    document.body.innerHTML = '';
    document.body.appendChild(errorContainer);
  }
  
  /**
   * Focus global search
   */
  focusGlobalSearch() {
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
      globalSearch.focus();
    }
  }
  
  /**
   * Perform global search
   */
  async performGlobalSearch(query) {
    if (!query || query.length < 2) return;
    
    try {
      const results = await API.globalSearch(query);
      
      if (results.success) {
        this.showSearchResults(results.data, query);
      }
    } catch (error) {
      console.error('Global search error:', error);
      Toast.error('Error en la búsqueda');
    }
  }
  
  /**
   * Show search results
   */
  showSearchResults(results, query) {
    const modal = Modal.show(`
      <div>
        <h3>Resultados para "${Utils.sanitizeHTML(query)}"</h3>
        <div id="search-results">
          ${this.formatSearchResults(results)}
        </div>
      </div>
    `, {
      title: 'Búsqueda Global',
      size: 'large'
    });
  }
  
  /**
   * Format search results
   */
  formatSearchResults(results) {
    let html = '';
    
    if (results.patients?.length) {
      html += `
        <div class="search-section">
          <h4>Pacientes</h4>
          <ul>
            ${results.patients.map(patient => `
              <li>
                <a href="#" onclick="app.navigateToPatient('${patient.id}')">
                  ${Utils.sanitizeHTML(patient.name)}
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }
    
    if (results.appointments?.length) {
      html += `
        <div class="search-section">
          <h4>Citas</h4>
          <ul>
            ${results.appointments.map(appointment => `
              <li>
                <a href="#" onclick="app.navigateToAppointment('${appointment.id}')">
                  ${Utils.sanitizeHTML(appointment.patient)} - ${Utils.formatDateTime(appointment.date)}
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }
    
    if (!html) {
      html = '<p>No se encontraron resultados.</p>';
    }
    
    return html;
  }
  
  /**
   * Load urgent messages
   */
  async loadUrgentMessages() {
    try {
      const result = await API.getUrgentMessages();
      
      if (result.success) {
        this.updateUrgentMessagesList(result.data);
      }
    } catch (error) {
      console.error('Error loading urgent messages:', error);
    }
  }
  
  /**
   * Update urgent messages list
   */
  updateUrgentMessagesList(messages) {
    const urgentList = document.getElementById('urgent-list');
    if (!urgentList) return;
    
    if (messages.length === 0) {
      urgentList.innerHTML = '<p style="text-align: center; color: #6b7280;">No hay mensajes urgentes</p>';
      return;
    }
    
    urgentList.innerHTML = messages.map(message => `
      <div class="urgent-item">
        <h4>${Utils.sanitizeHTML(message.contact)}</h4>
        <p>${Utils.sanitizeHTML(message.preview)}</p>
        <span class="urgent-time">${Utils.getRelativeTime(message.timestamp)}</span>
      </div>
    `).join('');
  }
  
  /**
   * Update urgent indicator
   */
  updateUrgentIndicator() {
    const urgentCount = document.getElementById('urgent-count');
    const urgentBtn = document.getElementById('urgent-btn');
    
    const count = this.state.urgentMessages.length;
    
    if (urgentCount) {
      urgentCount.textContent = count;
      urgentCount.classList.toggle('hidden', count === 0);
    }
    
    if (urgentBtn) {
      urgentBtn.classList.toggle('has-urgent', count > 0);
    }
  }
  
  /**
   * Update user info in UI
   */
  updateUserInfo() {
    if (!this.state.user) return;
    
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    const dropdownUserName = document.getElementById('dropdown-user-name');
    const dropdownUserRole = document.getElementById('dropdown-user-role');
    
    if (userName) userName.textContent = this.state.user.name;
    if (userRole) userRole.textContent = this.state.user.role;
    if (dropdownUserName) dropdownUserName.textContent = this.state.user.name;
    if (dropdownUserRole) dropdownUserRole.textContent = this.state.user.role;
  }
  
  /**
   * Update connection status indicator
   */
  updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.className = `status-indicator ${this.state.isOnline ? 'online' : 'offline'}`;
    }
  }
  
  /**
   * Update page title
   */
  updatePageTitle(page) {
    const titles = {
      dashboard: 'Panel de Control',
      agenda: 'Agenda Completa',
      whatsapp: 'WhatsApp Business',
      patients: 'Gestión de Pacientes',
      invoices: 'Facturación',
      documents: 'Documentos',
      accounting: 'Contabilidad',
      legal: 'LOPD',
      users: 'Gestión de Usuarios'
    };
    
    const title = titles[page] || 'DentalCare Pro';
    document.title = `${title} - DentalCare Pro`;
  }
  
  /**
   * Check for urgent messages
   */
  async checkUrgentMessages() {
    try {
      const result = await API.getUrgentCount();
      
      if (result.success && result.data.count !== this.state.urgentMessages.length) {
        this.state.urgentMessages = result.data.messages || [];
        this.updateUrgentIndicator();
      }
    } catch (error) {
      // Silently fail for periodic checks
    }
  }
  
  /**
   * Sync data with server
   */
  async syncData() {
    if (!this.state.isOnline) return;
    
    try {
      await this.loadInitialData();
      this.state.lastSync = new Date().toISOString();
      
      console.log('Data synchronized successfully');
    } catch (error) {
      console.error('Data sync error:', error);
    }
  }
  
  /**
   * Show user profile
   */
  showUserProfile() {
    if (typeof Profile !== 'undefined' && Profile.show) {
      Profile.show(this.state.user);
    } else {
      Toast.info('Funcionalidad de perfil en desarrollo');
    }
  }
  
  /**
   * Show settings
   */
  showSettings() {
    if (typeof Settings !== 'undefined' && Settings.show) {
      Settings.show();
    } else {
      Toast.info('Funcionalidad de configuración en desarrollo');
    }
  }
  
  /**
   * Show notifications
   */
  showNotifications() {
    if (typeof Notifications !== 'undefined' && Notifications.show) {
      Notifications.show(this.state.notifications);
    } else {
      Toast.info('No hay notificaciones nuevas');
    }
  }
  
  /**
   * Logout user
   */
  async logout() {
    const confirmed = await Modal.confirm('¿Estás seguro de que quieres cerrar sesión?');
    
    if (confirmed) {
      await Auth.logout();
    }
  }
  
  /**
   * Navigate to patient
   */
  navigateToPatient(patientId) {
    this.navigateTo('patients');
    if (typeof Patients !== 'undefined' && Patients.showPatient) {
      Patients.showPatient(patientId);
    }
  }
  
  /**
   * Navigate to appointment
   */
  navigateToAppointment(appointmentId) {
    this.navigateTo('agenda');
    if (typeof Agenda !== 'undefined' && Agenda.showAppointment) {
      Agenda.showAppointment(appointmentId);
    }
  }
  
  /**
   * Update application state
   */
  updateState(key, value) {
    this.state[key] = value;
    this.emit('app:stateUpdate', { key, value });
  }
  
  /**
   * Get application state
   */
  getState(key = null) {
    return key ? this.state[key] : this.state;
  }
  
  /**
   * Initialize tooltips
   */
  initializeTooltips() {
    // Simple tooltip implementation
    const tooltipElements = document.querySelectorAll('[title]');
    
    tooltipElements.forEach(element => {
      element.addEventListener('mouseenter', (e) => {
        this.showTooltip(e.target, e.target.getAttribute('title'));
      });
      
      element.addEventListener('mouseleave', (e) => {
        this.hideTooltip();
      });
    });
  }
  
  /**
   * Show tooltip
   */
  showTooltip(element, text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
  }
  
  /**
   * Hide tooltip
   */
  hideTooltip() {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }
  
  /**
   * Play notification sound
   */
  playNotificationSound() {
    if (typeof Audio !== 'undefined') {
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignore audio play errors (e.g., user hasn't interacted yet)
        });
      } catch (error) {
        // Ignore audio errors
      }
    }
  }
  
  /**
   * Save pending changes
   */
  savePendingChanges() {
    // Implement pending changes saving logic
    console.log('Saving pending changes...');
  }
  
  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges() {
    // Implement unsaved changes detection logic
    return false;
  }
  
  /**
   * Close all dropdowns
   */
  closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown-menu');
    dropdowns.forEach(dropdown => {
      dropdown.style.display = 'none';
    });
  }
  
  /**
   * Check if page is valid
   */
  isValidPage(page) {
    const validPages = [
      'dashboard',
      'agenda',
      'whatsapp',
      'patients',
      'invoices',
      'documents',
      'accounting',
      'legal',
      'users'
    ];
    
    return validPages.includes(page);
  }
  
  /**
   * Event emitter functionality
   */
  emit(event, data) {
    const eventListeners = this.observers.get(event) || [];
    eventListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
  
  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.observers.has(event)) {
      this.observers.set(event, []);
    }
    
    this.observers.get(event).push(callback);
  }
  
  /**
   * Remove event listener
   */
  off(event, callback) {
    const eventListeners = this.observers.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    }
  }
}

// Create global app instance
const app = new DentalCareApp();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
} else {
  window.DentalCareApp = app;
}

// Make app available globally
window.DentalCareApp = app;

// Add global styles for tooltips
if (!document.getElementById('tooltip-styles')) {
  const style = document.createElement('style');
  style.id = 'tooltip-styles';
  style.textContent = `
    .tooltip {
      position: fixed;
      background: #1f2937;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      z-index: 10000;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 5px solid #1f2937;
    }
  `;
  document.head.appendChild(style);
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // App is already initialized in constructor
  });
} else {
  // DOM is already ready
  // App is already initialized in constructor
}