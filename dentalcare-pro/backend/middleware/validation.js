/**
 * MIDDLEWARE DE VALIDACIÓN DE DATOS
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Validación de esquemas con Joi
 * - Validación de datos de entrada para todas las rutas
 * - Sanitización de inputs
 * - Validación específica por contexto
 * - Manejo de errores de validación
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const Joi = require('joi');
const logger = require('../utils/logger');

// ==============================================
// ESQUEMAS DE VALIDACIÓN
// ==============================================

// Esquema para login
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'El email debe tener un formato válido',
      'any.required': 'El email es requerido'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 6 caracteres',
      'any.required': 'La contraseña es requerida'
    })
});

// Esquema para registro
const registrationSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
      'any.required': 'El nombre es requerido'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'El email debe tener un formato válido',
      'any.required': 'El email es requerido'
    }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La contraseña debe contener al menos una minúscula, una mayúscula y un número',
      'any.required': 'La contraseña es requerida'
    }),
  role: Joi.string()
    .valid('admin', 'dentist', 'staff', 'hygienist')
    .required()
    .messages({
      'any.only': 'El rol debe ser: admin, dentist, staff o hygienist',
      'any.required': 'El rol es requerido'
    })
});

// Esquema para cambio de contraseña
const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña actual es requerida'
    }),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número',
      'any.required': 'La nueva contraseña es requerida'
    })
});

// Esquema para reset de contraseña
const resetPasswordSchema = Joi.object({
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La contraseña debe contener al menos una minúscula, una mayúscula y un número',
      'any.required': 'La contraseña es requerida'
    })
});

// Esquema para email
const emailSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'El email debe tener un formato válido',
      'any.required': 'El email es requerido'
    })
});

// Esquema para validación de fechas
const dateRangeSchema = Joi.object({
  dateFrom: Joi.date()
    .iso()
    .messages({
      'date.format': 'La fecha debe estar en formato ISO (YYYY-MM-DD)'
    }),
  dateTo: Joi.date()
    .iso()
    .greater(Joi.ref('dateFrom'))
    .messages({
      'date.format': 'La fecha debe estar en formato ISO (YYYY-MM-DD)',
      'date.greater': 'La fecha final debe ser posterior a la fecha inicial'
    })
});

// Esquema para paginación
const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'La página debe ser un número',
      'number.integer': 'La página debe ser un número entero',
      'number.min': 'La página debe ser mayor a 0'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'El límite debe ser un número',
      'number.integer': 'El límite debe ser un número entero',
      'number.min': 'El límite debe ser mayor a 0',
      'number.max': 'El límite no puede exceder 100'
    })
});

// ==============================================
// ESQUEMAS PARA CITAS Y AGENDA
// ==============================================

// Esquema para creación de cita
const appointmentCreationSchema = Joi.object({
  patientId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'El ID del paciente debe ser un UUID válido',
      'any.required': 'El ID del paciente es requerido'
    }),
  appointmentDate: Joi.date()
    .iso()
    .min('now')
    .required()
    .messages({
      'date.format': 'La fecha debe estar en formato ISO (YYYY-MM-DD)',
      'date.min': 'No se pueden crear citas en fechas pasadas',
      'any.required': 'La fecha de la cita es requerida'
    }),
  startTime: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      'string.pattern.base': 'La hora debe estar en formato HH:MM (24h)',
      'any.required': 'La hora de inicio es requerida'
    }),
  endTime: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      'string.pattern.base': 'La hora debe estar en formato HH:MM (24h)',
      'any.required': 'La hora de fin es requerida'
    }),
  treatmentType: Joi.string()
    .max(200)
    .allow('')
    .messages({
      'string.max': 'El tipo de tratamiento no puede exceder 200 caracteres'
    }),
  notes: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Las notas no pueden exceder 1000 caracteres'
    })
});

// Esquema para actualización de cita
const appointmentUpdateSchema = Joi.object({
  appointmentDate: Joi.date()
    .iso()
    .min('now')
    .messages({
      'date.format': 'La fecha debe estar en formato ISO (YYYY-MM-DD)',
      'date.min': 'No se pueden crear citas en fechas pasadas'
    }),
  startTime: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .messages({
      'string.pattern.base': 'La hora debe estar en formato HH:MM (24h)'
    }),
  endTime: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .messages({
      'string.pattern.base': 'La hora debe estar en formato HH:MM (24h)'
    }),
  treatmentType: Joi.string()
    .max(200)
    .allow('')
    .messages({
      'string.max': 'El tipo de tratamiento no puede exceder 200 caracteres'
    }),
  notes: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Las notas no pueden exceder 1000 caracteres'
    }),
  status: Joi.string()
    .valid('planificada', 'confirmada', 'aceptada', 'anulada')
    .messages({
      'any.only': 'El estado debe ser: planificada, confirmada, aceptada o anulada'
    })
});

// Esquema para cambio de estado
const statusChangeSchema = Joi.object({
  status: Joi.string()
    .valid('planificada', 'confirmada', 'aceptada', 'anulada')
    .required()
    .messages({
      'any.only': 'El estado debe ser: planificada, confirmada, aceptada o anulada',
      'any.required': 'El estado es requerido'
    }),
  reason: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'La razón no puede exceder 500 caracteres'
    })
});

// ==============================================
// ESQUEMAS PARA WHATSAPP Y COMUNICACIONES
// ==============================================

// Esquema para envío de mensajes
const messageSendSchema = Joi.object({
  conversationId: Joi.string()
    .uuid()
    .messages({
      'string.guid': 'El ID de conversación debe ser un UUID válido'
    }),
  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .messages({
      'string.pattern.base': 'El número de teléfono debe tener un formato internacional válido'
    }),
  message: Joi.string()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.min': 'El mensaje no puede estar vacío',
      'string.max': 'El mensaje no puede exceder 1000 caracteres',
      'any.required': 'El mensaje es requerido'
    }),
  messageType: Joi.string()
    .valid('text', 'image', 'document', 'audio')
    .default('text')
    .messages({
      'any.only': 'El tipo de mensaje debe ser: text, image, document o audio'
    })
}).with('phoneNumber', ['message'])
  .with('conversationId', ['message']);

// Esquema para marcado como urgente
const urgentMarkingSchema = Joi.object({
  urgencyLevel: Joi.string()
    .valid('orange', 'red')
    .required()
    .messages({
      'any.only': 'El nivel de urgencia debe ser: orange (urgente) o red (crítico)',
      'any.required': 'El nivel de urgencia es requerido'
    }),
  reason: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'La razón no puede exceder 500 caracteres'
    })
});

// ==============================================
// ESQUEMAS PARA AUTOMATIZACIONES
// ==============================================

// Esquema para ejecución de recordatorio
const reminderExecutionSchema = Joi.object({
  appointmentId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'El ID de la cita debe ser un UUID válido',
      'any.required': 'El ID de la cita es requerido'
    }),
  type: Joi.string()
    .valid('24h', '2h')
    .required()
    .messages({
      'any.only': 'El tipo debe ser: 24h o 2h',
      'any.required': 'El tipo de recordatorio es requerido'
    })
});

// Esquema para configuración de automatización
const automationConfigSchema = Joi.object({
  automationId: Joi.string()
    .required()
    .messages({
      'any.required': 'El ID de automatización es requerido'
    }),
  enabled: Joi.boolean()
    .required()
    .messages({
      'boolean': 'El campo enabled debe ser un valor booleano',
      'any.required': 'El estado habilitado es requerido'
    }),
  settings: Joi.object()
    .default({})
});

// Esquema para prueba de automatización
const automationTestSchema = Joi.object({
  type: Joi.string()
    .valid('reminder', 'consent', 'questionnaire')
    .required()
    .messages({
      'any.only': 'El tipo de prueba debe ser: reminder, consent o questionnaire',
      'any.required': 'El tipo de prueba es requerido'
    }),
  testData: Joi.object({
    patientName: Joi.string()
      .max(100)
      .allow(''),
    patientPhone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .allow(''),
    treatmentType: Joi.string()
      .max(200)
      .allow('')
  })
});

// ==============================================
// ESQUEMAS PARA DOCUMENTOS LEGALES
// ==============================================

// Esquema para documento legal
const documentSchema = Joi.object({
  patientId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'El ID del paciente debe ser un UUID válido',
      'any.required': 'El ID del paciente es requerido'
    }),
  documentType: Joi.string()
    .valid('consent_informed', 'lopd_privacy', 'treatment_consent', 'data_processing', 'financial_consent')
    .required()
    .messages({
      'any.only': 'El tipo de documento no es válido',
      'any.required': 'El tipo de documento es requerido'
    }),
  title: Joi.string()
    .max(200)
    .required()
    .messages({
      'string.max': 'El título no puede exceder 200 caracteres',
      'any.required': 'El título es requerido'
    }),
  content: Joi.string()
    .max(5000)
    .required()
    .messages({
      'string.max': 'El contenido no puede exceder 5000 caracteres',
      'any.required': 'El contenido es requerido'
    }),
  customFields: Joi.object()
    .default({})
});

// Esquema para cuestionario
const questionnaireSchema = Joi.object({
  name: Joi.string()
    .max(200)
    .required()
    .messages({
      'string.max': 'El nombre no puede exceder 200 caracteres',
      'any.required': 'El nombre es requerido'
    }),
  description: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'La descripción no puede exceder 500 caracteres'
    }),
  questions: Joi.array()
    .items(Joi.object({
      id: Joi.string(),
      question: Joi.string().required(),
      type: Joi.string().valid('text', 'textarea', 'checkbox', 'radio', 'select').required(),
      required: Joi.boolean().default(false),
      options: Joi.array().items(Joi.string())
    }))
    .min(1)
    .required()
    .messages({
      'array.min': 'Debe incluir al menos una pregunta',
      'any.required': 'Las preguntas son requeridas'
    })
});

// Esquema para envío de cumplimiento
const complianceSubmissionSchema = Joi.object({
  patientId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'El ID del paciente debe ser un UUID válido',
      'any.required': 'El ID del paciente es requerido'
    }),
  questionnaireId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'El ID del cuestionario debe ser un UUID válido',
      'any.required': 'El ID del cuestionario es requerido'
    }),
  answers: Joi.object()
    .required()
    .messages({
      'any.required': 'Las respuestas son requeridas'
    }),
  consentData: Joi.object({
    data_processing: Joi.boolean()
      .required()
      .messages({
        'any.required': 'Se requiere consentimiento para tratamiento de datos'
      }),
    communications: Joi.boolean()
      .required()
      .messages({
        'any.required': 'Se requiere consentimiento para comunicaciones'
      }),
    medical_records: Joi.boolean()
      .required()
      .messages({
        'any.required': 'Se requiere consentimiento para registros médicos'
      })
  }).required()
    .messages({
      'any.required': 'Los datos de consentimiento son requeridos'
    })
});

// ==============================================
// ESQUEMAS PARA USUARIOS
// ==============================================

// Esquema para creación de usuario
const userCreationSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
      'any.required': 'El nombre es requerido'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'El email debe tener un formato válido',
      'any.required': 'El email es requerido'
    }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La contraseña debe contener al menos una minúscula, una mayúscula y un número',
      'any.required': 'La contraseña es requerida'
    }),
  role: Joi.string()
    .valid('admin', 'dentist', 'staff', 'hygienist')
    .required()
    .messages({
      'any.only': 'El rol debe ser: admin, dentist, staff o hygienist',
      'any.required': 'El rol es requerido'
    }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .allow('')
    .messages({
      'string.pattern.base': 'El teléfono debe tener un formato internacional válido'
    }),
  permissions: Joi.array()
    .items(Joi.string())
    .default([])
});

// Esquema para actualización de usuario
const userUpdateSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres'
    }),
  email: Joi.string()
    .email()
    .messages({
      'string.email': 'El email debe tener un formato válido'
    }),
  role: Joi.string()
    .valid('admin', 'dentist', 'staff', 'hygienist')
    .messages({
      'any.only': 'El rol debe ser: admin, dentist, staff o hygienist'
    }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .allow('')
    .messages({
      'string.pattern.base': 'El teléfono debe tener un formato internacional válido'
    }),
  isActive: Joi.boolean()
    .messages({
      'boolean': 'El campo isActive debe ser un valor booleano'
    })
});

// Esquema para actualización de perfil
const profileUpdateSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres'
    }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .allow('')
    .messages({
      'string.pattern.base': 'El teléfono debe tener un formato internacional válido'
    })
});

// ==============================================
// FUNCIONES DE VALIDACIÓN
// ==============================================

/**
 * Middleware de validación genérico
 * @param {Object} schema - Esquema de Joi
 * @param {string} source - Fuente de datos (body, query, params)
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      logger.warn(`Error de validación en ${req.method} ${req.path}:`, errorMessages);
      
      return res.status(400).json({
        error: 'Datos inválidos',
        message: 'Los datos proporcionados no son válidos',
        details: errorMessages
      });
    }
    
    // Reemplazar datos originales con datos validados
    req[source] = value;
    next();
  };
}

/**
 * Validar parámetros de ruta
 * @param {Object} schema - Esquema de Joi
 */
