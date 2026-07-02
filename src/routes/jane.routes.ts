import express from "express";
import { requirePrivilege } from "../middleware/authMiddleware";
import pool from "../../database/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateAndSignReceipt } from "../utils/pdfSigner";

const SECRET_SALT = process.env.SECRET_SALT || "SENTINEL_DEFAULT_SECURE_SALT_2026";
const router = express.Router();

// GET /categorias: Everyone can read
router.get("/categorias", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categorias ORDER BY name ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error fetching categorias" });
  }
});

// GET /products: Everyone can read (Store & POS)
router.get("/products", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as categoria_name 
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error fetching products" });
  }
});

// POST /products: Admin (Level >= 3) can create
router.post("/products", requirePrivilege(3), async (req, res) => {
  try {
    const { name, description, price, stock, categoria_id, image_url, is_published } = req.body;
    const result = await pool.query(
      `INSERT INTO productos (categoria_id, name, description, price, stock, image_url, is_published) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [categoria_id, name, description, price, stock, image_url, is_published]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error creating product" });
  }
});

// PUT /products/:id: Admin (Level >= 3) can update
router.put("/products/:id", requirePrivilege(3), async (req, res) => {
  try {
    const { name, description, price, stock, categoria_id, image_url, is_published } = req.body;
    const result = await pool.query(
      `UPDATE productos 
       SET categoria_id = $1, name = $2, description = $3, price = $4, stock = $5, image_url = $6, is_published = $7
       WHERE id = $8 RETURNING *`,
      [categoria_id, name, description, price, stock, image_url, is_published, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error updating product" });
  }
});

// PATCH /products/:id/stock: Seller (Level >= 2) can update stock only
router.patch("/products/:id/stock", requirePrivilege(2), async (req, res) => {
  try {
    const { stock } = req.body;
    const result = await pool.query(
      `UPDATE productos SET stock = $1 WHERE id = $2 RETURNING *`,
      [stock, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error updating stock" });
  }
});

// DELETE /products/:id: Admin (Level >= 3)
router.delete("/products/:id", requirePrivilege(3), async (req, res) => {
  try {
    await pool.query("DELETE FROM productos WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error deleting product" });
  }
});

// GET /customers: Seller (Level >= 2) can see list of customers
router.get("/customers", requirePrivilege(2), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.full_name, u.email, up.phone, up.address, up.points
      FROM usuarios u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE r.privilege_level = 1
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error fetching customers" });
  }
});

// POST /customers: Seller (Level >= 2) can create a new customer
router.post("/customers", requirePrivilege(2), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { username, full_name, email, password, address, phone } = req.body;
    
    // 1. Check if email already exists
    const existing = await client.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }

    // 2. Get customer role id (level 1)
    const roleResult = await client.query("SELECT id FROM roles WHERE privilege_level = 1 LIMIT 1");
    if (roleResult.rows.length === 0) {
      return res.status(500).json({ error: "Rol de cliente no encontrado" });
    }
    const roleId = roleResult.rows[0].id;

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password || 'Cliente123!', 10);

    // 4. Create user
    const userResult = await client.query(
      `INSERT INTO usuarios (role_id, username, email, full_name, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, email`,
      [roleId, username, email, full_name, hashedPassword]
    );
    const newUserId = userResult.rows[0].id;

    // 5. Create user profile
    await client.query(
      `INSERT INTO user_profiles (user_id, phone, address, points) VALUES ($1, $2, $3, 0)`,
      [newUserId, phone || null, address || null]
    );

    await client.query('COMMIT');
    res.status(201).json(userResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error creating customer:", error);
    res.status(500).json({ error: "Error creando cliente" });
  } finally {
    client.release();
  }
});

// GET /orders: Admin and Sellers (Level >= 2) can see all orders for integral tracking
router.get("/orders", requirePrivilege(2), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, u.username as created_by 
      FROM ordenes_compra o
      JOIN usuarios u ON o.usuario_id = u.id
      ORDER BY o.created_at DESC
    `);
    
    // Fetch details and validate signature for each order
    const orders = result.rows;
    for (let order of orders) {
      const detailsResult = await pool.query(`
        SELECT d.*, p.name as producto_name 
        FROM detalle_ordenes d
        JOIN productos p ON d.producto_id = p.id
        WHERE d.orden_id = $1
      `, [order.id]);
      order.items = detailsResult.rows;

      // Validate HMAC signature
      const expectedSignature = crypto.createHmac('sha256', SECRET_SALT)
        .update(`${Number(order.total).toFixed(2)}${order.metodo_pago || 'Efectivo'}${order.usuario_id}${order.cliente_id || 'ANONIMO'}${SECRET_SALT}`)
        .digest('hex');
      
      // Legacy signature fallback check
      const dateStr = new Date(order.created_at).toISOString().split('T')[0];
      const legacySignature = crypto.createHmac('sha256', SECRET_SALT)
        .update(`${order.total}${order.usuario_id}${dateStr}${SECRET_SALT}`)
        .digest('hex');

      order.is_valid_signature = (order.firma_digital === expectedSignature || order.firma_digital === legacySignature);
    }
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Error fetching orders" });
  }
});

// GET /orders/my-orders: Fetch orders for the logged-in user (Level >= 1)
router.get("/orders/my-orders", requirePrivilege(1), async (req, res) => {
  const currentUser = (req as any).user;
  try {
    const result = await pool.query(`
      SELECT o.*, u.username as created_by 
      FROM ordenes_compra o
      JOIN usuarios u ON o.usuario_id = u.id
      WHERE o.usuario_id = $1
      ORDER BY o.created_at DESC
    `, [currentUser.id]);
    
    // Fetch details and validate signature for each order
    const orders = result.rows;
    for (let order of orders) {
      const detailsResult = await pool.query(`
        SELECT d.*, p.name as producto_name 
        FROM detalle_ordenes d
        JOIN productos p ON d.producto_id = p.id
        WHERE d.orden_id = $1
      `, [order.id]);
      order.items = detailsResult.rows;

      // Validate HMAC signature
      const expectedSignature = crypto.createHmac('sha256', SECRET_SALT)
        .update(`${Number(order.total).toFixed(2)}${order.metodo_pago || 'Efectivo'}${order.usuario_id}${order.cliente_id || 'ANONIMO'}${SECRET_SALT}`)
        .digest('hex');
      
      // Legacy signature fallback check
      const dateStr = new Date(order.created_at).toISOString().split('T')[0];
      const legacySignature = crypto.createHmac('sha256', SECRET_SALT)
        .update(`${order.total}${order.usuario_id}${dateStr}${SECRET_SALT}`)
        .digest('hex');

      order.is_valid_signature = (order.firma_digital === expectedSignature || order.firma_digital === legacySignature);
    }
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Error fetching my orders" });
  }
});

// GET /orders/:id/inspect-hmac: Inspect HMAC for Item 6
router.get("/orders/:id/inspect-hmac", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ordenes_compra WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Order not found" });
    
    const order = result.rows[0];
    const formattedTotal = Number(order.total).toFixed(2);
    const signatureInput = `${formattedTotal}${order.metodo_pago || 'Efectivo'}${order.usuario_id}${order.cliente_id || 'ANONIMO'}${SECRET_SALT}`;
    
    res.json({
      payload: `${formattedTotal}${order.metodo_pago || 'Efectivo'}${order.usuario_id}${order.cliente_id || 'ANONIMO'}`,
      salt: SECRET_SALT,
      hash: order.firma_digital
    });
  } catch (error) {
    res.status(500).json({ error: "Error inspecting HMAC" });
  }
});

