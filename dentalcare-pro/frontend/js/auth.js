/**
 * DentalCare Pro - Authentication Module
 * Handles user authentication, JWT tokens, and session management
 * Production-ready authentication with security features
 */

class AuthManager {
  constructor() {
    this.tokenKey = 'dentalcare_auth_token';
    this.refreshTokenKey = 'dentalcare_refresh_token';
    this.userKey = 'dentalcare_user';
    this.sessionKey = 'dentalcare_session';
    this.tokenExpiryKey = 'dentalcare_token_expiry';
    
    this.currentUser = null;
    this.token = null;
    this.refreshToken = null;
    this.isAuthenticated = false;
    
    // Auto-refresh timer
    this.refreshTimer = null;
    this.refreshInterval = 10 * 60 * 1000; // 10 minutes
    
    // Initialize auth state
    this.initializeAuth();
    
    // Setup automatic token refresh
    this.setupAutoRefresh();
    
    // Listen for storage changes (for multi-tab sync)
    this.setupStorageListener();
  }
  
  /**
   * Initialize authentication state from storage
   */
  initializeAuth() {
    try {
      this.token = this.getStoredToken();
      this.refreshToken = this.getStoredRefreshToken();
      this.currentUser = this.getStoredUser();
      
      if (this.token && this.currentUser) {
        this.isAuthenticated = true;
        this.validateToken();
      }
      
      console.log('Auth initialized:', {
        isAuthenticated: this.isAuthenticated,
        hasToken: !!this.token,
        user: this.currentUser?.email
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      this.clearAuth();
    }
  }
  
  /**
   * Login with email and password
   */
  async login(email, password, rememberMe = false) {
    try {
      console.log('Attempting login for:', email);
      
      // Show loading state
      this.setLoadingState(true);
      
      // Make login request
      const response = await API.post('/auth/login', {
        email: email.trim(),
        password
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Error de autenticación');
      }
      
      const { user, token, refreshToken } = response.data;
      
      // Store tokens and user data
      this.storeAuthData({
        user,
        token,
        refreshToken,
        rememberMe
      });
      
      // Update current state
      this.currentUser = user;
      this.token = token;
      this.refreshToken = refreshToken;
      this.isAuthenticated = true;
      
      // Setup auto-refresh
      this.setupAutoRefresh();
      
      // Log successful login
      console.log('Login successful for:', user.email, 'Role:', user.role);
      
      // Emit auth event
      this.emitAuthEvent('login', { user });
      
      return {
        success: true,
        user,
        message: 'Autenticación exitosa'
      };
      
    } catch (error) {
      console.error('Login error:', error);
      
      const errorMessage = error.message || 'Error de conexión';
      
      // Emit auth error event
      this.emitAuthEvent('error', { error: errorMessage });
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      this.setLoadingState(false);
    }
  }
  
  /**
   * Register new user
   */
  async register(userData) {
    try {
      console.log('Attempting registration for:', userData.email);
      
      this.setLoadingState(true);
      
      const response = await API.post('/auth/register', {
        ...userData,
        email: userData.email.trim()
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Error en el registro');
      }
      
      const { user, token, refreshToken } = response.data;
      
      // Store auth data
      this.storeAuthData({
        user,
        token,
        refreshToken,
        rememberMe: false
      });
      
      this.currentUser = user;
      this.token = token;
      this.refreshToken = refreshToken;
      this.isAuthenticated = true;
      
      console.log('Registration successful for:', user.email);
      
      this.emitAuthEvent('register', { user });
      
      return {
        success: true,
        user,
        message: 'Registro exitoso'
      };
      
    } catch (error) {
      console.error('Registration error:', error);
      
      const errorMessage = error.message || 'Error en el registro';
      
      this.emitAuthEvent('error', { error: errorMessage });
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      this.setLoadingState(false);
    }
  }
  
  /**
   * Logout current user
   */
  async logout() {
    try {
      console.log('Logging out user:', this.currentUser?.email);
      
      // Call logout endpoint if token exists
      if (this.token) {
        try {
          await API.post('/auth/logout');
        } catch (error) {
          console.warn('Logout API call failed:', error);
        }
      }
      
      // Clear authentication data
      this.clearAuth();
      
      // Clear auto-refresh timer
      this.clearAutoRefresh();
      
      // Emit logout event
      this.emitAuthEvent('logout');
      
      console.log('Logout successful');
      
      return {
        success: true,
        message: 'Sesión cerrada correctamente'
      };
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if logout fails, clear local data
      this.clearAuth();
      this.clearAutoRefresh();
      
      return {
        success: true,
        message: 'Sesión cerrada'
      };
    }
  }
  
  /**
   * Refresh authentication token
   */
  async refreshToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      console.log('Refreshing authentication token');
      
      const response = await API.post('/auth/refresh', {
        refreshToken: this.refreshToken
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Error refreshing token');
      }
      
      const { token, refreshToken: newRefreshToken, user } = response.data;
      
      // Update stored tokens
      this.updateStoredTokens(token, newRefreshToken);
      
      this.token = token;
      this.refreshToken = newRefreshToken;
      
      if (user) {
        this.currentUser = user;
        this.updateStoredUser(user);
      }
      
      console.log('Token refreshed successfully');
      
      this.emitAuthEvent('tokenRefresh', { user: this.currentUser });
      
      return {
        success: true,
        token,
        user: this.currentUser
      };
      
    } catch (error) {
      console.error('Token refresh error:', error);
      
      // If refresh fails, logout user
      this.handleRefreshFailure();
      
      return {
        success: false,
        message: 'Sesión expirada, por favor inicie sesión nuevamente'
      };
    }
  }
  
  /**
   * Change user password
   */
  async changePassword(currentPassword, newPassword) {
    try {
      console.log('Changing password for user:', this.currentUser?.email);
      
      this.setLoadingState(true);
      
      const response = await API.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Error cambiando contraseña');
      }
      
      console.log('Password changed successfully');
      
      this.emitAuthEvent('passwordChanged');
      
      return {
        success: true,
        message: 'Contraseña actualizada correctamente'
      };
      
    } catch (error) {
      console.error('Password change error:', error);
      
      const errorMessage = error.message || 'Error cambiando contraseña';
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      this.setLoadingState(false);
    }
  }
  
  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    try {
      console.log('Requesting password reset for:', email);
      
      this.setLoadingState(true);
      
      const response = await API.post('/auth/forgot-password', {
        email: email.trim()
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Error solicitando recuperación');
      }
      
      console.log('Password reset requested successfully');
      
      return {
        success: true,
        message: 'Instrucciones de recuperación enviadas a tu email'
      };
      
    } catch (error) {
      console.error('Password reset request error:', error);
      
      const errorMessage = error.message || 'Error solicitando recuperación';
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      this.setLoadingState(false);
    }
  }
  
  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    try {
      console.log('Resetting password with token');
      
      this.setLoadingState(true);
      
      const response = await API.post('/auth/reset-password', {
        token,
        newPassword
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Error restableciendo contraseña');
      }
      
      console.log('Password reset successfully');
      
      return {
        success: true,
        message: 'Contraseña restablecida correctamente'
      };
      
    } catch (error) {
      console.error('Password reset error:', error);
      
      const errorMessage = error.message || 'Error restableciendo contraseña';
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      this.setLoadingState(false);
    }
  }
  
  /**
   * Get current user profile
   */
  async getProfile() {
    try {
      const response = await API.get('/auth/profile');
      
      if (response.success) {
        this.currentUser = response.data;
        this.updateStoredUser(response.data);
        this.emitAuthEvent('profileUpdated', { user: response.data });
      }
      
      return response;
      
    } catch (error) {
      console.error('Profile fetch error:', error);
      return {
        success: false,
        message: 'Error obteniendo perfil de usuario'
      };
    }
  }
  
  /**
   * Update user profile
   */
  async updateProfile(profileData) {
    try {
      console.log('Updating profile for user:', this.currentUser?.email);
      
      this.setLoadingState(true);
      
      const response = await API.put('/auth/profile', profileData);
      
      if (response.success) {
        this.currentUser = response.data;
        this.updateStoredUser(response.data);
        
        this.emitAuthEvent('profileUpdated', { user: response.data });
        
        console.log('Profile updated successfully');
      }
      
      return response;
      
    } catch (error) {
      console.error('Profile update error:', error);
      
      const errorMessage = error.message || 'Error actualizando perfil';
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      this.setLoadingState(false);
    }
  }
  
  /**
   * Check if user has specific permission
   */
  hasPermission(permission) {
    if (!this.isAuthenticated || !this.currentUser) {
      return false;
    }
    
    // Admin has all permissions
    if (this.currentUser.role === 'ADMIN' || 
        this.currentUser.permissions?.includes('all')) {
      return true;
    }
    
    // Check specific permissions
    return this.currentUser.permissions?.includes(permission) || false;
  }
  
  /**
   * Check if user has specific role
   */
  hasRole(role) {
    if (!this.isAuthenticated || !this.currentUser) {
      return false;
    }
    
    return this.currentUser.role === role;
  }
  
  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles) {
    if (!this.isAuthenticated || !this.currentUser) {
      return false;
    }
    
    return roles.includes(this.currentUser.role);
  }
  
  /**
   * Validate current token
   */
  async validateToken() {
    if (!this.token) {
      return false;
    }
    
    try {
      const response = await API.get('/auth/validate');
      
      if (response.success) {
        // Update user data if needed
        if (response.data?.user) {
          this.currentUser = response.data.user;
          this.updateStoredUser(response.data.user);
        }
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.warn('Token validation failed:', error);
      
      // Try to refresh token
      if (error.status === 401) {
        return await this.refreshToken().then(result => result.success);
      }
      
      return false;
    }
  }
  
  /**
   * Get stored authentication token
   */
  getStoredToken() {
    return Utils.storage.get(this.tokenKey);
  }
  
  /**
   * Get stored refresh token
   */
  getStoredRefreshToken() {
    return Utils.storage.get(this.refreshTokenKey);
  }
  
  /**
   * Get stored user data
   */
  getStoredUser() {
    return Utils.storage.get(this.userKey);
  }
  
  /**
   * Store authentication data
   */
  storeAuthData({ user, token, refreshToken, rememberMe }) {
    // Store with expiry based on remember me preference
    const expiry = rememberMe ? 
      Date.now() + (30 * 24 * 60 * 60 * 1000) : // 30 days
      Date.now() + (24 * 60 * 60 * 1000); // 1 day
    
    Utils.storage.set(this.tokenKey, token);
    Utils.storage.set(this.refreshTokenKey, refreshToken);
    Utils.storage.set(this.userKey, user);
    Utils.storage.set(this.tokenExpiryKey, expiry);
    
    // Store session data
    Utils.session.set(this.sessionKey, {
      userId: user.id,
      loginTime: Date.now(),
      lastActivity: Date.now()
    });
  }
  
  /**
   * Update stored tokens
   */
  updateStoredTokens(token, refreshToken) {
    Utils.storage.set(this.tokenKey, token);
    Utils.storage.set(this.refreshTokenKey, refreshToken);
  }
  
  /**
   * Update stored user data
   */
  updateStoredUser(user) {
    Utils.storage.set(this.userKey, user);
  }
  
  /**
   * Clear all authentication data
   */
  clearAuth() {
    this.token = null;
    this.refreshToken = null;
    this.currentUser = null;
    this.isAuthenticated = false;
    
    Utils.storage.remove(this.tokenKey);
    Utils.storage.remove(this.refreshTokenKey);
    Utils.storage.remove(this.userKey);
    Utils.storage.remove(this.tokenExpiryKey);
    Utils.storage.remove(this.sessionKey);
    Utils.session.remove(this.sessionKey);
  }
  
  /**
   * Setup automatic token refresh
   */
  setupAutoRefresh() {
    this.clearAutoRefresh();
    
    if (!this.isAuthenticated || !this.refreshToken) {
      return;
    }
    
    this.refreshTimer = setInterval(async () => {
      if (this.isAuthenticated) {
        await this.refreshToken();
      }
    }, this.refreshInterval);
  }
  
  /**
   * Clear automatic token refresh
   */
  clearAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  
  /**
   * Handle refresh token failure
   */
  handleRefreshFailure() {
    console.warn('Token refresh failed, logging out user');
    
    this.clearAuth();
    this.clearAutoRefresh();
    
    this.emitAuthEvent('logout', { reason: 'token_expired' });
  }
  
  /**
   * Setup storage listener for multi-tab sync
   */
  setupStorageListener() {
    window.addEventListener('storage', (event) => {
      if (event.key === this.tokenKey) {
        // Token changed in another tab
        if (!event.newValue) {
          // Token removed - logout
          this.clearAuth();
          this.emitAuthEvent('logout', { reason: 'token_removed' });
        } else {
          // Token updated - validate
          this.token = event.newValue;
          this.validateToken();
        }
      } else if (event.key === this.userKey) {
        // User data changed in another tab
        if (event.newValue) {
          this.currentUser = JSON.parse(event.newValue);
          this.isAuthenticated = true;
          this.emitAuthEvent('profileUpdated', { user: this.currentUser });
        }
      }
    });
  }
  
  /**
   * Set loading state for auth operations
   */
  setLoadingState(loading) {
    const loginBtn = document.getElementById('login-btn');
    const loginForm = document.getElementById('login-form');
    
    if (loginBtn) {
      const btnText = loginBtn.querySelector('.btn-text');
      const btnSpinner = loginBtn.querySelector('.btn-spinner');
      
      if (loading) {
        loginBtn.disabled = true;
        if (btnText) btnText.style.opacity = '0';
        if (btnSpinner) btnSpinner.classList.remove('hidden');
      } else {
        loginBtn.disabled = false;
        if (btnText) btnText.style.opacity = '1';
        if (btnSpinner) btnSpinner.classList.add('hidden');
      }
    }
    
    if (loginForm) {
      if (loading) {
        loginForm.classList.add('login-loading');
      } else {
        loginForm.classList.remove('login-loading');
      }
    }
  }
  
  /**
   * Emit authentication events
   */
  emitAuthEvent(eventName, data = {}) {
    const event = new CustomEvent(`auth:${eventName}`, { detail: data });
    window.dispatchEvent(event);
  }
  
  /**
   * Get current authentication status
   */
  getAuthStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      currentUser: this.currentUser,
      token: this.token,
      hasValidToken: !!this.token,
      permissions: this.currentUser?.permissions || [],
      role: this.currentUser?.role
    };
  }
}

// Create global auth instance
const Auth = new AuthManager();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
} else {
  window.Auth = Auth;
}

// Make auth available globally
window.DentalCareAuth = Auth;