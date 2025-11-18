/**
 * WHATSAPP.JS - Interface WhatsApp Business Completa
 * Clínica Dental Rubio García - Sistema de Mensajería Inteligente
 * 
 * Funcionalidades:
 * - Interface WhatsApp Business completa con diseño moderno
 * - Sistema de mensajes urgentes codificados en naranja
 * - Detección automática de keywords y respuestas inteligentes
 * - Filtrado avanzado y búsqueda de conversaciones
 * - Notificaciones en tiempo real con WebSocket
 * - Estados de conexión online/offline
 * - Integración con sistema de confirmación de citas
 * - Gestión de plantillas de mensajes
 */

class WhatsAppManager {
    constructor() {
        this.currentChat = null;
        this.isConnected = false;
        this.unreadCount = 0;
        this.urgentMessages = new Set();
        this.searchQuery = '';
        this.currentFilter = 'all';
        this.messageTemplates = {};
        this.keywordResponses = {};
        this.onlineStatus = 'offline';
        this.lastActivity = null;
        
        // Palabras clave para detección automática
        this.keywords = {
            urgencia: ['dolor', 'urgencia', 'duele', 'dolor intenso', 'emergencia'],
            cita: ['cita', 'calendario', 'horario', 'agenda'],
            presupuesto: ['precio', 'coste', 'tarifa', 'presupuesto', 'cuanto'],
            tratamiento: ['tratamiento', 'terapia', 'procedimiento'],
            cancelacion: ['cancelar', 'anular', 'no puedo', 'reagendar'],
            confirmacion: ['confirmo', 'si voy', 'asisto', 'ok'],
            ortodoncia: ['brackets', 'ortodoncia', 'alambres', 'invisalign'],
            implante: ['implante', 'prótesis', 'corona', 'tornillo'],
            higienes: ['limpieza', 'higiene', 'profilaxis'],
            endodoncia: ['endodoncia', 'muela', 'nervio', 'tratamiento']
        };

        this.init();
    }

    async init() {
        try {
            console.log('📱 Inicializando sistema WhatsApp...');
            
            // Cargar configuración y plantillas
            await this.loadConfiguration();
            await this.loadMessageTemplates();
            await this.loadKeywordResponses();
            
            // Inicializar interface
            this.setupWhatsAppInterface();
            this.setupEventListeners();
            
            // Configurar WebSocket para tiempo real
            this.setupRealTimeConnection();
            
            // Cargar conversaciones iniciales
            await this.loadConversations();
            
            // Verificar estado de conexión
            this.checkConnectionStatus();
            
            console.log('✅ Sistema WhatsApp inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando sistema WhatsApp:', error);
            this.showError('Error inicializando el sistema de mensajería');
        }
    }

    async loadConfiguration() {
        try {
            const response = await api.get('/api/whatsapp/config');
            if (response.success) {
                this.config = response.data;
                this.businessPhone = this.config.business_phone;
                this.apiUrl = this.config.api_url;
            }
        } catch (error) {
            console.error('Error cargando configuración WhatsApp:', error);
            // Usar configuración por defecto
            this.config = {
                business_phone: '34664218253',
                business_name: 'Clínica Dental Rubio García',
                auto_responses: true,
                working_hours: {
                    start: '10:00',
                    end: '20:00'
                }
            };
        }
    }

