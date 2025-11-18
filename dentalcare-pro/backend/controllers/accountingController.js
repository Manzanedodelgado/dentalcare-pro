/**
 * CONTROLADOR DE CONTROL CONTABLE Y REPORTES FINANCIEROS
 * DentalCare Pro - Sistema de Gestión Dental
 * 
 * Funcionalidades:
 * - Control de ingresos y gastos
 * - Reportes financieros
 * - Análisis de rentabilidad por paciente/tratamiento
 * - Conciliación bancaria
 * - KPIs financieros
 * 
 * @author Juan Antonio Manzanedo
 * @version 1.0.0
 */

const databaseService = require('../utils/databaseService');
const logger = require('../utils/logger');
const { hasPermission } = require('./authController');

// ==============================================
// CONFIGURACIÓN CONTABLE
// ==============================================

const ACCOUNTING_CATEGORIES = {
  INCOME: {
    id: 'income',
    name: 'Ingresos',
    color: 'green',
    subcategories: {
      TREATMENTS: 'Tratamientos Dentales',
      CONSULTATIONS: 'Consultas',
      PROCEDURES: 'Procedimientos',
      PRODUCTS: 'Productos',
      OTHER_INCOME: 'Otros Ingresos'
    }
  },
  EXPENSE: {
    id: 'expense',
    name: 'Gastos',
    color: 'red',
    subcategories: {
      SUPPLIES: 'Suministros',
      EQUIPMENT: 'Equipos',
      RENT: 'Alquiler',
      UTILITIES: 'Servicios',
      MARKETING: 'Marketing',
      INSURANCE: 'Seguros',
      PROFESSIONAL: 'Servicios Profesionales',
      OTHER_EXPENSE: 'Otros Gastos'
    }
  },
  ASSET: {
    id: 'asset',
    name: 'Activos',
    color: 'blue',
    subcategories: {
      EQUIPMENT_VALUE: 'Valor de Equipos',
      INVENTORY: 'Inventario',
      CASH: 'Efectivo',
      BANK: 'Cuentas Bancarias',
      RECEIVABLES: 'Cuentas por Cobrar'
    }
  },
  LIABILITY: {
    id: 'liability',
    name: 'Pasivos',
    color: 'orange',
    subcategories: {
      PAYABLES: 'Cuentas por Pagar',
      LOANS: 'Préstamos',
      TAXES: 'Impuestos Pendientes',
      OTHER_LIABILITY: 'Otros Pasivos'
    }
  }
};

const FINANCIAL_PERIODS = {
  TODAY: 'today',
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month',
  THIS_QUARTER: 'this_quarter',
  THIS_YEAR: 'this_year',
  LAST_MONTH: 'last_month',
  LAST_QUARTER: 'last_quarter',
  LAST_YEAR: 'last_year',
  CUSTOM: 'custom'
};

// ==============================================
// FUNCIONES AUXILIARES
// ==============================================

/**
 * Obtener fecha de inicio y fin para un período
 * @param {string} period - Período contable
 * @param {string} customFrom - Fecha personalizada desde
 * @param {string} customTo - Fecha personalizada hasta
 * @returns {Object} Fechas de inicio y fin
 */
function getPeriodDates(period, customFrom = null, customTo = null) {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case FINANCIAL_PERIODS.TODAY:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      break;

    case FINANCIAL_PERIODS.THIS_WEEK:
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(now);
      startDate.setDate(now.getDate() + mondayOffset);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;

    case FINANCIAL_PERIODS.THIS_MONTH:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;

    case FINANCIAL_PERIODS.THIS_QUARTER:
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
      break;

    case FINANCIAL_PERIODS.THIS_YEAR:
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear() + 1, 0, 1);
      break;

    case FINANCIAL_PERIODS.LAST_MONTH:
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;

    case FINANCIAL_PERIODS.LAST_QUARTER:
      const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
      const lastQuarterStart = lastQuarter < 0 ? 11 : lastQuarter * 3;
      const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
      startDate = new Date(lastQuarterYear, lastQuarterStart, 1);
      endDate = new Date(lastQuarterYear, lastQuarterStart + 3, 1);
      break;

    case FINANCIAL_PERIODS.LAST_YEAR:
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear(), 0, 1);
      break;

    case FINANCIAL_PERIODS.CUSTOM:
      startDate = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = customTo ? new Date(customTo) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;

    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  return { startDate, endDate };
}

