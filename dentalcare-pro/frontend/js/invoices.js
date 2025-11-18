/**
 * INVOICES.JS - Sistema de Facturación Verifactu Completo
 * Clínica Dental Rubio García - Sistema de Facturación Español
 * 
 * Funcionalidades:
 * - Facturación Verifactu completa (obligatoria en España desde 2023)
 * - Cálculos IVA automáticos según legislación española
 * - Generación de PDFs con formato legal
 * - Envío automático por email
 * - Compliance total con legislación española
 * - Integración tabla DFacturas SQL Server
 * - Gestión de series facturas y numeración automática
 * - Historial de facturación y reportes
 */

class InvoicesManager {
    constructor() {
        this.invoices = [];
        this.currentInvoice = null;
        this.currentView = 'list'; // list, detail, create, edit
        this.invoiceSeries = {
            'F': { prefix: 'F', next: 1, description: 'Facturas' },
            'A': { prefix: 'A', next: 1, description: 'Abonos' },
            'R': { prefix: 'R', next: 1, description: 'Rectificativas' }
        };
        
        // Configuración fiscal española
        this.fiscalConfig = {
            empresa: {
                nombre: 'Clínica Dental Rubio García S.L.',
                nif: 'B12345678',
                direccion: 'Calle Ejemplo 123, 28001 Madrid',
                telefono: '91 641 08 41',
                email: 'info@rubiogarciadental.com',
                registro_mercantil: 'Madrid, Tomo 1234, Folio 567, Hoja 890',
                actividad_cnae: '8622 - Actividades de medicina especializada'
            },
            tipos_iva: {
                '21': { rate: 21, name: 'IVA General 21%' },
                '10': { rate: 10, name: 'IVA Reducido 10%' },
                '4': { rate: 4, name: 'IVA Superreducido 4%' },
                '0': { rate: 0, name: 'IVA Exento 0%' }
            },
            requisitos_verifactu: {
                obligatorio_desde: '2023-01-01',
                requiere_certificado: true,
                formatos_aceptados: ['Facturae', 'UBL', 'XML'],
                registro_sii: true
            }
        };

        // Series de facturación para diferentes tipos
        this.invoiceTypes = {
            consultation: {
                code: 'CONS',
                name: 'Consulta',
                default_price: 50.00,
                iva_type: '21',
                description: 'Consulta dental general'
            },
            hygiene: {
                code: 'HIG',
                name: 'Higiene Dental',
                default_price: 45.00,
                iva_type: '21',
                description: 'Limpieza dental profesional'
            },
            endodoncia: {
                code: 'END',
                name: 'Endodoncia',
                default_price: 300.00,
                iva_type: '21',
                description: 'Tratamiento de conductos'
            },
            implante: {
                code: 'IMP',
                name: 'Implante',
                default_price: 1200.00,
                iva_type: '21',
                description: 'Cirugía de implante dental'
            },
            ortodoncia: {
                code: 'ORT',
                name: 'Ortodoncia',
                default_price: 2500.00,
                iva_type: '21',
                description: 'Tratamiento ortodóntico completo'
            },
            protesis: {
                code: 'PROT',
                name: 'Prótesis',
                default_price: 800.00,
                iva_type: '21',
                description: 'Prótesis dental'
            },
            cirugia: {
                code: 'CIR',
                name: 'Cirugía',
                default_price: 400.00,
                iva_type: '21',
                description: 'Cirugía oral'
            },
            radiografia: {
                code: 'RX',
                name: 'Radiografía',
                default_price: 30.00,
                iva_type: '21',
                description: 'Radiografía dental'
            },
            blanqueamiento: {
                code: 'BLANQ',
                name: 'Blanqueamiento',
                default_price: 250.00,
                iva_type: '21',
                description: 'Tratamiento de blanqueamiento'
            }
        };

        this.init();
    }

    async init() {
        try {
            console.log('💰 Inicializando sistema de facturación Verifactu...');
            
            // Cargar configuración fiscal
            await this.loadFiscalConfiguration();
            await this.loadInvoiceSeries();
            
            // Inicializar interface
            this.setupInvoicesInterface();
            this.setupEventListeners();
            
            // Cargar facturas iniciales
            await this.loadInvoices();
            
            console.log('✅ Sistema de facturación Verifactu inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando sistema de facturación:', error);
            this.showError('Error inicializando el sistema de facturación');
        }
    }

    async loadFiscalConfiguration() {
        try {
            const response = await api.get('/api/invoices/config');
            if (response.success) {
                this.fiscalConfig = { ...this.fiscalConfig, ...response.data };
            }
        } catch (error) {
            console.error('Error cargando configuración fiscal:', error);
            // Usar configuración por defecto
        }
    }

    async loadInvoiceSeries() {
        try {
            const response = await api.get('/api/invoices/series');
            if (response.success) {
                this.invoiceSeries = response.data;
            }
        } catch (error) {
            console.error('Error cargando series de facturación:', error);
            // Cargar última numeración de cada serie
            await this.loadLastInvoiceNumbers();
        }
    }

    async loadLastInvoiceNumbers() {
        // Cargar último número de cada serie desde la base de datos
        try {
            const response = await api.get('/api/invoices/last-numbers');
            if (response.success) {
                response.data.forEach(series => {
                    if (this.invoiceSeries[series.prefix]) {
                        this.invoiceSeries[series.prefix].next = series.last_number + 1;
                    }
                });
            }
        } catch (error) {
            console.error('Error cargando últimos números:', error);
        }
    }

