import express from "express";
import pool from "../../database/db";
import * as bcrypt from "bcryptjs";
import { requirePrivilege } from "../middleware/authMiddleware";
import { logAudit, broadcastToSse } from "../utils/logger";
import { exec } from "child_process";
import util from "util";
import path from "path";
import { activeSessionsMap, revokedSessionsSet } from "../utils/sessionMap";
import { generateAndSignReceipt } from "../utils/pdfSigner";

const execPromise = util.promisify(exec);

const router = express.Router();

// --- API ROUTE: GET USERS ---
router.get("/users", requirePrivilege(3), async (req, res) => {
  const userPrivilege = (req as any).userPrivilege;
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.email, u.full_name, r.key as role, r.privilege_level as level, 
             u.avatar_url, u.auth_type, u.is_locked, u.failed_attempts, u.created_at
      FROM usuarios u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `);
    
    let users = result.rows.map(u => {
      const session = activeSessionsMap.get(u.id);
      let parsedBrowser = session?.browser || null;
      try { parsedBrowser = JSON.parse(parsedBrowser!).userAgent || parsedBrowser; } catch(e){}
      return {
        id: u.id,
        email: u.email,
        username: u.username,
        fullName: u.full_name,
        role: u.role,
        level: u.level,
        avatarUrl: u.avatar_url,
        authType: u.auth_type,
        isLocked: u.is_locked,
        failedAttempts: u.failed_attempts,
        createdAt: u.created_at,
        activeSessionId: session?.sessionId || null,
        activeSessionIp: session?.ip || null,
        activeSessionBrowser: parsedBrowser,
        activeSessionStartedAt: session?.startedAt || null
      };
    });

    // Managers (Level < 4) cannot see SuperAdmins (Level 4)
    if (userPrivilege < 4) {
      users = users.filter(u => u.level < 4);
    }
    res.json(users);
  } catch (error: any) {
    console.error("Error in GET /users:", error);
    require('fs').writeFileSync('GET_USERS_ERROR.log', error.stack || error.toString());
    res.status(500).json({ error: "Error fetch users", details: error.message });
  }
});

// --- API ROUTE: GET AUDIT LOGS ---
router.get("/audit-logs", requirePrivilege(4), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500
    `);
    const formatted = result.rows.map(log => ({
      id: log.id,
      timestamp: log.created_at,
      userId: log.user_id,
      username: log.username,
      action: log.action,
      status: log.status,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      details: log.details,
      location: log.location,
      countryCode: log.country_code
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Error fetch audit logs" });
  }
});

// --- API ROUTE: GET ROLES ---
router.get("/roles", requirePrivilege(4), async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM roles ORDER BY privilege_level DESC`);
    const formatted = result.rows.map(r => ({
      id: r.id,
      key: r.key,
      name: r.name,
      privilegeLevel: r.privilege_level,
      description: r.description,
      createdAt: r.created_at
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Error fetch roles" });
  }
});

// --- API ROUTE: GET ACTIVE SESSIONS ---
router.get("/active-sessions", requirePrivilege(3), async (req, res) => {
  try {
    const activeUserIds = Array.from(activeSessionsMap.keys());
    if (activeUserIds.length === 0) {
      return res.json([]);
    }
    const result = await pool.query(`
      SELECT u.id, u.username, u.avatar_url, r.privilege_level as level
      FROM usuarios u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ANY($1)
    `, [activeUserIds]);

    const enriched = result.rows.map(row => {
      const session = activeSessionsMap.get(row.id);
      let parsedBrowser = session?.browser || 'Unknown';
      try { parsedBrowser = JSON.parse(parsedBrowser).userAgent || parsedBrowser; } catch(e){}

      return {
        userId: row.id,
        username: row.username,
        avatarUrl: row.avatar_url,
        level: row.level,
        sessionId: session?.sessionId,
        browser: parsedBrowser,
        ipAddress: session?.ip,
        startedAt: session?.startedAt
      };
    });
    res.json(enriched);
  } catch(e) {
    res.status(500).json({ error: "Error fetching active sessions" });
  }
});

// --- API ROUTE: GET NOTIFICATIONS ---
router.get("/notifications", requirePrivilege(2), async (req, res) => {
  res.json([]);
});

router.post("/notifications/read", requirePrivilege(1), async (req, res) => {
  res.json({ success: true });
});

// --- API ROUTE: DELETE USER ---
router.delete("/users/:id", requirePrivilege(3), async (req, res) => {
  try {
    const userPriv = (req as any).userPrivilege;
    const targetRes = await pool.query(`SELECT r.privilege_level as level FROM usuarios u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`, [req.params.id]);
    const targetLvl = targetRes.rows[0]?.level || 1;
    if (userPriv === 3 && targetLvl >= 3) {
      return res.status(403).json({ error: "Acceso Denegado: Gerente no puede eliminar Nivel 3 o 4" });
    }

    const targetId = req.params.id;
    await pool.query(`DELETE FROM usuarios WHERE id = $1`, [targetId]);
    
    const sessionToRevoke = activeSessionsMap.get(targetId);
    if (sessionToRevoke) {
      revokedSessionsSet.add(sessionToRevoke.sessionId);
    }
    activeSessionsMap.delete(targetId);
    broadcastToSse("session_revoked", { sessionId: "all", reason: "Cuenta eliminada por el administrador" }, targetId);

    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: "Cannot delete user" });
  }
});

router.post("/users/:id/lock", requirePrivilege(3), async (req, res) => {
  try {
    const userPriv = (req as any).userPrivilege;
    const targetRes = await pool.query(`SELECT r.privilege_level as level FROM usuarios u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`, [req.params.id]);
    const targetLvl = targetRes.rows[0]?.level || 1;
    if (userPriv === 3 && targetLvl >= 3) {
      return res.status(403).json({ error: "Acceso Denegado: Gerente no puede bloquear Nivel 3 o 4" });
    }

    const { locked, hours } = req.body;
    let lockedUntil = null;
    if (locked && hours) {
      lockedUntil = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    }
    await pool.query(`UPDATE usuarios SET is_locked = $1, locked_until = $2 WHERE id = $3`, [locked, lockedUntil, req.params.id]);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: "Error locking user" });
  }
});

router.post("/users/:id/reset-fails", requirePrivilege(3), async (req, res) => {
  try {
    const userPriv = (req as any).userPrivilege;
    const targetRes = await pool.query(`SELECT r.privilege_level as level FROM usuarios u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`, [req.params.id]);
    const targetLvl = targetRes.rows[0]?.level || 1;
    if (userPriv === 3 && targetLvl >= 3) {
      return res.status(403).json({ error: "Acceso Denegado" });
    }

    await pool.query(`UPDATE usuarios SET failed_attempts = 0, locked_until = null, is_locked = false WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: "Error resetting fails" });
  }
});

