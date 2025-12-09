const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, requireOwnershipOrAdmin } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Configuración específica de horarios del consultorio odontológico
function obtenerHorariosConsultorio(diaDeLaSemana) {
  const horariosConfiguracion = {
    1: { // Lunes - último turno 12:00 (termina 12:30)
      periodos: [{ inicio: '09:00', fin: '12:30', ultimoTurno: '12:00' }]
    },
    2: { // Martes - último turno 20:30 (termina 21:00) 
      periodos: [{ inicio: '15:00', fin: '21:00', ultimoTurno: '20:30' }]
    },
    3: { // Miércoles - último turno 12:00 (termina 12:30)
      periodos: [{ inicio: '09:00', fin: '12:30', ultimoTurno: '12:00' }]
    },
    4: { // Jueves - último turno 20:30 (termina 21:00)
      periodos: [{ inicio: '15:00', fin: '21:00', ultimoTurno: '20:30' }]
    },
    5: { // Viernes - último turno 12:00 (termina 12:30)
      periodos: [{ inicio: '09:00', fin: '12:30', ultimoTurno: '12:00' }]
    }
    // Sábado (6) y Domingo (0) no tienen horarios configurados
  };
  
  return horariosConfiguracion[diaDeLaSemana] || null;
}

// Validaciones para crear nuevo turno
const validacionesCrearTurno = [
  body('specialtyId').isInt({ min: 1 }).withMessage('Debe seleccionar una especialidad válida'),
  body('appointmentDate').isDate().withMessage('Debe proporcionar una fecha válida'),
  body('appointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Debe proporcionar una hora válida (HH:MM)'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Las notas no pueden exceder 500 caracteres')
];

// Obtener especialidades odontológicas disponibles
router.get('/especialidades', async (req, res) => {
  try {
    const [especialidades] = await pool.execute(
      'SELECT id, name, description, duration_minutes, price FROM specialties WHERE active = true ORDER BY name'
    );

    res.json({
      message: 'Especialidades obtenidas exitosamente',
      specialties: especialidades
    });

  } catch (error) {
    console.error('Error obteniendo especialidades:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener las especialidades'
    });
  }
});

// Obtener horarios disponibles para una fecha específica
router.get('/horarios-disponibles', async (req, res) => {
  try {
    const { date, specialtyId } = req.query;

    if (!date || !specialtyId) {
      return res.status(400).json({
        error: 'Parámetros requeridos',
        message: 'Debe proporcionar fecha y especialidad'
      });
    }

    // Verificar que la fecha no sea en el pasado (permitir el día actual)
    const fechaSeleccionada = new Date(date + 'T00:00:00');
    const fechaHoy = new Date();
    fechaHoy.setHours(0, 0, 0, 0);

    // Solo bloquear fechas anteriores a hoy (permitir hoy y fechas futuras)
    if (fechaSeleccionada.getTime() < fechaHoy.getTime()) {
      return res.status(400).json({
        error: 'Fecha inválida',
        message: 'No se pueden reservar turnos en fechas pasadas. Puedes reservar desde hoy en adelante.'
      });
    }

    // Verificar que la especialidad odontológica existe
    const [especialidades] = await pool.execute(
      'SELECT duration_minutes FROM specialties WHERE id = ? AND active = true',
      [specialtyId]
    );

    if (especialidades.length === 0) {
      return res.status(404).json({
        error: 'Especialidad no encontrada',
        message: 'La especialidad seleccionada no existe o no está activa'
      });
    }

    // Obtener día de la semana (0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado)
    const diaDeLaSemana = fechaSeleccionada.getDay();

    // Configuración de horarios específicos del consultorio
    const configuracionHorarios = obtenerHorariosConsultorio(diaDeLaSemana);

    if (!configuracionHorarios) {
      return res.json({
        message: 'No hay horarios disponibles para esta fecha',
        availableSlots: []
      });
    }

    // Verificar si es día no laborable (feriado)
    const [diasNoLaborables] = await pool.execute(
      'SELECT reason FROM non_working_days WHERE date = ?',
      [date]
    );

    if (diasNoLaborables.length > 0) {
      return res.json({
        message: `Día no laborable: ${diasNoLaborables[0].reason}`,
        availableSlots: []
      });
    }

    // Generar horarios de tiempo con configuración específica del consultorio
    const duracionEspecialidad = especialidades[0].duration_minutes;
    const horariosDisponibles = [];
    const duracionTurno = 30; // 30 minutos por turno

    // Generar horarios para cada período de atención del día
    configuracionHorarios.periodos.forEach(periodo => {
      const horaInicio = new Date(`2000-01-01T${periodo.inicio}:00`);
      // Usar ultimoTurno si está definido, sino usar fin
      const ultimaHoraPermitida = periodo.ultimoTurno || periodo.fin;
      const horaFinal = new Date(`2000-01-01T${ultimaHoraPermitida}:00`);
      const duracionTurnoMs = duracionTurno * 60 * 1000; // en milisegundos

      let horaActual = horaInicio;
      
      // Generar horarios hasta e incluyendo el último turno permitido
      while (horaActual <= horaFinal) {
        const horarioTexto = horaActual.toTimeString().slice(0, 5); // HH:MM
        
        // Agregar el horario si está dentro del rango permitido
        if (horarioTexto <= ultimaHoraPermitida) {
          horariosDisponibles.push(horarioTexto);
        } else {
          break;
        }

        horaActual = new Date(horaActual.getTime() + duracionTurnoMs);
      }
    });

    // Obtener turnos ya reservados para esta fecha (excluir cancelados y no show)
    const [turnosReservados] = await pool.execute(
      `SELECT appointment_time 
       FROM appointments 
       WHERE appointment_date = ? 
       AND status NOT IN ('cancelled', 'no_show')`,
      [date]
    );

    const horasOcupadas = turnosReservados.map(turno => turno.appointment_time.slice(0, 5));
    
    // Filtrar horarios realmente disponibles
    const horariosLibres = horariosDisponibles.filter(horario => !horasOcupadas.includes(horario));

    res.json({
      message: 'Horarios obtenidos exitosamente',
      availableSlots: horariosLibres,
      totalSlots: horariosDisponibles.length,
      bookedSlots: horasOcupadas.length
    });

  } catch (error) {
    console.error('Error obteniendo horarios disponibles:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los horarios disponibles'
    });
  }
});

