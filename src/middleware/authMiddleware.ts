import express from "express";
import jwt from "jsonwebtoken";
import pool from "../../database/db";
import { activeSessionsMap, revokedSessionsSet } from "../utils/sessionMap";
import { logSecurityEvent } from "../utils/logger";

const JWT_SECRET = process.env.JWT_SECRET || 'sentinel-secure-jwt-secret-2026';

export const requirePrivilege = (minLevel: number) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const rawSessionId = req.headers['x-session-id'] as string; // We still read this to match against the Map
    const sessionId = rawSessionId ? rawSessionId.split(',')[0].trim() : '';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token JWT no proporcionado' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (sessionId && revokedSessionsSet.has(sessionId)) {
        return res.status(401).json({ 
          success: false, 
          message: 'Sesión revocada remotamente por un administrador.',
          code: 'SESSION_REVOKED'
        });
      }

      // Concurrency check using the in-memory Map
      if (sessionId) {
        const activeSession = activeSessionsMap.get(decoded.id);
        if (activeSession) {
          if (activeSession.sessionId !== sessionId) {
            return res.status(401).json({ 
              success: false, 
              message: 'Sesión revocada. Has iniciado sesión en otro dispositivo.',
              code: 'SESSION_REVOKED'
            });
          }
        } else {
          // El servidor se reinició y la memoria se limpió. Restauramos la sesión activa en el mapa.
          activeSessionsMap.set(decoded.id, {
            sessionId: sessionId,
            browser: req.headers['user-agent'] || 'Restaurada tras reinicio',
            ip: req.ip || "127.0.0.1",
            startedAt: new Date().toISOString()
          });
        }
      }

      // Query real-time user data and role privilege from PostgreSQL
      const result = await pool.query(`
        SELECT u.id, u.username, u.is_locked, r.privilege_level as level 
        FROM usuarios u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.id = $1
      `, [decoded.id]);

      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
      }

      if (user.is_locked) {
        await logSecurityEvent(user.id, user.username, "ACCOUNT_LOCKED", req);
        return res.status(403).json({ success: false, message: 'Cuenta bloqueada por seguridad' });
      }

      if (user.level < minLevel) {
        return res.status(403).json({ 
          success: false, 
          message: `Acceso denegado. Nivel requerido: \${minLevel}, tu nivel: \${user.level}` 
        });
      }

      // Attach to request
      (req as any).user = user;
      (req as any).userPrivilege = user.level;
      
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
    }
  };
};
