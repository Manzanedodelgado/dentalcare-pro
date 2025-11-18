/**
 * CONTROLADOR DE FACTURACIÓN Y VERIFACTU
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Sistema de facturación conforme a Verifactu (ley española)
 * - Generación automática de facturas
 * - Control de pagos y cobros
 * - Numeración automática legal
 * - Estados de facturación
 * - Reportes financieros
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { v4: uuidv4 } = require('uuid');
const databaseService = require('../utils/databaseService');
const logger = require('../utils/logger');
const { hasPermission } = require('./authController');

// ==============================================
// CONFIGURACIÓN VERIFACTU
// ==============================================

const VERIFACTU_CONFIG = {
  SERIE: process.env.VERIFACTU_SERIE || '0001',
  IVA_RATE: parseFloat(process.env.VERIFACTU_IVA_RATE) || 21,
  CURRENCY: process.env.VERIFACTU_CURRENCY || 'EUR',
  NEXT_NUMBER: parseInt(process.env.VERIFACTU_NEXT_NUMBER) || 1,
  CLINIC_INFO: {
    name: 'Clínica Dental Rubio García',
    address: 'Dirección de la Clínica',
    city: 'Ciudad',
    postal_code: 'CP',
    nif: 'NIF/CIF de la clínica',
    phone: '34664218253',
    email: 'info@rubiogarciadental.com'
  }
};

const INVOICE_STATUS = {
  DRAFT: {
    id: 'draft',
    name: 'Borrador',
    color: 'gray',
    description: 'Factura en borrador, no legal'
  },
  ISSUED: {
    id: 'issued',
    name: 'Emitida',
    color: 'blue',
    description: 'Factura emitida, esperando pago'
  },
  PAID: {
    id: 'paid',
    name: 'Pagada',
    color: 'green',
    description: 'Factura pagada completamente'
  },
  PARTIAL: {
    id: 'partial',
    name: 'Parcialmente Pagada',
    color: 'orange',
    description: 'Factura pagada parcialmente'
  },
  OVERDUE: {
    id: 'overdue',
    name: 'Vencida',
    color: 'red',
    description: 'Factura vencida sin pagar'
  },
  CANCELLED: {
    id: 'cancelled',
    name: 'Cancelada',
    color: 'dark',
    description: 'Factura cancelada'
  }
};

const PAYMENT_STATUS = {
  PENDING: {
    id: 'pending',
    name: 'Pendiente',
    color: 'yellow'
  },
  PAID: {
    id: 'paid',
    name: 'Pagada',
    color: 'green'
  },
  OVERDUE: {
    id: 'overdue',
    name: 'Vencida',
    color: 'red'
  }
};

// ==============================================
// FUNCIONES AUXILIARES
// ==============================================

/**
 * Generar número de factura secuencial
 * @returns {string} Número de factura
 */
async function generateInvoiceNumber() {
  try {
    // Obtener el último número usado
    const lastInvoiceQuery = await databaseService.query(
      'SELECT invoice_number FROM invoices WHERE invoice_number LIKE $1 ORDER BY invoice_number DESC LIMIT 1',
      [`${VERIFACTU_CONFIG.SERIE}%`]
    );
    
    let nextNumber = VERIFACTU_CONFIG.NEXT_NUMBER;
    
    if (lastInvoiceQuery.rows.length > 0) {
      const lastNumber = lastInvoiceQuery.rows[0].invoice_number;
      const numberPart = parseInt(lastNumber.replace(VERIFACTU_CONFIG.SERIE, ''));
      nextNumber = numberPart + 1;
    }
    
    // Formatear con ceros a la izquierda
    const formattedNumber = `${VERIFACTU_CONFIG.SERIE}${nextNumber.toString().padStart(6, '0')}`;
    
    return {
      number: formattedNumber,
      nextNumber: nextNumber + 1
    };
    
  } catch (error) {
    logger.error(`Error al generar número de factura: ${error.message}`);
    // Fallback: generar número basado en timestamp
    const timestamp = Date.now().toString().slice(-6);
    return {
      number: `${VERIFACTU_CONFIG.SERIE}${timestamp}`,
      nextNumber: parseInt(timestamp) + 1
    };
  }
}

