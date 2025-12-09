const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, requireOwnershipOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Obtener perfil de usuario
router.get('/profile/:userId', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const [users] = await pool.execute(
      `SELECT id, first_name, last_name, email, phone, dni, birth_date, role, active, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró un usuario con el ID proporcionado'
      });
    }

    const user = users[0];
    
    // Obtener estadísticas de turnos si es paciente
    if (user.role === 'patient') {
      const [appointmentStats] = await pool.execute(
        `SELECT 
          COUNT(*) as total_appointments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_appointments,
          MAX(appointment_date) as last_appointment_date
        FROM appointments WHERE user_id = ?`,
        [userId]
      );
      
      user.appointment_stats = appointmentStats[0];
    }

    res.json({
      message: 'Perfil obtenido exitosamente',
      user
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener el perfil del usuario'
    });
  }
});

// Actualizar perfil de usuario
router.put('/profile/:userId', 
  authenticateToken, 
  requireOwnershipOrAdmin,
  [
    body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres'),
    body('lastName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('El apellido debe tener entre 2 y 50 caracteres'),
    body('phone').optional().isMobilePhone('es-AR').withMessage('Debe proporcionar un número de teléfono válido'),
    body('birthDate').optional().isDate().withMessage('Debe proporcionar una fecha de nacimiento válida')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos inválidos',
          details: errors.array()
        });
      }

      const { userId } = req.params;
      const { firstName, lastName, phone, birthDate } = req.body;

      const updateFields = [];
      const updateValues = [];

      if (firstName) {
        updateFields.push('first_name = ?');
        updateValues.push(firstName);
      }
      if (lastName) {
        updateFields.push('last_name = ?');
        updateValues.push(lastName);
      }
      if (phone) {
        updateFields.push('phone = ?');
        updateValues.push(phone);
      }
      if (birthDate) {
        updateFields.push('birth_date = ?');
        updateValues.push(birthDate);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          error: 'No hay datos para actualizar',
          message: 'Debe proporcionar al menos un campo para actualizar'
        });
      }

      updateValues.push(userId);

      await pool.execute(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Obtener usuario actualizado
      const [updatedUsers] = await pool.execute(
        'SELECT id, first_name, last_name, email, phone, dni, birth_date, role FROM users WHERE id = ?',
        [userId]
      );

      res.json({
        message: 'Perfil actualizado exitosamente',
        user: updatedUsers[0]
      });

    } catch (error) {
      console.error('Error actualizando perfil:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        message: 'No se pudo actualizar el perfil'
      });
    }
  }
);

// Obtener turnos del usuario
router.get('/:userId/appointments', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, limit = 10, offset = 0 } = req.query;

    let query = `
      SELECT 
        a.id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.notes,
        a.cancelled_by_admin,
        s.name as specialty_name,
        s.duration_minutes,
        s.price,
        a.created_at
      FROM appointments a
      JOIN specialties s ON a.specialty_id = s.id
      WHERE a.user_id = ?
    `;
    const queryParams = [userId];

    if (status) {
      query += ' AND a.status = ?';
      queryParams.push(status);
    }

    query += ` ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    const [appointments] = await pool.execute(query, queryParams);

    // Obtener total de turnos para paginación
    let countQuery = 'SELECT COUNT(*) as total FROM appointments WHERE user_id = ?';
    const countParams = [userId];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      message: 'Turnos obtenidos exitosamente',
      appointments,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });

  } catch (error) {
    console.error('Error obteniendo turnos del usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los turnos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;