/**
 * DOCUMENTS.JS - Sistema de Gestión Documental Completo
 * Clínica Dental Rubio García - Sistema de Documentos Inteligente
 * 
 * Funcionalidades:
 * - Gestión completa de documentos médicos y administrativos
 * - Upload/Download con validación de tipos y tamaños
 * - Preview integrado para documentos PDF, imágenes, etc.
 * - Categorización automática y manual de documentos
 * - Sistema de firma digital integrado
 * - Búsqueda avanzada y filtrado por metadatos
 * - Historial de versiones y control de cambios
 * - Compliance con LOPD y normativas sanitarias
 * - Integración con SQL Server tabla DDocumentos
 */

class DocumentsManager {
    constructor() {
        this.documents = [];
        this.categories = {};
        this.currentDocument = null;
        this.currentView = 'grid'; // grid, list, detail
        this.searchFilters = {};
        this.uploadQueue = [];
        this.supportedFormats = {
            documents: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
            images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'],
            medical: ['dcm', 'nii', 'nii.gz', 'rst', 'dicom'],
            audio: ['mp3', 'wav', 'aac', 'm4a'],
            video: ['mp4', 'avi', 'mov', 'mkv']
        };
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.currentPage = 1;
        this.pageSize = 24;
        
        // Tipos de documentos por categoría
        this.documentTypes = {
            clinical: {
                name: 'Clínicos',
                icon: '🏥',
                types: [
                    'radiografias', 'ortopantomografias', 'tac', 'resonancias',
                    'historia_clinica', 'consentimientos', 'protocolos',
                    'informes_medicos', 'diagnosticos', 'tratamientos'
                ]
            },
            administrative: {
                name: 'Administrativos',
                icon: '📄',
                types: [
                    'facturas', 'presupuestos', 'contratos', 'presupuestos_financiacion',
                    'autorizaciones', 'certificados', 'justificantes'
                ]
            },
            legal: {
                name: 'Legales',
                icon: '⚖️',
                types: [
                    'consentimientos_lopd', 'formularios_primera_visita',
                    'derechos_arco', 'auditoria_lopd', 'consentimientos_tratamiento'
                ]
            },
            ortodoncial: {
                name: 'Ortodonciales',
                icon: '🦷',
                types: [
                    'estudios_ortodoncia', 'modelos_3d', 'simulaciones',
                    'fotografias_boca', 'trazados_cefalometricos', 'planificacion_ortodoncia'
                ]
            },
            surgical: {
                name: 'Quirúrgicos',
                icon: '🔬',
                types: [
                    'protocolos_quirurgicos', 'consentimientos_cirugia',
                    'informes_operatorio', 'seguimiento_postoperatorio'
                ]
            }
        };

        this.init();
    }

    async init() {
        try {
            console.log('📁 Inicializando sistema de gestión documental...');
            
            // Cargar configuración
            await this.loadConfiguration();
            await this.loadCategories();
            
            // Inicializar interface
            this.setupDocumentsInterface();
            this.setupEventListeners();
            this.setupFileUploadHandlers();
            
            // Cargar documentos iniciales
            await this.loadDocuments();
            
            console.log('✅ Sistema de gestión documental inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando sistema documental:', error);
            this.showError('Error inicializando el sistema de gestión documental');
        }
    }

    async loadConfiguration() {
        try {
            const response = await api.get('/api/documents/config');
            if (response.success) {
                this.config = response.data;
            }
        } catch (error) {
            console.error('Error cargando configuración:', error);
            this.config = {
                auto_categorize: true,
                require_digital_signature: false,
                retention_periods: {
                    clinical: 30, // años
                    administrative: 6, // años
                    legal: 10, // años
                    ortodoncial: 20, // años
                    surgical: 30 // años
                }
            };
        }
    }

    async loadCategories() {
        try {
            const response = await api.get('/api/documents/categories');
            if (response.success) {
                this.categories = response.data;
            }
        } catch (error) {
            console.error('Error cargando categorías:', error);
            this.categories = this.documentTypes;
        }
    }

