// Configuración del servicio de API del consultorio odontológico
class ServicioAPI {
    constructor() {
        this.urlBase = 'http://localhost:3000/api';
        this.tokenAutenticacion = localStorage.getItem('authToken');
    }

    // Configurar cabeceras HTTP por defecto
    obtenerCabeceras(incluirAutenticacion = true) {
        const cabeceras = {
            'Content-Type': 'application/json',
        };

        if (incluirAutenticacion && this.tokenAutenticacion) {
            cabeceras['Authorization'] = `Bearer ${this.tokenAutenticacion}`;
        }

        return cabeceras;
    }

    // Método genérico para realizar solicitudes HTTP
    async realizarSolicitud(endpoint, opciones = {}) {
        const url = `${this.urlBase}${endpoint}`;
        const incluirAuth = opciones.auth !== false; // Por defecto incluir auth, excepto si auth es explícitamente false
        const configuracion = {
            headers: this.obtenerCabeceras(incluirAuth),
            ...opciones
        };

        try {
            showLoading(true);
            const response = await fetch(url, configuracion);
            const data = await response.json();

            if (!response.ok) {
                // Manejo especial para errores de autenticación
                if (response.status === 401) {
                    console.warn('🔐 Token de autenticación inválido o expirado');
                    // Limpiar token inválido
                    this.tokenAutenticacion = null;
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                    
                    // Si estamos en una página que requiere autenticación, redirigir
                    if (incluirAuth !== false && typeof window !== 'undefined' && window.showPage) {
                        setTimeout(() => window.showPage('loginPage'), 100);
                    }
                }
                throw new Error(data.message || data.error || 'Error en la solicitud');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        } finally {
            showLoading(false);
        }
    }

    // Alias para compatibilidad con el código existente
    async makeRequest(endpoint, opciones = {}) {
        return await this.realizarSolicitud(endpoint, opciones);
    }

    // Método para obtener el dashboard de admin
    async getAdminDashboard() {
        return await this.realizarSolicitud('/admin/panel-control');
    }

    // Métodos de autenticación
    async login(email, password) {
        const data = await this.realizarSolicitud('/auth/iniciar-sesion', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            auth: false
        });

        if (data.token) {
            this.tokenAutenticacion = data.token;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    }

    // Obtener configuración del servidor
    async getConfig() {
        return await this.realizarSolicitud('/config', {
            method: 'GET',
            auth: false
        });
    }

    async register(userData) {
        const data = await this.realizarSolicitud('/auth/registrarse', {
            method: 'POST',
            body: JSON.stringify(userData),
            auth: false
        });

        if (data.token) {
            this.tokenAutenticacion = data.token;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    }

    async verifyToken() {
        try {
            const data = await this.realizarSolicitud('/auth/verificar-sesion');
            localStorage.setItem('user', JSON.stringify(data.user));
            return data;
        } catch (error) {
            this.logout();
            throw error;
        }
    }

    logout() {
        this.tokenAutenticacion = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    }

    // Métodos para especialidades
    async getSpecialties() {
        return await this.realizarSolicitud('/appointments/especialidades', {
            method: 'GET',
            auth: false
        });
    }

    // Métodos para horarios disponibles
    async getAvailableSlots(date, specialtyId) {
        return await this.realizarSolicitud(`/appointments/horarios-disponibles?date=${date}&specialtyId=${specialtyId}`, {
            method: 'GET',
            auth: false
        });
    }

    // Obtener días no laborables (público)
    async getNonWorkingDays(year = null, month = null) {
        let url = '/appointments/dias-no-laborables';
        const params = new URLSearchParams();
        
        if (year) params.append('year', year);
        if (month) params.append('month', month);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        return await this.realizarSolicitud(url, {
            method: 'GET',
            auth: false
        });
    }

    // Métodos para turnos
    async createAppointment(appointmentData) {
        return await this.realizarSolicitud('/appointments', {
            method: 'POST',
            body: JSON.stringify(appointmentData)
        });
    }

    async getUserAppointments(userId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/users/${userId}/appointments${queryString ? '?' + queryString : ''}`;
        return await this.realizarSolicitud(endpoint);
    }

    async getAppointmentDetails(appointmentId) {
        return await this.realizarSolicitud(`/appointments/${appointmentId}`);
    }

    async cancelAppointment(appointmentId) {
        return await this.realizarSolicitud(`/appointments/${appointmentId}/cancelar`, {
            method: 'PUT'
        });
    }

    // Métodos para perfil de usuario
    async getUserProfile(userId) {
        return await this.realizarSolicitud(`/users/profile/${userId}`);
    }

    async updateUserProfile(userId, userData) {
        return await this.realizarSolicitud(`/users/profile/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    // Métodos de administración
    async getAdminDashboard() {
        return await this.realizarSolicitud('/admin/panel-control');
    }

    async getAdminAppointments(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/admin/citas${queryString ? '?' + queryString : ''}`;
        return await this.realizarSolicitud(endpoint);
    }

    async updateAppointmentStatus(appointmentId, status, notes) {
        return await this.realizarSolicitud(`/admin/citas/${appointmentId}/estado`, {
            method: 'PUT',
            body: JSON.stringify({ status, notes })
        });
    }

    async getAdminUsers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/admin/usuarios${queryString ? '?' + queryString : ''}`;
        return await this.realizarSolicitud(endpoint);
    }

    async toggleUserStatus(userId) {
        return await this.realizarSolicitud(`/admin/usuarios/${userId}/cambiar-estado`, {
            method: 'PUT'
        });
    }

    async getReports(type, startDate, endDate) {
        const params = new URLSearchParams({ type, startDate, endDate });
        return await this.realizarSolicitud(`/admin/reportes?${params}`);
    }

    // Método para verificar la salud del servidor del consultorio
    async verificarSaludServidor() {
        try {
            return await this.realizarSolicitud('/health', {
                method: 'GET',
                auth: false
            });
        } catch (error) {
            console.error('Verificación de servidor falló:', error);
            throw error;
        }
    }
}

// Funciones de utilidad para UI
function showLoading(show = true) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.toggle('d-none', !show);
    }
}

function showToast(message, type = 'info') {
    const toastElement = document.getElementById('toastMessage');
    if (!toastElement) return;

    const toastBody = toastElement.querySelector('.toast-body');
    const toastIcon = toastElement.querySelector('.toast-header i');
    
    // Configurar mensaje
    toastBody.textContent = message;
    
    // Configurar icono según el tipo
    const iconClasses = {
        success: 'fas fa-check-circle text-success',
        error: 'fas fa-exclamation-circle text-danger',
        warning: 'fas fa-exclamation-triangle text-warning',
        info: 'fas fa-info-circle text-primary'
    };
    
    toastIcon.className = iconClasses[type] || iconClasses.info;
    
    // Mostrar toast
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}

function showError(message) {
    showToast(message, 'error');
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showWarning(message) {
    showToast(message, 'warning');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatTime(timeString) {
    // Convertir time string (HH:MM:SS) a formato HH:MM
    return timeString.slice(0, 5);
}

function formatDateTime(dateString, timeString) {
    return `${formatDate(dateString)} a las ${formatTime(timeString)}`;
}

function getStatusBadge(status, cancelledByAdmin = false) {
    const statusConfig = {
        confirmed: { text: 'Confirmado', class: 'status-confirmed' },
        cancelled: { 
            text: cancelledByAdmin ? 'Cancelado por Consultorio' : 'Cancelado', 
            class: cancelledByAdmin ? 'status-cancelled cancelled-by-admin' : 'status-cancelled' 
        },
        completed: { text: 'Completado', class: 'status-completed' },
        no_show: { text: 'No se presentó', class: 'status-no_show' }
    };

    const config = statusConfig[status] || { text: status, class: 'status-confirmed' };
    return `<span class="status-badge ${config.class}">${config.text}</span>`;
}

// Función para validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Función para validar teléfono argentino
function isValidArgentinePhone(phone) {
    // Acepta formatos más flexibles: números con al menos 8 dígitos
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    return cleanPhone.length >= 8 && cleanPhone.length <= 15 && /^\d+$/.test(cleanPhone);
}

// Función para validar DNI argentino
function isValidArgentineDNI(dni) {
    const dniRegex = /^\d{7,8}$/;
    return dniRegex.test(dni);
}

// Función para obtener fecha mínima (hoy)
function getMinDate() {
    const today = new Date();
    // Ajustar por zona horaria local para evitar problemas de UTC
    const localOffset = today.getTimezoneOffset() * 60000;
    const localDate = new Date(today.getTime() - localOffset);
    return localDate.toISOString().split('T')[0];
}

// Variable global para la configuración del servidor
let serverConfig = null;

// Función para obtener configuración del servidor
async function getServerConfig() {
    if (!serverConfig) {
        try {
            const apiService = new ApiService();
            serverConfig = await apiService.getConfig();
        } catch (error) {
            console.warn('No se pudo obtener configuración del servidor, usando valores por defecto');
            serverConfig = { maxBookingDays: 365 }; // Valor por defecto más alto
        }
    }
    return serverConfig;
}

// Función para obtener fecha máxima (usa configuración del servidor)
async function getMaxDate(customDays = null) {
    let daysFromToday = customDays;
    
    if (!daysFromToday) {
        const config = await getServerConfig();
        daysFromToday = config.maxBookingDays || 365;
    }
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + daysFromToday);
    // Ajustar por zona horaria local
    const localOffset = maxDate.getTimezoneOffset() * 60000;
    const localDate = new Date(maxDate.getTime() - localOffset);
    return localDate.toISOString().split('T')[0];
}

// Función síncrona para obtener fecha máxima (para compatibilidad)
function getMaxDateSync(daysFromToday = 365) {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + daysFromToday);
    // Ajustar por zona horaria local
    const localOffset = maxDate.getTimezoneOffset() * 60000;
    const localDate = new Date(maxDate.getTime() - localOffset);
    return localDate.toISOString().split('T')[0];
}

// Crear instancia global de la API del consultorio
const servicioApi = new ServicioAPI();
const api = servicioApi; // Alias para compatibilidad
const ApiService = ServicioAPI;

// Verificar conexión al servidor al cargar con reintentos
let conexionVerificada = false;

async function verificarConexionServidor(intentos = 3) {
    // Si ya fue verificada, no hacer nada
    if (conexionVerificada) return true;
    
    for (let i = 0; i < intentos; i++) {
        try {
            if (servicioApi && typeof servicioApi.verificarSaludServidor === 'function') {
                await servicioApi.verificarSaludServidor();
                console.log('✅ Conexión con servidor verificada');
                conexionVerificada = true;
                return true;
            }
        } catch (error) {
            console.warn(`⚠️ Intento ${i + 1}/${intentos} fallido:`, error.message);
            if (i < intentos - 1) {
                // Esperar antes del siguiente intento
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }
    
    // Solo mostrar error después de todos los intentos Y si no se verificó antes
    if (!conexionVerificada) {
        const errorMsg = 'No se pudo conectar con el servidor del consultorio. Verifique que esté ejecutándose.';
        console.error('❌ Error de conexión persistente después de', intentos, 'intentos');
        if (typeof showError === 'function') {
            showError(errorMsg);
        } else {
            console.warn(errorMsg);
        }
    }
    return false;
}

document.addEventListener('DOMContentLoaded', () => {
    // Dar tiempo para que se inicialicen todas las funciones
    setTimeout(() => {
        // Solo verificar si realmente hay un problema
        // La verificación se hace silenciosamente en background
        verificarConexionServidor().then(success => {
            if (!success) {
                console.warn('⚠️ Verificación de conexión falló, pero la aplicación puede seguir funcionando');
            }
        });
    }, 500);
});