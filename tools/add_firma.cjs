const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/sentinel'
});

async function addFirmaDigital() {
  try {
    console.log("Adding firma_digital column to ordenes_compra...");
    await pool.query('ALTER TABLE ordenes_compra ADD COLUMN IF NOT EXISTS firma_digital VARCHAR(255)');
    console.log("Success.");
    
    console.log("Adding firma_digital column to audit_logs...");
    await pool.query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS firma_digital VARCHAR(255)');
    console.log("Success.");
    
  } catch (error) {
    console.error("Error running migration:", error);
  } finally {
    pool.end();
  }
}

addFirmaDigital();
