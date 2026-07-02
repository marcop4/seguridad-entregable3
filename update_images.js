import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateImages() {
  const client = await pool.connect();
  try {
    const updates = [
      ['Collar de Plata 925', '/productos/collar_plata.png'],
      ['Bufanda de Llama', '/productos/bufanda_llama.png'],
      ['Poncho de Alpaca', '/productos/poncho_alpaca.png'],
      ['Pulsera de Huayruro', '/productos/pulsera_huayruro.png'],
      ['Jarrón de Arcilla Tradicional', '/productos/jarron_arcilla.png'],
      ['Plato Decorativo Andino', '/productos/plato_andino.png'],
      ['Vasija Ceremonial Inca', '/productos/vasija_inca.png'],
      ['Macetero Rústico', '/productos/macetero_rustico.png'],
      ['Chullo Andino', '/productos/chullo_andino.png'],
      ['Manta Incaica', '/productos/manta_incaica.png']
    ];

    for (const [name, url] of updates) {
      await client.query('UPDATE productos SET image_url = $1 WHERE name = $2', [url, name]);
    }
    console.log('Images updated successfully');
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}

updateImages();