/**
 * Calcular métricas financieras
 * @param {Object} data - Datos financieros
 * @returns {Object} Métricas calculadas
 */
function calculateFinancialMetrics(data) {
  const {
    totalIncome = 0,
    totalExpenses = 0,
    invoicesPaid = 0,
    invoicesPending = 0,
    invoicesOverdue = 0
  } = data;

  const profit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;
  
  // Calcular promedio por factura
  const totalInvoices = invoicesPaid + invoicesPending + invoicesOverdue;
  const averageInvoiceValue = totalInvoices > 0 ? totalIncome / totalInvoices : 0;
  
  // Calcular días promedio de cobro
  const collectionEfficiency = totalIncome > 0 ? (invoicesPaid / totalInvoices) * 100 : 0;

  return {
    totalIncome,
    totalExpenses,
    profit,
    profitMargin: Math.round(profitMargin * 100) / 100,
    totalInvoices,
    averageInvoiceValue: Math.round(averageInvoiceValue * 100) / 100,
    collectionEfficiency: Math.round(collectionEfficiency * 100) / 100,
    profitability: profit >= 0 ? 'profitable' : 'loss'
  };
}

/**
 * Obtener top tratamientos por ingresos
 * @param {string} startDate - Fecha de inicio
 * @param {string} endDate - Fecha de fin
 * @returns {Array} Top tratamientos
 */
async function getTopTreatmentsByIncome(startDate, endDate) {
  try {
    const topTreatmentsQuery = await databaseService.query(
      `SELECT 
         a.treatment_type,
         COUNT(*) as treatment_count,
         COALESCE(SUM(i.total_amount), 0) as total_revenue,
         COALESCE(AVG(i.total_amount), 0) as average_revenue,
         COUNT(DISTINCT a.patient_id) as unique_patients
       FROM appointments a
       LEFT JOIN invoices i ON a.patient_id = i.patient_id 
         AND DATE(i.invoice_date) BETWEEN $1 AND $2
         AND i.payment_status = 'paid'
       WHERE DATE(a.appointment_date) BETWEEN $1 AND $2
         AND a.treatment_type IS NOT NULL 
         AND a.treatment_type != ''
         AND a.status IN ('aceptada', 'confirmada')
       GROUP BY a.treatment_type
       ORDER BY total_revenue DESC
       LIMIT 10`,
      [startDate, endDate]
    );

    return topTreatmentsQuery.rows.map((row, index) => ({
      rank: index + 1,
      treatmentType: row.treatment_type,
      count: parseInt(row.treatment_count),
      revenue: parseFloat(row.total_revenue),
      averageRevenue: parseFloat(row.average_revenue),
      patients: parseInt(row.unique_patients),
      revenuePerPatient: parseFloat(row.total_revenue) / parseInt(row.unique_patients) || 0
    }));

  } catch (error) {
    logger.error(`Error al obtener top tratamientos: ${error.message}`);
    return [];
  }
}

/**
 * Obtener análisis de pacientes por valor
 * @param {string} startDate - Fecha de inicio
 * @param {string} endDate - Fecha de fin
 * @returns {Array} Análisis de pacientes
 */