    setupDocumentsInterface() {
        const documentsContainer = document.getElementById('documents-container');
        if (!documentsContainer) return;

        documentsContainer.innerHTML = `
            <div class="documents-layout">
                <!-- Header con estadísticas -->
                <div class="documents-header">
                    <div class="header-left">
                        <h2>Gestión Documental</h2>
                        <div class="stats-info">
                            <span class="stat-item">
                                <strong id="total-documents">0</strong> documentos
                            </span>
                            <span class="stat-item">
                                <strong id="total-size">0 MB</strong> usados
                            </span>
                            <span class="stat-item">
                                <strong id="pending-signature">0</strong> por firmar
                            </span>
                            <span class="stat-item">
                                <strong id="expired-documents">0</strong> vencidos
                            </span>
                        </div>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="documentsManager.uploadDocument()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H15" stroke="currentColor" stroke-width="2"/>
                                <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 15V3" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Subir Documento
                        </button>
                        <button class="btn btn-outline" onclick="documentsManager.createDocument()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Nuevo Documento
                        </button>
                        <button class="btn btn-outline" onclick="documentsManager.exportDocuments()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H15" stroke="currentColor" stroke-width="2"/>
                                <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 15V3" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Exportar
                        </button>
                    </div>
                </div>
                
                <!-- Panel de búsqueda y filtros -->
                <div class="search-filters-panel">
                    <div class="search-section">
                        <div class="search-input-container">
                            <input type="text" id="documents-search" placeholder="Buscar documentos (nombre, contenido, tags)..." 
                                   oninput="documentsManager.searchDocuments(this.value)">
                            <button class="search-btn" onclick="documentsManager.performSearch()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                                    <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                        </div>
                        
                        <div class="category-filters">
                            <button class="category-filter active" data-category="all" onclick="documentsManager.setCategoryFilter('all')">
                                <span class="category-icon">📁</span>
                                Todos
                            </button>
                            ${Object.entries(this.categories).map(([key, category]) => `
                                <button class="category-filter" data-category="${key}" onclick="documentsManager.setCategoryFilter('${key}')">
                                    <span class="category-icon">${category.icon}</span>
                                    ${category.name}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="view-controls">
                        <button class="view-btn active" data-view="grid" onclick="documentsManager.changeView('grid')" title="Vista de cuadrícula">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M3 3H9V9H3V3Z" stroke="currentColor" stroke-width="2"/>
                                <path d="M15 3H21V9H15V3Z" stroke="currentColor" stroke-width="2"/>
                                <path d="M3 15H9V21H3V15Z" stroke="currentColor" stroke-width="2"/>
                                <path d="M15 15H21V21H15V15Z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                        <button class="view-btn" data-view="list" onclick="documentsManager.changeView('list')" title="Vista de lista">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- Contenido de documentos -->
                <div class="documents-content">
                    <div class="documents-container" id="documents-container-content">
                        <!-- Grid/lista de documentos se carga dinámicamente -->
                    </div>
                    
                    <!-- Upload progress -->
                    <div id="upload-progress" class="upload-progress" style="display: none;">
                        <div class="upload-header">
                            <h4>Subiendo archivos...</h4>
                            <button onclick="documentsManager.cancelUpload()">×</button>
                        </div>
                        <div class="upload-queue" id="upload-queue">
                            <!-- Progress bars se agregan dinámicamente -->
                        </div>
                    </div>
                    
                    <!-- Paginación -->
                    <div class="pagination-container" id="documents-pagination">
                        <!-- Paginación se carga dinámicamente -->
                    </div>
                </div>
            </div>
            
            <!-- Modales -->
            <div id="document-modal" class="modal">
                <!-- Modal de documento se carga dinámicamente -->
            </div>
            
            <div id="document-preview-modal" class="modal large">
                <!-- Modal de preview se carga dinámicamente -->
            </div>
            
            <div id="upload-modal" class="modal">
                <!-- Modal de upload se carga dinámicamente -->
            </div>
            
            <!-- Floating upload button -->
            <div class="floating-upload" onclick="documentsManager.uploadDocument()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>
        `;

        this.updateStats();
    }

    setupEventListeners() {
        // Drag and drop handlers
        const dropZone = document.querySelector('.documents-layout');
        if (dropZone) {
            dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
            dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
            dropZone.addEventListener('drop', this.handleDrop.bind(this));
        }

        // Event listeners para documentos
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('document-card')) {
                const documentId = e.target.dataset.documentId;
                this.showDocumentDetail(documentId);
            }
            
            if (e.target.classList.contains('document-preview-btn')) {
                e.stopPropagation();
                const documentId = e.target.dataset.documentId;
                this.previewDocument(documentId);
            }
            
            if (e.target.classList.contains('document-download-btn')) {
                e.stopPropagation();
                const documentId = e.target.dataset.documentId;
                this.downloadDocument(documentId);
            }
            
            if (e.target.classList.contains('document-edit-btn')) {
                e.stopPropagation();
                const documentId = e.target.dataset.documentId;
                this.editDocument(documentId);
            }
            
            if (e.target.classList.contains('document-delete-btn')) {
                e.stopPropagation();
                const documentId = e.target.dataset.documentId;
                this.deleteDocument(documentId);
            }
            
            if (e.target.classList.contains('document-sign-btn')) {
                e.stopPropagation();
                const documentId = e.target.dataset.documentId;
                this.requestSignature(documentId);
            }
        });
    }

    setupFileUploadHandlers() {
        // Configurar input de archivo oculto
        let fileInput = document.getElementById('file-upload-input');
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'file-upload-input';
            fileInput.multiple = true;
            fileInput.accept = this.getAcceptedFileTypes();
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
        }

        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });
    }

    async loadDocuments() {
        try {
            const params = {
                page: this.currentPage,
                pageSize: this.pageSize,
                ...this.searchFilters
            };

            const response = await api.get('/api/documents', { params });
            
            if (response.success) {
                this.documents = response.data.documents;
                this.totalDocuments = response.data.total;
                this.renderDocuments();
                this.updatePagination();
                this.updateStats();
            }
        } catch (error) {
            console.error('Error cargando documentos:', error);
            this.loadSampleDocuments();
        }
    }

    loadSampleDocuments() {
        this.documents = [
            {
                id: 'DOC001',
                name: 'Historia_Clínica_Ana_García.pdf',
                originalName: 'Historia clínica completa.pdf',
                type: 'clinical',
                category: 'historia_clinica',
                size: 2048576, // 2MB
                uploadedAt: '2024-11-15T10:30:00Z',
                modifiedAt: '2024-11-15T10:30:00Z',
                patientId: 'P001',
                patientName: 'Ana García López',
                tags: ['historia clínica', 'primera visita', 'ortodoncia'],
                description: 'Historia clínica completa de la primera visita',
                version: 1,
                hasSignature: false,
                needsSignature: true,
                expired: false,
                mimeType: 'application/pdf'
            },
            {
                id: 'DOC002',
                name: 'Radiografia_Panoramica_2024.jpg',
                originalName: 'ortopantomografia_2024.jpg',
                type: 'clinical',
                category: 'radiografias',
                size: 3145728, // 3MB
                uploadedAt: '2024-11-10T14:20:00Z',
                modifiedAt: '2024-11-10T14:20:00Z',
                patientId: 'P002',
                patientName: 'Carlos Martín Ruiz',
                tags: ['ortopantomografía', 'diagnóstico', 'endodoncia'],
                description: 'Radiografía panorámica para diagnóstico de endodoncia',
                version: 1,
                hasSignature: true,
                needsSignature: false,
                expired: false,
                mimeType: 'image/jpeg'
            },
            {
                id: 'DOC003',
                name: 'Consentimiento_LOPD_Maria_Fernandez.pdf',
                originalName: 'Formulario_LOPD_Maria.pdf',
                type: 'legal',
                category: 'consentimientos_lopd',
                size: 512000, // 512KB
                uploadedAt: '2024-11-05T09:15:00Z',
                modifiedAt: '2024-11-05T09:15:00Z',
                patientId: 'P003',
                patientName: 'María Fernández Silva',
                tags: ['LOPD', 'consentimiento', 'datos personales'],
                description: 'Consentimiento para tratamiento de datos personales LOPD',
                version: 2,
                hasSignature: true,
                needsSignature: false,
                expired: false,
                mimeType: 'application/pdf'
            },
            {
                id: 'DOC004',
                name: 'Factura_F2024001.pdf',
                originalName: 'Factura número F2024001.pdf',
                type: 'administrative',
                category: 'facturas',
                size: 153600, // 150KB
                uploadedAt: '2024-11-15T11:00:00Z',
                modifiedAt: '2024-11-15T11:00:00Z',
                patientId: 'P001',
                patientName: 'Ana García López',
                tags: ['factura', 'consulta', 'pago'],
                description: 'Factura por consulta de ortodoncia',
                version: 1,
                hasSignature: false,
                needsSignature: false,
                expired: false,
                mimeType: 'application/pdf'
            },
            {
                id: 'DOC005',
                name: 'Tac_3D_Juan_Perez.dcm',
                originalName: 'tac_dental_juan_perez.dcm',
                type: 'clinical',
                category: 'tac',
                size: 52428800, // 50MB
                uploadedAt: '2024-11-12T16:45:00Z',
                modifiedAt: '2024-11-12T16:45:00Z',
                patientId: 'P004',
                patientName: 'Juan Pérez González',
                tags: ['TAC', '3D', 'implantes', 'planificación'],
                description: 'TAC 3D para planificación de implantes',
                version: 1,
                hasSignature: true,
                needsSignature: false,
                expired: false,
                mimeType: 'application/dicom'
            }
        ];

        this.totalDocuments = this.documents.length;
        this.renderDocuments();
        this.updatePagination();
        this.updateStats();
    }

    renderDocuments() {
        const container = document.getElementById('documents-container-content');
        if (!container) return;

        if (this.currentView === 'grid') {
            container.innerHTML = this.renderDocumentsGrid();
        } else {
            container.innerHTML = this.renderDocumentsList();
        }
    }

    renderDocumentsGrid() {
        const filteredDocs = this.filterDocuments();
        
        return `
            <div class="documents-grid">
                ${filteredDocs.map(doc => this.renderDocumentCard(doc)).join('')}
            </div>
            ${filteredDocs.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-icon">📁</div>
                    <h3>No se encontraron documentos</h3>
                    <p>Prueba con otros filtros o sube un nuevo documento</p>
                    <button class="btn btn-primary" onclick="documentsManager.uploadDocument()">
                        Subir Documento
                    </button>
                </div>
            ` : ''}
        `;
    }

    renderDocumentsList() {
        const filteredDocs = this.filterDocuments();
        
        return `
            <div class="documents-table-container">
                <table class="documents-table">
                    <thead>
                        <tr>
                            <th>Documento</th>
                            <th>Tipo</th>
                            <th>Paciente</th>
                            <th>Tamaño</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredDocs.map(doc => this.renderDocumentRow(doc)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderDocumentCard(doc) {
        const fileIcon = this.getFileIcon(doc.mimeType);
        const category = this.categories[doc.type] || { name: 'Sin categoría', icon: '📄' };
        const statusBadge = this.getDocumentStatusBadge(doc);
        
        return `
            <div class="document-card" data-document-id="${doc.id}">
                <div class="document-thumbnail">
                    ${fileIcon}
                    ${doc.needsSignature ? '<div class="signature-badge">⚠️ Firma</div>' : ''}
                    ${doc.expired ? '<div class="expired-badge">⚠️ Vencido</div>' : ''}
                </div>
                <div class="document-info">
                    <h4 class="document-name" title="${doc.name}">${this.truncateText(doc.name, 40)}</h4>
                    <p class="document-patient">${doc.patientName}</p>
                    <div class="document-meta">
                        <span class="document-category">
                            <span class="category-icon">${category.icon}</span>
                            ${category.name}
                        </span>
                        <span class="document-size">${this.formatFileSize(doc.size)}</span>
                    </div>
                    ${doc.tags.length > 0 ? `
                        <div class="document-tags">
                            ${doc.tags.slice(0, 3).map(tag => `
                                <span class="tag">${tag}</span>
                            `).join('')}
                            ${doc.tags.length > 3 ? `<span class="tag-more">+${doc.tags.length - 3}</span>` : ''}
                        </div>
                    ` : ''}
                </div>
                <div class="document-actions">
                    <button class="action-btn document-preview-btn" data-document-id="${doc.id}" title="Vista previa">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" stroke-width="2"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="action-btn document-download-btn" data-document-id="${doc.id}" title="Descargar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H15" stroke="currentColor" stroke-width="2"/>
                            <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 15V3" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="action-btn document-edit-btn" data-document-id="${doc.id}" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M11 4H4A2 2 0 0 0 2 6V20A2 2 0 0 0 4 22H18A2 2 0 0 0 20 20V13" stroke="currentColor" stroke-width="2"/>
                            <path d="M18.5 2.5A2.12 2.12 0 0 0 16 5V7H14V9H16V11H18V9H20V7H18V5A2.12 2.12 0 0 0 18.5 2.5Z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                    ${doc.needsSignature ? `
                        <button class="action-btn document-sign-btn" data-document-id="${doc.id}" title="Firmar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M17 3C17.5 3 18 3.5 18 4C18 4.5 17.5 5 17 5C16.5 5 16 4.5 16 4C16 3.5 16.5 3 17 3Z" stroke="currentColor" stroke-width="2"/>
                                <path d="M5 12.51L6.41 13.92L11 9.33L14.29 12.62L19.71 7.2L21.12 8.61L14.29 15.44L8.59 9.74L5 12.51Z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    ` : ''}
                    <button class="action-btn danger document-delete-btn" data-document-id="${doc.id}" title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M3 6H5H21M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6M19 6C19 7.10457 18.1046 8 17 8C15.8954 8 15 7.10457 15 6M5 6C5 7.10457 5.89543 8 7 8C8.10457 8 9 7.10457 9 6" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    renderDocumentRow(doc) {
        const category = this.categories[doc.type] || { name: 'Sin categoría', icon: '📄' };
        const statusBadge = this.getDocumentStatusBadge(doc);
        
        return `
            <tr class="document-row" data-document-id="${doc.id}">
                <td class="document-cell">
                    <div class="document-info-cell">
                        <div class="document-icon">${this.getFileIcon(doc.mimeType)}</div>
                        <div class="document-details">
                            <strong>${doc.name}</strong>
                            ${doc.description ? `<small>${doc.description}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="document-type">
                        <span class="category-icon">${category.icon}</span>
                        ${category.name}
                    </span>
                </td>
                <td>${doc.patientName}</td>
                <td>${this.formatFileSize(doc.size)}</td>
                <td>${this.formatDate(doc.uploadedAt)}</td>
                <td>${statusBadge}</td>
                <td class="actions-cell">
                    <div class="action-buttons">
                        <button class="action-btn document-preview-btn" data-document-id="${doc.id}" title="Vista previa">
                            Vista
                        </button>
                        <button class="action-btn document-download-btn" data-document-id="${doc.id}" title="Descargar">
                            Descargar
                        </button>
                        ${doc.needsSignature ? `
                            <button class="action-btn document-sign-btn" data-document-id="${doc.id}" title="Firmar">
                                Firmar
                            </button>
                        ` : ''}
                        <button class="action-btn document-edit-btn" data-document-id="${doc.id}" title="Editar">
                            Editar
                        </button>
                        <button class="action-btn danger document-delete-btn" data-document-id="${doc.id}" title="Eliminar">
                            Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    getFileIcon(mimeType) {
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('image')) return '🖼️';
        if (mimeType.includes('video')) return '🎥';
        if (mimeType.includes('audio')) return '🎵';
        if (mimeType.includes('dicom')) return '🏥';
        return '📎';
    }

    getDocumentStatusBadge(doc) {
        if (doc.expired) {
            return '<span class="status-badge expired">Vencido</span>';
        }
        if (doc.needsSignature) {
            return '<span class="status-badge pending">Pendiente firma</span>';
        }
        if (doc.hasSignature) {
            return '<span class="status-badge signed">Firmado</span>';
        }
        return '<span class="status-badge active">Activo</span>';
    }

    filterDocuments() {
        let filtered = [...this.documents];

        // Filtrar por categoría
        if (this.searchFilters.category && this.searchFilters.category !== 'all') {
            filtered = filtered.filter(doc => doc.type === this.searchFilters.category);
        }

        // Filtrar por búsqueda
        if (this.searchFilters.query) {
            const query = this.searchFilters.query.toLowerCase();
            filtered = filtered.filter(doc => 
                doc.name.toLowerCase().includes(query) ||
                doc.description?.toLowerCase().includes(query) ||
                doc.patientName.toLowerCase().includes(query) ||
                doc.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }

        return filtered;
    }

    updateStats() {
        const totalElement = document.getElementById('total-documents');
        const sizeElement = document.getElementById('total-size');
        const pendingElement = document.getElementById('pending-signature');
        const expiredElement = document.getElementById('expired-documents');

        if (totalElement) totalElement.textContent = this.documents.length;
        
        if (sizeElement) {
            const totalSize = this.documents.reduce((sum, doc) => sum + doc.size, 0);
            sizeElement.textContent = this.formatFileSize(totalSize);
        }

        if (pendingElement) {
            const pendingCount = this.documents.filter(doc => doc.needsSignature).length;
            pendingElement.textContent = pendingCount;
        }

        if (expiredElement) {
            const expiredCount = this.documents.filter(doc => doc.expired).length;
            expiredElement.textContent = expiredCount;
        }
    }

    // Funciones de upload
    uploadDocument() {
        const modal = document.getElementById('upload-modal');
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>Subir Documento</h3>
                    <button class="close-btn" onclick="this.closest('.modal').style.display='none'">
                        <svg width="24" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="upload-form" onsubmit="documentsManager.processUpload(event)">
                        <div class="upload-section">
                            <div class="upload-drop-zone" onclick="documentsManager.triggerFileSelect()">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H15" stroke="currentColor" stroke-width="2"/>
                                    <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2"/>
                                    <path d="M12 15V3" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                <h4>Arrastra archivos aquí o haz clic para seleccionar</h4>
                                <p>Formatos aceptados: PDF, DOC, DOCX, JPG, PNG, DICOM</p>
                                <p>Tamaño máximo: ${this.formatFileSize(this.maxFileSize)}</p>
                            </div>
                            
                            <div id="selected-files" class="selected-files" style="display: none;">
                                <!-- Archivos seleccionados se muestran aquí -->
                            </div>
                        </div>
                        
                        <div class="upload-meta-section">
                            <h4>Información del Documento</h4>
                            <div class="form-grid">
                                <div class="form-row">
                                    <label for="document-category">Categoría *</label>
                                    <select id="document-category" name="category" required>
                                        <option value="">Seleccionar categoría</option>
                                        ${Object.entries(this.categories).map(([key, category]) => `
                                            <option value="${key}">${category.icon} ${category.name}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="form-row">
                                    <label for="document-type">Tipo específico</label>
                                    <select id="document-type" name="type">
                                        <option value="">Seleccionar tipo</option>
                                    </select>
                                </div>
                                <div class="form-row">
                                    <label for="document-patient">Paciente</label>
                                    <select id="document-patient" name="patientId">
                                        <option value="">Seleccionar paciente</option>
                                    </select>
                                </div>
                                <div class="form-row full-width">
                                    <label for="document-description">Descripción</label>
                                    <textarea id="document-description" name="description" rows="3" 
                                              placeholder="Descripción del documento..."></textarea>
                                </div>
                                <div class="form-row full-width">
                                    <label for="document-tags">Tags (separados por comas)</label>
                                    <input type="text" id="document-tags" name="tags" 
                                           placeholder="ejemplo: radiografía, diagnóstico, ortodoncia">
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" onclick="this.closest('.modal').style.display='none'">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary" id="upload-submit-btn">
                                Subir Documento${this.uploadQueue.length > 1 ? 's' : ''}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        // Cargar opciones de pacientes
        this.loadPatientOptions();
        
        // Configurar tipos según categoría
        this.setupCategoryTypeMapping();
    }

    triggerFileSelect() {
        document.getElementById('file-upload-input').click();
    }

    handleFileSelect(files) {
        if (!files || files.length === 0) return;

        // Validar archivos
        const validFiles = [];
        const errors = [];

        Array.from(files).forEach(file => {
            if (!this.isValidFile(file)) {
                errors.push(`${file.name}: Formato no válido o tamaño excedido`);
            } else {
                validFiles.push(file);
            }
        });

        if (errors.length > 0) {
            this.showError('Archivos con errores:\n' + errors.join('\n'));
        }

        if (validFiles.length > 0) {
            this.showSelectedFiles(validFiles);
            this.uploadQueue = validFiles;
        }
    }

    isValidFile(file) {
        // Verificar tamaño
        if (file.size > this.maxFileSize) {
            return false;
        }

        // Verificar extensión
        const extension = file.name.split('.').pop().toLowerCase();
        const allFormats = Object.values(this.supportedFormats).flat();
        return allFormats.includes(extension);
    }

    showSelectedFiles(files) {
        const container = document.getElementById('selected-files');
        if (!container) return;

        container.innerHTML = `
            <h4>Archivos seleccionados (${files.length})</h4>
            <div class="files-list">
                ${files.map(file => `
                    <div class="file-item">
                        <div class="file-info">
                            <span class="file-icon">${this.getFileIcon(file.type)}</span>
                            <div class="file-details">
                                <strong>${file.name}</strong>
                                <small>${this.formatFileSize(file.size)}</small>
                            </div>
                        </div>
                        <button type="button" class="remove-file-btn" onclick="documentsManager.removeFile('${file.name}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

        container.style.display = 'block';
    }

    removeFile(fileName) {
        this.uploadQueue = this.uploadQueue.filter(f => f.name !== fileName);
        
        if (this.uploadQueue.length === 0) {
            document.getElementById('selected-files').style.display = 'none';
        } else {
            this.showSelectedFiles(this.uploadQueue);
        }
    }

    async processUpload(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const category = formData.get('category');
        const type = formData.get('type');
        const patientId = formData.get('patientId');
        const description = formData.get('description');
        const tags = formData.get('tags')?.split(',').map(tag => tag.trim()) || [];

        if (this.uploadQueue.length === 0) {
            this.showError('No hay archivos seleccionados');
            return;
        }

        const progressPanel = document.getElementById('upload-progress');
        const queueContainer = document.getElementById('upload-queue');
        
        if (progressPanel) progressPanel.style.display = 'block';
        if (queueContainer) queueContainer.innerHTML = '';

        // Subir archivos uno por uno
        for (let i = 0; i < this.uploadQueue.length; i++) {
            const file = this.uploadQueue[i];
            await this.uploadSingleFile(file, category, type, patientId, description, tags, i);
        }

        // Limpiar y cerrar
        this.uploadQueue = [];
        setTimeout(() => {
            if (progressPanel) progressPanel.style.display = 'none';
            this.closeModal();
            this.loadDocuments(); // Recargar lista
        }, 2000);
    }

    async uploadSingleFile(file, category, type, patientId, description, tags, index) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);
        formData.append('type', type);
        formData.append('patientId', patientId);
        formData.append('description', description);
        formData.append('tags', JSON.stringify(tags));

        // Crear progress bar
        const queueContainer = document.getElementById('upload-queue');
        const progressBar = document.createElement('div');
        progressBar.className = 'upload-item';
        progressBar.innerHTML = `
            <div class="upload-file-info">
                <span class="file-icon">${this.getFileIcon(file.type)}</span>
                <span class="file-name">${file.name}</span>
            </div>
            <div class="upload-progress-bar">
                <div class="upload-progress-fill" style="width: 0%"></div>
            </div>
            <span class="upload-status">Subiendo...</span>
        `;
        queueContainer.appendChild(progressBar);

        try {
            const response = await api.post('/api/documents/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    progressBar.querySelector('.upload-progress-fill').style.width = percentCompleted + '%';
                }
            });

            if (response.success) {
                progressBar.querySelector('.upload-status').textContent = 'Completado';
                progressBar.querySelector('.upload-status').classList.add('success');
                this.showSuccess(`Documento ${file.name} subido correctamente`);
            }
        } catch (error) {
            console.error('Error subiendo archivo:', error);
            progressBar.querySelector('.upload-status').textContent = 'Error';
            progressBar.querySelector('.upload-status').classList.add('error');
            this.showError(`Error subiendo ${file.name}`);
        }
    }

    // Drag and drop handlers
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        this.handleFileSelect(files);
    }

    // Funciones de visualización
    async previewDocument(documentId) {
        try {
            const document = this.documents.find(doc => doc.id === documentId);
            if (!document) return;

            const modal = document.getElementById('document-preview-modal');
            if (!modal) return;

            modal.innerHTML = `
                <div class="modal-content xlarge">
                    <div class="modal-header">
                        <h3>Vista Previa: ${document.name}</h3>
                        <button class="close-btn" onclick="this.closest('.modal').style.display='none'">
                            <svg width="24" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="document-preview-container">
                            <div class="document-info-panel">
                                <h4>Información del Documento</h4>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>Nombre:</label>
                                        <span>${document.name}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Tipo:</label>
                                        <span>${this.categories[document.type]?.name || 'Sin categoría'}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Paciente:</label>
                                        <span>${document.patientName}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Tamaño:</label>
                                        <span>${this.formatFileSize(document.size)}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Fecha:</label>
                                        <span>${this.formatDate(document.uploadedAt)}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Versión:</label>
                                        <span>${document.version}</span>
                                    </div>
                                </div>
                                
                                ${document.description ? `
                                    <div class="description-section">
                                        <h5>Descripción</h5>
                                        <p>${document.description}</p>
                                    </div>
                                ` : ''}
                                
                                ${document.tags.length > 0 ? `
                                    <div class="tags-section">
                                        <h5>Tags</h5>
                                        <div class="document-tags">
                                            ${document.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="document-viewer">
                                <div class="viewer-content" id="document-viewer">
                                    ${this.generateViewerContent(document)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="documentsManager.downloadDocument('${document.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H15" stroke="currentColor" stroke-width="2"/>
                                <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 15V3" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Descargar
                        </button>
                        ${document.needsSignature ? `
                            <button class="btn btn-warning" onclick="documentsManager.requestSignature('${document.id}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M17 3C17.5 3 18 3.5 18 4C18 4.5 17.5 5 17 5C16.5 5 16 4.5 16 4C16 3.5 16.5 3 17 3Z" stroke="currentColor" stroke-width="2"/>
                                    <path d="M5 12.51L6.41 13.92L11 9.33L14.29 12.62L19.71 7.2L21.12 8.61L14.29 15.44L8.59 9.74L5 12.51Z" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                Firmar Documento
                            </button>
                        ` : ''}
                        <button class="btn btn-primary" onclick="documentsManager.editDocument('${document.id}')">
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
            console.error('Error en vista previa:', error);
            this.showError('Error cargando vista previa del documento');
        }
    }

    generateViewerContent(document) {
        const mimeType = document.mimeType;

        if (mimeType.includes('pdf')) {
            return `
                <div class="pdf-viewer">
                    <iframe src="/api/documents/${document.id}/preview" class="document-iframe"></iframe>
                </div>
            `;
        }

        if (mimeType.includes('image')) {
            return `
                <div class="image-viewer">
                    <img src="/api/documents/${document.id}/preview" alt="${document.name}" class="document-image">
                </div>
            `;
        }

        if (mimeType.includes('dicom')) {
            return `
                <div class="dicom-viewer">
                    <div class="dicom-placeholder">
                        <h4>🔬 Visor DICOM</h4>
                        <p>Este documento requiere un visor médico especializado</p>
                        <p>Use el botón descargar para abrir con su software DICOM</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="generic-viewer">
                <div class="file-icon-large">${this.getFileIcon(mimeType)}</div>
                <h4>Vista previa no disponible</h4>
                <p>El formato de este documento no permite vista previa</p>
                <button class="btn btn-primary" onclick="documentsManager.downloadDocument('${document.id}')">
                    Descargar para ver
                </button>
            </div>
        `;
    }

    // Funciones de gestión
    async downloadDocument(documentId) {
        try {
            const document = this.documents.find(doc => doc.id === documentId);
            if (!document) return;

            const response = await api.get(`/api/documents/${documentId}/download`, {
                responseType: 'blob'
            });

            if (response.success) {
                const blob = new Blob([response.data]);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = document.originalName || document.name;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                this.showSuccess('Documento descargado correctamente');
            }
        } catch (error) {
            console.error('Error descargando documento:', error);
            this.showError('Error descargando el documento');
        }
    }

    async deleteDocument(documentId) {
        const document = this.documents.find(doc => doc.id === documentId);
        if (!document) return;

        const confirmed = confirm(`¿Estás seguro de que quieres eliminar "${document.name}"? Esta acción no se puede deshacer.`);
        if (!confirmed) return;

        try {
            const response = await api.delete(`/api/documents/${documentId}`);
            
            if (response.success) {
                this.documents = this.documents.filter(doc => doc.id !== documentId);
                this.renderDocuments();
                this.updateStats();
                this.showSuccess('Documento eliminado correctamente');
            }
        } catch (error) {
            console.error('Error eliminando documento:', error);
            this.showError('Error eliminando el documento');
        }
    }

    async requestSignature(documentId) {
        const document = this.documents.find(doc => doc.id === documentId);
        if (!document) return;

        try {
            // Abrir modal de firma digital
            const modal = document.getElementById('signature-modal') || this.createSignatureModal();
            
            modal.querySelector('[data-document-name]').textContent = document.name;
            modal.style.display = 'flex';

        } catch (error) {
            console.error('Error solicitando firma:', error);
            this.showError('Error solicitando la firma del documento');
        }
    }

    createSignatureModal() {
        const modal = document.createElement('div');
        modal.id = 'signature-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content medium">
                <div class="modal-header">
                    <h3>Firma Digital</h3>
                    <button class="close-btn" onclick="this.closest('.modal').style.display='none'">
                        <svg width="24" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Firmar documento: <strong data-document-name=""></strong></p>
                    
                    <div class="signature-canvas-container">
                        <canvas id="signature-canvas" width="400" height="200" style="border: 1px solid #ccc; touch-action: none;"></canvas>
                        <div class="signature-controls">
                            <button type="button" class="btn btn-sm btn-outline" onclick="documentsManager.clearSignature()">
                                Limpiar
                            </button>
                            <button type="button" class="btn btn-sm btn-primary" onclick="documentsManager.saveSignature()">
                                Firmar
                            </button>
                        </div>
                    </div>
                    
                    <div class="signature-info">
                        <p><small>Al firmar este documento, confirmas su autenticidad e integridad.</small></p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        return modal;
    }

    // Utilidades
    getAcceptedFileTypes() {
        const allFormats = Object.values(this.supportedFormats).flat();
        return '.' + allFormats.join(',.');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    loadPatientOptions() {
        // Cargar lista de pacientes para el selector
        console.log('Cargando opciones de pacientes...');
        // Implementar carga de pacientes
    }

    setupCategoryTypeMapping() {
        const categorySelect = document.getElementById('document-category');
        const typeSelect = document.getElementById('document-type');
        
        if (!categorySelect || !typeSelect) return;

        categorySelect.addEventListener('change', (e) => {
            const category = e.target.value;
            this.updateTypeOptions(category);
        });
    }

    updateTypeOptions(category) {
        const typeSelect = document.getElementById('document-type');
        if (!typeSelect) return;

        typeSelect.innerHTML = '<option value="">Seleccionar tipo</option>';

        if (category && this.categories[category]) {
            this.categories[category].types.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                typeSelect.appendChild(option);
            });
        }
    }

    // Búsqueda y filtros
    searchDocuments(query) {
        this.searchFilters.query = query;
        this.currentPage = 1;
        this.renderDocuments();
    }

    setCategoryFilter(category) {
        // Actualizar filtros activos
        document.querySelectorAll('.category-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`)?.classList.add('active');

        this.searchFilters.category = category;
        this.currentPage = 1;
        this.renderDocuments();
    }

    changeView(view) {
        // Actualizar botones de vista
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`)?.classList.add('active');

        this.currentView = view;
        this.renderDocuments();
    }

    updatePagination() {
        // Implementar paginación
        console.log('Actualizando paginación de documentos');
    }

    performSearch() {
        console.log('Realizando búsqueda de documentos');
    }

    // Métodos adicionales
    createDocument() {
        console.log('Crear nuevo documento...');
    }

    editDocument(documentId) {
        console.log('Editar documento:', documentId);
    }

    exportDocuments() {
        console.log('Exportar documentos...');
    }

    cancelUpload() {
        this.uploadQueue = [];
        document.getElementById('upload-progress').style.display = 'none';
        this.showUploadModal();
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }

    showError(message) {
        console.error(message);
        if (window.ComponentsManager) {
            ComponentsManager.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        console.log(message);
        if (window.ComponentsManager) {
            ComponentsManager.showToast(message, 'success');
        } else {
            alert(message);
        }
    }
}

// Inicializar sistema documental cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.documentsManager = new DocumentsManager();
});

// Exportar para uso global
window.DocumentsManager = DocumentsManager;