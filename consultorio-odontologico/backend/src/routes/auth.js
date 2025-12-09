const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validaciones para registro de nuevos usuarios
const validacionesRegistro = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('El apellido debe tener entre 2 y 50 caracteres'),
  body('email').isEmail().normalizeEmail().withMessage('Debe proporcionar un email válido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('phone').matches(/^[\d\s\-\+\(\)]+$/).isLength({ min: 8, max: 20 }).withMessage('Debe proporcionar un número de teléfono válido (solo números, espacios, guiones, + y paréntesis)'),
  body('dni').isLength({ min: 7, max: 8 }).isNumeric().withMessage('El DNI debe tener 7 u 8 dígitos numéricos')
];

// Validaciones para iniciar sesión
const validacionesInicioSesion = [
  body('email').isEmail().normalizeEmail().withMessage('Debe proporcionar un email válido'),
  body('password').notEmpty().withMessage('La contraseña es requerida')
];

// Registro de nuevo usuario en el sistema
router.post('/registrarse', validacionesRegistro, async (req, res) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de registro inválidos',
        details: errores.array()
      });
    }

    const { firstName, lastName, email, password, phone, dni, birthDate } = req.body;

    // Verificar si el usuario ya existe en el sistema
    const [usuariosExistentes] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR dni = ?',
      [email, dni]
    );

    if (usuariosExistentes.length > 0) {
      return res.status(409).json({
        error: 'Usuario ya existe',
        message: 'Ya existe un usuario con ese email o DNI'
      });
    }

    // Encriptar contraseña del usuario
    const rondasSalt = 12;
    const claveEncriptada = await bcrypt.hash(password, rondasSalt);

    // Insertar nuevo usuario en la base de datos
    const [resultado] = await pool.execute(
      `INSERT INTO users (first_name, last_name, email, password, phone, dni, birth_date, role, active, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'patient', true, NOW())`,
      [firstName, lastName, email, claveEncriptada, phone, dni, birthDate || null]
    );

    // Generar token de autenticación JWT
    const tokenAutenticacion = jwt.sign(
      { userId: resultado.insertId, email: email, role: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: resultado.insertId,
        firstName,
        lastName,
        email,
        role: 'patient'
      },
      token: tokenAutenticacion
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo completar el registro'
    });
  }
});

// Iniciar sesión de usuario
router.post('/iniciar-sesion', validacionesInicioSesion, async (req, res) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de inicio de sesión inválidos',
        details: errores.array()
      });
    }

    const { email, password } = req.body;

    // Buscar usuario en la base de datos
    const [usuarios] = await pool.execute(
      'SELECT id, first_name, last_name, email, password, role, active FROM users WHERE email = ?',
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
    }

    const usuario = usuarios[0];

    if (!usuario.active) {
      return res.status(401).json({
        error: 'Cuenta desactivada',
        message: 'Su cuenta ha sido desactivada. Contacte al administrador.'
      });
    }

    // Verificar contraseña del usuario
    const claveCoincide = await bcrypt.compare(password, usuario.password);
    if (!claveCoincide) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
    }

    // Generar token de autenticación JWT
    const tokenSesion = jwt.sign(
      { userId: usuario.id, email: usuario.email, role: usuario.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: usuario.id,
        firstName: usuario.first_name,
        lastName: usuario.last_name,
        email: usuario.email,
        role: usuario.role
      },
      token: tokenSesion
    });

  } catch (error) {
    console.error('Error en inicio de sesión:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo completar el inicio de sesión'
    });
  }
});

// Verificar token de autenticación (para mantener sesión activa)
router.get('/verificar-sesion', authenticateToken, (req, res) => {
  res.json({
    message: 'Token de autenticación válido',
    user: req.user
  });
});

// Cerrar sesión (invalidar token del lado del cliente)
router.post('/cerrar-sesion', (req, res) => {
  res.json({
    message: 'Cierre de sesión exitoso',
    note: 'Elimine el token del almacenamiento local'
  });
});

module.exports = router;