router.post("/revoke-session/:id", requirePrivilege(3), async (req, res) => {
  const userPriv = (req as any).userPrivilege;
  const targetRes = await pool.query(`SELECT r.privilege_level as level FROM usuarios u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`, [req.params.id]);
  const targetLvl = targetRes.rows[0]?.level || 1;
  if (userPriv === 3 && targetLvl >= 3) {
    return res.status(403).json({ error: "Acceso Denegado" });
  }

  const targetId = req.params.id;
  const sessionToRevoke = activeSessionsMap.get(targetId);
  if (sessionToRevoke) {
    revokedSessionsSet.add(sessionToRevoke.sessionId);
  }
  activeSessionsMap.delete(targetId);
  broadcastToSse("session_revoked", { sessionId: "all", reason: "Revocación manual por administrador" }, targetId);
  res.json({ success: true });
});

router.put("/users/:id", requirePrivilege(3), async (req, res) => {
  try {
    const userPriv = (req as any).userPrivilege;
    const targetRes = await pool.query(`SELECT r.privilege_level as level FROM usuarios u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`, [req.params.id]);
    const targetLvl = targetRes.rows[0]?.level || 1;
    
    if (targetLvl === 5 && userPriv < 5) {
      return res.status(403).json({ error: "Solo un SuperAdmin (Nivel 5) puede modificar a otro SuperAdmin" });
    }

    if (userPriv === 3 && targetLvl >= 3) {
      return res.status(403).json({ error: "Acceso Denegado" });
    }

    const { role, isLocked, lockedUntil } = req.body;
    
    if (role) {
      const roleRes = await pool.query(`SELECT id, privilege_level FROM roles WHERE key = $1`, [role]);
      const newRoleLvl = roleRes.rows[0]?.privilege_level || 1;
      
      if (newRoleLvl === 5 && userPriv < 5) {
         return res.status(403).json({ error: "Escalamiento Denegado: Solo un SuperAdmin puede otorgar el rol de SuperAdmin" });
      }

      if (userPriv === 3 && newRoleLvl >= 3) {
         return res.status(403).json({ error: "Un gerente no puede asignar roles superiores o iguales a Nivel 3" });
      }
      await pool.query(`UPDATE usuarios SET role_id = $1 WHERE id = $2`, [roleRes.rows[0].id, req.params.id]);
    }
    
    if (isLocked !== undefined) {
      await pool.query(`UPDATE usuarios SET is_locked = $1, locked_until = $2 WHERE id = $3`, [isLocked, lockedUntil || null, req.params.id]);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Cannot update user" });
  }
});

router.get("/password-hashes", requirePrivilege(4), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.full_name as "fullName", u.email, r.key as role, u.auth_type as "authType", u.password_hash as "passwordHash"
      FROM usuarios u
      JOIN roles r ON u.role_id = r.id
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error fetching password hashes" });
  }
});

