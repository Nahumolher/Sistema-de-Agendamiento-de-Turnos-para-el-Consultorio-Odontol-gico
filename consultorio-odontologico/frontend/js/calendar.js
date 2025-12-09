// ===== CALENDARIO VISUAL INTERACTIVO =====

class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.currentView = 'month'; // 'month', 'week', 'day'
        this.appointments = [];
        this.specialties = [];
        this.blockedDates = new Set();
        this.colors = [
            '#2196f3', '#4caf50', '#ff9800', '#f44336',
            '#9c27b0', '#00bcd4', '#ffeb3b', '#795548'
        ];
        this.init();
    }

    async init() {
        await this.loadSpecialties();
        await this.loadBlockedDates();
    }

    async loadSpecialties() {
        try {
            const response = await api.getSpecialties();
            this.specialties = response.specialties || response;
            // Asignar colores a especialidades
            this.specialties.forEach((specialty, index) => {
                specialty.color = this.colors[index % this.colors.length];
            });
        } catch (error) {
            console.error('Error loading specialties:', error);
        }
    }

    async loadBlockedDates() {
        try {
            const response = await api.getNonWorkingDays();
            this.blockedDates = new Set();
            if (response.dates) {
                response.dates.forEach(dateInfo => {
                    if (dateInfo.date) {
                        this.blockedDates.add(dateInfo.date);
                    } else if (dateInfo.start_date && dateInfo.end_date) {
                        const start = new Date(dateInfo.start_date);
                        const end = new Date(dateInfo.end_date);
                        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                            this.blockedDates.add(d.toISOString().split('T')[0]);
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error loading blocked dates:', error);
        }
    }

    createCalendarView() {
        return `
            <div class="calendar-container">
                <!-- Header del Calendario -->
                <div class="calendar-header">
                    <div class="calendar-nav">
                        <button class="calendar-nav-btn" onclick="calendarManager.previousPeriod()">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="calendar-nav-btn" onclick="calendarManager.goToToday()">
                            <i class="fas fa-calendar-day"></i> Hoy
                        </button>
                        <button class="calendar-nav-btn" onclick="calendarManager.nextPeriod()">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    
                    <h2 class="calendar-title" id="calendarTitle">
                        ${this.formatCalendarTitle()}
                    </h2>
                    
                    <div class="calendar-views">
                        <button class="view-btn ${this.currentView === 'month' ? 'active' : ''}" 
                                onclick="calendarManager.setView('month')">
                            Mes
                        </button>
                        <button class="view-btn ${this.currentView === 'week' ? 'active' : ''}" 
                                onclick="calendarManager.setView('week')">
                            Semana
                        </button>
                        <button class="view-btn ${this.currentView === 'day' ? 'active' : ''}" 
                                onclick="calendarManager.setView('day')">
                            Día
                        </button>
                    </div>
                </div>

                <!-- Contenido del Calendario -->
                <div class="calendar-content">
                    <!-- Vista Mensual -->
                    <div class="calendar-month ${this.currentView === 'month' ? 'active' : ''}" id="monthView">
                        ${this.createMonthView()}
                    </div>

                    <!-- Vista Semanal -->
                    <div class="calendar-week ${this.currentView === 'week' ? 'active' : ''}" id="weekView">
                        ${this.createWeekView()}
                    </div>

                    <!-- Vista Diaria -->
                    <div class="calendar-day-view ${this.currentView === 'day' ? 'active' : ''}" id="dayView">
                        ${this.createDayView()}
                    </div>
                </div>

                <!-- Leyenda y Controles -->
                <div class="calendar-legend">
                    <div class="legend-items">
                        <div class="legend-item">
                            <div class="legend-color" style="border-color: #28a745; background: #d4edda;"></div>
                            <span>Confirmado</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="border-color: #ffc107; background: #fff3cd;"></div>
                            <span>Programado</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="border-color: #dc3545; background: #f8d7da;"></div>
                            <span>Cancelado</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="border-color: #6c757d; background: #e2e3e5;"></div>
                            <span>Completado</span>
                        </div>
                    </div>
                    
                    <div class="calendar-actions">
                        <div class="quick-nav">
                            <button class="quick-nav-btn" onclick="calendarManager.goToDate('today')">Hoy</button>
                            <button class="quick-nav-btn" onclick="calendarManager.goToDate('tomorrow')">Mañana</button>
                            <button class="quick-nav-btn" onclick="calendarManager.goToDate('week')">Esta Semana</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createMonthView() {
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        
        // Obtener el primer día de la semana (lunes)
        const startDate = new Date(firstDay);
        const dayOfWeek = firstDay.getDay();
        startDate.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        
        // Obtener el último día de la grilla (domingo)
        const endDate = new Date(lastDay);
        const lastDayOfWeek = lastDay.getDay();
        endDate.setDate(endDate.getDate() + (lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek));

        let html = `
            <div class="calendar-weekdays">
                <div class="weekday">Lun</div>
                <div class="weekday">Mar</div>
                <div class="weekday">Mié</div>
                <div class="weekday">Jue</div>
                <div class="weekday">Vie</div>
                <div class="weekday">Sáb</div>
                <div class="weekday">Dom</div>
            </div>
            <div class="calendar-days" id="calendarDays">
        `;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const isCurrentMonth = date.getMonth() === this.currentDate.getMonth();
            const isToday = date.getTime() === today.getTime();
            const isSelected = this.selectedDate && date.getTime() === this.selectedDate.getTime();
            const dateStr = date.toISOString().split('T')[0];
            const isBlocked = this.blockedDates.has(dateStr);
            
            const dayAppointments = this.appointments.filter(apt => {
                // Normalizar fechas para comparación
                const aptDate = apt.appointment_date;
                if (!aptDate) return false;
                
                // Convertir fecha del turno a formato YYYY-MM-DD
                let normalizedAptDate = aptDate;
                if (aptDate.includes('T')) {
                    normalizedAptDate = aptDate.split('T')[0];
                } else if (aptDate.includes('/')) {
                    // Convertir DD/MM/YYYY a YYYY-MM-DD
                    const parts = aptDate.split('/');
                    if (parts.length === 3) {
                        normalizedAptDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                }
                
                return normalizedAptDate === dateStr;
            });
            
            // Debug: log appointments for today if it's today
            if (isToday) {
                console.log('Calendar: Verificando turnos para hoy:', dateStr);
                console.log('Calendar: Total turnos disponibles:', this.appointments.length);
                console.log('Calendar: Turnos filtrados para hoy:', dayAppointments.length, dayAppointments);
            }
            
            let dayClasses = ['calendar-day'];
            if (!isCurrentMonth) dayClasses.push('other-month');
            if (isToday) dayClasses.push('today');
            if (isSelected) dayClasses.push('selected');
            if (dayAppointments.length > 0) dayClasses.push('has-appointments');
            if (isBlocked) dayClasses.push('blocked');

            html += `
                <div class="${dayClasses.join(' ')}" 
                     onclick="calendarManager.selectDate('${dateStr}')"
                     data-date="${dateStr}">
                    <div class="day-number">${date.getDate()}</div>
                    <div class="day-appointments">
                        ${dayAppointments.slice(0, 3).map(apt => `
                            <div class="appointment-item ${apt.status || 'confirmed'}" 
                                 onclick="calendarManager.showAppointmentDetails(${apt.id})"
                                 title="${(apt.patient_name || 'Sin nombre')} - ${(apt.specialty_name || 'Sin especialidad')}">
                                <span class="appointment-time">${(apt.appointment_time || '00:00').substring(0, 5)}</span>
                                <span class="appointment-patient">${(apt.patient_name || 'Sin nombre').substring(0, 15)}</span>
                            </div>
                        `).join('')}
                        ${dayAppointments.length > 3 ? `
                            <div class="appointment-item" style="background: #f8f9fa; color: #6c757d;">
                                +${dayAppointments.length - 3} más
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    createWeekView() {
        const startOfWeek = new Date(this.currentDate);
        const dayOfWeek = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        
        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            weekDays.push(day);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let html = `
            <div class="week-header">
                <div class="time-column">Hora</div>
                ${weekDays.map(day => {
                    const isToday = day.getTime() === today.getTime();
                    return `
                        <div class="week-day-header ${isToday ? 'today' : ''}">
                            <div style="font-size: 0.9rem; opacity: 0.8;">
                                ${this.getWeekDayName(day.getDay())}
                            </div>
                            <div style="font-size: 1.1rem; font-weight: 700;">
                                ${day.getDate()}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="week-grid" id="weekGrid">
        `;

        // Horarios de 8:00 a 20:00
        for (let hour = 8; hour < 20; hour++) {
            html += `
                <div class="time-slot">${hour.toString().padStart(2, '0')}:00</div>
                ${weekDays.map(day => {
                    const dateStr = day.toISOString().split('T')[0];
                    const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
                    
                    return `
                        <div class="week-day-column" 
                             onclick="calendarManager.createAppointmentAt('${dateStr}', '${timeSlot}')"
                             data-date="${dateStr}" 
                             data-time="${timeSlot}">
                            ${this.getAppointmentsForTimeSlot(dateStr, hour)}
                        </div>
                    `;
                }).join('')}
            `;
        }
        
        html += '</div>';
        return html;
    }

    createDayView() {
        const dateStr = this.currentDate.toISOString().split('T')[0];
        const dayAppointments = this.appointments.filter(apt => {
            // Normalizar fechas para comparación (mismo código que en createMonthView)
            const aptDate = apt.appointment_date;
            if (!aptDate) return false;
            
            let normalizedAptDate = aptDate;
            if (aptDate.includes('T')) {
                normalizedAptDate = aptDate.split('T')[0];
            } else if (aptDate.includes('/')) {
                const parts = aptDate.split('/');
                if (parts.length === 3) {
                    normalizedAptDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }
            
            return normalizedAptDate === dateStr;
        });
        
        // Debug para vista diaria
        console.log('Calendar Day View - Fecha objetivo:', dateStr);
        console.log('Calendar Day View - Total turnos disponibles:', this.appointments.length);
        console.log('Calendar Day View - Turnos filtrados:', dayAppointments.length, dayAppointments);
        
        return `
            <div class="day-view-container">
                <div class="day-view-header">
                    <h3>${this.formatDate(this.currentDate)}</h3>
                    <div class="day-summary">
                        <span class="badge bg-primary">${dayAppointments.length} turnos</span>
                        <span class="badge bg-success">${dayAppointments.filter(a => a.status === 'confirmed').length} confirmados</span>
                        <span class="badge bg-warning">${dayAppointments.filter(a => a.status === 'scheduled').length} programados</span>
                    </div>
                </div>
                <div class="day-appointments-list">
                    ${dayAppointments.length === 0 ? `
                        <div class="alert alert-info">
                            <i class="fas fa-calendar-plus"></i>
                            <strong>No hay turnos programados para este día</strong>
                        </div>
                    ` : dayAppointments
                        .sort((a, b) => (a.appointment_time || '00:00').localeCompare(b.appointment_time || '00:00'))
                        .map(apt => `
                        <div class="day-appointment-card ${apt.status || 'confirmed'}" data-appointment-id="${apt.id}">
                            <div class="appointment-time-large">
                                ${(apt.appointment_time || '00:00').substring(0, 5)}
                                <small style="display: block; font-size: 0.7rem; margin-top: 5px; opacity: 0.8;">
                                    ${this.formatDuration(apt.duration_minutes || 30)} min
                                </small>
                            </div>
                            <div class="appointment-details">
                                <strong>${apt.patient_name || 'Sin nombre'}</strong>
                                <span class="text-muted">
                                    ${apt.specialty_name || 'Sin especialidad'}
                                </span>
                                <div style="margin-top: 8px;">
                                    <span class="badge bg-${this.getStatusBadgeClass(apt.status || 'confirmed')}">
                                        <i class="fas fa-${this.getStatusIcon(apt.status || 'confirmed')}"></i>
                                        ${this.getStatusText(apt.status || 'confirmed')}
                                    </span>
                                    ${apt.notes ? `
                                        <span class="badge bg-light text-dark ms-2" title="Notas: ${apt.notes}">
                                            <i class="fas fa-sticky-note"></i>
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="appointment-actions">
                                <button class="btn btn-sm btn-outline-primary" 
                                        onclick="calendarManager.editAppointment(${apt.id})"
                                        title="Editar turno">
                                    <i class="fas fa-edit"></i>
                                    <span class="d-none d-md-inline ms-1">Editar</span>
                                </button>
                                <button class="btn btn-sm btn-outline-danger"
                                        onclick="calendarManager.cancelAppointment(${apt.id})"
                                        title="Cancelar turno">
                                    <i class="fas fa-times"></i>
                                    <span class="d-none d-md-inline ms-1">Cancelar</span>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getAppointmentsForTimeSlot(dateStr, hour) {
        const appointments = this.appointments.filter(apt => {
            // Normalizar fechas para comparación (mismo código que en createMonthView)
            const aptDate = apt.appointment_date;
            if (!aptDate) return false;
            
            let normalizedAptDate = aptDate;
            if (aptDate.includes('T')) {
                normalizedAptDate = aptDate.split('T')[0];
            } else if (aptDate.includes('/')) {
                const parts = aptDate.split('/');
                if (parts.length === 3) {
                    normalizedAptDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }
            
            if (normalizedAptDate !== dateStr) return false;
            
            // Verificar hora
            const aptHour = parseInt((apt.appointment_time || '00:00').split(':')[0]);
            return aptHour === hour;
        });

        return appointments.map(apt => `
            <div class="week-appointment ${apt.status || 'confirmed'}"
                 onclick="calendarManager.showAppointmentDetails(${apt.id})"
                 style="top: ${this.calculateAppointmentPosition(apt.appointment_time || '00:00')}px; height: ${this.calculateAppointmentHeight(apt.duration_minutes || 30)}px;">
                <strong>${(apt.appointment_time || '00:00').substring(0, 5)}</strong><br>
                ${apt.patient_name || 'Sin nombre'}<br>
                <small>${apt.specialty_name || 'Sin especialidad'}</small>
            </div>
        `).join('');
    }

    calculateAppointmentPosition(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return (minutes / 60) * 50; // 50px por hora
    }

    calculateAppointmentHeight(duration) {
        return Math.max((duration / 60) * 50, 20); // Mínimo 20px
    }

    async loadAppointments() {
        try {
            if (typeof showLoading === 'function') {
                showLoading(true);
            }
            
            const startDate = this.getViewStartDate();
            const endDate = this.getViewEndDate();
            
            console.log('Calendar: Cargando turnos del', startDate.toISOString().split('T')[0], 'al', endDate.toISOString().split('T')[0]);
            
            const response = await api.getAdminAppointments({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                limit: 1000
            });
            
            this.appointments = response.appointments || response || [];
            console.log('Calendar: Turnos cargados:', this.appointments.length, this.appointments);
            this.refreshCurrentView();
            
        } catch (error) {
            console.error('Error loading appointments:', error);
            if (typeof showError === 'function') {
                showError('Error al cargar los turnos del calendario');
            }
        } finally {
            if (typeof showLoading === 'function') {
                showLoading(false);
            }
        }
    }

    getViewStartDate() {
        const start = new Date(this.currentDate);
        if (this.currentView === 'month') {
            start.setDate(1);
            const dayOfWeek = start.getDay();
            start.setDate(start.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        } else if (this.currentView === 'week') {
            const dayOfWeek = start.getDay();
            start.setDate(start.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        }
        return start;
    }

    getViewEndDate() {
        const end = new Date(this.currentDate);
        if (this.currentView === 'month') {
            end.setMonth(end.getMonth() + 1, 0);
            const dayOfWeek = end.getDay();
            end.setDate(end.getDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek));
        } else if (this.currentView === 'week') {
            const dayOfWeek = end.getDay();
            end.setDate(end.getDate() + (6 - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)));
        }
        return end;
    }

    // Métodos de navegación
    previousPeriod() {
        if (this.currentView === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        } else if (this.currentView === 'week') {
            this.currentDate.setDate(this.currentDate.getDate() - 7);
        } else if (this.currentView === 'day') {
            this.currentDate.setDate(this.currentDate.getDate() - 1);
        }
        this.refreshCalendar();
    }

    nextPeriod() {
        if (this.currentView === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        } else if (this.currentView === 'week') {
            this.currentDate.setDate(this.currentDate.getDate() + 7);
        } else if (this.currentView === 'day') {
            this.currentDate.setDate(this.currentDate.getDate() + 1);
        }
        this.refreshCalendar();
    }

    goToToday() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.refreshCalendar();
    }

    goToDate(period) {
        const today = new Date();
        if (period === 'today') {
            this.currentDate = new Date(today);
        } else if (period === 'tomorrow') {
            this.currentDate = new Date(today);
            this.currentDate.setDate(today.getDate() + 1);
        } else if (period === 'week') {
            this.currentDate = new Date(today);
            this.setView('week');
            return;
        }
        this.refreshCalendar();
    }

    setView(view) {
        this.currentView = view;
        this.refreshCalendar();
    }

    selectDate(dateStr) {
        this.selectedDate = new Date(dateStr + 'T12:00:00');
        this.currentDate = new Date(this.selectedDate);
        
        // Si se selecciona una fecha, cambiar a vista diaria
        if (this.currentView === 'month') {
            this.setView('day');
        } else {
            this.refreshCurrentView();
        }
    }

    async refreshCalendar() {
        await this.loadAppointments();
        document.getElementById('calendarTitle').textContent = this.formatCalendarTitle();
        
        // Actualizar botones de vista
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.view-btn:nth-child(${this.currentView === 'month' ? 1 : this.currentView === 'week' ? 2 : 3})`).classList.add('active');
    }

    refreshCurrentView() {
        console.log('Calendar: Refrescando vista', this.currentView, 'con', this.appointments.length, 'turnos');
        
        if (this.currentView === 'month') {
            document.getElementById('monthView').innerHTML = this.createMonthView();
        } else if (this.currentView === 'week') {
            document.getElementById('weekView').innerHTML = this.createWeekView();
        } else if (this.currentView === 'day') {
            document.getElementById('dayView').innerHTML = this.createDayView();
        }
        
        // Mostrar/ocultar vistas
        document.querySelectorAll('.calendar-month, .calendar-week, .calendar-day-view').forEach(view => {
            view.style.display = 'none';
        });
        
        if (this.currentView === 'month') {
            document.getElementById('monthView').style.display = 'block';
        } else if (this.currentView === 'week') {
            document.getElementById('weekView').style.display = 'block';
        } else if (this.currentView === 'day') {
            document.getElementById('dayView').style.display = 'block';
        }
    }

    // Métodos de utilidad
    formatCalendarTitle() {
        const options = { 
            year: 'numeric', 
            month: 'long',
            day: this.currentView === 'day' ? 'numeric' : undefined
        };
        
        if (this.currentView === 'week') {
            const startOfWeek = new Date(this.currentDate);
            const dayOfWeek = startOfWeek.getDay();
            startOfWeek.setDate(startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            
            return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} de ${startOfWeek.toLocaleDateString('es', { month: 'long', year: 'numeric' })}`;
        }
        
        return this.currentDate.toLocaleDateString('es', options);
    }

    formatDate(date) {
        return date.toLocaleDateString('es', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getWeekDayName(dayIndex) {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return days[dayIndex];
    }

    getStatusBadgeClass(status) {
        const statusClasses = {
            'confirmed': 'success',
            'scheduled': 'warning',
            'cancelled': 'danger',
            'completed': 'secondary',
            'no_show': 'dark'
        };
        return statusClasses[status] || 'primary';
    }

    getStatusText(status) {
        const statusTexts = {
            'confirmed': 'Confirmado',
            'scheduled': 'Programado',
            'cancelled': 'Cancelado',
            'completed': 'Completado',
            'no_show': 'No asistió'
        };
        return statusTexts[status] || status;
    }

    getStatusIcon(status) {
        const statusIcons = {
            'confirmed': 'check-circle',
            'scheduled': 'clock',
            'cancelled': 'times-circle',
            'completed': 'check-double',
            'no_show': 'user-times'
        };
        return statusIcons[status] || 'calendar-check';
    }

    formatDuration(minutes) {
        if (!minutes) return '30';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours > 0 && mins > 0) {
            return `${hours}h ${mins}`;
        } else if (hours > 0) {
            return `${hours}h`;
        } else {
            return `${mins}`;
        }
    }

    // Métodos de interacción
    showAppointmentDetails(appointmentId) {
        const appointment = this.appointments.find(apt => apt.id === appointmentId);
        if (appointment) {
            // Integrar con el sistema existente de detalles
            if (window.adminManager && window.adminManager.showAppointmentDetails) {
                window.adminManager.showAppointmentDetails(appointmentId);
            } else {
                showSuccess(`Ver detalles del turno #${appointmentId} - ${appointment.patient_name}`);
            }
        }
    }

    async editAppointment(appointmentId) {
        if (window.adminManager && window.adminManager.editAppointment) {
            // Cambiar a la vista de turnos para mostrar el formulario de edición
            await window.adminManager.loadAdminView('appointments');
            // Activar la pestaña de edición
            const manageTab = document.getElementById('manage-tab');
            if (manageTab) {
                manageTab.click();
            }
            // Llamar al método de edición después de un pequeño delay
            setTimeout(() => {
                window.adminManager.editAppointment(appointmentId);
            }, 100);
        } else {
            showError('Sistema de edición no disponible');
        }
    }

    async cancelAppointment(appointmentId) {
        // Confirmar la cancelación
        if (!confirm('¿Estás seguro de que quieres cancelar este turno?')) {
            return;
        }

        try {
            // Usar la API directamente para cancelar
            const response = await api.updateAppointment(appointmentId, {
                status: 'cancelled'
            });

            if (response.success) {
                showSuccess('Turno cancelado exitosamente');
                // Recargar los turnos del calendario
                await this.loadAppointments();
            } else {
                throw new Error(response.error || 'Error al cancelar el turno');
            }
        } catch (error) {
            console.error('Error canceling appointment:', error);
            showError('Error al cancelar el turno: ' + error.message);
        }
    }

    createAppointmentAt(date, time) {
        if (window.adminManager && window.adminManager.showCreateAppointmentModal) {
            window.adminManager.showCreateAppointmentModal();
            // Pre-llenar fecha y hora si es posible
            setTimeout(() => {
                const dateInput = document.getElementById('createAppointmentDate');
                const timeInput = document.getElementById('createAppointmentTime');
                if (dateInput) dateInput.value = date;
                if (timeInput) timeInput.value = time;
            }, 100);
        }
    }
}

// Instancia global del calendario
window.calendarManager = null;