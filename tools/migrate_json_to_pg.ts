import fs from 'fs';
import path from 'path';
import pool from '../database/db';
import { v4 as uuidv4 } from 'uuid';

async function runMigration() {
  const dbPath = path.join(process.cwd(), 'database.json');
  if (!fs.existsSync(dbPath)) {
    console.log('No se encontró database.json. Abortando.');
    process.exit(0);
  }

  const jsonRaw = fs.readFileSync(dbPath, 'utf8');
  const db = JSON.parse(jsonRaw);
  
  try {
    console.log('🚀 Iniciando migración de datos...');
    
    // 1. Run schema to ensure tables exist
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'supabase', 'schema.sql'), 'utf8');
    await pool.query(schemaSql);
    console.log('✅ Esquema PostgreSQL inicializado.');

    // 2. Fetch Roles from DB to get their UUIDs
    const rolesResult = await pool.query('SELECT id, key FROM public.roles');
    const rolesMap: Record<string, string> = {};
    rolesResult.rows.forEach(r => {
      rolesMap[r.key] = r.id;
    });

    // We need to map old JSON roles to new ones
    // JSON 'superadmin' -> 'superadmin'
    // JSON 'moderator' or 'admin' -> 'manager'
    // JSON 'auditor' -> 'seller'
    // JSON 'user' -> 'customer'
    const roleTranslation: Record<string, string> = {
      'superadmin': 'superadmin',
      'admin': 'manager',
      'moderator': 'manager',
      'auditor': 'seller',
      'user': 'customer'
    };

    // 3. Migrate Users
    const userIdMap: Record<string, string> = {}; // Maps old string ID to new UUID
    
    for (const u of db.users) {
      // Check if exists by email
      const exists = await pool.query('SELECT id FROM public.usuarios WHERE email = $1', [u.email]);
      let newId = uuidv4();
      if (exists.rows.length > 0) {
        newId = exists.rows[0].id;
        console.log(`Usuario ${u.email} ya existe en DB. Saltando inserción.`);
      } else {
        const mappedRoleKey = roleTranslation[u.role] || 'customer';
        const roleId = rolesMap[mappedRoleKey];
        if (!roleId) {
          throw new Error(`Rol ${mappedRoleKey} no encontrado en base de datos.`);
        }
        
        await pool.query(
          `INSERT INTO public.usuarios (id, username, email, full_name, password_hash, role_id, is_locked, failed_attempts, created_at, avatar_url, auth_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            newId, 
            u.username, 
            u.email, 
            u.fullName, 
            u.passwordHash, 
            roleId, 
            u.isLocked || false, 
            u.failedAttempts || 0, 
            u.createdAt || new Date().toISOString(),
            u.avatarUrl || '',
            u.authType || 'local'
          ]
        );
      }
      userIdMap[u.id] = newId;
    }
    console.log(`✅ ${db.users.length} Usuarios migrados exitosamente.`);

    // 4. Migrate Audit Logs
    let logsCount = 0;
    if (db.auditLogs && Array.isArray(db.auditLogs)) {
      for (const log of db.auditLogs) {
        const newUserId = log.userId ? userIdMap[log.userId] : null;
        await pool.query(
          `INSERT INTO public.audit_logs (user_id, username, action, status, ip_address, user_agent, details, location, country_code, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            newUserId,
            log.username,
            log.action,
            log.status,
            log.ipAddress,
            log.userAgent,
            log.details,
            log.location,
            log.countryCode,
            log.timestamp || new Date().toISOString()
          ]
        );
        logsCount++;
      }
    }
    console.log(`✅ ${logsCount} Logs de Auditoría migrados exitosamente.`);

    // 5. Delete database.json
    fs.unlinkSync(dbPath);
    console.log('🔥 database.json ha sido purgado del disco duro para siempre.');
    console.log('✨ MIGRACIÓN COMPLETADA CON ÉXITO ✨');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

runMigration();