async function getPatientValueAnalysis(startDate, endDate) {
  try {
    const patientAnalysisQuery = await databaseService.query(
      `SELECT 
         p.id,
         p.name,
         p.created_at as patient_since,
         COUNT(DISTINCT a.id) as total_appointments,
         COUNT(DISTINCT i.id) as total_invoices,
         COALESCE(SUM(i.total_amount), 0) as total_spent,
         COALESCE(SUM(CASE WHEN i.payment_status = 'paid' THEN i.total_amount ELSE 0 END), 0) as paid_amount,
         COALESCE(AVG(i.total_amount), 0) as average_invoice,
         MAX(i.invoice_date) as last_invoice_date,
         MIN(a.appointment_date) as first_appointment_date
       FROM patients p
       LEFT JOIN appointments a ON p.id = a.patient_id 
         AND DATE(a.appointment_date) BETWEEN $1 AND $2
       LEFT JOIN invoices i ON p.id = i.patient_id
         AND DATE(i.invoice_date) BETWEEN $1 AND $2
       WHERE p.is_active = true
       GROUP BY p.id, p.name, p.created_at
       HAVING COUNT(DISTINCT i.id) > 0
       ORDER BY total_spent DESC
       LIMIT 50`,
      [startDate, endDate]
    );

    return patientAnalysisQuery.rows.map(row => ({
      patientId: row.id,
      patientName: row.name,
      patientSince: row.patient_since,
      totalAppointments: parseInt(row.total_appointments),
      totalInvoices: parseInt(row.total_invoices),
      totalSpent: parseFloat(row.total_spent),
      paidAmount: parseFloat(row.paid_amount),
      pendingAmount: parseFloat(row.total_spent) - parseFloat(row.paid_amount),
      averageInvoice: parseFloat(row.average_invoice),
      lastInvoiceDate: row.last_invoice_date,
      firstAppointmentDate: row.first_appointment_date,
      value: parseFloat(row.total_spent),
      customerLifetime: row.last_invoice_date && row.first_appointment_date ? 
        Math.ceil((new Date(row.last_invoice_date) - new Date(row.first_appointment_date)) / (1000 * 60 * 60 * 24)) : 0
    }));

  } catch (error) {
    logger.error(`Error al analizar valor de pacientes: ${error.message}`);
    return [];
  }
}

// ==============================================
// CONTROLADOR DE RESÚMENES CONTABLES
// ==============================================

/**
 * Obtener resúmenes contables
 * GET /api/accounting/summaries
 */
