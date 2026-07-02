import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const vaultSchema = `
CREATE TABLE IF NOT EXISTS public.sentinel_vault (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria VARCHAR(100) NOT NULL,
    nombre_clave VARCHAR(255) NOT NULL,
    valor_cifrado TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

async function run() {
  const client = await pool.connect();
  try {
    await client.query(vaultSchema);
    console.log('Vault table created');
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
