// Manejo de autenticación
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Verificar si hay un usuario logueado
        const savedUser = localStorage.getItem('user');
        const token = localStorage.getItem('authToken');

        if (savedUser && token) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.updateUI();
                // Verificar que el token aún sea válido
                this.verifySession();
            } catch (error) {
                console.error('Error parsing saved user:', error);
                this.logout();
            }
        }

        this.setupEventListeners();
    }

    async verifySession() {
        try {
            const response = await api.verifyToken();
            this.currentUser = response.user;
            this.updateUI();
        } catch (error) {
            console.warn('Session verification failed:', error);
            this.logout();
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }

        // Navigation links
        document.getElementById('navLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginPage();
        });

        document.getElementById('navRegister')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterPage();
        });

        document.getElementById('navLogout')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        document.getElementById('btnLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginPage();
        });

        document.getElementById('btnGetStarted')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.isLoggedIn()) {
                window.showPage('appointmentPage');
            } else {
                this.showRegisterPage();
            }
        });

        // Links between login and register
        document.getElementById('linkToRegister')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterPage();
        });

        document.getElementById('linkToLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginPage();
        });
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        // Validaciones
        if (!email || !password) {
            showError('Por favor complete todos los campos');
            return;
        }

        if (!isValidEmail(email)) {
            showError('Por favor ingrese un email válido');
            return;
        }

        try {
            const response = await api.login(email, password);
            this.currentUser = response.user;
            
            showSuccess(`¡Bienvenido/a ${response.user.firstName}!`);
            this.updateUI();
            
            // Redirigir según el rol
            if (response.user.role === 'admin') {
                window.showPage('adminPage');
            } else {
                window.showPage('myAppointmentsPage');
            }
            
        } catch (error) {
            showError(error.message || 'Error al iniciar sesión');
        }
    }

    async handleRegister(event) {
        event.preventDefault();

        const formData = {
            firstName: document.getElementById('regFirstName').value.trim(),
            lastName: document.getElementById('regLastName').value.trim(),
            email: document.getElementById('regEmail').value.trim(),
            password: document.getElementById('regPassword').value,
            phone: document.getElementById('regPhone').value.trim(),
            dni: document.getElementById('regDni').value.trim(),
            birthDate: document.getElementById('regBirthDate').value
        };

        // Validaciones
        if (!formData.firstName || !formData.lastName || !formData.email || 
            !formData.password || !formData.phone || !formData.dni) {
            showError('Por favor complete todos los campos obligatorios');
            return;
        }

        if (formData.firstName.length < 2 || formData.lastName.length < 2) {
            showError('El nombre y apellido deben tener al menos 2 caracteres');
            return;
        }

        if (!isValidEmail(formData.email)) {
            showError('Por favor ingrese un email válido');
            return;
        }

        if (formData.password.length < 6) {
            showError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (!isValidArgentinePhone(formData.phone)) {
            showError('Por favor ingrese un número de teléfono válido');
            return;
        }

        if (!isValidArgentineDNI(formData.dni)) {
            showError('El DNI debe tener 7 u 8 dígitos numéricos');
            return;
        }

        try {
            const response = await api.register(formData);
            this.currentUser = response.user;
            
            showSuccess(`¡Registro exitoso! Bienvenido/a ${response.user.firstName}`);
            this.updateUI();
            window.showPage('myAppointmentsPage');
            
        } catch (error) {
            showError(error.message || 'Error al registrarse');
        }
    }

    logout() {
        api.logout();
        this.currentUser = null;
        this.updateUI();
        window.showPage('homePage');
        showSuccess('Sesión cerrada exitosamente');
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    getCurrentUser() {
        return this.currentUser;
    }

    updateUI() {
        const isLoggedIn = this.isLoggedIn();
        const isAdmin = this.isAdmin();

        // Elementos de navegación
        const navLogin = document.getElementById('navLogin');
        const navRegister = document.getElementById('navRegister');
        const navProfile = document.getElementById('navProfile');
        const navLogout = document.getElementById('navLogout');
        const navMyAppointments = document.getElementById('navMyAppointments');
        const navNewAppointment = document.getElementById('navNewAppointment');
        const navAdmin = document.getElementById('navAdmin');
        const userGreeting = document.getElementById('userGreeting');

        if (isLoggedIn) {
            
            navLogin?.classList.add('d-none');
            navRegister?.classList.add('d-none');

            
            navProfile?.classList.remove('d-none');
            navLogout?.classList.remove('d-none');

            
            if (isAdmin) {
                navMyAppointments?.classList.add('d-none');
                navNewAppointment?.classList.add('d-none');
                navAdmin?.classList.remove('d-none');
            } else {
                
                navMyAppointments?.classList.remove('d-none');
                navNewAppointment?.classList.remove('d-none');
                navAdmin?.classList.add('d-none');
            }

            // Actualizar saludo
            if (userGreeting && this.currentUser) {
                userGreeting.textContent = `Hola, ${this.currentUser.firstName}`;
            }
        } else {
            
            navLogin?.classList.remove('d-none');
            navRegister?.classList.remove('d-none');

           
            navProfile?.classList.add('d-none');
            navLogout?.classList.add('d-none');
            navMyAppointments?.classList.add('d-none');
            navNewAppointment?.classList.add('d-none');
            navAdmin?.classList.add('d-none');
        }

        // Actualizar eventos de navegación
        this.updateNavigationEvents();
    }

    updateNavigationEvents() {
        // My Appointments
        const navMyAppointments = document.getElementById('navMyAppointments');
        if (navMyAppointments) {
            navMyAppointments.querySelector('a').onclick = (e) => {
                e.preventDefault();
                if (this.isLoggedIn()) {
                    window.showPage('myAppointmentsPage');
                    window.appointmentsManager?.loadUserAppointments();
                }
            };
        }

        const navNewAppointment = document.getElementById('navNewAppointment');
        if (navNewAppointment) {
            navNewAppointment.querySelector('a').onclick = (e) => {
                e.preventDefault();
                if (this.isLoggedIn()) {
                    window.showPage('appointmentPage');
                    window.appointmentsManager?.initNewAppointment();
                }
            };
        }

        // Admin Panel
        const navAdmin = document.getElementById('navAdmin');
        if (navAdmin) {
            navAdmin.querySelector('a').onclick = (e) => {
                e.preventDefault();
                if (this.isAdmin()) {
                    window.showPage('adminPage');
                    window.adminManager?.loadDashboard();
                }
            };
        }

        // Profile
        const navProfile = document.getElementById('navProfile');
        if (navProfile) {
            navProfile.querySelector('a').onclick = (e) => {
                e.preventDefault();
                // Mostrar perfil o configuración
                this.showProfileModal();
            };
        }
    }

    showLoginPage() {
        window.showPage('loginPage');
        // Limpiar formulario
        document.getElementById('loginForm')?.reset();
    }

    showRegisterPage() {
        window.showPage('registerPage');
        // Limpiar formulario
        document.getElementById('registerForm')?.reset();
    }

    showProfileModal() {
        // Por ahora mostrar información básica en un modal
        if (this.currentUser) {
            const message = `
                <strong>Perfil de Usuario</strong><br>
                Nombre: ${this.currentUser.firstName} ${this.currentUser.lastName}<br>
                Email: ${this.currentUser.email}<br>
                Rol: ${this.currentUser.role === 'admin' ? 'Administrador' : 'Paciente'}
            `;
            
            // Crear modal simple
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Mi Perfil</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${message}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();
            
            // Remover modal del DOM cuando se cierre
            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
            });
        }
    }

    // Método para verificar permisos antes de mostrar ciertas páginas
    checkPermissions(requiredRole = null) {
        if (!this.isLoggedIn()) {
            showWarning('Debe iniciar sesión para acceder a esta página');
            this.showLoginPage();
            return false;
        }

        if (requiredRole === 'admin' && !this.isAdmin()) {
            showError('No tiene permisos para acceder a esta página');
            return false;
        }

        return true;
    }

    // Método para forzar actualización de navegación
    forceUpdateNavigation() {
        this.updateUI();
    }
}

// Crear instancia global
window.authManager = new AuthManager();