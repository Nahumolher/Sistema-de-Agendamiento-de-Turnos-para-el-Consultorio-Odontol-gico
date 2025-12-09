// Aplicación principal del Consultorio Odontológico
// 
// Para habilitar PWA (Progressive Web App):
// 1. Cambiar enableServiceWorker a true en la línea ~248
// 2. El Service Worker (sw.js) ya está creado y listo para usar
// 
class App {
    constructor() {
        this.currentPage = 'homePage';
        this.init();
    }

    init() {
        this.setupGlobalEventListeners();
        this.initializeApp();
    }

    setupGlobalEventListeners() {
        // Navegación principal
        document.getElementById('navBrand')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('homePage');
        });

        document.getElementById('navHome')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('homePage');
        });

        // Manejo de errores globales
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            showError('Ha ocurrido un error inesperado');
        });

        // Manejo de promesas rechazadas
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            showError('Error en la aplicación');
            e.preventDefault();
        });
    }

    async initializeApp() {
        try {
            // Verificar conexión con el servidor
            await this.checkServerConnection();
            
            // Inicializar página inicial
            this.showPage('homePage');
            

        } catch (error) {
            console.error('❌ Error inicializando aplicación:', error);
            showError('Error al inicializar la aplicación');
        }
    }

    async checkServerConnection() {
        try {
            await api.verificarSaludServidor();
            showSuccess('Conexión exitosa con el servidor del consultorio');
            return true;
        } catch (error) {
            showWarning('No se pudo conectar con el servidor. Algunas funcionalidades pueden no estar disponibles.');
            return false;
        }
    }

    showPage(pageId) {
        // Ocultar todas las páginas
        const pages = document.querySelectorAll('.content-section');
        pages.forEach(page => page.classList.add('d-none'));

        // Mostrar página solicitada
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('d-none');
            this.currentPage = pageId;
            
            // Ejecutar lógica específica de cada página
            this.onPageLoad(pageId);
        } else {
            console.error('Page not found:', pageId);
            this.showPage('homePage');
        }
    }

    onPageLoad(pageId) {
        switch (pageId) {
            case 'homePage':
                this.onHomePageLoad();
                break;
            case 'appointmentPage':
                this.onAppointmentPageLoad();
                break;
            case 'myAppointmentsPage':
                this.onMyAppointmentsPageLoad();
                break;
            case 'adminPage':
                this.onAdminPageLoad();
                break;
            case 'loginPage':
                this.onLoginPageLoad();
                break;
            case 'registerPage':
                this.onRegisterPageLoad();
                break;
        }
    }

    onHomePageLoad() {
        // Actualizar UI según estado de autenticación
        window.authManager?.updateUI();
    }

    onAppointmentPageLoad() {
        // Verificar autenticación
        if (window.authManager?.checkPermissions()) {
            window.appointmentsManager?.initNewAppointment();
            // Actualizar navegación para mostrar opciones de paciente
            window.authManager?.updateUI();
        }
    }

    onMyAppointmentsPageLoad() {
        // Verificar autenticación y cargar turnos
        if (window.authManager?.checkPermissions()) {
            window.appointmentsManager?.loadUserAppointments();
            // Actualizar navegación para mostrar opciones de paciente
            window.authManager?.updateUI();
        }
    }

    onAdminPageLoad() {
        // Verificar permisos de admin y cargar dashboard
        if (window.authManager?.checkPermissions('admin')) {
            window.adminManager?.loadDashboard();
            // Actualizar navegación para ocultar opciones de paciente
            window.authManager?.updateUI();
        }
    }

    onLoginPageLoad() {
        // Enfocar en el campo de email
        const emailInput = document.getElementById('loginEmail');
        if (emailInput) {
            setTimeout(() => emailInput.focus(), 100);
        }
    }

    onRegisterPageLoad() {
        // Enfocar en el campo de nombre
        const nameInput = document.getElementById('regFirstName');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 100);
        }
    }

    // Métodos de utilidad
    getCurrentPage() {
        return this.currentPage;
    }

    isPageVisible(pageId) {
        const page = document.getElementById(pageId);
        return page && !page.classList.contains('d-none');
    }

    // Manejo de notificaciones
    showNotification(message, type = 'info', duration = 5000) {
        showToast(message, type);
        
        // Auto-hide después del duration especificado
        if (duration > 0) {
            setTimeout(() => {
                const toastElement = document.getElementById('toastMessage');
                if (toastElement) {
                    const toast = bootstrap.Toast.getInstance(toastElement);
                    if (toast) {
                        toast.hide();
                    }
                }
            }, duration);
        }
    }
}

