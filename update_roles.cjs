const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await pool.query("UPDATE roles SET privilege_level = 4 WHERE key = 'superadmin'");
    await pool.query("UPDATE roles SET privilege_level = 3 WHERE key = 'manager'");
    await pool.query("UPDATE roles SET privilege_level = 2 WHERE key = 'seller'");
    await pool.query("UPDATE roles SET privilege_level = 1 WHERE key = 'customer'");
    console.log("Roles updated successfully!");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