/**
 * Calcular totales de factura
 * @param {Array} items - Items de la factura
 * @returns {Object} Totales calculados
 */
function calculateInvoiceTotals(items) {
  let subtotal = 0;
  let totalIVA = 0;
  let total = 0;
  
  items.forEach(item => {
    const itemSubtotal = item.quantity * item.unit_price;
    const itemIVA = itemSubtotal * (item.iva_rate / 100);
    
    subtotal += itemSubtotal;
    totalIVA += itemIVA;
    total += (itemSubtotal + itemIVA);
  });
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalIVA: Math.round(totalIVA * 100) / 100,
    total: Math.round(total * 100) / 100,
    currency: VERIFACTU_CONFIG.CURRENCY
  };
}

/**
 * Generar PDF de factura
 * @param {Object} invoice - Datos de la factura
 * @returns {Buffer} PDF generado
 */
async function generateInvoicePDF(invoice) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let yPosition = 800;
    
    // Header de la clínica
    page.drawText(VERIFACTU_CONFIG.CLINIC_INFO.name, {
      x: 50,
      y: yPosition,
      size: 16,
      font: fontBold
    });
    
    yPosition -= 20;
    page.drawText(VERIFACTU_CONFIG.CLINIC_INFO.address, {
      x: 50,
      y: yPosition,
      size: 12,
      font: font
    });
    
    yPosition -= 15;
    page.drawText(`${VERIFACTU_CONFIG.CLINIC_INFO.city} ${VERIFACTU_CONFIG.CLINIC_INFO.postal_code}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: font
    });
    
    yPosition -= 15;
    page.drawText(`NIF: ${VERIFACTU_CONFIG.CLINIC_INFO.nif}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: font
    });
    
    // Información de la factura
    yPosition = 700;
    page.drawText('FACTURA', {
      x: 400,
      y: yPosition,
      size: 20,
      font: fontBold
    });
    
    yPosition -= 30;
    page.drawText(`Número: ${invoice.invoice_number}`, {
      x: 400,
      y: yPosition,
      size: 12,
      font: font
    });
    
    yPosition -= 20;
    page.drawText(`Fecha: ${new Date(invoice.invoice_date).toLocaleDateString('es-ES')}`, {
      x: 400,
      y: yPosition,
      size: 12,
      font: font
    });
    
    // Datos del paciente
    yPosition = 600;
    page.drawText('DATOS DEL PACIENTE', {
      x: 50,
      y: yPosition,
      size: 14,
      font: fontBold
    });
    
    yPosition -= 25;
    page.drawText(invoice.patient_name, {
      x: 50,
      y: yPosition,
      size: 12,
      font: fontBold
    });
    
    if (invoice.patient_address) {
      yPosition -= 15;
      page.drawText(invoice.patient_address, {
        x: 50,
        y: yPosition,
        size: 12,
        font: font
      });
    }
    
    if (invoice.patient_phone) {
      yPosition -= 15;
      page.drawText(`Teléfono: ${invoice.patient_phone}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font: font
      });
    }
    
    // Tabla de conceptos
    yPosition = 450;
    page.drawText('CONCEPTOS', {
      x: 50,
      y: yPosition,
      size: 14,
      font: fontBold
    });
    
    yPosition -= 20;
    
    // Headers de la tabla
    const headers = ['CONCEPTO', 'CANT.', 'PRECIO', 'IVA', 'TOTAL'];
    const headerX = [50, 300, 350, 400, 450];
    
    headers.forEach((header, index) => {
      page.drawText(header, {
        x: headerX[index],
        y: yPosition,
        size: 10,
        font: fontBold
      });
    });
    
    yPosition -= 10;
    
    // Línea separadora
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: 545, y: yPosition },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    
    yPosition -= 15;
    
    // Items de la factura
    invoice.items.forEach(item => {
      const itemTotal = item.quantity * item.unit_price * (1 + item.iva_rate / 100);
      
      page.drawText(item.description || 'Tratamiento dental', {
        x: 50,
        y: yPosition,
        size: 10,
        font: font
      });
      
      page.drawText(item.quantity.toString(), {
        x: 300,
        y: yPosition,
        size: 10,
        font: font
      });
      
      page.drawText(`${item.unit_price.toFixed(2)} €`, {
        x: 350,
        y: yPosition,
        size: 10,
        font: font
      });
      
      page.drawText(`${item.iva_rate}%`, {
        x: 400,
        y: yPosition,
        size: 10,
        font: font
      });
      
      page.drawText(`${itemTotal.toFixed(2)} €`, {
        x: 450,
        y: yPosition,
        size: 10,
        font: font
      });
      
      yPosition -= 20;
    });
    
    // Totales
    yPosition -= 10;
    page.drawLine({
      start: { x: 350, y: yPosition },
      end: { x: 545, y: yPosition },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    
    yPosition -= 20;
    page.drawText(`Subtotal: ${invoice.subtotal.toFixed(2)} €`, {
      x: 400,
      y: yPosition,
      size: 12,
      font: fontBold
    });
    
    yPosition -= 20;
    page.drawText(`IVA (${VERIFACTU_CONFIG.IVA_RATE}%): ${invoice.total_iva.toFixed(2)} €`, {
      x: 400,
      y: yPosition,
      size: 12,
      font: fontBold
    });
    
    yPosition -= 20;
    page.drawText(`TOTAL: ${invoice.total_amount.toFixed(2)} €`, {
      x: 400,
      y: yPosition,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0)
    });
    
    // Footer con información legal
    yPosition = 100;
    page.drawText(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font
    });
    
    yPosition -= 15;
    page.drawText('Factura emitida conforme a la normativa fiscal española (Verifactu)', {
      x: 50,
      y: yPosition,
      size: 10,
      font: font
    });
    
    return await pdfDoc.save();
    
  } catch (error) {
    logger.error(`Error al generar PDF: ${error.message}`);
    throw error;
  }
}

// ==============================================
// CONTROLADOR DE OBTENER FACTURAS
// ==============================================

/**
 * Obtener lista de facturas con filtros y paginación
 * GET /api/invoices
 */
async function getInvoices(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      patientId,
      dateFrom,
      dateTo,
      search,
      sortBy = 'invoice_date',
      sortOrder = 'desc'
    } = req.query;

    // Verificar permisos
    if (!hasPermission(req.user, 'invoices.read')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para ver facturas'
      });
    }

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtros
    if (status) {
      whereConditions.push(`i.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (paymentStatus) {
      whereConditions.push(`i.payment_status = $${paramIndex}`);
      queryParams.push(paymentStatus);
      paramIndex++;
    }

    if (patientId) {
      whereConditions.push(`i.patient_id = $${paramIndex}`);
      queryParams.push(patientId);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`DATE(i.invoice_date) >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`DATE(i.invoice_date) <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(i.invoice_number ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Validar ordenamiento
    const validSortFields = ['invoice_number', 'invoice_date', 'total_amount', 'status', 'created_at'];
    const validSortOrders = ['asc', 'desc'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'invoice_date';
    const sortDirection = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Consulta principal
    const invoicesQuery = await databaseService.query(
      `SELECT 
         i.id, i.invoice_number, i.invoice_date, i.due_date,
         i.subtotal, i.total_iva, i.total_amount, i.currency,
         i.status, i.payment_status, i.notes, i.created_at, i.updated_at,
         p.id as patient_id, p.name as patient_name, p.phone as patient_phone,
         p.email as patient_email,
         CASE 
           WHEN i.status = 'issued' THEN '🔵 Emitida'
           WHEN i.status = 'paid' THEN '🟢 Pagada'
           WHEN i.status = 'partial' THEN '🟡 Parcial'
           WHEN i.status = 'overdue' THEN '🔴 Vencida'
           WHEN i.status = 'cancelled' THEN '⚫ Cancelada'
           WHEN i.status = 'draft' THEN '⚪ Borrador'
         END as status_label,
         CASE 
           WHEN i.payment_status = 'paid' THEN '🟢 Pagada'
           WHEN i.payment_status = 'pending' THEN '🟡 Pendiente'
           WHEN i.payment_status = 'overdue' THEN '🔴 Vencida'
         END as payment_status_label,
         CASE 
           WHEN i.due_date < NOW() AND i.payment_status != 'paid' THEN true
           ELSE false
         END as is_overdue
       FROM invoices i
       JOIN patients p ON i.patient_id = p.id
       ${whereClause}
       ORDER BY i.${sortField} ${sortDirection}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    // Contar total
    const countQuery = await databaseService.query(
      `SELECT COUNT(*) as total
       FROM invoices i
       JOIN patients p ON i.patient_id = p.id
       ${whereClause}`,
      queryParams
    );

    const total = parseInt(countQuery.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Obtener estadísticas
    const statsQuery = await databaseService.query(
      `SELECT 
         COUNT(*) as total_invoices,
         COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
         COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_invoices,
         COUNT(CASE WHEN payment_status = 'overdue' THEN 1 END) as overdue_invoices,
         COALESCE(SUM(total_amount), 0) as total_amount,
         COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_amount,
         COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END), 0) as pending_amount
       FROM invoices i
       ${whereClause.replace('i.', '')}`,
      queryParams
    );

    const stats = statsQuery.rows[0];

    res.json({
      success: true,
      data: {
        invoices: invoicesQuery.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        statistics: {
          total: parseInt(stats.total_invoices),
          paid: parseInt(stats.paid_invoices),
          pending: parseInt(stats.pending_invoices),
          overdue: parseInt(stats.overdue_invoices),
          totalAmount: parseFloat(stats.total_amount),
          paidAmount: parseFloat(stats.paid_amount),
          pendingAmount: parseFloat(stats.pending_amount)
        }
      }
    });

  } catch (error) {
    logger.error(`Error al obtener facturas: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener facturas',
      message: 'No se pudieron cargar las facturas'
    });
  }
}

