const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const result = await pool.query("SELECT key, name, privilege_level FROM roles ORDER BY privilege_level DESC");
  console.log(result.rows);
  pool.end();
}
run();
