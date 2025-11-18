/**
 * AGENDA.JS - Sistema Completo de Gestión de Citas
 * Clínica Dental Rubio García - Sistema de Agenda Inteligente
 * 
 * Funcionalidades:
 * - Gestión completa de citas con calendario interactivo
 * - Máquina de estados (Planificada → Confirmada → Aceptada)
 * - Integración WhatsApp para confirmaciones automáticas
 * - Sincronización SQL Server tabla DCitas
 * - Horarios por especialidad y doctor
 * - Sistema de confirmación 24h antes
 * - Gestión de tratamientos y urgencias
 */

class AgendaManager {
    constructor() {
        this.currentDate = new Date();
        this.selectedDoctor = null;
        this.appointmentStates = {
            PLANIFICADA: 0,
            ANULADA: 1,
            FINALIZADA: 5,
            CONFIRMADA: 7,
            CANCELADA: 8,
            ACEPTADA: 9
        };
        this.treatmentTypes = {
            CONTROL: 1,
            URGENCIA: 2,
            PROTESIS_FIJA: 3,
            CIRUGIA_INJERTO: 4,
            RETIRAR_ORTODONCIA: 6,
            PROTESIS_REMOVIBLE: 7,
            COLOCACION_ORTODONCIA: 8,
            PERIODONCIA: 9,
            CIRUGIA_IMPLANTE: 10,
            MENSUALIDAD_ORTODONCIA: 11,
            AJUSTE_PROT_TTO: 12,
            PRIMERA_VISITA: 13,
            HIGIENE_DENTAL: 14,
            ENDODONCIA: 15,
            RECONSTRUCCION: 16,
            EXODONCIA: 17,
            ESTUDIO_ORTODONCIA: 18,
            RX_ESCANER: 19
        };
        this.doctorsSchedule = {
            1: { // Lunes
                doctors: [3], // Virginia Tresgallo - Ortodoncista
                treatments: [8, 14], // Colocación Ortodoncia, Higiene Dental
                description: "Ortodoncia, Ortodoncista, Higienes dentales, primeras referentes a maloclusiones"
            },
            2: { // Martes
                doctors: [4], // Irene Garcia - Endodoncista
                treatments: [15, 14, 9], // Endodoncia, Higiene, Periodoncia
                description: "Endodoncia, Odontología general, Higienes y tratamientos periodontales, dolores dentales"
            },
            3: { // Miércoles
                doctors: [3], // Mario Rubio - Implantólogo
                treatments: [10, 3, 4], // Cirugía Implante, Prótesis Fija, Cirugía/Injerto
                description: "Implantología, Cirugías, primeras relativas a ausencias dentales"
            },
            4: { // Jueves
                doctors: [12], // Juan Antonio Manzanedo - Higienista
                treatments: [14], // Higiene Dental
                description: "Higienes y blanqueamiento, pruebas previas, registros de estudios de ortodoncia e implantología"
            },
            5: { // Viernes
                doctors: [], // Administración
                treatments: [],
                description: "Mañana dirigida a parte administrativa, entrega presupuestos y financiaciones"
            }
        };
        this.clinicHours = {
            1: { start: '10:00', end: '14:00' }, // Lunes
            2: { start: '10:00', end: '14:00' }, // Martes
            3: { start: '10:00', end: '14:00' }, // Miércoles
            4: { start: '10:00', end: '14:00' }, // Jueves
            5: { start: '10:00', end: '14:00' }, // Viernes
            6: { start: '16:00', end: '20:00' }, // Tardes L-J
            7: { start: '16:00', end: '20:00' }, // Tardes L-J
            8: { start: '16:00', end: '20:00' }, // Tardes L-J
            9: { start: '16:00', end: '20:00' }  // Tardes L-J
        };
        this.init();
    }

    async init() {
        try {
            console.log('🏥 Inicializando sistema de agenda...');
            
            // Configurar evento de fecha actual
            this.updateCurrentDate();
            
            // Cargar configuración de horarios
            await this.loadDoctorsSchedule();
            
            // Inicializar calendario
            this.initCalendar();
            
            // Configurar WebSocket para actualizaciones en tiempo real
            this.setupWebSocketListeners();
            
            // Configurar filtros y controles
            this.setupFiltersAndControls();
            
            // Cargar citas iniciales
            await this.loadAppointmentsForCurrentMonth();
            
            console.log('✅ Sistema de agenda inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando sistema de agenda:', error);
            this.showError('Error inicializando el sistema de agenda');
        }
    }

