# Análisis de Riesgos y Mitigación (Alineado a ISO 27001)

Este documento detalla el análisis de riesgos llevado a cabo para el proyecto **JANE ERP**, identificando las amenazas y vulnerabilidades que motivaron la implementación de los controles de seguridad, en cumplimiento con las directrices del estándar ISO 27001.

## 1. Identificación de Activos de Información
Para JANE ERP, los activos críticos son:
- **Base de Datos Principal:** Información de usuarios, perfiles, transacciones y boletas (PostgreSQL).
- **Secretos Corporativos:** API Keys (Sunat, AWS, Twilio, Pasarelas de Pago) almacenadas en la base de datos.
- **Claves Privadas PKI:** Archivo `.p12` utilizado para la firma digital de las boletas.

## 2. Análisis de Riesgos y Amenazas Identificadas

| Riesgo / Amenaza | Nivel de Impacto | Probabilidad | Vulnerabilidad que explota |
| :--- | :---: | :---: | :--- |
| **R-001:** Fuga o robo de credenciales maestras (API Keys) desde la Base de Datos. | **Alto** | Media | Almacenamiento de secretos en texto plano (Plaintext) en la base de datos. |
| **R-002:** Alteración de boletas de venta tras ser emitidas por el vendedor. | **Alto** | Baja | Falta de controles de integridad y validación de autoría. |
| **R-003:** Elevación de privilegios por parte de un usuario interno malintencionado. | **Alto** | Baja | Falta de segregación de funciones (SoD) y controles de acceso ineficientes. |
| **R-004:** Acciones críticas no trazables y repudio de operaciones. | **Medio** | Alta | Inexistencia de un log seguro que asocie un ID de sesión con la acción ejecutada. |

## 3. Implementación de Medidas de Mitigación (ISO 27001)

A continuación, se detalla la efectividad de los controles implementados alineados a los anexos de la norma ISO 27001:

### A.9 Control de Acceso (Access Control)
**Medida implementada:** Sistema de Control de Acceso Basado en Roles (RBAC).
- Se diseñó un middleware `authMiddleware.ts` que valida el nivel jerárquico del usuario (1 al 4) y bloquea rutas sensibles.
- Solo los administradores nivel 4 pueden ver y auditar acciones de otros usuarios, asegurando la **segregación de tareas (A.9.2.3)**.

### A.10 Criptografía (Cryptography)
**Medida implementada:** Bóveda Criptográfica y Firma Digital PKI.
- **Mitigación del R-001:** En lugar de guardar las credenciales en texto plano, JANE ERP utiliza el algoritmo simétrico **AES-256-GCM**. Las contraseñas en la bóveda requieren una "Llave Maestra" rotativa para su descifrado. Cumplimiento de **Política de uso de controles criptográficos (A.10.1.1)**.
- **Mitigación del R-002:** Las boletas generadas son inyectadas con una firma digital utilizando certificados PKCS#12 reales, validables globalmente mediante Adobe Acrobat, lo que garantiza el no repudio.

### A.12 Seguridad de las Operaciones (Operations Security)
**Medida implementada:** Pista de Auditoría (Audit Trails) Inmutable.
- **Mitigación del R-004:** Toda acción administrativa (crear usuario, descargar secreto, rotar llaves) invoca al `logAudit` / `logSecurityEvent`, el cual escribe de forma inmutable en la tabla `audit_logs` **(A.12.4.1 Registro de eventos)**. 
- La tabla de auditoría incluye el UUID del usuario, IP (si aplica) y nivel de criticidad. No hay función de borrado de logs (Protección de la información de registro **A.12.4.2**).

## 4. Conclusión del Análisis
JANE ERP no es solo una herramienta de gestión, sino un caso de estudio real de cómo blindar un ecosistema corporativo utilizando medidas de mitigación estrictas (Criptografía, Firma Digital y Auditoría), cumpliendo eficazmente con el modelo de gestión de riesgos de la familia ISO 27001.