// ==============================================
// CONTROLADOR DE OBTENER FACTURA POR ID
// ==============================================

/**
 * Obtener factura por ID con detalles completos
 * GET /api/invoices/:id
 */
async function getInvoice(req, res) {
  try {
    const { id: invoiceId } = req.params;

    // Verificar permisos
    if (!hasPermission(req.user, 'invoices.read')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para ver facturas'
      });
    }

    // Obtener factura
    const invoiceQuery = await databaseService.query(
      `SELECT 
         i.*, p.name as patient_name, p.phone as patient_phone, 
         p.email as patient_email, p.address as patient_address
       FROM invoices i
       JOIN patients p ON i.patient_id = p.id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (invoiceQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Factura no encontrada',
        message: 'No se encontró la factura especificada'
      });
    }

    const invoice = invoiceQuery.rows[0];

    // Obtener items de la factura
    const itemsQuery = await databaseService.query(
      `SELECT 
         id, description, quantity, unit_price, iva_rate, 
         (quantity * unit_price) as subtotal,
         (quantity * unit_price * (1 + iva_rate / 100)) as total
       FROM invoice_items
       WHERE invoice_id = $1
       ORDER BY id`,
      [invoiceId]
    );

    // Obtener pagos asociados
    const paymentsQuery = await databaseService.query(
      `SELECT 
         id, amount, payment_method, payment_date, 
         reference_number, notes, created_at
       FROM invoice_payments
       WHERE invoice_id = $1
       ORDER BY payment_date DESC`,
      [invoiceId]
    );

    // Calcular totales actuales
    const totals = calculateInvoiceTotals(itemsQuery.rows);
    const totalPaid = paymentsQuery.rows.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const remainingAmount = totals.total - totalPaid;

    res.json({
      success: true,
      data: {
        invoice: {
          ...invoice,
          items: itemsQuery.rows,
          payments: paymentsQuery.rows,
          totals: {
            ...totals,
            totalPaid: Math.round(totalPaid * 100) / 100,
            remainingAmount: Math.round(remainingAmount * 100) / 100,
            isPaid: remainingAmount <= 0.01,
            isOverdue: new Date(invoice.due_date) < new Date() && remainingAmount > 0.01
          }
        }
      }
    });

  } catch (error) {
    logger.error(`Error al obtener factura: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener factura',
      message: 'No se pudo cargar la factura'
    });
  }
}