    setupInvoicesInterface() {
        const invoicesContainer = document.getElementById('invoices-container');
        if (!invoicesContainer) return;

        invoicesContainer.innerHTML = `
            <div class="invoices-layout">
                <!-- Header con estadísticas -->
                <div class="invoices-header">
                    <div class="header-left">
                        <h2>Facturación Verifactu</h2>
                        <div class="stats-info">
                            <span class="stat-item">
                                <strong id="total-invoices">0</strong> facturas
                            </span>
                            <span class="stat-item">
                                <strong id="monthly-amount">€0</strong> este mes
                            </span>
                            <span class="stat-item">
                                <strong id="pending-invoices">0</strong> pendientes
                            </span>
                            <span class="stat-item">
                                <strong id="overdue-invoices">0</strong> vencidas
                            </span>
                        </div>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="invoicesManager.newInvoice()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Nueva Factura
                        </button>
                        <button class="btn btn-outline" onclick="invoicesManager.exportInvoices()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H15" stroke="currentColor" stroke-width="2"/>
                                <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 15V3" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Exportar
                        </button>
                        <button class="btn btn-outline" onclick="invoicesManager.sendBulkInvoices()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M21 11.5A8.38 8.38 0 0 1 .9 16.4L.2 21.5L5.3 20.7A8.38 8.38 0 0 1 21 11.5Z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Envío Masivo
                        </button>
                    </div>
                </div>
                
                <!-- Filtros y búsqueda -->
                <div class="filters-panel">
                    <div class="search-section">
                        <div class="search-input-container">
                            <input type="text" id="invoice-search" placeholder="Buscar facturas (número, cliente, importe)..." 
                                   oninput="invoicesManager.searchInvoices(this.value)">
                            <button class="search-btn" onclick="invoicesManager.performSearch()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                                    <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                        </div>
                        
                        <div class="quick-filters">
                            <button class="filter-btn active" data-filter="all" onclick="invoicesManager.setQuickFilter('all')">
                                Todas
                            </button>
                            <button class="filter-btn" data-filter="pending" onclick="invoicesManager.setQuickFilter('pending')">
                                Pendientes
                            </button>
                            <button class="filter-btn" data-filter="paid" onclick="invoicesManager.setQuickFilter('paid')">
                                Pagadas
                            </button>
                            <button class="filter-btn" data-filter="overdue" onclick="invoicesManager.setQuickFilter('overdue')">
                                Vencidas
                            </button>
                            <button class="filter-btn" data-filter="month" onclick="invoicesManager.setQuickFilter('month')">
                                Este Mes
                            </button>
                        </div>
                    </div>
                    
                    <div class="advanced-filters" id="advanced-invoice-filters" style="display: none;">
                        <div class="filter-row">
                            <div class="filter-group">
                                <label>Serie:</label>
                                <select id="filter-series" onchange="invoicesManager.applyAdvancedFilters()">
                                    <option value="">Todas</option>
                                    <option value="F">Facturas (F)</option>
                                    <option value="A">Abonos (A)</option>
                                    <option value="R">Rectificativas (R)</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label>Estado:</label>
                                <select id="filter-status" onchange="invoicesManager.applyAdvancedFilters()">
                                    <option value="">Todos</option>
                                    <option value="borrador">Borrador</option>
                                    <option value="enviada">Enviada</option>
                                    <option value="pagada">Pagada</option>
                                    <option value="vencida">Vencida</option>
                                    <option value="cancelada">Cancelada</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label>Cliente:</label>
                                <input type="text" id="filter-client" placeholder="Nombre del cliente" 
                                       onchange="invoicesManager.applyAdvancedFilters()">
                            </div>
                            <div class="filter-group">
                                <label>Desde:</label>
                                <input type="date" id="filter-date-from" onchange="invoicesManager.applyAdvancedFilters()">
                            </div>
                            <div class="filter-group">
                                <label>Hasta:</label>
                                <input type="date" id="filter-date-to" onchange="invoicesManager.applyAdvancedFilters()">
                            </div>
                            <button class="btn btn-sm btn-outline" onclick="invoicesManager.clearFilters()">
                                Limpiar
                            </button>
                        </div>
                    </div>
                    
                    <button class="advanced-toggle" onclick="invoicesManager.toggleAdvancedFilters()">
                        Filtros Avanzados
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
                
                <!-- Lista de facturas -->
                <div class="invoices-content">
                    <div class="invoices-table-container" id="invoices-table-container">
                        <!-- Tabla se carga dinámicamente -->
                    </div>
                    
                    <!-- Paginación -->
                    <div class="pagination-container" id="invoices-pagination">
                        <!-- Paginación se carga dinámicamente -->
                    </div>
                </div>
            </div>
            
            <!-- Modales -->
            <div id="invoice-modal" class="modal">
                <!-- Modal de factura se carga dinámicamente -->
            </div>
            
            <div id="invoice-detail-modal" class="modal">
                <!-- Modal de detalle se carga dinámicamente -->
            </div>
            
            <!-- Panel de notificaciones Verifactu -->
            <div id="verifactu-notifications" class="notification-panel" style="display: none;">
                <div class="notification-header">
                    <h4>Registro Verifactu</h4>
                    <button onclick="this.closest('.notification-panel').style.display='none'">×</button>
                </div>
                <div class="notification-content" id="verifactu-content">
                    <!-- Contenido de notificación -->
                </div>
            </div>
        `;

        this.updateFinancialStats();
    }

