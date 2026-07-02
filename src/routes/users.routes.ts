import express from "express";
import pool from "../../database/db";
import { requirePrivilege } from "../middleware/authMiddleware";
import { logAudit } from "../utils/logger";

const router = express.Router();

router.get("/my-activity", requirePrivilege(1), async (req, res) => {
  const currentUser = (req as any).user;
  try {
    const result = await pool.query(`
      SELECT id, created_at as timestamp, action, status, ip_address as "ipAddress", user_agent as "userAgent"
      FROM audit_logs
      WHERE user_id = $1
      ORDER BY created_at DESC LIMIT 5
    `, [currentUser.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error fetch my-activity" });
  }
});

router.get("/me/profile", requirePrivilege(1), async (req, res) => {
  const currentUser = (req as any).user;
  try {
    const result = await pool.query(`
      SELECT phone, address, points
      FROM usuarios
      WHERE id = $1
    `, [currentUser.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error fetching profile" });
  }
});

router.put("/me/profile", requirePrivilege(1), async (req, res) => {
  const currentUser = (req as any).user;
  const { phone, address } = req.body;
  try {
    const result = await pool.query(`
      UPDATE usuarios
      SET phone = $1, address = $2
      WHERE id = $3
      RETURNING phone, address, points
    `, [phone, address, currentUser.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error updating profile" });
  }
});

router.put("/me/password", requirePrivilege(1), async (req, res) => {
  const currentUser = (req as any).user;
  const { currentPassword, newPassword } = req.body;
  
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
  }

  try {
    const userRes = await pool.query("SELECT password_hash FROM usuarios WHERE id = $1", [currentUser.id]);
    const userDb = userRes.rows[0];

    const isValid = await require("bcryptjs").compare(currentPassword, userDb.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Contraseña actual incorrecta" });
    }

    const salt = await require("bcryptjs").genSalt(10);
    const newHash = await require("bcryptjs").hash(newPassword, salt);

    await pool.query("UPDATE usuarios SET password_hash = $1 WHERE id = $2", [newHash, currentUser.id]);
    await logAudit(currentUser.id, currentUser.username, "PASSWORD_CHANGED", "success", req, `El usuario cambió su contraseña exitosamente.`);
    
    res.json({ success: true, message: "Contraseña actualizada" });
  } catch (error) {
    console.error("Error cambiando contraseña", error);
    res.status(500).json({ error: "Error cambiando contraseña" });
  }
});

router.post("/link-google", requirePrivilege(1), async (req, res) => {
  const { credential } = req.body;
  const currentUser = (req as any).user;
  const userPrivilege = (req as any).userPrivilege;

  if (userPrivilege >= 3) {
    await logAudit(currentUser.id, currentUser.username, "GOOGLE_LINK_BLOCKED_RBAC", "warn", req, `Intento denegado de vinculación Google (Nivel ${userPrivilege}).`);
    return res.status(403).json({ success: false, message: "Autenticación externa (SSO) deshabilitada." });
  }

  if (!credential) return res.status(400).json({ success: false, message: "Token no proporcionado." });

  try {
    const googleResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${credential}` } });
    const payload = await googleResponse.json();
    if (!googleResponse.ok || !payload || !payload.email) return res.status(401).json({ success: false, message: "Token inválido." });

    await pool.query(`UPDATE usuarios SET auth_type = 'google' WHERE id = $1`, [currentUser.id]);
    await logAudit(currentUser.id, currentUser.username, "GOOGLE_ACCOUNT_LINKED", "success", req, `Cuenta vinculada exitosamente con Google SSO.`);

    const { password_hash, ...safeUser } = currentUser;
    res.json({ success: true, message: "Cuenta vinculada con éxito.", user: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error interno." });
  }
});

router.post("/unlink-google", requirePrivilege(1), async (req, res) => {
  const currentUser = (req as any).user;
  const userPrivilege = (req as any).userPrivilege;

  if (userPrivilege >= 3) {
    await logAudit(currentUser.id, currentUser.username, "GOOGLE_UNLINK_BLOCKED_RBAC", "warn", req, `Intento denegado de desvinculación Google (Nivel ${userPrivilege}).`);
    return res.status(403).json({ success: false, message: "Operación no permitida." });
  }

  try {
    await pool.query(`UPDATE usuarios SET auth_type = 'local' WHERE id = $1`, [currentUser.id]);
    await logAudit(currentUser.id, currentUser.username, "GOOGLE_ACCOUNT_UNLINKED", "success", req, `Cuenta desvinculada de Google SSO.`);
    
    const { password_hash, ...safeUser } = currentUser;
    res.json({ success: true, message: "Cuenta desvinculada con éxito.", user: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error interno." });
  }
});

export default router;