async function getSummaries(req, res) {
  try {
    const { period = FINANCIAL_PERIODS.THIS_MONTH, customFrom, customTo } = req.query;

    // Verificar permisos
    if (!hasPermission(req.user, 'invoices.read') && !hasPermission(req.user, 'reports.read')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para ver resúmenes contables'
      });
    }

    // Obtener fechas del período
    const { startDate, endDate } = getPeriodDates(period, customFrom, customTo);

    // Obtener resumen de ingresos
    const incomeQuery = await databaseService.query(
      `SELECT 
         COUNT(*) as total_invoices,
         COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_invoices,
         COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_invoices,
         COUNT(CASE WHEN payment_status = 'overdue' THEN 1 END) as overdue_invoices,
         COALESCE(SUM(total_amount), 0) as total_revenue,
         COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as collected_revenue,
         COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END), 0) as pending_revenue,
         COALESCE(SUM(CASE WHEN payment_status = 'overdue' THEN total_amount ELSE 0 END), 0) as overdue_revenue,
         COALESCE(AVG(total_amount), 0) as average_invoice_value
       FROM invoices
       WHERE DATE(invoice_date) >= $1 AND DATE(invoice_date) < $2`,
      [startDate, endDate]
    );

    // Obtener resumen de gastos (ejemplo con categorías)
    const expensesQuery = await databaseService.query(
      `SELECT 
         category,
         COALESCE(SUM(amount), 0) as total_amount,
         COUNT(*) as transaction_count,
         COALESCE(AVG(amount), 0) as average_amount
       FROM expense_transactions
       WHERE DATE(transaction_date) >= $1 AND DATE(transaction_date) < $2
       GROUP BY category
       ORDER BY total_amount DESC`,
      [startDate, endDate]
    );

    // Obtener citas del período
    const appointmentsQuery = await databaseService.query(
      `SELECT 
         COUNT(*) as total_appointments,
         COUNT(CASE WHEN status = 'aceptada' THEN 1 END) as completed_appointments,
         COUNT(CASE WHEN status = 'confirmada' THEN 1 END) as confirmed_appointments,
         COUNT(CASE WHEN status = 'anulada' THEN 1 END) as cancelled_appointments,
         COUNT(DISTINCT patient_id) as unique_patients,
         COUNT(DISTINCT treatment_type) as different_treatments
       FROM appointments
       WHERE DATE(appointment_date) >= $1 AND DATE(appointment_date) < $2`,
      [startDate, endDate]
    );

    // Obtener crecimiento comparativo
    const { startDate: prevStartDate, endDate: prevEndDate } = getPeriodDates(
      period === FINANCIAL_PERIODS.THIS_MONTH ? FINANCIAL_PERIODS.LAST_MONTH :
      period === FINANCIAL_PERIODS.THIS_QUARTER ? FINANCIAL_PERIODS.LAST_QUARTER :
      period === FINANCIAL_PERIODS.THIS_YEAR ? FINANCIAL_PERIODS.LAST_YEAR :
      FINANCIAL_PERIODS.THIS_MONTH
    );

    const previousPeriodQuery = await databaseService.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as previous_revenue,
         COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as previous_invoices
       FROM invoices
       WHERE DATE(invoice_date) >= $1 AND DATE(invoice_date) < $2`,
      [prevStartDate, prevEndDate]
    );

    const income = incomeQuery.rows[0];
    const expenses = expensesQuery.rows;
    const appointments = appointmentsQuery.rows[0];
    const previousPeriod = previousPeriodQuery.rows[0];

    // Calcular métricas
    const currentRevenue = parseFloat(income.collected_revenue);
    const previousRevenue = parseFloat(previousPeriod.previous_revenue);
    const revenueGrowth = previousRevenue > 0 ? 
      ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.total_amount), 0);
    const profit = currentRevenue - totalExpenses;
    const profitMargin = currentRevenue > 0 ? (profit / currentRevenue) * 100 : 0;

    const metrics = calculateFinancialMetrics({
      totalIncome: currentRevenue,
      totalExpenses,
      invoicesPaid: parseInt(income.paid_invoices),
      invoicesPending: parseInt(income.pending_invoices),
      invoicesOverdue: parseInt(income.overdue_invoices)
    });

    res.json({
      success: true,
      data: {
        period: {
          type: period,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        },
        income: {
          totalInvoices: parseInt(income.total_invoices),
          paidInvoices: parseInt(income.paid_invoices),
          pendingInvoices: parseInt(income.pending_invoices),
          overdueInvoices: parseInt(income.overdue_invoices),
          totalRevenue: parseFloat(income.total_revenue),
          collectedRevenue: currentRevenue,
          pendingRevenue: parseFloat(income.pending_revenue),
          overdueRevenue: parseFloat(income.overdue_revenue),
          averageInvoiceValue: parseFloat(income.average_invoice_value)
        },
        expenses: {
          totalAmount: totalExpenses,
          categories: expenses.map(expense => ({
            category: expense.category,
            amount: parseFloat(expense.total_amount),
            transactionCount: parseInt(expense.transaction_count),
            averageAmount: parseFloat(expense.average_amount)
          }))
        },
        appointments: {
          total: parseInt(appointments.total_appointments),
          completed: parseInt(appointments.completed_appointments),
          confirmed: parseInt(appointments.confirmed_appointments),
          cancelled: parseInt(appointments.cancelled_appointments),
          uniquePatients: parseInt(appointments.unique_patients),
          differentTreatments: parseInt(appointments.different_treatments)
        },
        financial: {
          profit,
          profitMargin: Math.round(profitMargin * 100) / 100,
          revenueGrowth: Math.round(revenueGrowth * 100) / 100,
          profitability: profit >= 0 ? 'profitable' : 'loss'
        },
        metrics,
        comparison: {
          previousPeriodRevenue: previousRevenue,
          currentRevenue,
          growth: revenueGrowth
        }
      }
    });

  } catch (error) {
    logger.error(`Error al obtener resúmenes: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener resúmenes',
      message: 'No se pudieron cargar los resúmenes contables'
    });
  }
}

// ==============================================
// CONTROLADOR DE REPORTES FINANCIEROS
// ==============================================

/**
 * Generar reportes financieros
 * GET /api/accounting/reports
 */
