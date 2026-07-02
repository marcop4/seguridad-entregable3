# Manual de Usuario JANE ERP

Bienvenido al Manual de Usuario de JANE ERP. Este manual te guiará paso a paso sobre cómo interactuar con el sistema de manera segura.

## 1. Inicio de Sesión
1. Ingresa a la URL del sistema: `http://localhost:3000/` o el dominio de la empresa.
2. Ingresa tu correo electrónico institucional.
3. Ingresa tu contraseña (mínimo 8 caracteres, mayúsculas, minúsculas, un número y un símbolo).
4. El sistema evaluará tus credenciales y te redirigirá a tu panel correspondiente:
   - **SuperAdmin / Admin (Nivel 3 y 4):** Redirección al Dashboard Administrativo del ERP.
   - **Vendedor (Nivel 2):** Redirección directa al sistema POS (Tienda Física).

## 2. Gestión de Usuarios y Accesos
*(Exclusivo para Supervisores y Administradores)*

1. Dirígete a la barra lateral izquierda y haz clic en **Gestor de Usuarios**.
2. Verás la lista completa de colaboradores. 
3. **Buscar y Filtrar:** Utiliza la barra superior para buscar por nombre o correo, o aplica el filtro por ROL (Superadmin, Manager, Seller).
4. **Acciones:**
   - **Bloquear:** Selecciona un usuario y escoge el tiempo de bloqueo preventivo por incidentes de seguridad (minutos u horas).
   - **Crear Usuario:** Haz clic en el botón "+ Nuevo Usuario", rellena los datos y define una contraseña robusta.

## 3. Uso de la Bóveda de Cifrado
*(Exclusivo para Administradores de Seguridad Nivel 4)*

La bóveda te permite ver configuraciones críticas del sistema (API Keys).
1. En el menú, dirígete a **Bóveda (Vault)**.
2. Haz clic en el ícono de "Ver" del secreto que desees revelar.
3. Se te solicitará **tu contraseña principal** a modo de re-autenticación (*Step-Up Authentication*).
4. Si es correcta, el secreto se revelará temporalmente y un evento quedará registrado en la auditoría global.
5. Para rotar llaves de descifrado global, ve a la sección "Mantenimiento Criptográfico" dentro del mismo panel.

## 4. Emisión de Ventas y Firma Digital
*(Para Vendedores / Cajeros)*

1. En el menú de tienda (POS), entra a **Catálogo de Tienda**.
2. Añade los productos deseados al carrito.
3. Dirígete al icono del carrito de compras y pulsa en **Confirmar Orden**.
4. Ve al submódulo **Boletas Generadas**. 
5. Aquí verás el histórico de las boletas. Haz clic en **Imprimir/PDF** para ver el documento.
6. El documento generado incluirá incrustada una firma digital válida para prevenir alteraciones por terceros, y visualizarás un resumen de la boleta.

## 5. Auditoría del Sistema
1. Entra a la sección **Auditoría Global**.
2. Aquí observarás una línea de tiempo (o tabla) detallada con cada inicio de sesión, bloqueo de cuenta y descifrado de llaves, proporcionando total visibilidad sobre la seguridad del entorno.
