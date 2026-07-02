import express from "express";
import pool from "../../database/db";
import crypto from "crypto";

const SECRET_SALT = process.env.SECRET_SALT || "SENTINEL_DEFAULT_SECURE_SALT_2026";

// Global active client connections for Real-time Server-Sent Events (SSE)
export const sseClients: { id: string; req: express.Request; res: express.Response; userId?: string | null }[] = [];

// Broadcast an event to all or specific SSE clients
export async function broadcastToSse(event: string, data: any, targetedUserId?: string | null) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  
  // We need the roles to check admin broadcasting
  let adminIds: string[] = [];
  if (targetedUserId === "admin") {
    try {
      const result = await pool.query(`
        SELECT u.id FROM usuarios u 
        JOIN roles r ON u.role_id = r.id 
        WHERE r.privilege_level >= 4
      `);
      adminIds = result.rows.map(r => r.id);
    } catch (error) {
      console.error("Error fetching admins for SSE", error);
    }
  }

  sseClients.forEach(client => {
    if (!targetedUserId || 
        client.userId === targetedUserId || 
        (targetedUserId === "admin" && client.userId && adminIds.includes(client.userId))) {
      try {
        client.res.write(payload);
      } catch (err) {
        // Ignored, client likely disconnected
      }
    }
  });
}

// Helper to extract the actual client IP robustly
export const getClientIp = (req: express.Request): string => {
  const cfIp = req.headers['cf-connecting-ip'] as string;
  if (cfIp) return cfIp.split(',')[0].trim();

  const trueClientIp = req.headers['true-client-ip'] as string;
  if (trueClientIp) return trueClientIp.split(',')[0].trim();

  const realIp = req.headers['x-real-ip'] as string;
  if (realIp) return realIp.split(',')[0].trim();

  const forwardedFor = req.headers['x-forwarded-for'] as string;
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
};

// Log high-importance security events to Postgres
export const logSecurityEvent = async (
  userId: string | null,
  username: string | null,
  eventType: 'LOGIN_FAILED' | 'ACCOUNT_LOCKED' | 'BRUTE_FORCE_DETECTED',
  req: express.Request
) => {
  try {
    const ip = getClientIp(req);
    const dateStr = new Date().toISOString().split('T')[0]; // Simple date part for hash
    const signatureInput = `${userId || 'ANON'}${eventType}warn${dateStr}${SECRET_SALT}`;
    const firmaDigital = crypto.createHmac('sha256', SECRET_SALT).update(signatureInput).digest('hex');

    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, status, ip_address, user_agent, details, location, country_code, firma_digital)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [userId, username || "ANONYMOUS", eventType, 'warn', ip, req.headers['user-agent'] || 'Unknown', 'Evento de seguridad detectado', 'Red Externa', 'LOC', firmaDigital]
    );
  } catch (error) {
    console.error("Error logging security event", error);
  }
};

// Log audit entries
export const logAudit = async (
  userId: string | null,
  username: string | null,
  action: string,
  status: "success" | "warn" | "error",
  req: express.Request,
  details: string
) => {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    const dateStr = new Date().toISOString().split('T')[0];
    const signatureInput = `${userId || 'SISTEMA'}${action}${status}${dateStr}${SECRET_SALT}`;
    const firmaDigital = crypto.createHmac('sha256', SECRET_SALT).update(signatureInput).digest('hex');
    
    // Insert into DB
    const result = await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, status, ip_address, user_agent, details, location, country_code, firma_digital)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [userId, username || 'SISTEMA', action, status, ip, userAgent, details, "Red Interna", "LOC", firmaDigital]
    );

    const logEntry = result.rows[0];

    // Broadcast SSE to admins for real-time monitoring
    broadcastToSse("audit_log", logEntry, "admin");
    
  } catch (error) {
    console.error("Error en logAudit hacia PostgreSQL:", error);
  }
};
