import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { execSync } from 'child_process';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const secrets = [
  { categoria: 'SUNAT_OSE', nombre_clave: 'API Key Facturación', plaintext: '20100066603-ose-test-k8s' },
  { categoria: 'PASARELA_PAGOS', nombre_clave: 'Webhook Secret', plaintext: 'whsec_9b2d8a4f6c8e0a1b' },
  { categoria: 'AWS_INFRA', nombre_clave: 'Access Key ID', plaintext: 'AKIAIOSFODNN7EXAMPLE' },
  { categoria: 'TWILIO_SMS', nombre_clave: 'Auth Token', plaintext: '7a89f9b58c734493b8d9c' }
];

async function seed() {
  const client = await pool.connect();
  try {
    for (const secret of secrets) {
      // Use execSync to run Python script
      const cmd = `python scripts/Cifrado3.py encrypt "${secret.plaintext}" ${process.env.VAULT_MASTER_KEY} ${process.env.VAULT_MULT} ${process.env.VAULT_SHIFT}`;
      const output = execSync(cmd).toString().trim();
      const parsed = JSON.parse(output);
      
      if (parsed.status === 'success') {
        const cipher = parsed.result;
        await client.query(
          'INSERT INTO public.sentinel_vault (categoria, nombre_clave, valor_cifrado) VALUES ($1, $2, $3)',
          [secret.categoria, secret.nombre_clave, cipher]
        );
        console.log(`Seeded ${secret.categoria}`);
      } else {
        console.error(`Error encrypting ${secret.categoria}:`, parsed.message);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