    updateCurrentDate() {
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
    }

    async loadDoctorsSchedule() {
        try {
            // Cargar horarios y especialidades desde SQL Server
            const response = await api.get('/api/agenda/doctors-schedule');
            if (response.success) {
                this.doctorsData = response.data;
                this.updateDoctorsDropdown();
            }
        } catch (error) {
            console.error('Error cargando horarios de doctores:', error);
            // Usar configuración local como fallback
            this.useLocalSchedule();
        }
    }

    useLocalSchedule() {
        // Configuración basada en la información proporcionada
        this.doctorsData = {
            3: { // Virginia Tresgallo
                id: 3,
                nombre: 'Dra. Virginia Tresgallo',
                especialidad: 'Ortodoncista',
                numero_colegiado: '28007397',
                horario_dia: 1, // Lunes
                horario_turno: ['mañana', 'tarde'],
                especialidades_detalle: ['Ortodoncia', 'Ortopedia dentofacial'],
                tratables: [8, 14] // Colocación Ortodoncia, Higiene Dental
            },
            4: { // Irene Garcia
                id: 4,
                nombre: 'Dra. Irene García',
                especialidad: 'Endodoncista',
                numero_colegiado: '280111085',
                horario_dia: 2, // Martes
                horario_turno: ['mañana', 'tarde'],
                especialidades_detalle: ['Endodoncia', 'Odontología general'],
                tratables: [15, 14, 9] // Endodoncia, Higiene, Periodoncia
            },
            3: { // Mario Rubio (ID compartido por error de datos)
                id: 3,
                nombre: 'Dr. Mario Rubio',
                especialidad: 'Implantólogo',
                numero_colegiado: '28007352',
                horario_dia: 3, // Miércoles
                horario_turno: ['mañana', 'tarde'],
                especialidades_detalle: ['Implantología', 'Cirugía oral'],
                tratables: [10, 3, 4] // Cirugía Implante, Prótesis Fija, Cirugía/Injerto
            },
            12: { // Juan Antonio Manzanedo - Higienista
                id: 12,
                nombre: 'Tc. Juan Antonio Manzanedo',
                especialidad: 'Higienista',
                numero_colegiado: '',
                horario_dia: 4, // Jueves
                horario_turno: ['mañana'],
                especialidades_detalle: ['Higiene dental', 'Blanqueamiento'],
                tratables: [14] // Higiene Dental
            }
        };
    }

    initCalendar() {
        this.createCalendarStructure();
        this.renderCalendar();
    }

    createCalendarStructure() {
        const calendarContainer = document.getElementById('agenda-calendar');
        if (!calendarContainer) return;

        calendarContainer.innerHTML = `
            <div class="calendar-header">
                <div class="calendar-controls">
                    <button class="btn btn-outline" onclick="agendaManager.previousMonth()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Anterior
                    </button>
                    <h3 id="current-month-year">${this.getCurrentMonthYear()}</h3>
                    <button class="btn btn-outline" onclick="agendaManager.nextMonth()">
                        Siguiente
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                <div class="view-controls">
                    <button class="btn btn-sm" onclick="agendaManager.changeView('month')" id="month-view-btn">Mes</button>
                    <button class="btn btn-sm btn-outline" onclick="agendaManager.changeView('week')" id="week-view-btn">Semana</button>
                    <button class="btn btn-sm btn-outline" onclick="agendaManager.changeView('day')" id="day-view-btn">Día</button>
                </div>
            </div>
            <div class="calendar-grid" id="calendar-grid"></div>
            <div class="calendar-legend">
                <div class="legend-item">
                    <span class="legend-color state-planificada"></span>
                    <span>Planificada</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color state-confirmada"></span>
                    <span>Confirmada</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color state-aceptada"></span>
                    <span>Aceptada</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color state-anulada"></span>
                    <span>Anulada</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color urgent"></span>
                    <span>Urgencia</span>
                </div>
            </div>
        `;
    }

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        if (!grid) return;

        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        let calendarHTML = '<div class="calendar-weekdays">';
        const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        weekdays.forEach(day => {
            calendarHTML += `<div class="weekday">${day}</div>`;
        });
        calendarHTML += '</div>';

