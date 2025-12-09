const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { pool } = require('../config/database');
const emailService = require('../services/emailService');

// Solicitar recuperación de contraseña
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email requerido'
            });
        }

        // Verificar que el usuario existe
        const [users] = await pool.execute(
            'SELECT id, first_name, last_name, email FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            // Por seguridad, no revelamos si el email existe o no
            return res.json({
                success: true,
                message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación'
            });
        }

        const user = users[0];

        // Invalidar tokens anteriores del usuario
        await pool.execute(
            'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = ? AND used = FALSE',
            [user.id]
        );

        // Generar token único y seguro
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        // Guardar token en base de datos
        await pool.execute(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, token, expiresAt]
        );

        // Enviar email con enlace de recuperación
        await emailService.sendPasswordResetEmail(user, token);

        res.json({
            success: true,
            message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación'
        });

    } catch (error) {
        console.error('Error en forgot-password:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Verificar token de recuperación
router.get('/verify-reset-token/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const [tokens] = await pool.execute(`
            SELECT prt.*, u.email, u.firstName, u.lastName 
            FROM password_reset_tokens prt
            JOIN users u ON prt.user_id = u.id
            WHERE prt.token = ? AND prt.used = FALSE AND prt.expires_at > NOW()
        `, [token]);

        if (tokens.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Token inválido o expirado'
            });
        }

        const tokenData = tokens[0];

        res.json({
            success: true,
            valid: true,
            user: {
                email: tokenData.email,
                firstName: tokenData.firstName,
                lastName: tokenData.lastName
            }
        });

    } catch (error) {
        console.error('Error verificando token:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Restablecer contraseña
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Token y nueva contraseña requeridos'
            });
        }

        // Validar contraseña
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        // Verificar token válido
        const [tokens] = await pool.execute(`
            SELECT prt.*, u.id as user_id, u.email
            FROM password_reset_tokens prt
            JOIN users u ON prt.user_id = u.id
            WHERE prt.token = ? AND prt.used = FALSE AND prt.expires_at > NOW()
        `, [token]);

        if (tokens.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Token inválido o expirado'
            });
        }

        const tokenData = tokens[0];

        // Generar hash de la nueva contraseña
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Actualizar contraseña del usuario
        await pool.execute(
            'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
            [hashedPassword, tokenData.user_id]
        );

        // Marcar token como usado
        await pool.execute(
            'UPDATE password_reset_tokens SET used = TRUE WHERE id = ?',
            [tokenData.id]
        );

        // Enviar email de confirmación
        await emailService.sendPasswordResetConfirmation(tokenData.email);

        res.json({
            success: true,
            message: 'Contraseña restablecida exitosamente'
        });

    } catch (error) {
        console.error('Error restableciendo contraseña:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Limpiar tokens expirados (tarea de mantenimiento)
router.post('/cleanup-tokens', async (req, res) => {
    try {
        const [result] = await pool.execute(
            'DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = TRUE'
        );

        res.json({
            success: true,
            message: `${result.affectedRows} tokens eliminados`
        });

    } catch (error) {
        console.error('Error limpiando tokens:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

module.exports = router;