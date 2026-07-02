import pool from './database/db';

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuracion (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT
      );
    `);
    
    // Seed initial data if empty
    const { rows } = await pool.query('SELECT COUNT(*) FROM configuracion');
    if (parseInt(rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO configuracion (key, value, description) VALUES 
        ('igv', '18', 'Porcentaje de IGV (Ej: 18)'),
        ('shipping_cost', '15', 'Costo de envío estándar (S/)'),
        ('store_name', 'JANE Artisans', 'Nombre legal de la tienda')
      `);
      console.log('Seeded configuracion table');
    }
    
    console.log('Migration successful');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

migrate();