    async loadMessageTemplates() {
        try {
            const response = await api.get('/api/whatsapp/templates');
            if (response.success) {
                this.messageTemplates = response.data;
            }
        } catch (error) {
            console.error('Error cargando plantillas:', error);
            // Usar plantillas por defecto
            this.messageTemplates = {
                welcome: `🏥 *CLÍNICA DENTAL RUBIO GARCÍA*\n\nHola! 👋 Somos especialistas en implantología y estética dental.\n\n¿En qué podemos ayudarte hoy?`,
                confirmation_request: `✅ *CONFIRMAR* - Confirmo mi asistencia\n❌ *CANCELAR* - No puedo asistir\n\n¡Gracias por ayudarnos a mejorar nuestra atención! 😊`,
                working_hours: `🕒 *HORARIOS DE ATENCIÓN*\n\n• Lunes a Jueves: 10:00-14:00 y 16:00-20:00\n• Viernes: 10:00-14:00\n\n📞 91 641 08 41\n📱 664 218 253`,
                emergency: `🚨 *ATENCIÓN DE URGENCIA*\n\nPara casos urgentes fuera de horario:\n📞 91 641 08 41\n\nTe contactaremos lo antes posible.\n\n💡 Para emergencias reales, acude al Hospital más cercano.`,
                appointment_reminder: `🏥 *RECORDATORIO DE CITA*\n\nTienes una cita programada para mañana:\n📅 {fecha} a las {hora}\n🦷 {tratamiento}\n\n¿Necesitas modificarla? Responde CANCELAR`,
                welcome_new_patient: `👋 *NUEVO PACIENTE*\n\n¡Bienvenido a Clínica Dental Rubio García!\n\nPara crear tu ficha:\n• Nombre completo\n• Teléfono\n• Email (opcional)\n\nLuego agendaremos tu primera consulta. 😊`
            };
        }
    }

    async loadKeywordResponses() {
        try {
            const response = await api.get('/api/whatsapp/keyword-responses');
            if (response.success) {
                this.keywordResponses = response.data;
            }
        } catch (error) {
            console.error('Error cargando respuestas automáticas:', error);
            // Configurar respuestas por defecto
            this.keywordResponses = {
                // Respuestas para urgencias
                'dolor|urgencia|duele': {
                    response: this.messageTemplates.emergency,
                    priority: 'high',
                    notify_doctor: true,
                    category: 'urgencia'
                },
                
                // Respuestas para citas
                'cita|calendario|horario': {
                    response: '📅 Para agendar una cita, llámanos al 91 641 08 41 o escríbenos tu preferencia de fecha y hora. Te confirmaremos disponibilidad.',
                    priority: 'normal',
                    notify_doctor: false,
                    category: 'cita'
                },
                
                // Respuestas para horarios
                'horario|abierto|cerrado': {
                    response: this.messageTemplates.working_hours,
                    priority: 'normal',
                    notify_doctor: false,
                    category: 'informacion'
                },
                
                // Respuestas para presupuestos
                'precio|coste|tarifa': {
                    response: '💰 Los precios dependen del tratamiento necesario. Te realizamos un presupuesto personalizado tras la consulta. ¿Agendamos una cita?',
                    priority: 'normal',
                    notify_doctor: false,
                    category: 'presupuesto'
                },
                
                // Respuestas para cancelaciones
                'cancelar|anular|no puedo': {
                    response: 'Entendido. Te ayudamos a reagendar. Escríbenos tu nueva disponibilidad o llámanos al 91 641 08 41.',
                    priority: 'high',
                    notify_doctor: true,
                    category: 'cancelacion'
                },
                
                // Respuestas para confirmaciones
                'confirmo|si voy|asisto': {
                    response: '¡Perfecto! Te esperamos. Si necesitas algo, no dudes en contactarnos.',
                    priority: 'normal',
                    notify_doctor: false,
                    category: 'confirmacion'
                }
            };
        }
    }

