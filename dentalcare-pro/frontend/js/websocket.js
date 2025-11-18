/**
 * DentalCare Pro - WebSocket Module
 * Handles real-time communication for urgent messages and live updates
 * Production-ready WebSocket client with reconnection and event handling
 */

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.url = CONFIG.WS_URL;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.pingInterval = null;
    this.pingTimeout = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.shouldReconnect = true;
    
    // Event listeners
    this.eventListeners = new Map();
    
    // Connection status callback
    this.onConnectionStatusChange = null;
    
    // Initialize connection
    this.connect();
    
    // Setup visibility change handler
    this.setupVisibilityChange();
  }
  
  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.isConnected || this.isConnecting) {
      return;
    }
    
    if (!Auth.isAuthenticated) {
      console.log('Cannot connect: User not authenticated');
      return;
    }
    
    try {
      this.isConnecting = true;
      this.updateConnectionStatus('connecting');
      
      console.log(`Connecting to WebSocket: ${this.url}`);
      
      // Add auth token to connection
      const wsUrl = this.url.replace('http', 'ws') + 
        `?token=${Auth.token}&userId=${Auth.currentUser?.id}`;
      
      this.ws = new WebSocket(wsUrl);
      
      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.isConnecting) {
          this.handleConnectionError('Connection timeout');
        }
      }, 10000); // 10 second timeout
      
      // Connection event handlers
      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket connected');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        
        this.updateConnectionStatus('connected');
        
        // Start ping interval
        this.startPing();
        
        // Emit connection event
        this.emit('connected', {
          timestamp: new Date().toISOString()
        });
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket disconnected:', event.code, event.reason);
        
        this.isConnected = false;
        this.isConnecting = false;
        
        this.stopPing();
        this.updateConnectionStatus('disconnected');
        
        // Emit disconnect event
        this.emit('disconnected', {
          code: event.code,
          reason: event.reason,
          timestamp: new Date().toISOString()
        });
        
        // Attempt reconnection if not intentionally closed
        if (this.shouldReconnect && event.code !== 1000) {
          this.attemptReconnect();
        }
      };
      
      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('WebSocket error:', error);
        this.handleConnectionError('WebSocket error');
      };
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleConnectionError(error.message);
    }
  }
  
  /**
   * Handle connection error
   */
  handleConnectionError(error) {
    this.isConnected = false;
    this.isConnecting = false;
    
    this.updateConnectionStatus('error');
    
    this.emit('error', {
      error,
      timestamp: new Date().toISOString()
    });
    
    if (this.shouldReconnect) {
      this.attemptReconnect();
    }
  }
  
  /**
   * Attempt to reconnect
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.updateConnectionStatus('failed');
      return;
    }
    
    this.reconnectAttempts++;
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms`);
    
    this.updateConnectionStatus('reconnecting', {
      attempt: this.reconnectAttempts,
      delay: this.reconnectDelay
    });
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
    
    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }
  
  /**
   * Disconnect WebSocket
   */
  disconnect() {
    this.shouldReconnect = false;
    
    this.stopPing();
    
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    
    this.updateConnectionStatus('disconnected');
    
    console.log('WebSocket disconnected by user');
  }
  
  /**
   * Send message to server
   */
  send(type, data = {}) {
    if (!this.isConnected || !this.ws) {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }
    
    try {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString(),
        userId: Auth.currentUser?.id
      };
      
      this.ws.send(JSON.stringify(message));
      console.log('WebSocket message sent:', type);
      return true;
      
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }
  
  /**
   * Handle incoming message
   */
  handleMessage(message) {
    const { type, data, timestamp } = message;
    
    console.log('WebSocket message received:', type);
    
    // Handle different message types
    switch (type) {
      case 'urgent_message':
        this.handleUrgentMessage(data);
        break;
        
      case 'appointment_update':
        this.handleAppointmentUpdate(data);
        break;
        
      case 'appointment_created':
        this.handleAppointmentCreated(data);
        break;
        
      case 'appointment_cancelled':
        this.handleAppointmentCancelled(data);
        break;
        
      case 'patient_update':
        this.handlePatientUpdate(data);
        break;
        
      case 'invoice_update':
        this.handleInvoiceUpdate(data);
        break;
        
      case 'system_notification':
        this.handleSystemNotification(data);
        break;
        
      case 'pong':
        this.handlePong();
        break;
        
      case 'user_online':
        this.handleUserOnline(data);
        break;
        
      case 'user_offline':
        this.handleUserOffline(data);
        break;
        
      default:
        console.log('Unknown WebSocket message type:', type);
        this.emit(type, data);
    }
    
    // Emit generic message event
    this.emit('message', { type, data, timestamp });
  }
  
  /**
   * Handle urgent message
   */
  handleUrgentMessage(data) {
    console.log('Urgent message received:', data);
    
    // Show urgent notification
    this.showUrgentNotification(data);
    
    // Update urgent indicator
    this.updateUrgentIndicator();
    
    // Emit event
    this.emit('urgent_message', data);
    
    // If on WhatsApp page, update the conversation
    if (typeof WhatsApp !== 'undefined' && WhatsApp.updateConversation) {
      WhatsApp.updateConversation(data.conversationId);
    }
  }
  
  /**
   * Handle appointment update
   */
  handleAppointmentUpdate(data) {
    console.log('Appointment updated:', data);
    
    // Update agenda if visible
    if (typeof Agenda !== 'undefined' && Agenda.refresh) {
      Agenda.refresh();
    }
    
    // Update dashboard if visible
    if (typeof Dashboard !== 'undefined' && Dashboard.refresh) {
      Dashboard.refresh();
    }
    
    this.emit('appointment_update', data);
  }
  
  /**
   * Handle appointment created
   */
  handleAppointmentCreated(data) {
    console.log('New appointment created:', data);
    
    // Show notification
    this.showNotification('Nueva cita creada', 'info');
    
    // Update relevant interfaces
    if (typeof Agenda !== 'undefined' && Agenda.refresh) {
      Agenda.refresh();
    }
    
    this.emit('appointment_created', data);
  }
  
  /**
   * Handle appointment cancelled
   */
  handleAppointmentCancelled(data) {
    console.log('Appointment cancelled:', data);
    
    // Show notification
    this.showNotification('Cita cancelada', 'warning');
    
    // Update interfaces
    if (typeof Agenda !== 'undefined' && Agenda.refresh) {
      Agenda.refresh();
    }
    
    this.emit('appointment_cancelled', data);
  }
  
  /**
   * Handle patient update
   */
  handlePatientUpdate(data) {
    console.log('Patient updated:', data);
    
    // Update patients interface
    if (typeof Patients !== 'undefined' && Patients.refresh) {
      Patients.refresh();
    }
    
    this.emit('patient_update', data);
  }
  
  /**
   * Handle invoice update
   */
  handleInvoiceUpdate(data) {
    console.log('Invoice updated:', data);
    
    // Update invoices interface
    if (typeof Invoices !== 'undefined' && Invoices.refresh) {
      Invoices.refresh();
    }
    
    this.emit('invoice_update', data);
  }
  
  /**
   * Handle system notification
   */
  handleSystemNotification(data) {
    console.log('System notification:', data);
    
    this.showNotification(data.message, data.type || 'info');
    
    this.emit('system_notification', data);
  }
  
  /**
   * Handle pong response
   */
  handlePong() {
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
  }
  
  /**
   * Handle user online
   */
  handleUserOnline(data) {
    console.log('User online:', data);
    this.emit('user_online', data);
  }
  
  /**
   * Handle user offline
   */
  handleUserOffline(data) {
    console.log('User offline:', data);
    this.emit('user_offline', data);
  }
  
  /**
   * Start ping interval
   */
  startPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.send('ping');
        
        // Set timeout for pong response
        this.pingTimeout = setTimeout(() => {
          console.warn('Ping timeout - connection may be lost');
          this.handleConnectionError('Ping timeout');
        }, 5000); // 5 second timeout
      }
    }, 30000); // Ping every 30 seconds
  }
  
  /**
   * Stop ping interval
   */
  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
  }
  
  /**
   * Setup visibility change handler
   */
  setupVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, reduce activity
        console.log('Page hidden - reducing WebSocket activity');
      } else {
        // Page is visible, ensure connection is active
        console.log('Page visible - ensuring WebSocket connection');
        if (!this.isConnected && !this.isConnecting && this.shouldReconnect) {
          this.connect();
        }
      }
    });
  }
  
  /**
   * Update connection status indicator
   */
  updateConnectionStatus(status, details = {}) {
    console.log(`WebSocket status: ${status}`, details);
    
    // Update DOM indicator
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.className = `status-indicator ${status}`;
    }
    
    // Call connection status callback
    if (this.onConnectionStatusChange) {
      this.onConnectionStatusChange(status, details);
    }
    
    // Emit connection status event
    this.emit('connection_status', { status, details });
  }
  
  /**
   * Update urgent indicator
   */
  updateUrgentIndicator() {
    const urgentCount = document.getElementById('urgent-count');
    const urgentBtn = document.getElementById('urgent-btn');
    
    // Fetch current urgent count
    API.getUrgentCount().then(response => {
      if (response.success) {
        const count = response.data?.count || 0;
        
        if (urgentCount) {
          urgentCount.textContent = count;
          urgentCount.classList.toggle('hidden', count === 0);
        }
        
        if (urgentBtn) {
          urgentBtn.classList.toggle('has-urgent', count > 0);
        }
      }
    }).catch(error => {
      console.warn('Failed to update urgent count:', error);
    });
  }
  
  /**
   * Show urgent notification
   */
  showUrgentNotification(data) {
    const message = data.preview || data.message || 'Mensaje urgente recibido';
    
    // Show toast notification
    this.showNotification(message, 'urgent', 10000); // 10 seconds for urgent
    
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification('Mensaje Urgente - DentalCare Pro', {
        body: message,
        icon: '/images/logo.png',
        tag: 'urgent-message',
        requireInteraction: true
      });
    }
  }
  
  /**
   * Show general notification
   */
  showNotification(message, type = 'info', duration = 5000) {
    if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show(message, type, duration);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
  
  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }
  
  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }
  
  /**
   * Emit event
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket event listener:', error);
        }
      });
    }
  }
  
  /**
   * Set connection status change callback
   */
  setConnectionStatusCallback(callback) {
    this.onConnectionStatusChange = callback;
  }
  
  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      shouldReconnect: this.shouldReconnect
    };
  }
  
  /**
   * Request browser notification permission
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    this.disconnect();
    this.eventListeners.clear();
    this.shouldReconnect = false;
  }
}

// Create global WebSocket manager instance
const WebSocket = new WebSocketManager();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebSocket;
} else {
  window.WebSocketManager = WebSocket;
}

// Make WebSocket available globally
window.DentalCareWebSocket = WebSocket;

// Request notification permission on load
WebSocket.requestNotificationPermission();

// Listen for auth events to manage connection
window.addEventListener('auth:login', () => {
  WebSocket.connect();
});

window.addEventListener('auth:logout', () => {
  WebSocket.disconnect();
});

window.addEventListener('auth:tokenRefresh', () => {
  if (WebSocket.isConnected) {
    // Reconnect with new token
    WebSocket.disconnect();
    setTimeout(() => WebSocket.connect(), 1000);
  }
});