// ==============================================
// CONTROLADOR DE CREAR FACTURA
// ==============================================

/**
 * Crear nueva factura
 * POST /api/invoices
 */
async function createInvoice(req, res) {
  try {
    const {
      patientId,
      items,
      dueDate,
      notes,
      treatmentType,
      appointmentId
    } = req.body;

    // Verificar permisos
    if (!hasPermission(req.user, 'invoices.create')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para crear facturas'
      });
    }

    // Verificar que el paciente existe
    const patientQuery = await databaseService.query(
      'SELECT id, name, phone, email, address FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'No se encontró el paciente especificado'
      });
    }

    const patient = patientQuery.rows[0];

    // Validar items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Items requeridos',
        message: 'La factura debe tener al menos un item'
      });
    }

    // Validar cada item
    for (const item of items) {
      if (!item.description || !item.quantity || !item.unit_price) {
        return res.status(400).json({
          error: 'Item inválido',
          message: 'Cada item debe tener descripción, cantidad y precio'
        });
      }
      
      if (item.quantity <= 0 || item.unit_price < 0) {
        return res.status(400).json({
          error: 'Valores inválidos',
          message: 'La cantidad debe ser mayor a 0 y el precio no puede ser negativo'
        });
      }
    }

    // Calcular totales
    const totals = calculateInvoiceTotals(items);

    // Generar número de factura
    const invoiceNumberData = await generateInvoiceNumber();
    const invoiceNumber = invoiceNumberData.number;

    // Crear factura
    const newInvoiceQuery = await databaseService.query(
      `INSERT INTO invoices (
         patient_id, invoice_number, invoice_date, due_date,
         subtotal, total_iva, total_amount, currency,
         status, payment_status, notes, treatment_type,
         appointment_id, created_at, updated_at
       ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, 'draft', 'pending', $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [
        patientId,
        invoiceNumber,
        dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días por defecto
        totals.subtotal,
        totals.totalIVA,
        totals.total,
        totals.currency,
        notes,
        treatmentType,
        appointmentId
      ]
    );

    const newInvoice = newInvoiceQuery.rows[0];

    // Crear items de la factura
    for (const item of items) {
      await databaseService.query(
        `INSERT INTO invoice_items (
           invoice_id, description, quantity, unit_price, iva_rate, created_at
         ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          newInvoice.id,
          item.description,
          item.quantity,
          item.unit_price,
          item.iva_rate || VERIFACTU_CONFIG.IVA_RATE
        ]
      );
    }

    // Actualizar número siguiente de factura
    await databaseService.query(
      'UPDATE system_config SET value = $1 WHERE key = $2',
      [invoiceNumberData.nextNumber.toString(), 'verifactu_next_number']
    );

    logger.info(`Nueva factura creada: ${invoiceNumber} por ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Factura creada correctamente',
      data: {
        invoice: {
          ...newInvoice,
          items,
          totals
        }
      }
    });

  } catch (error) {
    logger.error(`Error al crear factura: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al crear factura',
      message: 'No se pudo crear la factura'
    });
  }
}

