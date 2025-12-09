# Endpoints del Backend

## auth.js (Autenticación)
- `POST /registrarse` — Registro de usuario.
- `POST /iniciar-sesion` — Inicio de sesión.
- `GET /verificar-sesion` — Verifica si el usuario tiene sesión activa.
- `POST /cerrar-sesion` — Cierra la sesión del usuario.

## users.js (Usuarios)
- `GET /profile/:userId` — Obtiene el perfil de un usuario.
- `PUT /profile/:userId` — Actualiza el perfil de un usuario.
- `GET /:userId/appointments` — Lista los turnos de un usuario.

## appointments.js (Turnos)
- `GET /especialidades` — Lista de especialidades disponibles.
- `GET /horarios-disponibles` — Horarios disponibles para turnos.
- `POST /` — Crear un nuevo turno.
- `GET /prueba-publica` — Endpoint de prueba pública.
- `GET /dias-no-laborables` — Días no laborables.
- `GET /:appointmentId` — Detalle de un turno.
- `PUT /:appointmentId/cancelar` — Cancelar un turno.
- `POST /prueba-email` — Prueba de envío de email.

## admin.js (Administración, requiere autenticación y permisos de admin)
- `GET /panel-control` — Panel de control administrativo.
- `GET /citas` — Lista de todas las citas.
- `GET /citas/:id` — Detalle de una cita.
- `POST /citas` — Crear cita desde admin.
- `PUT /citas/:id` — Editar cita.
- `DELETE /citas/:id` — Eliminar cita.
- `PUT /citas/:appointmentId/estado` — Cambiar estado de cita.
- `GET /usuarios` — Lista de usuarios.
- `PUT /usuarios/:userId/cambiar-estado` — Cambiar estado de usuario.
- `GET /usuarios/:userId/citas` — Citas de un usuario.
- `GET /usuarios/:userId/citas/todas` — Todas las citas de un usuario.
- `GET /reportes` — Reportes generales.
- `GET /dias-no-laborables` — Días no laborables.
- `POST /dias-no-laborables/individual` — Agregar día no laborable individual.
- `POST /dias-no-laborables/rango` — Agregar rango de días no laborables.
- `DELETE /dias-no-laborables/:id` — Eliminar día no laborable.
- `GET /reports/revenue` — Reporte de ingresos.
- `GET /reports/specialties` — Reporte por especialidad.

## password-reset.js (Recuperación de contraseña)
- `POST /forgot-password` — Solicitar recuperación de contraseña.
- `GET /verify-reset-token/:token` — Verificar token de recuperación.
- `POST /reset-password` — Cambiar contraseña.
- `POST /cleanup-tokens` — Limpiar tokens expirados.
