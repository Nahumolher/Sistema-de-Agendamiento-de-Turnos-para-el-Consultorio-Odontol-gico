-- ============================================
-- SCRIPT DE CREACIÓN DE BASE DE DATOS
-- Sistema de Turnos para Consultorio Odontológico
-- ============================================

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS consultorio_odontologico;
USE consultorio_odontologico;

-- Tabla de usuarios (pacientes y administradores)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    dni VARCHAR(8) UNIQUE NOT NULL,
    birth_date DATE,
    role ENUM('patient', 'admin') DEFAULT 'patient',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_dni (dni),
    INDEX idx_role (role),
    INDEX idx_active (active)
);

-- Tabla de especialidades odontológicas
CREATE TABLE specialties (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_minutes INT DEFAULT 30,
    price DECIMAL(10,2) DEFAULT 0.00,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_active (active)
);

-- Tabla de horarios disponibles
CREATE TABLE available_schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    day_of_week TINYINT NOT NULL, -- 0=Domingo, 1=Lunes, ..., 6=Sábado
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT DEFAULT 30,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_day_active (day_of_week, active)
);

-- Tabla de turnos
CREATE TABLE appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    specialty_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status ENUM('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show') DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE RESTRICT,
    
    INDEX idx_user_date (user_id, appointment_date),
    INDEX idx_date_time (appointment_date, appointment_time),
    INDEX idx_status (status),
    
    -- Evitar turnos duplicados en la misma fecha y hora
    UNIQUE KEY unique_datetime (appointment_date, appointment_time)
);

-- Tabla de días no laborables (feriados, vacaciones)
CREATE TABLE non_working_days (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL UNIQUE,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_date (date)
);

-- Tabla de configuración del sistema
CREATE TABLE system_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Insertar especialidades básicas
INSERT INTO specialties (name, description, duration_minutes, price) VALUES
('Consulta General', 'Revisión general y diagnóstico', 30, 5000.00),
('Limpieza Dental', 'Profilaxis y limpieza profunda', 45, 7000.00),
('Empaste', 'Restauración con resina o amalgama', 60, 8000.00),
('Extracción Simple', 'Extracción de pieza dental simple', 30, 6000.00),
('Extracción Compleja', 'Extracción quirúrgica', 60, 12000.00),
('Endodoncia', 'Tratamiento de conducto', 90, 15000.00),
('Corona Dental', 'Colocación de corona', 60, 20000.00),
('Ortodoncia - Consulta', 'Evaluación ortodóntica inicial', 45, 8000.00);

-- Insertar horarios de trabajo (Lunes a Viernes: 8:00 - 18:00, Sábados: 8:00 - 14:00)
INSERT INTO available_schedules (day_of_week, start_time, end_time, slot_duration_minutes) VALUES
-- Lunes a Viernes
(1, '08:00:00', '18:00:00', 30),
(2, '08:00:00', '18:00:00', 30),
(3, '08:00:00', '18:00:00', 30),
(4, '08:00:00', '18:00:00', 30),
(5, '08:00:00', '18:00:00', 30),
-- Sábado
(6, '08:00:00', '14:00:00', 30);

-- Insertar configuración del sistema
INSERT INTO system_config (config_key, config_value, description) VALUES
('clinic_name', 'Consultorio Odontológico Dr. Smith', 'Nombre del consultorio'),
('clinic_address', 'Av. Principal 123, Ciudad', 'Dirección del consultorio'),
('clinic_phone', '+54 11 1234-5678', 'Teléfono del consultorio'),
('clinic_email', 'info@consultorio-smith.com', 'Email del consultorio'),
('max_appointments_per_day', '20', 'Máximo de turnos por día'),
('advance_booking_days', '30', 'Días de anticipación máxima para reservar'),
('min_booking_hours', '2', 'Horas mínimas de anticipación para reservar'),
('break_start_time', '12:00:00', 'Hora de inicio del descanso'),
('break_end_time', '13:00:00', 'Hora de fin del descanso');

