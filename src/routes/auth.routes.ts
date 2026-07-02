import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import pool from "../../database/db";
import { activeSessionsMap } from "../utils/sessionMap";
import { logAudit, logSecurityEvent, broadcastToSse, sseClients } from "../utils/logger";
import { requirePrivilege } from "../middleware/authMiddleware";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sentinel-secure-jwt-secret-2026';

const makeId = () => Math.random().toString(36).substring(2, 11);

// Helper to determine role and JWT
const generateAuthResponse = (user: any, req: express.Request, browserInfo: string) => {
  const sessionId = "sess-" + makeId();
  
  // Track this session in our Map
  activeSessionsMap.set(user.id, {
    sessionId,
    browser: browserInfo,
    ip: req.ip || "127.0.0.1",
    startedAt: new Date().toISOString()
  });

  const token = jwt.sign(
    { id: user.id, role: user.role_key, level: user.level }, 
    JWT_SECRET, 
    { expiresIn: '8h' }
  );

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.full_name,
      role: user.role_key,
      level: user.level,
      avatarUrl: user.avatar_url,
      authType: user.auth_type
    },
    token,
    sessionId
  };
};

router.post("/login", async (req, res) => {
  const { email, usernameOrEmail, password, browserInfo, overrideSession } = req.body;
  const loginId = email || usernameOrEmail;

  try {
    const result = await pool.query(`
      SELECT u.*, r.key as role_key, r.privilege_level as level 
      FROM usuarios u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.email = $1 OR u.username = $1
    `, [loginId]);

    const user = result.rows[0];

    if (!user) {
      await logSecurityEvent(null, loginId, "LOGIN_FAILED", req);
      return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }

    if (user.is_locked) {
      if (user.locked_until) {
        const now = new Date();
        const lockedUntilTime = new Date(user.locked_until);
        if (now >= lockedUntilTime) {
          await pool.query('UPDATE usuarios SET is_locked = false, failed_attempts = 0, locked_until = null WHERE id = $1', [user.id]);
          user.is_locked = false;
          user.failed_attempts = 0;
          user.locked_until = null;
        } else {
          await logSecurityEvent(user.id, user.username, "ACCOUNT_LOCKED", req);
          return res.status(429).json({ success: false, message: "Cuenta bloqueada temporalmente.", lockedUntil: user.locked_until });
        }
      } else {
        await logSecurityEvent(user.id, user.username, "ACCOUNT_LOCKED", req);
        return res.status(403).json({ success: false, message: "Cuenta bloqueada por múltiples intentos fallidos." });
      }
    }

    if (user.auth_type !== 'local' && user.auth_type !== 'hybrid') {
      return res.status(400).json({ success: false, message: "Esta cuenta requiere inicio de sesión con proveedor externo." });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      const newAttempts = user.failed_attempts + 1;
      let lockUpdate = "";
      let params: any[] = [newAttempts, user.id];
      
      if (newAttempts >= 3) {
        lockUpdate = ", is_locked = true, locked_until = NOW() + INTERVAL '2 minutes'";
        await logSecurityEvent(user.id, user.username, "BRUTE_FORCE_DETECTED", req);
        await logAudit(user.id, user.username, "USER_LOCKED", "error", req, "Bloqueo automático por límite de intentos.");
      }
      
      await pool.query(`UPDATE usuarios SET failed_attempts = $1 ${lockUpdate} WHERE id = $2`, params);
      await logSecurityEvent(user.id, user.username, "LOGIN_FAILED", req);
      
      if (newAttempts >= 3) {
        const lockRes = await pool.query(`SELECT locked_until FROM usuarios WHERE id = $1`, [user.id]);
        return res.status(429).json({ success: false, message: "Demasiados intentos. Cuenta bloqueada.", lockedUntil: lockRes.rows[0].locked_until });
      }

      return res.status(401).json({ success: false, message: `Credenciales incorrectas. Intento fallido ${newAttempts}/3` });
    }

    // Reset failed attempts on success
    await pool.query('UPDATE usuarios SET failed_attempts = 0 WHERE id = $1', [user.id]);

    // Check concurrency
    const previousSession = activeSessionsMap.get(user.id);
    if (previousSession) {
      await logAudit(user.id, user.username, "PREVIOUS_SESSION_TERMINATED", "warn", req, `Sesión anterior (\${previousSession.sessionId}) revocada remotamente por nueva sesión del usuario.`);
      broadcastToSse("force_logout", { reason: "CONCURRENT_LOGIN", message: "Has iniciado sesión en otro dispositivo." }, user.id);
    }

    const response = generateAuthResponse(user, req, browserInfo);
    await logAudit(user.id, user.username, "LOGIN_SUCCESS", "success", req, `Inicio de sesión exitoso desde IP: \${req.ip}. Nueva sesión: \${response.sessionId}`);
    
    res.json(response);
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

router.post("/logout", requirePrivilege(1), async (req, res) => {
  const currentUser = (req as any).user;
  const rawSessionId = req.headers['x-session-id'] as string;
  const sessionId = rawSessionId ? rawSessionId.split(',')[0].trim() : '';
  
  if (currentUser) {
    activeSessionsMap.delete(currentUser.id);
    await logAudit(currentUser.id, currentUser.username, "LOGOUT_SUCCESS", "success", req, `Cierre de sesión manual. ID Sesión: \${sessionId}`);
  }
  res.json({ success: true });
});

// SSE Endpoint
router.get("/sse", (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = makeId();
  // Attempt to parse JWT to identify user for targeted SSE
  const token = req.query.token as string;
  let userId: string | null = null;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      userId = decoded.id;
    } catch (e) { }
  }

  sseClients.push({ id: clientId, req, res, userId });

  res.on('close', () => {
    const index = sseClients.findIndex((c: any) => c.id === clientId);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

router.post("/register", async (req, res) => {
  const { username, email, fullName, password } = req.body;
  try {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_#-])[A-Za-z\d@$!%*?&_#-]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({ 
        success: false, 
        message: "La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula, un número y un símbolo." 
      });
    }

    const hash = await bcrypt.hash(password, 10);
    // Asignar rol de Nivel 1 (Cliente) por defecto buscando su UUID real en la tabla roles
    const roleRes = await pool.query(`SELECT id FROM roles WHERE privilege_level = 1 LIMIT 1`);
    if (roleRes.rows.length === 0) throw new Error("No se encontró un rol de Nivel 1 en la base de datos.");
    const roleId = roleRes.rows[0].id;
    
    await pool.query(
      `INSERT INTO usuarios (username, email, full_name, password_hash, role_id) VALUES ($1, $2, $3, $4, $5)`,
      [username, email, fullName, hash, roleId]
    );
    await logAudit(null, username, "USER_REGISTERED", "success", req, `Nuevo usuario registrado.`);
    res.json({ success: true, message: "Usuario registrado con éxito" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al registrar usuario." });
  }
});

router.post("/forgot-password", async (req, res) => {
  res.json({ success: true, message: "Instrucciones enviadas (simulado)" });
});

router.post("/reset-password", async (req, res) => {
  res.json({ success: true, message: "Contraseña cambiada con éxito (simulado)" });
});

router.post("/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ success: false, message: "Token no proporcionado" });

  try {
    const googleResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${credential}` } });
    const payload = await googleResponse.json();
    
    if (!googleResponse.ok || !payload || !payload.email) {
      return res.status(401).json({ success: false, message: "Fallo de autenticación con Google." });
    }

    const { email, name, picture } = payload;
    let userResult = await pool.query(`SELECT * FROM usuarios WHERE email = $1`, [email]);
    let user = userResult.rows[0];

    if (!user) {
      // Registrar nuevo usuario como cliente (Nivel 1)
      const roleRes = await pool.query(`SELECT id FROM roles WHERE privilege_level = 1 LIMIT 1`);
      if (roleRes.rows.length === 0) throw new Error("No se encontró un rol de Nivel 1 en la base de datos.");
      const roleId = roleRes.rows[0].id;
      
      const insertResult = await pool.query(
        `INSERT INTO usuarios (username, email, full_name, role_id, auth_type, avatar_url) 
         VALUES ($1, $2, $3, $4, 'google', $5) RETURNING *`,
        [email.split('@')[0], email, name, roleId, picture]
      );
      user = insertResult.rows[0];
      await logAudit(user.id, user.username, "USER_REGISTERED_GOOGLE", "success", req, `Nuevo cliente registrado vía Google.`);
    } else {
      // Identity Linking: Si ya existía como local, lo convertimos a hybrid
      if (user.auth_type === 'local') {
        const updateRes = await pool.query(
          `UPDATE usuarios SET auth_type = 'hybrid' WHERE id = $1 RETURNING *`,
          [user.id]
        );
        user = updateRes.rows[0];
        await logAudit(user.id, user.username, "IDENTITY_LINKED", "success", req, `Cuenta local vinculada con Google OAuth.`);
      }
    }

    if (user.is_locked) {
      return res.status(403).json({ success: false, message: "Cuenta bloqueada temporalmente." });
    }

    const browserInfo = {
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      country: 'PE', 
      city: 'Lima' 
    };

    const response = generateAuthResponse(user, req, JSON.stringify(browserInfo));
    await logAudit(user.id, user.username, "LOGIN_SUCCESS_GOOGLE", "success", req, `Inicio de sesión Google. Nueva sesión: ${response.sessionId}`);
    
    res.json(response);
  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(500).json({ success: false, message: "Error interno verificando Google" });
  }
});

export default router;
