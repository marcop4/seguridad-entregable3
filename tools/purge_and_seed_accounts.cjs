const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Obtenemos todos los roles
    const rolesRes = await client.query('SELECT id, key, name, privilege_level FROM roles');
    const roles = {};
    rolesRes.rows.forEach(r => { roles[r.key] = r; });

    // Obtenemos los usuarios y preservamos superadmins
    const superadminRole = roles['superadmin'];
    const superAdminsRes = await client.query('SELECT id FROM usuarios WHERE role_id = $1', [superadminRole.id]);
    const superAdminIds = superAdminsRes.rows.map(r => r.id);
    
    if (superAdminIds.length === 0) {
      throw new Error("No superadmin found! Cannot purge.");
    }
    const safeSuperAdminId = superAdminIds[0];

    console.log("Reasingando órdenes existentes al Super Admin para no romper constraints...");
    await client.query('UPDATE ordenes_compra SET usuario_id = $1 WHERE usuario_id != $1', [safeSuperAdminId]);
    await client.query('UPDATE audit_logs SET user_id = $1 WHERE user_id != $1 AND user_id IS NOT NULL', [safeSuperAdminId]);

    console.log("Purgando cuentas...");
    await client.query('DELETE FROM usuarios WHERE role_id != $1', [superadminRole.id]);

    console.log("Creando nuevas cuentas (contraseña por defecto: password123)...");
    const defaultPassword = 'password123';
    const hash = await bcrypt.hash(defaultPassword, 10);

    const accountsToCreate = [
      {
        username: 'admin_jane',
        email: 'admin@jane.art',
        full_name: 'Administrador General',
        role_id: roles['manager'].id // Privilege Level 3
      },
      {
        username: 'vendedor_pos',
        email: 'pos@jane.art',
        full_name: 'Vendedor Tienda Física',
        role_id: roles['seller'].id // Privilege Level 2
      },
      {
        username: 'cliente_vip',
        email: 'cliente@jane.art',
        full_name: 'Cliente VIP JANE',
        role_id: roles['customer'].id // Privilege Level 1
      }
    ];

    for (const acc of accountsToCreate) {
      await client.query(
        `INSERT INTO usuarios (username, email, full_name, password_hash, role_id) 
         VALUES ($1, $2, $3, $4, $5)`,
        [acc.username, acc.email, acc.full_name, hash, acc.role_id]
      );
    }

    await client.query('COMMIT');
    console.log("¡Cuentas purgadas y recreadas con éxito!");

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error durante purga:", err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
