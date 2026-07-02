# Diseño y Funcionalidad del Software

En este documento se expone la estructura de diseño visual de JANE ERP y el desglose de las funcionalidades clave, evidenciando cómo la aplicación cumple de manera satisfactoria y usable los objetivos del proyecto.

## 1. Diseño y Experiencia de Usuario (UI/UX)
JANE ERP se construyó utilizando **React** y **TailwindCSS**, ofreciendo una interfaz gráfica (GUI) altamente responsiva y amigable.

- **Diseño Moderno:** Se ha implementado un esquema visual en "Modo Oscuro" con estética tipo "Glassmorphism", utilizando bordes tenues (`border-white/5`), opacidades y degradados que aportan un look and feel muy profesional.
- **Microinteracciones y Animaciones:** Se emplea la librería `Framer Motion` y utilidades de CSS para transiciones suaves al abrir paneles, notificaciones tipo "Toast", y efectos de hover en los botones.
- **Navegación Intuitiva:** El menú lateral o Sidebar agrupa lógicamente los submódulos. Un interceptor automático permite hacer scroll hacia arriba (`scroll-to-top`) al cambiar de módulo, mejorando sustancialmente la comodidad del usuario.

## 2. Funcionalidades Core de JANE ERP

### 2.1 Módulo ERP (Enterprise Resource Planning)
- **Gestor de Usuarios y Roles:** Panel administrativo (exclusivo para niveles superiores) para dar de alta a nuevos usuarios, visualizar estados y revocar acceso en tiempo real, bloqueando las cuentas (Account Lockout).
- **Auditoría de Actividad (Global Logs):** Visualización en formato de línea de tiempo o tabla de todo lo que ocurre dentro del sistema. Registra IP simuladas, timestamps y severidad de los eventos.

### 2.2 Bóveda de Criptografía (Security Vault)
- **Gestión de Secretos:** Módulo especializado para agregar APIs y tokens críticos (ej. `API Key Sunat`, `Webhook Secret Pasarela`).
- **Control de Revelación:** La vista de los secretos está oculta. Cuando el Administrador desea ver el dato real, se gatilla un desafío de seguridad solicitando una llave de descifrado, implementando el concepto de *Zero-Trust*.
- **Rotación de Llaves:** Funcionalidad para actualizar el master key que cifra todos los secretos con AES-256-GCM y generar un nuevo respaldo de seguridad.

### 2.3 Módulo POS de Ventas (Jane Tienda)
- **Catálogo de Productos:** Vista rápida del inventario disponible con diseño de tarjetas responsivas.
- **Carrito de Compras In-Memory:** Gestión ágil de las órdenes antes del pago.
- **Generador de Boletas Firmadas:** Al procesar un pago (o de forma asíncrona), JANE ERP genera un PDF transaccional empleando la librería `pdf-lib` y, de forma transparente, inyecta una **Firma Digital (PKI)** real sobre el documento usando `node-signpdf`.

## 3. Capacidad de Integración y Escalabilidad
El backend de JANE ERP, desarrollado en Node.js/Express, ofrece una arquitectura basada en Endpoints REST. Esto permite:
- Fácil acople futuro a aplicaciones móviles.
- Migración rápida a una infraestructura Cloud-Native o Serverless, ya que los estados (como los tokens JWT) son *Stateless* (sin estado), y las sesiones de usuario activas se sincronizan ágilmente.
