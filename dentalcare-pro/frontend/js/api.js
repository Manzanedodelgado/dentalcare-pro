/**
 * DentalCare Pro - API Module
 * Handles all HTTP requests to the backend with error handling
 * Production-ready API client with interceptors and caching
 */

class APIClient {
  constructor() {
    this.baseURL = CONFIG.API_BASE_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Request interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    
    // Setup interceptors
    this.setupInterceptors();
    
    // Cache for GET requests
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }
  
  /**
   * Setup request and response interceptors
   */
  setupInterceptors() {
    // Request interceptor
    this.addRequestInterceptor((config) => {
      // Add auth token
      if (Auth && Auth.token) {
        config.headers.Authorization = `Bearer ${Auth.token}`;
      }
      
      // Add request ID for tracking
      config.headers['X-Request-ID'] = Utils.generateUUID();
      
      // Add timestamp
      config.metadata = { startTime: Date.now() };
      
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
      
      return config;
    });
    
    // Response interceptor
    this.addResponseInterceptor(
      (response) => {
        // Calculate request duration
        const duration = Date.now() - response.config.metadata.startTime;
        
        console.log(`API Response: ${response.status} ${response.config.url} (${duration}ms)`);
        
        // Handle successful responses
        if (response.status >= 200 && response.status < 300) {
          return response;
        }
        
        return response;
      },
      (error) => {
        // Handle errors
        const duration = error.config?.metadata?.startTime ? 
          Date.now() - error.config.metadata.startTime : 0;
        
        console.error(`API Error: ${error.response?.status || 'Unknown'} ${error.config?.url} (${duration}ms)`);
        
        // Handle specific error codes
        if (error.response?.status === 401) {
          // Unauthorized - try to refresh token
          if (Auth && Auth.token && !error.config.url.includes('/auth/login')) {
            console.warn('Unauthorized request, attempting token refresh');
            return Auth.refreshToken().then(refreshResult => {
              if (refreshResult.success) {
                // Retry original request with new token
                error.config.headers.Authorization = `Bearer ${Auth.token}`;
                return this.request(error.config);
              } else {
                // Refresh failed, redirect to login
                Auth.logout();
                window.location.href = '/';
                return Promise.reject(error);
              }
            });
          } else {
            // No auth or already on login page
            if (!window.location.pathname.includes('/login')) {
              Auth.logout();
              window.location.href = '/';
            }
          }
        } else if (error.response?.status === 403) {
          // Forbidden - user lacks permission
          this.showNotification('No tienes permisos para realizar esta acción', 'error');
        } else if (error.response?.status >= 500) {
          // Server error
          this.showNotification('Error del servidor. Inténtalo más tarde.', 'error');
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }
  
  /**
   * Add response interceptor
   */
  addResponseInterceptor(successInterceptor, errorInterceptor) {
    this.responseInterceptors.push({
      success: successInterceptor,
      error: errorInterceptor
    });
  }
  
  /**
   * Execute request with interceptors
   */
  async executeRequest(config) {
    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }
    
    try {
      // Make the request
      const response = await fetch(config.url, config);
      
      // Create response object
      const responseData = await response.json().catch(() => ({}));
      
      const apiResponse = {
        success: response.ok,
        status: response.status,
        data: responseData.data || responseData,
        message: responseData.message,
        errors: responseData.errors,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        const result = interceptor.success(apiResponse);
        if (result !== undefined) {
          apiResponse = result;
        }
      }
      
      return apiResponse;
      
    } catch (error) {
      // Apply error interceptors
      const errorConfig = { ...config };
      errorConfig.metadata = config.metadata;
      
      const enhancedError = {
        ...error,
        config: errorConfig,
        response: error.response
      };
      
      for (const interceptor of this.responseInterceptors) {
        const result = interceptor.error(enhancedError);
        if (result !== undefined) {
          throw result;
        }
      }
      
      throw enhancedError;
    }
  }
  
  /**
   * Build request URL
   */
  buildURL(endpoint, params = {}) {
    let url = `${this.baseURL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    // Add query parameters
    if (Object.keys(params).length > 0) {
      const queryString = Utils.objectToQueryString(params);
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
    
    return url;
  }
  
  /**
   * Build request config
   */
  buildRequestConfig(method, data = null, options = {}) {
    const config = {
      method: method.toUpperCase(),
      headers: { ...this.defaultHeaders },
      ...options
    };
    
    // Add body for non-GET requests
    if (data && method.toUpperCase() !== 'GET') {
      if (data instanceof FormData) {
        // Don't set Content-Type for FormData (browser sets it with boundary)
        delete config.headers['Content-Type'];
        config.body = data;
      } else {
        config.body = JSON.stringify(data);
      }
    }
    
    return config;
  }
  
  /**
   * Generic request method
   */
  async request(endpoint, method = 'GET', data = null, params = {}, options = {}) {
    const url = this.buildURL(endpoint, params);
    const config = this.buildRequestConfig(method, data, options);
    
    return await this.executeRequest({ url, ...config });
  }
  
  /**
   * GET request with caching
   */
  async get(endpoint, params = {}, options = {}) {
    const cacheKey = `${endpoint}?${JSON.stringify(params)}`;
    
    // Check cache for GET requests (if not explicitly disabled)
    if (options.cache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        console.log(`Returning cached response for: ${endpoint}`);
        return cached.data;
      }
    }
    
    const response = await this.request(endpoint, 'GET', null, params, options);
    
    // Cache successful GET responses
    if (options.cache !== false && response.success) {
      this.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
    }
    
    return response;
  }
  
  /**
   * POST request
   */
  async post(endpoint, data = {}, params = {}, options = {}) {
    return await this.request(endpoint, 'POST', data, params, options);
  }
  
  /**
   * PUT request
   */
  async put(endpoint, data = {}, params = {}, options = {}) {
    return await this.request(endpoint, 'PUT', data, params, options);
  }
  
  /**
   * PATCH request
   */
  async patch(endpoint, data = {}, params = {}, options = {}) {
    return await this.request(endpoint, 'PATCH', data, params, options);
  }
  
  /**
   * DELETE request
   */
  async delete(endpoint, params = {}, options = {}) {
    return await this.request(endpoint, 'DELETE', null, params, options);
  }
  
  /**
   * Upload file
   */
  async upload(endpoint, file, data = {}, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional form data
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });
    
    return await this.request(endpoint, 'POST', formData, {}, options);
  }
  
  /**
   * Download file
   */
  async download(endpoint, params = {}, filename = null) {
    const url = this.buildURL(endpoint, params);
    const config = this.buildRequestConfig('GET', null, {
      responseType: 'blob',
      headers: {
        ...this.defaultHeaders,
        ...(Auth.token ? { Authorization: `Bearer ${Auth.token}` } : {})
      }
    });
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const downloadFilename = filename || this.getFilenameFromResponse(response);
    
    Utils.downloadFile(blob, downloadFilename);
    
    return {
      success: true,
      filename: downloadFilename
    };
  }
  
  /**
   * Extract filename from response headers
   */
  getFilenameFromResponse(response) {
    const contentDisposition = response.headers.get('content-disposition');
    if (contentDisposition) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
      if (matches != null && matches[1]) {
        return matches[1].replace(/['"]/g, '');
      }
    }
    return 'download';
  }
  
  /**
   * Clear API cache
   */
  clearCache() {
    this.cache.clear();
    console.log('API cache cleared');
  }
  
  /**
   * Show notification
   */
  showNotification(message, type = 'info', duration = 5000) {
    if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show(message, type, duration);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
  
  // ===== AUTHENTICATION ENDPOINTS =====
  
  async login(email, password) {
    return await this.post('/auth/login', { email, password });
  }
  
  async register(userData) {
    return await this.post('/auth/register', userData);
  }
  
  async logout() {
    return await this.post('/auth/logout');
  }
  
  async refreshToken() {
    return await this.post('/auth/refresh');
  }
  
  async validateToken() {
    return await this.get('/auth/validate');
  }
  
  async changePassword(currentPassword, newPassword) {
    return await this.post('/auth/change-password', { currentPassword, newPassword });
  }
  
  async forgotPassword(email) {
    return await this.post('/auth/forgot-password', { email });
  }
  
  async resetPassword(token, newPassword) {
    return await this.post('/auth/reset-password', { token, newPassword });
  }
  
  async getProfile() {
    return await this.get('/auth/profile');
  }
  
  async updateProfile(profileData) {
    return await this.put('/auth/profile', profileData);
  }
  
  // ===== APPOINTMENT ENDPOINTS =====
  
  async getAppointments(params = {}) {
    return await this.get('/agenda', params);
  }
  
  async getAppointment(id) {
    return await this.get(`/agenda/${id}`);
  }
  
  async createAppointment(appointmentData) {
    return await this.post('/agenda', appointmentData);
  }
  
  async updateAppointment(id, appointmentData) {
    return await this.put(`/agenda/${id}`, appointmentData);
  }
  
  async deleteAppointment(id) {
    return await this.delete(`/agenda/${id}`);
  }
  
  async updateAppointmentState(id, state, lopdData = null) {
    return await this.patch(`/agenda/${id}/state`, { state, lopdData });
  }
  
  async confirmAppointment(id, lopdConsent = true) {
    return await this.patch(`/agenda/${id}/confirm`, { lopdConsent });
  }
  
  async getTodayAppointments() {
    return await this.get('/agenda/today');
  }
  
  async getUpcomingAppointments(days = 7) {
    return await this.get('/agenda/upcoming', { days });
  }
  
  // ===== PATIENT ENDPOINTS =====
  
  async getPatients(params = {}) {
    return await this.get('/patients', params);
  }
  
  async getPatient(id) {
    return await this.get(`/patients/${id}`);
  }
  
  async createPatient(patientData) {
    return await this.post('/patients', patientData);
  }
  
  async updatePatient(id, patientData) {
    return await this.put(`/patients/${id}`, patientData);
  }
  
  async deletePatient(id) {
    return await this.delete(`/patients/${id}`);
  }
  
  async searchPatients(query) {
    return await this.get('/patients/search', { q: query });
  }
  
  async getPatientHistory(id) {
    return await this.get(`/patients/${id}/history`);
  }
  
  async getPatientAppointments(id) {
    return await this.get(`/patients/${id}/appointments`);
  }
  
  async getPatientInvoices(id) {
    return await this.get(`/patients/${id}/invoices`);
  }
  
  // ===== WHATSAPP ENDPOINTS =====
  
  async getConversations(params = {}) {
    return await this.get('/whatsapp/conversations', params);
  }
  
  async getConversation(id) {
    return await this.get(`/whatsapp/conversations/${id}`);
  }
  
  async sendMessage(data) {
    return await this.post('/whatsapp/messages', data);
  }
  
  async getMessages(conversationId, params = {}) {
    return await this.get(`/whatsapp/conversations/${conversationId}/messages`, params);
  }
  
  async markAsUrgent(messageId) {
    return await this.patch(`/whatsapp/messages/${messageId}/urgent`);
  }
  
  async getUrgentMessages() {
    return await this.get('/whatsapp/urgent');
  }
  
  async getUnreadCount() {
    return await this.get('/whatsapp/unread-count');
  }
  
  // ===== INVOICE ENDPOINTS =====
  
  async getInvoices(params = {}) {
    return await this.get('/invoices', params);
  }
  
  async getInvoice(id) {
    return await this.get(`/invoices/${id}`);
  }
  
  async createInvoice(invoiceData) {
    return await this.post('/invoices', invoiceData);
  }
  
  async updateInvoice(id, invoiceData) {
    return await this.put(`/invoices/${id}`, invoiceData);
  }
  
  async deleteInvoice(id) {
    return await this.delete(`/invoices/${id}`);
  }
  
  async generateInvoicePDF(id) {
    return await this.download(`/invoices/${id}/pdf`, {}, `factura-${id}.pdf`);
  }
  
  async sendInvoice(id, email) {
    return await this.post(`/invoices/${id}/send`, { email });
  }
  
  async getInvoiceStats(params = {}) {
    return await this.get('/invoices/stats', params);
  }
  
  // ===== DOCUMENT ENDPOINTS =====
  
  async getDocuments(params = {}) {
    return await this.get('/documents', params);
  }
  
  async getDocument(id) {
    return await this.get(`/documents/${id}`);
  }
  
  async uploadDocument(file, metadata = {}) {
    return await this.upload('/documents', file, metadata);
  }
  
  async updateDocument(id, metadata) {
    return await this.put(`/documents/${id}`, metadata);
  }
  
  async deleteDocument(id) {
    return await this.delete(`/documents/${id}`);
  }
  
  async downloadDocument(id) {
    return await this.download(`/documents/${id}/download`);
  }
  
  // ===== LEGAL/LOPD ENDPOINTS =====
  
  async getLegalDocuments() {
    return await this.get('/legal/documents');
  }
  
  async getComplianceStatus() {
    return await this.get('/legal/compliance');
  }
  
  async submitConsent(consentData) {
    return await this.post('/legal/consent', consentData);
  }
  
  async getConsentHistory(patientId) {
    return await this.get(`/legal/consent/${patientId}`);
  }
  
  async getQuestionnaire(patientId) {
    return await this.get(`/legal/questionnaire/${patientId}`);
  }
  
  async submitQuestionnaire(patientId, responses) {
    return await this.post(`/legal/questionnaire/${patientId}`, { responses });
  }
  
  async getAuditLog(params = {}) {
    return await this.get('/legal/audit', params);
  }
  
  async exportAuditLog(params = {}) {
    return await this.download('/legal/audit/export', params, 'audit-log.csv');
  }
  
  // ===== ACCOUNTING ENDPOINTS =====
  
  async getAccountingEntries(params = {}) {
    return await this.get('/accounting/entries', params);
  }
  
  async createAccountingEntry(entryData) {
    return await this.post('/accounting/entries', entryData);
  }
  
  async getBalanceSheet(params = {}) {
    return await this.get('/accounting/balance-sheet', params);
  }
  
  async getProfitLoss(params = {}) {
    return await this.get('/accounting/profit-loss', params);
  }
  
  async getCashFlow(params = {}) {
    return await this.get('/accounting/cash-flow', params);
  }
  
  async exportFinancialReport(type, params = {}) {
    return await this.download(`/accounting/export/${type}`, params, `${type}-report.xlsx`);
  }
  
  // ===== USER ENDPOINTS =====
  
  async getUsers(params = {}) {
    return await this.get('/users', params);
  }
  
  async getUser(id) {
    return await this.get(`/users/${id}`);
  }
  
  async createUser(userData) {
    return await this.post('/users', userData);
  }
  
  async updateUser(id, userData) {
    return await this.put(`/users/${id}`, userData);
  }
  
  async deleteUser(id) {
    return await this.delete(`/users/${id}`);
  }
  
  async updateUserRole(id, role) {
    return await this.patch(`/users/${id}/role`, { role });
  }
  
  async updateUserPermissions(id, permissions) {
    return await this.patch(`/users/${id}/permissions`, { permissions });
  }
  
  async getUserLogs(id, params = {}) {
    return await this.get(`/users/${id}/logs`, params);
  }
  
  // ===== DASHBOARD ENDPOINTS =====
  
  async getDashboardStats() {
    return await this.get('/dashboard/stats');
  }
  
  async getRecentActivity() {
    return await this.get('/dashboard/activity');
  }
  
  async getUrgentAlerts() {
    return await this.get('/dashboard/alerts');
  }
  
  async getSystemHealth() {
    return await this.get('/dashboard/health');
  }
}

// Create global API instance
const API = new APIClient();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
} else {
  window.API = API;
}

// Make API available globally
window.DentalCareAPI = API;