// Funciones globales para facilitar el uso
window.showPage = function(pageId) {
    if (window.app && window.app.showPage) {
        window.app.showPage(pageId);
    } else {
        // Si la app no está inicializada, intentar después
        console.warn('App not initialized yet, retrying showPage in 100ms');
        setTimeout(() => {
            if (window.app && window.app.showPage) {
                window.app.showPage(pageId);
            } else {
                console.error('Failed to show page:', pageId, 'App not available');
            }
        }, 100);
    }
};

window.showNotification = function(message, type = 'info', duration = 5000) {
    if (window.app) {
        window.app.showNotification(message, type, duration);
    }
};

// Utilidades para el desarrollo
window.dev = {
    // Función para simular login de admin
    loginAsAdmin: async function() {
        try {
            const response = await api.login('admin@consultorio.com', 'admin123');
            console.log('Admin login successful:', response);
            return response;
        } catch (error) {
            console.error('Admin login failed:', error);
            throw error;
        }
    },
    
    // Función para obtener estado actual
    getAppState: function() {
        return {
            currentPage: window.app?.getCurrentPage(),
            user: window.authManager?.getCurrentUser(),
            isLoggedIn: window.authManager?.isLoggedIn(),
            isAdmin: window.authManager?.isAdmin()
        };
    },
    
    // Función para limpiar localStorage
    clearStorage: function() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        console.log('Storage cleared');
    }
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Crear instancia global de la aplicación
        window.app = new App();
        
        // Service Worker (configuración opcional para PWA)
        const enableServiceWorker = false; // Cambiar a true para habilitar PWA
        if (enableServiceWorker && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('✅ Service Worker registrado exitosamente:', registration);
                })
                .catch(err => {
                    console.log('❌ Service Worker registration failed:', err);
                });
        }
        
    } catch (error) {
        console.error('Error during app initialization:', error);
        document.body.innerHTML = `
            <div class="container mt-5">
                <div class="alert alert-danger text-center">
                    <h4>Error de Inicialización</h4>
                    <p>Ha ocurrido un error al inicializar la aplicación. Por favor, recargue la página.</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-refresh"></i> Recargar Página
                    </button>
                </div>
            </div>
        `;
    }
});

// Manejo de eventos del navegador
window.addEventListener('beforeunload', (e) => {
    // Guardar estado si es necesario
    // No mostrar confirmación a menos que haya cambios sin guardar
});

// Manejo de navegación con teclas
document.addEventListener('keydown', (e) => {
    // ESC para cerrar modals o volver atrás
    if (e.key === 'Escape') {
        // Cerrar modals abiertos
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        });
    }
    
    // Ctrl+/ para mostrar ayuda (futuro)
    if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        console.log('Help shortcut - Feature coming soon');
    }
});

// Manejo de cambios de conectividad
window.addEventListener('online', () => {
    showSuccess('Conexión restaurada');
});

window.addEventListener('offline', () => {
    showWarning('Sin conexión a internet. Algunas funcionalidades pueden no estar disponibles.');
});

console.log('🦷 Sistema de Turnos - Consultorio Odontológico');
console.log('📝 Aplicación cargada exitosamente');
console.log('🔧 Usa window.dev para herramientas de desarrollo');