// --- API ROUTE: GET SECURITY STATS ---
router.get("/security-stats", requirePrivilege(4), async (req, res) => {
  try {
    const window = req.query.window || '24h';
    const targetDate = req.query.targetDate; // Format: timestamp
    const zoomLevel = req.query.zoomLevel; // 'day' | 'hour'
    
    // Calculate active timeframe based on targetDate and zoomLevel
    let startTime = Date.now();
    let endTime = Date.now();
    
    if (targetDate) {
      const tDate = new Date(Number(targetDate));
      
      if (zoomLevel === 'hour') {
        tDate.setMinutes(59, 59, 999);
        endTime = tDate.getTime();
        startTime = endTime - (60 * 60 * 1000) + 1; // 1 hour window
      } else if (zoomLevel === 'day') {
        tDate.setHours(23, 59, 59, 999);
        endTime = tDate.getTime();
        startTime = endTime - (24 * 60 * 60 * 1000) + 1; // 24 hour window
      }
    } else {
      if (window === '1h') startTime = Date.now() - (60 * 60 * 1000);
      else if (window === '6h') startTime = Date.now() - (6 * 60 * 60 * 1000);
      else if (window === '24h') startTime = Date.now() - (24 * 60 * 60 * 1000);
      else if (window === '7d') startTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
      else if (window === '30d') startTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
    }

    const result = await pool.query(
      `SELECT id, created_at as timestamp, action, status, username, ip_address as "ipAddress" 
       FROM audit_logs 
       WHERE created_at >= $1 AND created_at <= $2 
       ORDER BY created_at DESC`,
      [new Date(startTime).toISOString(), new Date(endTime).toISOString()]
    );
    const timeframeLogs = result.rows;

    const timelineMap = new Map();
    
    let intervalMs = 60 * 60 * 1000;
    let timeWindowMs = endTime - startTime;
    
    if (timeWindowMs <= 60 * 60 * 1000) intervalMs = 5 * 60 * 1000;
    else if (timeWindowMs <= 6 * 60 * 60 * 1000) intervalMs = 30 * 60 * 1000;
    else if (timeWindowMs <= 24 * 60 * 60 * 1000) intervalMs = 60 * 60 * 1000;
    else if (timeWindowMs <= 7 * 24 * 60 * 60 * 1000) intervalMs = 24 * 60 * 60 * 1000;
    else intervalMs = 24 * 60 * 60 * 1000;

    if (intervalMs === 24 * 60 * 60 * 1000) {
      let current = new Date(startTime);
      current.setHours(0, 0, 0, 0);
      const endD = new Date(endTime);
      endD.setHours(23, 59, 59, 999);
      while (current.getTime() <= endD.getTime()) {
        timelineMap.set(current.getTime(), { failures: 0, blocks: 0 });
        current.setDate(current.getDate() + 1);
      }
    } else if (intervalMs === 60 * 60 * 1000) {
      let current = new Date(startTime);
      current.setMinutes(0, 0, 0);
      const endD = new Date(endTime);
      while (current.getTime() <= endD.getTime()) {
        timelineMap.set(current.getTime(), { failures: 0, blocks: 0 });
        current.setHours(current.getHours() + 1);
      }
    } else {
      for (let t = startTime; t <= endTime; t += intervalMs) {
        const bucketStart = Math.floor(t / intervalMs) * intervalMs;
        timelineMap.set(bucketStart, { failures: 0, blocks: 0 });
      }
    }

    timeframeLogs.forEach(log => {
      const t = new Date(log.timestamp).getTime();
      let bucket;
      if (intervalMs === 24 * 60 * 60 * 1000) {
        const d = new Date(t);
        d.setHours(0, 0, 0, 0);
        bucket = d.getTime();
      } else if (intervalMs === 60 * 60 * 1000) {
        const d = new Date(t);
        d.setMinutes(0, 0, 0);
        bucket = d.getTime();
      } else {
        bucket = Math.floor(t / intervalMs) * intervalMs;
      }
      
      if (timelineMap.has(bucket)) {
        const stats = timelineMap.get(bucket);
        if (log.action === 'LOGIN_FAILED') stats.failures++;
        if (log.action === 'ACCOUNT_LOCKED' || log.action === 'USER_LOCKED') stats.blocks++;
      }
    });

    const timeline = Array.from(timelineMap.entries())
      .map(([ts, stats]) => ({ timestamp: ts, ...stats }))
      .sort((a, b) => a.timestamp - b.timestamp);

    const criticalAlertsResult = await pool.query(
      `SELECT id, created_at as timestamp, action, status, username, ip_address as "ipAddress"
       FROM audit_logs
       WHERE action IN ('ACCOUNT_LOCKED', 'USER_LOCKED', 'LOGIN_FAILED', 'BRUTE_FORCE_DETECTED')
       ORDER BY created_at DESC
       LIMIT 15`
    );

    const criticalAlerts = criticalAlertsResult.rows.map(l => ({
      id: l.id,
      createdAt: l.timestamp,
      target: l.username || l.ipAddress,
      type: (l.action === 'ACCOUNT_LOCKED' || l.action === 'USER_LOCKED') ? 'Bloqueo' : 'Fallo',
      status: l.status
    }));

    res.json({ timeline, criticalAlerts });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Cannot generate security stats" });
  }
});