        let currentDay = new Date(startDate);
        for (let week = 0; week < 6; week++) {
            calendarHTML += '<div class="calendar-week">';
            for (let day = 0; day < 7; day++) {
                const isCurrentMonth = currentDay.getMonth() === this.currentMonth;
                const isToday = this.isToday(currentDay);
                const dateStr = this.formatDate(currentDay);
                
                calendarHTML += `
                    <div class="calendar-day ${isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''}" 
                         data-date="${dateStr}" 
                         onclick="agendaManager.selectDay('${dateStr}')">
                        <div class="day-number">${currentDay.getDate()}</div>
                        <div class="appointments-list" id="appointments-${dateStr}"></div>
                    </div>
                `;
                currentDay.setDate(currentDay.getDate() + 1);
            }
            calendarHTML += '</div>';
        }

        grid.innerHTML = calendarHTML;
        this.updateMonthYearDisplay();
    }

    updateMonthYearDisplay() {
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        const element = document.getElementById('current-month-year');
        if (element) {
            element.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
        }
    }

    async loadAppointmentsForCurrentMonth() {
        try {
            const startDate = new Date(this.currentYear, this.currentMonth, 1);
            const endDate = new Date(this.currentYear, this.currentMonth + 1, 0);
            
            const response = await api.get(`/api/agenda/appointments?start=${this.formatDate(startDate)}&end=${this.formatDate(endDate)}`);
            
            if (response.success) {
                this.appointments = response.data;
                this.renderAppointmentsInCalendar();
                this.updateDashboardStats();
            }
        } catch (error) {
            console.error('Error cargando citas:', error);
            this.loadSampleAppointments();
        }
    }

    renderAppointmentsInCalendar() {
        if (!this.appointments) return;

        this.appointments.forEach(appointment => {
            const dateStr = appointment.Fecha;
            const container = document.getElementById(`appointments-${dateStr}`);
            
            if (container) {
                const stateClass = this.getStateClass(appointment.EstadoCita);
                const isUrgent = appointment.Tratamiento === 'Urgencia';
                
                container.innerHTML += `
                    <div class="appointment-item ${stateClass} ${isUrgent ? 'urgent' : ''}" 
                         onclick="agendaManager.showAppointmentDetail('${appointment.IdCita}')"
                         data-appointment-id="${appointment.IdCita}">
                        <div class="appointment-time">${appointment.Hora}</div>
                        <div class="appointment-patient">${appointment.Nombre} ${appointment.Apellidos}</div>
                        <div class="appointment-treatment">${appointment.Tratamiento}</div>
                        <div class="appointment-doctor">${appointment.Odontologo}</div>
                    </div>
                `;
            }
        });
    }

    getStateClass(estado) {
        const stateMap = {
            'Planificada': 'state-planificada',
            'Confirmada': 'state-confirmada',
            'Aceptada': 'state-aceptada',
            'Anulada': 'state-anulada',
            'Cancelada': 'state-cancelada',
            'Finalizada': 'state-finalizada'
        };
        return stateMap[estado] || 'state-planificada';
    }

    async showAppointmentDetail(appointmentId) {
        try {
            const response = await api.get(`/api/agenda/appointment/${appointmentId}`);
            if (response.success) {
                this.displayAppointmentModal(response.data);
            }
        } catch (error) {
            console.error('Error cargando detalle de cita:', error);
            this.showAppointmentDetailModal(appointmentId);
        }
    }

    displayAppointmentModal(appointment) {
        const modal = document.getElementById('appointment-detail-modal');
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>Detalle de Cita</h3>
                    <button class="close-btn" onclick="this.closest('.modal').style.display='none'">
                        <svg width="24" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="appointment-detail-grid">
                        <div class="detail-section">
                            <h4>Información del Paciente</h4>
                            <div class="detail-row">
                                <label>Registro:</label>
                                <span>${appointment.Registro || appointment.IdCita}</span>
                            </div>
                            <div class="detail-row">
                                <label>Nombre:</label>
                                <span>${appointment.Nombre} ${appointment.Apellidos}</span>
                            </div>
                            <div class="detail-row">
                                <label>Teléfono:</label>
                                <span>${appointment.TelMovil}</span>
                            </div>
                            <div class="detail-row">
                                <label>Número Paciente:</label>
                                <span>${appointment.NumPac}</span>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Detalles de la Cita</h4>
                            <div class="detail-row">
                                <label>Fecha:</label>
                                <span>${this.formatDisplayDate(appointment.Fecha)}</span>
                            </div>
                            <div class="detail-row">
                                <label>Hora:</label>
                                <span>${appointment.Hora}</span>
                            </div>
                            <div class="detail-row">
                                <label>Duración:</label>
                                <span>${appointment.Duracion} min</span>
                            </div>
                            <div class="detail-row">
                                <label>Estado:</label>
                                <span class="state-badge ${this.getStateClass(appointment.EstadoCita)}">${appointment.EstadoCita}</span>
                            </div>
                            <div class="detail-row">
                                <label>Tratamiento:</label>
                                <span>${appointment.Tratamiento}</span>
                            </div>
                            <div class="detail-row">
                                <label>Odontólogo:</label>
                                <span>${appointment.Odontologo}</span>
                            </div>
                        </div>
                        
                        <div class="detail-section full-width">
                            <h4>Notas</h4>
                            <div class="notes-content">${appointment.Notas || 'Sin notas adicionales'}</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="agendaManager.editAppointment('${appointment.IdCita}')">Editar</button>
                    <button class="btn btn-warning" onclick="agendaManager.confirmAppointment('${appointment.IdCita}')">Confirmar</button>
                    <button class="btn btn-danger" onclick="agendaManager.cancelAppointment('${appointment.IdCita}')">Cancelar</button>
                    <button class="btn btn-success" onclick="agendaManager.markAsCompleted('${appointment.IdCita}')">Finalizar</button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    async confirmAppointment(appointmentId) {
        try {
            const response = await api.put(`/api/agenda/appointment/${appointmentId}/confirm`, {
                state: this.appointmentStates.CONFIRMADA
            });
            
            if (response.success) {
                this.showSuccess('Cita confirmada correctamente');
                this.refreshCurrentView();
            }
        } catch (error) {
            console.error('Error confirmando cita:', error);
            this.showError('Error confirmando la cita');
        }
    }

    async cancelAppointment(appointmentId) {
        const reason = prompt('Motivo de cancelación:');
        if (!reason) return;

        try {
            const response = await api.put(`/api/agenda/appointment/${appointmentId}/cancel`, {
                state: this.appointmentStates.CANCELADA,
                reason: reason
            });
            
            if (response.success) {
                this.showSuccess('Cita cancelada correctamente');
                this.refreshCurrentView();
            }
        } catch (error) {
            console.error('Error cancelando cita:', error);
            this.showError('Error cancelando la cita');
        }
    }

    async markAsCompleted(appointmentId) {
        try {
            const response = await api.put(`/api/agenda/appointment/${appointmentId}/complete`, {
                state: this.appointmentStates.FINALIZADA,
                completedAt: new Date().toISOString()
            });
            
            if (response.success) {
                this.showSuccess('Cita marcada como finalizada');
                this.refreshCurrentView();
            }
        } catch (error) {
            console.error('Error finalizando cita:', error);
            this.showError('Error finalizando la cita');
        }
    }

    setupFiltersAndControls() {
        const filterContainer = document.getElementById('agenda-filters');
        if (!filterContainer) return;

        filterContainer.innerHTML = `
            <div class="filters-section">
                <div class="filter-group">
                    <label>Doctor:</label>
                    <select id="doctor-filter" onchange="agendaManager.filterAppointments()">
                        <option value="">Todos los doctores</option>
                        <option value="3">Dra. Virginia Tresgallo</option>
                        <option value="4">Dra. Irene García</option>
                        <option value="3">Dr. Mario Rubio</option>
                        <option value="12">Tc. Juan Antonio Manzanedo</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label>Estado:</label>
                    <select id="state-filter" onchange="agendaManager.filterAppointments()">
                        <option value="">Todos los estados</option>
                        <option value="Planificada">Planificada</option>
                        <option value="Confirmada">Confirmada</option>
                        <option value="Aceptada">Aceptada</option>
                        <option value="Finalizada">Finalizada</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label>Tratamiento:</label>
                    <select id="treatment-filter" onchange="agendaManager.filterAppointments()">
                        <option value="">Todos los tratamientos</option>
                        <option value="Primera Visita">Primera Visita</option>
                        <option value="Higiene Dental">Higiene Dental</option>
                        <option value="Endodoncia">Endodoncia</option>
                        <option value="Cirugía de Implante">Cirugía de Implante</option>
                        <option value="Urgencia">Urgencia</option>
                    </select>
                </div>
                
                <div class="filter-actions">
                    <button class="btn btn-primary" onclick="agendaManager.newAppointment()">Nueva Cita</button>
                    <button class="btn btn-outline" onclick="agendaManager.exportCalendar()">Exportar</button>
                </div>
            </div>
        `;
    }

    filterAppointments() {
        const doctorFilter = document.getElementById('doctor-filter')?.value;
        const stateFilter = document.getElementById('state-filter')?.value;
        const treatmentFilter = document.getElementById('treatment-filter')?.value;

        let filteredAppointments = this.appointments || [];

        if (doctorFilter) {
            filteredAppointments = filteredAppointments.filter(apt => 
                apt.Odontologo.includes(getDoctorName(doctorFilter))
            );
        }

        if (stateFilter) {
            filteredAppointments = filteredAppointments.filter(apt => 
                apt.EstadoCita === stateFilter
            );
        }

        if (treatmentFilter) {
            filteredAppointments = filteredAppointments.filter(apt => 
                apt.Tratamiento === treatmentFilter
            );
        }

        this.renderFilteredAppointments(filteredAppointments);
    }

    renderFilteredAppointments(appointments) {
        // Limpiar todas las citas del calendario
        document.querySelectorAll('.appointments-list').forEach(container => {
            container.innerHTML = '';
        });

        // Renderizar citas filtradas
        appointments.forEach(appointment => {
            const dateStr = appointment.Fecha;
            const container = document.getElementById(`appointments-${dateStr}`);
            
            if (container) {
                const stateClass = this.getStateClass(appointment.EstadoCita);
                const isUrgent = appointment.Tratamiento === 'Urgencia';
                
                container.innerHTML += `
                    <div class="appointment-item ${stateClass} ${isUrgent ? 'urgent' : ''}" 
                         onclick="agendaManager.showAppointmentDetail('${appointment.IdCita}')"
                         data-appointment-id="${appointment.IdCita}">
                        <div class="appointment-time">${appointment.Hora}</div>
                        <div class="appointment-patient">${appointment.Nombre} ${appointment.Apellidos}</div>
                        <div class="appointment-treatment">${appointment.Tratamiento}</div>
                    </div>
                `;
            }
        });
    }

    async newAppointment() {
        const modal = document.getElementById('new-appointment-modal');
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>Nueva Cita</h3>
                    <button class="close-btn" onclick="this.closest('.modal').style.display='none'">
                        <svg width="24" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="new-appointment-form" onsubmit="agendaManager.createAppointment(event)">
                        <div class="form-grid">
                            <div class="form-section">
                                <h4>Información del Paciente</h4>
                                <div class="form-row">
                                    <label>Buscar Paciente:</label>
                                    <input type="text" id="patient-search" placeholder="Nombre, apellidos o teléfono" 
                                           onchange="agendaManager.searchPatient(this.value)">
                                    <div id="patient-suggestions" class="suggestions-dropdown"></div>
                                </div>
                                <div class="form-row">
                                    <label>Nombre:</label>
                                    <input type="text" id="patient-name" required>
                                </div>
                                <div class="form-row">
                                    <label>Apellidos:</label>
                                    <input type="text" id="patient-surname" required>
                                </div>
                                <div class="form-row">
                                    <label>Teléfono:</label>
                                    <input type="tel" id="patient-phone" required>
                                </div>
                            </div>
                            
                            <div class="form-section">
                                <h4>Detalles de la Cita</h4>
                                <div class="form-row">
                                    <label>Fecha:</label>
                                    <input type="date" id="appointment-date" required>
                                </div>
                                <div class="form-row">
                                    <label>Hora:</label>
                                    <input type="time" id="appointment-time" required>
                                </div>
                                <div class="form-row">
                                    <label>Doctor:</label>
                                    <select id="appointment-doctor" required>
                                        <option value="">Seleccionar doctor</option>
                                        <option value="3">Dra. Virginia Tresgallo</option>
                                        <option value="4">Dra. Irene García</option>
                                        <option value="3">Dr. Mario Rubio</option>
                                        <option value="12">Tc. Juan Antonio Manzanedo</option>
                                    </select>
                                </div>
                                <div class="form-row">
                                    <label>Tratamiento:</label>
                                    <select id="appointment-treatment" required>
                                        <option value="">Seleccionar tratamiento</option>
                                        <option value="Primera Visita">Primera Visita</option>
                                        <option value="Higiene Dental">Higiene Dental</option>
                                        <option value="Endodoncia">Endodoncia</option>
                                        <option value="Cirugía de Implante">Cirugía de Implante</option>
                                        <option value="Protesis Fija">Prótesis Fija</option>
                                        <option value="Cirugia/Injerto">Cirugía/Injerto</option>
                                        <option value="Retirar Ortodoncia">Retirar Ortodoncia</option>
                                        <option value="Protesis Removible">Prótesis Removible</option>
                                        <option value="Colocacion Ortodoncia">Colocación Ortodoncia</option>
                                        <option value="Periodoncia">Periodoncia</option>
                                        <option value="Cirugía de Implante">Cirugía de Implante</option>
                                        <option value="Mensualidad Ortodoncia">Mensualidad Ortodoncia</option>
                                        <option value="Ajuste Prot/tto">Ajuste Prótesis</option>
                                        <option value="Control">Control</option>
                                        <option value="Urgencia">Urgencia</option>
                                        <option value="RX/escaner">RX/Escáner</option>
                                    </select>
                                </div>
                                <div class="form-row">
                                    <label>Duración (minutos):</label>
                                    <input type="number" id="appointment-duration" value="60" min="15" max="180">
                                </div>
                                <div class="form-row">
                                    <label>Notas:</label>
                                    <textarea id="appointment-notes" rows="3" placeholder="Notas adicionales..."></textarea>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" onclick="this.closest('.modal').style.display='none'">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Crear Cita</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Establecer fecha mínima como hoy
        document.getElementById('appointment-date').min = new Date().toISOString().split('T')[0];
        
        modal.style.display = 'flex';
    }

    async createAppointment(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const appointmentData = {
            patientName: document.getElementById('patient-name').value,
            patientSurname: document.getElementById('patient-surname').value,
            patientPhone: document.getElementById('patient-phone').value,
            date: document.getElementById('appointment-date').value,
            time: document.getElementById('appointment-time').value,
            doctor: document.getElementById('appointment-doctor').value,
            treatment: document.getElementById('appointment-treatment').value,
            duration: parseInt(document.getElementById('appointment-duration').value),
            notes: document.getElementById('appointment-notes').value,
            state: this.appointmentStates.PLANIFICADA
        };

        try {
            const response = await api.post('/api/agenda/appointment', appointmentData);
            
            if (response.success) {
                this.showSuccess('Cita creada correctamente');
                this.refreshCurrentView();
                
                // Enviar confirmación automática 24h antes
                this.scheduleConfirmationMessage(response.data.id, appointmentData.date, appointmentData.time);
            }
        } catch (error) {
            console.error('Error creando cita:', error);
            this.showError('Error creando la cita');
        }
    }

    async scheduleConfirmationMessage(appointmentId, appointmentDate, appointmentTime) {
        // Calcular fecha 24h antes
        const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
        const confirmationDate = new Date(appointmentDateTime.getTime() - (24 * 60 * 60 * 1000));
        
        // Solo programar si la confirmación es en el futuro
        if (confirmationDate > new Date()) {
            try {
                await api.post('/api/agenda/schedule-confirmation', {
                    appointmentId: appointmentId,
                    confirmationDate: confirmationDate.toISOString(),
                    appointmentDate: appointmentDate,
                    appointmentTime: appointmentTime
                });
            } catch (error) {
                console.error('Error programando mensaje de confirmación:', error);
            }
        }
    }

    async searchPatient(query) {
        if (query.length < 2) return;

        try {
            const response = await api.get(`/api/agenda/search-patients?q=${encodeURIComponent(query)}`);
            
            if (response.success && response.data.length > 0) {
                this.showPatientSuggestions(response.data);
            }
        } catch (error) {
            console.error('Error buscando pacientes:', error);
        }
    }

    showPatientSuggestions(patients) {
        const suggestionsContainer = document.getElementById('patient-suggestions');
        if (!suggestionsContainer) return;

        suggestionsContainer.innerHTML = patients.map(patient => `
            <div class="suggestion-item" onclick="agendaManager.selectPatient('${JSON.stringify(patient)}')">
                <div class="patient-info">
                    <strong>${patient.nombre} ${patient.apellidos}</strong>
                    <div class="patient-details">
                        Tel: ${patient.telefono} | Nº: ${patient.numeroPaciente}
                    </div>
                </div>
            </div>
        `).join('');

        suggestionsContainer.style.display = 'block';
    }

    selectPatient(patientData) {
        const patient = JSON.parse(patientData);
        
        document.getElementById('patient-name').value = patient.nombre;
        document.getElementById('patient-surname').value = patient.apellidos;
        document.getElementById('patient-phone').value = patient.telefono;
        
        const suggestionsContainer = document.getElementById('patient-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }

    // Sistema de Confirmación Automática
    async setupAutomaticConfirmations() {
        try {
            // Buscar citas que necesitan confirmación en 24h
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const response = await api.get(`/api/agenda/confirmations-needed?date=${this.formatDate(tomorrow)}`);
            
            if (response.success) {
                for (const appointment of response.data) {
                    await this.sendConfirmationMessage(appointment);
                }
            }
        } catch (error) {
            console.error('Error configurando confirmaciones automáticas:', error);
        }
    }

    async sendConfirmationMessage(appointment) {
        const message = this.buildConfirmationMessage(appointment);
        
        try {
            // Enviar mensaje WhatsApp
            await whatsappManager.sendMessage({
                phone: appointment.telefono,
                message: message,
                type: 'appointment_confirmation',
                appointmentId: appointment.id
            });
            
            // Actualizar estado de mensaje programado
            await api.put(`/api/agenda/appointment/${appointment.id}/confirmation-sent`, {
                sentAt: new Date().toISOString(),
                messageId: appointment.id
            });
            
        } catch (error) {
            console.error('Error enviando mensaje de confirmación:', error);
        }
    }

    buildConfirmationMessage(appointment) {
        const date = this.formatDisplayDate(appointment.fecha);
        const time = appointment.hora;
        const treatment = appointment.tratamiento;
        
        return `🏥 *CLÍNICA DENTAL RUBIO GARCÍA*\n\n` +
               `Hola ${appointment.nombre},\n\n` +
               `Te recordamos tu cita de mañana:\n\n` +
               `📅 *Fecha:* ${date}\n` +
               `⏰ *Hora:* ${time}\n` +
               `🦷 *Tratamiento:* ${treatment}\n\n` +
               `Por favor, confirma o cancela tu cita:\n\n` +
               `✅ *CONFIRMAR* - Confirmo mi asistencia\n` +
               `❌ *CANCELAR* - No puedo asistir\n\n` +
               `¡Gracias por ayudarnos a mejorar nuestra atención! 😊\n\n` +
               `📞 Tel: 91 641 08 41\n` +
               `📱 WhatsApp: 664 218 253`;
    }

    // WebSocket para actualizaciones en tiempo real
    setupWebSocketListeners() {
        if (!window.WebSocketManager) return;

        WebSocketManager.on('appointment_updated', (data) => {
            this.handleAppointmentUpdate(data);
        });

        WebSocketManager.on('appointment_created', (data) => {
            this.handleAppointmentCreated(data);
        });

        WebSocketManager.on('appointment_cancelled', (data) => {
            this.handleAppointmentCancelled(data);
        });
    }

    handleAppointmentUpdate(data) {
        // Actualizar la cita en el calendario
        const appointment = data.appointment;
        this.updateAppointmentInCalendar(appointment);
        this.showToast(`Cita actualizada: ${appointment.nombre} - ${appointment.estado}`, 'info');
    }

    handleAppointmentCreated(data) {
        // Agregar nueva cita al calendario
        const appointment = data.appointment;
        this.addAppointmentToCalendar(appointment);
        this.showToast(`Nueva cita creada: ${appointment.nombre} - ${appointment.tratamiento}`, 'success');
    }

    handleAppointmentCancelled(data) {
        // Remover cita cancelada del calendario
        const appointmentId = data.appointmentId;
        this.removeAppointmentFromCalendar(appointmentId);
        this.showToast('Cita cancelada', 'warning');
    }

    updateAppointmentInCalendar(appointment) {
        // Implementar actualización de cita específica
        this.refreshCurrentView();
    }

    addAppointmentToCalendar(appointment) {
        // Implementar agregado de cita específica
        this.refreshCurrentView();
    }

    removeAppointmentFromCalendar(appointmentId) {
        // Implementar eliminación de cita específica
        this.refreshCurrentView();
    }

    // Utilidades
    formatDate(date) {
        if (typeof date === 'string') {
            return date;
        }
        return date.toISOString().split('T')[0];
    }

    formatDisplayDate(dateStr) {
        const date = new Date(dateStr);
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('es-ES', options);
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    getCurrentMonthYear() {
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return `${monthNames[this.currentMonth]} ${this.currentYear}`;
    }

    previousMonth() {
        if (this.currentMonth === 0) {
            this.currentMonth = 11;
            this.currentYear--;
        } else {
            this.currentMonth--;
        }
        this.renderCalendar();
        this.loadAppointmentsForCurrentMonth();
    }

    nextMonth() {
        if (this.currentMonth === 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else {
            this.currentMonth++;
        }
        this.renderCalendar();
        this.loadAppointmentsForCurrentMonth();
    }

    selectDay(dateStr) {
        // Implementar selección de día para vista detallada
        console.log('Día seleccionado:', dateStr);
    }

    changeView(view) {
        // Actualizar botones de vista
        document.querySelectorAll('.view-controls .btn').forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline');
        });
        
        document.getElementById(`${view}-view-btn`)?.classList.remove('btn-outline');
        document.getElementById(`${view}-view-btn`)?.classList.add('btn-primary');
        
        // Cambiar vista del calendario
        this.currentView = view;
        this.renderCalendar();
    }

    updateDashboardStats() {
        // Actualizar estadísticas en el dashboard
        const todayAppointments = this.appointments?.filter(apt => apt.Fecha === this.formatDate(new Date())) || [];
        const urgentAppointments = this.appointments?.filter(apt => apt.Tratamiento === 'Urgencia') || [];
        const pendingConfirmations = this.appointments?.filter(apt => apt.EstadoCita === 'Planificada') || [];

        // Actualizar elementos del dashboard si existen
        document.getElementById('today-appointments-count')?.textContent = todayAppointments.length;
        document.getElementById('urgent-appointments-count')?.textContent = urgentAppointments.length;
        document.getElementById('pending-confirmations-count')?.textContent = pendingConfirmations.length;
    }

    refreshCurrentView() {
        this.loadAppointmentsForCurrentMonth();
    }

    loadSampleAppointments() {
        // Datos de ejemplo para desarrollo
        this.appointments = [
            {
                IdCita: '001',
                NumPac: 'P001',
                Nombre: 'Ana',
                Apellidos: 'García López',
                TelMovil: '666123456',
                Fecha: this.formatDate(new Date()),
                Hora: '10:00',
                EstadoCita: 'Planificada',
                Tratamiento: 'Primera Visita',
                Odontologo: 'Dra. Irene García',
                Duracion: 60,
                Notas: 'Primera consulta'
            },
            {
                IdCita: '002',
                NumPac: 'P002',
                Nombre: 'Carlos',
                Apellidos: 'Martín Ruiz',
                TelMovil: '666654321',
                Fecha: this.formatDate(new Date()),
                Hora: '11:30',
                EstadoCita: 'Confirmada',
                Tratamiento: 'Higiene Dental',
                Odontologo: 'Tc. Juan Antonio Manzanedo',
                Duracion: 45,
                Notas: 'Revisión rutina'
            },
            {
                IdCita: '003',
                NumPac: 'P003',
                Nombre: 'María',
                Apellidos: 'Fernández Silva',
                TelMovil: '666987654',
                Fecha: this.formatDate(new Date()),
                Hora: '16:00',
                EstadoCita: 'Aceptada',
                Tratamiento: 'Urgencia',
                Odontologo: 'Dr. Mario Rubio',
                Duracion: 30,
                Notas: 'Dolor molar derecho'
            }
        ];

        this.renderAppointmentsInCalendar();
        this.updateDashboardStats();
    }

    exportCalendar() {
        if (!this.appointments || this.appointments.length === 0) {
            this.showError('No hay citas para exportar');
            return;
        }

        const csvContent = this.generateCalendarCSV();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `agenda-${this.getCurrentMonthYear()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showSuccess('Agenda exportada correctamente');
    }

    generateCalendarCSV() {
        let csv = 'Registro,Fecha,Hora,Paciente,Telefono,Doctor,Tratamiento,Estado,Duracion,Notas\n';
        
        this.appointments.forEach(appointment => {
            csv += `"${appointment.IdCita}","${appointment.Fecha}","${appointment.Hora}","${appointment.Nombre} ${appointment.Apellidos}","${appointment.TelMovil}","${appointment.Odontologo}","${appointment.Tratamiento}","${appointment.EstadoCita}","${appointment.Duracion}","${appointment.Notas}"\n`;
        });
        
        return csv;
    }

    showError(message) {
        console.error(message);
        // Mostrar notificación de error
        if (window.ComponentsManager) {
            ComponentsManager.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        console.log(message);
        // Mostrar notificación de éxito
        if (window.ComponentsManager) {
            ComponentsManager.showToast(message, 'success');
        } else {
            alert(message);
        }
    }

    showToast(message, type = 'info') {
        // Implementar sistema de toast
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Función helper para obtener nombre del doctor
function getDoctorName(doctorId) {
    const doctorNames = {
        '3': 'Virginia Tresgallo',
        '4': 'Irene García', 
        '12': 'Juan Antonio Manzanedo'
    };
    return doctorNames[doctorId] || 'Doctor';
}

// Inicializar sistema de agenda cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.agendaManager = new AgendaManager();
});

// Exportar para uso global
window.AgendaManager = AgendaManager;