require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/database');

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rechazada no manejada:', reason);
  process.exit(1);
});

// Importar rutas del sistema
const rutasAutenticacion = require('./routes/auth');
const rutasUsuarios = require('./routes/users');
const rutasTurnos = require('./routes/appointments');
const rutasAdministracion = require('./routes/admin');
const rutasRecuperacionClave = require('./routes/password-reset');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad con CSP configurado
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      scriptSrcAttr: [
        "'unsafe-inline'",
        "'unsafe-hashes'"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      styleSrcAttr: [
        "'unsafe-inline'"
      ],
      fontSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));

// Configurar CORS
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como aplicaciones móviles o Postman)
    // y archivos locales (origin será null)
    if (!origin || origin === 'null') return callback(null, true);
    
    // Permitir orígenes configurados
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // En desarrollo, ser más permisivo
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Rechazar otros orígenes
    const msg = 'El origen CORS no está permitido';
    return callback(new Error(msg), false);
  },
  credentials: true
}));

// Limitador de solicitudes - más permisivo en desarrollo
const limitadorSolicitudes = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // 1000 requests en desarrollo, 100 en producción
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intente nuevamente más tarde.',
    retryAfter: Math.ceil(15 * 60) // segundos hasta que se reinicie
  }
});
app.use('/api/', limitadorSolicitudes);

// Middleware para parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
const path = require('path');
app.use(express.static(path.join(__dirname, '../../frontend')));

// Rutas de la API del sistema
console.log('🔧 Cargando rutas del sistema...');

// Manejo del favicon para evitar errores 404
app.get('/favicon.ico', (req, res) => {
  res.status(204).send();
});

// Ruta para obtener configuración del cliente
app.get('/api/config', (req, res) => {
  res.json({
    maxBookingDays: parseInt(process.env.MAX_BOOKING_DAYS) || 365,
    environment: process.env.NODE_ENV || 'development'
  });
});

try {
  console.log('🔧 Configurando rutas del sistema...');
  app.use('/api/auth', rutasAutenticacion);
  app.use('/api/users', rutasUsuarios);
  app.use('/api/appointments', rutasTurnos);
  app.use('/api/admin', rutasAdministracion);
  app.use('/api/password-reset', rutasRecuperacionClave);
  
  // Las rutas de especialidades están en /api/admin/especialidades y /api/appointments/especialidades
  console.log('✅ Rutas cargadas correctamente');
} catch (error) {
  console.error('❌ Error cargando rutas:', error);
  process.exit(1);
}

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Servidor del consultorio odontológico funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Ruta para la página principal
app.get('/', (req, res) => {
  console.log('✅ CONEXIÓN EXITOSA: Página principal cargada correctamente');
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// Ruta para el panel de administración
app.get('/admin', (req, res) => {
  console.log('✅ CONEXIÓN EXITOSA: Panel de administración cargado correctamente');
  res.sendFile(path.join(__dirname, '../../frontend/admin.html'));
});

// Silenciar errores de Chrome DevTools y otros archivos well-known
app.get('/.well-known/*', (req, res) => {
  res.status(204).send();
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Algo salió mal en el servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  });
});

// Manejo de rutas no encontradas con logging mejorado
app.use('*', (req, res) => {
  // Solo mostrar errores 404 que no sean de Chrome DevTools o archivos del sistema
  if (!req.originalUrl.includes('.well-known') && 
      !req.originalUrl.includes('favicon.ico') &&
      !req.originalUrl.includes('manifest.json')) {
    console.log(`❌ ERROR 404: ${req.method} ${req.originalUrl}`);
    console.log(`   Headers: ${JSON.stringify(req.headers['user-agent'] || 'N/A')}`);
  }
  
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({
      error: 'Endpoint de API no encontrado',
      message: `La ruta de API ${req.originalUrl} no existe en este servidor`,
      method: req.method
    });
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html><head><title>404 - Archivo no encontrado</title></head>
      <body>
        <h1>404 - Archivo no encontrado</h1>
        <p>El archivo <code>${req.originalUrl}</code> no se encuentra en este servidor.</p>
        <p><a href="/">Volver al inicio</a></p>
      </body></html>
    `);
  }
});

// Iniciar servidor del consultorio
const iniciarServidor = async () => {
  try {
    // Probar conexión a la base de datos
    const conexionBD = await testConnection();
    
    if (!conexionBD) {
      console.log('⚠️  Iniciando servidor sin conexión a la base de datos');
      console.log('   Asegúrate de que MySQL esté ejecutándose y configurado correctamente');
    } else {
      // Inicializar servicio de recordatorios solo si hay conexión a BD
      console.log('📧 Inicializando servicio de recordatorios...');
      require('./services/reminderService');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 API disponible en http://localhost:${PORT}/api/health`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      if (conexionBD) {
        console.log('📬 Sistema de recordatorios por email activo');
      }
    });
    
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

iniciarServidor();