// Manejo de turnos
class AppointmentsManager {
    constructor() {
        this.selectedSlot = null;
        this.specialties = [];
        this.blockedDates = new Set(); // Set para búsqueda rápida de fechas bloqueadas
        this.currentDate = null;
        this.currentSpecialtyId = null;
        this.refreshInterval = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSpecialties();
        this.loadNonWorkingDays();
    }

    // Inicializar límites de fecha de forma asíncrona
    async initializeDateLimits(dateInput) {
        try {
            const maxDate = await getMaxDate();
            dateInput.max = maxDate;
            this.updateDateHelperText();
        } catch (error) {
            console.warn('Error obteniendo configuración de fechas:', error);
            // Mantener el valor síncrono por defecto
            this.updateDateHelperText();
        }
    }

    setupEventListeners() {
        // Formulario de nuevo turno
        const appointmentForm = document.getElementById('appointmentForm');
        if (appointmentForm) {
            appointmentForm.addEventListener('submit', this.handleCreateAppointment.bind(this));
        }

        // Selección de especialidad y fecha
        const specialtySelect = document.getElementById('appointmentSpecialty');
        const dateInput = document.getElementById('appointmentDate');

        if (specialtySelect) {
            specialtySelect.addEventListener('change', this.handleSpecialtyChange.bind(this));
        }

        if (dateInput) {
            dateInput.addEventListener('change', this.handleDateChange.bind(this));
            // También validar cuando el usuario escribe manualmente
            dateInput.addEventListener('input', this.validateDateInput.bind(this));
            // Configurar fecha mínima y máxima
            dateInput.min = getMinDate();
            dateInput.max = getMaxDateSync(); // Usar versión síncrona para inicialización rápida
            
            // Actualizar fechas y texto de ayuda de forma asíncrona
            this.initializeDateLimits(dateInput);
        }

        // Botones de cancelar
        const btnCancel = document.getElementById('btnCancelAppointment');
        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                window.showPage('homePage');
            });
        }

        const btnNewFromList = document.getElementById('btnNewAppointmentFromList');
        if (btnNewFromList) {
            btnNewFromList.addEventListener('click', () => {
                window.showPage('appointmentPage');
                this.initNewAppointment();
            });
        }
    }

    async loadSpecialties() {
        try {
            const response = await api.getSpecialties();
            this.specialties = response.specialties;
            this.populateSpecialtySelect();
        } catch (error) {
            console.error('Error loading specialties:', error);
            showError('Error al cargar las especialidades');
        }
    }

    populateSpecialtySelect() {
        const select = document.getElementById('appointmentSpecialty');
        if (!select) return;

        // Limpiar opciones existentes (excepto la primera)
        select.innerHTML = '<option value="">Selecciona una especialidad</option>';

        this.specialties.forEach(specialty => {
            const option = document.createElement('option');
            option.value = specialty.id;
            option.textContent = `${specialty.name} - $${specialty.price} (${specialty.duration_minutes} min)`;
            select.appendChild(option);
        });
    }

    async loadNonWorkingDays() {
        try {
            const currentYear = new Date().getFullYear();
            const nextYear = currentYear + 1;
            
            // Cargar días no laborables para este año y el próximo
            const [currentYearResponse, nextYearResponse] = await Promise.all([
                api.getNonWorkingDays(currentYear),
                api.getNonWorkingDays(nextYear)
            ]);

            // Combinar y procesar las fechas bloqueadas
            const allBlockedDates = [
                ...currentYearResponse.blockedDates,
                ...nextYearResponse.blockedDates
            ];

            // Guardar datos completos para mostrar información
            this.allNonWorkingDays = allBlockedDates;

            // Llenar el Set para búsqueda rápida
            this.blockedDates.clear();
            allBlockedDates.forEach(item => {
                this.blockedDates.add(item.date);
            });

            // Actualizar el input de fecha con las restricciones
            this.updateDateInput();
            
            // Mostrar próximos días no laborables
            this.displayUpcomingNonWorkingDays();
            
            console.log(`Loaded ${this.blockedDates.size} blocked dates`);
            
        } catch (error) {
            console.error('Error loading non-working days:', error);
            // No mostrar error al usuario, solo registrar en consola
        }
    }

    updateDateInput() {
        const dateInput = document.getElementById('appointmentDate');
        if (!dateInput) return;

        // Crear lista de fechas bloqueadas para el atributo disabled
        const blockedDatesArray = Array.from(this.blockedDates);
        
        // Si el navegador soporta la API de validación personalizada
        dateInput.addEventListener('input', (e) => {
            const selectedDate = e.target.value;
            if (this.isDateBlocked(selectedDate)) {
                e.target.setCustomValidity('Esta fecha no está disponible (día no laborable)');
                showError('La fecha seleccionada no está disponible. Por favor, elije otra fecha.');
                e.target.value = ''; // Limpiar la fecha
            } else {
                e.target.setCustomValidity('');
            }
        });
    }

    isDateBlocked(dateString) {
        if (!dateString) return false;
        return this.blockedDates.has(dateString);
    }

    displayUpcomingNonWorkingDays() {
        const container = document.getElementById('upcomingNonWorkingDays');
        const infoContainer = document.getElementById('nonWorkingDaysInfo');
        
        if (!container || !infoContainer || !this.allNonWorkingDays) return;

        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        // Filtrar días no laborables próximos (próximo mes)
        const upcomingDays = this.allNonWorkingDays
            .filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= today && itemDate <= nextMonth;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5); // Mostrar máximo 5

        if (upcomingDays.length === 0) {
            infoContainer.classList.add('d-none');
            return;
        }

        // Mostrar información
        infoContainer.classList.remove('d-none');
        
        const daysList = upcomingDays.map(day => {
            const date = new Date(day.date);
            const formattedDate = date.toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short'
            });
            
            return `
                <span class="badge bg-warning text-dark me-2 mb-1">
                    ${formattedDate} - ${day.reason}
                </span>
            `;
        }).join('');
        
        container.innerHTML = daysList;
    }

    async handleSpecialtyChange() {
        const specialtyId = document.getElementById('appointmentSpecialty').value;
        const date = document.getElementById('appointmentDate').value;

        if (specialtyId && date) {
            await this.loadAvailableSlots(date, specialtyId);
        } else {
            this.clearSlots();
        }
    }

    async handleDateChange() {
        const specialtyId = document.getElementById('appointmentSpecialty').value;
        const date = document.getElementById('appointmentDate').value;
        const dateInput = document.getElementById('appointmentDate');

        // Guardar fecha y especialidad actual
        this.currentDate = date;
        this.currentSpecialtyId = specialtyId;

        // Validar que la fecha no sea pasada (pero permite el día actual)
        if (date && this.isDateInPast(date)) {
            showError('No se pueden reservar turnos en fechas pasadas. Puedes reservar desde hoy en adelante.');
            dateInput.value = '';
            this.clearSlots();
            this.stopAutoRefresh();
            return;
        }

        // Verificar si la fecha está bloqueada
        if (date && this.isDateBlocked(date)) {
            showError('La fecha seleccionada no está disponible (día no laborable). Por favor, elije otra fecha.');
            dateInput.value = '';
            this.clearSlots();
            this.stopAutoRefresh();
            return;
        }

        if (specialtyId && date) {
            // Limpiar selección anterior
            this.selectedSlot = null;
            await this.loadAvailableSlots(date, specialtyId);
            
            // Iniciar auto-refresh cada 30 segundos
            this.startAutoRefresh();
        } else {
            this.clearSlots();
            this.stopAutoRefresh();
        }
    }

    async loadAvailableSlots(date, specialtyId) {
        const container = document.getElementById('availableSlots');
        if (!container) return;

        // Mostrar indicador de carga
        container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Cargando horarios disponibles...</div>';

        try {
            const response = await api.getAvailableSlots(date, specialtyId);
            this.displayAvailableSlots(response.availableSlots);
            
        } catch (error) {
            console.error('Error loading available slots:', error);
            
            // Manejar diferentes tipos de errores con mensajes específicos
            if (error.message.includes('fechas pasadas')) {
                showError('No se pueden reservar turnos en fechas pasadas. Puedes reservar desde hoy en adelante.');
                // Limpiar la fecha inválida
                document.getElementById('appointmentDate').value = '';
            } else if (error.message.includes('no laborable')) {
                showError('La fecha seleccionada es un día no laborable. Por favor, selecciona otra fecha.');
            } else {
                showError('Error al cargar los horarios disponibles. Por favor, intenta nuevamente.');
            }
            
            this.clearSlots();
        }
    }

    displayAvailableSlots(slots, isSilentUpdate = false) {
        const container = document.getElementById('availableSlots');
        if (!container) return;

        if (!slots || slots.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay horarios disponibles para esta fecha y especialidad.</p>';
            this.updateSubmitButton(false);
            return;
        }

        // Mantener el slot seleccionado si es una actualización silenciosa
        const currentSelectedSlot = this.selectedSlot;

        container.innerHTML = '';
        
        slots.forEach(slot => {
            const slotButton = document.createElement('button');
            slotButton.type = 'button';
            slotButton.className = 'time-slot';
            slotButton.textContent = slot;
            
            // Restaurar selección si es una actualización silenciosa
            if (isSilentUpdate && slot === currentSelectedSlot) {
                slotButton.classList.add('selected');
            }
            
            slotButton.addEventListener('click', () => {
                this.selectTimeSlot(slotButton, slot);
            });
            
            container.appendChild(slotButton);
        });

        // Mostrar mensaje informativo solo en cargas iniciales
        if (!isSilentUpdate && slots.length > 0) {
            const infoMsg = document.createElement('div');
            infoMsg.className = 'alert alert-info mt-2';
            infoMsg.innerHTML = `
                <small>
                    <i class="fas fa-info-circle"></i> 
                    ${slots.length} horarios disponibles. Los horarios ocupados no se muestran.
                    <br><i class="fas fa-sync-alt"></i> Se actualizan automáticamente cada 60 segundos.
                </small>
            `;
            container.appendChild(infoMsg);
        }

        this.updateSubmitButton(currentSelectedSlot && slots.includes(currentSelectedSlot));
    }

    async selectTimeSlot(button, slot) {
        // Verificar que el slot siga disponible antes de seleccionarlo
        const date = document.getElementById('appointmentDate').value;
        const specialtyId = document.getElementById('appointmentSpecialty').value;
        
        if (date && specialtyId) {
            try {
                await this.revalidateSlot(date, specialtyId, slot);
            } catch (error) {
                showError('Este horario ya no está disponible. Refrescando...');
                setTimeout(() => {
                    this.loadAvailableSlots(date, specialtyId);
                }, 500);
                return;
            }
        }

        // Remover selección anterior
        const allSlots = document.querySelectorAll('.time-slot');
        allSlots.forEach(btn => btn.classList.remove('selected'));

        // Seleccionar nuevo slot
        button.classList.add('selected');
        this.selectedSlot = slot;
        this.updateSubmitButton(true);
    }

    updateSubmitButton(enabled) {
        const submitBtn = document.getElementById('btnSubmitAppointment');
        if (submitBtn) {
            submitBtn.disabled = !enabled;
        }
    }

    clearSlots() {
        const container = document.getElementById('availableSlots');
        if (container) {
            container.innerHTML = '<p class="text-muted">Selecciona una especialidad y fecha para ver los horarios disponibles</p>';
        }
        this.selectedSlot = null;
        this.updateSubmitButton(false);
    }

    async handleCreateAppointment(event) {
        event.preventDefault();

        if (!window.authManager.isLoggedIn()) {
            showError('Debe iniciar sesión para crear un turno');
            window.authManager.showLoginPage();
            return;
        }

        const specialtyId = document.getElementById('appointmentSpecialty').value;
        const appointmentDate = document.getElementById('appointmentDate').value;
        const notes = document.getElementById('appointmentNotes').value.trim();

        if (!specialtyId || !appointmentDate || !this.selectedSlot) {
            showError('Por favor complete todos los campos obligatorios y seleccione un horario');
            return;
        }

        const appointmentData = {
            specialtyId: parseInt(specialtyId),
            appointmentDate,
            appointmentTime: this.selectedSlot,
            notes: notes || null
        };

        try {
            // Revalidar que el slot siga disponible antes de crear el turno
            await this.revalidateSlot(appointmentDate, specialtyId, this.selectedSlot);
            
            const response = await api.createAppointment(appointmentData);
            
            showSuccess('¡Turno confirmado exitosamente! Se ha enviado un email de confirmación a tu correo.');
            
            // Limpiar formulario
            this.resetForm();
            
            // Redirigir a la página de turnos
            window.showPage('myAppointmentsPage');
            this.loadUserAppointments();
            
        } catch (error) {
            // Manejar error específico de horario ocupado
            if (error.message.includes('TIME_SLOT_TAKEN') || error.message.includes('no disponible')) {
                showError('⚠️ Este horario acaba de ser reservado por otro paciente. Refrescando horarios disponibles...');
                // Recargar slots disponibles
                setTimeout(() => {
                    this.loadAvailableSlots(appointmentDate, specialtyId);
                }, 1000);
            } else {
                showError(error.message || 'Error al crear el turno');
            }
        }
    }

    resetForm() {
        const form = document.getElementById('appointmentForm');
        if (form) {
            form.reset();
        }
        this.clearSlots();
    }

    initNewAppointment() {
        if (!window.authManager.checkPermissions()) {
            return;
        }

        this.resetForm();
        this.loadSpecialties();
        
        // Actualizar límites de fecha cada vez que se abre el formulario
        const dateInput = document.getElementById('appointmentDate');
        if (dateInput) {
            dateInput.min = getMinDate();
            dateInput.max = getMaxDateSync(); // Usar versión síncrona temporalmente
            this.initializeDateLimits(dateInput); // Actualizar de forma asíncrona
        }
    }

    async loadUserAppointments() {
        const user = window.authManager.getCurrentUser();
        if (!user) {
            showError('Usuario no autenticado');
            return;
        }

        try {
            const response = await api.getUserAppointments(user.id);
            this.displayUserAppointments(response.appointments);
        } catch (error) {
            console.error('Error loading user appointments:', error);
            showError('Error al cargar sus turnos');
        }
    }

    displayUserAppointments(appointments) {
        const container = document.getElementById('appointmentsList');
        if (!container) return;

        if (!appointments || appointments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h4>No tienes turnos programados</h4>
                    <p>¿Te gustaría programar tu primer turno?</p>
                    <button class="btn btn-primary" onclick="window.showPage('appointmentPage'); window.appointmentsManager.initNewAppointment();">
                        <i class="fas fa-plus"></i> Crear Turno
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        
        // Agrupar turnos por estado
        const groupedAppointments = this.groupAppointmentsByStatus(appointments);
        
        // Mostrar turnos próximos primero
        const statusOrder = ['confirmed', 'cancelled', 'completed', 'no_show'];
        
        statusOrder.forEach(status => {
            if (groupedAppointments[status] && groupedAppointments[status].length > 0) {
                let appointmentsToShow = groupedAppointments[status];
                
                // Limitar turnos cancelados a solo los últimos 3
                if (status === 'cancelled') {
                    appointmentsToShow = appointmentsToShow.slice(0, 3);
                }
                
                const section = this.createAppointmentSection(status, appointmentsToShow);
                container.appendChild(section);
            }
        });
    }

    groupAppointmentsByStatus(appointments) {
        return appointments.reduce((groups, appointment) => {
            const status = appointment.status;
            if (!groups[status]) {
                groups[status] = [];
            }
            groups[status].push(appointment);
            return groups;
        }, {});
    }

    createAppointmentSection(status, appointments) {
        const section = document.createElement('div');
        section.className = 'mb-4';
        
        const statusTitles = {
            confirmed: 'Mis Turnos Confirmados',
            cancelled: `Turnos Cancelados (${appointments.length})`, 
            completed: 'Turnos Completados',
            no_show: 'No se Presentó'
        };
        
        section.innerHTML = `
            <h5 class="mb-3">${statusTitles[status]} (${appointments.length})</h5>
            <div class="row">
                ${appointments.map(appointment => this.createAppointmentCard(appointment)).join('')}
            </div>
        `;
        
        return section;
    }

    createAppointmentCard(appointment) {
        const canCancel = appointment.status === 'confirmed';
        const appointmentDate = new Date(appointment.appointment_date);
        const now = new Date();
        const isUpcoming = appointmentDate >= now;
        
        let cardClass = `status-${appointment.status}`;
        if (appointment.status === 'cancelled' && appointment.cancelled_by_admin) {
            cardClass += ' cancelled-by-admin';
        }
        
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card appointment-card ${cardClass} shadow-hover">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${appointment.specialty_name}</h6>
                            ${getStatusBadge(appointment.status, appointment.cancelled_by_admin)}
                        </div>
                        <p class="card-text">
                            <i class="fas fa-calendar-alt text-muted"></i> 
                            ${formatDateTime(appointment.appointment_date, appointment.appointment_time)}
                        </p>
                        <p class="card-text">
                            <i class="fas fa-clock text-muted"></i> 
                            Duración: ${appointment.duration_minutes} minutos
                        </p>
                        <p class="card-text">
                            <i class="fas fa-dollar-sign text-muted"></i> 
                            Precio: $${appointment.price}
                        </p>
                        ${appointment.notes ? `
                            <p class="card-text">
                                <i class="fas fa-sticky-note text-muted"></i> 
                                ${appointment.notes}
                            </p>
                        ` : ''}
                        ${canCancel && isUpcoming ? `
                            <div class="text-end">
                                <button class="btn btn-outline-danger btn-sm" 
                                        onclick="window.appointmentsManager.cancelAppointment(${appointment.id})">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    async cancelAppointment(appointmentId) {
        if (!confirm('¿Está seguro que desea cancelar este turno?')) {
            return;
        }

        try {
            await api.cancelAppointment(appointmentId);
            showSuccess('Turno cancelado exitosamente');
            this.loadUserAppointments();
        } catch (error) {
            showError(error.message || 'Error al cancelar el turno');
        }
    }

    async revalidateSlot(date, specialtyId, selectedSlot) {
        try {
            const response = await api.getAvailableSlots(date, specialtyId);
            const availableSlots = response.availableSlots;
            
            if (!availableSlots.includes(selectedSlot)) {
                throw new Error('Slot no disponible');
            }
            
            return true;
        } catch (error) {
            throw new Error('El horario seleccionado ya no está disponible');
        }
    }

    startAutoRefresh() {
        this.stopAutoRefresh(); // Limpiar cualquier interval existente
        
        this.refreshInterval = setInterval(async () => {
            if (this.currentDate && this.currentSpecialtyId) {
                try {
                    const response = await api.getAvailableSlots(this.currentDate, this.currentSpecialtyId);
                    const newSlots = response.availableSlots;
                    
                    // Verificar si el slot seleccionado sigue disponible
                    if (this.selectedSlot && !newSlots.includes(this.selectedSlot)) {
                        showError('⚠️ El horario seleccionado ya no está disponible. Se ha actualizado la lista.');
                        this.selectedSlot = null;
                        this.updateSubmitButton(false);
                    }
                    
                    // Actualizar slots silenciosamente
                    this.displayAvailableSlots(newSlots, true);
                    
                } catch (error) {
                    console.error('Error en auto-refresh:', error);
                }
            }
        }, 60000); // Cada 60 segundos
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    isDateInPast(dateString) {
        const selectedDate = new Date(dateString + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Permitir turnos para el día actual y fechas futuras
        // Solo bloquear días anteriores a hoy
        return selectedDate.getTime() < today.getTime();
    }

    validateDateInput() {
        const dateInput = document.getElementById('appointmentDate');
        const date = dateInput.value;
        
        if (date) {
            // Actualizar los límites por si cambió la fecha
            dateInput.min = getMinDate();
            dateInput.max = getMaxDateSync(); // Usar versión síncrona para validación inmediata
            
            // Validar que no sea fecha pasada (pero permite el día actual)
            if (this.isDateInPast(date)) {
                dateInput.setCustomValidity('No se pueden reservar turnos en fechas pasadas. Puedes reservar desde hoy en adelante.');
                dateInput.reportValidity();
                return false;
            } else {
                dateInput.setCustomValidity('');
                return true;
            }
        }
        
        return true;
    }

    async updateDateHelperText() {
        const helperText = document.getElementById('dateHelperText');
        if (helperText) {
            try {
                const today = new Date().toLocaleDateString('es-AR');
                const config = await getServerConfig();
                const daysFromToday = config.maxBookingDays || 365;
                
                const maxDate = new Date();
                maxDate.setDate(maxDate.getDate() + daysFromToday);
                const maxDateFormatted = maxDate.toLocaleDateString('es-AR');
                
                helperText.innerHTML = `
                    <i class="fas fa-calendar-check text-success"></i> 
                    Puedes reservar desde hoy (${today}) hasta ${maxDateFormatted} (${daysFromToday} días). Las fechas no laborables no aparecerán disponibles.
                `;
            } catch (error) {
                // Fallback en caso de error
                const today = new Date().toLocaleDateString('es-AR');
                const maxDate = new Date();
                maxDate.setDate(maxDate.getDate() + 365);
                const maxDateFormatted = maxDate.toLocaleDateString('es-AR');
                
                helperText.innerHTML = `
                    <i class="fas fa-calendar-check text-success"></i> 
                    Puedes reservar desde hoy (${today}) hasta ${maxDateFormatted}. Las fechas no laborables no aparecerán disponibles.
                `;
            }
        }
    }
}

// Crear instancia global
window.appointmentsManager = new AppointmentsManager();