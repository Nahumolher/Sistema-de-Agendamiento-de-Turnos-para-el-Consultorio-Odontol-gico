const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Middleware para verificar token de autenticación JWT
const verificarTokenAutenticacion = async (req, res, next) => {
  const cabeceraAutorizacion = req.headers['authorization'];
  const token = cabeceraAutorizacion && cabeceraAutorizacion.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Token de acceso requerido',
      message: 'Debe proporcionar un token de autenticación válido'
    });
  }

  try {
    const tokenDecodificado = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario aún existe en la base de datos
    const [usuarios] = await pool.execute(
      'SELECT id, email, role, active FROM users WHERE id = ?',
      [tokenDecodificado.userId]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        error: 'Usuario no encontrado',
        message: 'El usuario asociado al token no existe'
      });
    }

    const usuario = usuarios[0];
    
    if (!usuario.active) {
      return res.status(401).json({
        error: 'Usuario inactivo',
        message: 'Su cuenta ha sido desactivada'
      });
    }

    req.user = {
      id: usuario.id,
      email: usuario.email,
      role: usuario.role
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        message: 'Su sesión ha expirado, por favor inicie sesión nuevamente'
      });
    }
    
    return res.status(403).json({
      error: 'Token inválido',
      message: 'El token de autenticación no es válido'
    });
  }
};

// Middleware para verificar rol de administrador del consultorio
const requerirRolAdministrador = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      error: 'Acceso denegado',
      message: 'Se requieren privilegios de administrador para esta acción'
    });
  }
};

// Middleware para verificar que el usuario accede a sus propios datos o es admin
const requerirPropietarioOAdmin = (req, res, next) => {
  const idUsuarioSolicitado = req.params.userId || req.body.userId;
  
  if (req.user.role === 'admin' || req.user.id == idUsuarioSolicitado) {
    next();
  } else {
    res.status(403).json({
      error: 'Acceso denegado',
      message: 'Solo puede acceder a sus propios datos'
    });
  }
};

module.exports = {
  authenticateToken: verificarTokenAutenticacion,
  requireAdmin: requerirRolAdministrador,
  requireOwnershipOrAdmin: requerirPropietarioOAdmin
};