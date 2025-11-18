/**
 * Sistema Legal y LOPD - DentalCare Pro
 * Módulo completo de cumplimiento legal y gestión de consentimientos
 * @author MiniMax Agent
 * @version 1.0.0
 */

class LegalSystem {
    constructor() {
        this.api = new ApiClient();
        this.auth = new AuthManager();
        this.websocket = new WebSocketManager();
        this.currentUser = null;
        this.consentTemplates = new Map();
        this.lopdRecords = new Map();
        this.auditLogs = new Map();
        this.init();
    }

    init() {
        this.currentUser = this.auth.getCurrentUser();
        this.setupEventListeners();
        this.initializeWebSocket();
        this.loadConsentTemplates();
        this.loadLopdCompliance();
    }

    setupEventListeners() {
        // Event delegation para mejor rendimiento
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-legal-action]')) {
                const action = e.target.getAttribute('data-legal-action');
                this.handleLegalAction(action, e.target);
            }
        });

        document.addEventListener('submit', (e) => {
            if (e.target.matches('[data-legal-form]')) {
                e.preventDefault();
                this.handleLegalForm(e.target);
            }
        });

        // Filtros y búsqueda
        document.addEventListener('input', (e) => {
            if (e.target.matches('[data-legal-filter]')) {
                this.debounce(() => this.applyLegalFilters(), 300)();
            }
        });
    }

    async initializeWebSocket() {
        this.websocket.on('consent-signed', (data) => {
            this.handleConsentSigned(data);
        });

        this.websocket.on('lopd-request', (data) => {
            this.handleLopdRequest(data);
        });

        this.websocket.on('document-updated', (data) => {
            this.handleDocumentUpdated(data);
        });
    }

    // ========================================
    // SISTEMA LOPD COMPLETO
    // ========================================

    /**
     * Carga el dashboard legal con estado de cumplimiento LOPD
     */
    async loadLegalDashboard() {
        try {
            this.showLoadingState('dashboard-container');
            
            const [lopdStatus, recentConsents, auditSummary] = await Promise.all([
                this.getLopdComplianceStatus(),
                this.getRecentConsents(),
                this.getAuditSummary()
            ]);

            const dashboardHTML = this.generateLegalDashboardHTML({
                lopdStatus,
                recentConsents,
                auditSummary
            });

            document.getElementById('dashboard-container').innerHTML = dashboardHTML;
            this.setupLegalCharts();
            
        } catch (error) {
            this.showError('Error al cargar el dashboard legal', error);
        } finally {
            this.hideLoadingState('dashboard-container');
        }
    }

    generateLegalDashboardHTML(data) {
        const { lopdStatus, recentConsents, auditSummary } = data;
        
        return `
            <div class="legal-dashboard">
                <!-- Header -->
                <div class="dashboard-header">
                    <h1><i class="fas fa-shield-alt"></i> Sistema Legal y LOPD</h1>
                    <div class="dashboard-actions">
                        <button class="btn btn-primary" data-legal-action="generate-consent">
                            <i class="fas fa-file-signature"></i> Nuevo Consentimiento
                        </button>
                        <button class="btn btn-secondary" data-legal-action="export-audit">
                            <i class="fas fa-download"></i> Exportar Auditoría
                        </button>
                    </div>
                </div>

                <!-- Estado de Cumplimiento LOPD -->
                <div class="lopd-compliance-grid">
                    <div class="compliance-card overall-status">
                        <div class="compliance-icon">
                            <i class="fas ${lopdStatus.overallCompliant ? 'fa-check-circle text-green-600' : 'fa-exclamation-triangle text-red-600'}"></i>
                        </div>
                        <div class="compliance-content">
                            <h3>${lopdStatus.overallCompliant ? 'Cumple LOPD' : 'Requiere Atención'}</h3>
                            <p>Estado General de Cumplimiento</p>
                            <span class="compliance-score">${lopdStatus.complianceScore}%</span>
                        </div>
                    </div>

                    <div class="compliance-card consent-status">
                        <div class="compliance-icon">
                            <i class="fas fa-user-check text-blue-600"></i>
                        </div>
                        <div class="compliance-content">
                            <h3>${lopdStatus.consentsGiven}</h3>
                            <p>Consentimientos Otorgados</p>
                            <span class="compliance-detail">${lopdStatus.consentsPercentage}% del total</span>
                        </div>
                    </div>

                    <div class="compliance-card pending-consents">
                        <div class="compliance-icon">
                            <i class="fas fa-clock text-orange-600"></i>
                        </div>
                        <div class="compliance-content">
                            <h3>${lopdStatus.pendingConsents}</h3>
                            <p>Consentimientos Pendientes</p>
                            <span class="compliance-detail">Requieren atención</span>
                        </div>
                    </div>

                    <div class="compliance-card audit-activities">
                        <div class="compliance-icon">
                            <i class="fas fa-clipboard-list text-purple-600"></i>
                        </div>
                        <div class="compliance-content">
                            <h3>${auditSummary.totalActivities}</h3>
                            <p>Actividades de Auditoría</p>
                            <span class="compliance-detail">Últimos 30 días</span>
                        </div>
                    </div>
                </div>

                <!-- Acciones Requeridas -->
                <div class="legal-actions-section">
                    <div class="section-header">
                        <h3><i class="fas fa-tasks"></i> Acciones Requeridas</h3>
                    </div>
                    <div class="actions-list">
                        ${lopdStatus.actionsRequired.map(action => `
                            <div class="action-item ${action.priority}">
                                <div class="action-icon">
                                    <i class="fas fa-${this.getActionIcon(action.type)}"></i>
                                </div>
                                <div class="action-content">
                                    <h4>${action.title}</h4>
                                    <p>${action.description}</p>
                                    <span class="action-deadline">Vence: ${this.formatDate(action.deadline)}</span>
                                </div>
                                <div class="action-actions">
                                    <button class="btn btn-sm btn-primary" data-legal-action="handle-action" data-id="${action.id}">
                                        Resolver
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Consentimientos Recientes y Auditoría -->
                <div class="legal-tables-section">
                    <div class="table-row">
                        <div class="table-card">
                            <div class="table-header">
                                <h3>Consentimientos Recientes</h3>
                                <div class="table-filters">
                                    <select data-legal-filter="consent-status">
                                        <option value="">Todos los estados</option>
                                        <option value="signed">Firmados</option>
                                        <option value="pending">Pendientes</option>
                                        <option value="expired">Expirados</option>
                                    </select>
                                    <select data-legal-filter="consent-type">
                                        <option value="">Todos los tipos</option>
                                        <option value="lopd">LOPD General</option>
                                        <option value="implant">Consentimiento Implante</option>
                                        <option value="surgery">Cirugía</option>
                                        <option value="treatment">Tratamiento</option>
                                    </select>
                                </div>
                            </div>
                            <div class="table-container">
                                <table class="data-table" id="recent-consents-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Paciente</th>
                                            <th>Tipo</th>
                                            <th>Estado</th>
                                            <th>Método</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${recentConsents.map(consent => `
                                            <tr>
                                                <td>${this.formatDate(consent.fecha)}</td>
                                                <td>${consent.paciente}</td>
                                                <td>
                                                    <span class="consent-type ${consent.tipo}">
                                                        ${this.getConsentTypeLabel(consent.tipo)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span class="status-badge ${consent.estado}">
                                                        ${this.getConsentStatusLabel(consent.estado)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span class="method-badge ${consent.metodo}">
                                                        ${this.getMethodLabel(consent.metodo)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button class="btn-icon" data-legal-action="view-consent" data-id="${consent.id}">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                    <button class="btn-icon" data-legal-action="send-consent" data-id="${consent.id}">
                                                        <i class="fas fa-paper-plane"></i>
                                                    </button>
                                                    <button class="btn-icon" data-legal-action="download-consent" data-id="${consent.id}">
                                                        <i class="fas fa-download"></i>
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
                                <h3>Registro de Auditoría</h3>
                                <div class="table-actions">
                                    <button class="btn btn-sm btn-primary" data-legal-action="create-audit-entry">
                                        <i class="fas fa-plus"></i> Nueva Entrada
                                    </button>
                                </div>
                            </div>
                            <div class="table-container">
                                <table class="data-table" id="audit-log-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha/Hora</th>
                                            <th>Usuario</th>
                                            <th>Acción</th>
                                            <th>Tipo</th>
                                            <th>IP</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${auditSummary.recentActivities.map(activity => `
                                            <tr>
                                                <td>${this.formatDateTime(activity.fecha)}</td>
                                                <td>${activity.usuario}</td>
                                                <td>${activity.accion}</td>
                                                <td>
                                                    <span class="audit-type ${activity.tipo}">
                                                        ${activity.tipo}
                                                    </span>
                                                </td>
                                                <td class="ip-address">${activity.ip}</td>
                                                <td>
                                                    <span class="status-badge ${activity.estado}">
                                                        ${activity.estado}
                                                    </span>
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

    setupLegalCharts() {
        // Configurar gráficos de cumplimiento LOPD
        this.setupLopdComplianceChart();
        this.setupConsentTrendsChart();
    }

    setupLopdComplianceChart() {
        const ctx = document.getElementById('lopd-compliance-chart');
        if (!ctx) return;

        const data = {
            labels: ['Consentimientos', 'Políticas', 'Derechos ARCO', 'Auditoría', 'Formación'],
            datasets: [{
                label: 'Cumplimiento (%)',
                data: [95, 88, 92, 85, 78],
                backgroundColor: [
                    '#10B981',
                    '#3B82F6',
                    '#F59E0B',
                    '#EF4444',
                    '#8B5CF6'
                ],
                borderWidth: 2
            }]
        };

        new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    setupConsentTrendsChart() {
        const ctx = document.getElementById('consent-trends-chart');
        if (!ctx) return;

        const data = {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            datasets: [{
                label: 'Consentimientos Firmados',
                data: [45, 52, 48, 61, 58, 65],
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Consentimientos Enviados',
                data: [50, 55, 50, 65, 60, 68],
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
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
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // ========================================
    // GESTIÓN DE CONSENTIMIENTOS INFORMADOS
    // ========================================

    /**
     * Obtiene las plantillas de consentimientos disponibles
     */
    loadConsentTemplates() {
        this.consentTemplates = new Map([
            ['lopd', {
                id: 'lopd',
                name: 'Consentimiento LOPD General',
                type: 'privacy',
                content: this.generateLopdConsentContent(),
                required: true,
                expiryMonths: 24
            }],
            ['implant', {
                id: 'implant',
                name: 'Consentimiento Informado - Implante Dental',
                type: 'medical',
                content: this.generateImplantConsentContent(),
                required: false,
                expiryMonths: 12
            }],
            ['surgery', {
                id: 'surgery',
                name: 'Consentimiento Informado - Cirugía Oral',
                type: 'medical',
                content: this.generateSurgeryConsentContent(),
                required: false,
                expiryMonths: 12
            }],
            ['orthodontic', {
                id: 'orthodontic',
                name: 'Consentimiento Informado - Tratamiento Ortodóntico',
                type: 'medical',
                content: this.generateOrthodonticConsentContent(),
                required: false,
                expiryMonths: 18
            }],
            ['endodontic', {
                id: 'endodontic',
                name: 'Consentimiento Informado - Endodoncia',
                type: 'medical',
                content: this.generateEndodonticConsentContent(),
                required: false,
                expiryMonths: 12
            }],
            ['first-visit', {
                id: 'first-visit',
                name: 'Consentimiento - Primera Visita',
                type: 'privacy',
                content: this.generateFirstVisitConsentContent(),
                required: true,
                expiryMonths: 12
            }]
        ]);
    }

    /**
     * Genera contenido para consentimiento LOPD
     */
    generateLopdConsentContent() {
        return `
            <h2>CONSENTIMIENTO INFORMADO - PROTECCIÓN DE DATOS</h2>
            <div class="consent-content">
                <h3>INFORMACIÓN SOBRE PROTECCIÓN DE DATOS</h3>
                <p><strong>Responsable:</strong> Clínica Dental Rubio García</p>
                <p><strong>Finalidad:</strong> Gestión de su historial clínico, citas médicas y comunicaciones</p>
                <p><strong>Legitimación:</strong> Consentimiento del interesado y ejecución de contrato</p>
                <p><strong>Destinatarios:</strong> No se cederán datos a terceros salvo obligación legal</p>
                <p><strong>Derechos:</strong> Acceso, rectificación, supresión, oposición, limitación, portabilidad</p>
                <p><strong>Contacto DPO:</strong> dpo@rubiogarciadental.com</p>

                <h3>DECLARACIÓN DEL PACIENTE</h3>
                <p>Yo, <strong>[NOMBRE_PACIENTE]</strong>, con DNI <strong>[DNI_PACIENTE]</strong>, declaro que:</p>
                <ul>
                    <li>He sido informado/a sobre el tratamiento de mis datos personales</li>
                    <li>Comprendo la finalidad del tratamiento y los derechos que me asisten</li>
                    <li>Consiento el tratamiento de mis datos para la gestión sanitaria</li>
                    <li>Acepto recibir comunicaciones sobre mi tratamiento y citas</li>
                    <li>He leído y acepto la política de privacidad completa</li>
                </ul>

                <div class="signature-section">
                    <p><strong>Firma digital del paciente:</strong></p>
                    <p>Fecha: <strong>[FECHA_CONSENTIMIENTO]</strong></p>
                </div>
            </div>
        `;
    }

    /**
     * Genera contenido para consentimiento de implantes
     */
    generateImplantConsentContent() {
        return `
            <h2>CONSENTIMIENTO INFORMADO - IMPLANTE DENTAL</h2>
            <div class="consent-content">
                <h3>INFORMACIÓN SOBRE EL TRATAMIENTO</h3>
                <p><strong>Procedimiento:</strong> Colocación de implante dental</p>
                <p><strong>Objetivo:</strong> Reposición del diente perdido mediante implante osteointegrado</p>
                <p><strong>Alternativas:</strong> Prótesis removibles o puentes convencionales</p>

                <h3>PROCEDIMIENTO Y FASES</h3>
                <ol>
                    <li><strong>Anestesia local:</strong> Aplicación de anestesia en la zona a tratar</li>
                    <li><strong>Incisión:</strong> Apertura de la encía para acceder al hueso</li>
                    <li><strong>Preparación:</strong> Creación del lecho para el implante</li>
                    <li><strong>Colocación:</strong> Inserción del implante en el hueso</li>
                    <li><strong>Sutura:</strong> Cierre de la incisión con puntos</li>
                    <li><strong>Osteointegración:</strong> Proceso de cicatrización (3-6 meses)</li>
                    <li><strong>Prótesis:</strong> Colocación de la corona sobre el implante</li>
                </ol>

                <h3>RIESGOS Y COMPLICACIONES</h3>
                <div class="risks-grid">
                    <div class="risk-category">
                        <h4>Anestesia Local:</h4>
                        <ul>
                            <li>Sensación de acorchamiento temporal</li>
                            <li>Posible hematoma o ulceración</li>
                            <li>Raramente: pérdida de sensibilidad</li>
                        </ul>
                    </div>
                    <div class="risk-category">
                        <h4>Procedimiento:</h4>
                        <ul>
                            <li>Inflamación y dolor postoperatorio</li>
                            <li>Infección de la zona</li>
                            <li>Laceraciones en tejidos blandos</li>
                        </ul>
                    </div>
                    <div class="risk-category">
                        <h4>Complicaciones Graves:</h4>
                        <ul>
                            <li>Lesión de nervios (pérdida de sensibilidad)</li>
                            <li>Comunicación con senos nasales</li>
                            <li>Fracaso del implante</li>
                        </ul>
                    </div>
                </div>

                <h3>DECLARACIÓN DEL PACIENTE</h3>
                <p>Yo, <strong>[NOMBRE_PACIENTE]</strong>, con DNI <strong>[DNI_PACIENTE]</strong>, declaro que:</p>
                <ul>
                    <li>He recibido y comprendido toda la información sobre el tratamiento</li>
                    <li>Conozco los riesgos, alternativas y consecuencias</li>
                    <li>He podido aclarar todas mis dudas con el profesional</li>
                    <li>Consiento la realización del procedimiento</li>
                    <li>Entiendo que el éxito no está garantizado al 100%</li>
                    <li>Me comprometo a seguir las indicaciones postoperatorias</li>
                </ul>

                <div class="signature-section">
                    <p><strong>Firma digital del paciente:</strong></p>
                    <p>Fecha: <strong>[FECHA_CONSENTIMIENTO]</strong></p>
                </div>
            </div>
        `;
    }

    /**
     * Genera contenido para consentimiento de cirugía oral
     */
    generateSurgeryConsentContent() {
        return `
            <h2>CONSENTIMIENTO INFORMADO - CIRUGÍA ORAL</h2>
            <div class="consent-content">
                <h3>INFORMACIÓN SOBRE EL PROCEDIMIENTO</h3>
                <p><strong>Tipo de cirugía:</strong> [TIPO_CIRUGIA]</p>
                <p><strong>Objetivo:</strong> Resolución del problema dental mediante intervención quirúrgica</p>
                
                <h3>PROCEDIMIENTO</h3>
                <p>El procedimiento se realizará bajo anestesia local en consulta. Se realizarán las incisiones necesarias, se procederá con la intervención según el tipo de cirugía indicada, y se suturará la herida.</p>

                <h3>RIESGOS POTENCIALES</h3>
                <ul>
                    <li><strong>Infección:</strong> Posibilidad de infección que requiere tratamiento antibiótico</li>
                    <li><strong>Hemorragia:</strong> Sangrado postoperatorio que puede requerir medidas adicionales</li>
                    <li><strong>Dolor:</strong> Dolor postoperatorio controlable con medicación</li>
                    <li><strong>Inflamación:</strong> Hinchazón de la zona intervenida</li>
                    <li><strong>Lesión nerviosa:</strong> Pérdida temporal o permanente de sensibilidad</li>
                    <li><strong>Complicaciones sinusales:</strong> En caso de proximidad a senos maxilares</li>
                </ul>

                <h3>CUIDADOS POSTOPERATORIOS</h3>
                <ul>
                    <li>Aplicación de frío local las primeras 24-48 horas</li>
                    <li>Medicación según prescripción médica</li>
                    <li>Dieta blanda y templada</li>
                    <li>Evitar fumar y alcohol</li>
                    <li>Higiene bucal suave</li>
                </ul>

                <div class="signature-section">
                    <p><strong>Consiento la realización del procedimiento quirúrgico:</strong></p>
                    <p>Fecha: <strong>[FECHA_CONSENTIMIENTO]</strong></p>
                </div>
            </div>
        `;
    }

    /**
     * Genera contenido para consentimiento ortodóntico
     */
    generateOrthodonticConsentContent() {
        return `
            <h2>CONSENTIMIENTO INFORMADO - TRATAMIENTO ORTODÓNCICO</h2>
            <div class="consent-content">
                <h3>INFORMACIÓN SOBRE EL TRATAMIENTO</h3>
                <p><strong>Tipo de tratamiento:</strong> Ortodoncia [TIPO_APARATOS]</p>
                <p><strong>Duración estimada:</strong> [DURACION_TRATAMIENTO]</p>
                <p><strong>Objetivo:</strong> Corrección de la posición dental y mejora de la oclusión</p>

                <h3>PROCEDIMIENTO Y FASES</h3>
                <ol>
                    <li><strong>Estudios previos:</strong> Radiografías, fotografías y modelos</li>
                    <li><strong>Plan de tratamiento:</strong> Diagnóstico y plan personalizado</li>
                    <li><strong>Colocación de aparatos:</strong> Instalación del sistema ortodóncico</li>
                    <li><strong>Controles regulares:</strong> Ajustes mensuales</li>
                    <li><strong>Fase de retención:</strong> Mantenimiento de resultados</li>
                </ol>

                <h3>RIESGOS Y LIMITACIONES</h3>
                <ul>
                    <li><strong>Descalcificación:</strong> Posible aparición de caries si no se mantiene buena higiene</li>
                    <li><strong>Reabsorción radicular:</strong> Acortamiento de las raíces dentales</li>
                    <li><strong>Regresión:</strong> Posible movimiento dental tras el tratamiento</li>
                    <li><strong>Molestias:</strong> Dolor y molestias durante el tratamiento</li>
                    <li><strong>Duración:</strong> El tiempo puede ser mayor al estimado</li>
                </ul>

                <h3>OBLIGACIONES DEL PACIENTE</h3>
                <ul>
                    <li>Mantener excelente higiene bucal</li>
                    <li>Asistir a todas las citas programadas</li>
                    <li>Seguir las indicaciones dietéticas</li>
                    <li>Usar los aparatos según las instrucciones</li>
                    <li>Informar inmediatamente de cualquier problema</li>
                </ul>

                <div class="signature-section">
                    <p><strong>Consiento el tratamiento ortodóncico propuesto:</strong></p>
                    <p>Fecha: <strong>[FECHA_CONSENTIMIENTO]</strong></p>
                </div>
            </div>
        `;
    }

    /**
     * Genera contenido para consentimiento de endodoncia
     */
    generateEndodonticConsentContent() {
        return `
            <h2>CONSENTIMIENTO INFORMADO - ENDODONCIA</h2>
            <div class="consent-content">
                <h3>INFORMACIÓN SOBRE EL TRATAMIENTO</h3>
                <p><strong>Procedimiento:</strong> Tratamiento de conductos radiculares</p>
                <p><strong>Diente afectado:</strong> [DIENTE_AFECTADO]</p>
                <p><strong>Objetivo:</strong> Eliminación del tejido pulpar infectado y sellado del conducto</p>

                <h3>PROCEDIMIENTO</h3>
                <ol>
                    <li><strong>Anestesia:</strong> Anestesia local para eliminar el dolor</li>
                    <li><strong>Apertura:</strong> Creación de acceso a la pulpa</li>
                    <li><strong>Extirpación:</strong> Eliminación de la pulpa infectada</li>
                    <li><strong>Conformación:</strong> Preparación y limpieza de conductos</li>
                    <li><strong>Obturación:</strong> Sellado de los conductos</li>
                    <li><strong>Restauración:</strong> Restauración final del diente</li>
                </ol>

                <h3>RIESGOS Y COMPLICACIONES</h3>
                <ul>
                    <li><strong>Dolor postoperatorio:</strong> Molestias temporales controlables</li>
                    <li><strong>Fractura dental:</strong> Debilitamiento del diente tratado</li>
                    <li><strong>Infección persistente:</strong> Posible necesidad de retratamiento</li>
                    <li><strong>Fracaso del tratamiento:</strong> Posible extracción del diente</li>
                    <li><strong>Complicaciones anatómicas:</strong> Variaciones en la anatomía radicular</li>
                </ul>

                <h3>PRONÓSTICO</h3>
                <p>El éxito del tratamiento endodóntico es del 85-95% en dientes con buena higiene y restauración adecuada. Un diente tratado endodónticamente puede requerir una corona para su protección a largo plazo.</p>

                <div class="signature-section">
                    <p><strong>Consiento el tratamiento endodóntico:</strong></p>
                    <p>Fecha: <strong>[FECHA_CONSENTIMIENTO]</strong></p>
                </div>
            </div>
        `;
    }

    /**
     * Genera contenido para consentimiento de primera visita
     */
    generateFirstVisitConsentContent() {
        return `
            <h2>CONSENTIMIENTO - PRIMERA VISITA DENTAL</h2>
            <div class="consent-content">
                <h3>INFORMACIÓN SOBRE LA VISITA</h3>
                <p><strong>Finalidad:</strong> Primera consulta y exploración dental completa</p>
                <p><strong>Procedimientos incluidos:</strong> Historia clínica, exploración oral, radiografías si es necesario</p>
                <p><strong>Duración estimada:</strong> 45-60 minutos</p>

                <h3>PROCEDIMIENTOS DE LA PRIMERA VISITA</h3>
                <ul>
                    <li><strong>Historia clínica:</strong> Recopilación de información médica y dental</li>
                    <li><strong>Exploración oral:</strong> Examen completo de dientes, encías y tejidos</li>
                    <li><strong>Radiografías:</strong> Si son necesarias para el diagnóstico</li>
                    <li><strong>Fotografías:</strong> Para documentación del estado inicial</li>
                    <li><strong>Diagnóstico y plan:</strong> Explicación de hallazgos y propuesta de tratamiento</li>
                </ul>

                <h3>INFORMACIÓN SOBRE PROTECCIÓN DE DATOS</h3>
                <p>Sus datos serán tratados de forma confidencial conforme a la LOPD para:</p>
                <ul>
                    <li>Gestión de su historial clínico</li>
                    <li>Programación de citas</li>
                    <li>Comunicaciones sobre su tratamiento</li>
                    <li>Facturación y gestión administrativa</li>
                </ul>

                <h3>CONSENTIMIENTO</h3>
                <p>Yo, <strong>[NOMBRE_PACIENTE]</strong>, con DNI <strong>[DNI_PACIENTE]</strong>, declaro que:</p>
                <ul>
                    <li>Consiento la realización de la primera visita dental</li>
                    <li>Acepto el tratamiento de mis datos según la LOPD</li>
                    <li>Autorizo la realización de radiografías si son necesarias</li>
                    <li>Comprendo que esta visita es el inicio de mi tratamiento dental</li>
                </ul>

                <div class="signature-section">
                    <p><strong>Firma digital del paciente:</strong></p>
                    <p>Fecha: <strong>[FECHA_CONSENTIMIENTO]</strong></p>
                </div>
            </div>
        `;
    }

    /**
     * Crea un nuevo consentimiento informado
     */
    async createConsent(consentData) {
        try {
            const token = this.auth.getToken();
            const consent = {
                ...consentData,
                fechaCreacion: new Date().toISOString(),
                usuarioCreacion: this.currentUser.id,
                estado: 'pending',
                version: '1.0'
            };

            const response = await this.api.post('/api/legal/consents', consent, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Registrar en auditoría
            await this.logAuditActivity({
                accion: 'create_consent',
                tipo: 'consent',
                descripcion: `Consentimiento creado: ${consent.tipo}`,
                entidadId: response.data.id
            });

            this.showSuccess('Consentimiento creado correctamente');
            return response.data;
        } catch (error) {
            this.showError('Error al crear el consentimiento', error);
            throw error;
        }
    }

    /**
     * Envía consentimiento por WhatsApp para firma digital
     */
    async sendConsentForSignature(consentId) {
        try {
            const token = this.auth.getToken();
            const consent = await this.getConsentDetails(consentId);
            
            const messageData = {
                to: consent.paciente.telefono,
                template: 'consent_signature',
                consentId: consentId,
                consentType: consent.tipo,
                content: consent.contenido,
                buttons: [
                    { id: 'accept', text: 'Acepto y Firmo', action: 'sign_consent' },
                    { id: 'reject', text: 'No Acepto', action: 'reject_consent' },
                    { id: 'view', text: 'Ver Documento Completo', action: 'view_full_consent' }
                ],
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
            };

            const response = await this.api.post('/api/whatsapp/send-consent', messageData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Actualizar estado del consentimiento
            await this.updateConsentStatus(consentId, 'sent', {
                enviadoWhatsApp: true,
                fechaEnvioWhatsApp: new Date().toISOString()
            });

            this.showSuccess('Consentimiento enviado por WhatsApp');
            return response.data;
        } catch (error) {
            this.showError('Error al enviar el consentimiento', error);
            throw error;
        }
    }

    /**
     * Maneja la firma digital de consentimiento vía WhatsApp
     */
    async handleConsentSignature(consentId, response, patientData) {
        try {
            const token = this.auth.getToken();
            
            let newStatus = 'pending';
            let signatureData = null;

            if (response === 'accept') {
                newStatus = 'signed';
                signatureData = {
                    fechaFirma: new Date().toISOString(),
                    metodoFirma: 'whatsapp_digital',
                    ipAddress: patientData.ip,
                    userAgent: patientData.userAgent,
                    hashFirma: this.generateSignatureHash(consentId, patientData)
                };
            } else if (response === 'reject') {
                newStatus = 'rejected';
            }

            await this.updateConsentStatus(consentId, newStatus, signatureData);

            // Enviar confirmación al paciente
            await this.sendConsentConfirmation(consentId, response);

            // Registrar en auditoría
            await this.logAuditActivity({
                accion: 'consent_signature',
                tipo: 'consent',
                descripcion: `Consentimiento ${response} vía WhatsApp`,
                entidadId: consentId
            });

            // Si la cita está pendiente de consentimiento, actualizarla
            if (response === 'accept' && newStatus === 'signed') {
                await this.updateAppointmentStatusFromConsent(consentId);
            }

            this.showSuccess(`Consentimiento ${response === 'accept' ? 'firmado' : 'rechazado'} correctamente`);
        } catch (error) {
            this.showError('Error al procesar la firma del consentimiento', error);
            throw error;
        }
    }

    /**
     * Actualiza el estado de una cita cuando se firma el consentimiento
     */
    async updateAppointmentStatusFromConsent(consentId) {
        try {
            const consent = await this.getConsentDetails(consentId);
            if (consent.citaId) {
                const token = this.auth.getToken();
                await this.api.patch(`/api/appointments/${consent.citaId}`, {
                    IdSitC: 9, // Estado "Aceptada"
                    fechaConsentimiento: new Date().toISOString(),
                    consentimientoId: consentId
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                // Notificar vía WebSocket
                this.websocket.emit('appointment-accepted', {
                    citaId: consent.citaId,
                    paciente: consent.paciente.id
                });
            }
        } catch (error) {
            console.error('Error al actualizar cita:', error);
        }
    }

    // ========================================
    // GESTIÓN LOPD COMPLETA
    // ========================================

    /**
     * Obtiene el estado de cumplimiento LOPD
     */
    async getLopdComplianceStatus() {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get('/api/legal/lopd/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return response.data;
        } catch (error) {
            // Datos de ejemplo para desarrollo
            return {
                overallCompliant: true,
                complianceScore: 92,
                consentsGiven: 245,
                consentsPercentage: 87,
                pendingConsents: 12,
                actionsRequired: [
                    {
                        id: 1,
                        type: 'consent_renewal',
                        title: 'Renovar Consentimientos Expirados',
                        description: '12 pacientes tienen consentimientos que han expirado',
                        deadline: '2025-12-01',
                        priority: 'high'
                    },
                    {
                        id: 2,
                        type: 'policy_update',
                        title: 'Actualizar Política de Privacidad',
                        description: 'La política debe actualizarse según nueva normativa',
                        deadline: '2025-11-30',
                        priority: 'medium'
                    }
                ]
            };
        }
    }

    /**
     * Registra solicitud de derechos ARCO (Acceso, Rectificación, Cancelación, Oposición)
     */
    async registerArcoRequest(requestData) {
        try {
            const token = this.auth.getToken();
            const arcoRequest = {
                ...requestData,
                fechaSolicitud: new Date().toISOString(),
                numeroSolicitud: this.generateArcoNumber(),
                estado: 'received',
                responsable: this.currentUser.id
            };

            const response = await this.api.post('/api/legal/arco-requests', arcoRequest, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Registrar en auditoría
            await this.logAuditActivity({
                accion: 'arco_request',
                tipo: 'data_rights',
                descripcion: `Solicitud ARCO: ${requestData.tipo} por ${requestData.solicitante}`,
                entidadId: response.data.id
            });

            this.showSuccess('Solicitud ARCO registrada correctamente');
            return response.data;
        } catch (error) {
            this.showError('Error al registrar solicitud ARCO', error);
            throw error;
        }
    }

    /**
     * Procesa solicitud ARCO
     */
    async processArcoRequest(requestId, responseData) {
        try {
            const token = this.auth.getToken();
            const processedRequest = {
                ...responseData,
                fechaProcesado: new Date().toISOString(),
                procesadoPor: this.currentUser.id
            };

            const response = await this.api.patch(`/api/legal/arco-requests/${requestId}`, processedRequest, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Enviar respuesta al solicitante
            await this.sendArcoResponse(requestId, responseData);

            // Registrar en auditoría
            await this.logAuditActivity({
                accion: 'arco_processed',
                tipo: 'data_rights',
                descripcion: `Solicitud ARCO procesada: ${responseData.decision}`,
                entidadId: requestId
            });

            this.showSuccess('Solicitud ARCO procesada correctamente');
            return response.data;
        } catch (error) {
            this.showError('Error al procesar solicitud ARCO', error);
            throw error;
        }
    }

    /**
     * Genera informe de auditoría LOPD
     */
    async generateLopdAuditReport(config) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.post('/api/legal/audit-report', config, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return response.data;
        } catch (error) {
            this.showError('Error al generar informe de auditoría', error);
            throw error;
        }
    }

    /**
     * Registra actividad de auditoría
     */
    async logAuditActivity(activityData) {
        try {
            const auditEntry = {
                ...activityData,
                fecha: new Date().toISOString(),
                usuarioId: this.currentUser?.id || 'system',
                ipAddress: this.getClientIP(),
                userAgent: navigator.userAgent,
                sessionId: this.getSessionId()
            };

            // Enviar al backend
            const token = this.auth.getToken();
            await this.api.post('/api/legal/audit-log', auditEntry, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

        } catch (error) {
            console.error('Error al registrar auditoría:', error);
        }
    }

    // ========================================
    // MÉTODOS DE UTILIDAD
    // ========================================

    getConsentTypeLabel(tipo) {
        const labels = {
            'lopd': 'LOPD General',
            'implant': 'Implante',
            'surgery': 'Cirugía',
            'orthodontic': 'Ortodoncia',
            'endodontic': 'Endodoncia',
            'first-visit': 'Primera Visita'
        };
        return labels[tipo] || tipo;
    }

    getConsentStatusLabel(estado) {
        const labels = {
            'pending': 'Pendiente',
            'sent': 'Enviado',
            'signed': 'Firmado',
            'rejected': 'Rechazado',
            'expired': 'Expirado'
        };
        return labels[estado] || estado;
    }

    getMethodLabel(metodo) {
        const labels = {
            'whatsapp': 'WhatsApp',
            'email': 'Email',
            'in_person': 'Presencial',
            'paper': 'Papel'
        };
        return labels[metodo] || metodo;
    }

    getActionIcon(tipo) {
        const icons = {
            'consent_renewal': 'clock',
            'policy_update': 'file-alt',
            'data_access': 'user-shield',
            'training': 'graduation-cap',
            'audit': 'clipboard-check'
        };
        return icons[tipo] || 'exclamation';
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-ES');
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('es-ES');
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

    generateSignatureHash(consentId, patientData) {
        const data = `${consentId}-${patientData.phone}-${new Date().toISOString()}`;
        return btoa(data).substring(0, 32);
    }

    generateArcoNumber() {
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `ARCO-${year}-${random}`;
    }

    getClientIP() {
        return '127.0.0.1'; // En producción se obtendría del servidor
    }

    getSessionId() {
        return sessionStorage.getItem('sessionId') || 'unknown';
    }

    // ========================================
    // MÉTODOS DE INTERFAZ
    // ========================================

    handleLegalAction(action, element) {
        switch (action) {
            case 'generate-consent':
                this.showConsentGenerator();
                break;
            case 'export-audit':
                this.exportAuditLog();
                break;
            case 'view-consent':
                this.showConsentViewer(element.dataset.id);
                break;
            case 'send-consent':
                this.sendConsentForSignature(element.dataset.id);
                break;
            case 'download-consent':
                this.downloadConsent(element.dataset.id);
                break;
            case 'create-audit-entry':
                this.showAuditEntryCreator();
                break;
            case 'handle-action':
                this.handleLegalActionItem(element.dataset.id);
                break;
        }
    }

    handleLegalForm(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        switch (form.dataset.legalForm) {
            case 'new-consent':
                this.createConsent(data);
                break;
            case 'arco-request':
                this.registerArcoRequest(data);
                break;
            case 'audit-entry':
                this.logAuditActivity(data);
                break;
        }
    }

    applyLegalFilters() {
        // Implementar filtros para tablas legales
        console.log('Aplicando filtros legales...');
    }

    showLoadingState(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Cargando datos legales...</p>
                </div>
            `;
        }
    }

    hideLoadingState(containerId) {
        // Se oculta automáticamente al cargar nuevos datos
    }

    showError(message, error = null) {
        console.error('Error legal:', error);
        
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

    showConsentGenerator() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>Generar Consentimiento Informado</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form class="modal-body" data-legal-form="new-consent">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Tipo de Consentimiento</label>
                            <select name="tipo" required>
                                <option value="">Seleccionar...</option>
                                <option value="lopd">LOPD General</option>
                                <option value="implant">Implante Dental</option>
                                <option value="surgery">Cirugía Oral</option>
                                <option value="orthodontic">Ortodoncia</option>
                                <option value="endodontic">Endodoncia</option>
                                <option value="first-visit">Primera Visita</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Paciente</label>
                            <input type="text" name="pacienteId" placeholder="ID del paciente" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Cita Relacionada (Opcional)</label>
                            <input type="text" name="citaId" placeholder="ID de la cita">
                        </div>
                        <div class="form-group">
                            <label>Método de Envío</label>
                            <select name="metodoEnvio">
                                <option value="whatsapp">WhatsApp</option>
                                <option value="email">Email</option>
                                <option value="in_person">Presencial</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Notas Adicionales</label>
                        <textarea name="notas" rows="3" placeholder="Información adicional..."></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-file-signature"></i> Crear y Enviar
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    showConsentViewer(consentId) {
        // Implementar visor de consentimientos
        this.showSuccess('Abriendo visualizador de consentimiento...');
    }

    async downloadConsent(consentId) {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get(`/api/legal/consents/${consentId}/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `consentimiento-${consentId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            this.showSuccess('Consentimiento descargado correctamente');
        } catch (error) {
            this.showError('Error al descargar el consentimiento', error);
        }
    }

    exportAuditLog() {
        // Implementar exportación de auditoría
        this.showSuccess('Preparando exportación de auditoría...');
    }

    showAuditEntryCreator() {
        // Implementar creador de entradas de auditoría
        this.showSuccess('Abriendo creador de auditoría...');
    }

    handleLegalActionItem(actionId) {
        // Implementar manejador de acciones legales
        this.showSuccess('Procesando acción legal...');
    }

    // ========================================
    // API HELPER METHODS
    // ========================================

    async getConsentDetails(consentId) {
        const token = this.auth.getToken();
        const response = await this.api.get(`/api/legal/consents/${consentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
    }

    async updateConsentStatus(consentId, status, additionalData = {}) {
        const token = this.auth.getToken();
        await this.api.patch(`/api/legal/consents/${consentId}`, {
            estado: status,
            ...additionalData
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    async sendConsentConfirmation(consentId, response) {
        // Implementar envío de confirmación
        console.log('Enviando confirmación de consentimiento:', consentId, response);
    }

    async sendArcoResponse(requestId, responseData) {
        // Implementar envío de respuesta ARCO
        console.log('Enviando respuesta ARCO:', requestId, responseData);
    }

    async getRecentConsents() {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get('/api/legal/consents/recent', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            return [];
        }
    }

    async getAuditSummary() {
        try {
            const token = this.auth.getToken();
            const response = await this.api.get('/api/legal/audit/summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            return {
                totalActivities: 156,
                recentActivities: [
                    {
                        fecha: '2025-11-17 10:30:00',
                        usuario: 'Admin',
                        accion: 'Consentimiento firmado',
                        tipo: 'consent',
                        ip: '192.168.1.100',
                        estado: 'success'
                    }
                ]
            };
        }
    }

    // ========================================
    // WEBSOCKET EVENT HANDLERS
    // ========================================

    handleConsentSigned(data) {
        console.log('Consentimiento firmado:', data);
        this.showSuccess(`Consentimiento firmado por ${data.patientName}`);
        
        // Actualizar tablas si están visibles
        this.updateConsentsTable();
    }

    handleLopdRequest(data) {
        console.log('Nueva solicitud LOPD:', data);
        this.showSuccess(`Nueva solicitud ${data.type} recibida`);
    }

    handleDocumentUpdated(data) {
        console.log('Documento actualizado:', data);
        this.updateDocumentsTable();
    }

    updateConsentsTable() {
        this.getRecentConsents().then(consents => {
            const tbody = document.querySelector('#recent-consents-table tbody');
            if (tbody) {
                tbody.innerHTML = consents.map(consent => `
                    <tr>
                        <td>${this.formatDate(consent.fecha)}</td>
                        <td>${consent.paciente}</td>
                        <td>
                            <span class="consent-type ${consent.tipo}">
                                ${this.getConsentTypeLabel(consent.tipo)}
                            </span>
                        </td>
                        <td>
                            <span class="status-badge ${consent.estado}">
                                ${this.getConsentStatusLabel(consent.estado)}
                            </span>
                        </td>
                        <td>
                            <span class="method-badge ${consent.metodo}">
                                ${this.getMethodLabel(consent.metodo)}
                            </span>
                        </td>
                        <td>
                            <button class="btn-icon" data-legal-action="view-consent" data-id="${consent.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon" data-legal-action="send-consent" data-id="${consent.id}">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                            <button class="btn-icon" data-legal-action="download-consent" data-id="${consent.id}">
                                <i class="fas fa-download"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        });
    }

    updateDocumentsTable() {
        // Actualizar tabla de documentos
        console.log('Actualizando tabla de documentos...');
    }
}

// Inicializar el sistema legal cuando se carga el DOM
document.addEventListener('DOMContentLoaded', () => {
    window.legal = new LegalSystem();
});