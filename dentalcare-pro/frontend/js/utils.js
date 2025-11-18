/**
 * DentalCare Pro - Utility Functions
 * Common utility functions for the dental clinic management system
 * Production-ready utility functions with error handling
 */

// Utility Functions
const Utils = {
  
  // Format currency
  formatCurrency(amount, currency = 'EUR') {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },
  
  // Format date
  formatDate(date, format = 'DD/MM/YYYY') {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    const formats = {
      'DD/MM/YYYY': `${day}/${month}/${year}`,
      'MM/DD/YYYY': `${month}/${day}/${year}`,
      'YYYY-MM-DD': `${year}-${month}-${day}`,
      'DD MMM YYYY': d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      'FULL_DATE': d.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
    
    return formats[format] || formats['DD/MM/YYYY'];
  },
  
  // Format time
  formatTime(date, format = 'HH:mm') {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    const formats = {
      'HH:mm': `${hours}:${minutes}`,
      'H:mm': `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`,
      'HH:mm:ss': `${hours}:${minutes}:${String(d.getSeconds()).padStart(2, '0')}`,
      'AM/PM': d.toLocaleTimeString('es-ES', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
    
    return formats[format] || formats['HH:mm'];
  },
  
  // Format datetime
  formatDateTime(date, format = 'DD/MM/YYYY HH:mm') {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return `${this.formatDate(d)} ${this.formatTime(d)}`;
  },
  
  // Generate UUID
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
  
  // Debounce function
  debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  },
  
  // Throttle function
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  // Sanitize HTML
  sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  },
  
  // Sanitize input
  sanitizeInput(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>\"']/g, (match) => {
      const map = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return map[match];
    });
  },
  
  // Validate email
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  // Validate phone number (Spanish)
  validatePhone(phone) {
    const re = /^(\+34|0034|34)?[6-9]\d{8}$/;
    return re.test(phone.replace(/\s/g, ''));
  },
  
  // Validate Spanish NIF/CIF
  validateNIF(nif) {
    if (!nif) return false;
    
    const dniRegex = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;
    const cifRegex = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/;
    
    return dniRegex.test(nif) || cifRegex.test(nif);
  },
  
  // Format Spanish phone number
  formatPhone(phone) {
    if (!phone) return '';
    
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.startsWith('34')) {
      return `+${cleaned}`;
    } else if (cleaned.length === 9) {
      return `+34${cleaned}`;
    }
    return phone;
  },
  
  // Format Spanish ID number
  formatNIF(nif) {
    if (!nif) return '';
    return nif.toUpperCase();
  },
  
  // Calculate age from birth date
  calculateAge(birthDate) {
    if (!birthDate) return 0;
    
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  },
  
  // Get age group
  getAgeGroup(age) {
    if (age === undefined || age === null) return 'Desconocida';
    if (age <= 18) return '0-18 años';
    if (age <= 35) return '19-35 años';
    if (age <= 60) return '36-60 años';
    return '60+ años';
  },
  
  // Truncate text
  truncateText(text, maxLength = 100, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + suffix;
  },
  
  // Capitalize first letter
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
  
  // Capitalize each word
  capitalizeWords(str) {
    if (!str) return '';
    return str.split(' ').map(word => this.capitalize(word)).join(' ');
  },
  
  // Remove accents
  removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  },
  
  // Search normalization
  normalizeSearch(str) {
    return this.removeAccents(str.toLowerCase().trim());
  },
  
  // Deep clone object
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  },
  
  // Merge objects
  mergeObjects(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();
    
    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.mergeObjects(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
    
    return this.mergeObjects(target, ...sources);
  },
  
  // Check if value is object
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  },
  
  // Check if object is empty
  isEmpty(obj) {
    return obj == null || Object.keys(obj).length === 0;
  },
  
  // Convert object to query string
  objectToQueryString(obj) {
    const params = new URLSearchParams();
    Object.keys(obj).forEach(key => {
      if (obj[key] !== null && obj[key] !== undefined) {
        params.append(key, obj[key]);
      }
    });
    return params.toString();
  },
  
  // Parse query string
  parseQueryString(queryString) {
    const params = new URLSearchParams(queryString);
    const result = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  },
  
  // Get file extension
  getFileExtension(filename) {
    if (!filename) return '';
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  },
  
  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  // Download file
  downloadFile(data, filename, mimeType = 'application/octet-stream') {
    const blob = new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  
  // Copy to clipboard
  async copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
  },
  
  // Generate random color
  generateColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
  },
  
  // Get contrast color
  getContrastColor(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  },
  
  // Sleep function
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  // Retry function
  async retry(fn, maxAttempts = 3, delay = 1000) {
    let lastError;
    for (let i = 1; i <= maxAttempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i === maxAttempts) break;
        await this.sleep(delay * i);
      }
    }
    throw lastError;
  },
  
  // Validate Spanish postal code
  validatePostalCode(postalCode) {
    const re = /^(?:0[1-9]|[1-4]\d|5[0-2])\d{3}$/;
    return re.test(postalCode);
  },
  
  // Get time until appointment
  getTimeUntilAppointment(appointmentDate) {
    if (!appointmentDate) return '';
    
    const now = new Date();
    const appointment = new Date(appointmentDate);
    const diff = appointment.getTime() - now.getTime();
    
    if (diff < 0) return 'Pasada';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `En ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `En ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `En ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'Ahora';
  },
  
  // Check if date is today
  isToday(date) {
    if (!date) return false;
    const today = new Date();
    const checkDate = new Date(date);
    return today.toDateString() === checkDate.toDateString();
  },
  
  // Check if date is tomorrow
  isTomorrow(date) {
    if (!date) return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkDate = new Date(date);
    return tomorrow.toDateString() === checkDate.toDateString();
  },
  
  // Get relative time
  getRelativeTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const target = new Date(date);
    const diff = now.getTime() - target.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (years > 0) return `hace ${years} año${years > 1 ? 's' : ''}`;
    if (months > 0) return `hace ${months} mes${months > 1 ? 'es' : ''}`;
    if (weeks > 0) return `hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'ahora mismo';
  },
  
  // Check if URL is valid
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  },
  
  // Get browser info
  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';
    
    if (ua.indexOf('Firefox') > -1) {
      browser = 'Firefox';
      version = ua.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (ua.indexOf('Chrome') > -1) {
      browser = 'Chrome';
      version = ua.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (ua.indexOf('Safari') > -1) {
      browser = 'Safari';
      version = ua.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (ua.indexOf('Edge') > -1) {
      browser = 'Edge';
      version = ua.match(/Edge\/([0-9.]+)/)?.[1] || 'Unknown';
    }
    
    return {
      browser,
      version,
      userAgent: ua,
      platform: navigator.platform,
      language: navigator.language
    };
  },
  
  // Check if mobile device
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  // Local storage helpers
  storage: {
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('Error storing data:', error);
        return false;
      }
    },
    
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.error('Error retrieving data:', error);
        return defaultValue;
      }
    },
    
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('Error removing data:', error);
        return false;
      }
    },
    
    clear() {
      try {
        localStorage.clear();
        return true;
      } catch (error) {
        console.error('Error clearing storage:', error);
        return false;
      }
    }
  },
  
  // Session storage helpers
  session: {
    set(key, value) {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('Error storing session data:', error);
        return false;
      }
    },
    
    get(key, defaultValue = null) {
      try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.error('Error retrieving session data:', error);
        return defaultValue;
      }
    },
    
    remove(key) {
      try {
        sessionStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('Error removing session data:', error);
        return false;
      }
    }
  }
};

// Export utils for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
} else {
  window.Utils = Utils;
}

// Make utils available globally
window.DentalCareUtils = Utils;