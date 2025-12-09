const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initTransporter();
    }

    initTransporter() {
        // Verificar que las variables de entorno estén configuradas
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('⚠️  Variables de email no configuradas, saltando inicialización');
            return;
        }

        // Configuración para Gmail (puedes cambiar por otro proveedor)
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // tu email
                pass: process.env.EMAIL_PASS  // contraseña de aplicación
            }
        });

        // Verificar conexión de forma asíncrona (no bloquear el servidor)
        setImmediate(() => {
            this.transporter.verify((error, success) => {
                if (error) {
                    console.error('❌ Error configurando email:', error);
                } else {
                    console.log('✅ Servicio de email configurado correctamente');
                }
            });
        });
    }

    async sendAppointmentReminder(appointment, reminderType = '24h') {
        try {
            // Verificar que el transporter esté inicializado
            if (!this.transporter) {
                console.warn('⚠️  Servicio de email no disponible, saltando envío');
                return {
                    success: false,
                    error: 'Servicio de email no configurado'
                };
            }

            const emailTemplate = this.getEmailTemplate(appointment, reminderType);
            
            const mailOptions = {
                from: `"Consultorio Odontológico" <${process.env.EMAIL_USER}>`,
                to: appointment.patient_email,
                subject: emailTemplate.subject,
                html: emailTemplate.html
            };

            const result = await this.transporter.sendMail(mailOptions);
            // Email enviado correctamente
            
            return {
                success: true,
                messageId: result.messageId
            };
        } catch (error) {
            console.error('❌ Error enviando email:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getEmailTemplate(appointment, reminderType) {
        const isUrgent = reminderType === '2h';
        const timeText = isUrgent ? '2 horas' : '24 horas';
        const urgencyClass = isUrgent ? 'urgent' : 'normal';
        
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const appointmentTime = appointment.appointment_time.substring(0, 5);

        const subject = isUrgent 
            ? `⚠️ Recordatorio URGENTE: Turno en 2 horas - ${appointmentDate}`
            : `📅 Recordatorio: Tu turno de mañana - ${appointmentDate}`;

        const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recordatorio de Turno</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    margin: 0;
                    padding: 20px;
                    background-color: #f4f4f4;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .header {
                    background: ${isUrgent ? '#ff6b6b' : '#007bff'};
                    color: white;
                    padding: 30px 20px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                }
                .content {
                    padding: 30px;
                }
                .appointment-card {
                    background: ${isUrgent ? '#fff5f5' : '#f8f9ff'};
                    border: 2px solid ${isUrgent ? '#ff6b6b' : '#007bff'};
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .appointment-detail {
                    display: flex;
                    justify-content: space-between;
                    margin: 10px 0;
                    padding: 8px 0;
                    border-bottom: 1px solid #eee;
                }
                .appointment-detail:last-child {
                    border-bottom: none;
                }
                .label {
                    font-weight: bold;
                    color: #333;
                }
                .value {
                    color: #666;
                }
                .urgent-notice {
                    background: #ff6b6b;
                    color: white;
                    padding: 15px;
                    border-radius: 5px;
                    text-align: center;
                    margin: 20px 0;
                    font-weight: bold;
                }
                .normal-notice {
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                .footer {
                    background: #f8f9fa;
                    padding: 20px;
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                }
                .btn {
                    display: inline-block;
                    background: ${isUrgent ? '#ff6b6b' : '#007bff'};
                    color: white;
                    padding: 12px 25px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 10px 5px;
                    font-weight: bold;
                }
                .logo {
                    font-size: 28px;
                    margin-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🦷</div>
                    <h1>Consultorio Odontológico</h1>
                    <p>Recordatorio de Turno</p>
                </div>
                
                <div class="content">
                    <h2>Hola ${appointment.patient_name}! 👋</h2>
                    
                    ${isUrgent ? `
                        <div class="urgent-notice">
                            ⚠️ ¡ATENCIÓN! Tu turno es en ${timeText}
                        </div>
                    ` : `
                        <div class="normal-notice">
                            📅 Te recordamos que tienes un turno programado para mañana
                        </div>
                    `}
                    
                    <div class="appointment-card">
                        <h3 style="margin-top: 0; color: ${isUrgent ? '#ff6b6b' : '#007bff'};">
                            📋 Detalles de tu Turno
                        </h3>
                        
                        <div class="appointment-detail">
                            <span class="label">📅 Fecha:</span>
                            <span class="value">${appointmentDate}</span>
                        </div>
                        
                        <div class="appointment-detail">
                            <span class="label">🕐 Hora:</span>
                            <span class="value">${appointmentTime} hs</span>
                        </div>
                        
                        <div class="appointment-detail">
                            <span class="label">🏥 Especialidad:</span>
                            <span class="value">${appointment.specialty_name}</span>
                        </div>
                        
                        <div class="appointment-detail">
                            <span class="label">💰 Precio:</span>
                            <span class="value">$${appointment.price}</span>
                        </div>
                    </div>
                    
                    ${isUrgent ? `
                        <p><strong>🚨 Por favor, confirma tu asistencia lo antes posible.</strong></p>
                        <p>Si no puedes asistir, te pedimos que nos avises con tiempo para poder ofrecerle el turno a otro paciente.</p>
                    ` : `
                        <p>Por favor, confirma tu asistencia y recuerda llegar 10 minutos antes de tu turno.</p>
                        <p>Si necesitas reprogramar o cancelar, hazlo con al menos 4 horas de anticipación.</p>
                    `}
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
                        <h6 style="color: #495057; margin: 0 0 10px 0;">📞 Información de Contacto</h6>
                        <p style="margin: 5px 0; color: #6c757d; font-size: 14px;">
                            <strong>Teléfono:</strong> +54 11 1234-5678
                        </p>
                        <p style="margin: 5px 0; color: #6c757d; font-size: 14px;">
                            <strong>Email:</strong> consultorio@ejemplo.com
                        </p>
                    </div>
                </div>
                
                <div class="footer">
                    <p><strong>Consultorio Odontológico</strong></p>
                    <p>📍 Dirección del Consultorio | 📞 +54 11 1234-5678</p>
                    <p>✉️ info@consultorio.com | 🌐 www.consultorio.com</p>
                    <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">
                    <p style="font-size: 12px; color: #999;">
                        Este es un mensaje automático. Por favor, no responder a este email.
                    </p>
                </div>
            </div>
        </body>
        </html>`;

        return { subject, html };
    }

    async sendAppointmentConfirmation(appointment) {
        try {
            // Verificar que el transporter esté inicializado
            if (!this.transporter) {
                console.warn('⚠️  Servicio de email no disponible, saltando envío de confirmación');
                return {
                    success: false,
                    error: 'Servicio de email no configurado'
                };
            }

            const emailTemplate = this.getConfirmationEmailTemplate(appointment);
            
            const mailOptions = {
                from: `"Consultorio Odontológico" <${process.env.EMAIL_USER}>`,
                to: appointment.email,
                subject: emailTemplate.subject,
                html: emailTemplate.html
            };

            const result = await this.transporter.sendMail(mailOptions);
            // Email de confirmación enviado
            
            return {
                success: true,
                messageId: result.messageId
            };
        } catch (error) {
            console.error('❌ Error enviando email de confirmación:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendAppointmentCancellation(appointment) {
        try {
            // Verificar que el transporter esté inicializado
            if (!this.transporter) {
                console.warn('⚠️  Servicio de email no disponible, saltando envío de cancelación');
                return {
                    success: false,
                    error: 'Servicio de email no configurado'
                };
            }

            const emailTemplate = this.getCancellationEmailTemplate(appointment);
            
            const mailOptions = {
                from: `"Consultorio Odontológico" <${process.env.EMAIL_USER}>`,
                to: appointment.email,
                subject: emailTemplate.subject,
                html: emailTemplate.html
            };

            const result = await this.transporter.sendMail(mailOptions);
            // Email de cancelación enviado
            
            return {
                success: true,
                messageId: result.messageId
            };
        } catch (error) {
            console.error('❌ Error enviando email de cancelación:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getConfirmationEmailTemplate(appointment) {
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const appointmentTime = appointment.appointment_time.substring(0, 5);
        const patientName = `${appointment.first_name} ${appointment.last_name}`;

        const subject = `✅ Turno Confirmado - ${appointmentDate}`;

        const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Turno Confirmado</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    margin: 0;
                    padding: 20px;
                    background-color: #f4f4f4;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #28a745, #20c997);
                    color: white;
                    padding: 30px 20px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                }
                .content {
                    padding: 30px;
                }
                .appointment-card {
                    background: #f8fff9;
                    border: 2px solid #28a745;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .appointment-detail {
                    display: flex;
                    justify-content: space-between;
                    margin: 10px 0;
                    padding: 8px 0;
                    border-bottom: 1px solid #eee;
                }
                .appointment-detail:last-child {
                    border-bottom: none;
                }
                .label {
                    font-weight: bold;
                    color: #333;
                }
                .value {
                    color: #666;
                }
                .success-notice {
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                    text-align: center;
                }
                .footer {
                    background: #f8f9fa;
                    padding: 20px;
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                }
                .btn {
                    display: inline-block;
                    background: #28a745;
                    color: white;
                    padding: 12px 25px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 10px 5px;
                    font-weight: bold;
                }
                .logo {
                    font-size: 28px;
                    margin-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🦷</div>
                    <h1>Consultorio Odontológico</h1>
                    <p>¡Turno Confirmado!</p>
                </div>
                
                <div class="content">
                    <h2>¡Hola ${patientName}! 👋</h2>
                    
                    <div class="success-notice">
                        ✅ Tu turno ha sido registrado exitosamente
                    </div>
                    
                    <div class="appointment-card">
                        <h3 style="margin-top: 0; color: #28a745;">
                            📋 Detalles de tu Turno
                        </h3>
                        
                        <div class="appointment-detail">
                            <span class="label">📅 Fecha:</span>
                            <span class="value">${appointmentDate}</span>
                        </div>
                        
                        <div class="appointment-detail">
                            <span class="label">🕐 Hora:</span>
                            <span class="value">${appointmentTime} hs</span>
                        </div>
                        
                        <div class="appointment-detail">
                            <span class="label">🏥 Especialidad:</span>
                            <span class="value">${appointment.specialty_name}</span>
                        </div>
                        
                        <div class="appointment-detail">
                            <span class="label">💰 Precio:</span>
                            <span class="value">$${appointment.price}</span>
                        </div>
                    </div>
                    
                    <p><strong>📝 Recordatorios importantes:</strong></p>
                    <ul>
                        <li>Llega 10 minutos antes de tu cita</li>
                        <li>Trae tu documento de identidad</li>
                        <li>Si tienes estudios previos, tráelos</li>
                        <li>Puedes cancelar hasta 2 horas antes</li>
                    </ul>
                    
                    <div style="background: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                        <h6 style="color: #1976d2; margin: 0 0 10px 0;">📞 Contacto del Consultorio</h6>
                        <p style="margin: 5px 0; color: #424242; font-size: 14px;">
                            <strong>Teléfono:</strong> +54 11 1234-5678
                        </p>
                        <p style="margin: 5px 0; color: #424242; font-size: 14px;">
                            <strong>Email:</strong> consultorio@ejemplo.com
                        </p>
                        <p style="margin: 10px 0 0 0; color: #666; font-size: 12px; font-style: italic;">
                            Para cancelaciones o consultas
                        </p>
                    </div>
                </div>
                
                <div class="footer">
                    <p><strong>Consultorio Odontológico</strong></p>
                    <p>📍 Dirección del Consultorio | 📞 +54 11 1234-5678</p>
                    <p>✉️ info@consultorio.com | 🌐 www.consultorio.com</p>
                    <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">
                    <p style="font-size: 12px; color: #999;">
                        Este es un mensaje automático. Por favor, no responder a este email.
                    </p>
                </div>
            </div>
        </body>
        </html>`;

        return { subject, html };
    }

    getCancellationEmailTemplate(appointment) {
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const appointmentTime = appointment.appointment_time.substring(0, 5);
        const patientName = `${appointment.first_name} ${appointment.last_name}`;
        
        // Determinar si fue cancelado por admin/odontólogo
        const cancelledByAdmin = appointment.cancelled_by_admin || false;
        const subject = `❌ Turno Cancelado ${cancelledByAdmin ? 'por el Consultorio' : ''} - ${appointmentDate}`;

        const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Turno Cancelado</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    margin: 0;
                    padding: 20px;
                    background-color: #f4f4f4;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #dc3545, #fd7e14);
                    color: white;
                    padding: 30px 20px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                }
                .content {
                    padding: 30px;
                }
                .appointment-card {
                    background: #fff5f5;
                    border: 2px solid #dc3545;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .appointment-detail {
                    display: flex;
                    justify-content: space-between;
                    margin: 10px 0;
                    padding: 8px 0;
                    border-bottom: 1px solid #eee;
                }
                .appointment-detail:last-child {
                    border-bottom: none;
                }
                .label {
                    font-weight: bold;
                    color: #333;
                }
                .value {
                    color: #666;
                }
                .cancellation-notice {
                    background: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                    text-align: center;
                }
                .footer {
                    background: #f8f9fa;
                    padding: 20px;
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                }
                .btn {
                    display: inline-block;
                    background: #007bff;
                    color: white;
                    padding: 12px 25px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 10px 5px;
                    font-weight: bold;
                }
                .logo {
                    font-size: 28px;
                    margin-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🦷</div>
                    <h1>Consultorio Odontológico</h1>
                    <p>Turno Cancelado</p>
                </div>
                
                <div class="content">
                    <h2>Hola ${patientName} 👋</h2>
                    
                    <div class="cancellation-notice">
                        ❌ ${cancelledByAdmin ? 'Tu turno ha sido cancelado por el consultorio' : 'Tu turno ha sido cancelado exitosamente'}
                    </div>
                    
                    <div class="appointment-card">
                        <h3 style="margin-top: 0; color: #dc3545;">
                            📋 Turno Cancelado
                        </h3>
                        
                        <div class="appointment-detail">
                            <span class="label">📅 Fecha:</span>
                            <span class="value">${appointmentDate}</span>
                        </div>
                        
                        <div class="appointment-detail">
                            <span class="label">🕐 Hora:</span>
                            <span class="value">${appointmentTime} hs</span>
                        </div>
                        
                        <div class="appointment-detail">
                            <span class="label">🏥 Especialidad:</span>
                            <span class="value">${appointment.specialty_name}</span>
                        </div>
                        
                        ${appointment.cancellation_reason ? `
                        <div class="appointment-detail">
                            <span class="label">📝 Motivo:</span>
                            <span class="value">${appointment.cancellation_reason}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <p>${cancelledByAdmin ? 
                        'Lamentamos informarte que hemos tenido que cancelar tu turno por motivos del consultorio. Te pedimos disculpas por las molestias ocasionadas.' : 
                        `Lamentamos ${appointment.cancellation_reason ? 'esta situación' : 'que no puedas asistir a tu cita'}.`
                    } Si necesitas agendar un nuevo turno, puedes hacerlo a través de nuestra plataforma web.</p>
                    
                    <p><strong>💡 ¿Necesitas un nuevo turno?</strong></p>
                    <p>Contáctanos para agendar una nueva cita que se ajuste mejor a tu horario.</p>
                    
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                        <h6 style="color: #856404; margin: 0 0 10px 0;">📞 Para Reprogramar tu Cita</h6>
                        <p style="margin: 5px 0; color: #856404; font-size: 14px;">
                            <strong>Teléfono:</strong> +54 11 1234-5678
                        </p>
                        <p style="margin: 5px 0; color: #856404; font-size: 14px;">
                            <strong>Email:</strong> consultorio@ejemplo.com
                        </p>
                        <p style="margin: 10px 0 0 0; color: #856404; font-size: 12px; font-style: italic;">
                            ¡Estamos aquí para ayudarte a agendar una nueva cita!
                        </p>
                    </div>
                </div>
                
                <div class="footer">
                    <p><strong>Consultorio Odontológico</strong></p>
                    <p>📍 Dirección del Consultorio | 📞 +54 11 1234-5678</p>
                    <p>✉️ info@consultorio.com | 🌐 www.consultorio.com</p>
                    <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">
                    <p style="font-size: 12px; color: #999;">
                        Este es un mensaje automático. Por favor, no responder a este email.
                    </p>
                </div>
            </div>
        </body>
        </html>`;

        return { subject, html };
    }

    // ===== RECUPERACIÓN DE CONTRASEÑA =====
    async sendPasswordResetEmail(user, token) {
        try {
            if (!this.transporter) {
                console.warn('⚠️  Servicio de email no disponible, saltando envío de recuperación');
                return {
                    success: false,
                    error: 'Servicio de email no configurado'
                };
            }

            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
            
            const mailOptions = {
                from: `"Consultorio Roxana López" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: '🔐 Recuperación de Contraseña - Consultorio Roxana López',
                html: `
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Recuperación de Contraseña</title>
                    </head>
                    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa;">
                        <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 15px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.1);">
                            <!-- Header -->
                            <div style="background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); color: white; padding: 30px; text-align: center;">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700;">🔐 Recuperar Contraseña</h1>
                                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Consultorio Roxana López</p>
                            </div>
                            
                            <!-- Content -->
                            <div style="padding: 40px 30px;">
                                <p style="font-size: 18px; color: #2c3e50; margin-bottom: 20px;">
                                    <strong>Hola ${user.firstName} ${user.lastName},</strong>
                                </p>
                                
                                <p style="font-size: 16px; color: #555; margin-bottom: 25px;">
                                    Recibimos una solicitud para restablecer la contraseña de tu cuenta en nuestro sistema de turnos.
                                </p>
                                
                                <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 25px 0; border-radius: 8px;">
                                    <p style="margin: 0; color: #1976d2; font-weight: 600;">
                                        <i>🛡️ Por tu seguridad</i>
                                    </p>
                                    <p style="margin: 10px 0 0 0; color: #555; font-size: 14px;">
                                        Este enlace es válido por <strong>1 hora</strong> y solo puede usarse una vez.
                                    </p>
                                </div>
                                
                                <!-- Reset Button -->
                                <div style="text-align: center; margin: 35px 0;">
                                    <a href="${resetUrl}" 
                                       style="display: inline-block; background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); 
                                              color: white; text-decoration: none; padding: 15px 35px; border-radius: 25px; 
                                              font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
                                              transition: all 0.3s ease;">
                                        🔓 Restablecer Mi Contraseña
                                    </a>
                                </div>
                                
                                <p style="font-size: 14px; color: #777; margin: 25px 0;">
                                    Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
                                </p>
                                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 13px; color: #666;">
                                    ${resetUrl}
                                </div>
                                
                                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                    <p style="margin: 0; color: #856404; font-weight: 600;">
                                        ⚠️ ¿No solicitaste este cambio?
                                    </p>
                                    <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">
                                        Si no fuiste tú quien solicitó restablecer la contraseña, puedes ignorar este email de forma segura. 
                                        Tu contraseña no cambiará hasta que uses el enlace de arriba.
                                    </p>
                                </div>
                            </div>
                            
                            <!-- Footer -->
                            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e9ecef;">
                                <p style="margin: 0; color: #666; font-size: 14px;">
                                    <strong>Consultorio Roxana López</strong><br>
                                    Sistema de Gestión de Turnos
                                </p>
                                <p style="margin: 15px 0 0 0; font-size: 12px; color: #999;">
                                    Este es un mensaje automático. Por favor, no responder a este email.
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email de recuperación enviado a ${user.email}`);
            
            return {
                success: true,
                messageId: result.messageId,
                message: 'Email de recuperación enviado exitosamente'
            };

        } catch (error) {
            console.error('❌ Error enviando email de recuperación:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendPasswordResetConfirmation(email) {
        try {
            if (!this.transporter) {
                console.warn('⚠️  Servicio de email no disponible, saltando confirmación');
                return {
                    success: false,
                    error: 'Servicio de email no configurado'
                };
            }
            
            const mailOptions = {
                from: `"Consultorio Roxana López" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: '✅ Contraseña Restablecida Exitosamente',
                html: `
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Contraseña Restablecida</title>
                    </head>
                    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa;">
                        <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 15px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.1);">
                            <!-- Header -->
                            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center;">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700;">✅ Contraseña Restablecida</h1>
                                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Consultorio Roxana López</p>
                            </div>
                            
                            <!-- Content -->
                            <div style="padding: 40px 30px; text-align: center;">
                                <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
                                
                                <h2 style="color: #28a745; margin-bottom: 20px;">¡Listo!</h2>
                                
                                <p style="font-size: 18px; color: #555; margin-bottom: 25px;">
                                    Tu contraseña ha sido restablecida exitosamente.
                                </p>
                                
                                <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                    <p style="margin: 0; color: #155724; font-weight: 600;">
                                        🔐 Tu cuenta está segura
                                    </p>
                                    <p style="margin: 10px 0 0 0; color: #155724; font-size: 14px;">
                                        Ya puedes acceder a tu cuenta con tu nueva contraseña.
                                    </p>
                                </div>
                                
                                <div style="margin: 35px 0;">
                                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
                                       style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                                              color: white; text-decoration: none; padding: 15px 35px; border-radius: 25px; 
                                              font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
                                        🚀 Acceder al Sistema
                                    </a>
                                </div>
                                
                                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                    <p style="margin: 0; color: #856404; font-weight: 600;">
                                        💡 Consejo de seguridad
                                    </p>
                                    <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">
                                        Recuerda usar una contraseña fuerte y no compartirla con nadie. 
                                        Si no fuiste tú quien cambió la contraseña, contacta con nosotros inmediatamente.
                                    </p>
                                </div>
                            </div>
                            
                            <!-- Footer -->
                            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e9ecef;">
                                <p style="margin: 0; color: #666; font-size: 14px;">
                                    <strong>Consultorio Roxana López</strong><br>
                                    Sistema de Gestión de Turnos
                                </p>
                                <p style="margin: 15px 0 0 0; font-size: 12px; color: #999;">
                                    Fecha de restablecimiento: ${new Date().toLocaleString('es-AR')}
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email de confirmación enviado a ${email}`);
            
            return {
                success: true,
                messageId: result.messageId,
                message: 'Email de confirmación enviado exitosamente'
            };

        } catch (error) {
            console.error('❌ Error enviando email de confirmación:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

}

module.exports = new EmailService();