/**
 * DentalCare Pro - UI Components
 * Reusable UI components with Apple-inspired design
 * Production-ready components with accessibility and animations
 */

// Toast Notification System
class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = new Map();
    this.maxToasts = CONFIG.UI.NOTIFICATIONS.MAX_NOTIFICATIONS || 5;
    this.autoHideDelay = CONFIG.UI.NOTIFICATIONS.AUTO_HIDE_DELAY || 5000;
    
    this.init();
  }
  
  init() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
    
    // Add CSS if not exists
    if (!document.getElementById('toast-styles')) {
      this.addToastStyles();
    }
  }
  
  addToastStyles() {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        pointer-events: none;
      }
      
      .toast {
        pointer-events: auto;
        min-width: 320px;
        max-width: 400px;
        margin-bottom: 12px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border: 1px solid rgba(0, 0, 0, 0.1);
        padding: 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        transform: translateX(100%);
        animation: slideInRight 0.3s ease-out forwards;
      }
      
      .toast.removing {
        animation: slideOutRight 0.3s ease-in forwards;
      }
      
      .toast-icon {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 14px;
      }
      
      .toast-icon.success { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
      .toast-icon.error { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
      .toast-icon.warning { background: rgba(245, 158, 11, 0.1); color: #d97706; }
      .toast-icon.info { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
      .toast-icon.urgent { background: rgba(249, 115, 22, 0.1); color: #ea580c; }
      
      .toast-content {
        flex: 1;
        min-width: 0;
      }
      
      .toast-title {
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 4px;
      }
      
      .toast-message {
        font-size: 13px;
        color: #6b7280;
        line-height: 1.4;
      }
      
      .toast-close {
        width: 20px;
        height: 20px;
        border: none;
        background: none;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      
      .toast-close:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #374151;
      }
      
      @keyframes slideInRight {
        to { transform: translateX(0); }
      }
      
      @keyframes slideOutRight {
        to { transform: translateX(100%); opacity: 0; }
      }
      
      @media (max-width: 640px) {
        .toast-container {
          left: 16px;
          right: 16px;
        }
        
        .toast {
          min-width: auto;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  show(message, type = 'info', duration = this.autoHideDelay, title = null) {
    const id = Utils.generateUUID();
    
    const toast = {
      id,
      message,
      type,
      duration,
      title,
      element: null,
      timeout: null
    };
    
    this.toasts.set(id, toast);
    
    // Remove old toasts if exceeding max
    if (this.toasts.size > this.maxToasts) {
      const oldestToast = this.toasts.values().next().value;
      this.remove(oldestToast.id);
    }
    
    // Create toast element
    this.createToastElement(toast);
    
    // Auto-hide if duration > 0
    if (duration > 0) {
      toast.timeout = setTimeout(() => {
        this.remove(id);
      }, duration);
    }
    
    return id;
  }
  
  createToastElement(toast) {
    const toastElement = document.createElement('div');
    toastElement.className = `toast toast-${toast.type}`;
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      urgent: '🟠'
    };
    
    toastElement.innerHTML = `
      <div class="toast-icon ${toast.type}">
        ${icons[toast.type] || icons.info}
      </div>
      <div class="toast-content">
        ${toast.title ? `<div class="toast-title">${Utils.sanitizeHTML(toast.title)}</div>` : ''}
        <div class="toast-message">${Utils.sanitizeHTML(toast.message)}</div>
      </div>
      <button class="toast-close" aria-label="Cerrar notificación">×</button>
    `;
    
    // Add event listeners
    const closeBtn = toastElement.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.remove(toast.id));
    
    // Add hover pause for auto-hide
    let pauseTimeout;
    toastElement.addEventListener('mouseenter', () => {
      if (toast.timeout) {
        clearTimeout(toast.timeout);
      }
    });
    
    toastElement.addEventListener('mouseleave', () => {
      if (toast.duration > 0 && !toast.element?.classList.contains('removing')) {
        toast.timeout = setTimeout(() => {
          this.remove(toast.id);
        }, 2000); // 2 seconds after mouse leave
      }
    });
    
    toast.element = toastElement;
    this.container.appendChild(toastElement);
  }
  
  remove(id) {
    const toast = this.toasts.get(id);
    if (!toast) return;
    
    // Clear timeout
    if (toast.timeout) {
      clearTimeout(toast.timeout);
    }
    
    // Add removing class for animation
    if (toast.element) {
      toast.element.classList.add('removing');
      
      // Remove element after animation
      setTimeout(() => {
        if (toast.element && toast.element.parentNode) {
          toast.element.parentNode.removeChild(toast.element);
        }
      }, 300);
    }
    
    // Remove from map
    this.toasts.delete(id);
  }
  
  clear() {
    for (const toast of this.toasts.values()) {
      this.remove(toast.id);
    }
  }
  
  success(message, duration, title) {
    return this.show(message, 'success', duration, title);
  }
  
  error(message, duration, title) {
    return this.show(message, 'error', duration, title);
  }
  
  warning(message, duration, title) {
    return this.show(message, 'warning', duration, title);
  }
  
  info(message, duration, title) {
    return this.show(message, 'info', duration, title);
  }
  
  urgent(message, duration, title) {
    return this.show(message, 'urgent', duration, title);
  }
}

// Modal System
class ModalManager {
  constructor() {
    this.activeModals = new Set();
    this.init();
  }
  
  init() {
    // Add modal styles
    this.addModalStyles();
  }
  
  addModalStyles() {
    if (document.getElementById('modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.2s ease-out;
      }
      
      .modal {
        background: white;
        border-radius: 16px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        animation: scaleIn 0.2s ease-out;
      }
      
      .modal.large { max-width: 800px; }
      .modal.xlarge { max-width: 1200px; }
      .modal.full { max-width: 95vw; max-height: 95vh; }
      
      .modal-header {
        padding: 24px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
      }
      
      .modal-title {
        font-size: 18px;
        font-weight: 700;
        color: #1f2937;
        margin: 0;
      }
      
      .modal-close {
        width: 32px;
        height: 32px;
        border: none;
        background: none;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      
      .modal-close:hover {
        background: #f3f4f6;
        color: #374151;
      }
      
      .modal-content {
        padding: 24px;
        overflow-y: auto;
        max-height: calc(90vh - 200px);
      }
      
      .modal-footer {
        padding: 24px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        background: #f9fafb;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes scaleIn {
        from { 
          opacity: 0; 
          transform: scale(0.95); 
        }
        to { 
          opacity: 1; 
          transform: scale(1); 
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  show(content, options = {}) {
    const id = Utils.generateUUID();
    
    const modal = {
      id,
      content,
      options: {
        title: options.title || '',
        size: options.size || 'normal', // normal, large, xlarge, full
        closable: options.closable !== false,
        backdropClosable: options.backdropClosable !== false,
        onClose: options.onClose || null,
        ...options
      },
      element: null,
      overlay: null
    };
    
    this.createModalElement(modal);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    this.activeModals.add(modal);
    
    return id;
  }
  
  createModalElement(modal) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.dataset.modalId = modal.id;
    
    // Create modal
    const modalElement = document.createElement('div');
    modalElement.className = `modal ${modal.options.size}`;
    
    modalElement.innerHTML = `
      <div class="modal-header">
        ${modal.options.title ? `<h2 class="modal-title">${Utils.sanitizeHTML(modal.options.title)}</h2>` : ''}
        ${modal.options.closable ? '<button class="modal-close" aria-label="Cerrar modal">×</button>' : ''}
      </div>
      <div class="modal-content">
        ${typeof modal.content === 'string' ? modal.content : ''}
      </div>
      ${modal.options.footer ? '<div class="modal-footer"></div>' : ''}
    `;
    
    // Add content if it's a DOM element
    if (typeof modal.content !== 'string') {
      const contentContainer = modalElement.querySelector('.modal-content');
      contentContainer.appendChild(modal.content);
    }
    
    overlay.appendChild(modalElement);
    document.body.appendChild(overlay);
    
    // Store references
    modal.element = modalElement;
    modal.overlay = overlay;
    
    // Add event listeners
    if (modal.options.closable) {
      const closeBtn = modalElement.querySelector('.modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hide(modal.id));
      }
    }
    
    if (modal.options.backdropClosable) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.hide(modal.id);
        }
      });
    }
    
    // Add escape key handler
    this.addEscapeHandler(modal);
  }
  
  addEscapeHandler(modal) {
    const escapeHandler = (e) => {
      if (e.key === 'Escape' && this.activeModals.has(modal)) {
        this.hide(modal.id);
      }
    };
    
    document.addEventListener('keydown', escapeHandler);
    
    // Store handler for cleanup
    modal.escapeHandler = escapeHandler;
  }
  
  hide(id) {
    const modal = [...this.activeModals].find(m => m.id === id);
    if (!modal) return;
    
    // Call onClose callback
    if (modal.options.onClose) {
      modal.options.onClose();
    }
    
    // Remove escape handler
    if (modal.escapeHandler) {
      document.removeEventListener('keydown', modal.escapeHandler);
    }
    
    // Remove from active modals
    this.activeModals.delete(modal);
    
    // Remove from DOM with animation
    if (modal.overlay) {
      modal.overlay.style.animation = 'fadeOut 0.2s ease-in forwards';
      
      setTimeout(() => {
        if (modal.overlay.parentNode) {
          modal.overlay.parentNode.removeChild(modal.overlay);
        }
      }, 200);
    }
    
    // Restore body scroll if no more modals
    if (this.activeModals.size === 0) {
      document.body.style.overflow = '';
    }
  }
  
  hideAll() {
    for (const modal of [...this.activeModals]) {
      this.hide(modal.id);
    }
  }
  
  confirm(message, options = {}) {
    return new Promise((resolve) => {
      const content = document.createElement('div');
      content.innerHTML = `
        <p style="margin-bottom: 20px; color: #374151; line-height: 1.5;">${Utils.sanitizeHTML(message)}</p>
      `;
      
      const modalId = this.show(content, {
        title: options.title || 'Confirmación',
        size: 'normal'
      });
      
      // Add footer with buttons
      const modal = [...this.activeModals].find(m => m.id === modalId);
      if (modal && modal.element) {
        const footer = modal.element.querySelector('.modal-footer');
        if (footer) {
          footer.innerHTML = `
            <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
            <button class="btn btn-primary" data-action="confirm">${options.confirmText || 'Confirmar'}</button>
          `;
          
          footer.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            if (action === 'confirm') {
              resolve(true);
              this.hide(modalId);
            } else if (action === 'cancel') {
              resolve(false);
              this.hide(modalId);
            }
          });
        }
      }
    });
  }
  
  alert(message, options = {}) {
    return new Promise((resolve) => {
      const content = document.createElement('div');
      content.innerHTML = `
        <p style="margin-bottom: 20px; color: #374151; line-height: 1.5;">${Utils.sanitizeHTML(message)}</p>
      `;
      
      const modalId = this.show(content, {
        title: options.title || 'Información',
        size: 'normal'
      });
      
      // Add footer with OK button
      const modal = [...this.activeModals].find(m => m.id === modalId);
      if (modal && modal.element) {
        const footer = modal.element.querySelector('.modal-footer');
        if (footer) {
          footer.innerHTML = `
            <button class="btn btn-primary" data-action="ok">OK</button>
          `;
          
          footer.addEventListener('click', () => {
            resolve();
            this.hide(modalId);
          });
        }
      }
    });
  }
}

// Loading Spinner Component
class Spinner {
  static show(message = 'Cargando...', options = {}) {
    const spinner = document.createElement('div');
    spinner.className = 'loading-overlay';
    spinner.innerHTML = `
      <div class="loading-content">
        <div class="spinner"></div>
        ${message ? `<p class="loading-message">${Utils.sanitizeHTML(message)}</p>` : ''}
      </div>
    `;
    
    // Add styles if not exists
    if (!document.getElementById('spinner-styles')) {
      const style = document.createElement('style');
      style.id = 'spinner-styles';
      style.textContent = `
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        
        .loading-content {
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        
        .loading-message {
          margin-top: 16px;
          color: #6b7280;
          font-size: 14px;
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(spinner);
    
    return {
      element: spinner,
      hide: () => {
        if (spinner.parentNode) {
          spinner.parentNode.removeChild(spinner);
        }
      }
    };
  }
}

// Dropdown Component
class Dropdown {
  static create(trigger, content, options = {}) {
    const dropdown = {
      trigger,
      content,
      isOpen: false,
      options: {
        placement: options.placement || 'bottom', // bottom, top, left, right
        offset: options.offset || 8,
        closable: options.closable !== false,
        ...options
      },
      element: null
    };
    
    // Create dropdown element
    const dropdownElement = document.createElement('div');
    dropdownElement.className = 'dropdown-menu';
    dropdownElement.style.display = 'none';
    
    dropdownElement.appendChild(content.cloneNode(true));
    document.body.appendChild(dropdownElement);
    
    dropdown.element = dropdownElement;
    
    // Add event listeners
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.isOpen ? this.close(dropdown) : this.open(dropdown);
    });
    
    // Close on outside click
    if (dropdown.options.closable) {
      document.addEventListener('click', (e) => {
        if (!dropdown.element.contains(e.target) && !trigger.contains(e.target)) {
          this.close(dropdown);
        }
      });
    }
    
    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dropdown.isOpen) {
        this.close(dropdown);
        trigger.focus();
      }
    });
    
    return dropdown;
  }
  
  static open(dropdown) {
    if (dropdown.isOpen) return;
    
    dropdown.isOpen = true;
    dropdown.element.style.display = 'block';
    
    // Position dropdown
    this.position(dropdown);
    
    // Add open class
    dropdown.element.classList.add('show');
  }
  
  static close(dropdown) {
    if (!dropdown.isOpen) return;
    
    dropdown.isOpen = false;
    dropdown.element.classList.remove('show');
    
    setTimeout(() => {
      dropdown.element.style.display = 'none';
    }, 200);
  }
  
  static position(dropdown) {
    const triggerRect = dropdown.trigger.getBoundingClientRect();
    const contentRect = dropdown.element.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    let top = 0;
    let left = 0;
    
    switch (dropdown.options.placement) {
      case 'bottom':
        top = triggerRect.bottom + dropdown.options.offset;
        left = triggerRect.left;
        break;
      case 'top':
        top = triggerRect.top - contentRect.height - dropdown.options.offset;
        left = triggerRect.left;
        break;
      case 'left':
        top = triggerRect.top;
        left = triggerRect.left - contentRect.width - dropdown.options.offset;
        break;
      case 'right':
        top = triggerRect.top;
        left = triggerRect.right + dropdown.options.offset;
        break;
    }
    
    // Adjust for viewport boundaries
    if (left + contentRect.width > viewport.width) {
      left = viewport.width - contentRect.width - 8;
    }
    if (left < 8) {
      left = 8;
    }
    
    if (top + contentRect.height > viewport.height) {
      top = triggerRect.top - contentRect.height - dropdown.options.offset;
    }
    if (top < 8) {
      top = 8;
    }
    
    dropdown.element.style.top = `${top}px`;
    dropdown.element.style.left = `${left}px`;
  }
}

// Add dropdown styles
if (!document.getElementById('dropdown-styles')) {
  const style = document.createElement('style');
  style.id = 'dropdown-styles';
  style.textContent = `
    .dropdown-menu {
      position: fixed;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.1);
      min-width: 200px;
      z-index: 9997;
      opacity: 0;
      transform: translateY(-8px);
      transition: all 0.2s ease;
      pointer-events: none;
    }
    
    .dropdown-menu.show {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}

// Progress Bar Component
class ProgressBar {
  static create(container, options = {}) {
    const progress = document.createElement('div');
    progress.className = 'progress-bar';
    
    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    
    progress.appendChild(fill);
    container.appendChild(progress);
    
    const progressBar = {
      element: progress,
      fill,
      value: 0,
      max: options.max || 100,
      color: options.color || '#3b82f6'
    };
    
    // Apply options
    if (options.height) {
      progress.style.height = `${options.height}px`;
    }
    
    if (options.showPercentage !== false) {
      const label = document.createElement('div');
      label.className = 'progress-label';
      label.textContent = '0%';
      progress.appendChild(label);
      progressBar.label = label;
    }
    
    return progressBar;
  }
  
  static update(progressBar, value) {
    progressBar.value = Math.max(0, Math.min(value, progressBar.max));
    const percentage = (progressBar.value / progressBar.max) * 100;
    
    progressBar.fill.style.width = `${percentage}%`;
    progressBar.fill.style.backgroundColor = progressBar.color;
    
    if (progressBar.label) {
      progressBar.label.textContent = `${Math.round(percentage)}%`;
    }
  }
  
  static setColor(progressBar, color) {
    progressBar.color = color;
    progressBar.fill.style.backgroundColor = color;
  }
}

// Add progress bar styles
if (!document.getElementById('progress-styles')) {
  const style = document.createElement('style');
  style.id = 'progress-styles';
  style.textContent = `
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }
    
    .progress-fill {
      height: 100%;
      background: #3b82f6;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    
    .progress-label {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 12px;
      font-weight: 600;
      color: #374151;
    }
  `;
  document.head.appendChild(style);
}

// Create global instances
const Toast = new ToastManager();
const Modal = new ModalManager();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Toast,
    Modal,
    Spinner,
    Dropdown,
    ProgressBar
  };
} else {
  window.Toast = Toast;
  window.Modal = Modal;
  window.Spinner = Spinner;
  window.Dropdown = Dropdown;
  window.ProgressBar = ProgressBar;
}

// Make components available globally
window.DentalCareComponents = {
  Toast,
  Modal,
  Spinner,
  Dropdown,
  ProgressBar
};