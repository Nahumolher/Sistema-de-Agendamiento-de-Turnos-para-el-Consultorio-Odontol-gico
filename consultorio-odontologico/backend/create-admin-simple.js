const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
    console.log('🔧 Creando usuario administrador...');
    
    try {
        // Conectar a la base de datos
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '921181877Nahuel',
            database: 'consultorio_odontologico',
            port: 3306
        });

        console.log('✅ Conectado a MySQL');

        // Verificar si el usuario admin ya existe
        const [existingUsers] = await connection.execute(
            'SELECT id, email FROM users WHERE email = ?',
            ['admin@consultorio.com']
        );

        if (existingUsers.length > 0) {
            console.log('ℹ️  Usuario admin ya existe con ID:', existingUsers[0].id);
            
            // Actualizar la contraseña
            const password = 'admin123';
            const hashedPassword = await bcrypt.hash(password, 12);
            
            await connection.execute(
                'UPDATE users SET password = ? WHERE email = ?',
                [hashedPassword, 'admin@consultorio.com']
            );
            
            console.log('🔄 Contraseña del usuario admin actualizada');
        } else {
            // Crear nuevo usuario admin
            const password = 'admin123';
            const hashedPassword = await bcrypt.hash(password, 12);
            
            const [result] = await connection.execute(
                `INSERT INTO users (first_name, last_name, email, password, phone, dni, birth_date, role, active, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                ['Admin', 'Sistema', 'admin@consultorio.com', hashedPassword, '1234567890', '12345678', '1980-01-01', 'admin', true]
            );
            
            console.log('✅ Usuario admin creado con ID:', result.insertId);
        }

        console.log('\n📋 Credenciales de acceso:');
        console.log('📧 Email: admin@consultorio.com');
        console.log('🔑 Contraseña: admin123');
        
        await connection.end();
        console.log('✅ Proceso completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createAdminUser();