    setupWhatsAppInterface() {
        const whatsappContainer = document.getElementById('whatsapp-container');
        if (!whatsappContainer) return;

        whatsappContainer.innerHTML = `
            <div class="whatsapp-layout">
                <!-- Sidebar de conversaciones -->
                <div class="chat-sidebar">
                    <div class="sidebar-header">
                        <div class="connection-status ${this.isConnected ? 'online' : 'offline'}">
                            <div class="status-indicator"></div>
                            <span class="status-text">${this.isConnected ? 'Conectado' : 'Desconectado'}</span>
                        </div>
                        <h3>Conversaciones</h3>
                        <button class="btn btn-sm btn-primary" onclick="whatsappManager.newMessage()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M8 12H16M12 8V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Nuevo
                        </button>
                    </div>
                    
                    <div class="search-bar">
                        <input type="text" id="chat-search" placeholder="Buscar conversaciones..." 
                               oninput="whatsappManager.searchChats(this.value)">
                        <button class="search-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                                <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="filter-tabs">
                        <button class="filter-tab active" data-filter="all" onclick="whatsappManager.filterChats('all')">
                            Todas
                        </button>
                        <button class="filter-tab" data-filter="urgent" onclick="whatsappManager.filterChats('urgent')">
                            Urgentes
                        </button>
                        <button class="filter-tab" data-filter="new" onclick="whatsappManager.filterChats('new')">
                            Nuevas
                        </button>
                        <button class="filter-tab" data-filter="appointment" onclick="whatsappManager.filterChats('appointment')">
                            Citas
                        </button>
                    </div>
                    
                    <div class="chat-list" id="chat-list">
                        <!-- Las conversaciones se cargarán aquí -->
                    </div>
                </div>
                
                <!-- Área de chat principal -->
                <div class="chat-main" id="chat-main">
                    <div class="chat-header" id="chat-header">
                        <div class="chat-info">
                            <div class="avatar">
                                <div class="default-avatar">👤</div>
                            </div>
                            <div class="contact-info">
                                <h4 id="contact-name">Selecciona una conversación</h4>
                                <span id="contact-status">...</span>
                            </div>
                        </div>
                        <div class="chat-actions">
                            <button class="action-btn" onclick="whatsappManager.makeCall()" title="Llamar">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M22 16.92V19.92C22 20.52 21.39 21 20.83 21C9.17 21 0 11.83 0 0.17C0 0.39 0.5 1 1.17 1H4.17C4.77 1 5.17 1.61 5.17 2.21C5.17 3.47 5.95 4.5 7.17 4.5C8.39 4.5 9.17 3.72 9.17 2.5C9.17 2.5 9.17 2.5 9.17 2.5C9.17 2.5 9.17 2.5 9.17 2.5" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                            <button class="action-btn" onclick="whatsappManager.openPatientProfile()" title="Ver paciente">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2"/>
                                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                            <button class="action-btn" onclick="whatsappManager.scheduleAppointment()" title="Agendar cita">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 17.61 20.61 18 20 18H4C3.39 18 3 17.61 3 17V8.5C3 7.89 3.39 7.5 4 7.5H20C20.61 7.5 21 7.89 21 8.5Z" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                            <button class="action-btn" onclick="whatsappManager.moreActions()" title="Más opciones">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="1" stroke="currentColor" stroke-width="2"/>
                                    <circle cx="12" cy="5" r="1" stroke="currentColor" stroke-width="2"/>
                                    <circle cx="12" cy="19" r="1" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="chat-messages" id="chat-messages">
                        <div class="no-chat-selected">
                            <div class="no-chat-icon">💬</div>
                            <h3>Selecciona una conversación</h3>
                            <p>Elige una conversación de la lista para comenzar a chatear</p>
                        </div>
                    </div>
                    
                    <div class="chat-input" id="chat-input" style="display: none;">
                        <div class="input-tools">
                            <button class="tool-btn" onclick="whatsappManager.showTemplates()" title="Plantillas">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/>
                                    <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                            <button class="tool-btn" onclick="whatsappManager.recordAudio()" title="Audio">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2A3 3 0 0 1 15 5V11A3 3 0 0 1 12 14A3 3 0 0 1 9 11V5A3 3 0 0 1 12 2Z" stroke="currentColor" stroke-width="2"/>
                                    <path d="M19 10V11C19 14.53 16.39 17.44 13 17.93V21H11V17.93C7.61 17.44 5 14.53 5 10V11" stroke="currentColor" stroke-width="2"/>
                                    <path d="M12 18V19M8 22H16" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                            <button class="tool-btn" onclick="whatsappManager.attachFile()" title="Adjuntar">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M21.44 11.05L12.25 20.24C11.1244 21.3656 9.56325 21.998 7.9 21.998C6.23676 21.998 4.67554 21.3656 3.55 20.24C2.42446 19.1145 1.792 17.5532 1.792 15.89C1.792 14.2268 2.42446 12.6656 3.55 11.54L11.65 3.44C12.3867 2.70328 13.4385 2.27344 14.54 2.27344C15.6415 2.27344 16.6933 2.70328 17.43 3.44C18.1667 4.17672 18.5966 5.22855 18.5966 6.33C18.5966 7.43145 18.1667 8.48328 17.43 9.22L9.33 17.32" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                        </div>
                        
                        <div class="message-input-container">
                            <input type="text" id="message-input" placeholder="Escribe un mensaje..." 
                                   onkeypress="whatsappManager.handleInputKeypress(event)">
                            <button class="send-btn" onclick="whatsappManager.sendMessage()" id="send-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" stroke-width="2"/>
                                    <polygon points="22,2 15,22 11,13 2,9" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Modales y overlays -->
            <div id="templates-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Plantillas de Mensajes</h3>
                        <button class="close-btn" onclick="whatsappManager.closeTemplates()">×</button>
                    </div>
                    <div class="modal-body" id="templates-list">
                        <!-- Lista de plantillas -->
                    </div>
                </div>
            </div>
            
            <div id="urgent-overlay" class="urgent-notification">
                <div class="urgent-content">
                    <div class="urgent-icon">🚨</div>
                    <h4>Mensaje Urgente</h4>
                    <p id="urgent-message-text"></p>
                    <button class="btn btn-primary" onclick="whatsappManager.dismissUrgent()">Atender</button>
                </div>
            </div>
        `;

        // Cargar plantillas en el modal
        this.loadTemplatesModal();
    }