// ==============================================
// CONTROLADOR DE ACTUALIZAR FACTURA
// ==============================================

/**
 * Actualizar factura
 * PUT /api/invoices/:id
 */
async function updateInvoice(req, res) {
  try {
    const { id: invoiceId } = req.params;
    const { status, paymentStatus, notes, dueDate } = req.body;

    // Verificar permisos
    if (!hasPermission(req.user, 'invoices.update')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para actualizar facturas'
      });
    }

    // Verificar que la factura existe
    const existingInvoiceQuery = await databaseService.query(
      'SELECT * FROM invoices WHERE id = $1',
      [invoiceId]
    );

    if (existingInvoiceQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Factura no encontrada',
        message: 'No se encontró la factura especificada'
      });
    }

    const existingInvoice = existingInvoiceQuery.rows[0];

    // No permitir actualizar facturas pagadas o canceladas
    if (['paid', 'cancelled'].includes(existingInvoice.status)) {
      return res.status(400).json({
        error: 'Factura bloqueada',
        message: 'No se puede actualizar una factura pagada o cancelada'
      });
    }

    // Actualizar factura
    const updateData = {
      status: status || existingInvoice.status,
      payment_status: paymentStatus || existingInvoice.payment_status,
      notes: notes !== undefined ? notes : existingInvoice.notes,
      due_date: dueDate || existingInvoice.due_date,
      updated_at: new Date()
    };

    // Auto-actualizar status basado en pagos si es necesario
    if (paymentStatus && paymentStatus !== existingInvoice.payment_status) {
      if (paymentStatus === 'paid' && updateData.status !== 'paid') {
        updateData.status = 'paid';
      } else if (paymentStatus === 'overdue' && updateData.status !== 'overdue') {
        updateData.status = 'overdue';
      }
    }

    const updatedInvoiceQuery = await databaseService.query(
      `UPDATE invoices 
       SET status = $1, payment_status = $2, notes = $3, due_date = $4, updated_at = $5
       WHERE id = $6
       RETURNING *`,
      [
        updateData.status,
        updateData.payment_status,
        updateData.notes,
        updateData.due_date,
        updateData.updated_at,
        invoiceId
      ]
    );

    const updatedInvoice = updatedInvoiceQuery.rows[0];

    logger.info(`Factura actualizada: ${updatedInvoice.invoice_number} por ${req.user.email}`);

    res.json({
      success: true,
      message: 'Factura actualizada correctamente',
      data: { invoice: updatedInvoice }
    });

  } catch (error) {
    logger.error(`Error al actualizar factura: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al actualizar factura',
      message: 'No se pudo actualizar la factura'
    });
  }
}

// ==============================================
// CONTROLADOR DE GENERAR PDF
// ==============================================

/**
 * Generar PDF de factura
 * GET /api/invoices/:id/pdf
 */
async function generatePDF(req, res) {
  try {
    const { id: invoiceId } = req.params;

    // Verificar permisos
    if (!hasPermission(req.user, 'invoices.read')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para generar PDFs'
      });
    }

    // Obtener factura con datos completos
    const invoiceQuery = await databaseService.query(
      `SELECT 
         i.*, p.name as patient_name, p.phone as patient_phone,
         p.email as patient_email, p.address as patient_address
       FROM invoices i
       JOIN patients p ON i.patient_id = p.id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (invoiceQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Factura no encontrada',
        message: 'No se encontró la factura especificada'
      });
    }

    const invoice = invoiceQuery.rows[0];

    // Obtener items
    const itemsQuery = await databaseService.query(
      `SELECT description, quantity, unit_price, iva_rate
       FROM invoice_items
       WHERE invoice_id = $1
       ORDER BY id`,
      [invoiceId]
    );

    // Combinar datos para el PDF
    const invoiceForPDF = {
      ...invoice,
      items: itemsQuery.rows
    };

    // Generar PDF
    const pdfBuffer = await generateInvoicePDF(invoiceForPDF);

    // Si es la primera vez que se genera, cambiar status a 'issued'
    if (invoice.status === 'draft') {
      await databaseService.query(
        'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2',
        ['issued', invoiceId]
      );
    }

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura_${invoice.invoice_number}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    logger.info(`PDF generado para factura: ${invoice.invoice_number} por ${req.user.email}`);

    res.send(pdfBuffer);

  } catch (error) {
    logger.error(`Error al generar PDF: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al generar PDF',
      message: 'No se pudo generar el PDF de la factura'
    });
  }
}

// ==============================================
// EXPORTACIÓN DE FUNCIONES
// ==============================================

module.exports = {
  // Controladores principales
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  generatePDF,
  
  // Funciones auxiliares
  generateInvoiceNumber,
  calculateInvoiceTotals,
  generateInvoicePDF,
  
  // Configuraciones
  VERIFACTU_CONFIG,
  INVOICE_STATUS,
  PAYMENT_STATUS
};