// GET /config (Level >= 4)
router.get("/config", requirePrivilege(4), async (req, res) => {
  try {
    const result = await pool.query(`SELECT key, value, description FROM configuracion`);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error fetching config" });
  }
});

// PUT /config (Level >= 4)
router.put("/config", requirePrivilege(4), async (req, res) => {
  const { config } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of config) {
      await client.query(`UPDATE configuracion SET value = $1 WHERE key = $2`, [item.value, item.key]);
    }
    await client.query('COMMIT');
    const adminUser = (req as any).user;
    await logAudit(adminUser.id, adminUser.username, "CONFIG_UPDATED", "success", req, "Configuración global actualizada");
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: "Error updating config" });
  } finally {
    client.release();
  }
});

// ==========================================
// VAULT SECRETS MANAGER (LEVEL 4)
// ==========================================

router.get("/vault", requirePrivilege(4), async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, categoria, nombre_clave, valor_cifrado, created_at FROM sentinel_vault ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error fetching vault secrets" });
  }
});

router.post("/vault/encrypt", requirePrivilege(4), async (req, res) => {
  const { categoria, nombre_clave, plaintext } = req.body;
  if (!categoria || !nombre_clave || !plaintext) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'Cifrado3.py');
    const cmd = `python "${scriptPath}" encrypt "${plaintext}" ${process.env.VAULT_MASTER_KEY} ${process.env.VAULT_MULT} ${process.env.VAULT_SHIFT}`;
    const { stdout } = await execPromise(cmd);
    const parsed = JSON.parse(stdout.trim());
    
    if (parsed.status !== "success") {
      return res.status(500).json({ error: parsed.message || "Error encriptando" });
    }

    const valor_cifrado = parsed.result;
    await pool.query(
      `INSERT INTO sentinel_vault (categoria, nombre_clave, valor_cifrado) VALUES ($1, $2, $3)`,
      [categoria, nombre_clave, valor_cifrado]
    );

    res.json({ success: true, message: "Secreto guardado en la bóveda" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno procesando encriptación" });
  }
});

