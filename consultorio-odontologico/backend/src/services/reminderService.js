const cron = require('node-cron');
const { pool } = require('../config/database');
const emailService = require('./emailService');

class ReminderService {
    constructor() {
        this.isRunning = false;
        this.init();
    }

    init() {
        console.log('🕐 Iniciando servicio de recordatorios...');
        
        // Cron job que se ejecuta cada hora
        cron.schedule('0 * * * *', () => {
            this.checkAndSendReminders();
        });

        // Cron job que se ejecuta cada 15 minutos (para recordatorios de 2 horas)
        cron.schedule('*/15 * * * *', () => {
            this.checkAndSendUrgentReminders();
        });

        console.log('✅ Servicio de recordatorios configurado');
        console.log('📅 Recordatorios de 24h: cada hora');
        console.log('⚡ Recordatorios de 2h: cada 15 minutos');
    }

    async checkAndSendReminders() {
        if (this.isRunning) {
            console.log('⏳ Recordatorios ya en ejecución, saltando...');
            return;
        }

        this.isRunning = true;
        console.log('🔍 Verificando recordatorios de 24 horas...');

        try {
            // Buscar turnos que necesitan recordatorio de 24 horas
            const query = `
                SELECT 
                    a.id,
                    a.appointment_date,
                    a.appointment_time,
                    a.created_at,
                    a.reminder_24h_sent,
                    CONCAT(u.first_name, ' ', u.last_name) as patient_name,
                    u.email as patient_email,
                    s.name as specialty_name,
                    s.price
                FROM appointments a
                JOIN users u ON a.user_id = u.id
                JOIN specialties s ON a.specialty_id = s.id
                WHERE a.status IN ('scheduled', 'confirmed')
                AND a.appointment_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
                AND (a.reminder_24h_sent = 0 OR a.reminder_24h_sent IS NULL)
                AND u.email IS NOT NULL
                AND u.email != ''
            `;

            const [appointments] = await pool.execute(query);
            
            console.log(`📧 Encontrados ${appointments.length} turnos para recordatorio de 24h`);

            for (const appointment of appointments) {
                try {
                    const result = await emailService.sendAppointmentReminder(appointment, '24h');
                    
                    if (result.success) {
                        // Marcar como enviado
                        await pool.execute(
                            'UPDATE appointments SET reminder_24h_sent = 1, reminder_24h_sent_at = NOW() WHERE id = ?',
                            [appointment.id]
                        );
                        
                        console.log(`✅ Recordatorio 24h enviado: ${appointment.patient_name} (${appointment.patient_email})`);
                    } else {
                        console.error(`❌ Error enviando a ${appointment.patient_name}:`, result.error);
                    }
                    
                    // Esperar 1 segundo entre emails para no saturar
                    await this.sleep(1000);
                    
                } catch (error) {
                    console.error(`❌ Error procesando turno ${appointment.id}:`, error);
                }
            }
            
        } catch (error) {
            console.error('❌ Error en checkAndSendReminders:', error);
        } finally {
            this.isRunning = false;
            console.log('✅ Verificación de recordatorios completada');
        }
    }

    async checkAndSendUrgentReminders() {
        console.log('🚨 Verificando recordatorios urgentes (2 horas)...');

        try {
            const now = new Date();
            const twoHoursLater = new Date(now.getTime() + (2 * 60 * 60 * 1000));

            // Buscar turnos que necesitan recordatorio de 2 horas
            const query = `
                SELECT 
                    a.id,
                    a.appointment_date,
                    a.appointment_time,
                    a.created_at,
                    a.reminder_2h_sent,
                    CONCAT(u.first_name, ' ', u.last_name) as patient_name,
                    u.email as patient_email,
                    s.name as specialty_name,
                    s.price,
                    CONCAT(a.appointment_date, ' ', a.appointment_time) as appointment_datetime
                FROM appointments a
                JOIN users u ON a.user_id = u.id
                JOIN specialties s ON a.specialty_id = s.id
                WHERE a.status IN ('scheduled', 'confirmed')
                AND a.appointment_date = CURDATE()
                AND (a.reminder_2h_sent = 0 OR a.reminder_2h_sent IS NULL)
                AND u.email IS NOT NULL
                AND u.email != ''
                AND TIMESTAMPDIFF(HOUR, a.created_at, NOW()) < 24
                AND TIMESTAMPDIFF(MINUTE, NOW(), CONCAT(a.appointment_date, ' ', a.appointment_time)) <= 120
                AND TIMESTAMPDIFF(MINUTE, NOW(), CONCAT(a.appointment_date, ' ', a.appointment_time)) > 90
            `;

            const [appointments] = await pool.execute(query);
            
            console.log(`⚡ Encontrados ${appointments.length} turnos para recordatorio urgente de 2h`);

            for (const appointment of appointments) {
                try {
                    // Verificar que el turno fue creado hace menos de 24 horas
                    const createdHoursAgo = (now - new Date(appointment.created_at)) / (1000 * 60 * 60);
                    
                    if (createdHoursAgo < 24) {
                        const result = await emailService.sendAppointmentReminder(appointment, '2h');
                        
                        if (result.success) {
                            // Marcar como enviado
                            await pool.execute(
                                'UPDATE appointments SET reminder_2h_sent = 1, reminder_2h_sent_at = NOW() WHERE id = ?',
                                [appointment.id]
                            );
                            
                            console.log(`🚨 Recordatorio 2h enviado: ${appointment.patient_name} (${appointment.patient_email})`);
                        } else {
                            console.error(`❌ Error enviando recordatorio urgente a ${appointment.patient_name}:`, result.error);
                        }
                        
                        await this.sleep(1000);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error procesando turno urgente ${appointment.id}:`, error);
                }
            }
            
        } catch (error) {
            console.error('❌ Error en checkAndSendUrgentReminders:', error);
        }
    }

    async sendTestReminder(appointmentId) {
        try {
            const [appointments] = await pool.execute(`
                SELECT 
                    a.id,
                    a.appointment_date,
                    a.appointment_time,
                    CONCAT(u.first_name, ' ', u.last_name) as patient_name,
                    u.email as patient_email,
                    s.name as specialty_name,
                    s.price
                FROM appointments a
                JOIN users u ON a.user_id = u.id
                JOIN specialties s ON a.specialty_id = s.id
                WHERE a.id = ?
            `, [appointmentId]);

            if (appointments.length === 0) {
                return { success: false, error: 'Turno no encontrado' };
            }

            const appointment = appointments[0];
            const result = await emailService.sendAppointmentReminder(appointment, '24h');
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Método para enviar recordatorio manual desde el admin
    async sendManualReminder(appointmentId, reminderType = '24h') {
        try {
            const [appointments] = await pool.execute(`
                SELECT 
                    a.id,
                    a.appointment_date,
                    a.appointment_time,
                    CONCAT(u.first_name, ' ', u.last_name) as patient_name,
                    u.email as patient_email,
                    s.name as specialty_name,
                    s.price
                FROM appointments a
                JOIN users u ON a.user_id = u.id
                JOIN specialties s ON a.specialty_id = s.id
                WHERE a.id = ?
            `, [appointmentId]);

            if (appointments.length === 0) {
                return { success: false, error: 'Turno no encontrado' };
            }

            const appointment = appointments[0];
            return await emailService.sendAppointmentReminder(appointment, reminderType);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = new ReminderService();