import pool from "../database/db.ts";

async function run() {
  const res = await pool.query("SELECT id, username, email, password_hash FROM usuarios WHERE email = 'root@sentinel.ai'");
  console.log("Root user in DB:", res.rows[0]);
  process.exit(0);
}
run();