function validateParams(schema) {
  return validate(schema, 'params');
}

/**
 * Validar query parameters
 * @param {Object} schema - Esquema de Joi
 */
function validateQuery(schema) {
  return validate(schema, 'query');
}

/**
 * Validar body de request
 * @param {Object} schema - Esquema de Joi
 */
function validateBody(schema) {
  return validate(schema, 'body');
}

// ==============================================
// EXPORTACIÓN DE VALIDACIONES
// ==============================================

module.exports = {
  // Funciones de validación
  validate,
  validateParams,
  validateQuery,
  validateBody,
  
  // Esquemas de autenticación
  validateLogin: validateBody(loginSchema),
  validateRegistration: validateBody(registrationSchema),
  validatePasswordChange: validateBody(passwordChangeSchema),
  validateResetPassword: validateBody(resetPasswordSchema),
  validateEmail: validateBody(emailSchema),
  validateProfileUpdate: validateBody(profileUpdateSchema),
  
  // Esquemas de fechas y paginación
  validateDateRange: validateQuery(dateRangeSchema),
  validatePagination: validateQuery(paginationSchema),
  
  // Esquemas de citas y agenda
  validateAppointmentCreation: validateBody(appointmentCreationSchema),
  validateAppointmentUpdate: validateBody(appointmentUpdateSchema),
  validateStatusChange: validateBody(statusChangeSchema),
  
  // Esquemas de WhatsApp
  validateMessageSend: validateBody(messageSendSchema),
  validateUrgentMarking: validateBody(urgentMarkingSchema),
  
  // Esquemas de automatizaciones
  validateReminderExecution: validateBody(reminderExecutionSchema),
  validateAutomationConfig: validateBody(automationConfigSchema),
  validateAutomationTest: validateBody(automationTestSchema),
  
  // Esquemas legales
  validateDocument: validateBody(documentSchema),
  validateQuestionnaire: validateBody(questionnaireSchema),
  validateComplianceSubmission: validateBody(complianceSubmissionSchema),
  
  // Esquemas de usuarios
  validateUserCreation: validateBody(userCreationSchema),
  validateUserUpdate: validateBody(userUpdateSchema),
  
  // Esquemas para exportar si se necesitan
  schemas: {
    loginSchema,
    registrationSchema,
    passwordChangeSchema,
    appointmentCreationSchema,
    appointmentUpdateSchema,
    messageSendSchema,
    documentSchema,
    questionnaireSchema,
    userCreationSchema,
    userUpdateSchema
  }
};
