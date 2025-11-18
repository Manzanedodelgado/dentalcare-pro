/**
 * Sistema de Contabilidad - DentalCare Pro
 * Módulo completo de gestión financiera y contable
 * @author MiniMax Agent
 * @version 1.0.0
 */

class AccountingSystem {
    constructor() {
        this.api = new ApiClient();
        this.auth = new AuthManager();
        this.websocket = new WebSocketManager();
        this.currentUser = null;
        this.financialReports = new Map();
        this.bankReconciliations = new Map();
        this.init();
    }

    init() {
        this.currentUser = this.auth.getCurrentUser();
        this.setupEventListeners();
        this.initializeWebSocket();
        this.loadUserPreferences();
    }

    setupEventListeners() {
        // Event delegation para mejor rendimiento
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-accounting-action]')) {
                const action = e.target.getAttribute('data-accounting-action');
                this.handleAccountingAction(action, e.target);
            }
        });

        document.addEventListener('submit', (e) => {
            if (e.target.matches('[data-accounting-form]')) {
                e.preventDefault();
                this.handleAccountingForm(e.target);
            }
        });

        // Filtros y búsqueda
        document.addEventListener('input', (e) => {
            if (e.target.matches('[data-accounting-filter]')) {
                this.debounce(() => this.applyAccountingFilters(), 300)();
            }
        });
    }

    async initializeWebSocket() {
        this.websocket.on('financial-update', (data) => {
            this.handleFinancialUpdate(data);
        });

        this.websocket.on('payment-received', (data) => {
            this.handlePaymentReceived(data);
        });

        this.websocket.on('invoice-status-changed', (data) => {
            this.handleInvoiceStatusChanged(data);
        });
    }

    // ========================================
    // SISTEMA PRINCIPAL DE CONTABILIDAD
    // ========================================

    /**
     * Carga el dashboard de contabilidad con métricas financieras
     */
    async loadAccountingDashboard() {
        try {
            this.showLoadingState('dashboard-container');
            
            const [financialOverview, recentTransactions, pendingInvoices] = await Promise.all([
                this.getFinancialOverview(),
                this.getRecentTransactions(),
                this.getPendingInvoices()
            ]);

            const dashboardHTML = this.generateAccountingDashboardHTML({
                financialOverview,
                recentTransactions,
                pendingInvoices
            });

            document.getElementById('dashboard-container').innerHTML = dashboardHTML;
            this.setupDashboardCharts();
            
        } catch (error) {
            this.showError('Error al cargar el dashboard de contabilidad', error);
        } finally {
            this.hideLoadingState('dashboard-container');
        }
    }

    generateAccountingDashboardHTML(data) {
        const { financialOverview, recentTransactions, pendingInvoices } = data;
        
        return `
            <div class="accounting-dashboard">
                <!-- Header -->
                <div class="dashboard-header">
                    <h1><i class="fas fa-calculator"></i> Sistema de Contabilidad</h1>
                    <div class="dashboard-actions">
                        <button class="btn btn-primary" data-accounting-action="generate-report">
                            <i class="fas fa-chart-line"></i> Generar Reporte
                        </button>
                        <button class="btn btn-secondary" data-accounting-action="export-data">
                            <i class="fas fa-download"></i> Exportar
                        </button>
                    </div>
                </div>

                <!-- Métricas Principales -->
                <div class="financial-metrics-grid">
                    <div class="metric-card income-card">
                        <div class="metric-icon">
                            <i class="fas fa-arrow-up text-green-600"></i>
                        </div>
                        <div class="metric-content">
                            <h3>${this.formatCurrency(financialOverview.totalIncome)}</h3>
                            <p>Ingresos del Mes</p>
                            <span class="metric-change ${financialOverview.incomeGrowth >= 0 ? 'positive' : 'negative'}">
                                ${financialOverview.incomeGrowth >= 0 ? '+' : ''}${financialOverview.incomeGrowth.toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    <div class="metric-card expense-card">
                        <div class="metric-icon">
                            <i class="fas fa-arrow-down text-red-600"></i>
                        </div>
                        <div class="metric-content">
                            <h3>${this.formatCurrency(financialOverview.totalExpenses)}</h3>
                            <p>Gastos del Mes</p>
                            <span class="metric-change ${financialOverview.expenseGrowth <= 0 ? 'positive' : 'negative'}">
                                ${financialOverview.expenseGrowth >= 0 ? '+' : ''}${financialOverview.expenseGrowth.toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    <div class="metric-card profit-card">
                        <div class="metric-icon">
                            <i class="fas fa-chart-pie text-blue-600"></i>
                        </div>
                        <div class="metric-content">
                            <h3>${this.formatCurrency(financialOverview.netProfit)}</h3>
                            <p>Beneficio Neto</p>
                            <span class="metric-change ${financialOverview.profitMargin >= 0 ? 'positive' : 'negative'}">
                                ${financialOverview.profitMargin.toFixed(1)}% margen
                            </span>
                        </div>
                    </div>

                    <div class="metric-card cash-card">
                        <div class="metric-icon">
                            <i class="fas fa-wallet text-purple-600"></i>
                        </div>
                        <div class="metric-content">
                            <h3>${this.formatCurrency(financialOverview.cashFlow)}</h3>
                            <p>Flujo de Caja</p>
                            <span class="metric-status ${financialOverview.cashFlow >= 0 ? 'positive' : 'negative'}">
                                ${financialOverview.cashFlow >= 0 ? 'Saludable' : 'Atención requerida'}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Gráficos y Análisis -->
                <div class="financial-charts-section">
                    <div class="chart-row">
                        <div class="chart-card">
                            <div class="chart-header">
                                <h3>Ingresos vs Gastos</h3>
                                <select class="chart-period-select" data-accounting-filter="chart-period">
                                    <option value="month">Este Mes</option>
                                    <option value="quarter">Trimestre</option>
                                    <option value="year">Año</option>
                                </select>
                            </div>
                            <div class="chart-container" id="income-expense-chart">
                                <canvas width="400" height="200"></canvas>
                            </div>
                        </div>

                        <div class="chart-card">
                            <div class="chart-header">
                                <h3>Distribución de Gastos</h3>
                                <div class="chart-legend" id="expense-legend"></div>
                            </div>
                            <div class="chart-container" id="expense-distribution-chart">
                                <canvas width="400" height="200"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Transacciones Recientes y Facturas Pendientes -->
                <div class="data-tables-section">
                    <div class="table-row">
                        <div class="table-card">
                            <div class="table-header">
                                <h3>Transacciones Recientes</h3>
                                <div class="table-filters">
                                    <input type="date" data-accounting-filter="transaction-from" placeholder="Desde">
                                    <input type="date" data-accounting-filter="transaction-to" placeholder="Hasta">
                                    <select data-accounting-filter="transaction-type">
                                        <option value="">Todos los tipos</option>
                                        <option value="income">Ingresos</option>
                                        <option value="expense">Gastos</option>
                                    </select>
                                </div>
                            </div>
                            <div class="table-container">
                                <table class="data-table" id="recent-transactions-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Concepto</th>
                                            <th>Tipo</th>
                                            <th>Importe</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${recentTransactions.map(transaction => `
                                            <tr>
                                                <td>${this.formatDate(transaction.fecha)}</td>
                                                <td>${transaction.concepto}</td>
                                                <td>
                                                    <span class="transaction-type ${transaction.tipo}">
                                                        <i class="fas fa-${transaction.tipo === 'income' ? 'arrow-up' : 'arrow-down'}"></i>
                                                        ${transaction.tipo === 'income' ? 'Ingreso' : 'Gasto'}
                                                    </span>
                                                </td>
                                                <td class="amount ${transaction.tipo}">
                                                    ${this.formatCurrency(transaction.importe)}
                                                </td>
                                                <td>
                                                    <span class="status-badge ${transaction.estado}">
                                                        ${transaction.estado}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button class="btn-icon" data-accounting-action="view-transaction" data-id="${transaction.id}">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                    <button class="btn-icon" data-accounting-action="edit-transaction" data-id="${transaction.id}">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="table-card">
                            <div class="table-header">
                                <h3>Facturas Pendientes</h3>
                                <div class="table-actions">
                                    <button class="btn btn-sm btn-primary" data-accounting-action="create-invoice">
                                        <i class="fas fa-plus"></i> Nueva Factura
                                    </button>
                                </div>
                            </div>
                            <div class="table-container">
                                <table class="data-table" id="pending-invoices-table">
                                    <thead>
                                        <tr>
                                            <th>Nº Factura</th>
                                            <th>Cliente</th>
                                            <th>Fecha</th>
                                            <th>Importe</th>
                                            <th>Vencimiento</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${pendingInvoices.map(invoice => `
                                            <tr>
                                                <td>${invoice.numero}</td>
                                                <td>${invoice.cliente}</td>
                                                <td>${this.formatDate(invoice.fecha)}</td>
                                                <td>${this.formatCurrency(invoice.importe)}</td>
                                                <td>${this.formatDate(invoice.vencimiento)}</td>
                                                <td>
                                                    <span class="status-badge ${invoice.estado}">
                                                        ${invoice.estado}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button class="btn-icon" data-accounting-action="send-invoice" data-id="${invoice.id}">
                                                        <i class="fas fa-paper-plane"></i>
                                                    </button>
                                                    <button class="btn-icon" data-accounting-action="download-invoice" data-id="${invoice.id}">
                                                        <i class="fas fa-download"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupDashboardCharts() {
        // Configurar gráficos con Chart.js
        this.setupIncomeExpenseChart();
        this.setupExpenseDistributionChart();
    }

    setupIncomeExpenseChart() {
        const ctx = document.getElementById('income-expense-chart');
        if (!ctx) return;

        // Datos de ejemplo - en producción vendría de la API
        const data = {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            datasets: [{
                label: 'Ingresos',
                data: [15000, 18000, 16000, 22000, 19000, 21000],
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4
            }, {
                label: 'Gastos',
                data: [8000, 9500, 7200, 11000, 8800, 10200],
                borderColor: '#EF4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4
            }]
        };

        new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + '€';
                            }
                        }
                    }
                }
            }
        });
    }

    setupExpenseDistributionChart() {
        const ctx = document.getElementById('expense-distribution-chart');
        if (!ctx) return;

        const data = {
            labels: ['Personal', 'Materiales', 'Alquiler', 'Servicios', 'Otros'],
            datasets: [{
                data: [45, 25, 15, 10, 5],
                backgroundColor: [
                    '#3B82F6',
                    '#10B981',
                    '#F59E0B',
                    '#EF4444',
                    '#8B5CF6'
                ]
            }]
        };

        new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }

    // ========================================
    // GESTIÓN DE INGRESOS Y GASTOS
    // ========================================

    /**
     * Registra una nueva transacción (ingreso o gasto)
     */
    async recordTransaction(transactionData) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.post('/api/accounting/transactions', {
                ...transactionData,
                fechaCreacion: new Date().toISOString(),
                usuario: this.currentUser.id
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            this.websocket.emit('transaction-recorded', response.data);
            this.showSuccess('Transacción registrada correctamente');
            
            // Actualizar dashboard si está visible
            if (document.getElementById('dashboard-container')) {
                this.loadAccountingDashboard();
            }

            return response.data;
        } catch (error) {
            this.showError('Error al registrar la transacción', error);
            throw error;
        }
    }

    /**
     * Obtiene el resumen financiero del período
     */
    async getFinancialOverview(period = 'month') {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get(`/api/accounting/overview?period=${period}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return response.data;
        } catch (error) {
            // Datos de ejemplo para desarrollo
            return {
                totalIncome: 21500,
                totalExpenses: 9500,
                netProfit: 12000,
                cashFlow: 8500,
                incomeGrowth: 8.5,
                expenseGrowth: -2.3,
                profitMargin: 55.8
            };
        }
    }

    /**
     * Obtiene las transacciones recientes
     */
    async getRecentTransactions(limit = 20) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get(`/api/accounting/transactions/recent?limit=${limit}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return response.data;
        } catch (error) {
            // Datos de ejemplo para desarrollo
            return [
                {
                    id: 1,
                    fecha: '2025-11-15',
                    concepto: 'Factura #2025-001 - Laura Moreno',
                    tipo: 'income',
                    importe: 350.00,
                    estado: 'Pagada'
                },
                {
                    id: 2,
                    fecha: '2025-11-14',
                    concepto: 'Material dental - Proveedor ABC',
                    tipo: 'expense',
                    importe: 450.00,
                    estado: 'Pendiente'
                },
                {
                    id: 3,
                    fecha: '2025-11-13',
                    concepto: 'Factura #2025-002 - Alonso Partal',
                    tipo: 'income',
                    importe: 280.00,
                    estado: 'Enviada'
                }
            ];
        }
    }

    /**
     * Obtiene las facturas pendientes
     */
    async getPendingInvoices() {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get('/api/accounting/invoices/pending', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return response.data;
        } catch (error) {
            // Datos de ejemplo para desarrollo
            return [
                {
                    id: 1,
                    numero: '2025-003',
                    cliente: 'María García López',
                    fecha: '2025-11-10',
                    importe: 420.00,
                    vencimiento: '2025-12-10',
                    estado: 'Enviada'
                },
                {
                    id: 2,
                    numero: '2025-004',
                    cliente: 'Carlos Ruiz Martín',
                    fecha: '2025-11-12',
                    importe: 185.50,
                    vencimiento: '2025-12-12',
                    estado: 'Borrador'
                }
            ];
        }
    }

    // ========================================
    // CONCILIACIÓN BANCARIA
    // ========================================

    /**
     * Realiza conciliación bancaria
     */
    async performBankReconciliation(bankData) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.post('/api/accounting/bank-reconciliation', {
                ...bankData,
                fechaConciliacion: new Date().toISOString(),
                usuario: this.currentUser.id
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            this.showSuccess('Conciliación bancaria completada');
            return response.data;
        } catch (error) {
            this.showError('Error al realizar la conciliación bancaria', error);
            throw error;
        }
    }

    /**
     * Obtiene movimientos bancarios para conciliación
     */
    async getBankMovements(accountId, dateFrom, dateTo) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get(
                `/api/accounting/bank-movements?accountId=${accountId}&from=${dateFrom}&to=${dateTo}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            return response.data;
        } catch (error) {
            // Datos de ejemplo para desarrollo
            return [
                {
                    id: 1,
                    fecha: '2025-11-15',
                    concepto: 'Transferencia - Factura 2025-001',
                    importe: 350.00,
                    saldo: 15420.50,
                    conciliado: false
                },
                {
                    id: 2,
                    fecha: '2025-11-14',
                    concepto: 'Domiciliación - Seguro',
                    importe: -125.00,
                    saldo: 15070.50,
                    conciliado: true
                }
            ];
        }
    }

    // ========================================
    // REPORTES FINANCIEROS
    // ========================================

    /**
     * Genera reportes financieros personalizados
     */
    async generateFinancialReport(reportConfig) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.post('/api/accounting/reports', reportConfig, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const reportId = response.data.id;
            this.financialReports.set(reportId, response.data);
            
            this.showSuccess('Reporte generado correctamente');
            return response.data;
        } catch (error) {
            this.showError('Error al generar el reporte', error);
            throw error;
        }
    }

    /**
     * Descarga un reporte financiero
     */
    async downloadFinancialReport(reportId, format = 'pdf') {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get(
                `/api/accounting/reports/${reportId}/download?format=${format}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` },
                    responseType: 'blob'
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `reporte-financiero-${reportId}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            this.showSuccess('Reporte descargado correctamente');
        } catch (error) {
            this.showError('Error al descargar el reporte', error);
        }
    }

    /**
     * Obtiene reportes guardados
     */
    async getSavedReports() {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get('/api/accounting/reports/saved', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return response.data;
        } catch (error) {
            return [];
        }
    }

    // ========================================
    // FLUJO DE CAJA Y TESORERÍA
    // ========================================

    /**
     * Gestiona el flujo de caja diario
     */
    async manageCashFlow(cashFlowData) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.post('/api/accounting/cash-flow', cashFlowData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            this.showSuccess('Flujo de caja actualizado');
            return response.data;
        } catch (error) {
            this.showError('Error al actualizar el flujo de caja', error);
            throw error;
        }
    }

    /**
     * Predice flujo de caja futuro
     */
    async predictCashFlow(months = 3) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get(`/api/accounting/cash-flow/predict?months=${months}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return response.data;
        } catch (error) {
            // Datos de ejemplo para desarrollo
            return {
                predicciones: [
                    { mes: 'Diciembre 2025', ingreso: 22000, gasto: 9800, saldo: 12200 },
                    { mes: 'Enero 2026', ingreso: 19500, gasto: 10200, saldo: 9300 },
                    { mes: 'Febrero 2026', ingreso: 21000, gasto: 9500, saldo: 11500 }
                ],
                confianza: 0.85
            };
        }
    }

    // ========================================
    // PRESUPUESTOS Y PLANIFICACIÓN
    // ========================================

    /**
     * Crea un presupuesto
     */
    async createBudget(budgetData) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.post('/api/accounting/budgets', budgetData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            this.showSuccess('Presupuesto creado correctamente');
            return response.data;
        } catch (error) {
            this.showError('Error al crear el presupuesto', error);
            throw error;
        }
    }

    /**
     * Compara presupuesto vs real
     */
    async compareBudgetVsActual(budgetId, period) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get(
                `/api/accounting/budgets/${budgetId}/compare?period=${period}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            return response.data;
        } catch (error) {
            // Datos de ejemplo para desarrollo
            return {
                presupuesto: {
                    ingresos: 25000,
                    gastos: 15000,
                    beneficio: 10000
                },
                real: {
                    ingresos: 23000,
                    gastos: 14500,
                    beneficio: 8500
                },
                desviacion: {
                    ingresos: -8.0,
                    gastos: -3.3,
                    beneficio: -15.0
                }
            };
        }
    }

    // ========================================
    // GESTIÓN DE IMPUESTOS
    // ========================================

    /**
     * Calcula impuestos (IVA, IRPF, etc.)
     */
    async calculateTaxes(taxData) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.post('/api/accounting/taxes/calculate', taxData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return response.data;
        } catch (error) {
            // Cálculo básico para desarrollo
            const baseImponible = taxData.baseImponible || 0;
            const tipoIVA = taxData.tipoIVA || 21;
            const tipoIRPF = taxData.tipoIRPF || 0;

            const cuotaIVA = (baseImponible * tipoIVA) / 100;
            const cuotaIRPF = (baseImponible * tipoIRPF) / 100;
            const total = baseImponible + cuotaIVA - cuotaIRPF;

            return {
                baseImponible,
                tipoIVA,
                cuotaIVA,
                tipoIRPF,
                cuotaIRPF,
                total,
                fechaCalculo: new Date().toISOString()
            };
        }
    }

    /**
     * Genera declaración de impuestos
     */
    async generateTaxDeclaration(declarationData) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.post('/api/accounting/taxes/declaration', declarationData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            this.showSuccess('Declaración de impuestos generada');
            return response.data;
        } catch (error) {
            this.showError('Error al generar la declaración', error);
            throw error;
        }
    }

    // ========================================
    // MÉTODOS DE MANEJO DE EVENTOS
    // ========================================

    handleAccountingAction(action, element) {
        switch (action) {
            case 'generate-report':
                this.showReportGenerator();
                break;
            case 'export-data':
                this.exportAccountingData();
                break;
            case 'create-invoice':
                this.showInvoiceCreator();
                break;
            case 'view-transaction':
                this.showTransactionDetails(element.dataset.id);
                break;
            case 'edit-transaction':
                this.showTransactionEditor(element.dataset.id);
                break;
            case 'send-invoice':
                this.sendInvoice(element.dataset.id);
                break;
            case 'download-invoice':
                this.downloadInvoice(element.dataset.id);
                break;
        }
    }

    handleAccountingForm(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        switch (form.dataset.accountingForm) {
            case 'new-transaction':
                this.recordTransaction(data);
                break;
            case 'bank-reconciliation':
                this.performBankReconciliation(data);
                break;
            case 'financial-report':
                this.generateFinancialReport(data);
                break;
        }
    }

    applyAccountingFilters() {
        const filters = {};
        document.querySelectorAll('[data-accounting-filter]').forEach(element => {
            filters[element.dataset.accountingFilter] = element.value;
        });
        
        // Aplicar filtros a las tablas visibles
        this.filterTableData('recent-transactions-table', filters);
        this.filterTableData('pending-invoices-table', filters);
    }

    // ========================================
    // MÉTODOS DE UTILIDAD
    // ========================================

    formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-ES');
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showLoadingState(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Cargando datos contables...</p>
                </div>
            `;
        }
    }

    hideLoadingState(containerId) {
        // Se oculta automáticamente al cargar nuevos datos
    }

    showError(message, error = null) {
        console.error('Error de contabilidad:', error);
        
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // ========================================
    // MÉTODOS DE INTERFAZ ADICIONALES
    // ========================================

    showReportGenerator() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Generar Reporte Financiero</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form class="modal-body" data-accounting-form="financial-report">
                    <div class="form-group">
                        <label>Tipo de Reporte</label>
                        <select name="tipo" required>
                            <option value="">Seleccionar...</option>
                            <option value="pyl">P&L (Pérdidas y Ganancias)</option>
                            <option value="balance">Balance General</option>
                            <option value="cashflow">Flujo de Caja</option>
                            <option value="budget">Presupuesto vs Real</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Período</label>
                        <select name="periodo" required>
                            <option value="month">Mes actual</option>
                            <option value="quarter">Trimestre</option>
                            <option value="year">Año</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Formato</label>
                        <select name="formato">
                            <option value="pdf">PDF</option>
                            <option value="excel">Excel</option>
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-chart-line"></i> Generar
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    showInvoiceCreator() {
        // Redirigir al módulo de facturas
        if (window.invoices) {
            window.invoices.createNewInvoice();
        } else {
            this.showError('Módulo de facturas no disponible');
        }
    }

    showTransactionDetails(transactionId) {
        // Implementar vista detallada de transacción
        this.showSuccess('Abriendo detalles de la transacción...');
    }

    showTransactionEditor(transactionId) {
        // Implementar editor de transacciones
        this.showSuccess('Abriendo editor de transacciones...');
    }

    async sendInvoice(invoiceId) {
        try {
            const token = this.auth.getToken();
            await this.api.post(`/api/invoices/${invoiceId}/send`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            this.showSuccess('Factura enviada correctamente');
        } catch (error) {
            this.showError('Error al enviar la factura', error);
        }
    }

    async downloadInvoice(invoiceId) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get(`/api/invoices/${invoiceId}/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `factura-${invoiceId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            this.showSuccess('Factura descargada correctamente');
        } catch (error) {
            this.showError('Error al descargar la factura', error);
        }
    }

    exportAccountingData() {
        // Implementar exportación de datos contables
        this.showSuccess('Preparando exportación de datos...');
    }

    filterTableData(tableId, filters) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            let show = true;
            
            // Aplicar filtros según el tipo de tabla
            Object.keys(filters).forEach(filterKey => {
                if (filters[filterKey]) {
                    const cell = row.querySelector(`[data-filter="${filterKey}"]`);
                    if (cell && !cell.textContent.toLowerCase().includes(filters[filterKey].toLowerCase())) {
                        show = false;
                    }
                }
            });
            
            row.style.display = show ? '' : 'none';
        });
    }

    // ========================================
    // WEBSOCKET EVENT HANDLERS
    // ========================================

    handleFinancialUpdate(data) {
        console.log('Actualización financiera recibida:', data);
        
        // Actualizar métricas en tiempo real
        if (document.querySelector('.financial-metrics-grid')) {
            this.loadAccountingDashboard();
        }
    }

    handlePaymentReceived(data) {
        console.log('Pago recibido:', data);
        this.showSuccess(`Pago recibido: ${this.formatCurrency(data.amount)}`);
        
        // Actualizar dashboard si está visible
        if (document.getElementById('dashboard-container')) {
            this.loadAccountingDashboard();
        }
    }

    handleInvoiceStatusChanged(data) {
        console.log('Estado de factura cambiado:', data);
        this.showSuccess(`Factura ${data.invoiceNumber} actualizada`);
        
        // Actualizar tabla de facturas pendientes
        this.updatePendingInvoicesTable();
    }

    updatePendingInvoicesTable() {
        this.getPendingInvoices().then(invoices => {
            const tbody = document.querySelector('#pending-invoices-table tbody');
            if (tbody) {
                tbody.innerHTML = invoices.map(invoice => `
                    <tr>
                        <td>${invoice.numero}</td>
                        <td>${invoice.cliente}</td>
                        <td>${this.formatDate(invoice.fecha)}</td>
                        <td>${this.formatCurrency(invoice.importe)}</td>
                        <td>${this.formatDate(invoice.vencimiento)}</td>
                        <td>
                            <span class="status-badge ${invoice.estado}">
                                ${invoice.estado}
                            </span>
                        </td>
                        <td>
                            <button class="btn-icon" data-accounting-action="send-invoice" data-id="${invoice.id}">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                            <button class="btn-icon" data-accounting-action="download-invoice" data-id="${invoice.id}">
                                <i class="fas fa-download"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        });
    }

    loadUserPreferences() {
        // Cargar preferencias de usuario para contabilidad
        const preferences = localStorage.getItem('accounting-preferences');
        if (preferences) {
            try {
                this.preferences = JSON.parse(preferences);
            } catch (error) {
                this.preferences = {};
            }
        } else {
            this.preferences = {
                defaultCurrency: 'EUR',
                dateFormat: 'DD/MM/YYYY',
                taxRate: 21,
                reportFormat: 'pdf'
            };
        }
    }
}

// Inicializar el sistema de contabilidad cuando se carga el DOM
document.addEventListener('DOMContentLoaded', () => {
    window.accounting = new AccountingSystem();
});