-- Crear usuario administrador por defecto
-- Contraseña: admin123 (cambiar después del primer login)
INSERT INTO users (first_name, last_name, email, password, phone, dni, birth_date, role) VALUES
('Admin', 'Sistema', 'admin@consultorio.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaQckmj0EctwL2.TvKQGSO2HO', '1234567890', '12345678', '1980-01-01', 'admin');

-- ============================================
-- PROCEDIMIENTOS ALMACENADOS
-- ============================================

DELIMITER //

-- Procedimiento para obtener horarios disponibles
CREATE PROCEDURE GetAvailableSlots(
    IN p_date DATE,
    IN p_specialty_id INT
)
BEGIN
    DECLARE v_day_of_week TINYINT;
    DECLARE v_duration INT;
    
    -- Obtener día de la semana (0=Domingo, 1=Lunes, etc.)
    SET v_day_of_week = DAYOFWEEK(p_date) - 1;
    
    -- Obtener duración de la especialidad
    SELECT duration_minutes INTO v_duration 
    FROM specialties 
    WHERE id = p_specialty_id;
    
    -- Generar slots disponibles
    WITH RECURSIVE time_slots AS (
        SELECT 
            s.start_time as slot_time,
            s.end_time,
            v_duration as duration
        FROM available_schedules s
        WHERE s.day_of_week = v_day_of_week 
        AND s.active = true
        
        UNION ALL
        
        SELECT 
            ADDTIME(slot_time, SEC_TO_TIME(duration * 60)) as slot_time,
            end_time,
            duration
        FROM time_slots
        WHERE ADDTIME(slot_time, SEC_TO_TIME(duration * 60)) < end_time
    )
    SELECT 
        slot_time,
        CASE 
            WHEN a.id IS NULL THEN 'available'
            ELSE 'occupied'
        END as status
    FROM time_slots t
    LEFT JOIN appointments a ON a.appointment_date = p_date 
        AND a.appointment_time = t.slot_time
        AND a.status IN ('scheduled', 'confirmed')
    WHERE p_date NOT IN (SELECT date FROM non_working_days)
    ORDER BY slot_time;
END //

DELIMITER ;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista de turnos con información completa
CREATE VIEW appointment_details AS
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.notes,
    u.first_name as patient_first_name,
    u.last_name as patient_last_name,
    u.email as patient_email,
    u.phone as patient_phone,
    s.name as specialty_name,
    s.duration_minutes,
    s.price,
    a.created_at
FROM appointments a
JOIN users u ON a.user_id = u.id
JOIN specialties s ON a.specialty_id = s.id;

-- Vista de estadísticas diarias
CREATE VIEW daily_stats AS
SELECT 
    appointment_date,
    COUNT(*) as total_appointments,
    COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show,
    SUM(s.price) as total_revenue
FROM appointments a
JOIN specialties s ON a.specialty_id = s.id
GROUP BY appointment_date
ORDER BY appointment_date DESC;

-- ============================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ============================================

-- Índice compuesto para búsquedas frecuentes
CREATE INDEX idx_appointment_search ON appointments(appointment_date, status, user_id);
CREATE INDEX idx_user_active_role ON users(active, role);

-- ============================================
-- TRIGGERS PARA AUDITORÍA
-- ============================================

-- Trigger para registrar cambios de estado en turnos
CREATE TABLE appointment_status_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    appointment_id INT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

DELIMITER //

CREATE TRIGGER appointment_status_change
    AFTER UPDATE ON appointments
    FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO appointment_status_log (appointment_id, old_status, new_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
END //

DELIMITER ;

-- ============================================
-- TABLA PARA RECUPERACIÓN DE CONTRASEÑAS
-- ============================================

-- Eliminar tabla si existe y recrearla
DROP TABLE IF EXISTS password_reset_tokens;

-- Tabla para tokens de recuperación de contraseña
CREATE TABLE password_reset_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para mejor rendimiento
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at);

-- Mostrar mensaje de éxito
SELECT 'Base de datos creada exitosamente. Usuario admin: admin@consultorio.com / admin123' as mensaje;