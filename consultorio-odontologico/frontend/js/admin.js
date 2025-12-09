// Panel de Administración
class AdminManager {
    constructor() {
        this.currentView = 'dashboard';
        this.appointments = [];
        this.users = [];
        // Paginación
        this.appointmentsPagination = {
            currentPage: 1,
            itemsPerPage: 10,
            totalItems: 0,
            totalPages: 0
        };
        this.usersPagination = {
            currentPage: 1,
            itemsPerPage: 10,
            totalItems: 0,
            totalPages: 0
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    // Funciones utilitarias
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    getStatusBadgeClass(status, cancelledByAdmin = false) {
        const statusMap = {
            'confirmed': 'success', 
            'cancelled': cancelledByAdmin ? 'warning' : 'danger',
            'completed': 'info',
            'no_show': 'secondary'
        };
        return statusMap[status] || 'secondary';
    }

    getStatusText(status, cancelledByAdmin = false) {
        const statusMap = {
            'confirmed': 'Confirmado',
            'cancelled': cancelledByAdmin ? 'Cancelado por Consultorio' : 'Cancelado', 
            'completed': 'Completado',
            'no_show': 'No asistió'
        };
        return statusMap[status] || status;
    }

    setupEventListeners() {
        
    }

    async loadDashboard() {
        if (!window.authManager.checkPermissions('admin')) {
            return;
        }

        try {
            const response = await api.getAdminDashboard();
            this.displayDashboard(response.dashboard);
        } catch (error) {
            console.error('Error loading admin dashboard:', error);
            
           
            if (error.message.includes('token') || error.message.includes('autenticación')) {
                showError('Sesión expirada. Por favor, inicie sesión nuevamente como administrador.');
                
                setTimeout(() => {
                    if (window.showPage) {
                        window.showPage('loginPage');
                    }
                }, 2000);
            } else {
                showError('Error al cargar el panel de administración: ' + error.message);
            }
        }
    }

    displayDashboard(dashboard) {
        const container = document.getElementById('adminContent');
        if (!container) return;

        container.innerHTML = `
            <div class="row mb-4">
                <!-- Navigation tabs -->
                <div class="col-12">
                    <ul class="nav nav-pills mb-4" id="adminTabs">
                        <li class="nav-item">
                            <button class="nav-link active" data-view="dashboard">
                                <i class="fas fa-tachometer-alt"></i> Dashboard
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" data-view="appointments">
                                <i class="fas fa-list"></i> Turnos
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" data-view="calendar">
                                <i class="fas fa-calendar-alt"></i> Calendario
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" data-view="users">
                                <i class="fas fa-users"></i> Pacientes
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" data-view="reports">
                                <i class="fas fa-chart-bar"></i> Reportes
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" data-view="schedule-management">
                                <i class="fas fa-calendar-times"></i> Días No Laborables
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" data-view="email-reminders">
                                <i class="fas fa-envelope-open-text"></i> Recordatorios
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            <div id="adminViewContent">
                ${this.createDashboardView(dashboard)}
            </div>
        `;

        this.setupAdminNavigation();
    }

    createDashboardView(dashboard) {
        return `
            <!-- Stats Cards -->
            <div class="row mb-4">
                <div class="col-md-2 col-sm-6 mb-3">
                    <div class="card admin-card stats-card">
                        <div class="card-body text-center">
                            <div class="stats-number">${dashboard.today.total_today}</div>
                            <div class="stats-label">Turnos Hoy</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-2 col-sm-6 mb-3">
                    <div class="card admin-card bg-success text-white">
                        <div class="card-body text-center">
                            <div class="stats-number">${dashboard.general.total_patients || 0}</div>
                            <div class="stats-label">Pacientes</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-2 col-sm-6 mb-3">
                    <div class="card admin-card bg-warning text-dark">
                        <div class="card-body text-center">
                            <div class="stats-number">${dashboard.general.confirmed_appointments || 0}</div>
                            <div class="stats-label">Confirmados</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="card admin-card bg-info text-white">
                        <div class="card-body text-center">
                            <div class="stats-number">$${dashboard.revenue.monthly_revenue || 0}</div>
                            <div class="stats-label">Este Mes</div>
                            <div><small>${dashboard.revenue.monthly_appointments || 0} completados</small></div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="card admin-card bg-primary text-white">
                        <div class="card-body text-center">
                            <div class="stats-number" id="totalAccumulatedRevenue">$0</div>
                            <div class="stats-label">Total Acumulado</div>
                            <div><small>Ingresos totales</small></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Today's Summary -->
            <div class="row mb-4">
                <div class="col-lg-8">
                    <div class="card admin-card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="fas fa-calendar-day"></i> Resumen de Hoy</h5>
                        </div>
                        <div class="card-body">
                            <div class="row text-center">
                                <div class="col">
                                    <h4 class="text-primary">${dashboard.today.total_today || 0}</h4>
                                    <small>Total Hoy</small>
                                </div>
                                <div class="col">
                                    <h4 class="text-success">${dashboard.today.confirmed_today || 0}</h4>
                                    <small>Confirmados</small>
                                </div>
                                <div class="col">
                                    <h4 class="text-secondary">${dashboard.today.completed_today || 0}</h4>
                                    <small>Completados</small>
                                </div>
                                <div class="col">
                                    <h4 class="text-danger">${dashboard.today.cancelled_today || 0}</h4>
                                    <small>Cancelados</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card admin-card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="fas fa-info-circle"></i> Información</h5>
                        </div>
                        <div class="card-body">
                            <p><strong>Especialidades:</strong> ${dashboard.general.active_specialties}</p>
                            <p><strong>Turnos Futuros:</strong> ${dashboard.general.future_appointments}</p>
                            <p><strong>Turnos del Mes:</strong> ${dashboard.revenue.monthly_appointments}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Upcoming Appointments -->
            <div class="row">
                <div class="col-12">
                    <div class="card admin-card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="fas fa-clock"></i> Próximos Turnos</h5>
                        </div>
                        <div class="card-body">
                            ${this.createUpcomingAppointmentsTable(dashboard.upcomingAppointments)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createUpcomingAppointmentsTable(appointments) {
        if (!appointments || appointments.length === 0) {
            return '<p class="text-muted text-center">No hay turnos próximos</p>';
        }

        // Mostrar solo los primeros 10 turnos
        const limitedAppointments = appointments.slice(0, 10);

        return `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>Paciente</th>
                            <th>Especialidad</th>
                            <th>Estado</th>
                            <th>Teléfono</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${limitedAppointments.map(apt => `
                            <tr>
                                <td>${formatDate(apt.appointment_date)}</td>
                                <td>${formatTime(apt.appointment_time)}</td>
                                <td>${apt.patient_name}</td>
                                <td>${apt.specialty_name}</td>
                                <td>${getStatusBadge(apt.status)}</td>
                                <td>${apt.patient_phone}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary" 
                                            onclick="window.adminManager.showAppointmentDetails(${apt.id})">
                                        Ver
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${appointments.length > 10 ? `
                    <div class="text-center mt-2">
                        <small class="text-muted">
                            Mostrando 10 de ${appointments.length} turnos próximos. 
                            <a href="#" onclick="window.adminManager.showView('appointments'); return false;" class="text-primary">Ver todos los turnos</a>
                        </small>
                    </div>
                ` : ''}
            </div>
        `;
    }

    setupAdminNavigation() {
        const tabs = document.querySelectorAll('#adminTabs .nav-link');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Load view
                const view = tab.getAttribute('data-view');
                this.loadAdminView(view);
            });
        });
    }



