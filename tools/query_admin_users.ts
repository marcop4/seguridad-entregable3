import pool from "../database/db.ts";

async function run() {
  const q = `
      SELECT u.id, u.username, u.email, u.full_name as "fullName", 
             u.failed_attempts as "failedAttempts", u.is_locked as "isLocked", 
             u.created_at as "createdAt", r.key as role, r.privilege_level as level,
             u.avatar_url as "avatarUrl", u.auth_type as "authType"
      FROM usuarios u
      JOIN roles r ON u.role_id = r.id
  `;
  const res = await pool.query(q);
  console.log("Users from admin route:", res.rows);
  process.exit(0);
}
run();
