/**
 * DentalCare Pro - Configuration File
 * Configuration for the dental clinic management system
 * Production-ready configuration with environment handling
 */

// API Configuration
const CONFIG = {
  // Backend API URL
  API_BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://clinica-dental-backend.onrender.com/api' 
    : 'http://localhost:3000/api',
  
  // WebSocket Configuration
  WS_URL: process.env.NODE_ENV === 'production'
    ? 'https://clinica-dental-backend.onrender.com'
    : 'http://localhost:3000',
  
  // Database Configuration
  DATABASE: {
    SERVER: 'gabinete2\\box2',
    DATABASE: 'clinica-dental-db',
    TRUSTED_CONNECTION: true,
    OPTIONS: {
      encrypt: false,
      trustServerCertificate: true
    }
  },
  
  // JWT Configuration
  JWT: {
    SECRET: 'b79882e078a7911286b880690c51934c95174aacaa2fd718d9e71a0cb31cb27368884f152a567a1953de2cdbc977b783c17374a4977dae95653eccb86ec83812',
    EXPIRES_IN: '24h',
    REFRESH_EXPIRES_IN: '7d'
  },
  
  // Application Configuration
  APP: {
    NAME: 'DentalCare Pro',
    VERSION: '1.0.0',
    DESCRIPTION: 'Sistema Integral de Gestión Dental',
    AUTHOR: 'MiniMax Agent',
    CLINIC_NAME: 'Clínica Dental Rubio García',
    CUSTOM_DOMAIN: 'www.app.rubiogarciadental.com'
  },
  
  // WhatsApp Configuration
  WHATSAPP: {
    PHONE_NUMBER: '34664218253',
    BUSINESS_NAME: 'Clínica Dental Rubio García',
    VERIFY_TOKEN: 'dentalcare_whatsapp_verify_2025',
    ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || '',
    
    // Orange-coded urgent keywords (Spanish)
    URGENT_KEYWORDS: [
      'urgente',
      'dolor',
      'emergencia',
      'sangrado',
      'hinchazón',
      'infección',
      'rotura',
      'pérdida',
      'brotó',
      'duele mucho',
      'muy dolor',
      'boca abierta',
      'desprendimiento',
      'caída',
      'pérdida completa',
      'accidente',
      'golpe',
      'trauma',
      'fractura',
      'quema',
      'herida',
      'cicatrización',
      'sangra mucho',
      'se cae',
      'salió',
      'se romper',
      'muy mal'
    ],
    
    // Response templates
    RESPONSE_TEMPLATES: {
      URGENT_AUTO_REPLY: 'Gracias por contactarnos. Tu mensaje ha sido marcado como urgente y será atendido lo antes posible. Un dentista se pondrá en contacto contigo pronto.',
      APPOINTMENT_CONFIRMATION: 'Tu cita ha sido confirmada para el {date} a las {time}. Te enviaremos un recordatorio 24 horas antes.',
      APPOINTMENT_REMINDER: 'Recordatorio: Tienes una cita mañana a las {time}. Por favor, responde CONFIRMAR si puedes asistir.',
      LOPD_CONSENT: 'Según la LOPD, necesitamos tu consentimiento para procesar tus datos. ¿Deseas que continuemos con la atención?'
    }
  },
  
  // Appointment States (Spanish)
  APPOINTMENT_STATES: {
    PLANIFICADA: {
      code: 0,
      name: 'Planificada',
      description: 'Cita creada en la agenda',
      color: '#9CA3AF',
      requiresLOPD: false
    },
    CONFIRMADA: {
      code: 1,
      name: 'Confirmada',
      description: 'Confirmada por el paciente',
      color: '#10B981',
      requiresLOPD: false
    },
    ACEPTADA: {
      code: 2,
      name: 'Aceptada',
      description: 'LOPD consentida y aceptada',
      color: '#3B82F6',
      requiresLOPD: true
    },
    COMPLETADA: {
      code: 3,
      name: 'Completada',
      description: 'Tratamiento realizado',
      color: '#6366F1',
      requiresLOPD: false
    },
    CANCELADA: {
      code: 4,
      name: 'Cancelada',
      description: 'Cita cancelada',
      color: '#EF4444',
      requiresLOPD: false
    }
  },
  
  // User Roles (Spanish)
  USER_ROLES: {
    ADMIN: {
      id: 1,
      name: 'Administrador',
      permissions: ['all'],
      color: '#3B82F6'
    },
    DENTISTA: {
      id: 2,
      name: 'Dentista',
      permissions: [
        'view_patients',
        'edit_patients',
        'view_appointments',
        'edit_appointments',
        'view_invoices',
        'create_invoices',
        'view_legal',
        'manage_consents'
      ],
      color: '#10B981'
    },
    PERSONAL: {
      id: 3,
      name: 'Personal',
      permissions: [
        'view_patients',
        'view_appointments',
        'edit_appointments',
        'view_invoices',
        'view_legal'
      ],
      color: '#8B5CF6'
    },
    HIGIENISTA: {
      id: 4,
      name: 'Higienista',
      permissions: [
        'view_patients',
        'view_appointments',
        'view_legal'
      ],
      color: '#F59E0B'
    }
  },
  
  // Verifactu Configuration
  VERIFACTU: {
    ENABLED: true,
    TAX_RATE: 21, // IVA 21% (España)
    COMPANY_INFO: {
      NAME: 'Clínica Dental Rubio García',
      NIF: '12345678Z',
      ADDRESS: 'Calle Ejemplo 123, 28001 Madrid',
      CITY: 'Madrid',
      POSTAL_CODE: '28001',
      PROVINCE: 'Madrid',
      COUNTRY: 'ES'
    },
    SERIES: {
      INVOICE: 'A',
      RECEIPT: 'B',
      RECTIFICATION: 'R'
    }
  },
  
  // LOPD Configuration
  LOPD: {
    ENABLED: true,
    DATA_RETENTION_DAYS: 5 * 365, // 5 años
    COMPLIANCE_REQUIREMENTS: [
      'CONSENT_DOCUMENT',
      'DATA_PROCESSING_LOG',
      'PATIENT_RIGHT_EXERCISE',
      'BREACH_NOTIFICATION'
    ],
    LEGAL_BASIS: [
      'CONSENTIMIENTO',
      'CONTRATO',
      'OBLIGACIÓN_LEGAL',
      'INTERÉS_VITAL',
      'TAREA_PÚBLICA'
    ]
  },
  
  // File Upload Configuration
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ],
    UPLOAD_PATH: '/uploads/',
    TEMP_PATH: '/tmp/'
  },
  
  // Email Configuration
  EMAIL: {
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    SMTP_AUTH: {
      USER: 'info@rubiogarciadental.com',
      PASS: process.env.EMAIL_PASSWORD || ''
    },
    FROM: {
      NAME: 'Clínica Dental Rubio García',
      ADDRESS: 'info@rubiogarciadental.com'
    },
    TEMPLATES: {
      APPOINTMENT_REMINDER: 'appointment-reminder',
      LOPD_CONSENT: 'lopd-consent',
      PASSWORD_RESET: 'password-reset'
    }
  },
  
  // UI Configuration
  UI: {
    THEME: 'light',
    LANGUAGE: 'es',
    CURRENCY: 'EUR',
    DATE_FORMAT: 'DD/MM/YYYY',
    TIME_FORMAT: 'HH:mm',
    PAGINATION: {
      DEFAULT_PAGE_SIZE: 25,
      MAX_PAGE_SIZE: 100
    },
    NOTIFICATIONS: {
      AUTO_HIDE_DELAY: 5000,
      MAX_NOTIFICATIONS: 5
    },
    TOAST: {
      POSITION: 'top-right',
      DURATION: 3000,
      TYPES: ['success', 'error', 'warning', 'info']
    }
  },
  
  // Features Flags
  FEATURES: {
    WHATSAPP_INTEGRATION: true,
    VERIFACTU_INVOICING: true,
    LOPD_COMPLIANCE: true,
    AUTOMATION_ENGINE: true,
    ORANGE_CODING: true,
    SYNC_SQL_SERVER: true,
    PDF_GENERATION: true,
    EMAIL_NOTIFICATIONS: true,
    REAL_TIME_UPDATES: true,
    MOBILE_PWA: false
  },
  
  // Development Configuration
  DEBUG: process.env.NODE_ENV === 'development',
  
  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
    SKIP_SUCCESSFUL_REQUESTS: false
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'development') {
  CONFIG.API_BASE_URL = 'http://localhost:3000/api';
  CONFIG.WS_URL = 'http://localhost:3000';
  CONFIG.DEBUG = true;
} else if (process.env.NODE_ENV === 'production') {
  CONFIG.API_BASE_URL = 'https://clinica-dental-backend.onrender.com/api';
  CONFIG.WS_URL = 'https://clinica-dental-backend.onrender.com';
  CONFIG.DEBUG = false;
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}

// Make config available globally
window.DentalCareConfig = CONFIG;