// POST /checkout: Web Store Customers (Public or Level 1)
router.post("/checkout", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { items, total, cliente_id } = req.body;
    
    // Get a fallback system user (an admin) for the 'usuario_id' field which might be NOT NULL
    const adminResult = await client.query(`SELECT id FROM usuarios WHERE level >= 4 LIMIT 1`);
    const systemUserId = adminResult.rows[0]?.id || null;
    const finalUserId = cliente_id || systemUserId;
    
    // CRÍTICO - ACTUALIZACIÓN DE FIRMA HMAC
    const formattedTotal = Number(total).toFixed(2);
    const signatureInput = `${formattedTotal}Web${finalUserId}${cliente_id || 'ANONIMO'}${SECRET_SALT}`;
    const firmaDigital = crypto.createHmac('sha256', SECRET_SALT).update(signatureInput).digest('hex');

    // Insert order (status PENDING for web orders)
    const orderResult = await client.query(
      `INSERT INTO ordenes_compra (usuario_id, cliente_id, total, status, firma_digital, metodo_pago) VALUES ($1, $2, $3, 'PENDING', $4, 'Web') RETURNING *`,
      [finalUserId, cliente_id || null, total, firmaDigital]
    );
    const orderId = orderResult.rows[0].id;

    // Insert items and decrease stock
    for (const item of items) {
      await client.query(
        `INSERT INTO detalle_ordenes (orden_id, producto_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
        [orderId, item.id, item.quantity, item.price]
      );
      await client.query(
        `UPDATE productos SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, item.id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(orderResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error processing web checkout:", error);
    res.status(500).json({ error: "Error processing checkout" });
  } finally {
    client.release();
  }
});

// POST /orders: POS (Level >= 2) can generate orders
router.post("/orders", requirePrivilege(2), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { items, total, cliente_id, metodo_pago, monto_recibido, vuelto } = req.body;
    const userId = (req as any).user?.id;

    // CRÍTICO - ACTUALIZACIÓN DE FIRMA HMAC
    const formattedTotal = Number(total).toFixed(2);
    const signatureInput = `${formattedTotal}${metodo_pago || 'Efectivo'}${userId}${cliente_id || 'ANONIMO'}${SECRET_SALT}`;
    const firmaDigital = crypto.createHmac('sha256', SECRET_SALT).update(signatureInput).digest('hex');

    // Insert order (status COMPLETED as requested)
    const orderResult = await client.query(
      `INSERT INTO ordenes_compra (usuario_id, cliente_id, total, status, firma_digital, metodo_pago, monto_recibido, vuelto) VALUES ($1, $2, $3, 'COMPLETED', $4, $5, $6, $7) RETURNING *`,
      [userId, cliente_id || null, total, firmaDigital, metodo_pago || 'Efectivo', monto_recibido || null, vuelto || null]
    );
    const orderId = orderResult.rows[0].id;

    // Insert items and decrease stock
    for (const item of items) {
      await client.query(
        `INSERT INTO detalle_ordenes (orden_id, producto_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
        [orderId, item.producto_id, item.quantity, item.unit_price]
      );
      await client.query(
        `UPDATE productos SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, item.producto_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(orderResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error processing order:", error);
    res.status(500).json({ error: "Error processing order" });
  } finally {
    client.release();
  }
});

// PUT /orders/:id/status: Admin (Level >= 3) can update status
router.put("/orders/:id/status", requirePrivilege(3), async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      `UPDATE ordenes_compra SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error updating order status" });
  }
});

// GET /orders/:id/receipt: Level >= 2 can download digitally signed receipt
router.get("/orders/:id/receipt", requirePrivilege(2), async (req, res) => {
  try {
    const orderResult = await pool.query(`
      SELECT o.*, u.full_name as cliente_name, u.username as cliente_doc 
      FROM ordenes_compra o 
      LEFT JOIN usuarios u ON o.cliente_id = u.id 
      WHERE o.id = $1
    `, [req.params.id]);
    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    // Only level 2+ can download (already enforced by route middleware requirePrivilege(2))
    const userLevel = (req as any).userPrivilege;
    if (userLevel < 2) {
      return res.status(403).json({ error: "No tienes permiso para ver esta boleta" });
    }

    const itemsResult = await pool.query(`
      SELECT d.quantity, d.unit_price, p.name as product_name
      FROM detalle_ordenes d
      JOIN productos p ON d.producto_id = p.id
      WHERE d.orden_id = $1
    `, [req.params.id]);
    
    order.items = itemsResult.rows;

    const signedPdfBuffer = await generateAndSignReceipt(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="boleta_B001-${order.id}.pdf"`);
    res.send(signedPdfBuffer);
  } catch (error) {
    console.error("Error generating receipt:", error);
    res.status(500).json({ error: "Error generando la boleta firmada" });
  }
});