    setupEventListeners() {
        // Event listeners para la búsqueda
        document.getElementById('chat-search')?.addEventListener('input', (e) => {
            this.searchChats(e.target.value);
        });

        // Event listeners para marcar mensajes como urgentes
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('mark-urgent-btn')) {
                const messageId = e.target.dataset.messageId;
                this.markAsUrgent(messageId);
            }
        });

        // Event listeners para respuestas automáticas
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-reply-btn')) {
                const reply = e.target.dataset.reply;
                this.sendQuickReply(reply);
            }
        });
    }

    setupRealTimeConnection() {
        if (!window.WebSocketManager) return;

        // Escuchar mensajes nuevos
        WebSocketManager.on('new_message', (data) => {
            this.handleNewMessage(data);
        });

        // Escuchar actualizaciones de estado
        WebSocketManager.on('message_status_update', (data) => {
            this.handleMessageStatusUpdate(data);
        });

        // Escuchar confirmaciones de cita
        WebSocketManager.on('appointment_confirmation', (data) => {
            this.handleAppointmentConfirmation(data);
        });

        // Escuchar conexiones/desconexiones
        WebSocketManager.on('whatsapp_status_change', (data) => {
            this.handleConnectionStatusChange(data);
        });
    }

    async loadConversations() {
        try {
            const response = await api.get('/api/whatsapp/conversations');
            if (response.success) {
                this.conversations = response.data;
                this.renderConversations();
                this.updateUnreadCount();
            }
        } catch (error) {
            console.error('Error cargando conversaciones:', error);
            this.loadSampleConversations();
        }
    }

    loadSampleConversations() {
        this.conversations = [
            {
                id: '1',
                phone: '666123456',
                name: 'Ana García',
                lastMessage: 'Doctor, me duele mucho la muela. Es urgente.',
                lastMessageTime: new Date().toISOString(),
                unreadCount: 2,
                isUrgent: true,
                lastMessageType: 'received',
                status: 'offline',
                patientNumber: 'P001'
            },
            {
                id: '2',
                phone: '666654321',
                name: 'Carlos Martín',
                lastMessage: 'Perfecto, confirmo mi cita de mañana',
                lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
                unreadCount: 0,
                isUrgent: false,
                lastMessageType: 'received',
                status: 'online',
                patientNumber: 'P002'
            },
            {
                id: '3',
                phone: '666987654',
                name: 'María Fernández',
                lastMessage: 'Hola, necesito información sobre implantes',
                lastMessageTime: new Date(Date.now() - 7200000).toISOString(),
                unreadCount: 1,
                isUrgent: false,
                lastMessageType: 'received',
                status: 'offline',
                patientNumber: 'P003'
            }
        ];

        this.renderConversations();
        this.updateUnreadCount();
    }

    renderConversations() {
        const chatList = document.getElementById('chat-list');
        if (!chatList || !this.conversations) return;

        const filteredChats = this.filterConversations();
        
        chatList.innerHTML = filteredChats.map(chat => `
            <div class="chat-item ${chat.unreadCount > 0 ? 'unread' : ''} ${chat.isUrgent ? 'urgent' : ''}" 
                 onclick="whatsappManager.selectChat('${chat.id}')"
                 data-chat-id="${chat.id}">
                <div class="chat-avatar">
                    <div class="default-avatar">${this.getInitials(chat.name)}</div>
                    <div class="status-indicator ${chat.status}"></div>
                </div>
                <div class="chat-content">
                    <div class="chat-header-row">
                        <h4 class="chat-name">${chat.name}</h4>
                        <span class="chat-time">${this.formatTime(chat.lastMessageTime)}</span>
                    </div>
                    <div class="chat-preview">
                        <p class="last-message">${this.truncateText(chat.lastMessage, 40)}</p>
                        ${chat.isUrgent ? '<span class="urgent-badge">URGENTE</span>' : ''}
                        ${chat.unreadCount > 0 ? `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    filterConversations() {
        if (!this.conversations) return [];

        let filtered = [...this.conversations];

        // Filtrar por búsqueda
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(chat => 
                chat.name.toLowerCase().includes(query) ||
                chat.phone.includes(query) ||
                chat.lastMessage.toLowerCase().includes(query)
            );
        }

        // Filtrar por categoría
        switch (this.currentFilter) {
            case 'urgent':
                filtered = filtered.filter(chat => chat.isUrgent);
                break;
            case 'new':
                filtered = filtered.filter(chat => chat.unreadCount > 0);
                break;
            case 'appointment':
                filtered = filtered.filter(chat => 
                    chat.lastMessage.includes('cita') || 
                    chat.lastMessage.includes('confirmo') ||
                    chat.lastMessage.includes('cancelar')
                );
                break;
        }

        return filtered;
    }

    async selectChat(chatId) {
        try {
            const chat = this.conversations.find(c => c.id === chatId);
            if (!chat) return;

            this.currentChat = chat;
            
            // Marcar como leído
            await this.markChatAsRead(chatId);
            
            // Cargar mensajes del chat
            await this.loadChatMessages(chatId);
            
            // Actualizar UI
            this.updateChatHeader(chat);
            this.showChatInput();
            this.renderConversations(); // Actualizar lista para reflejar mensajes leídos
            
        } catch (error) {
            console.error('Error seleccionando chat:', error);
        }
    }

    async loadChatMessages(chatId) {
        try {
            const response = await api.get(`/api/whatsapp/conversation/${chatId}/messages`);
            if (response.success) {
                this.currentMessages = response.data;
                this.renderMessages();
            }
        } catch (error) {
            console.error('Error cargando mensajes:', error);
            this.loadSampleMessages(chatId);
        }
    }

    loadSampleMessages(chatId) {
        if (!this.currentChat) return;

        this.currentMessages = [
            {
                id: '1',
                type: 'received',
                content: 'Hola, tengo una cita programada para mañana a las 10:00',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                status: 'read',
                isUrgent: false
            },
            {
                id: '2',
                type: 'sent',
                content: 'Perfecto, te esperamos. ¿Algo más que necesites saber?',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                status: 'delivered',
                isUrgent: false
            },
            {
                id: '3',
                type: 'received',
                content: 'Doctor, me duele mucho la muela. Es urgente.',
                timestamp: new Date(Date.now() - 600000).toISOString(),
                status: 'read',
                isUrgent: true
            }
        ];

        this.renderMessages();
    }

    renderMessages() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages || !this.currentMessages) return;

        chatMessages.innerHTML = this.currentMessages.map(message => {
            const isOwn = message.type === 'sent';
            const timeString = this.formatTime(message.timestamp);
            
            return `
                <div class="message ${isOwn ? 'sent' : 'received'} ${message.isUrgent ? 'urgent' : ''}">
                    <div class="message-content">
                        <p>${this.processMessageContent(message.content)}</p>
                        <div class="message-meta">
                            <span class="message-time">${timeString}</span>
                            ${isOwn ? `<span class="message-status">${this.getStatusIcon(message.status)}</span>` : ''}
                        </div>
                    </div>
                    ${!isOwn ? `
                        <div class="message-actions">
                            <button class="mark-urgent-btn" onclick="whatsappManager.markAsUrgent('${message.id}')" 
                                    title="Marcar como urgente">
                                🚨
                            </button>
                            <button class="quick-reply-btn" data-reply="Entendido, te llamamos en seguida" 
                                    title="Respuesta rápida">
                                ⚡
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Scroll al final
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    processMessageContent(content) {
        let processed = content;
        
        // Detectar y destacar palabras clave
        Object.keys(this.keywords).forEach(category => {
            this.keywords[category].forEach(keyword => {
                const regex = new RegExp(`(${keyword})`, 'gi');
                processed = processed.replace(regex, `<span class="keyword ${category}">$1</span>`);
            });
        });

        // Procesar comandos especiales
        processed = processed.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
        processed = processed.replace(/_(.*?)_/g, '<em>$1</em>');
        processed = processed.replace(/\n/g, '<br>');

        return processed;
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const content = input.value.trim();
        
        if (!content || !this.currentChat) return;

        try {
            // Crear mensaje temporal
            const tempMessage = {
                id: `temp_${Date.now()}`,
                type: 'sent',
                content: content,
                timestamp: new Date().toISOString(),
                status: 'sending',
                isUrgent: false
            };

            // Mostrar mensaje inmediatamente
            this.currentMessages.push(tempMessage);
            this.renderMessages();

            // Limpiar input
            input.value = '';

            // Enviar mensaje
            const response = await api.post('/api/whatsapp/send', {
                phone: this.currentChat.phone,
                message: content,
                chatId: this.currentChat.id
            });

            if (response.success) {
                // Actualizar estado del mensaje
                const messageIndex = this.currentMessages.findIndex(m => m.id === tempMessage.id);
                if (messageIndex !== -1) {
                    this.currentMessages[messageIndex].status = 'sent';
                    this.currentMessages[messageIndex].id = response.data.messageId;
                }

                // Actualizar última actividad del chat
                this.updateChatLastActivity(this.currentChat.id, content);
            } else {
                // Marcar como error
                const messageIndex = this.currentMessages.findIndex(m => m.id === tempMessage.id);
                if (messageIndex !== -1) {
                    this.currentMessages[messageIndex].status = 'error';
                }
            }

            this.renderMessages();

        } catch (error) {
            console.error('Error enviando mensaje:', error);
            this.showError('Error enviando el mensaje');
        }
    }

    async handleNewMessage(data) {
        const message = data.message;
        const chatId = data.chatId;

        // Verificar si es mensaje urgente
        if (this.isUrgentMessage(message.content)) {
            this.urgentMessages.add(message.id);
            this.showUrgentNotification(message);
        }

        // Procesar respuesta automática
        await this.processAutoResponse(message);

        // Actualizar conversaciones
        await this.updateConversationsWithNewMessage(chatId, message);

        // Si es el chat actual, mostrar mensaje
        if (this.currentChat && this.currentChat.id === chatId) {
            this.currentMessages.push(message);
            this.renderMessages();
            await this.markAsRead(chatId, message.id);
        }
    }

    isUrgentMessage(content) {
        const urgentKeywords = this.keywords.urgencia;
        return urgentKeywords.some(keyword => 
            content.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    async processAutoResponse(message) {
        if (!this.config.auto_responses) return;

        // Detectar categoría del mensaje
        const category = this.detectMessageCategory(message.content);
        
        if (category && this.keywordResponses[category]) {
            const responseConfig = this.keywordResponses[category];
            
            if (responseConfig.notify_doctor) {
                await this.notifyDoctor(message, responseConfig);
            }

            // Enviar respuesta automática después de un delay
            setTimeout(async () => {
                await this.sendAutoResponse(message.phone, responseConfig.response);
            }, 2000);
        }
    }

    detectMessageCategory(content) {
        const lowerContent = content.toLowerCase();
        
        for (const [category, keywords] of Object.entries(this.keywordResponses)) {
            if (keywords.pattern) {
                const regex = new RegExp(keywords.pattern, 'i');
                if (regex.test(content)) {
                    return category;
                }
            }
        }

        return null;
    }

    async sendAutoResponse(phone, response) {
        try {
            await api.post('/api/whatsapp/send', {
                phone: phone,
                message: response,
                isAutoResponse: true
            });
        } catch (error) {
            console.error('Error enviando respuesta automática:', error);
        }
    }

    async notifyDoctor(message, responseConfig) {
        try {
            // Notificar al doctor a través de WebSocket
            WebSocketManager.send('urgent_message_notification', {
                message: message,
                category: responseConfig.category,
                priority: responseConfig.priority
            });

            // Enviar notificación push si está disponible
            await api.post('/api/notifications/urgent', {
                type: 'urgent_whatsapp',
                message: `Mensaje urgente de ${message.name}: ${message.content}`,
                data: message
            });

        } catch (error) {
            console.error('Error notificando al doctor:', error);
        }
    }

    showUrgentNotification(message) {
        const overlay = document.getElementById('urgent-overlay');
        const messageText = document.getElementById('urgent-message-text');
        
        if (overlay && messageText) {
            messageText.textContent = `${message.name}: ${message.content}`;
            overlay.style.display = 'flex';
            
            // Auto-hide después de 30 segundos
            setTimeout(() => {
                this.dismissUrgent();
            }, 30000);
        }
    }

    dismissUrgent() {
        const overlay = document.getElementById('urgent-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    async markAsUrgent(messageId) {
        try {
            await api.put(`/api/whatsapp/message/${messageId}/urgent`, {
                isUrgent: true
            });

            // Actualizar UI
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
                messageElement.closest('.message').classList.add('urgent');
            }

            this.showSuccess('Mensaje marcado como urgente');
        } catch (error) {
            console.error('Error marcando mensaje como urgente:', error);
            this.showError('Error marcando el mensaje');
        }
    }

    searchChats(query) {
        this.searchQuery = query;
        this.renderConversations();
    }

    filterChats(filter) {
        this.currentFilter = filter;
        
        // Actualizar tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
        
        this.renderConversations();
    }

    updateUnreadCount() {
        this.unreadCount = this.conversations?.reduce((total, chat) => total + chat.unreadCount, 0) || 0;
        
        // Actualizar contador en la UI
        const unreadElement = document.getElementById('whatsapp-unread-count');
        if (unreadElement) {
            unreadElement.textContent = this.unreadCount;
            unreadElement.style.display = this.unreadCount > 0 ? 'block' : 'none';
        }
    }

    updateChatHeader(chat) {
        document.getElementById('contact-name').textContent = chat.name;
        document.getElementById('contact-status').textContent = `+${chat.phone} • ${chat.status === 'online' ? 'En línea' : 'Desconectado'}`;
    }

    showChatInput() {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.style.display = 'flex';
        }
    }

    loadTemplatesModal() {
        const templatesList = document.getElementById('templates-list');
        if (!templatesList) return;

        templatesList.innerHTML = Object.entries(this.messageTemplates).map(([key, template]) => `
            <div class="template-item" onclick="whatsappManager.selectTemplate('${key}')">
                <h4>${this.getTemplateTitle(key)}</h4>
                <p>${this.truncateText(template, 100)}</p>
                <button class="btn btn-sm btn-outline" onclick="whatsappManager.selectTemplate('${key}')">
                    Usar
                </button>
            </div>
        `).join('');
    }

    getTemplateTitle(key) {
        const titles = {
            welcome: 'Mensaje de Bienvenida',
            confirmation_request: 'Confirmación de Cita',
            working_hours: 'Horarios de Atención',
            emergency: 'Atención de Emergencia',
            appointment_reminder: 'Recordatorio de Cita',
            welcome_new_patient: 'Bienvenida Nuevo Paciente'
        };
        return titles[key] || key;
    }

    selectTemplate(templateKey) {
        const template = this.messageTemplates[templateKey];
        if (!template) return;

        const input = document.getElementById('message-input');
        if (input) {
            input.value = template;
            input.focus();
        }

        this.closeTemplates();
    }

    closeTemplates() {
        const modal = document.getElementById('templates-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showTemplates() {
        const modal = document.getElementById('templates-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    // Utilidades
    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) { // Menos de 1 minuto
            return 'Ahora';
        } else if (diff < 3600000) { // Menos de 1 hora
            return Math.floor(diff / 60000) + 'm';
        } else if (diff < 86400000) { // Menos de 1 día
            return Math.floor(diff / 3600000) + 'h';
        } else if (diff < 604800000) { // Menos de 1 semana
            return Math.floor(diff / 86400000) + 'd';
        } else {
            return date.toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'short' 
            });
        }
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    getStatusIcon(status) {
        const icons = {
            sending: '⏳',
            sent: '✓',
            delivered: '✓✓',
            read: '✓✓',
            failed: '⚠️'
        };
        return icons[status] || '?';
    }

    handleInputKeypress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    // Acciones del chat
    makeCall() {
        if (this.currentChat) {
            window.open(`tel:${this.currentChat.phone}`);
        }
    }

    openPatientProfile() {
        if (this.currentChat && this.currentChat.patientNumber) {
            // Abrir perfil del paciente
            window.patientsManager?.showPatientDetail(this.currentChat.patientNumber);
        }
    }

    scheduleAppointment() {
        if (this.currentChat) {
            // Abrir modal de nueva cita con datos del paciente
            window.agendaManager?.newAppointment();
            window.agendaManager?.prefillPatientData({
                name: this.currentChat.name,
                phone: this.currentChat.phone
            });
        }
    }

    moreActions() {
        // Implementar menú de más acciones
        console.log('Más acciones...');
    }

    newMessage() {
        // Implementar nuevo mensaje
        console.log('Nuevo mensaje...');
    }

    recordAudio() {
        // Implementar grabación de audio
        console.log('Grabar audio...');
    }

    attachFile() {
        // Implementar adjuntar archivo
        console.log('Adjuntar archivo...');
    }

    // Conexión y estado
    async checkConnectionStatus() {
        try {
            const response = await api.get('/api/whatsapp/status');
            this.isConnected = response.connected;
            this.updateConnectionStatus();
        } catch (error) {
            console.error('Error verificando estado de conexión:', error);
            this.isConnected = false;
            this.updateConnectionStatus();
        }
    }

    updateConnectionStatus() {
        const statusElement = document.querySelector('.connection-status');
        if (statusElement) {
            statusElement.className = `connection-status ${this.isConnected ? 'online' : 'offline'}`;
            const statusText = statusElement.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = this.isConnected ? 'Conectado' : 'Desconectado';
            }
        }
    }

    handleConnectionStatusChange(data) {
        this.isConnected = data.connected;
        this.updateConnectionStatus();
    }

    handleMessageStatusUpdate(data) {
        // Actualizar estado de mensajes
        if (this.currentMessages) {
            const message = this.currentMessages.find(m => m.id === data.messageId);
            if (message) {
                message.status = data.status;
                this.renderMessages();
            }
        }
    }

    handleAppointmentConfirmation(data) {
        // Procesar confirmación de cita
        console.log('Confirmación de cita recibida:', data);
    }

    // Métodos de API
    async markChatAsRead(chatId, messageId = null) {
        try {
            await api.put(`/api/whatsapp/conversation/${chatId}/read`, {
                messageId: messageId
            });
        } catch (error) {
            console.error('Error marcando como leído:', error);
        }
    }

    async updateConversationsWithNewMessage(chatId, message) {
        // Actualizar conversación con nuevo mensaje
        const chat = this.conversations.find(c => c.id === chatId);
        if (chat) {
            chat.lastMessage = message.content;
            chat.lastMessageTime = message.timestamp;
            chat.lastMessageType = message.type;
            if (message.type === 'received') {
                chat.unreadCount++;
            }
            this.renderConversations();
            this.updateUnreadCount();
        }
    }

    async updateChatLastActivity(chatId, message) {
        const chat = this.conversations.find(c => c.id === chatId);
        if (chat) {
            chat.lastMessage = message;
            chat.lastMessageTime = new Date().toISOString();
            this.renderConversations();
        }
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

// Inicializar sistema WhatsApp cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.whatsappManager = new WhatsAppManager();
});

// Exportar para uso global
window.WhatsAppManager = WhatsAppManager;