async function generateReports(req, res) {
  try {
    const { 
      period = FINANCIAL_PERIODS.THIS_MONTH, 
      reportType = 'summary',
      customFrom, 
      customTo 
    } = req.query;

    // Verificar permisos
    if (!hasPermission(req.user, 'reports.read')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para generar reportes'
      });
    }

    // Obtener fechas del período
    const { startDate, endDate } = getPeriodDates(period, customFrom, customTo);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    let reportData = {};

    switch (reportType) {
      case 'summary':
        // Reporte básico de ingresos y gastos
        reportData = await generateSummaryReport(startDateStr, endDateStr);
        break;
        
      case 'patient_analysis':
        // Análisis detallado por paciente
        reportData = await generatePatientAnalysisReport(startDateStr, endDateStr);
        break;
        
      case 'treatment_analysis':
        // Análisis por tratamientos
        reportData = await generateTreatmentAnalysisReport(startDateStr, endDateStr);
        break;
        
      case 'cash_flow':
        // Flujo de caja
        reportData = await generateCashFlowReport(startDateStr, endDateStr);
        break;
        
      case 'profitability':
        // Análisis de rentabilidad
        reportData = await generateProfitabilityReport(startDateStr, endDateStr);
        break;
        
      default:
        return res.status(400).json({
          error: 'Tipo de reporte inválido',
          message: 'Tipos válidos: summary, patient_analysis, treatment_analysis, cash_flow, profitability'
        });
    }

    logger.info(`Reporte ${reportType} generado para período ${startDateStr} a ${endDateStr} por ${req.user.email}`);

    res.json({
      success: true,
      data: {
        reportType,
        period: {
          type: period,
          startDate: startDateStr,
          endDate: endDateStr
        },
        generatedAt: new Date().toISOString(),
        ...reportData
      }
    });

  } catch (error) {
    logger.error(`Error al generar reporte: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al generar reporte',
      message: 'No se pudo generar el reporte financiero'
    });
  }
}

// ==============================================
// FUNCIONES DE GENERACIÓN DE REPORTES
// ==============================================

/**
 * Generar reporte de resumen
 */
async function generateSummaryReport(startDate, endDate) {
  const summaryQuery = await databaseService.query(
    `SELECT 
       DATE_TRUNC('day', invoice_date) as date,
       COUNT(*) as invoices_count,
       COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as daily_revenue,
       COALESCE(SUM(total_amount), 0) as daily_total,
       COALESCE(AVG(total_amount), 0) as avg_invoice
     FROM invoices
     WHERE DATE(invoice_date) >= $1 AND DATE(invoice_date) < $2
     GROUP BY DATE_TRUNC('day', invoice_date)
     ORDER BY date DESC`,
    [startDate, endDate]
  );

  return {
    dailyBreakdown: summaryQuery.rows.map(row => ({
      date: row.date,
      invoices: parseInt(row.invoices_count),
      revenue: parseFloat(row.daily_revenue),
      total: parseFloat(row.daily_total),
      averageInvoice: parseFloat(row.avg_invoice)
    }))
  };
}

/**
 * Generar reporte de análisis por paciente
 */
async function generatePatientAnalysisReport(startDate, endDate) {
  const patients = await getPatientValueAnalysis(startDate, endDate);
  
  // Calcular segmentos de pacientes
  const segments = {
    vip: patients.filter(p => p.value >= 1000),
    regular: patients.filter(p => p.value >= 200 && p.value < 1000),
    occasional: patients.filter(p => p.value < 200)
  };

  return {
    patientSegments: {
      vip: {
        count: segments.vip.length,
        totalValue: segments.vip.reduce((sum, p) => sum + p.value, 0),
        averageValue: segments.vip.length > 0 ? 
          segments.vip.reduce((sum, p) => sum + p.value, 0) / segments.vip.length : 0
      },
      regular: {
        count: segments.regular.length,
        totalValue: segments.regular.reduce((sum, p) => sum + p.value, 0),
        averageValue: segments.regular.length > 0 ? 
          segments.regular.reduce((sum, p) => sum + p.value, 0) / segments.regular.length : 0
      },
      occasional: {
        count: segments.occasional.length,
        totalValue: segments.occasional.reduce((sum, p) => sum + p.value, 0),
        averageValue: segments.occasional.length > 0 ? 
          segments.occasional.reduce((sum, p) => sum + p.value, 0) / segments.occasional.length : 0
      }
    },
    topPatients: patients.slice(0, 20)
  };
}

/**
 * Generar reporte de análisis por tratamiento
 */
async function generateTreatmentAnalysisReport(startDate, endDate) {
  const treatments = await getTopTreatmentsByIncome(startDate, endDate);
  
  return {
    treatmentPerformance: treatments.map(treatment => ({
      rank: treatment.rank,
      treatmentType: treatment.treatmentType,
      count: treatment.count,
      revenue: treatment.revenue,
      averageRevenue: treatment.averageRevenue,
      patients: treatment.patients,
      revenuePerPatient: Math.round(treatment.revenuePerPatient * 100) / 100
    })),
    summary: {
      totalTreatments: treatments.reduce((sum, t) => sum + t.count, 0),
      totalRevenue: treatments.reduce((sum, t) => sum + t.revenue, 0),
      averageRevenuePerTreatment: treatments.length > 0 ? 
        treatments.reduce((sum, t) => sum + t.revenue, 0) / treatments.length : 0
    }
  };
}

/**
 * Generar reporte de flujo de caja
 */
async function generateCashFlowReport(startDate, endDate) {
  const cashFlowQuery = await databaseService.query(
    `SELECT 
       DATE_TRUNC('day', payment_date) as date,
       COUNT(*) as payments_count,
       COALESCE(SUM(amount), 0) as daily_collections,
       COALESCE(AVG(amount), 0) as avg_payment
     FROM invoice_payments
     WHERE DATE(payment_date) >= $1 AND DATE(payment_date) < $2
     GROUP BY DATE_TRUNC('day', payment_date)
     ORDER BY date DESC`,
    [startDate, endDate]
  );

  return {
    dailyCollections: cashFlowQuery.rows.map(row => ({
      date: row.date,
      payments: parseInt(row.payments_count),
      collections: parseFloat(row.daily_collections),
      averagePayment: parseFloat(row.avg_payment)
    }))
  };
}

/**
 * Generar reporte de rentabilidad
 */
async function generateProfitabilityReport(startDate, endDate) {
  const profitabilityQuery = await databaseService.query(
    `SELECT 
       a.treatment_type,
       COUNT(DISTINCT a.patient_id) as patients,
       COUNT(a.id) as treatments,
       COALESCE(SUM(i.total_amount), 0) as revenue,
       COALESCE(SUM(et.amount), 0) as direct_costs,
       COALESCE(SUM(CASE 
         WHEN et.category = 'SUPPLIES' THEN et.amount * 0.3 
         ELSE et.amount 
       END), 0) as allocated_costs,
       COALESCE(SUM(i.total_amount) - 
         COALESCE(SUM(CASE 
           WHEN et.category = 'SUPPLIES' THEN et.amount * 0.3 
           ELSE et.amount 
         END), 0), 0) as profit
     FROM appointments a
     LEFT JOIN invoices i ON a.patient_id = i.patient_id 
       AND DATE(i.invoice_date) BETWEEN $1 AND $2
       AND i.payment_status = 'paid'
     LEFT JOIN expense_transactions et ON DATE(et.transaction_date) BETWEEN $1 AND $2
     WHERE DATE(a.appointment_date) BETWEEN $1 AND $2
       AND a.treatment_type IS NOT NULL
       AND a.treatment_type != ''
     GROUP BY a.treatment_type
     ORDER BY profit DESC`,
    [startDate, endDate]
  );

  return {
    treatmentProfitability: profitabilityQuery.rows.map(row => ({
      treatmentType: row.treatment_type,
      patients: parseInt(row.patients),
      treatments: parseInt(row.treatments),
      revenue: parseFloat(row.revenue),
      directCosts: parseFloat(row.direct_costs),
      allocatedCosts: parseFloat(row.allocated_costs),
      profit: parseFloat(row.profit),
      profitMargin: parseFloat(row.revenue) > 0 ? 
        (parseFloat(row.profit) / parseFloat(row.revenue)) * 100 : 0,
      costPerPatient: parseInt(row.patients) > 0 ? 
        parseFloat(row.direct_costs) / parseInt(row.patients) : 0
    }))
  };
}

// ==============================================
// CONTROLADOR DE ESTADÍSTICAS
// ==============================================

/**
 * Obtener estadísticas financieras
 * GET /api/accounting/stats
 */
async function getStats(req, res) {
  try {
    // Verificar permisos
    if (!hasPermission(req.user, 'invoices.read') && !hasPermission(req.user, 'reports.read')) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tienes permisos para ver estadísticas financieras'
      });
    }

    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = thisMonthStart;

    // Estadísticas del mes actual
    const currentMonthStatsQuery = await databaseService.query(
      `SELECT 
         COUNT(*) as total_invoices,
         COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_invoices,
         COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
         COALESCE(AVG(CASE WHEN payment_status = 'paid' THEN total_amount ELSE NULL END), 0) as avg_invoice
       FROM invoices
       WHERE DATE(invoice_date) >= $1 AND DATE(invoice_date) < $2`,
      [thisMonthStart, thisMonthEnd]
    );

    // Estadísticas del mes anterior
    const lastMonthStatsQuery = await databaseService.query(
      `SELECT 
         COUNT(*) as total_invoices,
         COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_invoices,
         COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue
       FROM invoices
       WHERE DATE(invoice_date) >= $1 AND DATE(invoice_date) < $2`,
      [lastMonthStart, lastMonthEnd]
    );

    // KPIs generales
    const kpisQuery = await databaseService.query(
      `SELECT 
         (SELECT COUNT(DISTINCT patient_id) FROM appointments WHERE DATE(appointment_date) >= $1) as active_patients,
         (SELECT COUNT(DISTINCT treatment_type) FROM appointments WHERE DATE(appointment_date) >= $1 AND treatment_type IS NOT NULL) as treatment_types,
         (SELECT AVG(total_amount) FROM invoices WHERE payment_status = 'paid' AND DATE(invoice_date) >= $1) as avg_transaction_value,
         (SELECT COUNT(*) FROM invoices WHERE payment_status = 'pending' AND due_date < NOW()) as overdue_invoices`,
      [thisMonthStart]
    );

    const currentMonth = currentMonthStatsQuery.rows[0];
    const lastMonth = lastMonthStatsQuery.rows[0];
    const kpis = kpisQuery.rows[0];

    // Calcular tendencias
    const currentRevenue = parseFloat(currentMonth.revenue);
    const lastRevenue = parseFloat(lastMonth.revenue);
    const revenueGrowth = lastRevenue > 0 ? 
      ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    res.json({
      success: true,
      data: {
        currentMonth: {
          invoices: parseInt(currentMonth.total_invoices),
          paidInvoices: parseInt(currentMonth.paid_invoices),
          revenue: currentRevenue,
          averageInvoice: parseFloat(currentMonth.avg_invoice)
        },
        previousMonth: {
          invoices: parseInt(lastMonth.total_invoices),
          paidInvoices: parseInt(lastMonth.paid_invoices),
          revenue: lastRevenue
        },
        trends: {
          revenueGrowth: Math.round(revenueGrowth * 100) / 100,
          invoiceGrowth: lastMonth.total_invoices > 0 ? 
            ((currentMonth.total_invoices - lastMonth.total_invoices) / lastMonth.total_invoices) * 100 : 0
        },
        kpis: {
          activePatients: parseInt(kpis.active_patients),
          treatmentTypes: parseInt(kpis.treatment_types),
          avgTransactionValue: parseFloat(kpis.avg_transaction_value),
          overdueInvoices: parseInt(kpis.overdue_invoices)
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error(`Error al obtener estadísticas: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Error al obtener estadísticas',
      message: 'No se pudieron cargar las estadísticas financieras'
    });
  }
}

// ==============================================
// EXPORTACIÓN DE FUNCIONES
// ==============================================

module.exports = {
  // Controladores principales
  getSummaries,
  generateReports,
  getStats,
  
  // Funciones auxiliares
  getPeriodDates,
  calculateFinancialMetrics,
  getTopTreatmentsByIncome,
  getPatientValueAnalysis,
  
  // Generadores de reportes
  generateSummaryReport,
  generatePatientAnalysisReport,
  generateTreatmentAnalysisReport,
  generateCashFlowReport,
  generateProfitabilityReport,
  
  // Configuraciones
  ACCOUNTING_CATEGORIES,
  FINANCIAL_PERIODS
};