// Crear nuevo turno para paciente
router.post('/', authenticateToken, validacionesCrearTurno, async (req, res) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({
        error: 'Datos inválidos para crear el turno',
        details: errores.array()
      });
    }

    const { specialtyId, appointmentDate, appointmentTime, notes } = req.body;
    const idUsuario = req.user.id;

    // Verificar que la especialidad odontológica existe
    const [especialidades] = await pool.execute(
      'SELECT name, duration_minutes FROM specialties WHERE id = ? AND active = true',
      [specialtyId]
    );

    if (especialidades.length === 0) {
      return res.status(404).json({
        error: 'Especialidad no encontrada',
        message: 'La especialidad seleccionada no existe'
      });
    }

    // Verificar que el horario esté disponible (doble verificación de disponibilidad)
    const [turnosExistentes] = await pool.execute(
      `SELECT id, user_id, status 
       FROM appointments 
       WHERE appointment_date = ? AND appointment_time = ? 
       AND status NOT IN ('cancelled', 'no_show')`,
      [appointmentDate, appointmentTime]
    );

    if (turnosExistentes.length > 0) {
      return res.status(409).json({
        error: 'Horario no disponible',
        message: 'Este horario acaba de ser reservado por otro paciente. Por favor, seleccione otro horario.',
        code: 'TIME_SLOT_TAKEN'
      });
    }

    // Verificar que el usuario no tenga más de 3 turnos confirmados
    const [userAppointments] = await pool.execute(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE user_id = ? AND status = 'confirmed'`,
      [idUsuario]
    );

    if (userAppointments[0].count >= 3) {
      return res.status(400).json({
        error: 'Límite de turnos excedido',
        message: 'No puede tener más de 3 turnos pendientes simultáneamente'
      });
    }

    // Verificar si existe un turno cancelado en ese horario que podamos reutilizar
    const [cancelledAppointment] = await pool.execute(
      `SELECT id FROM appointments 
       WHERE appointment_date = ? AND appointment_time = ? 
       AND status IN ('cancelled', 'no_show')
       LIMIT 1`,
      [appointmentDate, appointmentTime]
    );

    let appointmentId;

    if (cancelledAppointment.length > 0) {
      // Reutilizar el turno cancelado actualizando sus datos
      await pool.execute(
        `UPDATE appointments 
         SET user_id = ?, specialty_id = ?, notes = ?, status = 'confirmed', 
             cancelled_by_admin = NULL, updated_at = NOW()
         WHERE id = ?`,
        [idUsuario, specialtyId, notes || null, cancelledAppointment[0].id]
      );
      
      appointmentId = cancelledAppointment[0].id;
    } else {
      // Crear nuevo turno si no hay ninguno cancelado
      const [result] = await pool.execute(
        `INSERT INTO appointments (user_id, specialty_id, appointment_date, appointment_time, notes, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'confirmed', NOW())`,
        [idUsuario, specialtyId, appointmentDate, appointmentTime, notes || null]
      );
      
      appointmentId = result.insertId;
    }

    // Obtener el turno creado/actualizado con información completa
    const [newAppointment] = await pool.execute(
      `SELECT 
        a.id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.notes,
        s.name as specialty_name,
        s.duration_minutes,
        s.price,
        u.first_name,
        u.last_name,
        u.email
      FROM appointments a
      JOIN specialties s ON a.specialty_id = s.id
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?`,
      [appointmentId]
    );

    // Enviar email de confirmación
    try {
      await emailService.sendAppointmentConfirmation(newAppointment[0]);
    } catch (emailError) {
      console.error('Error enviando email de confirmación:', emailError);
      // No fallar la creación del turno si el email falla
    }

    res.status(201).json({
      message: 'Turno creado exitosamente',
      appointment: newAppointment[0]
    });

  } catch (error) {
    console.error('Error creando turno:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo crear el turno'
    });
  }
});

// RUTAS ESPECÍFICAS (deben ir antes de las rutas con parámetros)

// Ruta de prueba pública (temporal para debug)
router.get('/prueba-publica', (req, res) => {
  res.json({
    message: 'Esta es una ruta pública de prueba',
    timestamp: new Date().toISOString()
  });
});

// Obtener días no laborables (público - para mostrar en calendario)
router.get('/dias-no-laborables', async (req, res) => {
  try {
    const { year, month } = req.query;
    
    let query = `
      SELECT 
        id,
        date,
        start_date,
        end_date,
        reason,
        description
      FROM non_working_days
    `;
    const params = [];
    
    // Filtrar por año/mes si se proporcionan
    if (year) {
      if (month) {
        // Filtrar por mes y año específicos
        const monthStart = `${year}-${month.padStart(2, '0')}-01`;
        const monthEnd = `${year}-${month.padStart(2, '0')}-31`;
        query += ` WHERE 
          (date BETWEEN ? AND ?) OR 
          (start_date <= ? AND end_date >= ?) OR
          (start_date BETWEEN ? AND ?)
        `;
        params.push(monthStart, monthEnd, monthEnd, monthStart, monthStart, monthEnd);
      } else {
        // Solo filtrar por año
        query += ` WHERE 
          YEAR(date) = ? OR 
          YEAR(start_date) = ? OR 
          YEAR(end_date) = ?
        `;
        params.push(year, year, year);
      }
    }
    
    query += ' ORDER BY date ASC, start_date ASC';
    
    const [nonWorkingDays] = await pool.execute(query, params);
    
    // Procesar los datos para generar lista de fechas bloqueadas
    const blockedDates = [];
    
    nonWorkingDays.forEach(item => {
      if (item.date) {
        // Día específico
        blockedDates.push({
          date: item.date,
          reason: item.reason,
          description: item.description,
          type: 'single'
        });
      } else if (item.start_date && item.end_date) {
        // Rango de fechas - generar todas las fechas del rango
        const startDate = new Date(item.start_date);
        const endDate = new Date(item.end_date);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          blockedDates.push({
            date: d.toISOString().split('T')[0],
            reason: item.reason,
            description: item.description,
            type: 'range'
          });
        }
      }
    });

    res.json({
      message: 'Días no laborables obtenidos exitosamente',
      blockedDates: blockedDates.sort((a, b) => new Date(a.date) - new Date(b.date))
    });

  } catch (error) {
    console.error('Error obteniendo días no laborables:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los días no laborables'
    });
  }
});

// RUTAS CON PARÁMETROS (deben ir después de las rutas específicas)

// Obtener detalles de un turno específico
router.get('/:appointmentId', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const [appointments] = await pool.execute(
      `SELECT 
        a.id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.notes,
        a.user_id,
        s.name as specialty_name,
        s.duration_minutes,
        s.price,
        u.first_name,
        u.last_name,
        u.email,
        u.phone
      FROM appointments a
      JOIN specialties s ON a.specialty_id = s.id
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?`,
      [appointmentId]
    );

    if (appointments.length === 0) {
      return res.status(404).json({
        error: 'Turno no encontrado',
        message: 'No se encontró un turno con el ID proporcionado'
      });
    }

    const appointment = appointments[0];

    // Verificar permisos (solo el dueño del turno o admin)
    if (req.user.role !== 'admin' && req.user.id !== appointment.user_id) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tiene permisos para ver este turno'
      });
    }

    res.json({
      message: 'Turno obtenido exitosamente',
      appointment
    });

  } catch (error) {
    console.error('Error obteniendo turno:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener el turno'
    });
  }
});

// Cancelar turno
router.put('/:appointmentId/cancelar', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // Obtener información completa del turno
    const [appointments] = await pool.execute(
      `SELECT 
        a.user_id, 
        a.appointment_date, 
        a.appointment_time, 
        a.status,
        s.name as specialty_name,
        s.price,
        u.first_name,
        u.last_name,
        u.email
       FROM appointments a
       JOIN specialties s ON a.specialty_id = s.id
       JOIN users u ON a.user_id = u.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    if (appointments.length === 0) {
      return res.status(404).json({
        error: 'Turno no encontrado',
        message: 'No se encontró un turno con el ID proporcionado'
      });
    }

    const appointment = appointments[0];

    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.id !== appointment.user_id) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tiene permisos para cancelar este turno'
      });
    }

    // Verificar que el turno se pueda cancelar
    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        error: 'Turno ya cancelado',
        message: 'Este turno ya ha sido cancelado'
      });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({
        error: 'No se puede cancelar',
        message: 'No se puede cancelar un turno que ya fue completado'
      });
    }

    // Verificar tiempo mínimo de cancelación (2 horas por defecto)
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 2 && req.user.role !== 'admin') {
      return res.status(400).json({
        error: 'Cancelación no permitida',
        message: 'Los turnos deben cancelarse con al menos 2 horas de anticipación'
      });
    }

    // Cancelar el turno
    await pool.execute(
      'UPDATE appointments SET status = "cancelled", updated_at = NOW() WHERE id = ?',
      [appointmentId]
    );

    // Enviar email de cancelación
    try {
      await emailService.sendAppointmentCancellation(appointment);
    } catch (emailError) {
      console.error('Error enviando email de cancelación:', emailError);
      // No fallar la cancelación si el email falla
    }

    res.json({
      message: 'Turno cancelado exitosamente',
      appointmentId: parseInt(appointmentId)
    });

  } catch (error) {
    console.error('Error cancelando turno:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo cancelar el turno'
    });
  }
});