    createAppointmentsView(appointments) {
        return `
            <div class="card admin-card">
                <div class="card-header">
                    <h5 class="mb-3"><i class="fas fa-calendar"></i> Gestión de Turnos</h5>
                    <!-- Sub-navegación de turnos -->
                    <ul class="nav nav-tabs" id="appointmentsTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="list-tab" data-bs-toggle="tab" 
                                    data-bs-target="#list-pane" type="button" role="tab">
                                <i class="fas fa-list"></i> Lista de Turnos
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="create-tab" data-bs-toggle="tab" 
                                    data-bs-target="#create-pane" type="button" role="tab">
                                <i class="fas fa-plus"></i> Crear Turno
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="manage-tab" data-bs-toggle="tab" 
                                    data-bs-target="#manage-pane" type="button" role="tab">
                                <i class="fas fa-edit"></i> Editar/Eliminar
                            </button>
                        </li>
                    </ul>
                </div>
                <div class="card-body">
                    <div class="tab-content" id="appointmentsTabsContent">
                        <!-- Pestaña Lista de Turnos -->
                        <div class="tab-pane fade show active" id="list-pane" role="tabpanel">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h6 class="mb-0">Turnos Registrados</h6>
                                <div class="d-flex align-items-center">
                                    <input type="date" class="form-control" style="width: 160px;" 
                                           id="appointmentDateFilter" placeholder="Filtrar por fecha">
                                    <select class="form-select ms-2" style="width: 160px;" id="appointmentStatusFilter">
                                        <option value="">Todos los estados</option>
                                        <option value="confirmed">Confirmado</option>
                                        <option value="cancelled">Cancelado</option>
                                        <option value="completed">Completado</option>
                                        <option value="no_show">No se presentó</option>
                                    </select>
                                    <button type="button" class="btn btn-outline-secondary btn-sm ms-2" 
                                            id="clearAppointmentFilters" title="Limpiar filtros">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Fecha</th>
                                            <th>Hora</th>
                                            <th>Paciente</th>
                                            <th>Especialidad</th>
                                            <th>Estado</th>
                                            <th>Precio</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="appointmentsTableBody">
                                        ${this.getPaginatedAppointments(appointments).map(apt => this.createAppointmentRow(apt)).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ${this.createPaginationControls('appointments')}
                        </div>

                        <!-- Pestaña Crear Turno -->
                        <div class="tab-pane fade" id="create-pane" role="tabpanel">
                            <h6 class="mb-3">Crear Nuevo Turno</h6>
                            <form id="createAppointmentForm">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Paciente</label>
                                        <select class="form-select" id="createPatientSelect" required>
                                            <option value="">Selecciona un paciente</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Especialidad</label>
                                        <select class="form-select" id="createSpecialtySelect" required>
                                            <option value="">Selecciona una especialidad</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Fecha</label>
                                        <input type="date" class="form-control" id="createAppointmentDate" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Hora</label>
                                        <input type="time" class="form-control" id="createAppointmentTime" required>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Estado</label>
                                        <select class="form-select" id="createAppointmentStatus" required>
                                            <option value="confirmed">Confirmado</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Notas (opcional)</label>
                                    <textarea class="form-control" id="createAppointmentNotes" rows="3"></textarea>
                                </div>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Crear Turno
                                </button>
                            </form>
                        </div>

                        <!-- Pestaña Editar/Eliminar -->
                        <div class="tab-pane fade" id="manage-pane" role="tabpanel">
                            <h6 class="mb-3">Editar o Eliminar Turnos</h6>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Buscar Turno por ID</label>
                                    <div class="input-group">
                                        <input type="number" class="form-control" id="searchAppointmentId" placeholder="ID del turno">
                                        <button class="btn btn-primary" type="button" id="searchAppointmentBtn">
                                            <i class="fas fa-search"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div id="editAppointmentSection" style="display: none;">
                                <hr>
                                <h6>Editar Turno</h6>
                                <form id="editAppointmentForm">
                                    <input type="hidden" id="editAppointmentId">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Paciente</label>
                                            <select class="form-select" id="editPatientSelect" required>
                                                <option value="">Selecciona un paciente</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Especialidad</label>
                                            <select class="form-select" id="editSpecialtySelect" required>
                                                <option value="">Selecciona una especialidad</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Fecha</label>
                                            <input type="date" class="form-control" id="editAppointmentDate" required>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Hora</label>
                                            <input type="time" class="form-control" id="editAppointmentTime" required>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Estado</label>
                                            <select class="form-select" id="editAppointmentStatus" required>
                                                <option value="confirmed">Confirmado</option>
                                                <option value="cancelled">Cancelado</option>
                                                <option value="completed">Completado</option>
                                                <option value="no_show">No se presentó</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Notas</label>
                                        <textarea class="form-control" id="editAppointmentNotes" rows="3"></textarea>
                                    </div>
                                    <div class="d-flex gap-2">
                                        <button type="submit" class="btn btn-success">
                                            <i class="fas fa-save"></i> Guardar Cambios
                                        </button>
                                        <button type="button" class="btn btn-danger" id="deleteAppointmentBtn">
                                            <i class="fas fa-trash"></i> Eliminar Turno
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createAppointmentRow(appointment) {
        return `
            <tr>
                <td>${appointment.id}</td>
                <td>${this.formatDate(appointment.appointment_date)}</td>
                <td>${this.formatTime(appointment.appointment_time)}</td>
                <td>${appointment.patient_name}</td>
                <td>${appointment.specialty_name}</td>
                <td>
                    <span class="badge bg-${this.getStatusBadgeClass(appointment.status, appointment.cancelled_by_admin)}">
                        ${this.getStatusText(appointment.status, appointment.cancelled_by_admin)}
                    </span>
                </td>
                <td>$${appointment.price || 0}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="window.adminManager.showAppointmentDetails(${appointment.id})"
                                title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning" 
                                onclick="window.adminManager.loadAppointmentForEdit(${appointment.id})"
                                title="Editar turno">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" 
                                onclick="window.adminManager.updateAppointmentStatus(${appointment.id}, 'confirmed')"
                                title="Confirmar">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="window.adminManager.updateAppointmentStatus(${appointment.id}, 'completed')"
                                title="Completar">
                            <i class="fas fa-check-double"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="window.adminManager.updateAppointmentStatus(${appointment.id}, 'cancelled')"
                                title="Cancelar">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="btn btn-sm btn-info" 
                                onclick="window.adminManager.sendReminderFromList(${appointment.id})"
                                title="Enviar recordatorio">
                            <i class="fas fa-envelope"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    formatTime(timeString) {
        if (!timeString) return '-';
        return timeString.substring(0, 5); // Formato HH:MM
    }

    createUsersView(users) {
        return `
            <div class="card admin-card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0"><i class="fas fa-users"></i> Gestión de Pacientes</h5>
                    <div class="d-flex align-items-center">
                        <input type="text" class="form-control" style="width: 280px;" 
                               placeholder="Buscar por nombre, email o DNI..." id="userSearchInput">
                        <button type="button" class="btn btn-outline-secondary btn-sm ms-2" 
                                id="clearUserSearch" title="Limpiar búsqueda">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    <th>Email</th>
                                    <th>DNI</th>
                                    <th>Teléfono</th>
                                    <th>Turnos</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="usersTableBody">
                                ${this.getPaginatedUsers(users).map(user => this.createUserRow(user)).join('')}
                            </tbody>
                        </table>
                    </div>
                    ${this.createPaginationControls('users')}
                </div>
            </div>
        `;
    }

    createUserRow(user) {
        return `
            <tr>
                <td>${user.id}</td>
                <td>${user.first_name} ${user.last_name}</td>
                <td>${user.email}</td>
                <td>${user.dni}</td>
                <td>${user.phone}</td>
                <td>${user.total_appointments}</td>
                <td>
                    <span class="badge ${user.active ? 'bg-success' : 'bg-danger'}">
                        ${user.active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-info me-2" 
                            onclick="window.adminManager.showUserHistory(${user.id}, '${user.first_name} ${user.last_name}')"
                            title="Ver historial de turnos">
                        <i class="fas fa-history"></i>
                        Historial
                    </button>
                    <button class="btn btn-sm btn-outline-${user.active ? 'danger' : 'success'}" 
                            onclick="window.adminManager.toggleUserStatus(${user.id})">
                        <i class="fas fa-${user.active ? 'ban' : 'check'}"></i>
                        ${user.active ? 'Desactivar' : 'Activar'}
                    </button>
                </td>
            </tr>
        `;
    }

    // Funciones para búsqueda de usuarios
    setupUsersSearch() {
        const searchInput = document.getElementById('userSearchInput');
        if (searchInput) {
            // Búsqueda en tiempo real con debounce
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchUsers(e.target.value);
                }, 300); // 300ms de retraso para evitar búsquedas excesivas
            });
        }

        // Botón para limpiar búsqueda
        const clearSearchBtn = document.getElementById('clearUserSearch');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => this.clearUserSearch());
        }
    }

    clearUserSearch() {
        const searchInput = document.getElementById('userSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Mostrar todos los usuarios
        this.updateUsersTable(this.users);
        
        // Mensaje de confirmación
        showSuccess('Búsqueda limpiada correctamente');
    }

    searchUsers(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            // Si no hay término de búsqueda, mostrar todos los usuarios
            this.updateUsersTable(this.users);
            return;
        }

        const term = searchTerm.toLowerCase().trim();
        
        // Filtrar usuarios por nombre, email o DNI
        const filteredUsers = this.users.filter(user => {
            const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
            const email = user.email.toLowerCase();
            const dni = user.dni.toString();
            
            return fullName.includes(term) || 
                   email.includes(term) || 
                   dni.includes(term);
        });

        // Actualizar la tabla con los resultados filtrados
        this.updateUsersTable(filteredUsers);
    }

    updateUsersTable(users) {
        // Resetear paginación para los resultados filtrados
        this.usersPagination.currentPage = 1;
        
        // Actualizar el cuerpo de la tabla
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            // Temporalmente guardar users originales
            const originalUsers = this.users;
            this.users = users;
            
            // Actualizar tabla con datos filtrados
            tbody.innerHTML = this.getPaginatedUsers(users).map(user => this.createUserRow(user)).join('');
            
            // Actualizar controles de paginación
            const tableContainer = tbody.closest('.card-body');
            const paginationContainer = tableContainer.lastElementChild;
            if (paginationContainer && paginationContainer.classList.contains('d-flex')) {
                paginationContainer.outerHTML = this.createPaginationControls('users');
            }
            
            // Restaurar users originales
            this.users = originalUsers;
        }

        // Mostrar mensaje si no hay resultados
        if (users.length === 0) {
            const tbody = document.getElementById('usersTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center text-muted py-4">
                            <i class="fas fa-search fa-2x mb-2"></i><br>
                            No se encontraron pacientes que coincidan con la búsqueda
                        </td>
                    </tr>
                `;
            }
        }
    }

    createReportsView() {
        return `
            <!-- Gráficos principales -->
            <div class="row mb-4 justify-content-center">
                <div class="col-lg-6 mb-4">
                    <div class="card admin-card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="fas fa-stethoscope"></i> Especialidades Más Solicitadas</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="specialtiesChart" height="300"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6 mb-4">
                    <div class="card admin-card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="fas fa-calendar-alt"></i> Turnos por Día de la Semana</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="weeklyChart" height="300"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async updateAppointmentStatus(appointmentId, status) {
        try {
            await api.updateAppointmentStatus(appointmentId, status);
            showSuccess('Estado del turno actualizado exitosamente');
            this.loadAdminView('appointments');
        } catch (error) {
            showError(error.message || 'Error al actualizar el estado del turno');
        }
    }

    async toggleUserStatus(userId) {
        try {
            await api.toggleUserStatus(userId);
            showSuccess('Estado del usuario actualizado exitosamente');
            this.loadAdminView('users');
        } catch (error) {
            showError(error.message || 'Error al actualizar el estado del usuario');
        }
    }

    async showUserHistory(userId, userName) {
        try {
            showLoading(true);
            const response = await api.makeRequest(`/admin/usuarios/${userId}/citas`);
            const appointments = response.appointments || [];
            
            // Crear modal con el historial (solo últimos 3)
            this.showUserHistoryModal(userName, appointments, userId);
            
        } catch (error) {
            showError(error.message || 'Error al cargar el historial del paciente');
        } finally {
            showLoading(false);
        }
    }

    async showAllUserHistory(userId, userName) {
        try {
            showLoading(true);
            const response = await api.makeRequest(`/admin/usuarios/${userId}/citas/todas`);
            const appointments = response.appointments || [];
            
            // Crear modal con todos los turnos
            this.showUserHistoryModal(userName, appointments, userId, true);
            
        } catch (error) {
            showError(error.message || 'Error al cargar el historial completo del paciente');
        } finally {
            showLoading(false);
        }
    }

    showUserHistoryModal(userName, appointments, userId, showingAll = false) {
        // Limpiar modales existentes completamente
        cleanupModals();
        
        // Cerrar modal existente si hay uno abierto
        const existingModal = document.getElementById('userHistoryModal');
        if (existingModal) {
            const existingInstance = bootstrap.Modal.getInstance(existingModal);
            if (existingInstance) {
                existingInstance.dispose();
            }
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'userHistoryModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-history"></i> 
                            Historial ${showingAll ? 'Completo' : 'Reciente'} - ${userName}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${appointments.length > 0 ? `
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Hora</th>
                                            <th>Especialidad</th>
                                            <th>Estado</th>
                                            <th>Notas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${appointments.map(appointment => `
                                            <tr>
                                                <td>${new Date(appointment.appointment_date).toLocaleDateString('es-ES')}</td>
                                                <td>${appointment.appointment_time}</td>
                                                <td>${appointment.specialty_name}</td>
                                                <td>
                                                    <span class="badge bg-${this.getStatusBadgeClass(appointment.status, appointment.cancelled_by_admin)}">
                                                        ${this.getStatusText(appointment.status, appointment.cancelled_by_admin)}
                                                    </span>
                                                </td>
                                                <td>${appointment.notes || '-'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <div class="mt-3 d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>Total: ${appointments.length} turnos</strong>
                                    ${!showingAll && appointments.length === 3 ? '<small class="text-muted d-block">Solo los 3 turnos más recientes</small>' : ''}
                                    ${showingAll ? '<small class="text-success d-block">Mostrando historial completo</small>' : ''}
                                </div>
                                ${!showingAll && appointments.length === 3 ? `
                                    <button class="btn btn-outline-primary btn-sm" 
                                            onclick="window.adminManager.showAllUserHistory(${userId}, '${userName}')"
                                            id="viewAllHistoryBtn">
                                        <i class="fas fa-list"></i> Ver todos
                                    </button>
                                ` : ''}
                                ${showingAll ? `
                                    <button class="btn btn-outline-secondary btn-sm" 
                                            onclick="window.adminManager.showUserHistory(${userId}, '${userName}')"
                                            id="viewRecentHistoryBtn">
                                        <i class="fas fa-compress"></i> Ver recientes
                                    </button>
                                ` : ''}
                            </div>
                        ` : `
                            <div class="text-center py-4">
                                <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                                <p class="text-muted">Este paciente no tiene turnos registrados.</p>
                            </div>
                        `}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const modalInstance = new bootstrap.Modal(modal, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
        modalInstance.show();
        
        
        modal.addEventListener('hidden.bs.modal', () => {
            
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            
            // Restaurar scroll del body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            
            // Remover el modal
            modal.remove();
        });

       
        const closeButtons = modal.querySelectorAll('[data-bs-dismiss="modal"]');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                modalInstance.hide();
            });
        });
    }

    showAppointmentDetails(appointmentId) {
        // Implementar modal con detalles del turno
        showSuccess(`Ver detalles del turno ${appointmentId} - Funcionalidad pendiente`);
    }

    // ========== CRUD DE TURNOS ==========
    
    createCRUDAppointmentsView() {
        return `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-0">
                            <i class="fas fa-edit"></i> Gestión de Turnos
                        </h5>
                        <small class="text-muted">
                            <i class="fas fa-sort-numeric-down"></i> Ordenado por turnos más recientes • Mostrando últimos 12
                        </small>
                    </div>
                    <button class="btn btn-success" onclick="adminManager.showCreateAppointmentModal()">
                        <i class="fas fa-plus"></i> Nuevo Turno
                    </button>
                </div>
                <div class="card-body">
                    <!-- Filtros -->
                    <div class="row mb-3">
                        <div class="col-md-3">
                            <input type="date" class="form-control" id="crudDateFilter" placeholder="Fecha">
                        </div>
                        <div class="col-md-3">
                            <select class="form-select" id="crudStatusFilter">
                                <option value="">Todos los estados</option>
                                <option value="confirmed">Confirmado</option>
                                <option value="cancelled">Cancelado</option>
                                <option value="completed">Completado</option>
                                <option value="no_show">No asistió</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <input type="text" class="form-control" id="crudPatientFilter" placeholder="Buscar paciente...">
                        </div>
                        <div class="col-md-2">
                            <button class="btn btn-primary" onclick="adminManager.filterCRUDAppointments()">
                                <i class="fas fa-search"></i> Filtrar
                            </button>
                        </div>
                    </div>
                    
                    <!-- Tabla de turnos -->
                    <div id="crudAppointmentsTable">
                        <!-- Contenido cargado dinámicamente -->
                    </div>
                </div>
            </div>
        `;
    }

    async loadCRUDAppointmentsView() {
        const container = document.getElementById('adminViewContent');
        container.innerHTML = this.createCRUDAppointmentsView();
        await this.loadCRUDAppointments();
    }

    async loadCRUDAppointments(page = 1) {
        try {
            showLoading(true);
            
            
            const filters = {
                date: document.getElementById('crudDateFilter')?.value || '',
                status: document.getElementById('crudStatusFilter')?.value || '',
                patient: document.getElementById('crudPatientFilter')?.value || '',
                limit: 12,
                offset: (page - 1) * 12
            };

            const response = await api.getAdminAppointments(filters);
            this.displayCRUDAppointments(response.appointments, response.pagination, page);
            
        } catch (error) {
            console.error('Error loading CRUD appointments:', error);
            showError('Error al cargar los turnos');
        } finally {
            showLoading(false);
        }
    }

    displayCRUDAppointments(appointments, pagination, currentPage = 1) {
        const container = document.getElementById('crudAppointmentsTable');
        
        if (!appointments || appointments.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> No se encontraron turnos.
                </div>
            `;
            return;
        }

        const table = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>Paciente</th>
                            <th>Especialidad</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appointments.map(apt => `
                            <tr>
                                <td><span class="badge bg-secondary">${apt.id}</span></td>
                                <td>${this.formatDate(apt.appointment_date)}</td>
                                <td>${apt.appointment_time}</td>
                                <td>
                                    <strong>${apt.patient_name}</strong><br>
                                    <small class="text-muted">${apt.patient_email}</small>
                                </td>
                                <td>
                                    ${apt.specialty_name}<br>
                                    <small class="text-muted">${apt.duration_minutes} min - $${apt.price}</small>
                                </td>
                                <td>
                                    <span class="badge bg-${this.getStatusBadgeClass(apt.status)}">
                                        ${this.getStatusText(apt.status)}
                                    </span>
                                </td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-primary" onclick="adminManager.editAppointment(${apt.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-outline-danger" onclick="adminManager.deleteAppointment(${apt.id})" title="Eliminar">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Agregar controles de paginación si es necesario
        let paginationControls = '';
        if (pagination && pagination.total > 12) {
            const totalPages = Math.ceil(pagination.total / 12);
            const showPrevious = currentPage > 1;
            const showNext = currentPage < totalPages;
            
            paginationControls = `
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <div class="text-muted">
                        Mostrando ${pagination.offset + 1}-${Math.min(pagination.offset + pagination.limit, pagination.total)} de ${pagination.total} turnos
                    </div>
                    <nav>
                        <ul class="pagination mb-0">
                            <li class="page-item ${!showPrevious ? 'disabled' : ''}">
                                <button class="page-link" onclick="adminManager.loadCRUDAppointments(${currentPage - 1})" ${!showPrevious ? 'disabled' : ''}>
                                    <i class="fas fa-chevron-left"></i> Anterior
                                </button>
                            </li>
                            
                            ${Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                
                                return `
                                    <li class="page-item ${pageNum === currentPage ? 'active' : ''}">
                                        <button class="page-link" onclick="adminManager.loadCRUDAppointments(${pageNum})">
                                            ${pageNum}
                                        </button>
                                    </li>
                                `;
                            }).join('')}
                            
                            <li class="page-item ${!showNext ? 'disabled' : ''}">
                                <button class="page-link" onclick="adminManager.loadCRUDAppointments(${currentPage + 1})" ${!showNext ? 'disabled' : ''}>
                                    Siguiente <i class="fas fa-chevron-right"></i>
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            `;
        }
        
        container.innerHTML = table + paginationControls;
    }

    async filterCRUDAppointments() {
        await this.loadCRUDAppointments(1); // Reiniciar a la página 1 al filtrar
    }

    showCreateAppointmentModal() {
        // Implementar modal para crear turno
        showSuccess('Modal de crear turno - Implementar');
    }

    async editAppointment(appointmentId) {
        // Implementar modal para editar turno
        showSuccess(`Editar turno ${appointmentId} - Implementar`);
    }

    async deleteAppointment(appointmentId) {
        if (!confirm('¿Está seguro de que desea eliminar este turno?')) {
            return;
        }

        try {
            showLoading(true);
            await api.makeRequest(`/admin/citas/${appointmentId}`, {
                method: 'DELETE'
            });
            showSuccess('Turno eliminado exitosamente');
            await this.loadCRUDAppointments();
        } catch (error) {
            showError(error.message || 'Error al eliminar el turno');
        } finally {
            showLoading(false);
        }
    }

    // ========== GESTIÓN DE DÍAS NO LABORABLES ==========

    createScheduleManagementView() {
        return `
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-ban"></i> Bloquear Día Específico
                            </h5>
                        </div>
                        <div class="card-body">
                            <form id="blockSingleDayForm">
                                <div class="mb-3">
                                    <label class="form-label">Fecha</label>
                                    <input type="date" class="form-control" id="blockSingleDate" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Motivo</label>
                                    <input type="text" class="form-control" id="blockSingleReason" placeholder="Ej: Feriado, Enfermedad" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Descripción (opcional)</label>
                                    <textarea class="form-control" id="blockSingleDescription" rows="3" placeholder="Detalles adicionales..."></textarea>
                                </div>
                                <button type="submit" class="btn btn-warning">
                                    <i class="fas fa-ban"></i> Bloquear Día
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-calendar-times"></i> Bloquear Período
                            </h5>
                        </div>
                        <div class="card-body">
                            <form id="blockRangeForm">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Fecha Inicio</label>
                                        <input type="date" class="form-control" id="blockRangeStart" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Fecha Fin</label>
                                        <input type="date" class="form-control" id="blockRangeEnd" required>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Motivo</label>
                                    <input type="text" class="form-control" id="blockRangeReason" placeholder="Ej: Vacaciones, Congreso" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Descripción (opcional)</label>
                                    <textarea class="form-control" id="blockRangeDescription" rows="3" placeholder="Detalles adicionales..."></textarea>
                                </div>
                                <button type="submit" class="btn btn-danger">
                                    <i class="fas fa-calendar-times"></i> Bloquear Período
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-list"></i> Días y Períodos Bloqueados
                            </h5>
                        </div>
                        <div class="card-body">
                            <div id="nonWorkingDaysList">
                                <!-- Contenido cargado dinámicamente -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadScheduleManagementView() {
        const container = document.getElementById('adminViewContent');
        container.innerHTML = this.createScheduleManagementView();
        
        // Configurar event listeners
        this.setupScheduleManagementEvents();
        
        // Cargar días no laborables existentes
        await this.loadNonWorkingDays();
    }

    setupScheduleManagementEvents() {
        // Form para bloquear día único
        document.getElementById('blockSingleDayForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.blockSingleDay();
        });

        // Form para bloquear período
        document.getElementById('blockRangeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.blockDateRange();
        });
    }

    async blockSingleDay() {
        try {
            showLoading(true);
            
            const date = document.getElementById('blockSingleDate').value;
            const reason = document.getElementById('blockSingleReason').value;
            const description = document.getElementById('blockSingleDescription').value;

            const response = await api.makeRequest('/admin/dias-no-laborables/individual', {
                method: 'POST',
                body: JSON.stringify({ date, reason, description })
            });

            showSuccess(`Día bloqueado exitosamente. ${response.cancelledAppointments} turnos cancelados.`);
            
            // Limpiar formulario
            document.getElementById('blockSingleDayForm').reset();
            
            // Recargar lista
            await this.loadNonWorkingDays();
            
        } catch (error) {
            showError(error.message || 'Error al bloquear el día');
        } finally {
            showLoading(false);
        }
    }

    async blockDateRange() {
        try {
            showLoading(true);
            
            const startDate = document.getElementById('blockRangeStart').value;
            const endDate = document.getElementById('blockRangeEnd').value;
            const reason = document.getElementById('blockRangeReason').value;
            const description = document.getElementById('blockRangeDescription').value;

            const response = await api.makeRequest('/admin/dias-no-laborables/rango', {
                method: 'POST',
                body: JSON.stringify({ startDate, endDate, reason, description })
            });

            showSuccess(`Período bloqueado exitosamente. ${response.cancelledAppointments} turnos cancelados.`);
            
            // Limpiar formulario
            document.getElementById('blockRangeForm').reset();
            
            // Recargar lista
            await this.loadNonWorkingDays();
            
        } catch (error) {
            showError(error.message || 'Error al bloquear el período');
        } finally {
            showLoading(false);
        }
    }

    async loadNonWorkingDays() {
        try {
            const response = await api.makeRequest('/admin/dias-no-laborables');
            this.displayNonWorkingDays(response.nonWorkingDays);
        } catch (error) {
            console.error('Error loading non-working days:', error);
            showError('Error al cargar los días no laborables');
        }
    }

    displayNonWorkingDays(nonWorkingDays) {
        const container = document.getElementById('nonWorkingDaysList');
        
        if (!nonWorkingDays || nonWorkingDays.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> No hay días bloqueados.
                </div>
            `;
            return;
        }

        const list = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Fecha/Período</th>
                            <th>Motivo</th>
                            <th>Descripción</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${nonWorkingDays.map(item => `
                            <tr>
                                <td>
                                    ${item.date ? 
                                        this.formatDate(item.date) : 
                                        `${this.formatDate(item.start_date)} - ${this.formatDate(item.end_date)}`
                                    }
                                </td>
                                <td><strong>${item.reason}</strong></td>
                                <td>${item.description || '-'}</td>
                                <td>
                                    <button class="btn btn-outline-danger btn-sm" onclick="adminManager.unblockDay(${item.id})" title="Desbloquear">
                                        <i class="fas fa-unlock"></i> Desbloquear
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = list;
    }

    async unblockDay(id) {
        if (!confirm('¿Está seguro de que desea desbloquear este día/período?')) {
            return;
        }

        try {
            showLoading(true);
            await api.makeRequest(`/admin/dias-no-laborables/${id}`, {
                method: 'DELETE'
            });
            showSuccess('Día/período desbloqueado exitosamente');
            await this.loadNonWorkingDays();
        } catch (error) {
            showError(error.message || 'Error al desbloquear');
        } finally {
            showLoading(false);
        }
    }

    // Funciones para gráficos de reportes
    async loadReportsCharts() {
        try {
            // Cargar datos para los dos gráficos principales
            const [specialtiesData, weeklyData] = await Promise.all([
                this.getSpecialtiesData(),
                this.getWeeklyData()
            ]);

            // Crear solo los dos gráficos requeridos
            this.createSpecialtiesChart(specialtiesData);
            this.createWeeklyChart(weeklyData);
            
        } catch (error) {
            console.error('Error loading charts:', error);
            showError('Error al cargar los gráficos');
        }
    }

    async getRevenueData() {
        try {
            const response = await api.makeRequest('/admin/reportes/ingresos');
            return response.data;
        } catch (error) {
            console.error('Error getting revenue data:', error);
            return [];
        }
    }

    async getSpecialtiesData() {
        try {
            const response = await api.makeRequest('/admin/reportes/especialidades');
            return response.data;
        } catch (error) {
            console.error('Error getting specialties data:', error);
            return [];
        }
    }

    async getAppointmentStatusData() {
        try {
            const response = await api.makeRequest('/admin/reportes/estado-citas');
            return response.data;
        } catch (error) {
            console.error('Error getting appointment status data:', error);
            return [];
        }
    }

    async getWeeklyData() {
        try {
            console.log('📊 Obteniendo datos semanales...');
            
            // Verificar si estamos autenticados
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.error('❌ No hay token de autenticación');
                return this.generateSampleWeeklyData();
            }
            
            const response = await api.makeRequest('/admin/reportes/semanal');
            console.log('📊 Respuesta datos semanales:', response);
            
            // Verificar si hay datos
            if (!response || !response.data) {
                console.warn('⚠️  No se recibieron datos semanales, usando datos de ejemplo');
                return this.generateSampleWeeklyData();
            }
            
            console.log('✅ Datos semanales obtenidos:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error obteniendo datos semanales:', error.message || error);
            
            // Verificar si es un error de conexión
            if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
                console.warn('🔌 Error de conexión con el servidor, usando datos de ejemplo');
                showWarning('No se pudo conectar con el servidor. Mostrando datos de ejemplo.');
            } else if (error.message?.includes('Error interno del servidor')) {
                console.warn('🖥️ Error interno del servidor, usando datos de ejemplo');
                showWarning('Error en el servidor. Mostrando datos de ejemplo.');
            } else {
                showWarning('Error cargando datos semanales. Mostrando datos de ejemplo.');
            }
            
            return this.generateSampleWeeklyData();
        }
    }

    generateSampleWeeklyData() {
        console.log('🔄 Generando datos de ejemplo para el gráfico semanal');
        return [
            { day_name: 'Lunes', appointments: 5, completed: 4, cancelled: 1, revenue: 12500 },
            { day_name: 'Martes', appointments: 8, completed: 7, cancelled: 1, revenue: 17500 },
            { day_name: 'Miércoles', appointments: 12, completed: 10, cancelled: 2, revenue: 25000 },
            { day_name: 'Jueves', appointments: 7, completed: 6, cancelled: 1, revenue: 15000 },
            { day_name: 'Viernes', appointments: 10, completed: 9, cancelled: 1, revenue: 22500 },
            { day_name: 'Sábado', appointments: 3, completed: 3, cancelled: 0, revenue: 7500 },
            { day_name: 'Domingo', appointments: 1, completed: 1, cancelled: 0, revenue: 2500 }
        ];
    }

    async loadTotalAccumulated() {
        try {
            const response = await api.makeRequest('/admin/reportes/ingresos');
            const totalRevenue = response.data.reduce((sum, month) => sum + (parseFloat(month.revenue) || 0), 0);
            
            const totalAccumulatedEl = document.getElementById('totalAccumulatedRevenue');
            if (totalAccumulatedEl) {
                totalAccumulatedEl.textContent = `$${totalRevenue.toLocaleString()}`;
            }
        } catch (error) {
            console.error('Error loading total accumulated:', error);
        }
    }

    createEmailRemindersView() {
        return `
            <div class="row">
                <!-- Estadísticas de Recordatorios -->
                <div class="col-lg-6 mb-4">
                    <div class="card admin-card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="fas fa-chart-pie"></i> Estadísticas de Recordatorios</h5>
                        </div>
                        <div class="card-body">
                            <div id="reminderStats">
                                <div class="row text-center">
                                    <div class="col-6 mb-3">
                                        <div class="card bg-primary text-white">
                                            <div class="card-body">
                                                <h4 id="reminders24hSent">0</h4>
                                                <small>Recordatorios 24h Enviados</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-6 mb-3">
                                        <div class="card bg-warning text-dark">
                                            <div class="card-body">
                                                <h4 id="reminders2hSent">0</h4>
                                                <small>Recordatorios 2h Enviados</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-6 mb-3">
                                        <div class="card bg-info text-white">
                                            <div class="card-body">
                                                <h4 id="pending24hReminders">0</h4>
                                                <small>Pendientes 24h</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-6 mb-3">
                                        <div class="card bg-danger text-white">
                                            <div class="card-body">
                                                <h4 id="pending2hReminders">0</h4>
                                                <small>Pendientes 2h</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Enviar Recordatorio Manual -->
                <div class="col-lg-6 mb-4">
                    <div class="card admin-card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="fas fa-paper-plane"></i> Enviar Recordatorio Manual</h5>
                        </div>
                        <div class="card-body">
                            <form id="sendManualReminderForm">
                                <div class="mb-3">
                                    <label class="form-label">ID del Turno</label>
                                    <input type="number" class="form-control" id="reminderAppointmentId" 
                                           placeholder="Ingrese el ID del turno" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Tipo de Recordatorio</label>
                                    <select class="form-select" id="reminderType" required>
                                        <option value="24h">Recordatorio Normal (24 horas)</option>
                                        <option value="2h">Recordatorio Urgente (2 horas)</option>
                                    </select>
                                </div>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-envelope"></i> Enviar Recordatorio
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sistema Automático de Recordatorios -->
            <div class="row">
                <!-- Configuración Automática -->
                <div class="col-12 mb-4">
                    <div class="card admin-card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="fas fa-robot"></i> Sistema Automático de Recordatorios</h5>
                        </div>
                        <div class="card-body">
                            <div class="alert alert-success">
                                <h6><i class="fas fa-check-circle"></i> ¡Sistema Funcionando 24/7!</h6>
                                <ul class="mb-0">
                                    <li><strong>Recordatorios automáticos:</strong> Se envían sin intervención manual</li>
                                    <li><strong>24 horas antes:</strong> Para todos los turnos del día siguiente</li>
                                    <li><strong>2 horas antes:</strong> Para turnos de último momento (menos de 24h)</li>
                                    <li><strong>Verificación constante:</strong> El sistema revisa cada hora automáticamente</li>
                                </ul>
                            </div>
                            <div class="alert alert-info">
                                <h6><i class="fas fa-info-circle"></i> Información</h6>
                                <p class="mb-0">Los recordatorios se envían automáticamente. También puedes enviar recordatorios manuales usando el botón azul en cada turno.</p>
                            </div>
                        </div>
                    </div>
                </div>


            </div>
        `;
    }

    async loadEmailRemindersView() {
        const container = document.getElementById('adminViewContent');
        if (!container) return;

        container.innerHTML = this.createEmailRemindersView();
        
        // Configurar event listeners
        this.setupEmailRemindersEvents();
        
        // Cargar estadísticas
        await this.loadReminderStats();
    }

    setupEmailRemindersEvents() {
        // Event listener para enviar recordatorio manual
        const manualForm = document.getElementById('sendManualReminderForm');
        if (manualForm) {
            manualForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.sendManualReminder();
            });
        }
    }

    async loadReminderStats() {
        try {
            const response = await api.makeRequest('/admin/recordatorios/estadisticas');
            const stats = response.stats;
            
            // Actualizar elementos del DOM
            document.getElementById('reminders24hSent').textContent = stats.reminders_24h_sent;
            document.getElementById('reminders2hSent').textContent = stats.reminders_2h_sent;
            document.getElementById('pending24hReminders').textContent = stats.pending_24h_reminders;
            document.getElementById('pending2hReminders').textContent = stats.pending_2h_reminders;
            
        } catch (error) {
            console.error('Error loading reminder stats:', error);
            showError('Error al cargar estadísticas de recordatorios');
        }
    }

    async sendManualReminder() {
        try {
            showLoading(true);
            
            const appointmentId = document.getElementById('reminderAppointmentId').value;
            const reminderType = document.getElementById('reminderType').value;

            const response = await api.makeRequest(`/admin/citas/${appointmentId}/enviar-recordatorio`, {
                method: 'POST',
                body: JSON.stringify({ type: reminderType })
            });

            showSuccess('Recordatorio enviado exitosamente');
            document.getElementById('sendManualReminderForm').reset();
            
            // Recargar estadísticas
            await this.loadReminderStats();
            
        } catch (error) {
            showError(error.message || 'Error al enviar recordatorio');
        } finally {
            showLoading(false);
        }
    }

    async sendReminderFromList(appointmentId) {
        if (!confirm('¿Enviar recordatorio a este paciente?')) {
            return;
        }

        try {
            showLoading(true);
            
            const response = await api.makeRequest(`/admin/citas/${appointmentId}/enviar-recordatorio`, {
                method: 'POST',
                body: JSON.stringify({ type: '24h' })
            });

            showSuccess('Recordatorio enviado exitosamente al paciente');
            
        } catch (error) {
            showError(error.message || 'Error al enviar recordatorio');
        } finally {
            showLoading(false);
        }
    }

    createRevenueChart(data) {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.month || item.date),
                datasets: [{
                    label: 'Ingresos ($)',
                    data: data.map(item => item.revenue || 0),
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createSpecialtiesChart(data) {
        const ctx = document.getElementById('specialtiesChart');
        if (!ctx) return;
        
        const colors = [
            '#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1',
            '#e83e8c', '#20c997', '#fd7e14', '#6610f2', '#17a2b8'
        ];
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.specialty_name || item.name),
                datasets: [{
                    data: data.map(item => item.count || 0),
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    createAppointmentStatusChart(data) {
        const ctx = document.getElementById('appointmentStatusChart');
        if (!ctx) return;
        
        const statusColors = {
            'pendiente': '#ffc107',
            'confirmado': '#28a745',
            'cancelado': '#dc3545',
            'completado': '#007bff'
        };
        
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(item => item.status || item.estado),
                datasets: [{
                    data: data.map(item => item.count || 0),
                    backgroundColor: data.map(item => statusColors[item.status] || '#6c757d'),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    createWeeklyChart(data) {
        console.log('📊 Creando gráfico semanal con datos:', data);
        
        const ctx = document.getElementById('weeklyChart');
        if (!ctx) {
            console.error('❌ Canvas del gráfico semanal no encontrado');
            return;
        }
        
        // Verificar si hay datos
        if (!Array.isArray(data) || data.length === 0) {
            console.warn('⚠️  No hay datos disponibles para el gráfico semanal');
            this.showNoDataMessage(ctx, 'No hay datos de turnos por día de la semana');
            return;
        }
        
        const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        
        // Crear un objeto para almacenar datos por día
        const weeklyData = {};
        daysOfWeek.forEach(day => {
            weeklyData[day] = { appointments: 0, completed: 0, cancelled: 0 };
        });
        
        // Procesar los datos recibidos
        data.forEach(item => {
            console.log('📊 Procesando item:', item);
            const dayName = item.day_name;
            const appointments = parseInt(item.appointments) || 0;
            const completed = parseInt(item.completed) || 0;
            const cancelled = parseInt(item.cancelled) || 0;
            
            if (weeklyData.hasOwnProperty(dayName)) {
                weeklyData[dayName] = { appointments, completed, cancelled };
                console.log(`📊 ${dayName}: ${appointments} turnos`);
            }
        });
        
        console.log('📊 Datos procesados para el gráfico:', weeklyData);
        
        // Crear el gráfico
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: daysOfWeek,
                datasets: [{
                    label: 'Total Turnos',
                    data: daysOfWeek.map(day => weeklyData[day].appointments),
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }, {
                    label: 'Completados',
                    data: daysOfWeek.map(day => weeklyData[day].completed),
                    backgroundColor: 'rgba(75, 192, 192, 0.8)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }, {
                    label: 'Cancelados',
                    data: daysOfWeek.map(day => weeklyData[day].cancelled),
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y}`;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Turnos por Día de la Semana'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                return Number.isInteger(value) ? value : '';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Cantidad de Turnos'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Días de la Semana'
                        }
                    }
                }
            }
        });
        
        console.log('✅ Gráfico semanal creado exitosamente');
    }

    // Función auxiliar para mostrar mensaje cuando no hay datos
    showNoDataMessage(containerId) {
        const container = document.querySelector(containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No hay datos disponibles para mostrar</p>
                </div>
            `;
        }
    }

    // Funciones CRUD para turnos
    setupAppointmentsCRUDEvents() {
        // Cargar datos iniciales
        this.loadPatientsForSelect();
        this.loadSpecialtiesForSelect();

        // Event listeners para filtros
        this.setupAppointmentFilters();

        // Event listener para buscar turno
        const searchBtn = document.getElementById('searchAppointmentBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchAppointmentForEdit());
        }

        // Event listener para crear turno
        const createForm = document.getElementById('createAppointmentForm');
        if (createForm) {
            createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewAppointment();
            });
        }

        // Event listener para editar turno
        const editForm = document.getElementById('editAppointmentForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateAppointment();
            });
        }

        // Event listener para eliminar turno
        const deleteBtn = document.getElementById('deleteAppointmentBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteAppointment());
        }
    }

    setupAppointmentFilters() {
        // Filtro por fecha
        const dateFilter = document.getElementById('appointmentDateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', () => this.applyAppointmentFilters());
        }

        // Filtro por estado
        const statusFilter = document.getElementById('appointmentStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyAppointmentFilters());
        }

        // Botón para limpiar filtros
        const clearFiltersBtn = document.getElementById('clearAppointmentFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearAppointmentFilters());
        }
    }

    clearAppointmentFilters() {
        // Limpiar los valores de los filtros
        const dateFilter = document.getElementById('appointmentDateFilter');
        const statusFilter = document.getElementById('appointmentStatusFilter');
        
        if (dateFilter) dateFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        
        // Mostrar todos los turnos
        this.updateAppointmentsTable(this.appointments);
        
        // Mensaje de confirmación
        showSuccess('Filtros limpiados correctamente');
    }

    applyAppointmentFilters() {
        const dateFilter = document.getElementById('appointmentDateFilter')?.value;
        const statusFilter = document.getElementById('appointmentStatusFilter')?.value;

        // Filtrar los turnos según los criterios
        let filteredAppointments = [...this.appointments];

        // Aplicar filtro por fecha
        if (dateFilter) {
            filteredAppointments = filteredAppointments.filter(apt => {
                const appointmentDate = new Date(apt.appointment_date).toISOString().split('T')[0];
                return appointmentDate === dateFilter;
            });
        }

        // Aplicar filtro por estado
        if (statusFilter) {
            filteredAppointments = filteredAppointments.filter(apt => apt.status === statusFilter);
        }

        // Actualizar la tabla con los resultados filtrados
        this.updateAppointmentsTable(filteredAppointments);
    }

    updateAppointmentsTable(appointments) {
        // Resetear paginación para los resultados filtrados
        this.appointmentsPagination.currentPage = 1;
        
        // Actualizar el cuerpo de la tabla
        const tbody = document.getElementById('appointmentsTableBody');
        if (tbody) {
            // Temporalmente guardar appointments originales
            const originalAppointments = this.appointments;
            this.appointments = appointments;
            
            // Actualizar tabla con datos filtrados
            tbody.innerHTML = this.getPaginatedAppointments(appointments).map(apt => this.createAppointmentRow(apt)).join('');
            
            // Actualizar controles de paginación
            const tableContainer = tbody.closest('.table-responsive');
            const paginationContainer = tableContainer.nextElementSibling;
            if (paginationContainer && paginationContainer.classList.contains('d-flex')) {
                paginationContainer.outerHTML = this.createPaginationControls('appointments');
            }
            
            // Restaurar appointments originales
            this.appointments = originalAppointments;
        }
    }

    async loadPatientsForSelect() {
        try {
            const response = await api.getAdminUsers({ limit: 100 });
            const patients = response.users.filter(user => user.role === 'patient');
            
            const selects = ['createPatientSelect', 'editPatientSelect'];
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    select.innerHTML = '<option value="">Selecciona un paciente</option>';
                    patients.forEach(patient => {
                        select.innerHTML += `<option value="${patient.id}">${patient.name} (${patient.email})</option>`;
                    });
                }
            });
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    }

    async loadSpecialtiesForSelect() {
        try {
            const response = await api.makeRequest('/admin/especialidades');
            const specialties = response.specialties;
            
            const selects = ['createSpecialtySelect', 'editSpecialtySelect'];
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    select.innerHTML = '<option value="">Selecciona una especialidad</option>';
                    specialties.forEach(specialty => {
                        select.innerHTML += `<option value="${specialty.id}">${specialty.name} - $${specialty.price}</option>`;
                    });
                }
            });
        } catch (error) {
            console.error('Error loading specialties:', error);
        }
    }

    async createNewAppointment() {
        try {
            showLoading(true);
            
            const formData = {
                patient_id: document.getElementById('createPatientSelect').value,
                specialty_id: document.getElementById('createSpecialtySelect').value,
                appointment_date: document.getElementById('createAppointmentDate').value,
                appointment_time: document.getElementById('createAppointmentTime').value,
                status: document.getElementById('createAppointmentStatus').value,
                notes: document.getElementById('createAppointmentNotes').value
            };

            await api.makeRequest('/admin/citas', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            showSuccess('Turno creado exitosamente');
            document.getElementById('createAppointmentForm').reset();
            
            // Recargar la vista
            this.loadAdminView('appointments');
            
        } catch (error) {
            showError(error.message || 'Error al crear el turno');
        } finally {
            showLoading(false);
        }
    }

    async searchAppointmentForEdit() {
        try {
            showLoading(true);
            
            const appointmentId = document.getElementById('searchAppointmentId').value;
            if (!appointmentId) {
                showError('Ingresa un ID de turno válido');
                return;
            }

            const response = await api.makeRequest(`/admin/citas/${appointmentId}`);
            this.loadAppointmentInEditForm(response.appointment);
            
        } catch (error) {
            showError(error.message || 'Turno no encontrado');
            document.getElementById('editAppointmentSection').style.display = 'none';
        } finally {
            showLoading(false);
        }
    }

    loadAppointmentInEditForm(appointment) {
        document.getElementById('editAppointmentId').value = appointment.id;
        document.getElementById('editPatientSelect').value = appointment.patient_id;
        document.getElementById('editSpecialtySelect').value = appointment.specialty_id;
        document.getElementById('editAppointmentDate').value = appointment.appointment_date;
        document.getElementById('editAppointmentTime').value = appointment.appointment_time;
        document.getElementById('editAppointmentStatus').value = appointment.status;
        document.getElementById('editAppointmentNotes').value = appointment.notes || '';
        
        document.getElementById('editAppointmentSection').style.display = 'block';
    }

    async loadAppointmentForEdit(appointmentId) {
        document.getElementById('searchAppointmentId').value = appointmentId;
        await this.searchAppointmentForEdit();
        
        // Cambiar a la pestaña de edición
        const editTab = document.getElementById('manage-tab');
        if (editTab) {
            editTab.click();
        }
    }

    async updateAppointment() {
        try {
            showLoading(true);
            
            const appointmentId = document.getElementById('editAppointmentId').value;
            const formData = {
                patient_id: document.getElementById('editPatientSelect').value,
                specialty_id: document.getElementById('editSpecialtySelect').value,
                appointment_date: document.getElementById('editAppointmentDate').value,
                appointment_time: document.getElementById('editAppointmentTime').value,
                status: document.getElementById('editAppointmentStatus').value,
                notes: document.getElementById('editAppointmentNotes').value
            };

            await api.makeRequest(`/admin/citas/${appointmentId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            showSuccess('Turno actualizado exitosamente');
            
            // Recargar la vista
            this.loadAdminView('appointments');
            
        } catch (error) {
            showError(error.message || 'Error al actualizar el turno');
        } finally {
            showLoading(false);
        }
    }

    async deleteAppointment() {
        try {
            const appointmentId = document.getElementById('editAppointmentId').value;
            
            if (!confirm('¿Estás seguro de que quieres eliminar este turno? Esta acción no se puede deshacer.')) {
                return;
            }

            showLoading(true);

            await api.makeRequest(`/admin/citas/${appointmentId}`, {
                method: 'DELETE'
            });

            showSuccess('Turno eliminado exitosamente');
            document.getElementById('editAppointmentSection').style.display = 'none';
            
            // Recargar la vista
            this.loadAdminView('appointments');
            
        } catch (error) {
            showError(error.message || 'Error al eliminar el turno');
        } finally {
            showLoading(false);
        }
    }

    async showAppointmentDetails(appointmentId) {
        try {
            showLoading(true);
            const response = await api.makeRequest(`/admin/citas/${appointmentId}`);
            const appointment = response.appointment;
            
            // Crear modal con detalles
            const modalHtml = `
                <div class="modal fade" id="appointmentDetailsModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Detalles del Turno #${appointment.id}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p><strong>Paciente:</strong> ${appointment.patient_name}</p>
                                <p><strong>Email:</strong> ${appointment.patient_email}</p>
                                <p><strong>Especialidad:</strong> ${appointment.specialty_name}</p>
                                <p><strong>Fecha:</strong> ${this.formatDate(appointment.appointment_date)}</p>
                                <p><strong>Hora:</strong> ${this.formatTime(appointment.appointment_time)}</p>
                                <p><strong>Estado:</strong> <span class="badge bg-${this.getStatusBadgeClass(appointment.status)}">${this.getStatusText(appointment.status)}</span></p>
                                <p><strong>Precio:</strong> $${appointment.price}</p>
                                <p><strong>Creado:</strong> ${this.formatDate(appointment.created_at)}</p>
                                ${appointment.notes ? `<p><strong>Notas:</strong> ${appointment.notes}</p>` : ''}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                                <button type="button" class="btn btn-primary" onclick="window.adminManager.loadAppointmentForEdit(${appointment.id}); bootstrap.Modal.getInstance(document.getElementById('appointmentDetailsModal')).hide();">
                                    Editar Turno
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Agregar modal al DOM y mostrarlo
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('appointmentDetailsModal'));
            modal.show();
            
            // Limpiar modal cuando se cierre
            document.getElementById('appointmentDetailsModal').addEventListener('hidden.bs.modal', function() {
                this.remove();
            });
            
        } catch (error) {
            showError('Error al cargar los detalles del turno');
        } finally {
            showLoading(false);
        }
    }

    async updateAppointmentStatus(appointmentId, newStatus) {
        try {
            showLoading(true);
            
            const response = await api.makeRequest(`/admin/citas/${appointmentId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });

            let message = `Estado del turno actualizado a: ${this.getStatusText(newStatus)}`;
            
            // Si el turno se canceló y se envió email, mostrar confirmación
            if (newStatus === 'cancelled' && response.emailSent) {
                message += `\n📧 Email de cancelación enviado a: ${response.patientEmail}`;
            }
            
            // Si el turno se completó, mostrar el total acumulado
            if (newStatus === 'completed') {
                try {
                    const totalResponse = await api.makeRequest('/admin/reports/revenue');
                    const totalRevenue = totalResponse.data.reduce((sum, month) => sum + (parseFloat(month.revenue) || 0), 0);
                    message += ` | Total acumulado: $${totalRevenue.toLocaleString()}`;
                } catch (error) {
                    console.error('Error obteniendo total:', error);
                }
            }
            
            showSuccess(message);
            
            // Recargar la vista
            this.loadAdminView('appointments');
            
        } catch (error) {
            showError(error.message || 'Error al actualizar el estado del turno');
        } finally {
            showLoading(false);
        }
    }

    // Método principal para cargar vistas del panel de administrador
    async loadAdminView(view) {
        this.currentView = view;
        
        // Actualizar navegación
        document.querySelectorAll('#adminTabs .nav-link').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`#adminTabs [data-view="${view}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        const container = document.getElementById('adminViewContent');
        if (!container) return;

        showLoading(true);

        try {
            // Cargar vista correspondiente
            switch (view) {
                case 'dashboard':
                    const dashboardResponse = await api.getAdminDashboard();
                    container.innerHTML = this.createDashboardView(dashboardResponse.dashboard);
                    // Cargar total acumulado
                    setTimeout(() => {
                        this.loadTotalAccumulated();
                    }, 100);
                    break;
                
                case 'appointments':
                    const appointmentsResponse = await api.getAdminAppointments({ limit: 1000 }); // Cargar más registros
                    this.appointments = appointmentsResponse.appointments; // Guardar en variable de clase
                    this.appointmentsPagination.currentPage = 1; // Resetear paginación
                    container.innerHTML = this.createAppointmentsView(this.appointments);
                    // Configurar event listeners para las nuevas funciones CRUD
                    setTimeout(() => {
                        this.setupAppointmentsCRUDEvents();
                    }, 100);
                    break;
                
                case 'calendar':
                    await this.loadCalendarView();
                    break;
                
                case 'users':
                    const usersResponse = await api.getAdminUsers({ limit: 1000 }); // Cargar más registros
                    this.users = usersResponse.users; // Guardar en variable de clase
                    this.usersPagination.currentPage = 1; // Resetear paginación
                    container.innerHTML = this.createUsersView(this.users);
                    // Configurar event listeners para búsqueda
                    setTimeout(() => {
                        this.setupUsersSearch();
                    }, 100);
                    break;
                
                case 'reports':
                    container.innerHTML = this.createReportsView();
                    // Cargar gráficos después de que el HTML esté en el DOM
                    setTimeout(() => {
                        this.loadReportsCharts();
                    }, 100);
                    break;
                    
                case 'schedule-management':
                    await this.loadScheduleManagementView();
                    break;
                    
                case 'email-reminders':
                    await this.loadEmailRemindersView();
                    break;
                    
                default:
                    const defaultDashboardResponse = await api.getAdminDashboard();
                    container.innerHTML = this.createDashboardView(defaultDashboardResponse.dashboard);
            }
        } catch (error) {
            console.error('Error loading admin view:', error);
            showError('Error al cargar la vista de administración: ' + (error.message || 'Error desconocido'));
        } finally {
            showLoading(false);
        }
    }



    // ===== CALENDARIO VISUAL =====
    async loadCalendarView() {
        const container = document.getElementById('adminViewContent');
        if (!container) return;

        try {
            
            if (!window.calendarManager) {
                window.calendarManager = new CalendarManager();
            }

            // Crear la vista del calendario
            container.innerHTML = window.calendarManager.createCalendarView();
            
            // Inicializar y cargar datos del calendario
            await window.calendarManager.init();
            await window.calendarManager.loadAppointments();

        } catch (error) {
            console.error('Error loading calendar view:', error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Error al cargar el calendario</strong><br>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }
    // Funciones de paginación
    getPaginatedAppointments(appointments) {
        this.appointmentsPagination.totalItems = appointments.length;
        this.appointmentsPagination.totalPages = Math.ceil(appointments.length / this.appointmentsPagination.itemsPerPage);
        
        const startIndex = (this.appointmentsPagination.currentPage - 1) * this.appointmentsPagination.itemsPerPage;
        const endIndex = startIndex + this.appointmentsPagination.itemsPerPage;
        
        return appointments.slice(startIndex, endIndex);
    }

    getPaginatedUsers(users) {
        this.usersPagination.totalItems = users.length;
        this.usersPagination.totalPages = Math.ceil(users.length / this.usersPagination.itemsPerPage);
        
        const startIndex = (this.usersPagination.currentPage - 1) * this.usersPagination.itemsPerPage;
        const endIndex = startIndex + this.usersPagination.itemsPerPage;
        
        return users.slice(startIndex, endIndex);
    }

    createPaginationControls(type) {
        const pagination = type === 'appointments' ? this.appointmentsPagination : this.usersPagination;
        
        if (pagination.totalPages <= 1) {
            return '';
        }

        let paginationHtml = `
            <div class="d-flex justify-content-between align-items-center mt-3">
                <div class="text-muted">
                    Mostrando ${((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} - 
                    ${Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} 
                    de ${pagination.totalItems} registros
                </div>
                <nav>
                    <ul class="pagination pagination-sm mb-0">
                        <li class="page-item ${pagination.currentPage === 1 ? 'disabled' : ''}">
                            <a class="page-link" href="#" onclick="window.adminManager.changePage('${type}', ${pagination.currentPage - 1}); return false;">
                                <i class="fas fa-chevron-left"></i>
                            </a>
                        </li>
        `;

        // Mostrar páginas
        const startPage = Math.max(1, pagination.currentPage - 2);
        const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);

        if (startPage > 1) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="window.adminManager.changePage('${type}', 1); return false;">1</a>
                </li>
            `;
            if (startPage > 2) {
                paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === pagination.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="window.adminManager.changePage('${type}', ${i}); return false;">${i}</a>
                </li>
            `;
        }

        if (endPage < pagination.totalPages) {
            if (endPage < pagination.totalPages - 1) {
                paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="window.adminManager.changePage('${type}', ${pagination.totalPages}); return false;">${pagination.totalPages}</a>
                </li>
            `;
        }

        paginationHtml += `
                        <li class="page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}">
                            <a class="page-link" href="#" onclick="window.adminManager.changePage('${type}', ${pagination.currentPage + 1}); return false;">
                                <i class="fas fa-chevron-right"></i>
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
        `;

        return paginationHtml;
    }

    changePage(type, newPage) {
        const pagination = type === 'appointments' ? this.appointmentsPagination : this.usersPagination;
        
        if (newPage < 1 || newPage > pagination.totalPages) {
            return;
        }

        pagination.currentPage = newPage;

        // Recargar la vista correspondiente
        if (type === 'appointments') {
            this.refreshAppointmentsTable();
        } else if (type === 'users') {
            this.refreshUsersTable();
        }
    }

    refreshAppointmentsTable() {
        // Verificar si hay filtros activos
        const dateFilter = document.getElementById('appointmentDateFilter')?.value;
        const statusFilter = document.getElementById('appointmentStatusFilter')?.value;
        
        let appointmentsToShow = [...this.appointments];
        
        // Aplicar filtros si están activos
        if (dateFilter || statusFilter) {
            if (dateFilter) {
                appointmentsToShow = appointmentsToShow.filter(apt => {
                    const appointmentDate = new Date(apt.appointment_date).toISOString().split('T')[0];
                    return appointmentDate === dateFilter;
                });
            }
            
            if (statusFilter) {
                appointmentsToShow = appointmentsToShow.filter(apt => apt.status === statusFilter);
            }
        }
        
        const tbody = document.getElementById('appointmentsTableBody');
        const paginationContainer = tbody.closest('.tab-pane').querySelector('.table-responsive').nextElementSibling;
        
        if (tbody) {
            // Temporalmente usar appointments filtrados para paginación
            const originalAppointments = this.appointments;
            this.appointments = appointmentsToShow;
            tbody.innerHTML = this.getPaginatedAppointments(appointmentsToShow).map(apt => this.createAppointmentRow(apt)).join('');
            this.appointments = originalAppointments;
        }
        
        if (paginationContainer && paginationContainer.classList.contains('d-flex')) {
            // Actualizar paginación con datos filtrados
            const originalAppointments = this.appointments;
            this.appointments = appointmentsToShow;
            paginationContainer.outerHTML = this.createPaginationControls('appointments');
            this.appointments = originalAppointments;
        }
    }

    refreshUsersTable() {
        // Verificar si hay búsqueda activa
        const searchInput = document.getElementById('userSearchInput');
        const searchTerm = searchInput?.value?.trim();
        
        let usersToShow = [...this.users];
        
        // Aplicar búsqueda si está activa
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            usersToShow = usersToShow.filter(user => {
                const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
                const email = user.email.toLowerCase();
                const dni = user.dni.toString();
                
                return fullName.includes(term) || 
                       email.includes(term) || 
                       dni.includes(term);
            });
        }
        
        const tbody = document.getElementById('usersTableBody');
        const paginationContainer = tbody.closest('.card-body').lastElementChild;
        
        if (tbody) {
            // Temporalmente usar users filtrados para paginación
            const originalUsers = this.users;
            this.users = usersToShow;
            tbody.innerHTML = this.getPaginatedUsers(usersToShow).map(user => this.createUserRow(user)).join('');
            this.users = originalUsers;
        }
        
        if (paginationContainer && paginationContainer.classList.contains('d-flex')) {
            // Actualizar paginación con datos filtrados
            const originalUsers = this.users;
            this.users = usersToShow;
            paginationContainer.outerHTML = this.createPaginationControls('users');
            this.users = originalUsers;
        }
    }
}

// Función de utilidad para limpiar modales
function cleanupModals() {
    // Remover todos los backdrops
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    
    // Restaurar el body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // Remover todos los modales huérfanos
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (!modal.classList.contains('show')) {
            modal.remove();
        }
    });
}

// Limpiar modales al cambiar de vista
document.addEventListener('DOMContentLoaded', function() {
    // Limpiar modales cuando se cambie de sección
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', cleanupModals);
    });
    
    // Limpiar modales con escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            cleanupModals();
        }
    });
});

// Crear instancia global
window.adminManager = new AdminManager();