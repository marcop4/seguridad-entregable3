import express from "express";
import pool from "../../database/db";
import { requirePrivilege } from "../middleware/authMiddleware";

const router = express.Router();

// ---------------------------------------------------------
// [LEVEL 2] SELLER DASHBOARD
// ---------------------------------------------------------
router.get("/seller", requirePrivilege(2), async (req, res) => {
  const userId = (req as any).user.id;
  try {
    const kpisResult = await pool.query(`
      SELECT 
        COALESCE(SUM(total), 0) as total_sales,
        COUNT(id) as total_orders
      FROM ordenes_compra 
      WHERE usuario_id = $1 
        AND created_at >= date_trunc('day', NOW())
    `, [userId]);

    const chartResult = await pool.query(`
      SELECT 
        date_trunc('day', created_at) as date,
        SUM(total) as sales
      FROM ordenes_compra
      WHERE usuario_id = $1
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY date
      ORDER BY date ASC
    `, [userId]);

    res.json({
      kpis: {
        totalSales: parseFloat(kpisResult.rows[0].total_sales),
        totalOrders: parseInt(kpisResult.rows[0].total_orders, 10)
      },
      chartData: chartResult.rows.map(r => ({
        date: r.date.toISOString(),
        sales: parseFloat(r.sales)
      }))
    });
  } catch (error) {
    console.error("Seller dashboard error:", error);
    res.status(500).json({ error: "Error cargando métricas de ventas." });
  }
});

// ---------------------------------------------------------
// [LEVEL 3] MANAGER DASHBOARD
// ---------------------------------------------------------
router.get("/manager", requirePrivilege(3), async (req, res) => {
  try {
    // Ingresos y ordenes globales
    const kpisResult = await pool.query(`
      SELECT 
        (SELECT COALESCE(SUM(total), 0) FROM ordenes_compra) as revenue,
        (SELECT COUNT(id) FROM ordenes_compra WHERE status = 'PENDING') as pending_count,
        (SELECT COUNT(id) FROM productos WHERE stock <= 10) as low_stock_count
    `);

    // Chart data 7 días global
    const chartResult = await pool.query(`
      SELECT 
        date_trunc('day', created_at) as date,
        SUM(total) as sales
      FROM ordenes_compra
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY date
      ORDER BY date ASC
    `);

    res.json({
      kpis: {
        revenue: parseFloat(kpisResult.rows[0].revenue),
        pendingCount: parseInt(kpisResult.rows[0].pending_count, 10),
        lowStockCount: parseInt(kpisResult.rows[0].low_stock_count, 10)
      },
      chartData: chartResult.rows.map(r => ({
        date: r.date.toISOString(),
        sales: parseFloat(r.sales)
      }))
    });
  } catch (error) {
    console.error("Manager dashboard error:", error);
    res.status(500).json({ error: "Error cargando métricas financieras." });
  }
});

// ---------------------------------------------------------
// [LEVEL 4] SUPERADMIN DASHBOARD
// ---------------------------------------------------------
router.get("/admin", requirePrivilege(4), async (req, res) => {
  try {
    // Reuse manager data (could extract to a shared function in real life)
    const managerKpisResult = await pool.query(`
      SELECT 
        (SELECT COALESCE(SUM(total), 0) FROM ordenes_compra) as revenue,
        (SELECT COUNT(id) FROM ordenes_compra WHERE status = 'PENDING') as pending_count,
        (SELECT COUNT(id) FROM productos WHERE stock <= 10) as low_stock_count
    `);

    const chartResult = await pool.query(`
      SELECT 
        date_trunc('day', created_at) as date,
        SUM(total) as sales
      FROM ordenes_compra
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY date
      ORDER BY date ASC
    `);

    // Sentinel Data (Audit & Sec)
    const sentinelResult = await pool.query(`
      SELECT 
        (SELECT COUNT(id) FROM audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours') as audit_logs_24h,
        (SELECT COUNT(id) FROM audit_logs WHERE action = 'BRUTE_FORCE_DETECTED' AND created_at >= NOW() - INTERVAL '7 days') as brute_force_7d
    `);

    res.json({
      managerData: {
        kpis: {
          revenue: parseFloat(managerKpisResult.rows[0].revenue),
          pendingCount: parseInt(managerKpisResult.rows[0].pending_count, 10),
          lowStockCount: parseInt(managerKpisResult.rows[0].low_stock_count, 10)
        },
        chartData: chartResult.rows.map(r => ({
          date: r.date.toISOString(),
          sales: parseFloat(r.sales)
        }))
      },
      sentinelData: {
        auditLogs24h: parseInt(sentinelResult.rows[0].audit_logs_24h, 10),
        bruteForce7d: parseInt(sentinelResult.rows[0].brute_force_7d, 10)
      }
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ error: "Error cargando métricas de Sentinel." });
  }
});

export default router;
