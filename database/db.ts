import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Se inicializa el Pool de conexiones a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10
});

pool.on('connect', () => {
  console.log('✅ Conectado exitosamente a PostgreSQL (Supabase/Render)');
});

pool.on('error', (err) => {
  console.error('❌ Error fatal en el pool de PostgreSQL', err);
  process.exit(-1);
});

// Función de utilidad para ejecutar queries rápidamente
export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
