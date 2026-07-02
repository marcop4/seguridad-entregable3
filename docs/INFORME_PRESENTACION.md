# Informe de Presentación del Proyecto: JANE ERP

## 1. Visión General del Proyecto
**JANE ERP** es un sistema integral (ERP / POS) diseñado bajo la premisa de "Security-First" (Seguridad Primero). El sistema busca resolver la necesidad crítica de proteger la información confidencial, controlar los accesos y asegurar la integridad de las transacciones financieras y de inventario en entornos corporativos y comerciales.

El proyecto destaca por implementar controles criptográficos nativos para proteger datos sensibles y garantizar la autoría mediante la emisión de boletas firmadas digitalmente.

## 2. Objetivos
- **Objetivo Principal:** Desarrollar un sistema de gestión empresarial seguro que aplique técnicas criptográficas para la protección de datos e implemente controles de acceso estrictos basados en estándares internacionales.
- **Objetivos Específicos:**
  - Implementar un sistema de Control de Acceso Basado en Roles (RBAC) con múltiples niveles de privilegios.
  - Desarrollar una "Bóveda Criptográfica" para almacenar de manera segura credenciales y secretos del sistema utilizando algoritmos simétricos (AES-256-GCM).
  - Implementar firma digital nativa (utilizando certificados PKI reales) en los comprobantes y boletas generadas para garantizar el **no repudio** y la **integridad**.
  - Proveer auditoría integral (Audit Trails) inmodificables para rastrear cualquier anomalía.

## 3. Metodología
Para el desarrollo de JANE ERP se ha optado por una **metodología de desarrollo seguro (DevSecOps)** y un enfoque iterativo:
1. **Identificación de Riesgos (Shift-Left Security):** Análisis previo de vulnerabilidades antes de la codificación.
2. **Diseño de Arquitectura Segura:** Separación estricta entre frontend (React) y backend (Express/Node.js) con validación de sesión y tokens anti-falsificación.
3. **Implementación de Criptografía:** Integración de la suite `crypto` de Node.js, `bcryptjs` para hashes de contraseñas, y `pdf-lib` junto con `node-signpdf` para firmas PKCS#7.
4. **Validación Continua:** Pruebas de simulación de amenazas (PenTesting simulado) a nivel de endpoints y base de datos (PostgreSQL).

## 4. Resultados Obtenidos
- **Bóveda Infranqueable:** Se logró un entorno donde ni siquiera los administradores del sistema (Nivel 3) pueden ver los secretos si no poseen la llave maestra delegada, lo cual reduce el riesgo de ataques internos.
- **Auditoría Efectiva:** Se implementó una tabla inmutable de `audit_logs` que registra desde el inicio de sesión exitoso hasta las rotaciones de llaves, proporcionando una trazabilidad completa del 100% de las acciones críticas.
- **Emisión de Documentos Protegidos:** Las boletas generadas ahora cuentan con un sello digital validable que garantiza que no han sido alteradas desde su expedición por el sistema de venta POS.

## 5. Conclusiones
JANE ERP demuestra de forma práctica cómo los mecanismos criptográficos pueden y deben integrarse desde la fase de diseño en un software corporativo. El proyecto no solo cumple con las funcionalidades esperadas de un ERP (ventas, inventario, clientes), sino que supera las expectativas en materia de resiliencia frente a ataques, alineándose exitosamente con los principios fundamentales de la norma ISO 27001.
