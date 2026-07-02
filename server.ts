import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import authRoutes from "./src/routes/auth.routes";
import adminRoutes from "./src/routes/admin.routes";
import usersRoutes from "./src/routes/users.routes";
import janeRoutes from "./src/routes/jane.routes";
import dashboardRoutes from "./src/routes/dashboard.routes";
import rateLimit from "express-rate-limit";

dotenv.config();

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  const PORT = 3000;
  
  app.use(express.json());

  // DDoS Prevention
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // Limit each IP to 5000 requests per window
    message: { success: false, message: "Demasiadas peticiones a la API. Intente más tarde." }
  });

  const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 15,
    message: { success: false, message: "Exceso de peticiones de inicio de sesión. Bloqueo temporal por seguridad." }
  });

  app.use("/api/", globalLimiter);
  app.use("/api/auth/login", authLimiter);

  // Mount API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/users", usersRoutes);

  app.use("/api/jane", janeRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  // Vite middleware for development or Static compiler serving for Cloud Run production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Sentinel Server started on http://0.0.0.0:\${PORT}`);
    console.log(`✅ PostgreSQL Database active.`);
  });
}

startServer().catch((e) => {
  console.error("Failed to start server", e);
});