// Ruta para probar el envío de emails (solo para desarrollo)
router.post('/prueba-email', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Solo los administradores pueden probar el sistema de emails'
      });
    }

    const { email, type } = req.body;

    if (!email || !type) {
      return res.status(400).json({
        error: 'Parámetros requeridos',
        message: 'Debe proporcionar email y type (confirmation, cancellation, test)'
      });
    }

    let result;

    switch (type) {
      case 'test':
        result = await emailService.sendTestEmail(email);
        break;
      
      case 'confirmation':
        // Email de prueba con datos ficticios
        const mockConfirmationData = {
          first_name: 'Juan',
          last_name: 'Pérez',
          email: email,
          appointment_date: new Date().toISOString().split('T')[0],
          appointment_time: '14:30:00',
          specialty_name: 'Limpieza Dental',
          price: 5000
        };
        result = await emailService.sendAppointmentConfirmation(mockConfirmationData);
        break;
      
      case 'cancellation':
        // Email de prueba con datos ficticios
        const mockCancellationData = {
          first_name: 'María',
          last_name: 'González',
          email: email,
          appointment_date: new Date().toISOString().split('T')[0],
          appointment_time: '10:00:00',
          specialty_name: 'Consulta General'
        };
        result = await emailService.sendAppointmentCancellation(mockCancellationData);
        break;
      
      default:
        return res.status(400).json({
          error: 'Tipo inválido',
          message: 'Los tipos válidos son: test, confirmation, cancellation'
        });
    }

    res.json({
      message: 'Email enviado exitosamente',
      success: result.success,
      messageId: result.messageId || null,
      error: result.error || null
    });

  } catch (error) {
    console.error('Error en test de email:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo enviar el email de prueba'
    });
  }
});

module.exports = router;