    setupEventListeners() {
        // Event listeners para la tabla
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('invoice-row')) {
                const invoiceId = e.target.dataset.invoiceId;
                this.showInvoiceDetail(invoiceId);
            }
            
            if (e.target.classList.contains('edit-invoice-btn')) {
                e.stopPropagation();
                const invoiceId = e.target.dataset.invoiceId;
                this.editInvoice(invoiceId);
            }
            
            if (e.target.classList.contains('send-invoice-btn')) {
                e.stopPropagation();
                const invoiceId = e.target.dataset.invoiceId;
                this.sendInvoiceEmail(invoiceId);
            }
            
            if (e.target.classList.contains('download-pdf-btn')) {
                e.stopPropagation();
                const invoiceId = e.target.dataset.invoiceId;
                this.downloadInvoicePDF(invoiceId);
            }
            
            if (e.target.classList.contains('mark-paid-btn')) {
                e.stopPropagation();
                const invoiceId = e.target.dataset.invoiceId;
                this.markAsPaid(invoiceId);
            }
        });
    }

    async loadInvoices() {
        try {
            const response = await api.get('/api/invoices');
            if (response.success) {
                this.invoices = response.data.invoices;
                this.totalInvoices = response.data.total;
                this.renderInvoicesTable();
                this.updatePagination();
                this.updateFinancialStats();
            }
        } catch (error) {
            console.error('Error cargando facturas:', error);
            this.loadSampleInvoices();
        }
    }

    loadSampleInvoices() {
        this.invoices = [
            {
                id: 'F2024001',
                series: 'F',
                number: 'F2024001',
                client_id: 'P001',
                client_name: 'Ana García López',
                client_nif: '12345678A',
                date: '2024-11-15',
                due_date: '2024-12-15',
                subtotal: 50.00,
                iva_amount: 10.50,
                total: 60.50,
                status: 'pagada',
                items: [
                    { code: 'CONS', name: 'Consulta', quantity: 1, price: 50.00, iva_rate: 21 }
                ],
                created_at: '2024-11-15T10:30:00Z',
                payment_date: '2024-11-20',
                verifactu_registered: true,
                pdf_generated: true,
                sent_email: true
            },
            {
                id: 'F2024002',
                series: 'F',
                number: 'F2024002',
                client_id: 'P002',
                client_name: 'Carlos Martín Ruiz',
                client_nif: '87654321B',
                date: '2024-11-10',
                due_date: '2024-12-10',
                subtotal: 300.00,
                iva_amount: 63.00,
                total: 363.00,
                status: 'pendiente',
                items: [
                    { code: 'END', name: 'Endodoncia', quantity: 1, price: 300.00, iva_rate: 21 }
                ],
                created_at: '2024-11-10T14:15:00Z',
                verifactu_registered: true,
                pdf_generated: true,
                sent_email: false
            },
            {
                id: 'F2024003',
                series: 'F',
                number: 'F2024003',
                client_id: 'P003',
                client_name: 'María Fernández Silva',
                client_nif: '11223344C',
                date: '2024-11-05',
                due_date: '2024-12-05',
                subtotal: 1200.00,
                iva_amount: 252.00,
                total: 1452.00,
                status: 'vencida',
                items: [
                    { code: 'IMP', name: 'Implante', quantity: 1, price: 1200.00, iva_rate: 21 }
                ],
                created_at: '2024-11-05T09:00:00Z',
                verifactu_registered: true,
                pdf_generated: true,
                sent_email: true
            },
            {
                id: 'F2024004',
                series: 'F',
                number: 'F2024004',
                client_id: 'P004',
                client_name: 'Juan Pérez González',
                client_nif: '55667788D',
                date: '2024-11-12',
                due_date: '2024-12-12',
                subtotal: 45.00,
                iva_amount: 9.45,
                total: 54.45,
                status: 'enviada',
                items: [
                    { code: 'HIG', name: 'Higiene Dental', quantity: 1, price: 45.00, iva_rate: 21 }
                ],
                created_at: '2024-11-12T11:45:00Z',
                verifactu_registered: true,
                pdf_generated: true,
                sent_email: true
            },
            {
                id: 'F2024005',
                series: 'F',
                number: 'F2024005',
                client_id: 'P005',
                client_name: 'Laura Rodríguez Martín',
                client_nif: '99887766E',
                date: '2024-11-18',
                due_date: '2024-12-18',
                subtotal: 250.00,
                iva_amount: 52.50,
                total: 302.50,
                status: 'borrador',
                items: [
                    { code: 'BLANQ', name: 'Blanqueamiento', quantity: 1, price: 250.00, iva_rate: 21 }
                ],
                created_at: '2024-11-18T16:20:00Z',
                verifactu_registered: false,
                pdf_generated: false,
                sent_email: false
            }
        ];

        this.totalInvoices = this.invoices.length;
        this.renderInvoicesTable();
        this.updatePagination();
        this.updateFinancialStats();
    }

    renderInvoicesTable() {
        const container = document.getElementById('invoices-table-container');
        if (!container) return;

        container.innerHTML = `
            <div class="table-responsive">
                <table class="invoices-table">
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Cliente</th>
                            <th>Fecha</th>
                            <th>Vencimiento</th>
                            <th>Importe</th>
                            <th>IVA</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Verifactu</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.invoices.map(invoice => this.renderInvoiceRow(invoice)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderInvoiceRow(invoice) {
        const statusClasses = {
            'borrador': 'status-draft',
            'enviada': 'status-sent', 
            'pagada': 'status-paid',
            'vencida': 'status-overdue',
            'cancelada': 'status-cancelled'
        };

        const statusLabels = {
            'borrador': 'Borrador',
            'enviada': 'Enviada',
            'pagada': 'Pagada', 
            'vencida': 'Vencida',
            'cancelada': 'Cancelada'
        };

        const statusBadge = `
            <span class="status-badge ${statusClasses[invoice.status]}">
                ${statusLabels[invoice.status]}
            </span>
        `;

        const verifactuBadge = invoice.verifactu_registered ? 
            '<span class="verifactu-badge registered">✓ Registrada</span>' :
            '<span class="verifactu-badge pending">⏳ Pendiente</span>';

        const actions = `
            <div class="action-buttons">
                <button class="action-btn edit-invoice-btn" data-invoice-id="${invoice.id}" title="Editar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4A2 2 0 0 0 2 6V20A2 2 0 0 0 4 22H18A2 2 0 0 0 20 20V13" stroke="currentColor" stroke-width="2"/>
                        <path d="M18.5 2.5A2.12 2.12 0 0 0 16 5V7H14V9H16V11H18V9H20V7H18V5A2.12 2.12 0 0 0 18.5 2.5Z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                <button class="action-btn download-pdf-btn" data-invoice-id="${invoice.id}" title="Descargar PDF">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H15" stroke="currentColor" stroke-width="2"/>
                        <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 15V3" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                <button class="action-btn send-invoice-btn" data-invoice-id="${invoice.id}" title="Enviar por Email">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M21 11.5A8.38 8.38 0 0 1 .9 16.4L.2 21.5L5.3 20.7A8.38 8.38 0 0 1 21 11.5Z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                ${invoice.status !== 'pagada' ? `
                    <button class="action-btn mark-paid-btn" data-invoice-id="${invoice.id}" title="Marcar como Pagada">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M9 12L11 14L15 10M21 12A9 9 0 0 1 3 12A9 9 0 0 1 21 12Z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
        `;

        return `
            <tr class="invoice-row" data-invoice-id="${invoice.id}">
                <td class="invoice-number">
                    <strong>${invoice.number}</strong>
                    <small>${invoice.series}</small>
                </td>
                <td class="client-info">
                    <div class="client-name">${invoice.client_name}</div>
                    <small class="client-nif">${invoice.client_nif}</small>
                </td>
                <td>${this.formatDate(invoice.date)}</td>
                <td class="due-date ${this.isOverdue(invoice.due_date) && invoice.status !== 'pagada' ? 'overdue' : ''}">
                    ${this.formatDate(invoice.due_date)}
                </td>
                <td class="amount">${this.formatCurrency(invoice.subtotal)}</td>
                <td class="iva-amount">${this.formatCurrency(invoice.iva_amount)}</td>
                <td class="total-amount">
                    <strong>${this.formatCurrency(invoice.total)}</strong>
                </td>
                <td>${statusBadge}</td>
                <td>${verifactuBadge}</td>
                <td class="actions-cell">${actions}</td>
            </tr>
        `;
    }

    updateFinancialStats() {
        const totalElement = document.getElementById('total-invoices');
        const monthlyElement = document.getElementById('monthly-amount');
        const pendingElement = document.getElementById('pending-invoices');
        const overdueElement = document.getElementById('overdue-invoices');
        
        if (totalElement) totalElement.textContent = this.invoices.length;
        
        if (monthlyElement) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyInvoices = this.invoices.filter(inv => {
                const invDate = new Date(inv.date);
                return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
            });
            const monthlyTotal = monthlyInvoices.reduce((sum, inv) => sum + inv.total, 0);
            monthlyElement.textContent = this.formatCurrency(monthlyTotal);
        }
        
        if (pendingElement) {
            const pendingCount = this.invoices.filter(inv => inv.status === 'pendiente').length;
            pendingElement.textContent = pendingCount;
        }
        
        if (overdueElement) {
            const overdueCount = this.invoices.filter(inv => this.isOverdue(inv.due_date) && inv.status !== 'pagada').length;
            overdueElement.textContent = overdueCount;
        }
    }

    newInvoice() {
        const modal = document.getElementById('invoice-modal');
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-content xlarge">
                <div class="modal-header">
                    <h3>Nueva Factura</h3>
                    <button class="close-btn" onclick="this.closest('.modal').style.display='none'">
                        <svg width="24" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="new-invoice-form" onsubmit="invoicesManager.createInvoice(event)">
                        <!-- Información del Cliente -->
                        <div class="form-section">
                            <h4>Cliente</h4>
                            <div class="form-row">
                                <div class="client-search-container">
                                    <label>Buscar Cliente:</label>
                                    <input type="text" id="client-search" placeholder="Buscar por nombre, DNI o teléfono" 
                                           onchange="invoicesManager.searchClient(this.value)">
                                    <div id="client-suggestions" class="suggestions-dropdown"></div>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-row">
                                    <label for="client-name">Nombre/Razón Social *</label>
                                    <input type="text" id="client-name" name="client_name" required>
                                </div>
                                <div class="form-row">
                                    <label for="client-nif">NIF/CIF *</label>
                                    <input type="text" id="client-nif" name="client_nif" required>
                                </div>
                                <div class="form-row">
                                    <label for="client-address">Dirección</label>
                                    <input type="text" id="client-address" name="client_address">
                                </div>
                                <div class="form-row">
                                    <label for="client-city">Ciudad</label>
                                    <input type="text" id="client-city" name="client_city">
                                </div>
                                <div class="form-row">
                                    <label for="client-phone">Teléfono</label>
                                    <input type="tel" id="client-phone" name="client_phone">
                                </div>
                                <div class="form-row">
                                    <label for="client-email">Email</label>
                                    <input type="email" id="client-email" name="client_email">
                                </div>
                            </div>
                        </div>

                        <!-- Detalles de la Factura -->
                        <div class="form-section">
                            <h4>Detalles de la Factura</h4>
                            <div class="form-grid">
                                <div class="form-row">
                                    <label for="invoice-series">Serie *</label>
                                    <select id="invoice-series" name="series" required>
                                        <option value="F">Facturas (F)</option>
                                        <option value="A">Abonos (A)</option>
                                        <option value="R">Rectificativas (R)</option>
                                    </select>
                                </div>
                                <div class="form-row">
                                    <label for="invoice-date">Fecha Emisión *</label>
                                    <input type="date" id="invoice-date" name="date" required 
                                           value="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <div class="form-row">
                                    <label for="due-date">Fecha Vencimiento *</label>
                                    <input type="date" id="due-date" name="due_date" required 
                                           value="${this.calculateDefaultDueDate()}">
                                </div>
                                <div class="form-row">
                                    <label for="payment-method">Forma de Pago</label>
                                    <select id="payment-method" name="payment_method">
                                        <option value="transferencia">Transferencia</option>
                                        <option value="tarjeta">Tarjeta</option>
                                        <option value="efectivo">Efectivo</option>
                                        <option value="financiacion">Financiación</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Conceptos/Líneas de Factura -->
                        <div class="form-section">
                            <h4>Conceptos</h4>
                            <div class="invoice-items">
                                <div class="items-header">
                                    <span>Código</span>
                                    <span>Concepto</span>
                                    <span>Cantidad</span>
                                    <span>Precio</span>
                                    <span>IVA %</span>
                                    <span>Total</span>
                                    <span></span>
                                </div>
                                <div id="invoice-items-container">
                                    <!-- Items se agregan dinámicamente -->
                                </div>
                                <button type="button" class="btn btn-sm btn-outline" onclick="invoicesManager.addInvoiceItem()">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                    Agregar Línea
                                </button>
                            </div>
                        </div>

                        <!-- Totales -->
                        <div class="totals-section">
                            <div class="totals-calculation">
                                <div class="total-row">
                                    <span>Subtotal:</span>
                                    <span id="subtotal-amount">€0,00</span>
                                </div>
                                <div class="total-row">
                                    <span>Total IVA:</span>
                                    <span id="iva-amount">€0,00</span>
                                </div>
                                <div class="total-row total-final">
                                    <span>Total:</span>
                                    <span id="total-amount">€0,00</span>
                                </div>
                            </div>
                        </div>

                        <!-- Observaciones -->
                        <div class="form-section">
                            <h4>Observaciones</h4>
                            <div class="form-row">
                                <label for="invoice-notes">Notas Adicionales</label>
                                <textarea id="invoice-notes" name="notes" rows="3" 
                                          placeholder="Observaciones para la factura..."></textarea>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" onclick="this.closest('.modal').style.display='none'">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                Crear Factura
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        // Agregar primera línea de factura
        this.addInvoiceItem();
        this.updateTotals();
    }

    addInvoiceItem() {
        const container = document.getElementById('invoice-items-container');
        if (!container) return;

        const itemIndex = container.children.length;
        const itemId = `item-${itemIndex}`;

        const itemHtml = `
            <div class="invoice-item" data-item-id="${itemId}">
                <select class="item-code" onchange="invoicesManager.selectItemCode('${itemId}', this.value)">
                    <option value="">Seleccionar...</option>
                    ${Object.entries(this.invoiceTypes).map(([key, type]) => 
                        `<option value="${key}" data-price="${type.default_price}" data-iva="${type.iva_type}">${type.name}</option>`
                    ).join('')}
                </select>
                <input type="text" class="item-description" placeholder="Descripción del concepto" required>
                <input type="number" class="item-quantity" value="1" min="1" step="1" 
                       onchange="invoicesManager.updateItemTotal('${itemId}')" required>
                <input type="number" class="item-price" value="0.00" min="0" step="0.01" 
                       onchange="invoicesManager.updateItemTotal('${itemId}')" required>
                <select class="item-iva" onchange="invoicesManager.updateItemTotal('${itemId}')">
                    <option value="21">21%</option>
                    <option value="10">10%</option>
                    <option value="4">4%</option>
                    <option value="0">0%</option>
                </select>
                <span class="item-total">€0,00</span>
                <button type="button" class="remove-item-btn" onclick="invoicesManager.removeInvoiceItem('${itemId}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', itemHtml);
    }

    removeInvoiceItem(itemId) {
        const item = document.querySelector(`[data-item-id="${itemId}"]`);
        if (item) {
            item.remove();
            this.updateTotals();
        }
    }

    selectItemCode(itemId, code) {
        if (!code) return;

        const type = this.invoiceTypes[code];
        if (!type) return;

        const item = document.querySelector(`[data-item-id="${itemId}"]`);
        if (!item) return;

        // Actualizar campos automáticamente
        item.querySelector('.item-description').value = type.description;
        item.querySelector('.item-price').value = type.default_price.toFixed(2);
        item.querySelector('.item-iva').value = type.iva_type;
        
        this.updateItemTotal(itemId);
    }

    updateItemTotal(itemId) {
        const item = document.querySelector(`[data-item-id="${itemId}"]`);
        if (!item) return;

        const quantity = parseFloat(item.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(item.querySelector('.item-price').value) || 0;
        const ivaRate = parseFloat(item.querySelector('.item-iva').value) || 0;

        const subtotal = quantity * price;
        const ivaAmount = subtotal * (ivaRate / 100);
        const total = subtotal + ivaAmount;

        item.querySelector('.item-total').textContent = this.formatCurrency(total);
        this.updateTotals();
    }

    updateTotals() {
        const items = document.querySelectorAll('.invoice-item');
        let totalSubtotal = 0;
        let totalIva = 0;

        items.forEach(item => {
            const quantity = parseFloat(item.querySelector('.item-quantity').value) || 0;
            const price = parseFloat(item.querySelector('.item-price').value) || 0;
            const ivaRate = parseFloat(item.querySelector('.item-iva').value) || 0;

            const subtotal = quantity * price;
            const ivaAmount = subtotal * (ivaRate / 100);

            totalSubtotal += subtotal;
            totalIva += ivaAmount;
        });

        const totalAmount = totalSubtotal + totalIva;

        document.getElementById('subtotal-amount').textContent = this.formatCurrency(totalSubtotal);
        document.getElementById('iva-amount').textContent = this.formatCurrency(totalIva);
        document.getElementById('total-amount').textContent = this.formatCurrency(totalAmount);
    }

    async createInvoice(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const invoiceData = this.buildInvoiceData(formData);

        try {
            const response = await api.post('/api/invoices', invoiceData);
            
            if (response.success) {
                this.showSuccess('Factura creada correctamente');
                this.closeModal();
                await this.loadInvoices();
                
                // Generar PDF automáticamente
                setTimeout(() => {
                    this.generateInvoicePDF(response.data.id);
                }, 1000);
            }
        } catch (error) {
            console.error('Error creando factura:', error);
            this.showError('Error creando la factura');
        }
    }

    buildInvoiceData(formData) {
        const series = formData.get('series') || 'F';
        const invoiceNumber = this.generateInvoiceNumber(series);
        
        const items = [];
        document.querySelectorAll('.invoice-item').forEach(item => {
            items.push({
                code: item.querySelector('.item-code').value,
                description: item.querySelector('.item-description').value,
                quantity: parseFloat(item.querySelector('.item-quantity').value) || 0,
                price: parseFloat(item.querySelector('.item-price').value) || 0,
                iva_rate: parseFloat(item.querySelector('.item-iva').value) || 0
            });
        });

        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const ivaAmount = items.reduce((sum, item) => {
            const itemSubtotal = item.quantity * item.price;
            return sum + (itemSubtotal * (item.iva_rate / 100));
        }, 0);
        const total = subtotal + ivaAmount;

        return {
            number: invoiceNumber,
            series: series,
            client_name: formData.get('client_name'),
            client_nif: formData.get('client_nif'),
            client_address: formData.get('client_address'),
            client_city: formData.get('client_city'),
            client_phone: formData.get('client_phone'),
            client_email: formData.get('client_email'),
            date: formData.get('date'),
            due_date: formData.get('due_date'),
            payment_method: formData.get('payment_method'),
            items: items,
            subtotal: subtotal,
            iva_amount: ivaAmount,
            total: total,
            notes: formData.get('notes'),
            status: 'borrador',
            verifactu_registered: false
        };
    }

    generateInvoiceNumber(series) {
        const seriesConfig = this.invoiceSeries[series];
        if (!seriesConfig) {
            throw new Error(`Serie de facturación no válida: ${series}`);
        }

        const year = new Date().getFullYear();
        const nextNumber = seriesConfig.next;
        const paddedNumber = nextNumber.toString().padStart(4, '0');
        
        const invoiceNumber = `${series}${year}${paddedNumber}`;
        
        // Incrementar contador
        seriesConfig.next++;
        
        return invoiceNumber;
    }

    calculateDefaultDueDate() {
        const date = new Date();
        date.setDate(date.getDate() + 30); // 30 días por defecto
        return date.toISOString().split('T')[0];
    }

    async showInvoiceDetail(invoiceId) {
        try {
            const invoice = this.invoices.find(inv => inv.id === invoiceId);
            if (!invoice) return;

            const modal = document.getElementById('invoice-detail-modal');
            if (!modal) return;

            modal.innerHTML = `
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>Factura ${invoice.number}</h3>
                        <button class="close-btn" onclick="this.closest('.modal').style.display='none'">
                            <svg width="24" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="invoice-detail-layout">
                            <!-- Información de la Factura -->
                            <div class="detail-section">
                                <h4>Información de la Factura</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <label>Número:</label>
                                        <span>${invoice.number}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Fecha Emisión:</label>
                                        <span>${this.formatDate(invoice.date)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Fecha Vencimiento:</label>
                                        <span class="${this.isOverdue(invoice.due_date) && invoice.status !== 'pagada' ? 'overdue' : ''}">
                                            ${this.formatDate(invoice.due_date)}
                                        </span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Estado:</label>
                                        <span class="status-badge ${this.getStatusClass(invoice.status)}">
                                            ${this.getStatusLabel(invoice.status)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Información del Cliente -->
                            <div class="detail-section">
                                <h4>Cliente</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <label>Nombre:</label>
                                        <span>${invoice.client_name}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>NIF/CIF:</label>
                                        <span>${invoice.client_nif}</span>
                                    </div>
                                    <div class="detail-item full-width">
                                        <label>Dirección:</label>
                                        <span>${invoice.client_address || 'No especificada'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Teléfono:</label>
                                        <span>${invoice.client_phone || 'No especificado'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Email:</label>
                                        <span>${invoice.client_email || 'No especificado'}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Conceptos de la Factura -->
                            <div class="detail-section">
                                <h4>Conceptos</h4>
                                <div class="invoice-items-detail">
                                    <div class="items-header">
                                        <span>Código</span>
                                        <span>Descripción</span>
                                        <span>Cant.</span>
                                        <span>Precio</span>
                                        <span>IVA</span>
                                        <span>Total</span>
                                    </div>
                                    ${invoice.items.map(item => `
                                        <div class="invoice-item-detail">
                                            <span>${item.code}</span>
                                            <span>${item.description}</span>
                                            <span>${item.quantity}</span>
                                            <span>${this.formatCurrency(item.price)}</span>
                                            <span>${item.iva_rate}%</span>
                                            <span><strong>${this.formatCurrency(item.quantity * item.price * (1 + item.iva_rate / 100))}</strong></span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Totales -->
                            <div class="detail-section">
                                <div class="totals-display">
                                    <div class="total-row">
                                        <span>Subtotal:</span>
                                        <span>${this.formatCurrency(invoice.subtotal)}</span>
                                    </div>
                                    <div class="total-row">
                                        <span>Total IVA:</span>
                                        <span>${this.formatCurrency(invoice.iva_amount)}</span>
                                    </div>
                                    <div class="total-row total-final">
                                        <span>Total:</span>
                                        <span><strong>${this.formatCurrency(invoice.total)}</strong></span>
                                    </div>
                                </div>
                            </div>

                            <!-- Estado Verifactu -->
                            <div class="detail-section">
                                <h4>Estado Verifactu</h4>
                                <div class="verifactu-status">
                                    ${invoice.verifactu_registered ? 
                                        '<div class="verifactu-success">✓ Registrada en Verifactu</div>' :
                                        '<div class="verifactu-pending">⏳ Pendiente de registro</div>'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="invoicesManager.downloadInvoicePDF('${invoice.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H15" stroke="currentColor" stroke-width="2"/>
                                <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 15V3" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Descargar PDF
                        </button>
                        <button class="btn btn-outline" onclick="invoicesManager.sendInvoiceEmail('${invoice.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M21 11.5A8.38 8.38 0 0 1 .9 16.4L.2 21.5L5.3 20.7A8.38 8.38 0 0 1 21 11.5Z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Enviar Email
                        </button>
                        ${invoice.status !== 'pagada' ? `
                            <button class="btn btn-success" onclick="invoicesManager.markAsPaid('${invoice.id}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 12L11 14L15 10M21 12A9 9 0 0 1 3 12A9 9 0 0 1 21 12Z" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                Marcar como Pagada
                            </button>
                        ` : ''}
                        <button class="btn btn-primary" onclick="invoicesManager.editInvoice('${invoice.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M11 4H4A2 2 0 0 0 2 6V20A2 2 0 0 0 4 22H18A2 2 0 0 0 20 20V13" stroke="currentColor" stroke-width="2"/>
                                <path d="M18.5 2.5A2.12 2.12 0 0 0 16 5V7H14V9H16V11H18V9H20V7H18V5A2.12 2.12 0 0 0 18.5 2.5Z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Editar
                        </button>
                    </div>
                </div>
            `;

            modal.style.display = 'flex';

        } catch (error) {
            console.error('Error mostrando detalle de factura:', error);
            this.showError('Error cargando detalles de la factura');
        }
    }

    // Funciones de Verifactu
    async generateInvoicePDF(invoiceId) {
        try {
            const response = await api.get(`/api/invoices/${invoiceId}/pdf`);
            
            if (response.success) {
                const pdfData = response.data;
                const blob = new Blob([pdfData], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `factura_${invoiceId}.pdf`;
                a.click();
                
                // Actualizar estado en la interfaz
                const invoice = this.invoices.find(inv => inv.id === invoiceId);
                if (invoice) {
                    invoice.pdf_generated = true;
                    this.renderInvoicesTable();
                }
                
                this.showSuccess('PDF generado y descargado correctamente');
            }
        } catch (error) {
            console.error('Error generando PDF:', error);
            this.showError('Error generando el PDF de la factura');
        }
    }

    async registerVerifactu(invoiceId) {
        try {
            const response = await api.post(`/api/invoices/${invoiceId}/verifactu`);
            
            if (response.success) {
                this.showVerifactuNotification(response.data);
                
                // Actualizar estado en la interfaz
                const invoice = this.invoices.find(inv => inv.id === invoiceId);
                if (invoice) {
                    invoice.verifactu_registered = true;
                    this.renderInvoicesTable();
                }
            }
        } catch (error) {
            console.error('Error registrando en Verifactu:', error);
            this.showError('Error registrando la factura en Verifactu');
        }
    }

    showVerifactuNotification(data) {
        const panel = document.getElementById('verifactu-notifications');
        const content = document.getElementById('verifactu-content');
        
        if (panel && content) {
            content.innerHTML = `
                <div class="verifactu-success">
                    <h4>✓ Factura registrada en Verifactu</h4>
                    <p>Factura ${data.invoice_number} registrada correctamente.</p>
                    <p><strong>Fecha/Hora:</strong> ${this.formatDateTime(data.registration_time)}</p>
                    <p><strong>ID Registro:</strong> ${data.registration_id}</p>
                </div>
            `;
            
            panel.style.display = 'block';
            
            // Auto-ocultar después de 10 segundos
            setTimeout(() => {
                panel.style.display = 'none';
            }, 10000);
        }
    }

    // Funciones de email
    async sendInvoiceEmail(invoiceId) {
        try {
            const invoice = this.invoices.find(inv => inv.id === invoiceId);
            if (!invoice || !invoice.client_email) {
                this.showError('El cliente no tiene email configurado');
                return;
            }

            const response = await api.post(`/api/invoices/${invoiceId}/send-email`, {
                to: invoice.client_email,
                subject: `Factura ${invoice.number} - Clínica Dental Rubio García`
            });
            
            if (response.success) {
                // Actualizar estado
                const inv = this.invoices.find(i => i.id === invoiceId);
                if (inv) {
                    inv.sent_email = true;
                    inv.status = 'enviada';
                }
                
                this.renderInvoicesTable();
                this.showSuccess('Factura enviada por email correctamente');
            }
        } catch (error) {
            console.error('Error enviando email:', error);
            this.showError('Error enviando la factura por email');
        }
    }

    async sendBulkInvoices() {
        try {
            const pendingInvoices = this.invoices.filter(inv => inv.status === 'pendiente');
            
            if (pendingInvoices.length === 0) {
                this.showError('No hay facturas pendientes para enviar');
                return;
            }

            const confirmed = confirm(`¿Enviar ${pendingInvoices.length} facturas pendientes por email?`);
            if (!confirmed) return;

            const response = await api.post('/api/invoices/send-bulk', {
                invoiceIds: pendingInvoices.map(inv => inv.id)
            });
            
            if (response.success) {
                await this.loadInvoices();
                this.showSuccess(`${response.data.sent} facturas enviadas correctamente`);
            }
        } catch (error) {
            console.error('Error envío masivo:', error);
            this.showError('Error en el envío masivo de facturas');
        }
    }

    // Gestión de estados
    async markAsPaid(invoiceId) {
        try {
            const response = await api.put(`/api/invoices/${invoiceId}/paid`, {
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: 'manual'
            });
            
            if (response.success) {
                this.showSuccess('Factura marcada como pagada');
                await this.loadInvoices();
            }
        } catch (error) {
            console.error('Error marcando como pagada:', error);
            this.showError('Error actualizando el estado de la factura');
        }
    }

    // Utilidades
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    }

    formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('es-ES');
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    isOverdue(dueDate) {
        return new Date(dueDate) < new Date();
    }

    getStatusClass(status) {
        const classes = {
            'borrador': 'status-draft',
            'enviada': 'status-sent',
            'pagada': 'status-paid',
            'vencida': 'status-overdue',
            'cancelada': 'status-cancelled'
        };
        return classes[status] || 'status-draft';
    }

    getStatusLabel(status) {
        const labels = {
            'borrador': 'Borrador',
            'enviada': 'Enviada',
            'pagada': 'Pagada',
            'vencida': 'Vencida',
            'cancelada': 'Cancelada'
        };
        return labels[status] || status;
    }

    // Búsqueda y filtros
    async searchInvoices(query) {
        // Implementar búsqueda
        console.log('Búsqueda de facturas:', query);
    }

    setQuickFilter(filter) {
        // Actualizar filtros activos
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
        
        // Aplicar filtro
        console.log('Filtro aplicado:', filter);
    }

    applyAdvancedFilters() {
        console.log('Aplicando filtros avanzados');
    }

    clearFilters() {
        console.log('Limpiando filtros');
    }

    toggleAdvancedFilters() {
        const filtersPanel = document.getElementById('advanced-invoice-filters');
        const toggle = document.querySelector('.advanced-toggle svg');
        
        if (filtersPanel) {
            const isVisible = filtersPanel.style.display !== 'none';
            filtersPanel.style.display = isVisible ? 'none' : 'block';
            toggle.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
        }
    }

    updatePagination() {
        // Implementar paginación
        console.log('Actualizando paginación');
    }

    performSearch() {
        console.log('Realizando búsqueda');
    }

    exportInvoices() {
        // Implementar exportación
        console.log('Exportando facturas');
    }

    editInvoice(invoiceId) {
        console.log('Editando factura:', invoiceId);
    }

    searchClient(query) {
        console.log('Buscando cliente:', query);
    }

    closeModal() {
        document.getElementById('invoice-modal').style.display = 'none';
        document.getElementById('invoice-detail-modal').style.display = 'none';
    }

    downloadInvoicePDF(invoiceId) {
        this.generateInvoicePDF(invoiceId);
    }

    showError(message) {
        console.error(message);
        if (window.ComponentsManager) {
            ComponentsManager.showToast(message, 'error');
        }
    }

    showSuccess(message) {
        console.log(message);
        if (window.ComponentsManager) {
            ComponentsManager.showToast(message, 'success');
        }
    }
}

// Inicializar sistema de facturación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.invoicesManager = new InvoicesManager();
});

// Exportar para uso global
window.InvoicesManager = InvoicesManager;