// GET /dashboard: Manager (Level >= 3)
router.get("/dashboard", requirePrivilege(3), async (req, res) => {
  try {
    // 1. Total revenue all time
    const revResult = await pool.query(`SELECT SUM(total) as revenue FROM ordenes_compra WHERE status = 'COMPLETED'`);
    const revenue = parseFloat(revResult.rows[0].revenue || 0);

    // 2. Pending orders count (if any)
    const pendingResult = await pool.query(`SELECT COUNT(*) as count FROM ordenes_compra WHERE status = 'PENDING'`);
    const pendingCount = parseInt(pendingResult.rows[0].count || 0, 10);

    // 3. Low stock products (<= 10)
    const stockResult = await pool.query(`SELECT COUNT(*) as count FROM productos WHERE stock <= 10`);
    const lowStockCount = parseInt(stockResult.rows[0].count || 0, 10);

    // 4. Sales last 7 days grouped by day
    const chartResult = await pool.query(`
      SELECT 
        DATE(created_at) as date, 
        SUM(total) as total 
      FROM ordenes_compra 
      WHERE status = 'COMPLETED' 
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);

    // Complete missing days for a nice chart (7 days)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const row = chartResult.rows.find(r => {
        const rDate = new Date(r.date);
        return rDate.toISOString().split('T')[0] === dateStr;
      });
      chartData.push({
        date: dateStr,
        sales: row ? parseFloat(row.total) : 0
      });
    }

    res.json({
      kpis: {
        revenue,
        pendingCount,
        lowStockCount
      },
      chartData
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching dashboard data" });
  }
});

export default router;