router.post("/vault/decrypt", requirePrivilege(4), async (req, res) => {
  const { id, password } = req.body;
  const user = (req as any).user;

  if (!id || !password) return res.status(400).json({ error: "ID y contraseña son requeridos" });

  try {
    // Verificar contraseña del administrador
    const userResult = await pool.query(`SELECT password_hash FROM usuarios WHERE id = $1`, [user.id]);
    if (userResult.rows.length === 0) return res.status(401).json({ error: "Usuario no válido" });
    
    const isValid = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!isValid) return res.status(401).json({ error: "Contraseña incorrecta. Acceso denegado a la bóveda." });

    const result = await pool.query(`SELECT valor_cifrado FROM sentinel_vault WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Secreto no encontrado" });

    const valor_cifrado = result.rows[0].valor_cifrado;
    const scriptPath = path.join(process.cwd(), 'scripts', 'Cifrado3.py');
    const cmd = `python "${scriptPath}" decrypt "${valor_cifrado}" ${process.env.VAULT_MASTER_KEY} ${process.env.VAULT_MULT} ${process.env.VAULT_SHIFT}`;
    const { stdout } = await execPromise(cmd);
    const parsed = JSON.parse(stdout.trim());

    if (parsed.status !== "success") {
      return res.status(500).json({ error: parsed.message || "Error desencriptando" });
    }

    // Retorna el valor real desencriptado
    res.json({ success: true, plaintext: parsed.result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno procesando desencriptación" });
  }
});

// ==========================================
// CRYPTO LAB (LIVE TEST)
// ==========================================

router.post("/vault/lab/encrypt", requirePrivilege(4), async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Texto requerido" });

  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'Cifrado3.py');
    const cmd = `python "${scriptPath}" encrypt "${text}" ${process.env.VAULT_MASTER_KEY} ${process.env.VAULT_MULT} ${process.env.VAULT_SHIFT}`;
    const { stdout } = await execPromise(cmd);
    const parsed = JSON.parse(stdout.trim());
    
    if (parsed.status !== "success") return res.status(500).json({ error: parsed.message || "Error encriptando" });
    res.json({ success: true, result: parsed.result });
  } catch (error) {
    res.status(500).json({ error: "Error interno en el laboratorio" });
  }
});

router.post("/vault/lab/decrypt", requirePrivilege(4), async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Texto cifrado requerido" });

  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'Cifrado3.py');
    const cmd = `python "${scriptPath}" decrypt "${text}" ${process.env.VAULT_MASTER_KEY} ${process.env.VAULT_MULT} ${process.env.VAULT_SHIFT}`;
    const { stdout } = await execPromise(cmd);
    const parsed = JSON.parse(stdout.trim());
    
    if (parsed.status !== "success") return res.status(500).json({ error: parsed.message || "Error desencriptando" });
    res.json({ success: true, result: parsed.result });
  } catch (error) {
    res.status(500).json({ error: "Error interno en el laboratorio" });
  }
});

// POST /secure-link/encrypt: Cifra una ruta usando Cifrado3.py para enlaces seguros
router.post("/secure-link/encrypt", requirePrivilege(2), async (req, res) => {
  const { path: routeToEncrypt } = req.body;
  if (!routeToEncrypt) return res.status(400).json({ error: "Ruta requerida" });

  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'Cifrado3.py');
    const cmd = `python "${scriptPath}" encrypt "${routeToEncrypt}" ${process.env.VAULT_MASTER_KEY} ${process.env.VAULT_MULT} ${process.env.VAULT_SHIFT}`;
    const { stdout } = await execPromise(cmd);
    const parsed = JSON.parse(stdout.trim());

    if (parsed.status !== "success") {
      return res.status(500).json({ error: "Error en motor de cifrado" });
    }

    // Convert output to URL-safe Base64
    const base64UrlToken = Buffer.from(parsed.result).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    res.json({ success: true, token: base64UrlToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno cifrando ruta" });
  }
});

// POST /secure-link/decrypt: Descifra un token usando Cifrado3.py para enlaces seguros
router.post("/secure-link/decrypt", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token requerido" });

  try {
    // Revert URL-safe Base64 to standard Base64 string for Python
    let base64Token = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64Token.length % 4) {
      base64Token += '=';
    }
    const encryptedRoute = Buffer.from(base64Token, 'base64').toString('utf8');

    const scriptPath = path.join(process.cwd(), 'scripts', 'Cifrado3.py');
    const cmd = `python "${scriptPath}" decrypt "${encryptedRoute}" ${process.env.VAULT_MASTER_KEY} ${process.env.VAULT_MULT} ${process.env.VAULT_SHIFT}`;
    const { stdout } = await execPromise(cmd);
    const parsed = JSON.parse(stdout.trim());

    if (parsed.status !== "success") {
      return res.status(500).json({ error: "Error en motor de cifrado" });
    }

    res.json({ success: true, route: parsed.result });
  } catch (error) {
    console.error("Error desencriptando token de URL:", error);
    res.status(500).json({ error: "Error interno descifrando ruta. Token inválido." });
  }
});

// GET /secure-link/download: Descarga el PDF desencriptado
router.get("/secure-link/download", async (req, res) => {
  const token = req.query.token as string;
  if (!token) return res.status(400).json({ error: "Token requerido" });

  try {
    let base64Token = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64Token.length % 4) {
      base64Token += '=';
    }
    const encryptedRoute = Buffer.from(base64Token, 'base64').toString('utf8');

    const scriptPath = path.join(process.cwd(), 'scripts', 'Cifrado3.py');
    const cmd = `python "${scriptPath}" decrypt "${encryptedRoute}" ${process.env.VAULT_MASTER_KEY} ${process.env.VAULT_MULT} ${process.env.VAULT_SHIFT}`;
    const { stdout } = await execPromise(cmd);
    const parsed = JSON.parse(stdout.trim());

    if (parsed.status !== "success") {
      return res.status(500).json({ error: "Error en motor de cifrado" });
    }

    const route = parsed.result;
    // Permite caracteres alfanuméricos y guiones (para UUIDs)
    const match = route.match(/\/orders\/([a-zA-Z0-9-]+)\/receipt/);
    if (!match) return res.status(400).json({ error: "Ruta no válida para descarga" });
    
    const orderId = match[1];

    const orderResult = await pool.query(`
      SELECT o.*, u.full_name as cliente_name, u.username as cliente_doc 
      FROM ordenes_compra o 
      LEFT JOIN usuarios u ON o.cliente_id = u.id 
      WHERE o.id = $1
    `, [orderId]);
    const order = orderResult.rows[0];

    if (!order) return res.status(404).json({ error: "Orden no encontrada" });

    const itemsResult = await pool.query(`
      SELECT d.quantity, d.unit_price, p.name as product_name
      FROM detalle_ordenes d
      JOIN productos p ON d.producto_id = p.id
      WHERE d.orden_id = $1
    `, [orderId]);
    
    order.items = itemsResult.rows;

    const signedPdfBuffer = await generateAndSignReceipt(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="boleta_B001-${order.id}.pdf"`);
    res.send(signedPdfBuffer);
  } catch (error) {
    console.error("Error descargando boleta segura:", error);
    res.status(500).json({ error: "Error interno descifrando ruta." });
  }
});

export default router;
