import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  const client = await pool.connect();
  try {
    const roleResult = await client.query("SELECT id FROM roles WHERE privilege_level = 1 LIMIT 1");
    const roleId = roleResult.rows[0].id;
    console.log("RoleId:", roleId);
    
    await client.query("BEGIN");
    const userResult = await client.query(
      `INSERT INTO usuarios (role_id, username, email, full_name, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, email`,
      [roleId, 'testuser1234', 'test4@example.com', 'Test User', 'hash']
    );
    console.log("User Inserted:", userResult.rows[0].id);

    await client.query(
      `INSERT INTO user_profiles (user_id, phone, address, points) VALUES ($1, $2, $3, 0)`,
      [userResult.rows[0].id, '12345', '123 Main']
    );
    console.log("Profile Inserted");
    await client.query("ROLLBACK");
  } catch (e) {
    console.error("ERROR CAUGHT:", e);
  } finally {
    client.release();
    pool.end();
  }
}
test();
